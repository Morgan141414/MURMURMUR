import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type ColorVariant = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'cyan' | 'pink' | 'orange'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: { value: number; label?: string }
  className?: string
  color?: ColorVariant
  delay?: number
}

const colorConfig: Record<ColorVariant, { iconClass: string; gradient: string; glow: string }> = {
  blue: {
    iconClass: 'icon-blue',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 70%)',
    glow: 'rgba(59,130,246,0.12)',
  },
  green: {
    iconClass: 'icon-green',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, transparent 70%)',
    glow: 'rgba(16,185,129,0.12)',
  },
  amber: {
    iconClass: 'icon-amber',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 70%)',
    glow: 'rgba(245,158,11,0.12)',
  },
  red: {
    iconClass: 'icon-red',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, transparent 70%)',
    glow: 'rgba(239,68,68,0.12)',
  },
  violet: {
    iconClass: 'icon-violet',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, transparent 70%)',
    glow: 'rgba(139,92,246,0.12)',
  },
  cyan: {
    iconClass: 'icon-cyan',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, transparent 70%)',
    glow: 'rgba(6,182,212,0.12)',
  },
  pink: {
    iconClass: 'icon-pink',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, transparent 70%)',
    glow: 'rgba(236,72,153,0.12)',
  },
  orange: {
    iconClass: 'icon-orange',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, transparent 70%)',
    glow: 'rgba(249,115,22,0.12)',
  },
}

/* Legacy color mapping for backward compatibility */
const LEGACY_MAP: Record<string, ColorVariant> = {
  indigo: 'blue',
  emerald: 'green',
  rose: 'red',
  sky: 'cyan',
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
  color = 'blue',
  delay = 0,
}: StatCardProps) {
  const resolvedColor = LEGACY_MAP[color as string] ?? color
  const cfg = colorConfig[resolvedColor] ?? colorConfig.blue
  const isPositive = trend ? trend.value >= 0 : undefined

  return (
    <div
      className={cn('stat-card relative overflow-hidden', className)}
      style={{ animationDelay: `${delay}s`, backgroundImage: cfg.gradient }}
    >
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full opacity-50"
        style={{ background: `radial-gradient(circle at top right, ${cfg.glow}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between">
        <div
          className={cn('icon-container icon-container-md rounded-lg', cfg.iconClass)}
          style={{ boxShadow: `0 4px 12px -4px ${cfg.glow}` }}
        >
          <Icon className="h-5 w-5" />
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold',
              isPositive ? 'bg-success-muted text-success' : 'bg-destructive-muted text-destructive',
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="relative mt-3.5">
        <p className="text-[1.75rem] font-bold tracking-tight leading-none text-foreground">
          {value}
        </p>
        <p className="mt-1.5 text-[11px] font-medium text-text-secondary">{label}</p>
        {trend?.label && (
          <p className="mt-0.5 text-[10px] text-text-tertiary">{trend.label}</p>
        )}
      </div>
    </div>
  )
}
