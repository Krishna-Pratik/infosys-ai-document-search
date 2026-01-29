import streamlit as st
import os
import json
import base64
import hashlib
import shutil
from datetime import datetime
from dotenv import load_dotenv

from utils.loader import load_documents
from utils.splitter import split_documents
from utils.model_manager import get_llm
from langchain_core.prompts import ChatPromptTemplate

from utils.embeddings import (
    create_vectorstore,
    load_vectorstore,
)
from utils.rag_chain import build_rag_chain
from utils.reset import reset_app


# --------------------------------------------------
# ENV + PAGE CONFIG
# --------------------------------------------------

load_dotenv()
st.set_page_config(page_title="AI Document Search Pro", layout="wide")


# --------------------------------------------------
# CSS — PIN INPUT
# --------------------------------------------------

st.markdown("""
<style>

.main .block-container {
    padding-bottom: 11rem;
}

:root {
    --sidebar-width: 21rem;
}

div[data-testid="stChatInput"] {
    position: fixed;
    bottom: 0;
    left: var(--sidebar-width);
    right: 0;

    background: #0e1117;
    padding: 0.9rem 1.2rem 1.5rem 1.2rem;

    border-top: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 -6px 20px rgba(0,0,0,0.45);
    z-index: 9999;
}

div[data-testid="stChatInput"] textarea {
    box-shadow: 0 0 0 1px rgba(0,136,255,0.35);
}

</style>
""", unsafe_allow_html=True)


# --------------------------------------------------
# SESSION STATE
# --------------------------------------------------

if "stats" not in st.session_state:
    st.session_state.stats = {
        "files": 0,
        "pages": 0,
        "chunks": 0,
        "questions": 0,
    }

if "messages" not in st.session_state:
    st.session_state.messages = []

if "docs_processed" not in st.session_state:
    st.session_state.docs_processed = False


# --------------------------------------------------
# EXPORT HELPERS
# --------------------------------------------------

def export_chat_txt(messages):
    return "\n\n".join(
        [f"{m['role'].upper()}: {m['content']}" for m in messages]
    )


def export_chat_json(messages):
    return json.dumps(messages, indent=2)


# --------------------------------------------------
# TITLE
# --------------------------------------------------

st.title("🔍 AI Document Search Pro")
st.caption("Upload documents, preview them, chat with AI, and analyze sessions.")


# --------------------------------------------------
# SIDEBAR — UPLOAD
# --------------------------------------------------

st.sidebar.header("📂 Document Upload")
st.sidebar.header("⚙️ Controls")

if st.sidebar.button("🗑 Clear & Reset App"):
    reset_app()
    st.session_state.docs_processed = False
    st.session_state.pop("suggested_questions", None)
    st.session_state.messages = []
    st.rerun()

uploaded_files = st.sidebar.file_uploader(
    "Upload PDF or TXT files",
    type=["pdf", "txt"],
    accept_multiple_files=True,
)

UPLOAD_DIR = "data/uploads"
VECTOR_DIR = "vectorstore"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VECTOR_DIR, exist_ok=True)


# --------------------------------------------------
# HASH UTILS
# --------------------------------------------------

def hash_chunks(chunks):
    combined = "".join(c.page_content for c in chunks)
    return hashlib.md5(combined.encode()).hexdigest()


# --------------------------------------------------
# PROCESS DOCUMENTS
# --------------------------------------------------

if st.sidebar.button("🚀 Process Documents") and uploaded_files:

    st.session_state.docs_processed = True

    # wipe UI state
    st.session_state.pop("suggested_questions", None)
    st.session_state.messages = []

    # save uploads
    for file in uploaded_files:
        with open(os.path.join(UPLOAD_DIR, file.name), "wb") as f:
            f.write(file.getbuffer())

    st.session_state.stats["files"] = len(uploaded_files)

    with st.spinner("📄 Loading documents..."):
        docs = load_documents(UPLOAD_DIR)

    st.session_state.stats["pages"] = len(docs)

    with st.spinner("✂️ Splitting..."):
        chunks = split_documents(docs)

    st.session_state.stats["chunks"] = len(chunks)

    # -----------------------------
    # HASH CHECK
    # -----------------------------

    new_hash = hash_chunks(chunks)
    hash_file = os.path.join(VECTOR_DIR, "doc_hash.json")

    rebuild = True

    if os.path.exists(hash_file):

        with open(hash_file) as f:
            saved = json.load(f)

        if saved.get("hash") == new_hash:
            rebuild = False

    # -----------------------------
    # REBUILD IF DIFFERENT
    # -----------------------------

    if rebuild:

        st.sidebar.warning("♻️ New documents detected — rebuilding embeddings")

        if os.path.exists(VECTOR_DIR):
            shutil.rmtree(VECTOR_DIR)

        with st.spinner("🧠 Creating vector DB..."):
            create_vectorstore(chunks, VECTOR_DIR)

        with open(hash_file, "w") as f:
            json.dump({"hash": new_hash}, f)

        st.sidebar.success("🎉 Vector store created!")

    else:
        st.sidebar.info("⚡ Same documents — using cached embeddings")


