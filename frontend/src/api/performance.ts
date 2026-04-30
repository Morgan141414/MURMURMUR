import api from './client'
import { cleanParams } from './utils'

export function getActivityPerTask(
  orgId: string,
  params?: {
    user_id?: string
    start_date?: string
    end_date?: string
    team_id?: string
    project_id?: string
  },
) {
  return api.get(`/orgs/${orgId}/performance/activity-per-task`, {
    params: params ? cleanParams(params) : undefined,
  })
}
