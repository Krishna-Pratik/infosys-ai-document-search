import shutil
import os
import streamlit as st

UPLOAD_DIR = "data/uploads"
VECTOR_DIR = "vectorstore"


def reset_app():
    # Clear chat messages
    if "messages" in st.session_state:
        st.session_state.messages = []

    # Reset stats
    if "stats" in st.session_state:
        st.session_state.stats = {
            "files": 0,
            "pages": 0,
            "chunks": 0,
            "questions": 0
        }

    # Delete uploaded files
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR)

    # Delete vectorstore
    if os.path.exists(VECTOR_DIR):
        shutil.rmtree(VECTOR_DIR)
