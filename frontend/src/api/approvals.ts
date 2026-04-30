import api from './client'

export interface Approval {
  id: string
  org_id: string
  action_type: string
  target_user_id?: string | null
  payload: Record<string, unknown>
  requester_id: string
  approver_role: string
  approver_id?: string | null
  status: 'pending' | 'approved' | 'rejected'
  comment?: string | null
  created_at: string
  resolved_at?: string | null
  target_user_name?: string | null
  target_user_email?: string | null
  requester_name?: string | null
  requester_email?: string | null
}

export function listApprovals(orgId: string) {
  return api.get<Approval[]>(`/orgs/${orgId}/approvals`)
}

export function createApproval(orgId: string, data: { action_type: string; target_user_id?: string; payload?: Record<string, unknown> }) {
  return api.post<Approval>(`/orgs/${orgId}/approvals`, data)
}

export function approveApproval(orgId: string, approvalId: string, comment?: string) {
  return api.post<Approval>(`/orgs/${orgId}/approvals/${approvalId}/approve`, { comment })
}

export function rejectApproval(orgId: string, approvalId: string, comment: string) {
  return api.post<Approval>(`/orgs/${orgId}/approvals/${approvalId}/reject`, { comment })
}
