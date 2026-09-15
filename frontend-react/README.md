# NeuralDocs — Frontend (React + Vite)

Modern, production-grade SaaS UI for the NeuralDocs RAG platform. Upload PDF/TXT
documents and chat with them — answers are grounded in retrieved passages and
returned with cited sources.

Built with **React 19**, **Vite**, **Tailwind CSS v4**, **Framer Motion**,
**shadcn-style components**, and **Sonner** toasts. Talks to the FastAPI backend
deployed on Render.

---

## Tech stack

| Layer      | Choice                                         |
| ---------- | ---------------------------------------------- |
| Framework  | React 19 + Vite 8                              |
| Styling    | Tailwind CSS v4 (CSS-first config)             |
| Components | shadcn-style primitives (CVA + tailwind-merge) |
| Animation  | Framer Motion                                  |
| Markdown   | react-markdown + remark-gfm                    |
| Toasts     | Sonner                                         |
| Icons      | lucide-react                                   |

## Backend contract

The UI calls three endpoints (base URL = `VITE_API_URL`):

| Method | Path      | Body                          | Returns                                   |
| ------ | --------- | ----------------------------- | ----------------------------------------- |
| GET    | `/health` | —                             | `{ status: "ok" \| "starting" \| "degraded", vectorstore, providers, sentry }` |
| POST   | `/upload` | `multipart/form-data` `files` | `{ files, pages, chunks }`                |
| POST   | `/query/stream` | `{ question }`            | SSE: `status` / `sources` / `token` / `done` / `error` events |

## Local development

```bash
cd frontend-react
npm install
npm run dev          # http://localhost:5173
```

Point it at a backend with an env file (already provided as `.env.local`):

```env
VITE_API_URL=http://localhost:8000
```

Run the backend separately:

```bash
cd ../backend
uvicorn main:app --reload    # http://localhost:8000
```

> Backend events are emitted as grep-able `event=... key=value` lines (no
> emoji, so cp1252 Windows consoles are safe without `PYTHONUTF8=1`). See
> `backend/DEPLOY.md` → "Production visibility".

## Production build

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. **vercel.com → Add New → Project** → import the repo.
3. **Root Directory:** `frontend-react`
4. Framework preset auto-detects **Vite** (config in the repository-root `vercel.json`).
5. **Environment Variables:**
   ```
   VITE_API_URL = https://<your-backend>.onrender.com
   VITE_SENTRY_DSN = <optional sentry browser dsn>   # unset = no Sentry
   ```
6. Deploy. SPA routing is handled by the rewrite in `vercel.json`.

> `VITE_*` vars are inlined at **build time** — after changing `VITE_API_URL`
> in Vercel, trigger a redeploy.

## Connecting frontend ⇄ backend

```
 Browser ──→ Vercel (this app, static)
                │  fetch(VITE_API_URL + /upload | /query/stream | /health)
                ▼
            Render (FastAPI + LangChain + FAISS + Gemini)
```

The backend already enables permissive CORS (`allow_origins=["*"]`), so the
Vercel origin can call it directly — no proxy needed.

## Project structure

```
src/
  lib/
    api.js          # fetch wrapper, reads VITE_API_URL
    utils.js        # cn() + formatBytes()
  components/
    ui/             # button, card, badge (shadcn-style)
    AuroraBackground, Navbar, Hero,
    UploadZone, StatsBar, ChatPanel,
    MessageBubble, Footer
  App.jsx           # state orchestration
  main.jsx          # mount + Toaster
  index.css         # Tailwind v4 theme + design tokens
```
