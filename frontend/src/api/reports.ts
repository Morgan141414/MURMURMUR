import api from './client'
import { cleanParams } from './utils'
import type { KpiReport, ReportExport } from '../types'

export function getOrgKpi(
  orgId: string,
  params?: { start_date?: string; end_date?: string; team_id?: string; project_id?: string },
) {
  return api.get<KpiReport>(`/orgs/${orgId}/reports/kpi`, {
    params: params ? cleanParams(params) : undefined,
  })
}

export function getProjectKpi(
  orgId: string,
  params?: { start_date?: string; end_date?: string },
) {
  return api.get<KpiReport>(`/orgs/${orgId}/reports/projects/kpi`, {
    params: params ? cleanParams(params) : undefined,
  })
}

export function exportOrgKpi(
  orgId: string,
  params: {
    export_format: string
    start_date?: string
    end_date?: string
    team_id?: string
    project_id?: string
  },
) {
  const { export_format, ...body } = params
  return api.post<ReportExport>(`/orgs/${orgId}/reports/exports/org-kpi`, cleanParams(body), {
    params: { export_format },
  })
}

export function exportProjectKpi(
  orgId: string,
  params: { export_format: string; start_date?: string; end_date?: string },
) {
  const { export_format, ...body } = params
  return api.post<ReportExport>(
    `/orgs/${orgId}/reports/exports/project-kpi`,
    cleanParams(body),
    { params: { export_format } },
  )
}

export function listReportExports(orgId: string) {
  return api.get<ReportExport[]>(`/orgs/${orgId}/reports/exports`)
}

export function downloadReportExport(orgId: string, exportId: string) {
  return api.get<Blob>(`/orgs/${orgId}/reports/exports/${exportId}/download`, {
    responseType: 'blob',
  })
}
