import os
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

load_dotenv()


def _parse_csv_env(value):
    """Parse comma-separated env values into a clean list."""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

# --------------------------------------------------
# MODEL POOL (PRIMARY → FALLBACK)
# --------------------------------------------------

MODEL_POOL = [
    {
        "provider": "gemini",
        "model": "gemini-2.5-flash",
    },
]

openrouter_model = os.getenv("OPENROUTER_MODEL")
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
openrouter_fallback_models = _parse_csv_env(
    os.getenv("OPENROUTER_FALLBACK_MODELS", "openrouter/auto")
)

# Add OpenRouter as fallback only when fully configured.
if openrouter_api_key and openrouter_model:
    openrouter_candidates = [openrouter_model, *openrouter_fallback_models]
    seen = set()

    for candidate in openrouter_candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        MODEL_POOL.append(
            {
                "provider": "openrouter",
                "model": candidate,
            }
        )

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

    if provider == "openrouter":
        # OpenRouter requires both an API key and a model name to be configured.
        # If either is missing, we cannot proceed with this provider.
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key or not model:
            # This error is caught by the RAG chain to allow graceful fallback.
            raise RuntimeError("OpenRouter is not configured. Missing API key or model name.")

        # Use the OpenAI-compatible client to connect to OpenRouter.
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0,
        )

    # This should not be reached if the MODEL_POOL is configured correctly.
    raise ValueError(f"Unknown model provider: {provider}")
