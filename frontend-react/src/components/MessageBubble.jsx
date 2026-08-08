import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, BookOpen, ChevronDown, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

function Sources({ sources }) {
  const [open, setOpen] = useState(false)
  if (!sources?.length) return null

  return (
    <div className="mt-3 rounded-xl border border-violet/20 bg-violet/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-violet"
      >
        <BookOpen className="h-3.5 w-3.5" />
        {sources.length} source{sources.length > 1 ? 's' : ''}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3.5 pb-3.5">
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg/40 p-3 text-xs"
                >
                  <div className="mb-1.5 flex items-center gap-1.5 text-faint">
                    <FileText className="h-3 w-3" />
                    Page {s.page ?? 'N/A'}
                  </div>
                  <p className="leading-relaxed text-muted">{s.content}…</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser
            ? 'bg-brand-500/20 text-brand-400'
            : 'bg-gradient-to-br from-brand-500 to-cyan text-white'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>

      <div className={cn('max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'rounded-tr-sm bg-brand-500/15 text-ink'
              : message.error
                ? 'rounded-tl-sm border border-rose-500/30 bg-rose-500/10 text-rose-200'
                : 'rounded-tl-sm border border-border bg-surface/70 text-ink/90'
          )}
        >
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && <Sources sources={message.sources} />}
      </div>
    </motion.div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan text-white">
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-surface/70 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-brand-400"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
