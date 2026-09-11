import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Sparkles, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageBubble } from '@/components/MessageBubble'

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'List the main topics covered',
]

function EmptyState({ ready, onPick }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500/20 to-cyan/20"
      >
        {ready ? (
          <Sparkles className="h-8 w-8 text-brand-400" />
        ) : (
          <Lock className="h-7 w-7 text-faint" />
        )}
      </motion.div>
      <h4 className="text-sm font-semibold text-ink">
        {ready ? 'Ask anything about your documents' : 'Upload a document to begin'}
      </h4>
      <p className="mt-1.5 max-w-xs text-xs text-faint">
        {ready
          ? 'Answers are grounded in your files and come with cited sources.'
          : 'Once indexed, your knowledge base unlocks the assistant.'}
      </p>

      {ready && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand-500/50 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatPanel({ messages, onAsk, asking, ready, onOpenSource }) {
  const [value, setValue] = useState('')
  const scrollRef = useRef(null)
  const composerRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, asking])

  /* Keyboard appearance is async (and on iOS the layout viewport does not
     resize for it) — nudge the composer into view after it settles. */
  function handleFocus() {
    if (window.innerWidth >= 640) return // desktop keyboards don't cover the input
    setTimeout(
      () => composerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      350
    )
  }

  function submit() {
    const q = value.trim()
    if (!q || asking) return
    onAsk(q)
    setValue('')
  }

  const empty = messages.length === 0

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15">
          <MessageSquare className="h-5 w-5 text-brand-400" />
        </span>
        <div>
          <CardTitle>Ask your documents</CardTitle>
          <p className="text-xs text-faint">Grounded, cited RAG answers</p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-2">
        <div
          ref={scrollRef}
          className="min-h-88 max-h-[60dvh] flex-1 space-y-5 overflow-y-auto pr-1"
        >
          {empty ? (
            <EmptyState ready={ready} onPick={(s) => onAsk(s)} />
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                onOpenSource={(src) => onOpenSource(src, m.question)}
              />
            ))
          )}
        </div>

        <div
          ref={composerRef}
          className="flex items-end gap-2 rounded-2xl border border-border bg-surface/50 p-2 focus-within:border-brand-500/50"
        >
          <textarea
            rows={1}
            value={value}
            disabled={!ready || asking}
            onChange={(e) => setValue(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={
              ready ? 'Ask a question…' : 'Upload a document first…'
            }
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-base text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed sm:text-sm"
          />
          <Button
            size="icon"
            onClick={submit}
            disabled={!ready || asking || !value.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