# --------------------------------------------------
# LOAD VECTORSTORE
# --------------------------------------------------

vectorstore = None

if os.path.exists(os.path.join(VECTOR_DIR, "index.faiss")):
    try:
        vectorstore = load_vectorstore(VECTOR_DIR)
    except:
        pass


# --------------------------------------------------
# SMART SUGGESTION GENERATOR
# --------------------------------------------------

def generate_suggested_questions(vectorstore):

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    docs = retriever.invoke("Give an overview of this document")

    context = "\n\n".join(d.page_content for d in docs)

    llm = get_llm()

    prompt = ChatPromptTemplate.from_template("""
You are analyzing a document.

Based on this content, generate 5 helpful user questions someone might ask.

Return only the questions as bullet points.

CONTENT:
{context}
""")

    chain = prompt | llm

    result = chain.invoke({"context": context})

    lines = result.content.split("\n")

    return [
        l.replace("-", "").strip()
        for l in lines
        if l.strip()
    ][:5]


# --------------------------------------------------
# TABS
# --------------------------------------------------

tab_chat, tab_analytics = st.tabs(["💬 Chat", "📊 Analytics"])


# ==================================================
# CHAT TAB
# ==================================================

with tab_chat:

    if vectorstore and st.session_state.docs_processed:

        st.subheader("💡 Suggested Questions")

        if "suggested_questions" not in st.session_state:

            with st.spinner("✨ Generating smart suggestions..."):
                try:
                    st.session_state.suggested_questions = (
                        generate_suggested_questions(vectorstore)
                    )
                except:
                    st.session_state.suggested_questions = []

        suggested = st.session_state.suggested_questions

        if suggested:
            cols = st.columns(len(suggested))
            for i, q in enumerate(suggested):
                if cols[i].button(q):
                    st.session_state.prefilled_question = q

        rag_chain = build_rag_chain(vectorstore)

        # history
        for msg in st.session_state.messages:
            st.chat_message(msg["role"]).write(msg["content"])

        question = st.chat_input("Ask something about the uploaded documents...")

        if "prefilled_question" in st.session_state:
            question = st.session_state.prefilled_question
            del st.session_state.prefilled_question

        if question:

            st.chat_message("user").write(question)
            st.session_state.stats["questions"] += 1

            try:
                with st.spinner("🤖 Thinking..."):
                    answer, sources = rag_chain(question)

            except Exception:
                st.error("⚠️ API quota exceeded or service busy. Please retry later.")
                st.stop()

            st.chat_message("assistant").write(answer)

            unique_sources = {}
            for doc in sources:
                src = doc.metadata.get("source", "Unknown")
                page = doc.metadata.get("page", "N/A")
                display_page = int(page) + 1 if str(page).isdigit() else page
                unique_sources[f"{src}-{display_page}"] = (src, display_page)

            if unique_sources:
                with st.expander("📚 Sources"):
                    for s, p in unique_sources.values():
                        st.write(f"📄 {s} | Page {p}")

            st.session_state.messages.extend(
                [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer},
                ]
            )

    else:
        st.info("⬅ Upload and process documents to start chatting.")


# ==================================================
# ANALYTICS TAB
# ==================================================

with tab_analytics:

    st.subheader("📊 Session Analytics")

    stats_data = {
        "Files": st.session_state.stats["files"],
        "Pages": st.session_state.stats["pages"],
        "Chunks": st.session_state.stats["chunks"],
        "Questions": st.session_state.stats["questions"],
    }

    st.bar_chart(stats_data)


# --------------------------------------------------
# SIDEBAR — EXPORT CHAT
# --------------------------------------------------

st.sidebar.header("📤 Export Chat")

if st.session_state.messages:

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    st.sidebar.download_button(
        "⬇ TXT",
        export_chat_txt(st.session_state.messages),
        file_name=f"chat_{ts}.txt",
    )

    st.sidebar.download_button(
        "⬇ JSON",
        export_chat_json(st.session_state.messages),
        file_name=f"chat_{ts}.json",
    )

else:
    st.sidebar.info("No chat yet.")
