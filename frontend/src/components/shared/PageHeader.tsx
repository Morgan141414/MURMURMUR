import { type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
  badge?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  backLink?: { to: string; label?: string }
  tabs?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  badge,
  breadcrumbs,
  backLink,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-3 animate-fade-in-up', className)}>
      {/* Navigation row: back link, eyebrow, breadcrumbs */}
      {(breadcrumbs?.length || backLink || eyebrow) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-text-tertiary">
          {backLink && (
            <Link
              to={backLink.to}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {backLink.label ?? 'Back'}
            </Link>
          )}
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
              {eyebrow}
            </span>
          )}
          {breadcrumbs?.map((item, index) => (
            <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {(index > 0 || eyebrow) && <ChevronRight className="h-3 w-3 text-text-quaternary" />}
              {item.to ? (
                <Link to={item.to} className="font-medium transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className="text-text-secondary font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Title + actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="max-w-3xl text-[13px] leading-relaxed text-text-secondary">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Tabs */}
      {tabs && (
        <div className="border-b border-border pb-0">
          {tabs}
        </div>
      )}
    </div>
  )
}
