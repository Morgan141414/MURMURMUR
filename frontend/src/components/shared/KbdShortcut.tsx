import { cn } from '@/lib/utils'

interface KbdShortcutProps {
  keys: string[]
  className?: string
}

export function KbdShortcut({ keys, className }: KbdShortcutProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="pointer-events-none inline-flex h-5 items-center justify-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
