import os
import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.model_manager import (
    get_llm,
    rotate_model,
    reset_model,
    MODEL_POOL,
    get_active_config,
)
from utils.telemetry import log_event, capture_error


# --------------------------------------------------
# PROMPT
# --------------------------------------------------

PROMPT = ChatPromptTemplate.from_template("""
You are an expert assistant. Your task is to answer the user's question based ONLY on the provided context.
Do not use any external knowledge. If the answer is not found in the context, state clearly: "I cannot find this in the document."
When your answer uses information from a context passage, cite it inline with bracketed numbers like [1] or [2], matching the numbered passages.

Context:
{context}

Question:
{input}
""")


# --------------------------------------------------
# RELEVANCE THRESHOLD
# --------------------------------------------------

# Gemini embeddings are L2-normalized, so FAISS squared-L2 distance d maps to
# cosine similarity 1 - d²/2. A retrieved chunk scoring below this threshold is
# treated as "not in the documents" and the LLM is never consulted for it.
RELEVANCE_THRESHOLD = float(os.getenv("RELEVANCE_THRESHOLD", "0.2"))

# How much of each matched chunk to ship to the UI for the citation panel.
EXCERPT_CHARS = 700


def _model_label(cfg):
    return f"{cfg['provider']}:{cfg.get('model', 'N/A')}"


def _cosine_from_l2(distance):
    # float(): FAISS hands back numpy.float32, which json can't serialize.
    return float(max(0.0, 1.0 - (distance * distance) / 2.0))


def _classify_error(msg):
    """Map an exception string to a recoverable/terminal classification."""
    if (
        "resource_exhausted" in msg
        or "quota" in msg
        or "rate limit" in msg
        or "429" in msg
    ):
        return "rate_limited"
    if (
        "model not found" in msg
        or "no endpoints found" in msg
        or "permission" in msg
        or "forbidden" in msg
        or "invalid api key" in msg
        or "authentication" in msg
        or "not configured" in msg
        or "401" in msg
        or "403" in msg
        or "404" in msg
    ):
        return "misconfigured"
    return "unknown"


# --------------------------------------------------
# BUILD RAG PIPELINE (PRIMARY → FAILOVER)
# --------------------------------------------------

class RagPipeline:
    """RAG pipeline over a FAISS vectorstore with provider failover.

    Exposes a single `stream(question)` generator that yields protocol
    events (dicts with "event" and "data" keys):

      status     {"stage": "searching"}                          retrieval started
      status     {"stage": "no_answer", "top_score": float}      nothing relevant
      sources    {"docs": [{id, file, page, score, excerpt}...]} retrieval done
      status     {"stage": "generating", "model", "fallback"}    LLM call started
      status     {"stage": "model_switched", "from", "to"}       failover happened
      token      {"text": str}                                   answer token
      done       {"model": str}                                  answer complete
      error      {"message": str}                                terminal failure
    """

    def __init__(self, vectorstore, k=4):
        self.vectorstore = vectorstore
        self.k = k

    # ----------------------------------------------
    # EVENT STREAM
    # ----------------------------------------------

    def stream(self, question):
        # Start every request on the primary model; a previous request's
        # failover must not permanently demote it.
        reset_model()

        # ---- Stage 1: retrieval ----
        yield {"event": "status", "data": {"stage": "searching"}}

        pairs = self.vectorstore.similarity_search_with_score(question, k=self.k)
        if not pairs:
            yield {
                "event": "status",
                "data": {"stage": "no_answer", "top_score": 0.0},
            }
            return

        scored = [(doc, _cosine_from_l2(dist)) for doc, dist in pairs]
        top_score = max(s for _, s in scored)
        kept = [(doc, s) for doc, s in scored if s >= RELEVANCE_THRESHOLD]

        if not kept:
            yield {
                "event": "status",
                "data": {"stage": "no_answer", "top_score": round(top_score, 3)},
            }
            return

        docs_meta = [
            {
                "id": i + 1,
                "file": os.path.basename(doc.metadata.get("source", "document")),
                "page": doc.metadata.get("page", "N/A"),
                "score": round(score, 3),
                "excerpt": doc.page_content[:EXCERPT_CHARS],
            }
            for i, (doc, score) in enumerate(kept)
        ]
        yield {"event": "sources", "data": {"docs": docs_meta}}

        context = "\n\n---\n\n".join(
            f"[{meta['id']}] {meta['file']} (page {meta['page']})\n{doc.page_content}"
            for meta, (doc, _) in zip(docs_meta, kept)
        )

        # ---- Stage 2: generation with provider failover ----
        attempts = 0
        max_attempts = len(MODEL_POOL)
        error_log = []
        fallback_used = False

        while attempts < max_attempts:
            cfg = get_active_config()
            active_model = _model_label(cfg)
            started = False

            try:
                llm = get_llm()
                log_event("info", "generation_started", model=active_model)

                yield {
                    "event": "status",
                    "data": {
                        "stage": "generating",
                        "model": active_model,
                        "fallback": fallback_used,
                    },
                }

                chain = PROMPT | llm | StrOutputParser()

                for chunk in chain.stream({"context": context, "input": question}):
                    if not chunk:
                        continue
                    started = True
                    yield {"event": "token", "data": {"text": chunk}}

                log_event("info", "generation_completed", model=active_model)
                yield {"event": "done", "data": {"model": active_model}}
                return

            except Exception as e:
                msg = str(e).lower()
                error_log.append(f"{active_model}: {str(e)}")

                # A failure *after* tokens reached the user cannot be retried
                # cleanly — surface what happened instead of double-streaming.
                if started:
                    log_event(
                        "warning", "provider_midstream",
                        model=active_model, kind="interrupted",
                        error_type=type(e).__name__, error=e,
                    )
                    yield {
                        "event": "error",
                        "data": {
                            "message": "The answer was interrupted. Please try again.",
                        },
                    }
                    return

                kind = _classify_error(msg)
                # Loud, grep-able, per-provider: `event=provider_failed
                # model=... kind=... error_type=... error=...` — enough to
                # diagnose (quota vs auth vs network) without re-running.
                log_event(
                    "warning", "provider_failed",
                    model=active_model, kind=kind,
                    error_type=type(e).__name__, error=e,
                )

                from_model = active_model
                rotate_model()
                attempts += 1
                fallback_used = True
                yield {
                    "event": "status",
                    "data": {
                        "stage": "model_switched",
                        "from": from_model,
                        "to": _model_label(get_active_config()),
                    },
                }
                time.sleep(2 if kind == "rate_limited" else 1)
                continue

        # Terminal: every provider in the pool failed. This is the failure
        # that must page loudly — one grep-able line + a Sentry event
        # carrying each provider's actual error.
        log_event(
            "error", "providers_exhausted",
            providers=", ".join(_model_label(c) for c in MODEL_POOL),
            errors=" | ".join(error_log[-3:]),
        )
        capture_error(
            "All LLM providers failed for a query",
            fingerprint=["providers-exhausted"],
            question=question[:200],
            attempts=error_log,
        )
        details = "\n".join(error_log[-3:])
        yield {
            "event": "error",
            "data": {
                "message": (
                    "Could not generate an answer. All LLM providers failed.\n\n"
                    f"Error details:\n{details}"
                ),
            },
        }


def build_rag_chain(vectorstore):
    """Backwards-compatible factory returning the pipeline object."""
    return RagPipeline(vectorstore)
