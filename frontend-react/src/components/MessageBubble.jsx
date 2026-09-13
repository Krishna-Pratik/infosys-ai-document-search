import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bot,
  User,
  FileText,
  AlertTriangle,
  SearchX,
  RefreshCcw,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* Turn inline [n] / [1, 2] markers into anchor links the custom <a>
   renderer converts into clickable citation chips. Markers referencing
   unknown sources are left as plain text. */
function withCitationLinks(content, sourceCount) {
  if (!sourceCount) return content
  return content.replace(/\[(\d{1,2}(?:\s*[,–-]\s*\d{1,2})*)\]/g, (m, group) => {
    const nums = group.split(/[,–-]/).map((s) => Number(s.trim()))
    if (!nums.length || nums.some((k) => !(k >= 1 && k <= sourceCount))) return m
    const links = nums.map((n) => `[${n}](#cite-${n})`).join(' ')
    return links
  })
}

function CitationChip({ n, source, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => source && onOpen(source)}
      title={source ? `${source.file} · page ${source.page}` : 'Source'}
      className="mx-0.5 inline-flex h-5 min-w-5 -translate-y-px items-center justify-center rounded-md border border-brand-500/40 bg-brand-500/15 px-1.5 align-baseline text-[10px] font-semibold leading-none text-brand-400 transition-colors hover:border-brand-400 hover:bg-brand-500/30 hover:text-ink"
    >
      {n}
    </button>
  )
}

function StageIndicator({ stage }) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-sm">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brand-400"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      <span className="text-muted">
        {stage === 'generating' ? 'Generating answer…' : 'Searching your documents…'}
      </span>
    </div>
  )
}

function NoAnswerState() {
  return (
    <div className="flex items-start gap-2.5">
      <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div>
        <p className="font-semibold text-ink">Couldn't find this in your documents</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Nothing in your indexed files was relevant enough to answer this
          confidently. Try rephrasing, or upload more documents covering the topic.
        </p>
      </div>
    </div>
  )
}

/* 429 from the rate limiter — a conversational pause, deliberately styled
   like a plain assistant message (no red error chrome). */
function RateLimitedState({ text }) {
  return (
    <div className="flex items-start gap-2.5">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <p className="leading-relaxed">{text}</p>
    </div>
  )
}

function Sources({ sources, onOpen }) {
  if (!sources?.length) return null
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onOpen(s)}
          className="group flex max-w-[16rem] items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2 py-1.5 text-left text-xs transition-colors hover:border-brand-500/50 hover:bg-brand-500/10"
        >
          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md bg-brand-500/20 text-[10px] font-bold text-brand-400">
            {s.id}
          </span>
          <FileText className="h-3 w-3 shrink-0 text-faint group-hover:text-brand-400" />
          <span className="truncate text-muted group-hover:text-ink">{s.file}</span>
          <span className="shrink-0 text-faint">p.{s.page}</span>
        </button>
      ))}
    </div>
  )
}

export function MessageBubble({ message, onOpenSource }) {
  const isUser = message.role === 'user'
  const mdComponents = {
    a: ({ href, children }) => {
      if (href?.startsWith('#cite-')) {
        const n = Number(href.slice(6))
        const source = message.sources?.find((s) => s.id === n)
        return <CitationChip n={n} source={source} onOpen={onOpenSource} />
      }
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      )
    },
  }

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
            : 'bg-linear-to-br from-brand-500 to-cyan text-white'
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
          ) : message.error ? (
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            </div>
          ) : message.noAnswer ? (
            <NoAnswerState />
          ) : message.rateLimited ? (
            <RateLimitedState text={message.content} />
          ) : message.streaming && !message.content ? (
            <StageIndicator stage={message.stage} />
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {withCitationLinks(message.content, message.sources?.length)}
              </ReactMarkdown>
              {message.streaming && <span className="stream-caret" aria-hidden="true" />}
            </div>
          )}
        </div>

        {/* Fallback transparency: shown only when a provider failover happened */}
        {!isUser && message.fallback && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
            <RefreshCcw className="h-3 w-3" />
            Switched to backup model{message.switchedTo ? ` · ${message.switchedTo}` : ''}
          </div>
        )}

        {!isUser && !message.streaming && !message.error && (
          <Sources sources={message.sources} onOpen={onOpenSource} />
        )}
      </div>
    </motion.div>
  )
}
