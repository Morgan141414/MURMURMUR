import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BoardTask } from '@/types'
import { formatDueDate } from '@/lib/dueDate'

interface Props {
  tasks: BoardTask[]
  onTaskClick?: (task: BoardTask) => void
}

export function TimelineView({ tasks, onTaskClick }: Props) {
  const { t } = useTranslation()

  const { tasksWithDates, startDate, totalDays } = useMemo(() => {
    const withDates = tasks.filter((t) => t.due_date && t.created_at)
    if (withDates.length === 0) return { tasksWithDates: [], startDate: new Date(), totalDays: 30 }

    const dates = withDates.flatMap((t) => [new Date(t.created_at), new Date(t.due_date!)])
    const min = new Date(Math.min(...dates.map((d) => d.getTime())))
    const max = new Date(Math.max(...dates.map((d) => d.getTime())))
    const days = Math.max(Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)) + 1, 7)

    return { tasksWithDates: withDates, startDate: min, totalDays: days }
  }, [tasks])

  if (tasksWithDates.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">{t('board.noTasks')}</p>
  }

  function dayOffset(dateStr: string) {
    const d = new Date(dateStr)
    return Math.max(0, Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${totalDays * 30 + 200}px` }}>
        {/* Header with day markers */}
        <div className="flex border-b border-border mb-2">
          <div className="w-[200px] shrink-0" />
          <div className="flex-1 flex">
            {Array.from({ length: totalDays }, (_, i) => {
              const d = new Date(startDate)
              d.setDate(d.getDate() + i)
              return (
                <div key={i} className="text-center text-[10px] text-muted-foreground" style={{ width: 30 }}>
                  {d.getDate()}
                </div>
              )
            })}
          </div>
        </div>

        {/* Task bars */}
        {tasksWithDates.map((task) => {
          const start = dayOffset(task.created_at)
          const end = dayOffset(task.due_date!)
          const width = Math.max(end - start, 1)
          const color = PRIORITY_COLORS[task.priority ?? ''] ?? '#6366f1'

          return (
            <div key={task.id} className="flex items-center h-8 mb-1">
              <div className="w-[200px] shrink-0 truncate text-xs text-foreground pr-2">{task.title}</div>
              <div className="flex-1 relative h-6">
                <div
                  onClick={() => onTaskClick?.(task)}
                  className="absolute h-5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    left: start * 30,
                    width: width * 30,
                    backgroundColor: color,
                    opacity: 0.7,
                    top: 2,
                  }}
                  title={`${task.title}: ${task.created_at.slice(0, 10)} → ${task.due_date ? formatDueDate(task.due_date) : ''}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
