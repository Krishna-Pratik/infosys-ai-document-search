from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash"
)

# Schema using Pydantic
class Review(BaseModel):
    key_themes: List[str] = Field(description="List all key themes discussed in the review")
    summary: str = Field(description="A brief summary of the review")
    sentiments: str = Field(description="Return sentiment as positive, negative or neutral")
    pros: Optional[List[str]] = Field(default=None, description="List all pros mentioned")
    cons: Optional[List[str]] = Field(default=None, description="List all cons mentioned")
    name: Optional[str] = Field(default=None, description="Name of the reviewer if present")

structured_model = model.with_structured_output(Review)

text = """
I recently upgraded to the Samsung Galaxy S24 Ultra, and I must say, it’s an absolute powerhouse!
The processor is lightning fast and the battery lasts all day.
The camera is amazing even in low light.

However, the phone is heavy and expensive.
The software also comes with bloatware.

Review by Simran
"""

result = structured_model.invoke(text)

print(result)
print(result.name)
