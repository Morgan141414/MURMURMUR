import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Calendar, User, CheckCircle2, Circle, Clock, MoreHorizontal } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { listTasks, createTask, updateTask, deleteTask } from '@/api/crm'
import type { Task, TaskCreate } from '@/types/crm'
import { ViewSwitcher, type ViewType } from '@/components/crm/ViewSwitcher'

const STATUS_OPTIONS = ['Todo', 'In Progress', 'Backlog', 'Done']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']

const STATUS_CONFIG = [
  { value: 'Todo', label: 'Todo', color: '#94a3b8' },
  { value: 'In Progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'Backlog', label: 'Backlog', color: '#f59e0b' },
  { value: 'Done', label: 'Done', color: '#22c55e' },
]

const STATUS_ICONS = {
  'Todo': <Circle className="h-4 w-4 text-muted-foreground" />,
  'In Progress': <Clock className="h-4 w-4 text-blue-500" />,
  'Backlog': <Circle className="h-4 w-4 text-amber-500" />,
  'Done': <CheckCircle2 className="h-4 w-4 text-green-500" />
}

export default function TasksPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<Partial<TaskCreate>>({})
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('tasks-view')
    return (saved as ViewType) || 'list'
  })

  const loadTasks = useCallback(async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      const response = await listTasks(activeOrgId)
      const tasksData = (response.data as any)?.data || response.data || []
      setTasks(tasksData)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !formData.title) return

    try {
      await createTask(activeOrgId, formData as TaskCreate)
      setShowModal(false)
      setFormData({})
      loadTasks()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!activeOrgId || !confirm('Удалить задачу?')) return

    try {
      await deleteTask(activeOrgId, id)
      loadTasks()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    }).format(date)
  }

  const formatDateRelative = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'сегодня'
    if (diffInDays === 1) return '1 день назад'
    if (diffInDays < 7) return `${diffInDays} дней назад`
    if (diffInDays < 14) return '1 неделю назад'
    return `${Math.floor(diffInDays / 7)} недель назад`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-red-600 dark:text-red-400'
      case 'Medium':
        return 'text-amber-600 dark:text-amber-400'
      case 'Low':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    localStorage.setItem('tasks-view', view)
  }

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    STATUS_CONFIG.forEach(status => {
      grouped[status.value] = []
    })
    tasks.forEach(task => {
      const status = task.status || 'Todo'
      if (grouped[status]) {
        grouped[status].push(task)
      }
    })
    return grouped
  }, [tasks])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Задачи</h1>
            <p className="text-sm text-muted-foreground mt-1">List</p>
          </div>
          <div className="flex items-center gap-3">
            <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Создать
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Название"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
          </div>
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Приоритет</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Назначено</option>
          </select>
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Статус</option>
            <option>Todo</option>
            <option>In Progress</option>
            <option>Backlog</option>
            <option>Done</option>
          </select>
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Срок</option>
          </select>
        </div>

        {currentView === 'list' ? (
          <>
            {/* Table */}
            <div className="rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Название
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Приоритет
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Срок
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Назначено
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Обновлено
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {task.title}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {STATUS_ICONS[task.status as keyof typeof STATUS_ICONS] || STATUS_ICONS['Todo']}
                            <span className="text-sm text-muted-foreground">{task.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(task.due_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-xs font-semibold text-white">
                              SC
                            </div>
                            <span className="text-sm text-foreground">Sarah Connor</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDateRelative(task.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Задачи не найдены
              </div>
            )}
          </>
        ) : (
          /* Kanban View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_CONFIG.map((status) => (
              <div key={status.value} className="flex-shrink-0 w-80">
                <div className="bg-card border rounded-lg">
                  <div className="p-4 border-b" style={{ borderColor: status.color }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold" style={{ color: status.color }}>
                        {status.label}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {tasksByStatus[status.value]?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                    {tasksByStatus[status.value]?.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <div className="font-medium text-sm mb-2">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.due_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!tasksByStatus[status.value] || tasksByStatus[status.value].length === 0) && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Нет задач
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Новая задача</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Send proposal document"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Статус</label>
                  <select
                    value={formData.status || 'Todo'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Приоритет</label>
                  <select
                    value={formData.priority || 'Medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Срок выполнения</label>
                  <input
                    type="date"
                    value={formData.due_date ? new Date(formData.due_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({})
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
