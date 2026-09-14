import { Sparkles, ArrowUp, Heart } from 'lucide-react'

const stack = ['React', 'Vite', 'Tailwind', 'FastAPI', 'LangChain', 'FAISS', 'Gemini']

/* lucide removed brand icons in current versions; these inline marks match
   the 24-grid / stroke-2 / currentColor convention of the rest of the set. */
function GithubMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.35-3.87-1.35-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.04 11.04 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.67.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.2.68.8.56A10.54 10.54 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function LinkedinMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

function LinkRow({ href, icon: Icon, children, external = true }) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        {Icon && (
          <Icon className="h-4 w-4 text-faint transition-colors group-hover:text-brand-400" />
        )}
        <span>{children}</span>
        {external && (
          <span className="h-px w-0 bg-brand-400 transition-all duration-300 group-hover:w-4" />
        )}
      </a>
    </li>
  )
}

function ColHeading({ children }) {
  return (
    <h3 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
      {children}
    </h3>
  )
}

export function Footer() {
  return (
    <footer className="relative mt-auto">
      {/* Hairline gradient-fade divider — same visual language as hero fade */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-linear-to-r from-transparent via-brand-500/40 to-transparent"
      />
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-14">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand block — slightly more prominent */}
          <div>
            <a href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-cyan shadow-lg shadow-brand-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                Neural<span className="gradient-text">Docs</span>
              </span>
            </a>
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted">
              AI-powered document search with cited, grounded answers.
            </p>
            {/* Stack badges — supporting detail, tucked under the brand copy */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {stack.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-border bg-surface/40 px-2 py-0.5 font-mono text-[10.5px] text-faint"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Project */}
          <nav aria-label="Project links">
            <ColHeading>Project</ColHeading>
            <ul className="space-y-2.5">
              <LinkRow
                href="https://github.com/Krishna-Pratik/infosys-ai-document-search"
                icon={GithubMark}
              >
                Source code
              </LinkRow>
              <LinkRow href="#top" icon={ArrowUp} external={false}>
                Back to top
              </LinkRow>
            </ul>
          </nav>

          {/* Connect */}
          <nav aria-label="Connect">
            <ColHeading>Connect</ColHeading>
            <ul className="space-y-2.5">
              <LinkRow href="https://github.com/Krishna-Pratik" icon={GithubMark}>
                GitHub profile
              </LinkRow>
              <LinkRow
                href="https://www.linkedin.com/in/krishna-pratik/"
                icon={LinkedinMark}
              >
                LinkedIn
              </LinkRow>
            </ul>
          </nav>
        </div>

        {/* Bottom bar — de-emphasized */}
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-faint">© 2026 Krishna Pratik</p>
          <p className="flex items-center gap-1.5 text-xs text-faint">
            Built with <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            <span className="font-mono">FastAPI · LangChain · FAISS · Gemini</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
