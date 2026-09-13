import { Heart } from 'lucide-react'

const stack = ['React', 'Vite', 'Tailwind', 'FastAPI', 'LangChain', 'FAISS', 'Gemini']

export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 pb-10 pt-16">
      <div className="flex flex-col items-center gap-4 border-t border-border/60 pt-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {stack.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-surface/40 px-2 py-1 font-mono text-[11px] text-faint"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-faint">
          Built with <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> as a
          full-stack RAG showcase
        </p>
      </div>
    </footer>
  )
}
