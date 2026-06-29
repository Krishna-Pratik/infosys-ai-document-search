/* ----------------------------------------------------------------
   API client for the NeuralDocs FastAPI backend.
   Base URL comes from VITE_API_URL (set in Vercel); falls back to
   the local uvicorn server during development.
----------------------------------------------------------------- */

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'

async function parseError(res) {
  try {
    const data = await res.json()
    return data.detail || data.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

/** Ping the backend; returns true when healthy. */
export async function checkHealth(signal) {
  try {
    const res = await fetch(`${API_URL}/health`, { signal })
    return res.ok
  } catch {
    return false
  }
}

/** Upload one or more files for indexing. */
export async function uploadFiles(files) {
  const form = new FormData()
  for (const file of files) form.append('files', file)

  const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() // { files, pages, chunks }
}

/** Ask a question against the indexed documents. */
export async function askQuestion(question) {
  const res = await fetch(`${API_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() // { answer, sources: [{ page, content }] }
}
