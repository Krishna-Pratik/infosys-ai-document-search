from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate

load_dotenv()

model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.7
)

topic = input("enter your topic: ")

prompt1 = PromptTemplate(
    input_variables=["topic"],
    template="Generate 3 interesting fact about the topic\n{topic}"
)

# Old way
formatted_prompt = prompt1.format(topic=topic)
result1 = model.invoke(formatted_prompt)
print("\nOLD METHOD:\n", result1.content)

# Runnable way
chain = prompt1 | model
result2 = chain.invoke(topic)

print("\nRUNNABLE WAY:\n", result2.content)
