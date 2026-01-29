import os
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI

# Grok (xAI) OpenAI-compatible client
from langchain_openai import ChatOpenAI

load_dotenv()

# --------------------------------------------------
# MODEL POOL (PRIMARY → FALLBACK)
# --------------------------------------------------

MODEL_POOL = [
    {
        "provider": "gemini",
        "model": "gemini-2.5-flash",
    },
    {
        "provider": "xai",
        "model": "grok-beta",
    },
]

_active_index = 0


# --------------------------------------------------
# GET ACTIVE CONFIG
# --------------------------------------------------

def get_active_config():
    return MODEL_POOL[_active_index]


# --------------------------------------------------
# ROTATE MODEL
# --------------------------------------------------

def rotate_model():
    global _active_index

    _active_index += 1

    if _active_index >= len(MODEL_POOL):
        _active_index = 0

    cfg = MODEL_POOL[_active_index]
    print(f"🔁 Switched to {cfg['provider']} → {cfg['model']}")


# --------------------------------------------------
# RESET TO PRIMARY
# --------------------------------------------------

def reset_model():
    global _active_index
    _active_index = 0


# --------------------------------------------------
# CREATE LLM INSTANCE
# --------------------------------------------------

def get_llm():

    cfg = get_active_config()

    provider = cfg["provider"]
    model = cfg["model"]

    print(f"🤖 Using {provider} → {model}")

    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=0,
            streaming=False,
        )

    if provider == "xai":

        api_key = os.getenv("XAI_API_KEY")

        if not api_key:
            raise RuntimeError("❌ XAI_API_KEY not set in environment")

        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://api.x.ai/v1",
            temperature=0,
        )

    raise ValueError(f"Unknown model provider: {provider}")
