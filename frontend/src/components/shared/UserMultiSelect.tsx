import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarImage } from '@/components/shared/AvatarImage'
import type { User } from '@/types'

interface Props {
  users: User[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function UserMultiSelect({
  users,
  selectedIds,
  onChange,
  placeholder = 'Выберите исполнителей',
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.includes(u.id)),
    [users, selectedIds],
  )

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    return users
      .filter((u) => !selectedIds.includes(u.id))
      .filter((u) => {
        if (!q) return true
        const name = `${u.full_name || ''} ${u.email || ''}`.toLowerCase()
        return name.includes(q)
      })
      .slice(0, 20)
  }, [users, selectedIds, search])

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function removeUser(userId: string) {
    onChange(selectedIds.filter((id) => id !== userId))
  }

  function addUser(userId: string) {
    onChange([...selectedIds, userId])
    setSearch('')
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex min-h-9 flex flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm',
          'focus-within:ring-2 focus-within:ring-ring/50',
          'data-placeholder:text-muted-foreground',
          open && 'ring-2 ring-ring/50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true)
            inputRef.current?.focus()
          }
        }}
      >
        {selectedUsers.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-xs"
          >
            <AvatarImage
              src={user.avatar_url}
              name={user.full_name || user.email}
              className="h-5 w-5 rounded-full"
            />
            <span className="max-w-[120px] truncate">
              {user.full_name || user.email}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeUser(user.id)
                }}
                className="flex h-3 w-3 items-center justify-center rounded-sm hover:bg-accent-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedUsers.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-20 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-48 rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredUsers.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Нет доступных сотрудников
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addUser(user.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <AvatarImage
                    src={user.avatar_url}
                    name={user.full_name || user.email}
                    className="h-6 w-6 rounded-full"
                  />
                  <span className="flex flex-col items-start">
                    <span className="truncate">
                      {user.full_name || user.email}
                    </span>
                    {user.full_name && user.email && (
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}