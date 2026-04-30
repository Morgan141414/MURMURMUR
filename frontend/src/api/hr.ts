import api from './client'
import type {
  EmployeeChangeRequest,
  HRDocument,
  HRDocumentFolder,
  HRDocumentFolderShareRequest,
  HRDocumentShareRequest,
  HRDocumentVersion,
  LeaveRequest,
  OffboardingProcess,
  OnboardingProcess,
  TerminationOrder,
} from '@/types'

export function listOnboarding(orgId: string) {
  return api.get<OnboardingProcess[]>(`/orgs/${orgId}/hr/onboarding`)
}

export function createOnboarding(orgId: string, body: Record<string, unknown>) {
  return api.post<OnboardingProcess>(`/orgs/${orgId}/hr/onboarding`, body)
}

export function updateOnboarding(orgId: string, processId: string, body: Record<string, unknown>) {
  return api.patch<OnboardingProcess>(`/orgs/${orgId}/hr/onboarding/${processId}`, body)
}

export function listOffboarding(orgId: string) {
  return api.get<OffboardingProcess[]>(`/orgs/${orgId}/hr/offboarding`)
}

export function createOffboarding(orgId: string, body: Record<string, unknown>) {
  return api.post<OffboardingProcess>(`/orgs/${orgId}/hr/offboarding`, body)
}

export function updateOffboarding(orgId: string, processId: string, body: Record<string, unknown>) {
  return api.patch<OffboardingProcess>(`/orgs/${orgId}/hr/offboarding/${processId}`, body)
}

export function listTerminationOrders(orgId: string) {
  return api.get<TerminationOrder[]>(`/orgs/${orgId}/hr/termination-orders`)
}

export function createTerminationOrder(orgId: string, body: Record<string, unknown>) {
  return api.post<TerminationOrder>(`/orgs/${orgId}/hr/termination-orders`, body)
}

export function voteTerminationOrder(orgId: string, orderId: string, body: { decision: 'approved' | 'rejected'; comment?: string }) {
  return api.post<TerminationOrder>(`/orgs/${orgId}/hr/termination-orders/${orderId}/vote`, body)
}

export function executeTerminationOrder(orgId: string, orderId: string) {
  return api.post<TerminationOrder>(`/orgs/${orgId}/hr/termination-orders/${orderId}/execute`)
}

export function listLeaveRequests(orgId: string) {
  return api.get<LeaveRequest[]>(`/orgs/${orgId}/hr/leave-requests`)
}

export function createLeaveRequest(orgId: string, body: Record<string, unknown>) {
  return api.post<LeaveRequest>(`/orgs/${orgId}/hr/leave-requests`, body)
}

export function updateLeaveRequest(orgId: string, requestId: string, body: Record<string, unknown>) {
  return api.patch<LeaveRequest>(`/orgs/${orgId}/hr/leave-requests/${requestId}`, body)
}

export function listHRDocuments(orgId: string) {
  return api.get<HRDocument[]>(`/orgs/${orgId}/hr/documents`)
}


export function getHRDocumentEditorPayload(orgId: string, documentId: string) {
  return api.get<HRDocument>(`/orgs/${orgId}/hr/documents/${documentId}/editor`)
}

export function getHROnlyOfficeConfig(orgId: string, documentId: string) {
  return api.get<{
    api_script_url: string
    config: Record<string, unknown>
  }>(`/orgs/${orgId}/hr/documents/${documentId}/onlyoffice/config`)
}

export function accessHRDocument(orgId: string, documentId: string, action: 'view' | 'download') {
  return api.get<{
    id: string
    name: string
    file_url?: string | null
    content_url?: string | null
    file_name: string
    content_type?: string | null
    document_type: string
  }>(`/orgs/${orgId}/hr/documents/${documentId}/access`, { params: { action } })
}

export function fetchHRDocumentContent(orgId: string, documentId: string, action: 'view' | 'download') {
  return api.get<Blob>(`/orgs/${orgId}/hr/documents/${documentId}/content`, {
    params: { action },
    responseType: 'blob',
  })
}

export function listEmployeeChangeRequests(orgId: string) {
  return api.get<EmployeeChangeRequest[]>(`/orgs/${orgId}/hr/employee-change-requests`)
}

export function createEmployeeChangeRequest(orgId: string, body: Record<string, unknown>) {
  return api.post<EmployeeChangeRequest>(`/orgs/${orgId}/hr/employee-change-requests`, body)
}

export function updateEmployeeChangeRequest(orgId: string, requestId: string, body: Record<string, unknown>) {
  return api.patch<EmployeeChangeRequest>(`/orgs/${orgId}/hr/employee-change-requests/${requestId}`, body)
}

export function createHRDocument(orgId: string, body: Record<string, unknown>) {
  return api.post<HRDocument>(`/orgs/${orgId}/hr/documents`, body)
}

