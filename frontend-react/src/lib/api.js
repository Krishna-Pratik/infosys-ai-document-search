/* ----------------------------------------------------------------
   API client for the NeuralDocs FastAPI backend.
   Base URL comes from VITE_API_URL (set in Vercel); falls back to
   the local uvicorn server during development.
----------------------------------------------------------------- */

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'

async function parseError(res) {
  let msg
  try {
    const data = await res.json()
    msg = data.detail || data.message || `Request failed (${res.status})`
  } catch {
    msg = `Request failed (${res.status})`
  }
  const err = new Error(msg)
  err.status = res.status
  err.retryAfter = Number(res.headers.get('Retry-After')) || null
  return err
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

/** Upload one or more files for indexing in a single batch request.
 *  Uses XHR because fetch() cannot report upload progress.
 *  onProgress(fraction 0..1) covers the network transfer; the server-side
 *  indexing phase happens after it reaches 1 and the response lands. */
export function uploadFiles(files, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const file of files) form.append('files', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText)) // { files, pages, chunks, per_file }
        } catch {
          reject(new Error('Invalid response from the indexing server.'))
        }
      } else {
        let msg = `Upload failed (${xhr.status})`
        try {
          const data = JSON.parse(xhr.responseText)
          msg = data.detail || data.message || msg
        } catch {
          /* keep default message */
        }
        const err = new Error(msg)
        err.status = xhr.status
        err.retryAfter = Number(xhr.getResponseHeader('Retry-After')) || null
        reject(err)
      }
    }
    xhr.onerror = () => reject(new Error('Network error — is the backend running?'))
    xhr.ontimeout = () => reject(new Error('Upload timed out.'))

    xhr.send(form)
  })
}

/** Ask a question and receive Server-Sent Events as they happen.
 *  handlers: { onStatus(stageObj), onSources(docs), onToken(text), onDone(meta), onError(message) } */
export async function streamQuestion(question, handlers, signal) {
  const res = await fetch(`${API_URL}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  })
  if (!res.ok) throw new Error(await parseError(res))
  if (!res.body) throw new Error('Streaming is not supported by this browser.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line.
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      let event = 'message'
      const dataLines = []
      for (const line of frame.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
      }
      if (!dataLines.length) continue

      let data
      try {
        data = JSON.parse(dataLines.join('\n'))
      } catch {
        continue
      }

      switch (event) {
        case 'status':
          handlers.onStatus?.(data)
          break
        case 'sources':
          handlers.onSources?.(data.docs)
          break
        case 'token':
          handlers.onToken?.(data.text)
          break
        case 'done':
          handlers.onDone?.(data)
          break
        case 'error':
          handlers.onError?.(data.message)
          break
        default:
          break
      }
    }
  }
}
