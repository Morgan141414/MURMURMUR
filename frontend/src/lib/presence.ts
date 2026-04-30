import type { User } from '@/types'

export function getUserOnlineStatus(user: Pick<User, 'last_seen_at'>, thresholdMs = 5 * 60 * 1000): 'online' | 'offline' {
  if (!user.last_seen_at) return 'offline'
  const seenAt = new Date(user.last_seen_at).getTime()
  if (Number.isNaN(seenAt)) return 'offline'
  return Date.now() - seenAt <= thresholdMs ? 'online' : 'offline'
}
