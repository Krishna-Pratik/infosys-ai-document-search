from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
import sys
from pathlib import Path

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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/uploads")
VECTOR_DIR = Path("vectorstore")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_DIR.mkdir(parents=True, exist_ok=True)

rag_chain = None

class QueryRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    global rag_chain

    for f in UPLOAD_DIR.glob("*"):
        f.unlink()
    for f in VECTOR_DIR.glob("*"):
        f.unlink()

    for file in files:
        path = UPLOAD_DIR / file.filename
        with path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    docs = load_documents(str(UPLOAD_DIR))
    chunks = split_documents(docs)
    vectorstore = create_vectorstore(chunks, str(VECTOR_DIR))
    rag_chain = build_rag_chain(vectorstore)

    return {
        "files": len(files),
        "chunks": len(chunks),
        "pages": len(docs)
    }

@app.post("/query")
async def query(req: QueryRequest):
    global rag_chain

    if not rag_chain:
        if vectorstore_exists(str(VECTOR_DIR)):
            vectorstore = load_vectorstore(str(VECTOR_DIR))
            rag_chain = build_rag_chain(vectorstore)
        else:
            raise HTTPException(400, "Upload files first")

    answer, docs = rag_chain(req.question)
    sources = [{"page": d.metadata.get("page", "N/A"), "content": d.page_content[:200]} for d in docs]

    return {"answer": answer, "sources": sources}

@app.get("/health")
async def health():
    return {"status": "ok"}
