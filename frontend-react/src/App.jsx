import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Navbar } from '@/components/Navbar'
import { UploadZone } from '@/components/UploadZone'
import { ChatPanel } from '@/components/ChatPanel'
import { Footer } from '@/components/Footer'
import { SourcePanel } from '@/components/SourcePanel'
import { checkHealth, streamQuestion, uploadFiles } from '@/lib/api'
import { captureError, captureStreamError } from '@/lib/sentry'
import { DEMO_DOC_PATH, DEMO_DOC_NAME, DEMO_QUESTION } from '@/lib/demo'

export default function App() {
  const [health, setHealth] = useState('checking')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [stats, setStats] = useState(null)
  const [ready, setReady] = useState(false)
  const [exampleBusy, setExampleBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)
  // { source, question, morphKey } — morphKey links a citation chip to
  // the shared-element transition into the source panel.
  const [panel, setPanel] = useState(null)

  const abortRef = useRef(null)
  const seqRef = useRef(0)

  // Ping the backend once on mount; the header shows the result.
  useEffect(() => {
    const ctrl = new AbortController()
    checkHealth(ctrl.signal).then((ok) => setHealth(ok ? 'online' : 'offline'))
    return () => {
      ctrl.abort()
      abortRef.current?.abort() // don't leave a stream running past unmount
    }
  }, [])

  /* Patch the last (assistant) message in place while tokens stream in. */
  function patchAssistant(patch) {
    setMessages((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = typeof patch === 'function' ? patch(next[i]) : { ...next[i], ...patch }
          break
        }
      }
      return next
    })
  }

  /** Upload + index a batch of files. Returns the stats object or null. */
  async function indexFiles(files) {
    setUploading(true)
    setUploadProgress(0)
    try {
      const data = await uploadFiles(files, setUploadProgress)
      setStats(data)
      setReady(true)
      toast.success(`${data.files} document${data.files > 1 ? 's' : ''} added · ${data.chunks} passages`)
      return data
    } catch (err) {
      if (err.status !== 429) captureError(err, 'upload')
      toast.error(err.message || 'Upload failed')
      return null
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  /* First-touch demo: load the bundled sample through the real upload API,
     then ask a question — the product demonstrating itself. */
  async function tryExample() {
    if (exampleBusy || asking) return
    setExampleBusy(true)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${DEMO_DOC_PATH}`)
      if (!res.ok) throw new Error("Couldn't load the sample document.")
      const file = new File([await res.text()], DEMO_DOC_NAME, {
        type: 'text/markdown',
      })
      const data = await indexFiles([file])
      if (data) handleAsk(DEMO_QUESTION)
    } catch (err) {
      toast.error(err.message || "Couldn't load the sample document.")
    } finally {
      setExampleBusy(false)
    }
  }

  async function handleAsk(question) {
    if (asking) return
    const id = `m${++seqRef.current}`
    setMessages((prev) => [
      ...prev,
      { id: `${id}u`, role: 'user', content: question },
      {
        id,
        role: 'assistant',
        question,
        content: '',
        sources: [],
        streaming: true,
        stage: 'searching',
        fallback: false,
        switchedTo: null,
        noAnswer: false,
        error: false,
      },
    ])
    setAsking(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl
    let answer = ''

    try {
      await streamQuestion(
        question,
        {
          onStatus: (d) => {
            if (d.stage === 'generating' || d.stage === 'searching') {
              patchAssistant((m) => ({
                ...m,
                stage: d.stage,
                fallback: m.fallback || d.fallback === true,
              }))
            } else if (d.stage === 'model_switched') {
              patchAssistant((m) => ({ ...m, fallback: true, switchedTo: d.to }))
              toast.info('Switched to the backup model', {
                description: `The main model didn't respond — ${d.to} is finishing the answer.`,
              })
            } else if (d.stage === 'no_answer') {
              patchAssistant((m) => ({ ...m, noAnswer: true }))
            }
          },
          onSources: (docs) => patchAssistant({ sources: docs }),
          onToken: (text) => {
            answer += text
            patchAssistant({ content: answer })
          },
          onDone: () => patchAssistant({ streaming: false }),
          onError: (message) => {
            // Provider pool exhausted etc. — the UI shows a bubble; we
            // also want to hear about it in Sentry.
            captureStreamError(message)
            patchAssistant((m) => ({
              ...m,
              streaming: false,
              error: true,
              // Preserve partial tokens; if none, show the error text.
              content: m.content || message,
            }))
            toast.error(message.split('\n')[0])
          },
        },
        ctrl.signal
      )
      // Safety net: the stream ended without an explicit done/error event.
      patchAssistant({ streaming: false })
    } catch (err) {
      if (err.name === 'AbortError') {
        patchAssistant((m) => ({ ...m, streaming: false }))
      } else if (err.status === 429) {
        // Rate limit is a normal conversational turn, not a failure —
        // say "hold on a beat", don't paint it red.
        patchAssistant((m) => ({
          ...m,
          streaming: false,
          rateLimited: true,
          content: err.retryAfter
            ? `${err.message} (about ${err.retryAfter}s)`
            : err.message,
        }))
      } else {
        captureError(err, 'query')
        patchAssistant((m) => ({
          ...m,
          streaming: false,
          error: true,
          content:
            m.content || "Couldn't reach the answer service. Try again in a moment.",
        }))
        toast.error(err.message || 'Query failed')
      }
    } finally {
      setAsking(false)
      abortRef.current = null
    }
  }

  function openSource(source, message) {
    setPanel({
      source,
      question: message?.question ?? '',
      // Must match MessageBubble's layoutId: `cite-<messageId>-<sourceId>`
      morphKey: message ? `cite-${message.id}-${source.id}` : null,
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar health={health} />

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-5 py-10 lg:grid-cols-[21rem_minmax(0,1fr)] lg:px-8">
        <UploadZone
          onUpload={indexFiles}
          uploading={uploading}
          uploadProgress={uploadProgress}
          stats={stats}
          perFile={stats?.per_file}
        />
        <ChatPanel
          messages={messages}
          onAsk={handleAsk}
          asking={asking}
          ready={ready}
          exampleBusy={exampleBusy}
          onTryExample={tryExample}
          onOpenSource={openSource}
        />
      </main>

      <Footer />

      <SourcePanel
        source={panel?.source ?? null}
        query={panel?.question}
        morphKey={panel?.morphKey}
        onClose={() => setPanel(null)}
      />
    </div>
  )
}
