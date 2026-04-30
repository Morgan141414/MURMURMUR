import api from './client'
import type { PrivacyRule } from '../types'

export function listPrivacyRules(orgId: string) {
  return api.get<PrivacyRule[]>(`/orgs/${orgId}/privacy/rules`)
}

export function createPrivacyRule(
  orgId: string,
  data: { target: string; match_type: string; pattern: string; action: string },
) {
  return api.post<PrivacyRule>(`/orgs/${orgId}/privacy/rules`, data)
}

export function updatePrivacyRule(
  orgId: string,
  ruleId: string,
  data: Partial<{ target: string; match_type: string; pattern: string; action: string }>,
) {
  return api.patch<PrivacyRule>(`/orgs/${orgId}/privacy/rules/${ruleId}`, data)
}

export function deletePrivacyRule(orgId: string, ruleId: string) {
  return api.delete(`/orgs/${orgId}/privacy/rules/${ruleId}`)
}
