import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AuroraBackground } from '@/components/AuroraBackground'
import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { UploadZone } from '@/components/UploadZone'
import { ChatPanel } from '@/components/ChatPanel'
import { Footer } from '@/components/Footer'
import { SourcePanel } from '@/components/SourcePanel'
import { checkHealth, streamQuestion, uploadFiles } from '@/lib/api'

export default function App() {
  const [health, setHealth] = useState('checking')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [stats, setStats] = useState(null)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)
  const [activeSource, setActiveSource] = useState(null)

  // The question that produced the message a source panel is open for.
  const [sourceQuery, setSourceQuery] = useState('')
  const abortRef = useRef(null)

  // Poll backend health on mount.
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

  async function handleUpload(files) {
    setUploading(true)
    setUploadProgress(0)
    try {
      const data = await uploadFiles(files, setUploadProgress)
      setStats(data)
      setReady(true)
      toast.success(
        `Indexed ${data.files} file${data.files > 1 ? 's' : ''} · ${data.chunks} chunks`,
      )
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleAsk(question) {
    if (asking) return
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      {
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
              toast.info('Switched to backup model', {
                description: `${d.from} failed — continuing with ${d.to}.`,
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
      } else {
        patchAssistant((m) => ({
          ...m,
          streaming: false,
          error: true,
          content: m.content || err.message || 'Something went wrong. Please try again.',
        }))
        toast.error(err.message || 'Query failed')
      }
    } finally {
      setAsking(false)
      abortRef.current = null
    }
  }

  function openSource(source, query) {
    setSourceQuery(query ?? '')
    setActiveSource(source)
  }

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <Navbar health={health} />
      <Hero />

      <main className="mx-auto grid max-w-6xl gap-6 px-5 pb-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
        <UploadZone
          onUpload={handleUpload}
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
          onOpenSource={openSource}
        />
      </main>

      <Footer />

      <SourcePanel
        source={activeSource}
        query={sourceQuery}
        onClose={() => setActiveSource(null)}
      />
    </div>
  )
}
