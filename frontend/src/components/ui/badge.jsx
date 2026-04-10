import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-zinc-700 bg-zinc-900 text-zinc-200',
        success: 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]',
        warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
        destructive: 'border-red-500/40 bg-red-500/10 text-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
