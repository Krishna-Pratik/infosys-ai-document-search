# Render Deployment Guide

## Steps:

1. **Create Render account** → https://render.com

2. **New Web Service:**
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Environment Variables:**
   ```
   GOOGLE_API_KEY=<your-google-api-key>
   OPENROUTER_API_KEY=<your-openrouter-api-key>
   OPENROUTER_MODEL=openrouter/auto
   ```

4. **Deploy** → Copy the URL (e.g., `https://your-app.onrender.com`)

## Local Test:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Open: http://localhost:8000/health
