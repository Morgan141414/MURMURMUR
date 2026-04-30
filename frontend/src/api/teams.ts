import api from './client'
import type { Team } from '../types'

export function listTeams(orgId: string) {
  return api.get<Team[]>(`/orgs/${orgId}/teams`)
}

export function reorderTeams(orgId: string, teamIds: string[]) {
  return api.put<Team[]>(`/orgs/${orgId}/teams/reorder`, { team_ids: teamIds })
}

export function listMyTeams(orgId: string, projectId?: string) {
  const params: Record<string, string> = {}
  if (projectId != null) params.project_id = projectId
  return api.get<Team[]>(`/orgs/${orgId}/teams/me`, { params })
}

export function createTeam(orgId: string, name: string, projectId?: string) {
  const body: Record<string, string> = { name }
  if (projectId != null) body.project_id = projectId
  return api.post<Team>(`/orgs/${orgId}/teams`, body)
}

export function updateTeam(
  orgId: string,
  teamId: string,
  payload: { 
    name?: string; 
    projectId?: string; 
    logo_url?: string | null;
    timezone?: string;
    working_hours_start?: string;
    working_hours_end?: string;
    working_days?: string;
  },
) {
  const body: Record<string, string> = {}
  if (payload.name != null) body.name = payload.name
  if (payload.projectId != null) body.project_id = payload.projectId
  if (payload.logo_url !== undefined) body.logo_url = payload.logo_url ?? ''
  if (payload.timezone !== undefined) body.timezone = payload.timezone
  if (payload.working_hours_start !== undefined) body.working_hours_start = payload.working_hours_start
  if (payload.working_hours_end !== undefined) body.working_hours_end = payload.working_hours_end
  if (payload.working_days !== undefined) body.working_days = payload.working_days
  return api.patch<Team>(`/orgs/${orgId}/teams/${teamId}`, body)
}

export function deleteTeam(orgId: string, teamId: string) {
  return api.delete(`/orgs/${orgId}/teams/${teamId}`)
}

export function addTeamMember(orgId: string, teamId: string, userId: string) {
  return api.post(`/orgs/${orgId}/teams/${teamId}/members`, { user_id: userId })
}

export function removeTeamMember(orgId: string, teamId: string, userId: string) {
  return api.delete(`/orgs/${orgId}/teams/${teamId}/members/${userId}`)
}

export function assignTeamLead(orgId: string, teamId: string, userId: string) {
  return api.post<Team>(`/orgs/${orgId}/teams/${teamId}/lead`, { user_id: userId })
}


export function uploadTeamLogo(orgId: string, teamId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ logo_url: string }>(`/orgs/${orgId}/teams/${teamId}/logo`, formData)
}
