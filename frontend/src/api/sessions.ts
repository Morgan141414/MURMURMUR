import api from './client'
import type { Session } from '../types'

export function startSession(orgId: string, deviceName: string, osName: string) {
  return api.post<Session>(`/orgs/${orgId}/sessions/start`, {
    device_name: deviceName,
    os_name: osName,
  })
}

export function stopSession(orgId: string, sessionId: string) {
  return api.post(`/orgs/${orgId}/sessions/${sessionId}/stop`, {})
}

export function listMySessions(orgId: string) {
  return api.get<Session[]>(`/orgs/${orgId}/sessions/me`)
}

export function listOrgSessions(orgId: string) {
  return api.get<Session[]>(`/orgs/${orgId}/sessions`)
}
