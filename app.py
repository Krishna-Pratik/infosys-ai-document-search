# ==============================================================================
# IMPORTS
# ==============================================================================
import streamlit as st
import os
import json
import shutil
import time
import re
import html
from datetime import datetime
from dotenv import load_dotenv

# Local utility imports
from utils.loader import load_documents
from utils.splitter import split_documents
from utils.embeddings import create_vectorstore
from utils.rag_chain import build_rag_chain
from utils.reset import reset_app

# ==============================================================================
# APP CONFIGURATION
# ==============================================================================
# Load environment variables from a .env file for security
load_dotenv()

# Configure the Streamlit page
st.set_page_config(
    page_title="AI Document Search Pro",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Define constants for directory paths to ensure consistency
UPLOAD_DIR = "data/uploads"
VECTOR_DIR = "vectorstore"

# ==============================================================================
# STYLING
# ==============================================================================
# Inject custom CSS for a modern, polished look.
# This includes animations, design tokens (variables), and styles for all UI
# components like sidebar, buttons, chat messages, etc.
st.markdown("""
<style>
/* ==================================================
   ANIMATIONS
   ================================================== */

@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

/* ==================================================
   DESIGN TOKENS
   ================================================== */

:root {
    --bg-primary: #030712;
    --bg-secondary: #0B0F19;
    --accent-primary: #6366F1;
    --accent-secondary: #22D3EE;
    --accent-purple: #A855F7;
    
    --gradient-main: linear-gradient(135deg, #6366F1 0%, #22D3EE 50%, #A855F7 100%);
    --gradient-text: linear-gradient(135deg, #6366F1 0%, #22D3EE 50%, #A855F7 100%);
    --gradient-bg: linear-gradient(-45deg, #060912, #0B0F19, #160e34, #0f172a);
    
    --text-primary: #F3F4F6;
    --text-secondary: #9CA3AF;
    --text-muted: #6B7280;
    
    --border-subtle: rgba(255, 255, 255, 0.08);
    --border-glow: rgba(99, 102, 241, 0.3);
    
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
}

/* ==================================================
   BASE STYLES
   ================================================== */

* { box-sizing: border-box; }

/* App background */
.stApp {
    background: var(--gradient-bg);
    background-size: 200% 200%;
    animation: gradientShift 25s ease infinite;
}

/* Main content - compact */
.main .block-container {
    padding-top: 0.4rem;
    padding-bottom: 10rem;
    max-width: 1200px !important;
    margin: auto;
}

/* ==================================================
   SIDEBAR — SAFE DEFAULTS
   ================================================== */

/* Force sidebar to stay expanded */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, rgba(11, 15, 25, 0.98) 0%, rgba(17, 24, 39, 0.95) 100%);
    border-right: 1px solid rgba(99, 102, 241, 0.2);
}

[data-testid="stSidebar"] .block-container {
    padding: 2rem;
}

/* Keep Streamlit's native sidebar controls visible.
   Hiding these can also hide the sidebar container in some Streamlit versions. */

/* ==================================================
   HIDE STREAMLIT CHROME
   ================================================== */

/* header[data-testid="stHeader"] { visibility: hidden; height: 0; } */
footer[data-testid="stFooter"] { visibility: hidden; height: 0; }
/* #MainMenu { display: none !important; } */
[data-testid="stDecoration"] { display: none; }

/* ==================================================
   HERO SECTION
   ================================================== */

.hero-glow {
    padding: 0.1rem 0;
    margin-bottom: 0;
}

.hero-title {
    font-size: 1.5rem;
    font-weight: 800;
    background: var(--gradient-text);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
    animation: shimmer 3s linear infinite;
    margin: 0;
}

.hero-subtitle {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0.05rem 0 0 0;
}

.divider-glow {
    height: 1px;
    background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(99, 102, 241, 0.4) 20%,
        rgba(34, 211, 238, 0.4) 50%,
        transparent 100%
    );
    margin: 0.1rem 0 0.25rem 0;
}

/* ==================================================
   TABS
   ================================================== */

[data-testid="stTabs"] {
    border-bottom: none;
    margin-bottom: 0.5rem;
    margin-top: 0.25rem;
}

[data-testid="stTabs"] [role="tablist"] {
    gap: 0.375rem;
    background: rgba(17, 24, 39, 0.5);
    padding: 0.25rem;
    border-radius: var(--radius-md);
    display: inline-flex;
}

[data-testid="stTabs"] [role="tab"] {
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.8rem;
    padding: 0.5rem 1rem;
    transition: all 0.3s ease;
}

[data-testid="stTabs"] [role="tab"]:hover {
    color: var(--text-primary);
    background: rgba(99, 102, 241, 0.1);
}

[data-testid="stTabs"] [role="tab"][aria-selected="true"] {
    background: var(--gradient-main);
    color: white;
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
}

/* ==================================================
   BUTTONS
   ================================================== */

.stButton > button {
    background: var(--gradient-main);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-weight: 700;
    font-size: 0.8rem;
    padding: 0.625rem 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.4);
}

.stButton > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 18px rgba(99, 102, 241, 0.5);
}

/* Sidebar buttons */
[data-testid="stSidebar"] .stButton > button {
    width: 100%;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(34, 211, 238, 0.1) 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);
    margin-bottom: 0.625rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.775rem;
}

[data-testid="stSidebar"] .stButton > button:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(34, 211, 238, 0.15) 100%);
    border-color: var(--accent-primary);
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

/* ==================================================
   FILE UPLOADER
   ================================================== */

[data-testid="stSidebar"] [data-testid="stFileUploader"] {
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(27, 35, 50, 0.6) 100%);
    border: 2px dashed rgba(99, 102, 241, 0.3);
    border-radius: var(--radius-md);
    padding: 0.875rem;
    transition: all 0.3s ease;
    margin-bottom: 0.75rem;
}

[data-testid="stSidebar"] [data-testid="stFileUploader"]:hover {
    border-color: var(--accent-primary);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
}

/* ==================================================
   CHAT MESSAGES
   ================================================== */

[data-testid="stChatMessage"] {
    padding: 0.75rem 1rem;
    margin: 0.375rem 0;
    border-radius: var(--radius-md);
}

[data-testid="stChatMessage"] [data-testid="stAvatar"] {
    width: 32px;
    height: 32px;
}

[data-testid="stChatMessage"] .markdown {
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.5;
}

/* ==================================================
   SOURCES (INLINE MINIMAL)
   ================================================== */

.sources-inline {
    margin-top: 0.2rem;
    display: block;
}

.source-inline-item {
    display: block;
    font-size: 12px;
    line-height: 1.35;
    color: rgba(156, 163, 175, 0.88);
    margin: 0.08rem 0;
    padding: 0;
}

/* ==================================================
   CHAT INPUT
   ================================================== */

/*
  The chat input container is fixed to the bottom of the viewport.
  By default, it spans the full screen width, which is correct for mobile
  views where the sidebar is a temporary overlay.
*/
[data-testid="stChatInput"] {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(3, 7, 18, 0.98) 30%);
    padding: 0.5rem 1.5rem 1rem 1.5rem;
    z-index: 9999;
}

/*
  On larger screens (desktops), the sidebar is permanently visible on the left.
  This media query applies a left offset to the chat input, equal to the
  sidebar's width, to prevent them from overlapping. This aligns the
  chat input correctly with the main content area.
*/
@media (min-width: 992px) {
    [data-testid="stChatInput"] {
        left: 304px; /* Standard width of an expanded Streamlit sidebar */
    }
}

[data-testid="stChatInput"] .stChatInput {
    max-width: 800px;
    margin: 0 auto;
}

[data-testid="stChatInput"] textarea {
    background: rgba(17, 24, 39, 0.95);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius-lg);
    padding: 0.75rem 1rem;
    color: var(--text-primary);
    font-size: 0.875rem;
    min-height: 2.75rem;
    transition: all 0.3s ease;
}

[data-testid="stChatInput"] textarea:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
    outline: none;
}

/* Custom "Generating" bar to replace chat input */
.generating-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(3, 7, 18, 0.98) 30%);
    padding: 0.5rem 1.5rem 1rem 1.5rem;
    z-index: 9999;
}

@media (min-width: 992px) {
    .generating-bar {
        left: 304px; /* Align with main content */
    }
}

.generating-bar .stChatInput { /* Re-use for alignment */
    max-width: 800px;
    margin: 0 auto;
}

/* Style the Stop button inside the generating bar */
.generating-bar .stButton > button {
    background: rgba(239, 68, 68, 0.8); /* Red for stop */
    border: 1px solid rgba(239, 68, 68, 1);
    border-radius: var(--radius-lg);
    color: white;
    font-weight: 600;
    font-size: 0.8rem;
    width: 100%;
    height: 2.75rem;
    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
    transition: all 0.2s ease;
}

.generating-bar .stButton > button:hover {
    background: rgba(220, 38, 38, 1);
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    transform: translateY(-1px);
}

/* ==================================================
   ANALYTICS CARDS
   ================================================== */

.analytics-card {
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(27, 35, 50, 0.6) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-md);
    padding: 1rem;
    text-align: center;
    transition: all 0.3s ease;
}

.analytics-card:hover {
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.analytics-icon {
    font-size: 1.75rem;
    margin-bottom: 0.375rem;
}

.analytics-value {
    font-size: 1.75rem;
    font-weight: 800;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.analytics-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-top: 0.25rem;
    font-weight: 600;
}

/* ==================================================
   EMPTY STATES
   ================================================== */

.empty-state {
    text-align: center;
    padding: 1.5rem 1.5rem;
    background: rgba(17, 24, 39, 0.6);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius-lg);
    margin: 0.5rem auto;
    max-width: 550px;
}

.empty-state-icon {
    font-size: 3.5rem;
    margin-bottom: 0.5rem;
    animation: float 3s ease-in-out infinite;
}

.empty-state-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.empty-state-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
    line-height: 1.5;
}

.empty-state-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1rem;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: var(--radius-sm);
    font-size: 0.775rem;
    color: var(--accent-primary);
    font-weight: 600;
}

.chat-empty-state {
    text-align: center;
    padding: 2rem 1rem;
    background: rgba(17, 24, 39, 0.5);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius-lg);
    margin: 0.75rem 0;
}

.chat-empty-state-icon {
    font-size: 2.75rem;
    margin-bottom: 0.625rem;
}

.chat-empty-state-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.chat-empty-state-desc {
    font-size: 0.775rem;
    color: var(--text-secondary);
    margin: 0;
}

/* ==================================================
   ALERTS
   ================================================== */

.stAlert {
    background: rgba(17, 24, 39, 0.8);
    border-radius: var(--radius-sm);
    border-left: 2px solid;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
}

.stAlert-info { border-left-color: var(--accent-primary); }
.stAlert-warning { border-left-color: #F59E0B; }
.stAlert-success { border-left-color: #10B981; }
.stAlert-error { border-left-color: #EF4444; }

.stAlert [data-testid="stAlertBody"] {
    color: var(--text-primary);
    font-size: 0.75rem;
}

/* ==================================================
   EXPANDER
   ================================================== */

details {
    background: rgba(17, 24, 39, 0.8);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius-sm);
    padding: 0.625rem;
}

details[open] { border-color: var(--accent-primary); }

summary {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
}

/* ==================================================
   SCROLLBAR
   ================================================== */

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(11, 15, 25, 0.5); }
::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 3px;
}

/* ==================================================
   DOWNLOAD BUTTONS
   ================================================== */

.stDownloadButton > button {
    width: 100%;
    background: rgba(17, 24, 39, 0.8);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.7rem;
    padding: 0.5rem 0.625rem;
    transition: all 0.3s ease;
}

.stDownloadButton > button:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--accent-primary);
    transform: translateY(-1px);
}

</style>
""", unsafe_allow_html=True)


# ==============================================================================
# SESSION STATE INITIALIZATION
# ==============================================================================
# Initialize session state variables to preserve state across reruns.
# - 'stats': A dictionary to hold analytics data.
# - 'messages': A list to store chat history.
# - 'docs_processed': A flag to indicate if documents have been processed.

if "stats" not in st.session_state:
    st.session_state.stats = {"files": 0, "pages": 0, "chunks": 0, "questions": 0}

if "messages" not in st.session_state:
    st.session_state.messages = []

if "docs_processed" not in st.session_state:
    st.session_state.docs_processed = False

if "generating" not in st.session_state:
    st.session_state.generating = False

if "vectorstore" not in st.session_state:
    st.session_state.vectorstore = None


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def export_chat_txt(messages):
    """Formats chat history into a plain text string."""
    return "\n\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages])

def export_chat_json(messages):
    """Formats chat history into a JSON string."""
    return json.dumps(messages, indent=2)


def render_sources_inline(sources):
    """Renders sources as subtle inline metadata without changing source data."""
    if not sources:
        return

    lines = []
    for source_name, page in sources:
        safe_source = html.escape(str(source_name))
        safe_page = html.escape(str(page))
        lines.append(
            f'<div class="source-inline-item">📄 {safe_source} • Page {safe_page}</div>'
        )

    st.markdown(
        f'<div class="sources-inline">{"".join(lines)}</div>',
        unsafe_allow_html=True,
    )

# ==============================================================================
# SIDEBAR UI
# ==============================================================================
# This section defines the user interface for the sidebar, which includes
# controls for document upload, processing, and chat export.

st.sidebar.markdown("""
<div style="margin-bottom: 1.5rem;">
    <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.25rem;">📁</span> Document Upload
    </div>
</div>
""", unsafe_allow_html=True)

# Controls Section
st.sidebar.markdown("""
<div style="margin-bottom: 1rem;">
    <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        <span style="font-size: 1rem;">⚙️</span> Controls
    </div>
</div>
""", unsafe_allow_html=True)

if st.sidebar.button("🗑️ Clear & Reset App", use_container_width=True):
    reset_app()
    st.rerun()

# File Uploader
st.sidebar.markdown('<div style="font-size: 0.8rem; color: var(--text-secondary); margin: 1rem 0 0.5rem 0;">Upload PDF or TXT files</div>', unsafe_allow_html=True)
uploaded_files = st.sidebar.file_uploader(
    "Upload files",
    type=["pdf", "txt"],
    accept_multiple_files=True,
    label_visibility="collapsed"
)

# Document Processing Logic
if st.sidebar.button("🚀 Process Documents", use_container_width=True):
    if uploaded_files:
        # Start a clean session whenever user processes a new upload batch.
        st.session_state.docs_processed = False
        st.session_state.messages = []
        st.session_state.vectorstore = None

        st.sidebar.info("Previous document context cleared. Processing new document...")

        # Always wipe previous uploads so only the current selection is indexed.
        if os.path.exists(UPLOAD_DIR):
            shutil.rmtree(UPLOAD_DIR)

        # Save uploaded files to the upload directory
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        for file in uploaded_files:
            with open(os.path.join(UPLOAD_DIR, file.name), "wb") as f:
                f.write(file.getbuffer())

        st.session_state.stats["files"] = len(uploaded_files)

        # RAG Pipeline Steps: Load -> Split -> Embed -> Store
        with st.spinner("📄 Loading..."):
            docs = load_documents(UPLOAD_DIR)
        st.session_state.stats["pages"] = len(docs)

        with st.spinner("✂️ Splitting..."):
            chunks = split_documents(docs)
        st.session_state.stats["chunks"] = len(chunks)

        if not docs:
            st.sidebar.error("No documents were loaded. Please upload valid PDF or TXT files.")
        elif not chunks:
            st.sidebar.error("No readable text was found to index. Try text-based files (not image-only PDFs).")
        else:
            # Always rebuild a fresh FAISS index for the current upload batch.
            if os.path.exists(VECTOR_DIR):
                shutil.rmtree(VECTOR_DIR)

            try:
                with st.spinner("🧠 Creating embeddings..."):
                    db = create_vectorstore(chunks, VECTOR_DIR)

                if db is None:
                    st.sidebar.error("Embedding creation failed. Please try again.")
                    st.stop()

                st.session_state["vectorstore"] = db
                st.session_state.docs_processed = True
                st.sidebar.success("✨ Fresh vector store created!")
            except ValueError as e:
                st.sidebar.error(str(e))
                st.stop()
            except Exception as e:
                st.sidebar.error(f"Failed to create vector store: {e}")
                st.stop()
    else:
        st.sidebar.error("Please upload files first")

st.sidebar.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

# Export Chat Section
st.sidebar.markdown("""
<div style="margin-bottom: 1rem;">
    <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        <span style="font-size: 1rem;">📤</span> Export Chat
    </div>
</div>
""", unsafe_allow_html=True)

if st.session_state.messages:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    col_txt, col_json = st.sidebar.columns(2)
    with col_txt:
        st.download_button("📄 TXT", export_chat_txt(st.session_state.messages), file_name=f"chat_{ts}.txt", use_container_width=True)
    with col_json:
        st.download_button("📋 JSON", export_chat_json(st.session_state.messages), file_name=f"chat_{ts}.json", use_container_width=True)
else:
    st.sidebar.info("No chat yet.")


# ==============================================================================
# MAIN UI
# ==============================================================================

# --- Hero Header ---
st.markdown("""
<div class="hero-glow">
    <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="font-size: 2rem; animation: float 3s ease-in-out infinite;">🔮</div>
        <div>
            <h1 class="hero-title">AI Document Search Pro</h1>
            <p class="hero-subtitle">Your personal AI-powered document expert.</p>
        </div>
    </div>
</div>
<div class="divider-glow"></div>
""", unsafe_allow_html=True)

# --- Main Content Tabs ---
tab_chat, tab_analytics = st.tabs(["💬 Chat", "📊 Analytics"])

# --- Chat Tab ---
# This tab contains the main chat interface and logic for handling user queries.
with tab_chat:
    # Use the in-session vectorstore to avoid stale disk context reuse.
    vectorstore = st.session_state.get("vectorstore")
            
    # Display chat interface only if documents have been processed
    if vectorstore and st.session_state.docs_processed:
        # --- Chat History Display ---
        rag_chain = build_rag_chain(vectorstore)
        if st.session_state.messages:
            for msg in st.session_state.messages:
                with st.chat_message(msg["role"], avatar="👤" if msg["role"] == "user" else "🤖"):
                    st.markdown(msg["content"])
                    # Re-render sources if they exist in the saved message
                    if msg.get("sources"):
                        render_sources_inline(msg["sources"])
            
            # Auto-scroll to the bottom of the chat view after rendering history
            st.markdown(
                """
                <script>
                    const chatContainer = window.parent.document.querySelector('.main');
                    if (chatContainer) {
                        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
                    }
                </script>
                """,
                unsafe_allow_html=True
            )
        else:
            st.markdown("""
            <div class="chat-empty-state">
                <div class="chat-empty-state-icon">💬</div>
                <h3 class="chat-empty-state-title">Start a Conversation</h3>
                <p class="chat-empty-state-desc">Ask questions about your documents</p>
            </div>
            """, unsafe_allow_html=True)

        # --- Generation Logic ---
        # This block runs only when a question is being processed.
        if st.session_state.get("generating"):
            last_user_message = next((msg for msg in reversed(st.session_state.messages) if msg["role"] == "user"), None)
            if last_user_message:
                question_to_process = last_user_message["content"]
                with st.chat_message("assistant", avatar="🤖"):
                    st.session_state.messages.append({"role": "assistant", "content": "", "sources": []})
                    try:
                        with st.spinner("Generating response..."):
                            answer, sources = rag_chain(question_to_process)
                    except Exception as e:
                        st.error(f"⚠️ {e}")
                        st.session_state.messages.pop()
                        st.session_state.generating = False
                        st.rerun()

                    def stream_text():
                        tokens = re.split(r'(\s+)', answer)
                        for token in tokens:
                            st.session_state.messages[-1]["content"] += token
                            yield token
                            time.sleep(0.01)
                    
                    st.write_stream(stream_text)

                    if sources:
                        unique_sources = {}
                        for doc in sources:
                            src = doc.metadata.get("source", "Unknown")
                            page = doc.metadata.get("page", "N/A")
                            display_page = int(page) + 1 if str(page).isdigit() else page
                            unique_sources[f"{src}-{display_page}"] = (src, display_page)
                        st.session_state.messages[-1]["sources"] = list(unique_sources.values())
                        if unique_sources:
                            render_sources_inline(list(unique_sources.values()))
            
            st.session_state.generating = False
            st.rerun() # Rerun to switch back to the normal input

        # --- Chat Input UI ---
        # Conditionally display either the input or the "Generating..." bar.
        if st.session_state.get("generating"):
            # This markdown injects a styled container that mimics the chat input's position.
            st.markdown(
                """
                <div class="generating-bar">
                    <div class="stChatInput">
                        <div style="display: flex; gap: 0.5rem;">
                            <div style="flex-grow: 1;"></div>
                            <div style="width: 150px;"></div>
                        </div>
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )
            # We use columns within the empty container to place the stop button.
            _, btn_col = st.columns([0.85, 0.15])
            if btn_col.button("⏹️ Stop Generating", use_container_width=True):
                st.session_state.generating = False
                st.rerun()
        else:
            if question := st.chat_input("Ask about your documents..."):
                st.session_state.messages.append({"role": "user", "content": question})
                st.session_state.stats["questions"] += 1
                st.session_state.generating = True
                st.rerun()

    # --- Initial State (No Documents) ---
    else:
        st.markdown("""
        <div class="empty-state">
            <div class="empty-state-icon">✨</div>
            <h2 class="empty-state-title">Unlock Insights from Your Documents</h2>
            <p class="empty-state-desc">Ready to get started? Upload your files and begin your intelligent search journey.</p>
            <div class="empty-state-cta"><span>⬅️</span> Upload your first document to begin</div>
        </div>
        """, unsafe_allow_html=True)

# --- Analytics Tab ---
# This tab displays session statistics.
with tab_analytics:
    st.markdown("""
    <div style="margin-bottom: 0.75rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">📊 Analytics</h3>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">Session metrics</p>
    </div>
    """, unsafe_allow_html=True)

    cols = st.columns(4)
    stats_data = {
        "Files": st.session_state.stats["files"],
        "Pages": st.session_state.stats["pages"],
        "Chunks": st.session_state.stats["chunks"],
        "Questions": st.session_state.stats["questions"],
    }
    icons = ["📁", "📄", "🔷", "💬"]
    
    for i, (label, value) in enumerate(stats_data.items()):
        with cols[i]:
            st.markdown(f"""
            <div class="analytics-card">
                <div class="analytics-icon">{icons[i]}</div>
                <div class="analytics-value">{value}</div>
                <div class="analytics-label">{label}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<div style='height: 0.75rem;'></div>", unsafe_allow_html=True)

    if any(v > 0 for v in stats_data.values()):
        st.bar_chart(stats_data)

# ==============================================================================
# FOOTER
# ==============================================================================
# (Footer removed as per user request)
