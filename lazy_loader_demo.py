from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader

loader = DirectoryLoader(
    path="pdfs",
    glob="*.pdf",
    loader_cls=PyPDFLoader
)

# Eager loading
docs = loader.load()
print("Eager load count:", len(docs))

# Lazy loading
lazy_docs = loader.lazy_load()

count = 0
for doc in lazy_docs:
    count += 1
    print("Lazy doc metadata:", doc.metadata)

print("Lazy load count:", count)
