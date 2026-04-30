import { useTranslation } from 'react-i18next'
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected'
  className?: string
}

const statusConfig = {
  pending: {
    icon: Clock,
    colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    labelKey: 'approval.statusPending',
    fallback: 'Ожидает',
  },
  approved: {
    icon: CheckCircle2,
    colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    labelKey: 'approval.statusApproved',
    fallback: 'Одобрено',
  },
  rejected: {
    icon: XCircle,
    colorClass: 'bg-red-500/10 text-red-600 border-red-500/20',
    labelKey: 'approval.statusRejected',
    fallback: 'Отклонено',
  },
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  const { t } = useTranslation()
  const config = statusConfig[status] ?? statusConfig.pending
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
        config.colorClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status !== 'approved' && t(config.labelKey, config.fallback)}
    </span>
  )
}
