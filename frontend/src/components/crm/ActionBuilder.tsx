/**
 * Конструктор действий для автоматизации
 */

import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { listUsers } from '@/api/users'
import type { AutomationAction, AutomationActionType } from '../../types/crm'
import type { User } from '@/types'

interface Props {
  action: AutomationAction
  onChange: (action: AutomationAction) => void
  onRemove: () => void
}

const ACTION_TYPES: Array<{ value: AutomationActionType; label: string }> = [
  { value: 'assign_user', label: 'Назначить ответственного' },
  { value: 'update_field', label: 'Обновить поле' },
  { value: 'send_notification', label: 'Отправить уведомление' },
  { value: 'create_task', label: 'Создать задачу' },
]

const UPDATABLE_FIELDS = [
  { value: 'probability', label: 'Вероятность', type: 'number' },
  { value: 'status', label: 'Статус', type: 'string' },
  { value: 'notes', label: 'Заметки', type: 'text' },
]

const TASK_PRIORITIES = ['Low', 'Medium', 'High']

export default function ActionBuilder({ action, onChange, onRemove }: Props) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (activeOrgId) {
      listUsers(activeOrgId).then((response: any) => {
        setUsers(response.data || [])
      })
    }
  }, [activeOrgId])

  const handleTypeChange = (type: AutomationActionType) => {
    // Reset config when changing type
    let defaultConfig: Record<string, any> = {}

    switch (type) {
      case 'assign_user':
        defaultConfig = { user_id: '' }
        break
      case 'update_field':
        defaultConfig = { field: 'probability', value: 50 }
        break
      case 'send_notification':
        defaultConfig = { message: '' }
        break
      case 'create_task':
        defaultConfig = { title: '', priority: 'Medium' }
        break
    }

    onChange({ type, config: defaultConfig })
  }

  const updateConfig = (key: string, value: any) => {
    onChange({
      ...action,
      config: { ...action.config, [key]: value },
    })
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex-1 space-y-3">
        {/* Action Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Тип действия
          </label>
          <select
            value={action.type}
            onChange={(e) =>
              handleTypeChange(e.target.value as AutomationActionType)
            }
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background"
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action-specific config */}
        {action.type === 'assign_user' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Пользователь
            </label>
            <select
              value={action.config.user_id || ''}
              onChange={(e) => updateConfig('user_id', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background"
            >
              <option value="">Выберите пользователя</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {action.type === 'update_field' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Поле
              </label>
              <select
                value={action.config.field || 'probability'}
                onChange={(e) => {
                  const field = UPDATABLE_FIELDS.find(
                    (f) => f.value === e.target.value
                  )
                  updateConfig('field', e.target.value)
                  if (field?.type === 'number') {
                    updateConfig('value', 0)
                  } else {
                    updateConfig('value', '')
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background"
              >
                {UPDATABLE_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Значение
              </label>
              {action.config.field === 'probability' ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={action.config.value || 0}
                  onChange={(e) =>
                    updateConfig('value', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={action.config.value || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>
        )}

        {action.type === 'send_notification' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Сообщение
            </label>
            <textarea
              value={action.config.message || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Текст уведомления"
            />
          </div>
        )}

        {action.type === 'create_task' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Название задачи
              </label>
              <input
                type="text"
                value={action.config.title || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Например: Связаться с клиентом"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Приоритет
              </label>
              <select
                value={action.config.priority || 'Medium'}
                onChange={(e) => updateConfig('priority', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background"
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Удалить действие"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  )
}
