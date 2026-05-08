import { useState, useRef, useEffect } from 'react'
import { Search, Check, X } from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { cn } from '@/lib/utils'

interface UserOption {
  id: string
  name: string
  email?: string
  avatarUrl?: string | null
  role?: string
}

interface UserSelectProps {
  users: UserOption[]
  value?: string | null
  onChange: (userId: string | null) => void
  placeholder?: string
  className?: string
  loading?: boolean
}

export function UserSelect({
  users,
  value,
  onChange,
  placeholder = 'Выберите пользователя',
  className,
  loading,
}: UserSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = users.find((u) => u.id === value)

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q) ?? false)
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:bg-accent/50',
          open && 'border-ring',
        )}
      >
        {selected ? (
          <>
            <UserAvatar name={selected.name} src={selected.avatarUrl} size="xs" />
            <span className="flex-1 truncate text-left text-foreground">{selected.name}</span>
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange(null); setSearch('') }}
            />
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg">
          <div className="relative mb-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="h-8 w-full rounded-md border-0 bg-muted/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">Загрузка...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">Пользователи не найдены</div>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange(u.id); setOpen(false); setSearch('') }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                <UserAvatar name={u.name} src={u.avatarUrl} size="xs" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium text-foreground">{u.name}</p>
                  {u.email && <p className="truncate text-xs text-muted-foreground">{u.email}</p>}
                </div>
                {u.id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
