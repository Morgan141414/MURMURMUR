import { useQuery } from '@tanstack/react-query'
import type { KpiReport, AiScorecard } from '@/types'
import { getAiKpi, getAiScorecards } from '@/api/ai'
import { queryKeys } from '@/lib/queryKeys'

type AiScorecardParams = {
  period: string
  as_of?: string
  user_id?: string
  mode?: string
  role_profile?: string
  trend_limit?: number
}

export function useAiKpi(orgId: string | null, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.ai.kpi(orgId!, params),
    queryFn: () => getAiKpi(orgId!, params).then((r) => r.data as KpiReport),
    enabled: !!orgId,
  })
}

export function useAiScorecards(
  orgId: string | null,
  params?: AiScorecardParams,
) {
  return useQuery({
    queryKey: queryKeys.ai.scorecards(orgId!, params),
    queryFn: () => getAiScorecards(orgId!, params!).then((r) => r.data as AiScorecard[]),
    enabled: !!orgId && !!params,
  })
}
