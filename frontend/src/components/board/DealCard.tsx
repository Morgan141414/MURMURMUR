import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, Calendar, User, UserPlus } from 'lucide-react'
import type { Deal } from '@/types/crm'
import type { User as UserType } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  deal: Deal
  users?: UserType[]
  currentUserId?: string
  onClick?: () => void
  onAssignToMe?: (dealId: string) => void
}

export function DealCard({ deal, users = [], currentUserId, onClick, onAssignToMe }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { type: 'deal', deal } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const owner = users.find(u => u.id === deal.deal_owner_id)
  const hasOwner = !!deal.deal_owner_id

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date)
    } catch {
      return null
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-no-board-pan
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-pointer space-y-3 rounded-xl border bg-card p-3.5 transition-all',
        'border-border hover:border-primary/20 hover:bg-accent/20',
      )}
    >
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="line-clamp-2 text-sm font-medium text-foreground">
            {deal.name || 'Без названия'}
          </p>
        </div>
        {deal.probability !== undefined && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {deal.probability}%
          </span>
        )}
      </div>

      {/* Сумма сделки */}
      {deal.annual_revenue !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-emerald-600">
            {formatCurrency(deal.annual_revenue)}
          </span>
        </div>
      )}

      {/* Контакт */}
      {deal.contact_name && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="truncate">{deal.contact_name}</span>
        </div>
      )}

      {/* Дата закрытия */}
      {deal.close_date && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(deal.close_date)}</span>
        </div>
      )}

      {/* Организация */}
      {deal.organization_name && (
        <div className="pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {deal.organization_name}
          </span>
        </div>
      )}

      {/* Ответственный */}
      <div className="pt-2 border-t border-border">
        {hasOwner ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {owner?.full_name?.[0]?.toUpperCase() || owner?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {owner?.full_name || owner?.email || 'Пользователь'}
            </span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAssignToMe?.(deal.id)
            }}
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-md transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Назначить мне</span>
          </button>
        )}
      </div>
    </div>
  )
}
