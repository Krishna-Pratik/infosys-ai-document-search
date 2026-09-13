import { cn } from '@/lib/utils'

export function Badge({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-400',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
