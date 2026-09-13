import { cn } from '@/lib/utils'

/* Two surfaces, not one:
   - tool cards (upload): solid `surface` — the workspace furniture
   - the reading card (chat): `bg-soft` with a hairline border
   No glass blur, no identical shadows on everything. */
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border bg-surface',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-b border-border px-5 py-4',
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }) {
  return (
    <h2
      className={cn('text-sm font-semibold tracking-tight text-ink', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />
}
