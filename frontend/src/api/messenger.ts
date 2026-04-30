import api from './client'
import type { SupportMessage, SupportThread } from '@/types'
import type { MessengerThreadKeyEnvelope, MessengerUserPublicKeyBundle } from '@/lib/messengerCrypto'

export type MessengerThreadResponse = SupportThread & {
  has_more_messages?: boolean
  next_before?: string | null
}

export type MessengerIceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

export type MessengerThreadEncryptionState = {
  success: boolean
  thread_id: string
  thread_kind: 'direct' | 'group'
  encryption?: {
    enabled?: boolean
    scheme?: string
    algorithm?: string
    key_version?: number
    initialized_by?: string
    initialized_at?: string
  } | null
  participant_keys: MessengerUserPublicKeyBundle[]
  envelope_for_current_user?: MessengerThreadKeyEnvelope | null
}

function buildMessengerFormData(data: { body?: string; files?: File[]; reply_to_message_id?: string | null; encrypted_payload?: string | null; encrypted_attachments?: string | null }) {
  const formData = new FormData()
  if (data.body !== undefined) formData.append('body', data.body)
  if (data.reply_to_message_id) formData.append('reply_to_message_id', data.reply_to_message_id)
  if (data.encrypted_payload) formData.append('encrypted_payload', data.encrypted_payload)
  if (data.encrypted_attachments) formData.append('encrypted_attachments', data.encrypted_attachments)
  for (const file of data.files ?? []) {
    formData.append('files', file)
  }
  return formData
}

export function listMessengerThreads(orgId: string) {
  return api.get<SupportThread[]>(`/orgs/${orgId}/chat/threads`)
}

export function getMessengerThread(orgId: string, threadId: string, params?: { limit?: number; before?: string | null }) {
  return api.get<MessengerThreadResponse>(`/orgs/${orgId}/chat/threads/${threadId}`, {
    params: {
      limit: params?.limit,
      before: params?.before || undefined,
    },
  })
}

export function updateMessengerThreadSettings(
  orgId: string,
  threadId: string,
  data: { is_archived?: boolean; is_muted?: boolean; is_pinned?: boolean },
) {
  return api.patch<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/settings`, data)
}

export function createDirectMessengerThread(
  orgId: string,
  data: { participant_id: string; body?: string },
) {
  return api.post<SupportThread>(`/orgs/${orgId}/chat/direct`, data)
}

export function createGroupMessengerThread(
  orgId: string,
  data: { title: string; participant_ids: string[]; body?: string },
) {
  return api.post<SupportThread>(`/orgs/${orgId}/chat/groups`, data)
}

export function sendMessengerMessage(
  orgId: string,
  threadId: string,
  data: { body?: string; files?: File[]; reply_to_message_id?: string | null; encrypted_payload?: string | null; encrypted_attachments?: string | null },
) {
  return api.post<SupportMessage>(`/orgs/${orgId}/chat/threads/${threadId}/messages`, buildMessengerFormData(data))
}

export function createMessengerCallEvent(
  orgId: string,
  threadId: string,
  data: { media_kind: 'audio' | 'video'; call_status: 'missed' | 'ended'; duration_seconds?: number | null },
) {
  return api.post<SupportMessage>(`/orgs/${orgId}/chat/threads/${threadId}/call-events`, data)
}

export function updateMessengerGroupThread(
  orgId: string,
  threadId: string,
  data: { title: string },
) {
  return api.patch<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group`, data)
}

export function uploadMessengerGroupAvatar(orgId: string, threadId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group/avatar`, formData)
}

export function deleteMessengerGroupAvatar(orgId: string, threadId: string) {
  return api.delete<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group/avatar`)
}

export function removeMessengerGroupMember(orgId: string, threadId: string, userId: string) {
  return api.delete<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group/members/${userId}`)
}

export function addMessengerGroupAdmin(
  orgId: string,
  threadId: string,
  userId: string,
  data?: { manage_info?: boolean; manage_members?: boolean; manage_admins?: boolean },
) {
  return api.post<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group/admins/${userId}`, data || {})
}

