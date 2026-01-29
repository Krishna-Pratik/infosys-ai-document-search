from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

embedding = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001"
)

result = embedding.embed_query("Delhi is the capital of India")

print(type(result))
print(len(result))
print(result[:10])