export function uploadHRDocumentFile(
  orgId: string,
  payload: {
    file: File
    name?: string
    folderId?: string | null
    documentType?: string
    status?: string
    employeeId?: string | null
  },
) {
  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.name) formData.append('name', payload.name)
  if (payload.folderId) formData.append('folder_id', payload.folderId)
  if (payload.documentType) formData.append('document_type', payload.documentType)
  if (payload.status) formData.append('status_value', payload.status)
  if (payload.employeeId) formData.append('employee_id', payload.employeeId)

  return api.post<HRDocument>(`/orgs/${orgId}/hr/documents/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function updateHRDocument(orgId: string, documentId: string, body: Record<string, unknown>) {
  return api.patch<HRDocument>(`/orgs/${orgId}/hr/documents/${documentId}`, body)
}

export function deleteHRDocument(orgId: string, documentId: string) {
  return api.delete(`/orgs/${orgId}/hr/documents/${documentId}`)
}

export function deleteHRDocumentFolder(orgId: string, folderId: string) {
  return api.delete(`/orgs/${orgId}/hr/folders/${folderId}`)
}

export function toggleOnboardingChecklist(orgId: string, processId: string, body: { index: number; done: boolean }) {
  return api.patch(`/orgs/${orgId}/hr/onboarding/${processId}/checklist`, body)
}

export function fetchHRAnalytics(orgId: string) {
  return api.get(`/orgs/${orgId}/hr/analytics`).then(r => r.data)
}

export function fetchMessageTemplates(orgId: string) {
  return api.get(`/orgs/${orgId}/hr/templates`).then(r => r.data)
}

export function createMessageTemplate(orgId: string, body: Record<string, unknown>) {
  return api.post(`/orgs/${orgId}/hr/templates`, body).then(r => r.data)
}

export function updateMessageTemplate(orgId: string, templateId: string, body: Record<string, unknown>) {
  return api.patch(`/orgs/${orgId}/hr/templates/${templateId}`, body).then(r => r.data)
}

export function deleteMessageTemplate(orgId: string, templateId: string) {
  return api.delete(`/orgs/${orgId}/hr/templates/${templateId}`)
}

export function searchHRDocumentShareCandidates(orgId: string, query: string) {
  return api.get<Array<{
    id: string
    full_name?: string | null
    email?: string | null
    iin?: string | null
    telegram_username?: string | null
    instagram_username?: string | null
    avatar_url?: string | null
  }>>(
    `/orgs/${orgId}/hr/documents/share-candidates`,
    { params: { query } },
  )
}

export function listIncomingHRDocumentShareRequests(orgId: string) {
  return api.get<HRDocumentShareRequest[]>(`/orgs/${orgId}/hr/documents/share-requests/incoming`)
}

export function createHRDocumentShareRequest(
  orgId: string,
  documentId: string,
  body: { target_user_id: string; permission?: 'view' | 'edit'; comment?: string },
) {
  return api.post<HRDocumentShareRequest>(`/orgs/${orgId}/hr/documents/${documentId}/share-requests`, body)
}

export function respondHRDocumentShareRequest(
  orgId: string,
  requestId: string,
  body: { action: 'accept' | 'reject'; comment?: string },
) {
  return api.post<HRDocumentShareRequest>(`/orgs/${orgId}/hr/documents/share-requests/${requestId}/respond`, body)
}

export function listHRDocumentVersions(orgId: string, documentId: string) {
  return api.get<HRDocumentVersion[]>(`/orgs/${orgId}/hr/documents/${documentId}/versions`)
}

export function listHRDocumentFolders(orgId: string) {
  return api.get<HRDocumentFolder[]>(`/orgs/${orgId}/hr/folders`)
}

export function createHRDocumentFolder(orgId: string, body: { name: string; parent_id?: string | null; meta_json?: Record<string, unknown> }) {
  return api.post<HRDocumentFolder>(`/orgs/${orgId}/hr/folders`, body)
}

export function updateHRDocumentFolder(orgId: string, folderId: string, body: { name?: string; parent_id?: string | null; meta_json?: Record<string, unknown> }) {
  return api.patch<HRDocumentFolder>(`/orgs/${orgId}/hr/folders/${folderId}`, body)
}

export function listIncomingHRDocumentFolderShareRequests(orgId: string) {
  return api.get<HRDocumentFolderShareRequest[]>(`/orgs/${orgId}/hr/folders/share-requests/incoming`)
}

export function createHRDocumentFolderShareRequest(
  orgId: string,
  folderId: string,
  body: { target_user_id: string; permission?: 'view' | 'edit'; comment?: string },
) {
  return api.post<HRDocumentFolderShareRequest>(`/orgs/${orgId}/hr/folders/${folderId}/share-requests`, body)
}

export function respondHRDocumentFolderShareRequest(
  orgId: string,
  requestId: string,
  body: { action: 'accept' | 'reject'; comment?: string },
) {
  return api.post<HRDocumentFolderShareRequest>(`/orgs/${orgId}/hr/folders/share-requests/${requestId}/respond`, body)
}

export function listHRDocumentCollaborators(orgId: string, documentId: string) {
  return api.get<HRDocumentShareRequest[]>(`/orgs/${orgId}/hr/documents/${documentId}/collaborators`)
}

export function listHRDocumentFolderCollaborators(orgId: string, folderId: string) {
  return api.get<HRDocumentFolderShareRequest[]>(`/orgs/${orgId}/hr/folders/${folderId}/collaborators`)
}
