import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { KpiReport, ReportExport } from '@/types'
import {
  getOrgKpi,
  getProjectKpi,
  exportOrgKpi,
  exportProjectKpi,
  listReportExports,
} from '@/api/reports'
import { queryKeys } from '@/lib/queryKeys'

type OrgKpiParams = {
  start_date?: string
  end_date?: string
  team_id?: string
  project_id?: string
}

type ProjectKpiParams = {
  start_date?: string
  end_date?: string
}

type OrgExportParams = {
  export_format: string
  start_date?: string
  end_date?: string
  team_id?: string
  project_id?: string
}

type ProjectExportParams = {
  export_format: string
  start_date?: string
  end_date?: string
}

export function useOrgKpi(orgId: string | null, params?: OrgKpiParams) {
  return useQuery({
    queryKey: queryKeys.reports.orgKpi(orgId!, params),
    queryFn: () => getOrgKpi(orgId!, params).then((r) => r.data as KpiReport),
    enabled: !!orgId,
  })
}

export function useProjectKpi(orgId: string | null, params?: ProjectKpiParams) {
  return useQuery({
    queryKey: queryKeys.reports.projectKpi(orgId!, params),
    queryFn: () => getProjectKpi(orgId!, params).then((r) => r.data as KpiReport),
    enabled: !!orgId,
  })
}

export function useReportExports(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.reports.exports(orgId!),
    queryFn: () => listReportExports(orgId!).then((r) => r.data as ReportExport[]),
    enabled: !!orgId,
  })
}

export function useExportOrgKpi(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: OrgExportParams) =>
      exportOrgKpi(orgId, params).then((r) => r.data as ReportExport),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.exports(orgId) })
    },
  })
}

export function useExportProjectKpi(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: ProjectExportParams) =>
      exportProjectKpi(orgId, params).then((r) => r.data as ReportExport),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.exports(orgId) })
    },
  })
}
