import shutil
import os
import streamlit as st

UPLOAD_DIR = "data/uploads"
VECTOR_DIR = "vectorstore"


def reset_app():
    # Delete uploaded files
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR)

    # Delete vectorstore
    if os.path.exists(VECTOR_DIR):
        shutil.rmtree(VECTOR_DIR)

    # Clear all session state keys so no stale vectorstore/chat state survives.
    st.session_state.clear()
