from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader

loader = TextLoader("cricket.txt")
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=50,
    chunk_overlap=10
)

chunks = text_splitter.split_documents(docs)

print(len(chunks))

for chunk in chunks:
    print("----")
    print(chunk.page_content)
