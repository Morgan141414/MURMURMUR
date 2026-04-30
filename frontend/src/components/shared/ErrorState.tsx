import { AlertTriangle, RefreshCw, WifiOff, Clock, ServerCrash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type ErrorVariant = 'generic' | 'network' | 'timeout' | 'server'

const variantConfig: Record<ErrorVariant, { icon: typeof AlertTriangle; color: string }> = {
  generic: { icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  network: { icon: WifiOff, color: 'text-orange-500 bg-orange-500/10' },
  timeout: { icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
  server: { icon: ServerCrash, color: 'text-red-500 bg-red-500/10' },
}

interface ErrorStateProps {
  title?: string
  message?: string
  variant?: ErrorVariant
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title,
  message,
  variant = 'generic',
  onRetry,
  className = '',
}: ErrorStateProps) {
  const { t } = useTranslation()
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-12 text-center', className)}>
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${config.color.split(' ')[1]}`}>
        <Icon className={`h-7 w-7 ${config.color.split(' ')[0]}`} />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        {title || t('errors.generic')}
      </h3>
      {message && (
        <p className="mb-4 max-w-sm text-xs text-muted-foreground">{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
