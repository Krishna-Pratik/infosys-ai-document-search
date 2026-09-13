import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText } from 'lucide-react'
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

/**
 * Evidence view for one citation.
 *
 * `morphKey` is the layoutId of the citation chip that opened this panel
 * (`cite-<messageId>-<sourceId>`). The header numeral below shares that
 * layoutId, so opening/closing the panel morphs the chip into the panel
 * header and back — the app's single orchestrated motion moment.
 * <MotionConfig reducedMotion="user"> in main.jsx makes Framer collapse
 * the layout morph to an instant cross-fade when the user prefers less
 * motion; the CSS floor in index.css covers everything else.
 */
export function SourcePanel({ source, query, morphKey, onClose }) {
  // Esc to close.
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-60 bg-bg/60"
            aria-hidden="true"
          />
          {/* Desktop: right side panel. Mobile: bottom sheet. */}
          <motion.aside
            role="dialog"
            aria-label={`Source: ${source.file}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-70 flex flex-col border border-border bg-bg-soft shadow-2xl shadow-black/50',
              'inset-x-0 bottom-0 max-h-[70dvh] rounded-t-lg pb-[env(safe-area-inset-bottom)]',
              'sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:max-h-[75dvh] sm:w-105 sm:-translate-y-1/2 sm:rounded-lg sm:pb-0'
            )}
          >
            <header className="flex items-start gap-3 border-b border-border px-5 py-4">
              {/* Mobile sheet grab handle */}
              <span
                className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden"
                aria-hidden="true"
              />
              {/* This numeral IS the citation chip, morphed. No layoutId
                  without a chip to morph from (e.g. opened via the summary
                  card) — render it as a plain badge then. */}
              <motion.span
                layoutId={morphKey}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-500/45 bg-brand-500/15 font-mono text-sm font-medium text-brand-400"
              >
                {source.id}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                  <FileText className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
                  {source.file}
                </p>
                <p className="mt-1 flex items-center gap-3 font-mono text-2xs text-faint">
                  <span>page {source.page}</span>
                  {typeof source.score === 'number' && (
                    <span>match {Math.round(source.score * 100)}%</span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close source panel"
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-4">
              <p className="mb-2 text-2xs font-medium text-faint">Matched passage</p>
              <p className="font-serif text-md leading-[1.7] text-paper">
                {highlightExcerpt(source.excerpt, query).map((p, i) => (
                  <span key={i}>
                    {i > 0 ? ' ' : ''}
                    {p.hit ? (
                      <mark className="rounded-[3px] bg-brand-500/25 px-0.5 text-paper">
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
