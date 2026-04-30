import { useState, useRef, useEffect } from 'react'
import { LayoutList, Kanban, ChevronDown, Check } from 'lucide-react'

export type ViewType = 'list' | 'kanban'

interface Props {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function ViewSwitcher({ currentView, onViewChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const views: { type: ViewType; label: string; icon: typeof LayoutList }[] = [
    { type: 'list', label: 'List', icon: LayoutList },
    { type: 'kanban', label: 'Kanban', icon: Kanban },
  ]

  const currentViewData = views.find((v) => v.type === currentView)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        {currentViewData?.icon && <currentViewData.icon className="h-4 w-4" />}
        <span>{currentViewData?.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="p-1">
            {views.map((view) => {
              const Icon = view.icon
              const isActive = view.type === currentView

              return (
                <button
                  key={view.type}
                  onClick={() => {
                    onViewChange(view.type)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{view.label}</span>
                  {isActive && <Check className="h-4 w-4" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
