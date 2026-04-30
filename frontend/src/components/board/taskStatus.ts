import type { TFunction } from 'i18next'
import type { BoardTask } from '@/types'

export const TASK_TODO_STATUSES = new Set(['planned', 'todo', 'draft', 'open'])
export const TASK_IN_PROGRESS_STATUSES = new Set(['in_progress', 'inprogress', 'doing'])
export const TASK_DONE_STATUSES = new Set(['done', 'completed'])
export const TASK_REVIEW_STATUS = 'pending_review'
export const TASK_LEADER_ROLES = new Set(['founder', 'ceo', 'team_lead', 'project_manager', 'admin', 'sysadmin', 'superadmin'])

export function normalizeTaskStatus(status?: string | null) {
  return (status ?? '').trim().toLowerCase()
}

export function isTaskDone(status?: string | null) {
  return TASK_DONE_STATUSES.has(normalizeTaskStatus(status))
}

export function isTaskPendingReview(status?: string | null) {
  return normalizeTaskStatus(status) === TASK_REVIEW_STATUS
}

export function isTaskInProgress(status?: string | null) {
  return TASK_IN_PROGRESS_STATUSES.has(normalizeTaskStatus(status))
}

export function isTaskTodo(status?: string | null) {
  return TASK_TODO_STATUSES.has(normalizeTaskStatus(status))
}

export function canConfirmTaskCompletion(role?: string | null, isSuperAdmin = false, task?: Pick<BoardTask, 'approval_user_ids' | 'created_by_id'> | null, currentUserId?: string | null) {
  if (isSuperAdmin) return true
  if (role === 'founder' || role === 'ceo') return true
  return !!currentUserId && !!task?.approval_user_ids?.includes(currentUserId)
}

export function nextCompletionStatus(task: Pick<BoardTask, 'status' | 'approval_user_ids' | 'created_by_id'>, role?: string | null, isSuperAdmin = false, currentUserId?: string | null) {
  if (isTaskDone(task.status)) return 'todo'
  if (isTaskPendingReview(task.status)) {
    return canConfirmTaskCompletion(role, isSuperAdmin, task, currentUserId) ? 'done' : 'in_progress'
  }
  if (isTaskInProgress(task.status)) return TASK_REVIEW_STATUS
  return 'in_progress'
}

export function getTaskActionLabel(t: TFunction, task: Pick<BoardTask, 'status' | 'approval_user_ids' | 'created_by_id'>, role?: string | null, isSuperAdmin = false, currentUserId?: string | null) {
  if (isTaskDone(task.status)) return t('board.returnTaskToTodo', 'Вернуть в работу')
  if (isTaskPendingReview(task.status)) {
    return canConfirmTaskCompletion(role, isSuperAdmin, task, currentUserId)
      ? t('board.approveTaskCompletion', 'Подтвердить выполнение')
      : t('board.returnTaskToInProgress', 'Вернуть в работу')
  }
  if (isTaskInProgress(task.status)) return t('board.finishTask', 'Завершить задачу')
  return t('board.takeTask', 'Взяться за задачу')
}

export function formatTaskDuration(startedAt?: string | null, finishedAt?: string | null, now = Date.now()) {
  if (!startedAt) return '00:00:00'
  const startedMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedMs)) return '00:00:00'
  const endMs = finishedAt ? new Date(finishedAt).getTime() : now
  const safeEndMs = Number.isNaN(endMs) ? now : endMs
  const totalSeconds = Math.max(0, Math.floor((safeEndMs - startedMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function formatTaskStatusLabel(t: TFunction, status?: string | null) {
  switch (normalizeTaskStatus(status)) {
    case 'planned':
      return t('board.statusPlanned', 'Запланировано')
    case 'todo':
    case 'draft':
    case 'open':
      return t('board.statusTodo', 'К выполнению')
    case 'in_progress':
    case 'inprogress':
    case 'doing':
      return t('board.statusInProgress', 'В работе')
    case TASK_REVIEW_STATUS:
      return t('board.statusPendingReview', 'На подтверждении')
    case 'done':
    case 'completed':
      return t('board.statusDone', 'Выполнено')
    case 'archived':
      return t('board.statusArchived', 'В архиве')
    default:
      return status || t('common.notSpecified', 'Не указано')
  }
}
