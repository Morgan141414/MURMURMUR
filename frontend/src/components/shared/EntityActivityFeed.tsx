import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ScrollText, User, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import { listEntityAudit } from '@/api/audit'
import type { AuditLog } from '@/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDueDate } from '@/lib/dueDate'

function toText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback
  return String(value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonSafe(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function formatTaskStatus(value: unknown): string {
  const v = String(value ?? '')
  const map: Record<string, string> = {
    planned: 'Запланировано',
    todo: 'К выполнению',
    in_progress: 'В работе',
    pending_review: 'На подтверждении',
    done: 'Готово',
    completed: 'Готово',
    archived: 'В архиве',
  }
  return map[v] || v || '—'
}

function formatPriority(value: unknown): string {
  const v = String(value ?? '')
  const map: Record<string, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    critical: 'Критический',
  }
  return map[v] || v || '—'
}

function formatFieldLabel(key: string): string {
  const map: Record<string, string> = {
    title: 'Название',
    description: 'Описание',
    status: 'Статус',
    priority: 'Приоритет',
    due_date: 'Срок',
    assignee_id: 'Исполнитель',
    assignee_ids: 'Исполнители',
    column_id: 'Колонка',
    team_id: 'Команда',
    story_points: 'Story points',
    report: 'Отчет',
    is_personal: 'Личная задача',
    checklist_item_id: 'Пункт чеклиста',
    attachment_id: 'Вложение',
    filename: 'Файл',
    size_bytes: 'Размер',
    content_type: 'Тип файла',
    text: 'Текст',
    is_done: 'Выполнено',
    position: 'Позиция',
    checklist_total: 'Чеклист',
  }
  return map[key] || key
}

function formatFieldValue(key: string, value: unknown): string {
  if (value == null || value === '') return '—'
  if (key === 'due_date') {
    try {
      return typeof value === 'string' ? formatDueDate(value) : String(value)
    } catch {
      return String(value)
    }
  }
  if (key === 'status') return formatTaskStatus(value)
  if (key === 'priority') return formatPriority(value)
  if (key === 'assignee_ids' && Array.isArray(value)) {
    // We usually only have IDs here. Show a compact count instead of dumping UUIDs.
    return value.length ? `${value.length} чел.` : 'Не назначены'
  }
  if (typeof value === 'string') {
    // Hide noisy UUID-like values unless it is short already.
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    if (looksLikeUuid) return value.slice(0, 8)
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length ? `${value.length}` : '—'
  if (isPlainObject(value)) return 'изменено'
  return String(value)
}

const IGNORE_DIFF_KEYS = new Set([
  'id',
  'org_id',
  'project_id',
  'task_id',
  'created_at',
  'updated_at',
  'created_by',
  'created_by_id',
])

function buildObjectDiff(oldValue: unknown, newValue: unknown) {
  if (!isPlainObject(oldValue) || !isPlainObject(newValue)) return []

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  const changes: Array<{ key: string; from: unknown; to: unknown }> = []

  for (const key of keys) {
    if (IGNORE_DIFF_KEYS.has(key)) continue
    const from = oldValue[key]
    const to = newValue[key]
    // Shallow compare; nested objects/arrays are treated as "changed" but we won't render raw.
    let same = false
    try {
      same = JSON.stringify(from) === JSON.stringify(to)
    } catch {
      same = from === to
    }
    if (!same) changes.push({ key, from, to })
  }

  // Prefer human-relevant fields first.
  const priorityOrder = ['status', 'due_date', 'assignee_id', 'assignee_ids', 'priority', 'title', 'description', 'column_id']
  changes.sort((a, b) => {
    const ai = priorityOrder.indexOf(a.key)
    const bi = priorityOrder.indexOf(b.key)
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return changes
}

const ACTION_LABELS: Record<string, string> = {
  task_create: 'Создана задача',
  task_update: 'Обновлена',
  board_task_update: 'Обновлена',
  board_task_create: 'Создана задача',
  board_task_delete: 'Удалена задача',
  board_task_reorder: 'Изменён порядок задач',
  board_task_assign: 'Назначен исполнитель',
  board_task_unassign: 'Убран исполнитель',
  board_task_comment_create: 'Написан комментарий',
  board_task_comment_update: 'Обновлен комментарий',
  board_task_comment_delete: 'Удален комментарий',
  board_task_checklist_create: 'Добавлен пункт чеклиста',
  board_task_checklist_update: 'Обновлен пункт чеклиста',
  board_task_checklist_delete: 'Удален пункт чеклиста',
  board_task_attachment_upload: 'Добавлено вложение',
  board_task_attachment_delete: 'Удалено вложение',
  comment_create: 'Добавлен комментарий',
  comment_update: 'Обновлён комментарий',
  task_comment_create: 'Добавлен комментарий',
  task_comment_update: 'Обновлен комментарий',
  task_comment_delete: 'Удален комментарий',
  task_checklist_create: 'Добавлен пункт чеклиста',
  task_checklist_update: 'Обновлен пункт чеклиста',
  task_checklist_delete: 'Удален пункт чеклиста',
  task_attachment_upload: 'Добавлено вложение',
  task_attachment_delete: 'Удалено вложение',
  task_assign: 'Назначен исполнитель',
  task_complete: 'Задача выполнена',
  project_create: 'Создан проект',
  project_update: 'Обновлён проект',
  user_login: 'Вход в систему',
  user_logout: 'Выход из системы',
}

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
  success: { label: 'Успешно', icon: <CheckCircle className="h-3 w-3" />, class: 'bg-green-500/10 text-green-600 border-green-200' },
  failed: { label: 'Ошибка', icon: <XCircle className="h-3 w-3" />, class: 'bg-red-500/10 text-red-600 border-red-200' },
}

function translateAction(action: string | undefined, oldValue?: unknown, newValue?: unknown): string {
  if (!action) return 'Действие'
  
  const isTaskUpdate = action === 'task_update' || action === 'board_task_update'
  if (isTaskUpdate && oldValue && newValue) {
    const oldStatus = isPlainObject(oldValue) ? (oldValue as Record<string, unknown>).status : undefined
    const newStatus = isPlainObject(newValue) ? (newValue as Record<string, unknown>).status : undefined
    if (newStatus === 'done' && oldStatus !== 'done') return 'Выполнено'
    if (newStatus !== 'done' && oldStatus === 'done') return 'Отмена выполнения'
  }
  
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function translateRole(role: string | null | undefined): string {
  if (!role) return ''
  const roleMap: Record<string, string> = {
    founder: 'Основатель',
    ceo: 'CEO',
    hr: 'HR',
    admin: 'Админ',
    member: 'Участник',
    team_lead: 'Тимлид',
    developer: 'Разработчик',
    designer: 'Дизайнер',
    qa: 'QA',
    manager: 'Менеджер',
  }
  return roleMap[role] || role
}

const HIDDEN_DETAIL_KEYS = new Set([
  'org_id',
  'project_id',
  'task_id',
  'org_name',
  'project_name',
  'action_type',
  'action',
  'object_type',
  'object_id',
  'entity_type',
  'entity_id',
  'event_id',
  'request_id',
  'session_id',
  'source_ip',
  'user_agent',
  'old_value',
  'new_value',
])

interface EntityActivityFeedProps {
  orgId: string | null | undefined
  entityType: string
  entityId: string | null | undefined
  title?: string
  limit?: number
  className?: string
}

export function EntityActivityFeed({
  orgId,
  entityType,
  entityId,
  title = 'Activity',
  limit = 20,
  className,
}: EntityActivityFeedProps) {
  const [items, setItems] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!orgId || !entityId) return
    setLoading(true)
    try {
      const response = await listEntityAudit(orgId, entityType, entityId, limit, 0)
      setItems(response.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [orgId, entityId, entityType, limit])

  useEffect(() => {
    void load()
  }, [load])

  if (!orgId || !entityId) return null

  return (
    <div className={className ?? 'rounded-lg border border-border bg-card p-4'}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Нет событий"
          description="По этой задаче ещё не зафиксированы действия."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const statusInfo = STATUS_LABELS[item.result_status || 'success']
            const oldValue = parseJsonSafe(item.old_value ?? (item.details && isPlainObject(item.details) ? item.details.old_value : undefined))
            const newValue = parseJsonSafe(item.new_value ?? (item.details && isPlainObject(item.details) ? item.details.new_value : undefined))
            const translatedAction = translateAction(item.action_type || item.action, oldValue, newValue)
            const translatedRole = translateRole(item.actor_role)
            const allDiff = buildObjectDiff(oldValue, newValue)
            const diff = allDiff.slice(0, 4)
            const extraChangeCount = Math.max(0, allDiff.length - diff.length)

            const detailEntries =
              item.details && isPlainObject(item.details)
                ? Object.entries(item.details)
                    .filter(([key]) => !HIDDEN_DETAIL_KEYS.has(key))
                    .slice(0, 5)
                : []

            return (
              <div key={item.event_id || item.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {translatedAction}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${statusInfo.class}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.created_at ? new Date(String(item.created_at)).toLocaleString('ru-RU', { 
                      day: 'numeric', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : '—'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="font-medium text-foreground">
                    {toText(item.actor_name || item.actor_email, 'Пользователь')}
                  </span>
                  {translatedRole && (
                    <>
                      <span>·</span>
                      <span>{translatedRole}</span>
                    </>
                  )}
                </div>
                {item.comment && (
                  <p className="mt-1 text-xs text-foreground/80 bg-muted/50 rounded px-2 py-1">
                    {item.comment}
                  </p>
                )}

                {diff.length > 0 && (
                  <div className="mt-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                    {diff.map((c) => (
                      <div key={c.key} className="flex flex-wrap items-center gap-1">
                        <span className="font-medium">{formatFieldLabel(c.key)}:</span>
                        <span className="truncate max-w-[180px]">{formatFieldValue(c.key, c.from)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="truncate max-w-[180px]">{formatFieldValue(c.key, c.to)}</span>
                      </div>
                    ))}
                    {extraChangeCount > 0 ? (
                      <div className="mt-1 text-[11px] text-muted-foreground/80">+ ещё {extraChangeCount} изменений</div>
                    ) : null}
                  </div>
                )}

                {diff.length === 0 && detailEntries.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {detailEntries.map(([key, value]) => (
                      <div key={key} className="flex gap-1">
                        <span className="font-medium">{formatFieldLabel(key)}:</span>
                        <span className="truncate max-w-[220px]">{formatFieldValue(key, value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