export function updateMessengerGroupAdmin(
  orgId: string,
  threadId: string,
  userId: string,
  data: { manage_info?: boolean; manage_members?: boolean; manage_admins?: boolean },
) {
  return api.patch<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group/admins/${userId}`, data)
}

export function removeMessengerGroupAdmin(orgId: string, threadId: string, userId: string) {
  return api.delete<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/group/admins/${userId}`)
}

export function forwardMessengerMessage(
  orgId: string,
  threadId: string,
  data: { source_thread_id: string; source_message_id: string },
) {
  return api.post<{ success: boolean; message: SupportMessage; thread: SupportThread }>(
    `/orgs/${orgId}/chat/threads/${threadId}/messages/forward`,
    data,
  )
}

export function pinMessengerMessage(orgId: string, threadId: string, messageId: string) {
  return api.post<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/messages/${messageId}/pin`)
}

export function unpinMessengerMessage(orgId: string, threadId: string, messageId: string) {
  return api.delete<{ success: boolean; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/messages/${messageId}/pin`)
}

export function updateMessengerMessage(orgId: string, threadId: string, messageId: string, data: { body: string }) {
  return api.patch<{ success: boolean; message: SupportMessage; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/messages/${messageId}`, data)
}

export function deleteMessengerMessage(orgId: string, threadId: string, messageId: string, scope: 'me' | 'all') {
  return api.delete<{ success: boolean; scope: 'me' | 'all'; thread: SupportThread; message_id: string }>(`/orgs/${orgId}/chat/threads/${threadId}/messages/${messageId}`, { params: { scope } })
}

export function markMessengerThreadRead(orgId: string, threadId: string) {
  return api.post<{ success: boolean; message_ids: string[]; thread: SupportThread }>(`/orgs/${orgId}/chat/threads/${threadId}/read`)
}

export function transcribeMessengerAttachment(orgId: string, threadId: string, messageId: string, attachmentId: string) {
  return api.post<{ success: boolean; message: SupportMessage; transcript: { text?: string; language?: string | null; duration_seconds?: number; model?: string; updated_at?: string } }>(`/orgs/${orgId}/chat/threads/${threadId}/messages/${messageId}/attachments/${attachmentId}/transcribe`)
}

export function getMessengerIceServers(orgId: string) {
  return api.get<{ ice_servers: MessengerIceServer[] }>(`/orgs/${orgId}/chat/ice-servers`)
}

export function translateMessengerMessage(orgId: string, threadId: string, messageId: string, data?: { target_lang?: string }) {
  return api.post<{ success: boolean; message_id: string; translated_text: string; source_lang?: string | null; target_lang: string }>(`/orgs/${orgId}/chat/threads/${threadId}/messages/${messageId}/translate`, data || {})
}

export function getMyMessengerKeyBundle(orgId: string) {
  return api.get<{ success: boolean; bundle: MessengerUserPublicKeyBundle | null }>(`/orgs/${orgId}/chat/keys/me`)
}

export function upsertMyMessengerKeyBundle(orgId: string, data: { algorithm?: string; public_key_jwk: JsonWebKey }) {
  return api.put<{ success: boolean; bundle: MessengerUserPublicKeyBundle }>(`/orgs/${orgId}/chat/keys/me`, {
    algorithm: data.algorithm || 'ECDH-P256',
    public_key_jwk: data.public_key_jwk,
  })
}

export function getMessengerThreadEncryption(orgId: string, threadId: string) {
  return api.get<MessengerThreadEncryptionState>(`/orgs/${orgId}/chat/threads/${threadId}/encryption`)
}

export function initializeMessengerThreadEncryption(
  orgId: string,
  threadId: string,
  data: {
    key_version?: number
    algorithm?: string
    envelopes: Array<{ recipient_user_id: string; wrapped_key_b64: string; iv_b64: string }>
  },
) {
  return api.post<MessengerThreadEncryptionState>(`/orgs/${orgId}/chat/threads/${threadId}/encryption`, {
    key_version: data.key_version || 1,
    algorithm: data.algorithm || 'ECDH-P256/AES-GCM',
    envelopes: data.envelopes,
  })
}
