import time
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.model_manager import get_llm, rotate_model, MODEL_POOL, get_active_config



# --------------------------------------------------
# PROMPT
# --------------------------------------------------

PROMPT = ChatPromptTemplate.from_template("""
You are an expert assistant. Your task is to answer the user's question based ONLY on the provided context.
Do not use any external knowledge. If the answer is not found in the context, state clearly: "I cannot find this in the document."

Context:
{context}

Question:
{input}
""")


# --------------------------------------------------
# BUILD RAG CHAIN WITH PROVIDER FAILOVER
# --------------------------------------------------

def build_rag_chain(vectorstore):
    """
    Builds a Retrieval-Augmented Generation (RAG) chain with a failover mechanism.
    It tries the primary LLM (Gemini) first, then falls back to a secondary (OpenRouter).
    """
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    def ask(question):
        attempts = 0
        max_attempts = len(MODEL_POOL)

        error_log = []

        while attempts < max_attempts:

            try:
                cfg = get_active_config()
                active_model = f"{cfg['provider']}:{cfg.get('model', 'N/A')}"
                llm = get_llm()
                print(f"🤖 Trying model: {active_model}")

                docs = retriever.invoke(question)
                if not docs:
                    print("ℹ️ No relevant context found in vector store")
                    return "I cannot find this in the document.", []
            
                # This chain retrieves context, formats the prompt, and calls the LLM.
                chain = (
                    {
                        "context": lambda _: docs,
                        "input": lambda x: x,
                    }
                    | PROMPT
                    | llm
                    | StrOutputParser()
                )

                # Execute the chain and handle potential errors.
                answer = chain.invoke(question)
                print(f"✅ Success with model: {active_model}")
                return answer, docs

            except Exception as e:
                msg = str(e).lower()
                error_log.append(f"{active_model}: {str(e)}")

                # Handle specific, recoverable errors like rate limits or resource exhaustion.
                if (
                    "resource_exhausted" in msg
                    or "quota" in msg
                    or "rate limit" in msg
                    or "429" in msg
                ):
                    print(f"⚠️ Rate limit hit on {active_model}")
                    rotate_model()
                    attempts += 1
                    time.sleep(2)
                    continue

                # Handle configuration errors (e.g., missing API keys, invalid model).
                # This includes the custom "OpenRouter is not configured" error.
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
                    print(f"⚠️ Provider misconfigured or unavailable for {active_model}: {e}")
                    rotate_model()
                    attempts += 1
                    time.sleep(1)
                    continue

                # For any other unknown errors, rotate to the next provider.
                print(f"⚠️ Error on {active_model}: {e}")
                rotate_model()
                attempts += 1
                time.sleep(1)
                continue

        print("🚫 All providers exhausted")

        # If all providers fail, return a comprehensive error message to the user.
        details = "\n".join(error_log[-3:])
        return (
            "⚠️ Could not generate an answer. All LLM providers failed.\n\n"
            f"**Error Details:**\n{details}\n\n"
            "Please check your API key configurations and model access.",
            [],
        )

    return ask
