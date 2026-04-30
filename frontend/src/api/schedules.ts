import api from './client'
import type { ReportSchedule } from '../types'

export function listSchedules(orgId: string) {
  return api.get<ReportSchedule[]>(`/orgs/${orgId}/reports/schedules`)
}

export function createSchedule(orgId: string, data: Record<string, unknown>) {
  return api.post<ReportSchedule>(`/orgs/${orgId}/reports/schedules`, data)
}

export function runSchedule(orgId: string, scheduleId: string, exportFormat: string) {
  return api.post(`/orgs/${orgId}/reports/schedules/${scheduleId}/run`, {
    export_format: exportFormat,
  })
}
