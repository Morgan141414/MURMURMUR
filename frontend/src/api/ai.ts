import api from './client'
import { cleanParams } from './utils'
import type { KpiReport, AiScorecard } from '../types'

export function getAiKpi(orgId: string, params?: Record<string, unknown>) {
  return api.get<KpiReport>(`/orgs/${orgId}/ai/kpi`, {
    params: params ? cleanParams(params) : undefined,
  })
}

export function getAiScorecards(
  orgId: string,
  params: {
    period: string
    as_of?: string
    user_id?: string
    mode?: string
    role_profile?: string
    trend_limit?: number
  },
) {
  return api.get<AiScorecard[]>(`/orgs/${orgId}/ai/scorecards`, {
    params: cleanParams(params),
  })
}
