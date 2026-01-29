from langchain_google_genai import ChatGoogleGenerativeAI
from typing import TypedDict
from dotenv import load_dotenv

load_dotenv()

model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash"
)

# Define schema
from typing import TypedDict, Annotated, Optional, List

class Review(TypedDict):
    key_themes: Annotated[List[str], "List all key themes discussed in the review"]
    pros: Annotated[Optional[List[str]], "List all pros mentioned"]
    cons: Annotated[Optional[List[str]], "List all cons mentioned"]
    summary: Annotated[str, "A brief summary of the review"]
    sentiments: Annotated[str, "Return sentiment as positive, negative or neutral"]



structured_model = model.with_structured_output(Review)


text = """
I recently upgraded to the Samsung Galaxy S24 Ultra, and I must say, it’s an absolute powerhouse!
The processor is lightning fast and the battery lasts all day.
The camera is amazing even in low light.

However, the phone is heavy and expensive.
The software also comes with bloatware.
"""


result = structured_model.invoke(text)

print(result)
