from fastapi import FastAPI, Request, Response, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
import json
import os
import re
import shutil
import sys
import threading
import time
from pathlib import Path
from uuid import uuid4

import requests

# The RAG chain prints emoji (⚠️/✅/🤖); Windows' default cp1252 console
# encoding raises UnicodeEncodeError on them. Force UTF-8 output instead.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

from utils.loader import load_documents
from utils.splitter import split_documents
from utils.embeddings import create_vectorstore, load_vectorstore, vectorstore_exists
from utils.rag_chain import build_rag_chain
from utils.telemetry import (
    setup_logging,
    init_sentry,
    log_event,
    capture_exception,
)

setup_logging()
SENTRY_ON = init_sentry()

app = FastAPI()

# ------------------------------------------------------------------
# RATE LIMITING (per client IP, in-memory — Render runs one instance)
#
# Limits are env-overridable so tuning them for a public deployment
# never needs a code change. Queries share one bucket per endpoint;
# uploads get a much lower cap because each one reindexes the store
# and (for images) spends vision-model tokens.
# ------------------------------------------------------------------

QUERY_LIMIT = os.getenv("RATE_LIMIT_QUERIES", "6/minute")
UPLOAD_LIMIT = os.getenv("RATE_LIMIT_UPLOADS", "3/minute")

log_event(
    "info", "boot",
    sentry="enabled" if SENTRY_ON else "disabled",
    query_limit=QUERY_LIMIT,
    upload_limit=UPLOAD_LIMIT,
)


