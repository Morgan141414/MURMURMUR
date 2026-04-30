import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { Calendar, CheckCircle2, CheckSquare, Circle, Clock3, MessageSquare, Paperclip, User, UserPlus } from 'lucide-react'
import type { BoardTask } from '@/types'
import { cn } from '@/lib/utils'
import { formatDueDate } from '@/lib/dueDate'
import { formatPriorityLabel } from './priority'
import { formatTaskDuration, formatTaskStatusLabel, isTaskDone, isTaskInProgress, isTaskPendingReview } from './taskStatus'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-600 border-red-200',
  high: 'bg-orange-500/10 text-orange-600 border-orange-200',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  low: 'bg-blue-500/10 text-blue-600 border-blue-200',
}

interface Props {
  task: BoardTask
  assigneeName?: string
  assigneeNames?: string[]
  currentUserId?: string
  onClick?: () => void
  onToggleDone?: (task: BoardTask) => void
  onAssignSelf?: (task: BoardTask) => void
}

export function BoardTaskCard({ task, assigneeName, assigneeNames, currentUserId, onClick, onToggleDone, onAssignSelf }: Props) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const isOverdue = !!task.due_date && new Date(task.due_date).getTime() < Date.now() && !isTaskDone(task.status)
  const isDone = isTaskDone(task.status)
  const isPendingReview = isTaskPendingReview(task.status)
  const isInProgress = isTaskInProgress(task.status)
  const workflowDuration = task.work_started_at ? formatTaskDuration(task.work_started_at, task.work_finished_at) : null
  const assignedIds = task.assignee_ids?.length ? task.assignee_ids : task.assignee_id ? [task.assignee_id] : []
  const attachmentCount = typeof task.attachments_count === 'number' ? task.attachments_count : 0
  const assigneeLabel = assigneeNames?.length
    ? assigneeNames.join(', ')
    : assigneeName || (task.assignee_id ? task.assignee_id.slice(0, 8) : 'Не назначен')
  const createdByLabel = task.created_by?.full_name || task.created_by?.first_name || task.created_by_id?.slice(0, 8)

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
        isOverdue ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-border hover:border-primary/20 hover:bg-accent/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onToggleDone?.(task)
            }}
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
            aria-label={isDone ? 'Вернуть в работу' : isPendingReview ? 'Подтвердить выполнение' : 'Отметить выполненной'}
          >
            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : isPendingReview ? <Clock3 className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4" />}
          </button>
          <p className={cn('line-clamp-2 text-sm font-medium', isDone ? 'text-muted-foreground line-through' : 'text-foreground')}>
            {task.title}
          </p>
        </div>
        {task.story_points ? (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {task.story_points} pt
          </span>
        ) : null}
      </div>

      {task.description ? (
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {task.priority && (
          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[task.priority] ?? 'bg-muted text-muted-foreground'}`}>
            {formatPriorityLabel(t, task.priority)}
          </span>
        )}
        {(isPendingReview || isInProgress || isDone) && (
          <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium', isPendingReview ? 'bg-amber-500/10 text-amber-700' : isInProgress ? 'bg-blue-500/10 text-blue-700' : 'bg-emerald-500/10 text-emerald-700')}>
            {formatTaskStatusLabel(t, task.status)}
          </span>
        )}
        {workflowDuration && (
          <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Clock3 className="mr-1 h-3 w-3" />
            {workflowDuration}
          </span>
        )}
        {isOverdue && (
          <span className="inline-flex items-center rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            Просрочено
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3 w-3" />
            </span>
            <span className="min-w-0 max-w-[150px] truncate">{assigneeLabel}</span>
            {assignedIds.length > 1 ? (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+{assignedIds.length - 1}</span>
            ) : null}
            {onAssignSelf && currentUserId && assignedIds.length === 0 && (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onAssignSelf(task)
                }}
                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <UserPlus className="h-3 w-3" />
                Мне
              </button>
            )}
          </div>

          {task.due_date ? (
            <span className={cn('shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground', isOverdue ? 'text-red-600' : '')}>
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.due_date)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {createdByLabel ? (
            <div className="flex min-w-0 items-center gap-1 text-[11px]">
              <span className="shrink-0 text-muted-foreground">Автор:</span>
              <span className="min-w-0 truncate font-medium text-foreground">{createdByLabel}</span>
            </div>
          ) : (
            <span />
          )}

          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            {task.checklist_total > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {task.checklist_done}/{task.checklist_total}
              </span>
            )}
            {task.comments_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {task.comments_count}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {attachmentCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
