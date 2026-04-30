import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { getInitials, resolveMediaUrl } from '@/lib/media'

interface AvatarImageProps {
  src?: string | null
  name?: string | null
  alt?: string
  className?: string
  fallbackClassName?: string
}

export function AvatarImage({
  src,
  name,
  alt,
  className,
  fallbackClassName,
}: AvatarImageProps) {
  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src])
  const [hasError, setHasError] = useState(false)

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
          className,
          fallbackClassName,
        )}
      >
        {getInitials(name)}
      </div>
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt ?? name ?? 'Avatar'}
      onError={() => setHasError(true)}
      className={className}
    />
  )
}
