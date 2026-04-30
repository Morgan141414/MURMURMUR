import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function AccPageHeader({
  title,
  left,
  onBack,
  children,
}: {
  title: string
  left?: ReactNode
  onBack?: () => void
  children?: ReactNode
}) {
  return (
    <div className="acc-page-header">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-0.5 rounded hover:opacity-70" style={{ color: 'var(--acc-gray-500)' }}>
            <ChevronLeft size={20} />
          </button>
        )}
        <h1>{title}</h1>
        {left}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
