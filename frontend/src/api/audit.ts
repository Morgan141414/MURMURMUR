import api from './client'
import type { AuditLog } from '../types'

export interface AuditQueryParams {
  event?: string
  action_type?: string
  role?: string
  entity_type?: string
  entity_id?: string
  result_status?: string
  source?: string
  actor?: string
  date_from?: string
  date_to?: string
  search?: string
  scope?: 'my' | 'all'
  limit?: number
  offset?: number
}

export function listAudit(orgId: string, params?: AuditQueryParams) {
  return api.get<AuditLog[]>(`/orgs/${orgId}/audit`, { params })
}

export function exportAudit(orgId: string, params?: AuditQueryParams) {
  return api.get<string>(`/orgs/${orgId}/audit`, { params: { ...params, export: 'csv' } })
}

export function getAuditEvent(orgId: string, eventId: string) {
  return api.get<AuditLog>(`/orgs/${orgId}/audit/${eventId}`)
}

export function listEntityAudit(orgId: string, entityType: string, entityId: string, limit = 200, offset = 0) {
  return api.get<AuditLog[]>(`/orgs/${orgId}/audit/entity/${entityType}/${entityId}`, {
    params: { limit, offset },
  })
}
