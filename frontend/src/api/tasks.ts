import api from './client'
import type { Task } from '../types'

export function listTodayTasks(orgId: string, projectId?: string) {
  const params: Record<string, string> = {}
  if (projectId != null) params.project_id = projectId
  return api.get<Task[]>(`/orgs/${orgId}/tasks/today`, { params })
}

export function createTask(
  orgId: string,
  data: {
    title: string
    description?: string
    due_date?: string
    assignee_id?: string
    team_id?: string
  },
) {
  const body: Record<string, string> = { title: data.title }
  if (data.description != null) body.description = data.description
  if (data.due_date != null) body.due_date = data.due_date
  if (data.assignee_id != null) body.assignee_id = data.assignee_id
  if (data.team_id != null) body.team_id = data.team_id
  return api.post<Task>(`/orgs/${orgId}/tasks`, body)
}

export function updateTask(
  orgId: string,
  taskId: string,
  data: { status?: string; report?: string },
) {
  const body: Record<string, string> = {}
  if (data.status != null) body.status = data.status
  if (data.report != null) body.report = data.report
  return api.patch<Task>(`/orgs/${orgId}/tasks/${taskId}`, body)
}
