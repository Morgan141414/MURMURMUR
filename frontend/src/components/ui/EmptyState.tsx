import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          {icon}
        </div>
      )}
      <h3 className="text-white text-lg font-semibold mb-2 text-center">{title}</h3>
      {description && (
        <p className="text-white/40 text-sm text-center max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
