from langchain_text_splitters import RecursiveCharacterTextSplitter, Language
from langchain_community.document_loaders import TextLoader

loader = TextLoader("sample_code.py")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=50,
    chunk_overlap=10
)

chunks = splitter.split_documents(docs)

print(len(chunks))

for chunk in chunks:
    print("----")
    print(chunk.page_content)
