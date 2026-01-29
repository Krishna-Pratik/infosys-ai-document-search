from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv

load_dotenv()

# 1. Load document
loader = TextLoader("cricket.txt")
documents = loader.load()

# 2. Split text
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20
)

docs = text_splitter.split_documents(documents)

# 3. Convert to embeddings and store in vector DB
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001"
)

vectorstore = FAISS.from_documents(docs, embeddings)

# 4. Create retriever
retriever = vectorstore.as_retriever()

# 5. Manually retrieve relevant documents
query = "Who is Virat Kohli?"

retrieved_docs = retriever.invoke(query)

# 6. Pass retrieved docs to LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3
)

prompt = f"""
Based on the following context, answer the question.

Context:
{retrieved_docs}

Question:
{query}
"""

answer = llm.invoke(prompt)

print(answer.content)
