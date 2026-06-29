import os
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()


# --------------------------------------------------
# 🧠 EMBEDDING FACTORY (FOR FUTURE MODEL SWITCHING)
# --------------------------------------------------

def _get_embeddings(model_name="gemini-embedding-001"):
    return GoogleGenerativeAIEmbeddings(model=model_name)


# --------------------------------------------------
# 💾 CREATE VECTORSTORE
# --------------------------------------------------

def create_vectorstore(chunks, persist_dir, model_name="gemini-embedding-001"):
    if not chunks:
        raise ValueError("No document chunks found. Upload files with readable text before creating embeddings.")

    os.makedirs(persist_dir, exist_ok=True)

    print("🧠 Creating fresh embeddings...")

    embeddings = _get_embeddings(model_name)

    if embeddings is None:
        raise RuntimeError("Failed to initialize embeddings model.")

    db = FAISS.from_documents(chunks, embeddings)

    db.save_local(persist_dir)

    return db


# --------------------------------------------------
# 📦 LOAD VECTORSTORE
# --------------------------------------------------

def load_vectorstore(persist_dir, model_name="gemini-embedding-001"):

    embeddings = _get_embeddings(model_name)

    return FAISS.load_local(
        persist_dir,
        embeddings,
        allow_dangerous_deserialization=True,
    )


# --------------------------------------------------
# 🧪 UTILITY
# --------------------------------------------------

def vectorstore_exists(path: str) -> bool:
    return os.path.exists(path) and len(os.listdir(path)) > 0
