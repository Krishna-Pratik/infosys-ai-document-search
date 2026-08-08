import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'glass rounded-2xl shadow-xl shadow-black/20 transition-colors',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex items-center gap-3 p-5 pb-0', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return (
    <h3 className={cn('text-base font-semibold tracking-tight text-ink', className)} {...props} />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />
}
