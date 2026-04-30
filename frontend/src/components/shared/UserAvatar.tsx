import { cn } from '@/lib/utils'
import { AvatarImage } from '@/components/shared/AvatarImage'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface UserAvatarProps {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  status?: 'online' | 'offline' | 'away' | 'busy'
  className?: string
}

const sizeClasses: Record<AvatarSize, { container: string; text: string; dot: string }> = {
  xs: { container: 'h-6 w-6', text: 'text-[10px]', dot: 'h-1.5 w-1.5 -bottom-px -right-px' },
  sm: { container: 'h-7 w-7', text: 'text-[10px]', dot: 'h-2 w-2 -bottom-0.5 -right-0.5' },
  md: { container: 'h-8 w-8', text: 'text-xs', dot: 'h-2.5 w-2.5 bottom-0 right-0' },
  lg: { container: 'h-10 w-10', text: 'text-sm', dot: 'h-3 w-3 bottom-0 right-0' },
  xl: { container: 'h-14 w-14', text: 'text-lg', dot: 'h-3.5 w-3.5 bottom-0.5 right-0.5' },
}

const statusColors: Record<string, string> = {
  online: 'bg-success',
  offline: 'bg-muted-foreground/40',
  away: 'bg-warning',
  busy: 'bg-destructive',
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function UserAvatar({ name, src, size = 'md', status, className }: UserAvatarProps) {
  const s = sizeClasses[size]

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <AvatarImage
          src={src}
          name={name}
          alt={name ?? ''}
          className={cn(s.container, 'rounded-full object-cover')}
          fallbackClassName={cn(s.text, 'font-semibold')}
        />
      ) : (
        <div className={cn(
          s.container,
          'flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
          s.text,
        )}>
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span className={cn(
          'absolute rounded-full border-2 border-card',
          s.dot,
          statusColors[status],
        )} />
      )}
    </div>
  )
}

export function AvatarStack({
  users,
  max = 4,
  size = 'sm',
}: {
  users: Array<{ name?: string | null; avatarUrl?: string | null }>
  max?: number
  size?: AvatarSize
}) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u, i) => (
        <UserAvatar
          key={i}
          name={u.name}
          src={u.avatarUrl}
          size={size}
          className="ring-2 ring-card"
        />
      ))}
      {overflow > 0 && (
        <div className={cn(
          sizeClasses[size].container,
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-card',
          sizeClasses[size].text,
        )}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
