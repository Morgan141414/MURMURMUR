import api from './client'
import type { CompanyAccount, CompanyParticipant, Org, OrgInvitation, OrgRegistrationSubmission, OrgWithRole, JoinRequest, OrgModerationSummary, OrgProfileUpdateRequest, OwnershipPolicy, OwnershipTransaction, RegistrationProfile } from '../types'

export function listMyOrgs() {
  return api.get<OrgWithRole[]>('/orgs')
}

export function createOrg(payload: string | {
  name: string
  registration_kind?: string
  organization_form?: string
  description?: string
  industry?: string
  industry_group?: string
  niche_code?: string
  legal_name_kz?: string
  legal_name_ru?: string
  bin?: string
  legal_address?: string
  company_phone?: string
  company_email?: string
  oked?: string
  company_accounts_json?: CompanyAccount[]
  company_size?: string
  plan_id?: string
  moderator_message?: string
  files?: Array<{ file: File; document_type: string }>
}) {
  const formData = new FormData()
  if (typeof payload === 'string') {
    formData.append('name', payload)
  } else {
    formData.append('name', payload.name)
    if (payload.registration_kind) formData.append('registration_kind', payload.registration_kind)
    if (payload.organization_form) formData.append('organization_form', payload.organization_form)
    if (payload.description) formData.append('description', payload.description)
    if (payload.industry) formData.append('industry', payload.industry)
    if (payload.industry_group) formData.append('industry_group', payload.industry_group)
    if (payload.niche_code) formData.append('niche_code', payload.niche_code)
    if (payload.legal_name_kz) formData.append('legal_name_kz', payload.legal_name_kz)
    if (payload.legal_name_ru) formData.append('legal_name_ru', payload.legal_name_ru)
    if (payload.bin) formData.append('bin', payload.bin)
    if (payload.legal_address) formData.append('legal_address', payload.legal_address)
    if (payload.company_phone) formData.append('company_phone', payload.company_phone)
    if (payload.company_email) formData.append('company_email', payload.company_email)
    if (payload.oked) formData.append('oked', payload.oked)
    if (payload.company_accounts_json) formData.append('company_accounts_json', JSON.stringify(payload.company_accounts_json))
    if (payload.company_size) formData.append('company_size', payload.company_size)
    if (payload.plan_id) formData.append('plan_id', payload.plan_id)
    if (payload.moderator_message) formData.append('moderator_message', payload.moderator_message)
    for (const item of payload.files ?? []) {
      formData.append('files', item.file)
      formData.append('document_types', item.document_type)
    }
  }
  return api.post<Org>('/orgs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function getOrg(orgId: string) {
  return api.get<Org>(`/orgs/${orgId}`)
}

export function getOrgProfileUpdateRequest(orgId: string) {
  return api.get<OrgProfileUpdateRequest | null>(`/orgs/${orgId}/moderation/profile-update`)
}

export function getOrgOwnershipUpdateRequest(orgId: string) {
  return api.get<OrgProfileUpdateRequest | null>(`/orgs/${orgId}/moderation/ownership-update`)
}

export function getOrgModerationSummary(orgId: string) {
  return api.get<OrgModerationSummary>(`/orgs/${orgId}/moderation/summary`)
}

export function submitOrgProfileUpdateRequest(
  orgId: string,
  body: {
    name?: string
    description?: string
    industry?: string
    website?: string
    logo_url?: string
    theme_color?: string
    welcome_message?: string
    attachments?: Array<{
      id?: string
      file_name: string
      content_type: string
      size: number
      data_url: string
      document_type: string
      document_label?: string
    }>
  },
) {
  return api.post(`/orgs/${orgId}/moderation/profile-update`, body)
}

export function listOrgParticipants(orgId: string) {
  return api.get<CompanyParticipant[]>(`/orgs/${orgId}/participants`)
}

export function submitOrgOwnershipUpdateRequest(
  orgId: string,
  body: {
    participants: Array<Record<string, unknown>>
    primary_role?: 'ceo' | 'founder'
    ceo_user_id?: string
    founder_user_id?: string
    comment?: string
    attachments?: Array<{
      id?: string
      file_name: string
      content_type: string
      size: number
      data_url: string
      document_type: string
      document_label?: string
    }>
  },
) {
  return api.post<OrgProfileUpdateRequest>(`/orgs/${orgId}/moderation/ownership-update`, body)
}



export function getOwnershipPolicy(orgId: string) {
  return api.get<OwnershipPolicy>('/orgs/' + orgId + '/ownership/policy')
}

export function updateOwnershipPolicy(
  orgId: string,
  body: {
    min_approvals: number
    platform_review_share_threshold: number
    allow_external_buyers: boolean
    require_documents: boolean
    rofr_enabled: boolean
    currency_default: string
  },
) {
  return api.patch<OwnershipPolicy>('/orgs/' + orgId + '/ownership/policy', body)
}

export function listOwnershipTransactions(orgId: string) {
  return api.get<OwnershipTransaction[]>(`/orgs/${orgId}/ownership/transactions`)
}

export function createOwnershipTransaction(
  orgId: string,
  body: {
    transaction_type: 'buy' | 'sell' | 'transfer'
    seller_participant_id?: string
    buyer_participant_id?: string
    buyer_user_id?: string
    buyer_email?: string
    share_percent: number
    price_amount?: number
    currency?: string
    note?: string
    documents?: Array<{
      id?: string
      file_name: string
      content_type: string
      size: number
      data_url: string
      document_type: string
      document_label?: string
    }>
  },
) {
  return api.post<OwnershipTransaction>(`/orgs/${orgId}/ownership/transactions`, body)
}

export function approveOwnershipTransaction(orgId: string, transactionId: string, comment?: string) {
  return api.post<OwnershipTransaction>(`/orgs/${orgId}/ownership/transactions/${transactionId}/approve`, comment ? { comment } : {})
}

export function rejectOwnershipTransaction(orgId: string, transactionId: string, comment?: string) {
  return api.post<OwnershipTransaction>(`/orgs/${orgId}/ownership/transactions/${transactionId}/reject`, comment ? { comment } : {})
}

export function executeOwnershipTransaction(orgId: string, transactionId: string, comment?: string) {
  return api.post<OwnershipTransaction>(`/orgs/${orgId}/ownership/transactions/${transactionId}/execute`, comment ? { comment } : {})
}

export function platformReviewOwnershipTransaction(
  orgId: string,
  transactionId: string,
  decision: 'approved' | 'rejected',
  comment?: string,
) {
  return api.post<OwnershipTransaction>(`/orgs/${orgId}/ownership/transactions/${transactionId}/platform-review`, {
    decision,
    comment,
  })
}

export function getOrgRegistrationSubmission(orgId: string) {
  return api.get<OrgRegistrationSubmission>(`/orgs/${orgId}/moderation/submission`)
}

export function getRegistrationProfiles() {
  return api.get<RegistrationProfile[]>('/orgs/registration-profiles')
}

export function updateOrgRegistrationSubmission(
  orgId: string,
  body: {
    name?: string
    description?: string
    industry?: string
    industry_group?: string
    niche_code?: string
    legal_name_kz?: string
    legal_name_ru?: string
    organization_form?: string
    bin?: string
    legal_address?: string
    company_phone?: string
    company_email?: string
    oked?: string
    company_accounts_json?: CompanyAccount[]
    moderator_message?: string
    attachments?: Array<{
      id?: string
      file_name: string
      content_type: string
      size: number
      data_url: string
      document_type: string
      document_label?: string
    }>
  },
) {
  return api.patch<OrgRegistrationSubmission>(`/orgs/${orgId}/moderation/submission`, body)
}

export function joinOrg(orgCode: string, comment?: string) {
  return api.post('/orgs/join-request', { org_code: orgCode, comment })
}

export function listOrgInvitations(orgId: string) {
  return api.get<OrgInvitation[]>(`/orgs/${orgId}/invitations`)
}

export function createOrgInvitation(
  orgId: string,
  body: { email?: string; role: string; expires_in_hours?: number; note?: string },
) {
  return api.post<OrgInvitation>(`/orgs/${orgId}/invitations`, body)
}

export function getInvitation(token: string) {
  return api.get<OrgInvitation>(`/orgs/invitations/${token}`)
}

export function acceptInvitation(token: string) {
  return api.post<OrgWithRole>(`/orgs/invitations/${token}/accept`)
}

export function listJoinRequests(orgId: string) {
  return api.get<JoinRequest[]>(`/orgs/${orgId}/join-requests`)
}

export function approveJoinRequest(orgId: string, requestId: string) {
  return api.post(`/orgs/${orgId}/join-requests/${requestId}/approve`)
}

export function rejectJoinRequest(orgId: string, requestId: string, reason?: string) {
  return api.post(`/orgs/${orgId}/join-requests/${requestId}/reject`, reason ? { reason } : undefined)
}
