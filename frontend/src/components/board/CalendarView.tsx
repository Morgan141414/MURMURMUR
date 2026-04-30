import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BoardTask } from '@/types'
import { toLocalDateKey } from '@/lib/dueDate'

interface Props {
  tasks: BoardTask[]
  onTaskClick?: (task: BoardTask) => void
}

export function CalendarView({ tasks, onTaskClick }: Props) {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const tasksByDate = useMemo(() => {
    const map: Record<string, BoardTask[]> = {}
    for (const task of tasks) {
      if (task.due_date) {
        const key = toLocalDateKey(task.due_date)
        if (!map[key]) map[key] = []
        map[key].push(task)
      }
    }
    return map
  }, [tasks])

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const prev = () => setCurrentDate(new Date(year, month - 1, 1))
  const next = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const weekDays = [t('board.sun'), t('board.mon'), t('board.tue'), t('board.wed'), t('board.thu'), t('board.fri'), t('board.sat')]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="rounded p-1 hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-sm font-medium capitalize">{monthName}</span>
        <button onClick={next} className="rounded p-1 hover:bg-accent"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {weekDays.map((d) => (
          <div key={d} className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
          const dayTasks = day ? tasksByDate[dateStr] || [] : []
          return (
            <div key={idx} className="bg-card min-h-[80px] p-1">
              {day && (
                <>
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div className="space-y-0.5 mt-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick?.(task)}
                        className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary cursor-pointer hover:bg-primary/20"
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
