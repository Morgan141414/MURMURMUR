import api from './client'
import type {
  TaskColumn,
  BoardTask,
  TaskChecklistItem,
  TaskComment,
  TaskAttachment,
  ProjectStats,
} from '../types'

// --- Columns ---

export function listColumns(orgId: string, projectId: string) {
  return api.get<TaskColumn[]>(`/orgs/${orgId}/projects/${projectId}/columns`)
}

export function createColumn(orgId: string, projectId: string, data: {
  name: string; name_ru?: string; name_kz?: string; color?: string; position?: number; mapped_status?: string
}) {
  return api.post<TaskColumn>(`/orgs/${orgId}/projects/${projectId}/columns`, data)
}

export function updateColumn(orgId: string, projectId: string, columnId: string, data: {
  name?: string; name_ru?: string; name_kz?: string; color?: string; mapped_status?: string
}) {
  return api.patch<TaskColumn>(`/orgs/${orgId}/projects/${projectId}/columns/${columnId}`, data)
}

export function deleteColumn(orgId: string, projectId: string, columnId: string) {
  return api.delete(`/orgs/${orgId}/projects/${projectId}/columns/${columnId}`)
}

export function reorderColumns(orgId: string, projectId: string, columnIds: string[]) {
  return api.put<TaskColumn[]>(`/orgs/${orgId}/projects/${projectId}/columns/reorder`, { column_ids: columnIds })
}

// --- Project Tasks ---

export function listProjectTasks(orgId: string, projectId: string, mode: 'active' | 'archived' | 'all' = 'active') {
  return api.get<BoardTask[]>(`/orgs/${orgId}/projects/${projectId}/tasks`, {
    params: { mode },
  })
}

export function listMyBoardTasks(orgId: string, mode: 'active' | 'archived' | 'all' = 'active') {
  return api.get<BoardTask[]>(`/orgs/${orgId}/my-board/tasks`, {
    params: { mode },
  })
}

export function getProjectTask(orgId: string, projectId: string, taskId: string) {
  return api.get<BoardTask>(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`)
}

export function createProjectTask(orgId: string, projectId: string, data: {
  title: string; description?: string; due_date?: string; assignee_id?: string; assignee_ids?: string[];
  approval_user_ids?: string[]; team_id?: string; column_id?: string; priority?: string; story_points?: number; is_personal?: boolean
}) {
  return api.post<BoardTask>(`/orgs/${orgId}/projects/${projectId}/tasks`, data)
}

export function updateProjectTask(orgId: string, projectId: string, taskId: string, data: {
  title?: string; description?: string; due_date?: string; assignee_id?: string | null; assignee_ids?: string[];
  approval_user_ids?: string[]; team_id?: string; column_id?: string; priority?: string; story_points?: number;
  status?: string; report?: string; is_personal?: boolean
}) {
  return api.patch<BoardTask>(`/orgs/${orgId}/projects/${projectId}/tasks/${taskId}`, data)
}

export function reorderTasks(orgId: string, projectId: string, data: {
  task_id: string; column_id: string; position: number
}) {
  return api.put<BoardTask[]>(`/orgs/${orgId}/projects/${projectId}/tasks/reorder`, data)
}

export function getProjectStats(orgId: string, projectId: string) {
  return api.get<ProjectStats>(`/orgs/${orgId}/projects/${projectId}/stats`)
}

// --- Comments ---

export function listComments(orgId: string, taskId: string) {
  return api.get<TaskComment[]>(`/orgs/${orgId}/tasks/${taskId}/comments`)
}

export function createComment(orgId: string, taskId: string, text: string) {
  return api.post<TaskComment>(`/orgs/${orgId}/tasks/${taskId}/comments`, { text })
}

export function updateComment(orgId: string, taskId: string, commentId: string, text: string) {
  return api.patch<TaskComment>(`/orgs/${orgId}/tasks/${taskId}/comments/${commentId}`, { text })
}

export function deleteComment(orgId: string, taskId: string, commentId: string) {
  return api.delete(`/orgs/${orgId}/tasks/${taskId}/comments/${commentId}`)
}

// --- Checklist ---

export function listChecklist(orgId: string, taskId: string) {
  return api.get<TaskChecklistItem[]>(`/orgs/${orgId}/tasks/${taskId}/checklist`)
}

export function createChecklistItem(orgId: string, taskId: string, text: string) {
  return api.post<TaskChecklistItem>(`/orgs/${orgId}/tasks/${taskId}/checklist`, { text })
}

export function updateChecklistItem(orgId: string, taskId: string, itemId: string, data: {
  text?: string; is_done?: boolean; position?: number
}) {
  return api.patch<TaskChecklistItem>(`/orgs/${orgId}/tasks/${taskId}/checklist/${itemId}`, data)
}

export function deleteChecklistItem(orgId: string, taskId: string, itemId: string) {
  return api.delete(`/orgs/${orgId}/tasks/${taskId}/checklist/${itemId}`)
}

// --- Attachments ---

export function listAttachments(orgId: string, taskId: string) {
  return api.get<TaskAttachment[]>(`/orgs/${orgId}/tasks/${taskId}/attachments`)
}

export function uploadAttachment(orgId: string, taskId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<TaskAttachment>(`/orgs/${orgId}/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteAttachment(orgId: string, taskId: string, attachmentId: string) {
  return api.delete(`/orgs/${orgId}/tasks/${taskId}/attachments/${attachmentId}`)
}
