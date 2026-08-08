import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AuroraBackground } from '@/components/AuroraBackground'
import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { UploadZone } from '@/components/UploadZone'
import { ChatPanel } from '@/components/ChatPanel'
import { Footer } from '@/components/Footer'
import { askQuestion, checkHealth, uploadFiles } from '@/lib/api'

export default function App() {
  const [health, setHealth] = useState('checking')
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState(null)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)

  // Poll backend health on mount.
  useEffect(() => {
    const ctrl = new AbortController()
    checkHealth(ctrl.signal).then((ok) => setHealth(ok ? 'online' : 'offline'))
    return () => ctrl.abort()
  }, [])

  async function handleUpload(files) {
    setUploading(true)
    const t = toast.loading(
      `Indexing ${files.length} document${files.length > 1 ? 's' : ''}…`
    )
    try {
      const data = await uploadFiles(files)
      setStats(data)
      setReady(true)
      toast.success(
        `Indexed ${data.files} file${data.files > 1 ? 's' : ''} · ${data.chunks} chunks`,
        { id: t }
      )
    } catch (err) {
      toast.error(err.message || 'Upload failed', { id: t })
    } finally {
      setUploading(false)
    }
  }

  async function handleAsk(question) {
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setAsking(true)
    try {
      const data = await askQuestion(question)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          error: true,
        },
      ])
      toast.error(err.message || 'Query failed')
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <Navbar health={health} />
      <Hero />

      <main className="mx-auto grid max-w-6xl gap-6 px-5 pb-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
        <UploadZone onUpload={handleUpload} uploading={uploading} stats={stats} />
        <ChatPanel
          messages={messages}
          onAsk={handleAsk}
          asking={asking}
          ready={ready}
        />
      </main>

      <Footer />
    </div>
  )
}
