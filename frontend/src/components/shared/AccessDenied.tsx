import { ShieldX, Lock, Clock, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type AccessType = 'denied' | 'limited' | 'expired' | 'emergency_only'

const accessConfig: Record<AccessType, { icon: typeof ShieldX; color: string; bgColor: string }> = {
  denied: { icon: ShieldX, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  limited: { icon: Lock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  expired: { icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  emergency_only: { icon: ShieldX, color: 'text-red-500', bgColor: 'bg-red-500/10 border border-red-500/20' },
}

interface AccessDeniedProps {
  type?: AccessType
  title?: string
  reason?: string
  grantedBy?: string
  canRequest?: boolean
  onRequest?: () => void
  className?: string
}

export function AccessDenied({
  type = 'denied',
  title,
  reason,
  grantedBy,
  canRequest = false,
  onRequest,
  className = '',
}: AccessDeniedProps) {
  const { t } = useTranslation()
  const config = accessConfig[type]
  const Icon = config.icon

  const defaultTitles: Record<AccessType, string> = {
    denied: t('access.denied', 'Доступ запрещён'),
    limited: t('access.limited', 'Ограниченный доступ'),
    expired: t('access.expired', 'Доступ истёк'),
    emergency_only: t('access.emergencyOnly', 'Только в режиме ЧП'),
  }

  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${config.bgColor} mb-5`}>
        <Icon className={`h-8 w-8 ${config.color}`} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {title || defaultTitles[type]}
      </h3>
      {reason && (
        <p className="text-sm text-muted-foreground max-w-md mb-2">{reason}</p>
      )}
      {grantedBy && (
        <p className="text-xs text-muted-foreground">
          {t('access.grantedBy', 'Доступ выдаёт')}: <span className="font-medium text-foreground">{grantedBy}</span>
        </p>
      )}
      {canRequest && onRequest && (
        <button
          onClick={onRequest}
          className="mt-5 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Mail className="h-4 w-4" />
          {t('access.requestAccess', 'Запросить доступ')}
        </button>
      )}
    </div>
  )
}
