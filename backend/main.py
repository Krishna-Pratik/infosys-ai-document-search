from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
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
        "pages": len(docs),
        "per_file": _per_file_stats(docs, chunks),
    }

def _sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

@app.post("/query/stream")
async def query_stream(req: QueryRequest):
    """SSE endpoint: streams retrieval/generation events token by token."""
    pipeline = _ensure_chain()

    def gen():
        try:
            for ev in pipeline.stream(req.question):
                yield _sse(ev["event"], ev["data"])
        except Exception as e:  # last-resort: never die silently mid-stream
            yield _sse("error", {"message": str(e)})

    # A sync generator is iterated in a threadpool by Starlette, so the
    # blocking FAISS/LLM calls never stall the event loop.
    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.post("/query")
async def query(req: QueryRequest):
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

@app.get("/health")
async def health():
    return {"status": "ok"}
