import api from './client'
import type { Project, DepartmentInvite } from '../types'

export function listProjects(orgId: string) {
  return api.get<Project[]>(`/orgs/${orgId}/projects`)
}

export function reorderProjects(orgId: string, projectIds: string[]) {
  return api.put<Project[]>(`/orgs/${orgId}/projects/reorder`, { project_ids: projectIds })
}

export function getProject(orgId: string, projectId: string) {
  return api.get<Project>(`/orgs/${orgId}/projects/${projectId}`)
}

export function createProject(orgId: string, name: string, description?: string) {
  const body: Record<string, string> = { name }
  if (description != null) body.description = description
  return api.post<Project>(`/orgs/${orgId}/projects`, body)
}

export function updateProject(
  orgId: string,
  projectId: string,
  data: { name?: string; description?: string; logo_url?: string | null },
) {
  const body: Record<string, string> = {}
  if (data.name !== undefined) body.name = data.name
  if (data.description !== undefined) body.description = data.description
  if (data.logo_url !== undefined) body.logo_url = data.logo_url ?? ''
  return api.patch<Project>(`/orgs/${orgId}/projects/${projectId}`, body)
}

export function assignDepartmentHead(orgId: string, projectId: string, userId: string) {
  return api.post<Project>(`/orgs/${orgId}/projects/${projectId}/head`, { user_id: userId })
}

export function listDepartmentInvites(orgId: string, projectId: string) {
  return api.get<DepartmentInvite[]>(`/orgs/${orgId}/projects/${projectId}/invites`)
}

export function createDepartmentInvite(
  orgId: string,
  projectId: string,
  data: { invitee_user_id: string; team_id?: string; role?: string; note?: string },
) {
  return api.post<DepartmentInvite>(`/orgs/${orgId}/projects/${projectId}/invites`, data)
}

export function acceptDepartmentInvite(orgId: string, inviteId: string) {
  return api.post<DepartmentInvite>(`/orgs/${orgId}/department-invites/${inviteId}/accept`)
}

export function rejectDepartmentInvite(orgId: string, inviteId: string) {
  return api.post<DepartmentInvite>(`/orgs/${orgId}/department-invites/${inviteId}/reject`)
}


export function uploadProjectLogo(orgId: string, projectId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ logo_url: string }>(`/orgs/${orgId}/projects/${projectId}/logo`, formData)
}

export function approveDepartmentInviteRequest(orgId: string, inviteId: string) {
  return api.post<DepartmentInvite>(`/orgs/${orgId}/department-invites/${inviteId}/approve-request`)
}

export function rejectDepartmentInviteRequest(orgId: string, inviteId: string) {
  return api.post<DepartmentInvite>(`/orgs/${orgId}/department-invites/${inviteId}/reject-request`)
}
