import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { TaskColumn, User } from '@/types'
import type { Deal } from '@/types/crm'
import { DealCard } from './DealCard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuickDealModal } from '@/components/crm/QuickDealModal'

interface Props {
  column: TaskColumn
  deals: Deal[]
  pipelineId?: string
  users?: User[]
  currentUserId?: string
  onDealClick?: (deal: Deal) => void
  onQuickDealCreate?: (deal: Partial<Deal>) => Promise<void>
  onAssignToMe?: (dealId: string) => void
}

export function DealBoardColumn({ column, deals, pipelineId, users, currentUserId, onDealClick, onQuickDealCreate, onAssignToMe }: Props) {
  const [showQuickDeal, setShowQuickDeal] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop:${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
  })
  const hasTasks = deals.length > 0

  const handleQuickDealSave = async (deal: Partial<Deal>) => {
    if (onQuickDealCreate) {
      await onQuickDealCreate(deal)
    }
  }

  // Подсчёт общей суммы сделок в колонке
  const totalValue = deals.reduce((sum, deal) => sum + (deal.annual_revenue || 0), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div
      className={cn(
        'flex w-80 shrink-0 flex-col h-full max-h-full overflow-hidden rounded-2xl border border-border bg-card'
      )}
    >
      <div className="h-1 rounded-t-2xl" style={{ backgroundColor: column.color || 'var(--color-border)' }} />
      <div className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {column.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />}
          <span className="truncate font-semibold text-foreground">{column.name}</span>
          <span className="ml-auto shrink-0 text-sm text-muted-foreground">{deals.length}</span>
        </div>
        {totalValue > 0 && (
          <div className="mt-2 text-xs text-emerald-600 font-medium">{formatCurrency(totalValue)}</div>
        )}
        {/* Кнопка быстрого создания сделки */}
        {onQuickDealCreate && pipelineId && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-center text-xs font-medium bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
            onClick={() => setShowQuickDeal(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Быстрая сделка
          </Button>
        )}
      </div>

      <div
        ref={hasTasks ? setNodeRef : undefined}
        className={cn(
          'relative flex-1 space-y-2 p-2.5 min-h-[120px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-border scrollbar-hide hover:scrollbar-thin hover:scrollbar-thumb-rounded hover:scrollbar-thumb-border hover:scrollbar-w-2',
          isOver && 'bg-primary/5'
        )}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              users={users}
              currentUserId={currentUserId}
              onClick={() => onDealClick?.(deal)}
              onAssignToMe={onAssignToMe}
            />
          ))}
        </SortableContext>
        {!hasTasks && (
          <>
            <div ref={setNodeRef} className="absolute inset-2 rounded-xl" aria-hidden="true" />
            <div className="relative rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              <p>Перетащите сделку сюда</p>
            </div>
          </>
        )}
      </div>

      {/* Модал быстрого создания сделки */}
      {pipelineId && (
        <QuickDealModal
          open={showQuickDeal}
          onClose={() => setShowQuickDeal(false)}
          stageId={column.id}
          pipelineId={pipelineId}
          onSave={handleQuickDealSave}
        />
      )}
    </div>
  )
}
