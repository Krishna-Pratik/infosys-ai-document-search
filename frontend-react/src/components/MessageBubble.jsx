import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FileText,
  AlertTriangle,
  SearchX,
  Loader2,
  Clock,
  Check,
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

/* The one orchestrated motion moment: the chip's numeral shares a
   layoutId with the source panel's header numeral, so opening/closing
   the panel reads as the citation travelling to its evidence (and back).
   Keys are unique per message+source, so chips can claim them unconditionally. */
function CitationChip({ n, source, onOpen, layoutId }) {
  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      onClick={() => source && onOpen(source)}
      title={source ? `${source.file} · page ${source.page}` : 'Source'}
      className="mx-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] border border-brand-500/45 bg-brand-500/15 px-1 align-baseline font-mono text-2xs font-medium leading-none text-brand-400 transition-colors hover:bg-brand-500/30 hover:text-brand-50"
    >
      {n}
    </motion.button>
  )
}

function StageIndicator({ stage }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin text-brand-400" aria-hidden="true" />
      {stage === 'generating' ? 'Writing the answer…' : 'Searching your documents…'}
    </div>
  )
}

function NoAnswerState() {
  return (
    <div className="flex items-start gap-2.5">
      <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-caution" aria-hidden="true" />
      <div>
        <p className="text-md font-semibold text-ink">
          Couldn't find this in your documents
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Nothing in your files was close enough to answer this confidently — so
          we won't guess. Try rephrasing the question, or add documents that
          cover it.
        </p>
      </div>
    </div>
  )
}

/* 429 from the rate limiter — a conversational pause, deliberately styled
   like a plain assistant message (no red error chrome, no serif answer). */
function RateLimitedState({ text }) {
  return (
    <div className="flex items-start gap-2.5">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <p className="text-md leading-relaxed text-ink">{text}</p>
    </div>
  )
}

function Sources({ sources, onOpen }) {
  if (!sources?.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onOpen(s)}
          className="group flex max-w-64 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs transition-colors hover:border-brand-500/50"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-brand-500/45 bg-brand-500/15 font-mono text-2xs font-medium text-brand-400">
            {s.id}
          </span>
          <FileText className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
          <span className="truncate text-muted group-hover:text-ink">{s.file}</span>
          <span className="shrink-0 font-mono text-2xs text-faint">p.{s.page}</span>
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
        return (
          <CitationChip
            n={n}
            source={source}
            onOpen={onOpenSource}
            layoutId={`cite-${message.id}-${n}`}
          />
        )
      }
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      )
    },
  }

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
          isUser
            ? 'border border-border bg-surface text-muted'
            : 'bg-brand-600 text-white'
        )}
        aria-hidden="true"
      >
        {isUser ? 'You' : 'ND'}
      </span>

      <div className={cn('max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser
              ? 'border border-brand-500/30 bg-brand-500/10 text-md text-ink'
              : message.error
                ? 'border border-error/35 bg-error/10 text-md text-error'
                : message.noAnswer ||
                message.rateLimited ||
                (message.streaming && !message.content)
                  ? 'border border-border bg-surface'
                  : 'prose-doc'
          )}
        >
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : message.error ? (
            <div className="flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ) : message.noAnswer ? (
            <NoAnswerState />
          ) : message.rateLimited ? (
            <RateLimitedState text={message.content} />
          ) : message.streaming && !message.content ? (
            <StageIndicator stage={message.stage} />
          ) : (
            <div>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {withCitationLinks(message.content, message.sources?.length)}
              </ReactMarkdown>
              {message.streaming && <span className="stream-caret" aria-hidden="true" />}
            </div>
          )}
        </div>

        {/* Fallback transparency: shown only when a provider failover happened */}
        {!isUser && message.fallback && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-caution/35 bg-caution/10 px-2.5 py-0.5 text-2xs font-medium text-caution">
            <Check className="h-3 w-3" aria-hidden="true" />
            Answered by the backup model
            {message.switchedTo ? ` (${message.switchedTo})` : ''} — the main model
            didn't respond.
          </p>
        )}

        {!isUser && !message.streaming && !message.error && (
          <Sources sources={message.sources} onOpen={onOpenSource} />
        )}
      </div>
    </div>
  )
}
