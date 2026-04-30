import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { UserAvatar } from './UserAvatar'

interface ActivityItemProps {
  actor: { name?: string | null; avatarUrl?: string | null }
  action: string
  target?: string
  timestamp: string
  icon?: ReactNode
  className?: string
}

export function ActivityItem({
  actor,
  action,
  target,
  timestamp,
  icon,
  className,
}: ActivityItemProps) {
  return (
    <div className={cn('flex items-start gap-3 py-2.5', className)}>
      {icon ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : (
        <UserAvatar name={actor.name} src={actor.avatarUrl} size="sm" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-medium">{actor.name ?? 'System'}</span>
          {' '}{action}
          {target && (
            <>
              {' '}<span className="font-medium text-foreground">{target}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  )
}
