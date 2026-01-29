import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from utils.model_manager import get_llm, rotate_model, MODEL_POOL



# --------------------------------------------------
# PROMPT
# --------------------------------------------------

PROMPT = ChatPromptTemplate.from_template("""
You are an expert assistant answering using the provided context.

Context:
{context}

Question:
{input}

Give a helpful, clear answer.
""")


# --------------------------------------------------
# BUILD RAG CHAIN WITH PROVIDER FAILOVER
# --------------------------------------------------

def build_rag_chain(vectorstore):

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    def ask(question):

        attempts = 0
        max_attempts = len(MODEL_POOL)

        last_error = None

        while attempts < max_attempts:

            llm = get_llm()
            active_model = getattr(llm, "model", "unknown")

            print(f"🤖 Trying model: {active_model}")

            chain = (
                {
                    "context": retriever,
                    "input": lambda x: x,
                }
                | PROMPT
                | llm
                | StrOutputParser()
            )

            try:
                answer = chain.invoke(question)

                docs = retriever.invoke(question)

                print(f"✅ Success with model: {active_model}")

                return answer, docs

            except Exception as e:

                msg = str(e).lower()
                last_error = msg

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

                raise e

        print("🚫 All providers exhausted")

        return (
            "⚠️ All AI providers are currently rate-limited. Please try again later.",
            [],
        )

    return ask
