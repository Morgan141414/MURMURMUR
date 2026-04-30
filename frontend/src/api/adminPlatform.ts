import api from './client'
import type { Org, Certificate } from '@/types'

export function listOrgs() {
  return api.get<Org[]>('/admin/orgs')
}

export function suspendOrg(orgId: string) {
  return api.post(`/admin/orgs/${orgId}/suspend`)
}

export function activateOrg(orgId: string) {
  return api.post(`/admin/orgs/${orgId}/activate`)
}

export function issueCertificate(orgId: string) {
  return api.post<Certificate>(`/admin/orgs/${orgId}/certificate`)
}

export function renewCertificate(orgId: string) {
  return api.post<Certificate>(`/admin/orgs/${orgId}/certificate/renew`)
}

export function revokeCertificate(orgId: string, reason: string) {
  return api.post(`/admin/orgs/${orgId}/certificate/revoke`, { reason })
}

export function listCertificates() {
  return api.get<Certificate[]>('/admin/certificates')
}
