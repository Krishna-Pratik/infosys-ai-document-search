import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-brand-500 to-cyan text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:brightness-110',
        secondary:
          'bg-surface text-ink border border-border hover:border-brand-500/50 hover:bg-surface/80',
        ghost: 'text-muted hover:text-ink hover:bg-surface/60',
        outline:
          'border border-brand-500/40 text-brand-400 hover:bg-brand-500/10',
      },
      size: {
        sm: 'h-9 px-3.5',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}

export { buttonVariants }
