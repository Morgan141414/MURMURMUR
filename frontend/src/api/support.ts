import api from './client'
import type { SupportMessage, SupportStats, SupportThread } from '@/types'


function buildFormData(data: { subject?: string; body?: string; files?: File[]; request_type?: string; request_meta?: Record<string, unknown> }) {
  const formData = new FormData()
  if (data.subject !== undefined) formData.append('subject', data.subject)
  if (data.body !== undefined) formData.append('body', data.body)
  if (data.request_type !== undefined) formData.append('request_type', data.request_type)
  if (data.request_meta !== undefined) formData.append('request_meta', JSON.stringify(data.request_meta))
  for (const file of data.files ?? []) {
    formData.append('files', file)
  }
  return formData
}

export function listSupportThreads(orgId: string) {
  return api.get<SupportThread[]>(`/orgs/${orgId}/support/threads`)
}

export function getSupportThread(orgId: string, threadId: string) {
  return api.get<SupportThread>(`/orgs/${orgId}/support/threads/${threadId}`)
}

export function createSupportThread(
  orgId: string,
  data: { subject: string; body: string; files?: File[]; request_type?: string; request_meta?: Record<string, unknown> },
) {
  return api.post<SupportThread>(`/orgs/${orgId}/support/threads`, buildFormData(data))
}

export function sendSupportMessage(
  orgId: string,
  threadId: string,
  data: { body: string; files?: File[] },
) {
  return api.post<SupportMessage>(
    `/orgs/${orgId}/support/threads/${threadId}/messages`,
    buildFormData(data),
  )
}

export function updateSupportThreadStatus(
  orgId: string,
  threadId: string,
  status: 'open' | 'answered' | 'closed',
) {
  return api.patch<SupportThread>(`/orgs/${orgId}/support/threads/${threadId}/status`, { status })
}

export function deleteSupportThread(orgId: string, threadId: string) {
  return api.delete(`/orgs/${orgId}/support/threads/${threadId}`)
}

export function getSupportStats(orgId: string) {
  return api.get<SupportStats>(`/orgs/${orgId}/support/stats`)
}

export function applyProfileChangesFromTicket(ticketId: string) {
  return api.post<{ success: boolean; applied_fields: string[]; ticket_id: string }>(
    `/platform/support-tickets/${ticketId}/apply-profile-changes`,
  )
}

export function listPersonalThreads() {
  return api.get<SupportThread[]>('/support/threads')
}

export function getPersonalThread(threadId: string) {
  return api.get<SupportThread>(`/support/threads/${threadId}`)
}

export function createPersonalThread(data: { subject: string; body: string; files?: File[]; request_type?: string; request_meta?: Record<string, unknown> }) {
  return api.post<SupportThread>('/support/threads', buildFormData(data))
}

export function sendPersonalMessage(threadId: string, data: { body: string; files?: File[] }) {
  return api.post<SupportMessage>(`/support/threads/${threadId}/messages`, buildFormData(data))
}

export function deletePersonalThread(threadId: string) {
  return api.delete(`/support/threads/${threadId}`)
}

export function accessPersonalSupportAttachment(
  threadId: string,
  messageId: string,
  attachmentId: string,
  action: 'view' | 'download',
) {
  return api.get<{
    id: string
    file_name: string
    content_type: string
    size_bytes: number
    url: string
  }>(`/support/threads/${threadId}/messages/${messageId}/attachments/${attachmentId}`, {
    params: { action },
  })
}

export function accessOrgSupportAttachment(
  orgId: string,
  threadId: string,
  messageId: string,
  attachmentId: string,
  action: 'view' | 'download',
) {
  return api.get<{
    id: string
    file_name: string
    content_type: string
    size_bytes: number
    url: string
  }>(`/orgs/${orgId}/support/threads/${threadId}/messages/${messageId}/attachments/${attachmentId}`, {
    params: { action },
  })
}

