import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { TaskColumn, BoardTask } from '@/types'
import { BoardTaskCard } from './BoardTaskCard'
import { cn } from '@/lib/utils'

interface Props {
  column: TaskColumn
  tasks: BoardTask[]
  assigneeMap?: Record<string, string>
  currentUserId?: string
  onTaskClick?: (task: BoardTask) => void
  onToggleDone?: (task: BoardTask) => void
  onAssignSelf?: (task: BoardTask) => void
  onAddTask?: (columnId: string) => void
  onRenameColumn?: (column: TaskColumn) => void
  onDeleteColumn?: (column: TaskColumn) => void
  onMoveLeft?: (columnId: string) => void
  onMoveRight?: (columnId: string) => void
  deleting?: boolean
}

export function BoardColumn({
  column,
  tasks,
  assigneeMap,
  currentUserId,
  onTaskClick,
  onToggleDone,
  onAssignSelf,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onMoveLeft,
  onMoveRight,
  deleting = false,
}: Props) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop:${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
  })
  const isRealColumn = column.id !== '__unassigned'
  const hasTasks = tasks.length > 0
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: 'column', column }, disabled: !isRealColumn })

  return (
    <div
      ref={setSortableRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex w-80 shrink-0 flex-col h-full max-h-full overflow-hidden rounded-2xl border border-border bg-card',
        isDragging && 'opacity-70 shadow-xl',
      )}
    >
      <div
        className="h-1 rounded-t-2xl"
        style={{ backgroundColor: column.color || 'var(--color-border)' }}
      />
      <div className="flex items-center justify-between px-3 py-3">
        {isRealColumn ? (
          <div
            className="flex min-w-0 cursor-move items-center gap-2 rounded-md p-1 -ml-1 hover:bg-accent/50"
            {...attributes}
            {...listeners}
            title="Перетащите для изменения порядка"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            {column.color && (
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
            )}
            <span className="truncate font-semibold text-foreground">{column.name}</span>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            {column.color && (
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
            )}
            <span className="truncate font-semibold text-foreground">{column.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {onMoveLeft && (
            <button
              onClick={() => onMoveLeft(column.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Переместить влево"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {onMoveRight && (
            <button
              onClick={() => onMoveRight(column.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Переместить вправо"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {onAddTask && (
            <button
              onClick={() => onAddTask(column.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {isRealColumn ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-popover py-1 shadow-md">
                  <button
                    onClick={() => { setShowMenu(false); onRenameColumn?.(column) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent"
                  >
                    <Pencil className="h-4 w-4" />
                    {t('common.rename', 'Переименовать')}
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDeleteColumn?.(column) }}
                    disabled={deleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? t('common.deleting', 'Удаление...') : t('common.delete', 'Удалить')}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={hasTasks ? setNodeRef : undefined}
        className={cn(
          'relative flex-1 space-y-2 p-2.5 min-h-[120px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-border scrollbar-hide hover:scrollbar-thin hover:scrollbar-thumb-rounded hover:scrollbar-thumb-border hover:scrollbar-w-2',
          isOver && 'bg-primary/5',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardTaskCard
              key={task.id}
              task={task}
              assigneeName={task.assignee_id ? assigneeMap?.[task.assignee_id] : undefined}
              assigneeNames={(task.assignee_ids ?? []).map((id) => assigneeMap?.[id] ?? id.slice(0, 8))}
              currentUserId={currentUserId}
              onClick={() => onTaskClick?.(task)}
              onToggleDone={onToggleDone}
              onAssignSelf={onAssignSelf}
            />
          ))}
        </SortableContext>
        {!hasTasks && (
          <>
            <div ref={setNodeRef} className="absolute inset-2 rounded-xl" aria-hidden="true" />
            <div className="relative rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              <p>{t('board.emptyColumn', 'Перетащите задачу сюда или создайте новую')}</p>
              {onAddTask && (
                <button
                  onClick={() => onAddTask(column.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('board.createTask', 'Создать')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
