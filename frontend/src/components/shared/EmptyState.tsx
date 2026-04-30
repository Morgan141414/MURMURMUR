import { type ComponentType, type ReactNode } from 'react'
import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon | ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1/40 py-12 text-center',
      className,
    )}>
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2">
        <Icon className="h-5 w-5 text-text-quaternary" />
      </div>
      <h3 className="mb-1 text-[13px] font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-[12px] text-text-tertiary max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
