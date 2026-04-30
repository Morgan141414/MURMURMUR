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
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { Archive, Plus, Search, SlidersHorizontal } from 'lucide-react'
import type { TaskColumn, BoardTask, User } from '@/types'
import { BoardColumn } from './BoardColumn'
import { BoardTaskCard } from './BoardTaskCard'
import { cn } from '@/lib/utils'

interface Props {
  columns: TaskColumn[]
  tasks: BoardTask[]
  users?: User[]
  currentUserId?: string
  onReorderTask: (taskId: string, columnId: string, position: number) => void
  onReorderColumns?: (columnIds: string[]) => void
  onTaskClick?: (task: BoardTask) => void
  onToggleDone?: (task: BoardTask) => void
  onAssignSelf?: (task: BoardTask) => void
  onAddTask?: (columnId: string) => void
  onAddColumn?: () => void
  onRenameColumn?: (column: TaskColumn) => void
  onDeleteColumn?: (column: TaskColumn) => void
  onMoveColumn?: (columnId: string, direction: 'left' | 'right') => void
  deletingColumnId?: string | null
  archiveMode?: boolean
  onToggleArchiveMode?: () => void
}

export function BoardView({
  columns,
  tasks,
  users = [],
  currentUserId,
  onReorderTask,
  onReorderColumns,
  onTaskClick,
  onToggleDone,
  onAssignSelf,
  onAddTask,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  deletingColumnId = null,
  archiveMode = false,
  onToggleArchiveMode,
}: Props) {
  const { t } = useTranslation()
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null)
  const [activeColumn, setActiveColumn] = useState<TaskColumn | null>(null)
  const boardScrollRef = useRef<HTMLDivElement>(null)
  const panStateRef = useRef<{ active: boolean; startX: number; scrollLeft: number }>({
    active: false,
    startX: 0,
    scrollLeft: 0,
  })
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [deadlineFilter, setDeadlineFilter] = useState('all')
  const hasActiveFilters =
    !!search.trim() || priorityFilter !== 'all' || assigneeFilter !== 'all' || deadlineFilter !== 'all'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return closestCorners(args)
  }, [])

  const assigneeMap = useMemo(() => {
    const map: Record<string, string> = Object.fromEntries(users.map((user) => [user.id, user.full_name || user.email]))
    for (const task of tasks) {
      if (task.assignee_id && task.assignee) {
        map[task.assignee_id] = task.assignee.full_name || task.assignee.first_name || task.assignee_id.slice(0, 8)
      }
      if (task.assignee_ids && task.assignee) {
        for (const id of task.assignee_ids) {
          if (!map[id] && task.assignee?.id === id) {
            map[id] = task.assignee.full_name || task.assignee.first_name || id.slice(0, 8)
          }
        }
      }
    }
    return map
  }, [users, tasks])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        (task.assignee_id ? (assigneeMap[task.assignee_id] || '').toLowerCase().includes(query) : false) ||
        (task.assignee_ids ?? []).some((id) => (assigneeMap[id] || '').toLowerCase().includes(query))
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_id === assigneeFilter || (task.assignee_ids ?? []).includes(assigneeFilter)
      const isOverdue = !!task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'done'
      const hasDueDate = !!task.due_date
      const matchesDeadline =
        deadlineFilter === 'all' ||
        (deadlineFilter === 'overdue' && isOverdue) ||
        (deadlineFilter === 'scheduled' && hasDueDate) ||
        (deadlineFilter === 'undated' && !hasDueDate)
      return matchesSearch && matchesPriority && matchesAssignee && matchesDeadline
    })
  }, [assigneeFilter, assigneeMap, deadlineFilter, priorityFilter, search, tasks])

  const tasksByColumn = useMemo(() => {
    const map: Record<string, BoardTask[]> = {}
    for (const col of columns) {
      map[col.id] = []
    }
    map['__unassigned'] = []
    for (const task of filteredTasks) {
      const key = task.column_id && map[task.column_id] ? task.column_id : '__unassigned'
      map[key].push(task)
    }
    // Sort within each column by position
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.position - b.position)
    }
    return map
  }, [columns, filteredTasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const type = event.active.data.current?.type
    if (type === 'column') {
      setActiveColumn(columns.find((column) => column.id === event.active.id) ?? null)
      return
    }
    const task = filteredTasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }, [columns, filteredTasks])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const rect = boardScrollRef.current?.getBoundingClientRect()
    const pointerX = event.activatorEvent instanceof PointerEvent ? event.activatorEvent.clientX + event.delta.x : null
    if (!rect || pointerX == null) return
    const edge = 96
    if (pointerX > rect.right - edge) {
      boardScrollRef.current?.scrollBy({ left: 24 })
    } else if (pointerX < rect.left + edge) {
      boardScrollRef.current?.scrollBy({ left: -24 })
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null)
    setActiveColumn(null)
    const { active, over } = event
    if (!over) return

    if (active.data.current?.type === 'column') {
      if (!onReorderColumns || active.id === over.id) return
      const oldIndex = columns.findIndex((column) => column.id === active.id)
      const newIndex = columns.findIndex((column) => column.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      onReorderColumns(arrayMove(columns, oldIndex, newIndex).map((column) => column.id))
      return
    }

    const taskId = active.id as string
    // Determine target column: over could be a column body, a column header, or another task
    let targetColumnId = over.id as string
    let position = 0
    const overType = over.data.current?.type

    if (overType === 'column-drop') {
      targetColumnId = String(over.data.current?.columnId ?? targetColumnId).replace(/^column-drop:/, '')
      const colTasks = tasksByColumn[targetColumnId] || []
      position = colTasks.length
    } else {
      const isColumn = columns.some((c) => c.id === targetColumnId)
      if (!isColumn) {
        const overTask = filteredTasks.find((t) => t.id === targetColumnId)
        if (overTask && overTask.column_id) {
          targetColumnId = overTask.column_id
          position = overTask.position
        } else {
          return
        }
      } else {
        const colTasks = tasksByColumn[targetColumnId] || []
        position = colTasks.length
      }
    }

    onReorderTask(taskId, targetColumnId, position)
  }, [columns, filteredTasks, tasksByColumn, onReorderTask, onReorderColumns])

  const handlePanPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button, a, input, textarea, select, [role="button"], [data-no-board-pan]')) return
    const scroller = boardScrollRef.current
    if (!scroller) return
    panStateRef.current = { active: true, startX: event.clientX, scrollLeft: scroller.scrollLeft }
    scroller.setPointerCapture(event.pointerId)
    scroller.classList.add('cursor-grabbing')
  }, [])

  const handlePanPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = boardScrollRef.current
    if (!scroller || !panStateRef.current.active) return
    scroller.scrollLeft = panStateRef.current.scrollLeft - (event.clientX - panStateRef.current.startX)
  }, [])

  const stopPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = boardScrollRef.current
    panStateRef.current.active = false
    scroller?.classList.remove('cursor-grabbing')
    if (scroller?.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId)
  }, [])

  const unassigned = tasksByColumn['__unassigned'] || []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('board.searchPlaceholder', 'Искать задачи, описания и исполнителей...')}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span>{t('board.priority', 'Приоритет')}</span>
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="all">{t('board.allPriorities', 'Все приоритеты')}</option>
              <option value="critical">{t('board.priorityCritical', 'Критический')}</option>
              <option value="high">{t('board.priorityHigh', 'Высокий')}</option>
              <option value="medium">{t('board.priorityMedium', 'Средний')}</option>
              <option value="low">{t('board.priorityLow', 'Низкий')}</option>
            </select>
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="all">{t('board.allAssignees', 'Все исполнители')}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
            <select
              value={deadlineFilter}
              onChange={(event) => setDeadlineFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="all">{t('board.allDeadlines', 'Все сроки')}</option>
              <option value="overdue">{t('board.overdueOnly', 'Только просроченные')}</option>
              <option value="scheduled">{t('board.withDeadline', 'Со сроком')}</option>
              <option value="undated">{t('board.withoutDeadline', 'Без срока')}</option>
            </select>
            {onToggleArchiveMode ? (
              <button
                onClick={onToggleArchiveMode}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                  archiveMode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-accent',
                )}
              >
                <Archive className="h-4 w-4" />
                {t('board.archive', 'Архив')}
              </button>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPriorityFilter('all')
                  setAssigneeFilter('all')
                  setDeadlineFilter('all')
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent"
              >
                {t('board.clearFilters', 'Сбросить')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {t('board.visibleTasksSummary', {
            count: filteredTasks.length,
            columns: columns.length,
            defaultValue: `${filteredTasks.length} задач в ${columns.length} колонках`,
          })}
        </div>
      </div>

      <div
        ref={boardScrollRef}
        className="flex h-[calc(100vh-240px)] w-full gap-4 overflow-x-auto overflow-y-hidden pb-4"
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((col, idx) => (
              <BoardColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                assigneeMap={assigneeMap}
                currentUserId={currentUserId}
                onTaskClick={onTaskClick}
                onToggleDone={onToggleDone}
                onAssignSelf={onAssignSelf}
                onAddTask={onAddTask}
                onRenameColumn={onRenameColumn}
                onDeleteColumn={onDeleteColumn}
                onMoveLeft={idx > 0 && onMoveColumn ? () => onMoveColumn(col.id, 'left') : undefined}
                onMoveRight={idx < columns.length - 1 && onMoveColumn ? () => onMoveColumn(col.id, 'right') : undefined}
                deleting={deletingColumnId === col.id}
              />
            ))}
          </SortableContext>

          {unassigned.length > 0 && (
            <BoardColumn
              column={{
                id: '__unassigned',
                org_id: '',
                project_id: '',
                name: t('board.unassigned'),
                position: 999,
                created_at: '',
              }}
              tasks={unassigned}
              assigneeMap={assigneeMap}
              currentUserId={currentUserId}
              onTaskClick={onTaskClick}
              onToggleDone={onToggleDone}
              onAssignSelf={onAssignSelf}
            />
          )}

          <DragOverlay>
            {activeTask && (
              <BoardTaskCard
                task={activeTask}
                assigneeName={activeTask.assignee_id ? assigneeMap[activeTask.assignee_id] : undefined}
                assigneeNames={(activeTask.assignee_ids ?? []).map((id) => assigneeMap[id] ?? id.slice(0, 8))}
              />
            )}
            {activeColumn ? (
              <div className="flex h-20 w-80 shrink-0 items-center rounded-2xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-lg">
                {activeColumn.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {onAddColumn && (
          <button
            onClick={onAddColumn}
            className={cn(
              'flex h-12 w-80 shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition-colors',
              'hover:border-primary hover:text-primary',
            )}
          >
            <Plus className="h-4 w-4" />
            {t('board.addColumn')}
          </button>
        )}
      </div>
    </div>
  )
}
