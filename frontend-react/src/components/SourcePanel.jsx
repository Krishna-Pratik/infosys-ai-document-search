import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Highlight the best-matching sentences of the query inside the excerpt.
   Cheap and dependency-free: score sentences by query-term overlap. */
function highlightExcerpt(text, query) {
  const terms = (query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3)
  if (!terms.length) return [{ text, hit: false }]

  const parts = text.split(/(?<=[.!?])\s+/)
  const scored = parts.map((p) => {
    const lower = p.toLowerCase()
    const hits = terms.filter((t) => lower.includes(t)).length
    return { text: p, hit: hits > 0 }
  })
  return scored
}

export function SourcePanel({ source, query, onClose }) {
  // Esc to close; lock body scroll while open on mobile sheet mode.
  useEffect(() => {
    if (!source) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [source, onClose])

  return (
    <AnimatePresence>
      {source && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-60 bg-bg/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          {/* Desktop: right side panel. Mobile: bottom sheet. */}
          <motion.aside
            role="dialog"
            aria-label={`Source: ${source.file}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed z-70 flex flex-col border border-border bg-bg-soft shadow-2xl',
              'inset-x-0 bottom-0 max-h-[70dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]',
              'sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:max-h-[75dvh] sm:w-105 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0'
            )}
          >
            <header className="flex items-start gap-3 border-b border-border px-4 py-3.5">
              {/* Mobile sheet grab handle */}
              <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden" />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-400">
                {source.id}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                  {source.file}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <span>Page {source.page}</span>
                  {typeof source.score === 'number' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5">
                      <Gauge className="h-3 w-3" />
                      relevance {(source.score * 100).toFixed(0)}%
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close source panel"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-3.5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Matched excerpt
              </p>
              <p className="text-sm leading-relaxed text-muted">
                {highlightExcerpt(source.excerpt, query).map((p, i) => (
                  <span key={i}>
                    {i > 0 ? ' ' : ''}
                    {p.hit ? (
                      <mark className="rounded-sm bg-brand-500/30 px-0.5 text-ink">
                        {p.text}
                      </mark>
                    ) : (
                      p.text
                    )}
                  </span>
                ))}
                {source.excerpt?.length >= 700 && '…'}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
