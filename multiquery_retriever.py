from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv

load_dotenv()

# Load docs
loader = TextLoader("cricket.txt")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20
)

chunks = splitter.split_documents(docs)

# Vector DB
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001"
)

vectorstore = FAISS.from_documents(chunks, embeddings)

# LLM to rewrite queries
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

query = "Who are famous Indian cricketers?"

rewrite_prompt = f"""
Generate 3 different versions of this question to improve document retrieval:

{query}
"""

rewrite_result = llm.invoke(rewrite_prompt)

raw_lines = rewrite_result.content.split("\n")

queries = []
for line in raw_lines:
    line = line.strip()

    # remove bullets, numbering, empty lines
    if not line:
        continue
    if line.startswith("-"):
        continue
    if line.lower().startswith("here are"):
        continue
    if "improvement" in line.lower():
        continue

    # remove numbering like "1. ..."
    if line[0].isdigit() and "." in line:
        line = line.split(".", 1)[1].strip()

    queries.append(line)

# fallback: if nothing parsed, use original query
if not queries:
    queries = [query]


print("Generated Queries:")
for q in queries:
    print("-", q)

print("\nRetrieved Documents:")

seen = set()
all_docs = []

for q in queries:
    docs = vectorstore.similarity_search(q, k=2)
    for doc in docs:
        key = doc.page_content
        if key not in seen:
            seen.add(key)
            all_docs.append(doc)

for doc in all_docs:
    print("----")
    print(doc.page_content)
