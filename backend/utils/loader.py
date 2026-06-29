import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader

def load_documents(folder):

    documents = []

    for filename in os.listdir(folder):

        path = os.path.join(folder, filename)

        if filename.lower().endswith(".pdf"):
            loader = PyPDFLoader(path)
            documents.extend(loader.load())

        elif filename.lower().endswith(".txt"):
            loader = TextLoader(path)
            documents.extend(loader.load())

    return documents
