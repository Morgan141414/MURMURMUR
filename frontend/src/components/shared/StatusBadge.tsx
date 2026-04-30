import { cn } from '@/lib/utils'
import {
  Check, Clock, Eye, X, AlertTriangle, Pause, Timer, Activity,
  FileEdit, Send, RotateCcw, Ban, Sparkles, CircleDot,
  type LucideIcon,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════
   StatusBadge — Enterprise Status System
   All workflow states: draft, pending, submitted,
   under_review, approved, rejected, needs_revision,
   suspended, overdue, active, inactive, cancelled,
   scheduled, paid, restored, escalated, resolved, failed
   ═══════════════════════════════════════════════════ */

type StatusVariant =
  | 'draft' | 'pending' | 'submitted' | 'under_review'
  | 'in_progress' | 'approved' | 'rejected' | 'needs_revision'
  | 'cancelled' | 'scheduled' | 'active' | 'inactive'
  | 'suspended' | 'overdue' | 'paid' | 'restored'
  | 'escalated' | 'resolved' | 'failed'
  | 'success' | 'warning' | 'error' | 'info' | 'default'

interface StatusConfig {
  label: string
  icon: LucideIcon
  dot: string
  bg: string
  text: string
  border: string
  glow?: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    label: 'Draft',
    icon: FileEdit,
    dot: 'bg-slate-400',
    bg: 'bg-slate-500/8',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    bg: 'bg-amber-500/8',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    glow: 'animate-pulse-soft',
  },
  submitted: {
    label: 'Submitted',
    icon: Send,
    dot: 'bg-blue-400',
    bg: 'bg-blue-500/8',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  under_review: {
    label: 'Under Review',
    icon: Eye,
    dot: 'bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.4)]',
    bg: 'bg-indigo-500/8',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    glow: 'animate-pulse-soft',
  },
  in_progress: {
    label: 'In Progress',
    icon: Activity,
    dot: 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.4)]',
    bg: 'bg-blue-500/8',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    glow: 'animate-pulse-soft',
  },
  approved: {
    label: 'Approved',
    icon: Check,
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    icon: X,
    dot: 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.4)]',
    bg: 'bg-red-500/8',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  needs_revision: {
    label: 'Needs Revision',
    icon: RotateCcw,
    dot: 'bg-orange-400',
    bg: 'bg-orange-500/8',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    dot: 'bg-slate-500',
    bg: 'bg-slate-500/8',
    text: 'text-slate-500',
    border: 'border-slate-500/20',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Timer,
    dot: 'bg-cyan-400',
    bg: 'bg-cyan-500/8',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  active: {
    label: 'Active',
    icon: Sparkles,
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  inactive: {
    label: 'Inactive',
    icon: CircleDot,
    dot: 'bg-slate-500',
    bg: 'bg-slate-500/8',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
  },
  suspended: {
    label: 'Suspended',
    icon: Pause,
    dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/25',
    glow: 'animate-pulse-soft',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    bg: 'bg-red-500/12',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'animate-pulse-soft',
  },
  paid: {
    label: 'Paid',
    icon: Check,
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  restored: {
    label: 'Restored',
    icon: RotateCcw,
    dot: 'bg-teal-400',
    bg: 'bg-teal-500/8',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
  },
  escalated: {
    label: 'Escalated',
    icon: AlertTriangle,
    dot: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/25',
    glow: 'animate-pulse-soft',
  },
  resolved: {
    label: 'Resolved',
    icon: Check,
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  failed: {
    label: 'Failed',
    icon: X,
    dot: 'bg-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/25',
  },
}

const ALIAS_MAP: Record<string, string> = {
  success: 'approved',
  warning: 'pending',
  error: 'rejected',
  info: 'under_review',
  default: 'draft',
}

interface StatusBadgeProps {
  variant?: StatusVariant
  children?: React.ReactNode
  className?: string
  showIcon?: boolean
  showDot?: boolean
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function StatusBadge({
  variant = 'default',
  children,
  className,
  showIcon = false,
  showDot = true,
  size = 'sm',
  pulse,
}: StatusBadgeProps) {
  const key = ALIAS_MAP[variant] ?? variant
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.draft
  const Icon = config.icon

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border transition-colors',
        sizes[size],
        config.bg,
        config.text,
        config.border,
        (pulse ?? !!config.glow) && config.glow,
        className,
      )}
    >
      {showDot && (
        <span className={cn('rounded-full flex-shrink-0', dotSizes[size], config.dot)} />
      )}
      {showIcon && <Icon className={cn('flex-shrink-0', iconSizes[size])} />}
      {children ?? config.label}
    </span>
  )
}

export { STATUS_CONFIG, ALIAS_MAP }
export type { StatusVariant, StatusConfig }