def client_ip(request: Request) -> str:
    """Real client IP for the limiter key.

    Render is the only proxy in front of this service and *appends* the true
    peer address to any client-supplied X-Forwarded-For chain, so the LAST
    entry is the trustworthy one. slowapi's stock get_ipaddr returns the whole
    raw header — a scripted client could then vary the header value to mint a
    fresh limiter key per request and bypass the cap entirely.
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        last = fwd.split(",")[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "unknown"


limiter = Limiter(
    key_func=client_ip,
    headers_enabled=True,          # X-RateLimit-* on every limited response
    retry_after="seconds",         # Retry-After on 429s (see handler below)
    default_limits=[],
)
app.state.limiter = limiter


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """429 + a user-readable detail + Retry-After seconds."""
    response = JSONResponse(
        {
            "detail": (
                "You're sending requests faster than I can process — "
                "try again in a moment."
            ),
            "limit": str(exc.detail),  # e.g. "6 per 1 minute", for debugging
        },
        status_code=429,
    )
    try:
        response = limiter._inject_headers(response, request.state.view_rate_limit)
    except Exception:
        # Never let header bookkeeping turn a clean 429 into a 500.
        response.headers["Retry-After"] = "60"
    return response


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Without this the browser hides Retry-After/X-RateLimit-* from fetch/XHR
    # (they are not CORS-safelisted response headers).
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

UPLOAD_DIR = Path("data/uploads")
VECTOR_DIR = Path("vectorstore")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_DIR.mkdir(parents=True, exist_ok=True)

rag_chain = None

class QueryRequest(BaseModel):
    question: str

def _ensure_chain():
    global rag_chain
    if not rag_chain:
        if vectorstore_exists(str(VECTOR_DIR)):
            vectorstore = load_vectorstore(str(VECTOR_DIR))
            rag_chain = build_rag_chain(vectorstore)
        else:
            raise HTTPException(400, "Upload files first")
    return rag_chain

def _per_file_stats(docs, chunks):
    """Aggregate page/chunk counts per source file, in upload order."""
    stats = {}
    order = []
    for d in docs:
        name = os.path.basename(d.metadata.get("source", "document"))
        if name not in stats:
            stats[name] = {"name": name, "pages": 0, "chunks": 0}
            order.append(name)
        stats[name]["pages"] += 1
    for c in chunks:
        name = os.path.basename(c.metadata.get("source", "document"))
        if name in stats:
            stats[name]["chunks"] += 1
    return [stats[n] for n in order]


def _safe_upload_name(filename):
    """Turn a client-supplied filename into a safe on-disk name.

    `UploadFile.filename` is whatever the browser sent — it can contain
    `../` segments, absolute paths, or backslash separators (path
    traversal). Take only the base name, then restrict to a conservative
    character class, keeping the extension because the loader dispatches
    extraction on it.
    """
    name = Path(str(filename or "")).name                      # drop any directories
    name = re.sub(r"[^\w.\- ]+", "_", name).strip(" .")        # neutralize the rest
    if not name:
        name = "document"
    if len(name) > 120:                                        # cap absurdly long names
        stem, dot, ext = name.rpartition(".")
        name = (stem[:100] + dot + ext[-19:]) if stem else name[:120]
    return name

@app.post("/upload")
@limiter.limit(UPLOAD_LIMIT)
async def upload_files(request: Request, response: Response, files: list[UploadFile] = File(...)):
    global rag_chain

    for f in UPLOAD_DIR.glob("*"):
        f.unlink()
    for f in VECTOR_DIR.glob("*"):
        f.unlink()

    for file in files:
        name = _safe_upload_name(file.filename)
        path = UPLOAD_DIR / name
        if path.exists():  # two uploads sharing a sanitized name must not clobber
            stem, dot, ext = name.rpartition(".")
            path = UPLOAD_DIR / f"{stem or 'document'}-{uuid4().hex[:8]}{dot}{ext}"
        with path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    docs = load_documents(str(UPLOAD_DIR))
    chunks = split_documents(docs)
    vectorstore = create_vectorstore(chunks, str(VECTOR_DIR))
    rag_chain = build_rag_chain(vectorstore)

    return {
        "files": len(files),
        "chunks": len(chunks),
        "pages": len(docs),
        "per_file": _per_file_stats(docs, chunks),
    }

def _sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

@app.post("/query/stream")
@limiter.limit(QUERY_LIMIT)
async def query_stream(request: Request, req: QueryRequest):
    """SSE endpoint: streams retrieval/generation events token by token."""
    pipeline = _ensure_chain()

    def gen():
        try:
            for ev in pipeline.stream(req.question):
                yield _sse(ev["event"], ev["data"])
        except Exception as e:  # last-resort: never die silently mid-stream
            log_event("error", "stream_unhandled", error_type=type(e).__name__, error=e)
            capture_exception(e, fingerprint=["stream-unhandled"])
            yield _sse("error", {"message": str(e)})

    # A sync generator is iterated in a threadpool by Starlette, so the
    # blocking FAISS/LLM calls never stall the event loop.
    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.post("/query")
@limiter.limit(QUERY_LIMIT)
async def query(request: Request, response: Response, req: QueryRequest):
    """Non-streaming fallback (kept for compatibility). Aggregates the SSE events."""
    pipeline = _ensure_chain()
    answer = ""
    docs_meta = []
    error = None
    for ev in pipeline.stream(req.question):
        if ev["event"] == "token":
            answer += ev["data"]["text"]
        elif ev["event"] == "sources":
            docs_meta = ev["data"]["docs"]
        elif ev["event"] == "error":
            error = ev["data"]["message"]
        elif ev["event"] == "status" and ev["data"].get("stage") == "no_answer":
            answer = "I cannot find this in the document."
    if error:
        return {"answer": error, "sources": []}
    sources = [
        {"id": d["id"], "page": d["page"], "content": d["excerpt"][:200]}
        for d in docs_meta
    ]
    return {"answer": answer, "sources": sources}

# ------------------------------------------------------------------
# HEALTH — real "can we serve queries" checks, cached 60s so Render's
# health-check polling doesn't hammer the providers. Always HTTP 200
# (a transient upstream outage must not make Render recycle the whole
# container); the `status` field carries the verdict.
# ------------------------------------------------------------------

HEALTH_TTL_SECONDS = float(os.getenv("HEALTH_TTL_SECONDS", "60"))
_health_lock = threading.Lock()
_health_cache = {"checked_at": 0.0, "providers": {}}


def _probe_providers():
    """Cheap key-validity pings (model list / key info — no tokens spent)."""
    out = {}

    gkey = os.getenv("GOOGLE_API_KEY")
    if not gkey:
        out["gemini"] = {"ok": False, "reason": "GOOGLE_API_KEY not set"}
    else:
        try:
            r = requests.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={"key": gkey, "pageSize": 1},
                timeout=6,
            )
            out["gemini"] = {"ok": r.status_code == 200, "http": r.status_code}
        except Exception as e:
            out["gemini"] = {"ok": False, "reason": type(e).__name__}

    okey = os.getenv("OPENROUTER_API_KEY")
    if not okey:
        out["openrouter"] = {"ok": False, "reason": "OPENROUTER_API_KEY not set"}
    else:
        try:
            r = requests.get(
                "https://openrouter.ai/api/v1/key",
                headers={"Authorization": f"Bearer {okey}"},
                timeout=6,
            )
            out["openrouter"] = {"ok": r.status_code == 200, "http": r.status_code}
        except Exception as e:
            out["openrouter"] = {"ok": False, "reason": type(e).__name__}

    return out


@app.get("/health")
def health():
    now = time.monotonic()
    with _health_lock:
        if now - _health_cache["checked_at"] > HEALTH_TTL_SECONDS:
            _health_cache["providers"] = _probe_providers()
            _health_cache["checked_at"] = now
        providers = _health_cache["providers"]

    indexed = vectorstore_exists(str(VECTOR_DIR))
    any_ok = any(p.get("ok") for p in providers.values())
    configured = any(not p.get("reason", "").endswith("not set") for p in providers.values())

    status = "ok" if any_ok else ("starting" if not configured else "degraded")
    return {
        "status": status,
        "vectorstore": {"indexed": indexed, "loaded": rag_chain is not None},
        "providers": providers,
        "sentry": SENTRY_ON,
        "checked_seconds_ago": round(now - _health_cache["checked_at"], 1),
    }
