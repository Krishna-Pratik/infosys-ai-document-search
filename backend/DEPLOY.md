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
   SENTRY_DSN=<optional sentry dsn>   # unset = error tracking stays off
   ```

4. **Deploy** → Copy the URL (e.g., `https://your-app.onrender.com`)

## Local Test:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Open: http://localhost:8000/health

## Production visibility

- **Structured logs** — every operational event is one grep-able line in
  Render's log viewer: `event=provider_failed model=... kind=rate_limited
  error_type=... error=...`, `event=providers_exhausted`, `event=boot`,
  `event=generation_started/completed`. Search Render logs for `event=`.
- **Sentry (optional)** — set `SENTRY_DSN` in the Render dashboard to
  turn it on. Unhandled exceptions and pool-exhaustion events report
  automatically; the `/health` payload shows `"sentry": true/false`.
- **/health** — returns HTTP 200 (so Render never recycles the free
  container on an upstream outage) with a real verdict in `status`:
  `ok` (a provider key is live + store state), `degraded` (keys
  configured but none reachable), `starting` (keys not configured yet).
  Provider checks are zero-token key-validity probes, cached 60s.
