![Python](https://img.shields.io/badge/Python-3.10+-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-App-red)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)

# 🚀 Infosys AI Document Search Platform

An enterprise-grade AI-powered document analysis and question-answering platform built using **Retrieval Augmented Generation (RAG)** architecture, **Streamlit UI**, and a resilient multi-provider Large Language Model (LLM) strategy powered by **Google Gemini** with automatic fallback to **OpenRouter**.

This platform enables users to upload documents, explore their contents, ask questions in natural language, analyze sessions, preview files, and export conversations — all through a professional and scalable interface.

---

## ✨ Key Features

- 📂 Upload PDF / TXT documents  
- 🔍 Semantic document retrieval using vector embeddings  
- 💬 Conversational AI using RAG  
- ⚡ Embedding cache to avoid recomputation  
- 🔁 Automatic LLM failover (Gemini → OpenRouter)  
- � Analytics dashboard  
- 📄 Sidebar document preview  
- 📤 Export chat history (TXT / JSON)  
- 📌 Pinned chat input UX  
- 🔐 Secure environment variable handling  
- ♻ Reset workspace & sessions  
- Modular enterprise-ready architecture  

---

## 🏗️ System Architecture

```
User (Streamlit UI)
        │
        ▼
Document Loader
        │
        ▼
Text Splitter
        │
        ▼
Embedding Generator
        │
        ▼
FAISS Vector Store (Cached)
        │
        ▼
Retriever
        │
        ▼
Prompt Template
        │
        ▼
LLM Router (Gemini / OpenRouter)
        │
        ▼
Answer + Source Documents
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|------|----------|
| UI | Streamlit |
| RAG Framework | LangChain |
| Vector Database | FAISS |
| Embeddings | Gemini Embeddings |
| Primary LLM | Gemini 2.5 Flash |
| Fallback LLM | OpenRouter |
| Backend | Python |
| Secrets | python-dotenv |
| Deployment | Cloud VM / Streamlit Cloud / Docker |

---

## 📁 Project Structure

```
infosys-ai-document-intelligence/
│
├── app.py
├── utils/
│   ├── loader.py
│   ├── splitter.py
│   ├── embeddings.py
│   ├── rag_chain.py
│   ├── model_manager.py
│   └── reset.py
│
├── data/
│   └── uploads/
│
├── vectorstore/
│
├── .env
├── requirements.txt
├── .gitignore
├── README.md
```

---

## ⚙️ Installation & Local Setup

Clone Repository:

git clone https://github.com/Krishna-Pratik/infosys-ai-document-search.git  
cd infosys-ai-document-search  

Create Virtual Environment:

python -m venv venv  
source venv/bin/activate  
venv\Scripts\activate  

Install Dependencies:

pip install -r requirements.txt  

Configure Environment Variables:

Create a `.env` file:

GOOGLE_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=anthropic/claude-3-haiku

Run Application:

streamlit run app.py  

---

## 📊 Analytics Module

Provides real-time insights into:

- Documents processed  
- Pages loaded  
- Chunks generated  
- Questions asked  

---

## 🔁 Intelligent Model Routing

When a provider quota or rate limit is exceeded, the platform automatically switches between LLM providers:

1. Google Gemini  
2. OpenRouter  

This ensures high availability without disrupting user workflows.

---

## 💾 Embedding Cache Strategy

To reduce cost and processing time:

- Document fingerprints are generated  
- Cached embeddings reused for unchanged uploads  
- Vector stores persisted locally  

---

## 🔐 Security Practices

- API keys stored in `.env`  
- `.gitignore` prevents secrets from being committed  
- Environment-isolated configuration  
- No credentials stored in code  

---

## 📤 Export Capabilities

Conversation history can be exported in:

- TXT format  
- JSON format  

---

## 📄 Supported File Formats

- PDF  
- TXT  

---

## 🌍 Deployment Options

Recommended environments:

- Streamlit Community Cloud  
- AWS EC2 / Lightsail  
- Azure VM  
- Google Compute Engine  
- Docker Containers  

---

## 🚧 Roadmap

- OCR for scanned documents  
- Hybrid retrieval strategies  
- Authentication & RBAC  
- Cost monitoring dashboards  
- REST API exposure  
- Cloud storage integrations  
- Agent-based orchestration  

---

## 👨‍💻 Author

**Krishna Pratik**  
3rd Year Computer Science Student  

---

## ⭐ Acknowledgements

If this project helped you, please consider starring ⭐ the repository.

---

**Built with enterprise-grade design principles aligned with Infosys engineering standards.**
