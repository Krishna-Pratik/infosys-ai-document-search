import { Star, Sparkles, Circle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

function HealthDot({ status }) {
  const map = {
    online: { color: 'text-emerald-400', label: 'Backend online' },
    offline: { color: 'text-rose-400', label: 'Backend offline' },
    checking: { color: 'text-amber-400', label: 'Connecting…' },
  }
  const s = map[status] ?? map.checking
  return (
    <span className="hidden items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted sm:inline-flex">
      <Circle className={cn('h-2 w-2 fill-current', s.color)} />
      {s.label}
    </span>
  )
}

export function Navbar({ health }) {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan shadow-lg shadow-brand-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Neural<span className="gradient-text">Docs</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          <HealthDot status={health} />
          <a
            href="https://github.com/Krishna-Pratik/infosys-ai-document-search"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted transition-colors hover:border-brand-500/50 hover:text-ink"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </motion.header>
  )
}
