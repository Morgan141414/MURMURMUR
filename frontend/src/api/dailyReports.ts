import api from './client'

export function createDailyReport(
  orgId: string,
  data: { project_id: string; content: string; report_date?: string },
) {
  const body: Record<string, string> = {
    project_id: data.project_id,
    content: data.content,
  }
  if (data.report_date != null) body.report_date = data.report_date
  return api.post(`/orgs/${orgId}/daily-reports`, body)
}
