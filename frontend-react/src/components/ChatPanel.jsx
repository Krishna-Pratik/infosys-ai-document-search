import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageBubble } from '@/components/MessageBubble'
import { DEMO_DOC_NAME, DEMO_QUESTION } from '@/lib/demo'

/* Example-shaped prompts: they read like the questions users will
   actually ask, and preview what a cited answer looks like. */
const SUGGESTIONS = [
  'Summarize the document in five points',
  'What decisions or recommendations does it make?',
  'Which risks are mentioned, and how severe are they?',
]

function EmptyState({ ready, exampleBusy, onTryExample, onPick }) {
  return (
    <div className="flex h-full flex-col justify-center gap-6 py-4">
      <div>
        <p className="font-serif text-2xl leading-snug text-paper">
          {ready
            ? 'Your documents are indexed. Ask something.'
            : 'Ask a question. Get an answer that cites the passage it came from.'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {ready
            ? 'Every answer links to the exact paragraph in your files — click a citation to see the evidence.'
            : 'Add documents on the left, or try a worked example end to end: a sample incident report gets indexed, a question gets answered, citations get clickable.'}
        </p>
      </div>

      {!ready && (
        <button
          type="button"
          onClick={onTryExample}
          disabled={exampleBusy}
          className="group rounded-lg border border-border bg-bg-soft p-5 text-left transition-colors hover:border-brand-500/50 disabled:cursor-wait"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="font-mono text-2xs text-faint">
              {DEMO_DOC_NAME}
            </span>
            <span className="rounded-full border border-brand-500/40 bg-brand-500/15 px-2.5 py-0.5 text-2xs font-medium text-brand-400 transition-colors group-hover:bg-brand-500/25">
              {exampleBusy ? 'Loading…' : 'Try it'}
            </span>
          </span>
          <span className="mt-2.5 block font-serif text-md leading-snug text-paper">
            “{DEMO_QUESTION}”
          </span>
          <span className="mt-1.5 block text-xs text-faint">
            Upload → ask → cited answer, in one click.
          </span>
        </button>
      )}

      {ready && (
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="rounded-lg border border-border px-4 py-2.5 text-left text-sm text-muted transition-colors hover:border-brand-500/40 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatPanel({
  messages,
  onAsk,
  asking,
  ready,
  exampleBusy,
  onTryExample,
  onOpenSource,
}) {
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
    <Card className="h-full bg-bg-soft">
      <CardHeader>
        <MessageSquareText className="h-5 w-5 text-brand-400" aria-hidden="true" />
        <CardTitle>Ask your documents</CardTitle>
        <p className="ml-auto hidden text-xs text-faint sm:block">
          {ready ? 'Every answer cites its source' : 'Index a document to begin'}
        </p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5">
        <div
          ref={scrollRef}
          className="min-h-88 max-h-[60dvh] flex-1 space-y-6 overflow-y-auto pr-1"
        >
          {empty ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={ready ? 'ready' : 'locked'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                <EmptyState
                  ready={ready}
                  exampleBusy={exampleBusy}
                  onTryExample={onTryExample}
                  onPick={(s) => onAsk(s)}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onOpenSource={(src) => onOpenSource(src, m)}
              />
            ))
          )}
        </div>

        <div
          ref={composerRef}
          className="flex items-end gap-2 rounded-lg border border-border bg-bg-soft p-2 focus-within:border-brand-500/60"
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
            placeholder={ready ? 'Ask a question…' : 'Add a document first'}
            aria-label="Ask a question about your documents"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-base text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed sm:text-md"
          />
          <Button
            size="icon"
            onClick={submit}
            disabled={!ready || asking || !value.trim()}
            aria-label="Ask"
            title="Ask (Enter)"
          >
            {asking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M8 2.5v8M4.5 7.5 8 4l3.5 3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
