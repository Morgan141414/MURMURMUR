import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { TaskColumn, User } from '@/types'
import type { Deal } from '@/types/crm'
import { DealBoardColumn } from './DealBoardColumn'
import { DealCard } from './DealCard'

interface Props {
  columns: TaskColumn[]
  deals: Deal[]
  pipelineId?: string
  users?: User[]
  currentUserId?: string
  onReorderDeal: (dealId: string, columnId: string) => void
  onDealClick?: (deal: Deal) => void
  onQuickDealCreate?: (deal: Partial<Deal>) => Promise<void>
  onAssignToMe?: (dealId: string) => void
}

export function DealBoardView({ columns, deals, pipelineId, users, currentUserId, onReorderDeal, onDealClick, onQuickDealCreate, onAssignToMe }: Props) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const boardScrollRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const hasActiveFilters = !!search.trim() || statusFilter !== 'all'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return closestCorners(args)
  }, [])

  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase()
    return deals.filter((deal) => {
      const matchesSearch =
        !query ||
        (deal.organization_name || '').toLowerCase().includes(query) ||
        (deal.contact_name || '').toLowerCase().includes(query) ||
        (deal.name || '').toLowerCase().includes(query)
      // Используем stage_id если доступен, иначе status
      const dealKey = deal.stage_id || deal.status || ''
      const matchesStatus = statusFilter === 'all' || dealKey === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [deals, search, statusFilter])

  const dealsByColumn = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    for (const col of columns) {
      map[col.id] = []
    }
    for (const deal of filteredDeals) {
      // Используем stage_id если доступен, иначе status
      const key = deal.stage_id || deal.status || columns[0]?.id || ''
      if (map[key]) {
        map[key].push(deal)
      }
    }
    return map
  }, [columns, filteredDeals])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const deal = filteredDeals.find((d) => d.id === event.active.id)
      if (deal) setActiveDeal(deal)
    },
    [filteredDeals]
  )

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const rect = boardScrollRef.current?.getBoundingClientRect()
    const pointerX =
      event.activatorEvent instanceof PointerEvent ? event.activatorEvent.clientX + event.delta.x : null
    if (!rect || pointerX == null) return
    const edge = 96
    if (pointerX > rect.right - edge) {
      boardScrollRef.current?.scrollBy({ left: 24 })
    } else if (pointerX < rect.left + edge) {
      boardScrollRef.current?.scrollBy({ left: -24 })
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDeal(null)
      const { active, over } = event
      if (!over) return

      const dealId = active.id as string
      let targetColumnId = over.id as string
      const overType = over.data.current?.type

      if (overType === 'column-drop') {
        targetColumnId = String(over.data.current?.columnId ?? targetColumnId).replace(/^column-drop:/, '')
      } else {
        const isColumn = columns.some((c) => c.id === targetColumnId)
        if (!isColumn) {
          const overDeal = filteredDeals.find((d) => d.id === targetColumnId)
          if (overDeal) {
            // Используем stage_id если доступен, иначе status
            targetColumnId = overDeal.stage_id || overDeal.status || ''
            if (!targetColumnId) return
          } else {
            return
          }
        }
      }

      onReorderDeal(dealId, targetColumnId)
    },
    [columns, filteredDeals, onReorderDeal]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по компании, контакту, ID..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Статус</span>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="all">Все статусы</option>
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent"
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {filteredDeals.length} сделок в {columns.length} колонках
        </div>
      </div>

      <div
        ref={boardScrollRef}
        className="flex h-[calc(100vh-240px)] w-full gap-4 overflow-x-auto overflow-y-hidden pb-4"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => (
              <DealBoardColumn
                key={col.id}
                column={col}
                deals={dealsByColumn[col.id] || []}
                pipelineId={pipelineId}
                users={users}
                currentUserId={currentUserId}
                onDealClick={onDealClick}
                onQuickDealCreate={onQuickDealCreate}
                onAssignToMe={onAssignToMe}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
