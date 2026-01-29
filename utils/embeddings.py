import os
import json
import hashlib
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()

# --------------------------------------------------
# 🔐 HASHING FOR CACHE
# --------------------------------------------------

def _hash_documents(chunks):
    combined = "".join(chunk.page_content for chunk in chunks)
    return hashlib.md5(combined.encode("utf-8")).hexdigest()


# --------------------------------------------------
# 🧠 EMBEDDING FACTORY (FOR FUTURE MODEL SWITCHING)
# --------------------------------------------------

def _get_embeddings(model_name="gemini-embedding-001"):
    return GoogleGenerativeAIEmbeddings(model=model_name)


# --------------------------------------------------
# 💾 CREATE VECTORSTORE (WITH CACHE)
# --------------------------------------------------

def create_vectorstore(chunks, persist_dir, model_name="gemini-embedding-001"):

    os.makedirs(persist_dir, exist_ok=True)

    hash_file = os.path.join(persist_dir, "doc_hash.json")

    new_hash = _hash_documents(chunks)

    # ---------- CACHE HIT ----------
    if os.path.exists(hash_file):

        with open(hash_file, "r") as f:
            saved = json.load(f)

        if saved.get("hash") == new_hash:
            print("⚡ Using cached embeddings — skipping recompute")
            return

    print("🧠 Creating NEW embeddings...")

    embeddings = _get_embeddings(model_name)

    db = FAISS.from_documents(chunks, embeddings)

    db.save_local(persist_dir)

    # ---------- SAVE HASH ----------
    with open(hash_file, "w") as f:
        json.dump(
            {
                "hash": new_hash,
                "model": model_name,
            },
            f,
        )


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
