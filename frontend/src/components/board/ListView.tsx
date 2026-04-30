import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle } from 'lucide-react'
import type { BoardTask, User } from '@/types'
import { formatTaskStatusLabel, isTaskDone } from './taskStatus'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { useMemo } from 'react'
import { formatDueDate } from '@/lib/dueDate'
import { formatPriorityLabel } from './priority'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600',
}

interface Props {
  tasks: BoardTask[]
  users?: User[]
  onTaskClick?: (task: BoardTask) => void
  onToggleDone?: (task: BoardTask) => void
}

export function ListView({ tasks, users = [], onTaskClick, onToggleDone }: Props) {
  const { t } = useTranslation()
  const assigneeMap = useMemo(() => {
    const map: Record<string, string> = Object.fromEntries(users.map((user) => [user.id, user.full_name || user.email]))
    for (const task of tasks) {
      if (task.assignee_id && task.assignee) {
        map[task.assignee_id] = task.assignee.full_name || task.assignee.first_name || task.assignee_id.slice(0, 8)
      }
    }
    return map
  }, [users, tasks])

  const columns = useMemo<ColumnDef<BoardTask>[]>(
    () => [
      {
        id: 'complete',
        header: '',
        cell: ({ row }) => {
          const isDone = isTaskDone(row.original.status)
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleDone?.(row.original)
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
              aria-label={
                isDone
                  ? t('board.markAsTodo', 'Вернуть в работу')
                  : t('board.markAsDone', 'Отметить выполненной')
              }
            >
              {isDone ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> : <Circle className="h-4.5 w-4.5" />}
            </button>
          )
        },
      },
      {
        accessorKey: 'title',
        header: t('board.title'),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className={`font-medium ${isTaskDone(row.original.status) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {row.original.title}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.description || 'Без описания'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('board.status'),
        cell: ({ row }) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{formatTaskStatusLabel(t, row.original.status)}</span>
        ),
      },
      {
        accessorKey: 'priority',
        header: t('board.priority'),
        cell: ({ row }) =>
          row.original.priority ? (
            <span className={`text-xs font-medium ${PRIORITY_COLORS[row.original.priority] ?? ''}`}>
              {formatPriorityLabel(t, row.original.priority)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: 'assignee',
        header: t('board.assignee', 'Исполнитель'),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.assignee_id ? assigneeMap[row.original.assignee_id] || row.original.assignee_id.slice(0, 8) : 'Не назначен'}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: t('board.dueDate'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.due_date ? formatDueDate(row.original.due_date) : '—'}
          </span>
        ),
      },
    ],
    [assigneeMap, t],
  )

  return (
    <DataTable
      columns={columns}
      data={tasks}
      emptyTitle={t('board.noTasks')}
      onRowClick={onTaskClick}
    />
  )
}
