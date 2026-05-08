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

interface LegacyTicket {
  id: number;
  clinic_id: number | null;
  topic: string;
  status: "new" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
}

function isLegacyFallbackError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405;
}

function mapLegacyStatus(status: LegacyTicket["status"]): SupportThreadStatus {
  if (status === "in_progress") return "in_progress";
  if (status === "closed") return "closed";
  return "open";
}

function mapThreadStatusToLegacy(status: SupportThreadStatus | undefined): LegacyTicket["status"] {
  if (status === "closed") return "closed";
  if (status === "in_progress" || status === "answered") return "in_progress";
  return "new";
}

function legacyToThread(ticket: LegacyTicket): SupportThread {
  return {
    id: ticket.id,
    requester_account_id: 0,
    clinic_id: ticket.clinic_id,
    subject: ticket.topic,
    request_type: "general",
    status: mapLegacyStatus(ticket.status),
    priority: "normal",
    assigned_to_account_id: null,
    last_message_at: ticket.updated_at,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    messages: [],
  };
}

export async function listPersonalThreads() {
  try {
    return await api.get<SupportThread[]>("/support/threads");
  } catch (error) {
    if (!isLegacyFallbackError(error)) throw error;
    const legacy = await api.get<LegacyTicket[]>("/support/tickets");
    return { ...legacy, data: legacy.data.map(legacyToThread) };
  }
}

export async function getPersonalThread(threadId: number | string) {
  try {
    return await api.get<SupportThread>(`/support/threads/${threadId}`);
  } catch (error) {
    if (!isLegacyFallbackError(error)) throw error;
    const legacy = await api.get<LegacyTicket[]>("/support/tickets");
    const found = legacy.data.find((item) => String(item.id) === String(threadId));
    if (!found) throw error;
    return { ...legacy, data: legacyToThread(found) };
  }
}

export async function createPersonalThread(data: SupportThreadCreatePayload) {
  try {
    return await api.post<SupportThread>("/support/threads", {
      clinic_id: data.clinic_id ?? null,
      subject: data.subject,
      body: data.body,
      request_type: data.request_type ?? "general",
      priority: data.priority ?? "normal",
    });
  } catch (error) {
    if (!isLegacyFallbackError(error)) throw error;
    const legacy = await api.post<LegacyTicket>("/support/tickets", {
      clinic_id: data.clinic_id ?? null,
      topic: data.subject,
      message: data.body,
    });
    return { ...legacy, data: legacyToThread(legacy.data) };
  }
}

export async function sendPersonalMessage(threadId: number | string, data: { body: string; files?: File[] }) {
  try {
    return await api.post<SupportMessage>(`/support/threads/${threadId}/messages`, {
      body: data.body,
    });
  } catch (error) {
    if (!isLegacyFallbackError(error)) throw error;
    await api.patch<LegacyTicket>(`/support/tickets/${threadId}`, {
      status: "in_progress",
      message: data.body,
    });
    return {
      data: {
        id: Date.now(),
        thread_id: Number(threadId),
        author_account_id: 0,
        body: data.body,
        created_at: new Date().toISOString(),
      },
    };
  }
}

export async function updatePersonalThread(
  threadId: number | string,
  data: { status?: SupportThreadStatus; priority?: SupportPriority; assigned_to_account_id?: number | null },
) {
  try {
    return await api.patch<SupportThread>(`/support/threads/${threadId}`, data);
  } catch (error) {
    if (!isLegacyFallbackError(error)) throw error;
    const legacy = await api.patch<LegacyTicket>(`/support/tickets/${threadId}`, {
      status: mapThreadStatusToLegacy(data.status),
    });
    return { ...legacy, data: legacyToThread(legacy.data) };
  }
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
