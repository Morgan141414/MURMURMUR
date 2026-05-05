import api from "./client";

export type SupportThreadStatus = "open" | "in_progress" | "answered" | "closed";
export type SupportPriority = "low" | "normal" | "high" | "critical";

export interface SupportMessage {
  id: number;
  thread_id: number;
  author_account_id: number;
  body: string;
  created_at: string;
}

export interface SupportThread {
  id: number;
  requester_account_id: number;
  clinic_id: number | null;
  subject: string;
  request_type: string;
  status: SupportThreadStatus;
  priority: SupportPriority;
  assigned_to_account_id: number | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  messages?: SupportMessage[];
  requester_name?: string;
  requester_email?: string;
  request_meta?: Record<string, unknown>;
}

export interface SupportThreadCreatePayload {
  clinic_id?: number | null;
  subject: string;
  body: string;
  request_type?: string;
  priority?: SupportPriority;
  files?: File[];
  request_meta?: Record<string, unknown>;
}

export function listPersonalThreads() {
  return api.get<SupportThread[]>("/support/threads");
}

export function getPersonalThread(threadId: number | string) {
  return api.get<SupportThread>(`/support/threads/${threadId}`);
}

export function createPersonalThread(data: SupportThreadCreatePayload) {
  return api.post<SupportThread>("/support/threads", {
    clinic_id: data.clinic_id ?? null,
    subject: data.subject,
    body: data.body,
    request_type: data.request_type ?? "general",
    priority: data.priority ?? "normal",
  });
}

export function sendPersonalMessage(threadId: number | string, data: { body: string; files?: File[] }) {
  return api.post<SupportMessage>(`/support/threads/${threadId}/messages`, {
    body: data.body,
  });
}

export function updatePersonalThread(
  threadId: number | string,
  data: { status?: SupportThreadStatus; priority?: SupportPriority; assigned_to_account_id?: number | null },
) {
  return api.patch<SupportThread>(`/support/threads/${threadId}`, data);
}

// Compatibility wrappers for old org-based UI calls.
export function listSupportThreads(_orgId: string) {
  return listPersonalThreads();
}

export function getSupportThread(_orgId: string, threadId: number | string) {
  return getPersonalThread(threadId);
}

export function createSupportThread(
  _orgId: string,
  data: SupportThreadCreatePayload,
) {
  return createPersonalThread(data);
}

export function sendSupportMessage(
  _orgId: string,
  threadId: number | string,
  data: { body: string; files?: File[] },
) {
  return sendPersonalMessage(threadId, data);
}

export function updateSupportThreadStatus(
  _orgId: string,
  threadId: number | string,
  status: SupportThreadStatus,
) {
  return updatePersonalThread(threadId, { status });
}

export function deleteSupportThread(_orgId: string, _threadId: string) {
  return Promise.resolve({ data: { ok: true } });
}

export function deletePersonalThread(_threadId: number | string) {
  return Promise.resolve({ data: { ok: true } });
}

export function accessPersonalSupportAttachment(
  _threadId: string,
  _messageId: string,
  _attachmentId: string,
  _action: "view" | "download",
) {
  return Promise.reject(new Error("Attachments are not supported in MVP support threads"));
}

export function accessOrgSupportAttachment(
  _orgId: string,
  _threadId: string,
  _messageId: string,
  _attachmentId: string,
  _action: "view" | "download",
) {
  return Promise.reject(new Error("Attachments are not supported in MVP support threads"));
}

export function getSupportStats(_orgId: string) {
  return Promise.resolve({
    data: {
      total: 0,
      open: 0,
      answered: 0,
      closed: 0,
    },
  });
}

export function applyProfileChangesFromTicket(ticketId: string) {
  return api.post<{ success: boolean; applied_fields: string[]; ticket_id: string }>(
    `/platform/support-tickets/${ticketId}/apply-profile-changes`,
  );
}
