import api from './client'
import type { ConsentStatus } from '../types'

export function getConsentStatus(orgId: string) {
  return api.get<ConsentStatus>(`/orgs/${orgId}/consent/me`)
}

export function acceptConsent(orgId: string, policyVersion: string) {
  return api.post(`/orgs/${orgId}/consent/accept`, { policy_version: policyVersion })
}
