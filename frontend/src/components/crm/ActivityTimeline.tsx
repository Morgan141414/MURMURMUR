/**
 * Компонент Activity Timeline для отображения истории активностей сделки
 */

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, FileText, Phone, History, Clock, User, AlertCircle } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { getDealTimeline, createTaskForDeal, createNoteForDeal } from '../../api/crm'
import type { ActivityTimelineItem, TaskCreate, NoteCreate } from '../../types/crm'

interface ActivityTimelineProps {
  dealId: string
  showTaskForm?: boolean
  showNoteForm?: boolean
  onTaskFormClose?: () => void
  onNoteFormClose?: () => void
  onActivityAdded?: () => void
}

export default function ActivityTimeline({
  dealId,
  showTaskForm = false,
  showNoteForm = false,
  onTaskFormClose,
  onNoteFormClose,
  onActivityAdded,
}: ActivityTimelineProps) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)

  const [activities, setActivities] = useState<ActivityTimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  // Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState('Medium')

  // Note form state
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const loadTimeline = useCallback(async () => {
    if (!activeOrgId || !dealId) return

    try {
      setLoading(true)
      const params = filter !== 'all' ? { activity_types: filter } : {}
      const response = await getDealTimeline(activeOrgId, dealId, params)
      setActivities(response.data.activities)
    } catch (err) {
      console.error('Failed to load timeline:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, dealId, filter])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline])

  const handleCreateTask = async () => {
    if (!activeOrgId || !taskTitle.trim()) return

    try {
      const body: TaskCreate = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
        status: 'Todo',
      }

      await createTaskForDeal(activeOrgId, dealId, body)

      // Reset form
      setTaskTitle('')
      setTaskDescription('')
      setTaskPriority('Medium')

      // Reload timeline
      await loadTimeline()
      onActivityAdded?.()
      onTaskFormClose?.()
    } catch (err) {
      console.error('Failed to create task:', err)
      alert('Не удалось создать задачу')
    }
  }

  const handleCreateNote = async () => {
    if (!activeOrgId || !noteTitle.trim() || !noteContent.trim()) return

    try {
      const body: NoteCreate = {
        title: noteTitle.trim(),
        content: noteContent.trim(),
      }

      await createNoteForDeal(activeOrgId, dealId, body)

      // Reset form
      setNoteTitle('')
      setNoteContent('')

      // Reload timeline
      await loadTimeline()
      onActivityAdded?.()
      onNoteFormClose?.()
    } catch (err) {
      console.error('Failed to create note:', err)
      alert('Не удалось создать заметку')
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />
      case 'note':
        return <FileText className="w-5 h-5 text-green-500" />
      case 'call':
        return <Phone className="w-5 h-5 text-purple-500" />
      case 'history':
        return <History className="w-5 h-5 text-gray-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'border-blue-500'
      case 'note':
        return 'border-green-500'
      case 'call':
        return 'border-purple-500'
      case 'history':
        return 'border-gray-500'
      default:
        return 'border-gray-400'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return `Сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    } else if (days === 1) {
      return `Вчера в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    } else if (days < 7) {
      return `${days} дн. назад`
    } else {
      return date.toLocaleDateString('ru-RU')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Загрузка активностей...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('task')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'task'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Задачи
        </button>
        <button
          onClick={() => setFilter('note')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'note'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Заметки
        </button>
        <button
          onClick={() => setFilter('call')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'call'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Звонки
        </button>
        <button
          onClick={() => setFilter('history')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'history'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          История
        </button>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="font-semibold text-foreground mb-3">Создать задачу</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Название задачи"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <textarea
              placeholder="Описание (опционально)"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg"
            >
              <option value="Low">Низкий приоритет</option>
              <option value="Medium">Средний приоритет</option>
              <option value="High">Высокий приоритет</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTask}
                disabled={!taskTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Создать
              </button>
              <button
                onClick={onTaskFormClose}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Form Modal */}
      {showNoteForm && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <h3 className="font-semibold text-foreground mb-3">Создать заметку</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Заголовок"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <textarea
              placeholder="Содержание заметки"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateNote}
                disabled={!noteTitle.trim() || !noteContent.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Создать
              </button>
              <button
                onClick={onNoteFormClose}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Нет активностей
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex gap-3 p-4 bg-card border-l-4 ${getActivityColor(
                activity.activity_type
              )} rounded-lg shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-foreground">{activity.title}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 ml-4">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
                {activity.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                )}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activity.metadata.status && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                        {activity.metadata.status}
                      </span>
                    )}
                    {activity.metadata.priority && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          activity.metadata.priority === 'High'
                            ? 'bg-red-100 text-red-800'
                            : activity.metadata.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {activity.metadata.priority}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
