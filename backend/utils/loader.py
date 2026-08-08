import os
import json
import base64
import mimetypes

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader

load_dotenv()


# --------------------------------------------------
# SUPPORTED FORMATS
# --------------------------------------------------

PDF_EXT = {".pdf"}
TEXT_EXT = {".txt", ".md", ".markdown", ".log", ".py", ".js", ".ts", ".html",
            ".css", ".java", ".c", ".cpp", ".yaml", ".yml", ".xml", ".rst"}
CSV_EXT = {".csv", ".tsv"}
EXCEL_EXT = {".xlsx", ".xls", ".xlsm"}
DOCX_EXT = {".docx"}
JSON_EXT = {".json"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}


# --------------------------------------------------
# PER-FORMAT EXTRACTORS
# --------------------------------------------------

def _load_pdf(path):
    return PyPDFLoader(path).load()


def _load_text(path):
    # encoding fallback keeps odd text files from crashing the upload.
    try:
        return TextLoader(path, encoding="utf-8").load()
    except Exception:
        return TextLoader(path, encoding="latin-1").load()


def _load_csv(path):
    import pandas as pd

    sep = "\t" if path.lower().endswith(".tsv") else ","
    df = pd.read_csv(path, sep=sep)
    text = _df_to_text(df, os.path.basename(path))
    return [Document(page_content=text, metadata={"source": path, "rows": len(df)})]


def _load_excel(path):
    import pandas as pd

    sheets = pd.read_excel(path, sheet_name=None)  # dict: name -> DataFrame
    docs = []
    for name, df in sheets.items():
        text = _df_to_text(df, f"{os.path.basename(path)} :: sheet '{name}'")
        docs.append(
            Document(
                page_content=text,
                metadata={"source": path, "sheet": name, "rows": len(df)},
            )
        )
    return docs


def _df_to_text(df, title):
    # Compact, model-friendly rendering of a table.
    preview = df.fillna("").astype(str)
    lines = [f"# {title}", f"Columns: {', '.join(map(str, df.columns))}", ""]
    lines.append(preview.to_csv(index=False))
    return "\n".join(lines)


def _load_docx(path):
    import docx2txt

    text = docx2txt.process(path) or ""
    return [Document(page_content=text, metadata={"source": path})]


def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    text = json.dumps(data, indent=2, ensure_ascii=False)
    return [Document(page_content=text, metadata={"source": path})]


def _load_image(path):
    """Extract text + a description from an image using the Gemini vision model."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", temperature=0, api_key=api_key
    )
    message = {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": (
                    "Extract ALL text from this image verbatim (OCR). Then add a "
                    "concise description of any charts, tables, diagrams, or visual "
                    "content. Preserve structure where possible."
                ),
            },
            {"type": "image_url", "image_url": f"data:{mime};base64,{b64}"},
        ],
    }
    result = llm.invoke([message])
    text = result.content if isinstance(result.content, str) else str(result.content)

    return [
        Document(
            page_content=f"# Image: {os.path.basename(path)}\n\n{text}",
            metadata={"source": path, "type": "image"},
        )
    ]


# --------------------------------------------------
# DISPATCH
# --------------------------------------------------

def _extract(path):
    ext = os.path.splitext(path)[1].lower()

    if ext in PDF_EXT:
        return _load_pdf(path)
    if ext in CSV_EXT:
        return _load_csv(path)
    if ext in EXCEL_EXT:
        return _load_excel(path)
    if ext in DOCX_EXT:
        return _load_docx(path)
    if ext in JSON_EXT:
        return _load_json(path)
    if ext in IMAGE_EXT:
        return _load_image(path)
    if ext in TEXT_EXT:
        return _load_text(path)

    # Unknown extension: best-effort read as plain text, else skip.
    try:
        return _load_text(path)
    except Exception:
        print(f"[loader] Skipped unsupported file: {os.path.basename(path)}")
        return []


# --------------------------------------------------
# PUBLIC API
# --------------------------------------------------

def load_documents(folder):
    documents = []

    for filename in os.listdir(folder):
        path = os.path.join(folder, filename)
        if not os.path.isfile(path):
            continue

        try:
            docs = _extract(path)
            documents.extend(docs)
            print(f"[loader] {filename}: extracted {len(docs)} document(s)")
        except Exception as e:
            print(f"[loader] Failed on {filename}: {e}")

    return documents
