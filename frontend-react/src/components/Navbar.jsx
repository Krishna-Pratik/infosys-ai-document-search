import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

function Health({ status }) {
  const map = {
    online: { color: 'text-ok', label: 'Connected' },
    offline: { color: 'text-error', label: "Can't reach the server" },
    checking: { color: 'text-caution', label: 'Connecting' },
  }
  const s = map[status] ?? map.checking
  return (
    <span
      className="inline-flex items-center gap-2 text-xs text-muted"
      role="status"
      aria-live="polite"
    >
      <Circle className={cn('h-2 w-2 fill-current', s.color)} aria-hidden="true" />
      {s.label}
    </span>
  )
}

export function Navbar({ health }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className="font-serif text-lg font-semibold tracking-tight text-ink">
            NeuralDocs
          </span>
          <span className="hidden border-l border-border pl-3 text-sm text-muted md:inline">
            Answers with citations from your own documents
          </span>
        </a>

        <div className="flex items-center gap-5">
          <Health status={health} />
          <a
            href="https://github.com/Krishna-Pratik/infosys-ai-document-search"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  )
}
