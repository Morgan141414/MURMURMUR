import api from './client'
import { cleanParams } from './utils'
import type { SessionMetrics, UserMetrics } from '../types'

export function getSessionMetrics(orgId: string, sessionId: string) {
  return api.get<SessionMetrics>(`/orgs/${orgId}/metrics/sessions/${sessionId}`)
}

export function getUserMetrics(
  orgId: string,
  userId: string,
  params?: { start_date?: string; end_date?: string; project_id?: string },
) {
  return api.get<UserMetrics>(`/orgs/${orgId}/metrics/users/${userId}`, {
    params: params ? cleanParams(params) : undefined,
  })
}
