/**
 * API клиент для CRM модуля
 */

import api from './client'
import type {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadListParams,
  Contact,
  ContactCreate,
  ContactUpdate,
  ContactListParams,
  Deal,
  DealCreate,
  DealUpdate,
  DealListParams,
  Organization,
  OrganizationCreate,
  OrganizationUpdate,
  OrganizationListParams,
  Note,
  NoteCreate,
  NoteUpdate,
  Task,
  TaskCreate,
  TaskUpdate,
  TaskListParams,
  CallLog,
  CallLogCreate,
  CallLogUpdate,
  CallLogListParams,
  CRMDashboard,
  SalesFunnelData,
  Pipeline,
  PipelineCreate,
  PipelineUpdate,
  PipelineWithStages,
  PipelineListParams,
  PipelineStage,
  PipelineStageCreate,
  PipelineStageUpdate,
  StageReorderItem,
  AutomationRule,
  AutomationRuleCreate,
  AutomationRuleUpdate,
  AutomationExecution,
  AutomationExecutionListParams,
  ActivityTimelineResponse,
  ActivityCountsResponse,
} from '../types/crm'

// === Leads API ===

export function listLeads(orgId: string, params?: LeadListParams) {
  return api.get<Lead[]>(`/orgs/${orgId}/crm/leads`, { params })
}

export function getLead(orgId: string, leadId: string) {
  return api.get<Lead>(`/orgs/${orgId}/crm/leads/${leadId}`)
}

export function createLead(orgId: string, body: LeadCreate) {
  return api.post<Lead>(`/orgs/${orgId}/crm/leads`, body)
}

export function updateLead(orgId: string, leadId: string, body: LeadUpdate) {
  return api.patch<Lead>(`/orgs/${orgId}/crm/leads/${leadId}`, body)
}

export function deleteLead(orgId: string, leadId: string) {
  return api.delete(`/orgs/${orgId}/crm/leads/${leadId}`)
}

export function convertLead(orgId: string, leadId: string) {
  return api.post<{ contact: Contact }>(`/orgs/${orgId}/crm/leads/${leadId}/convert`)
}

// === Contacts API ===

export function listContacts(orgId: string, params?: ContactListParams) {
  return api.get<Contact[]>(`/orgs/${orgId}/crm/contacts`, { params })
}

export function getContact(orgId: string, contactId: string) {
  return api.get<Contact>(`/orgs/${orgId}/crm/contacts/${contactId}`)
}

export function createContact(orgId: string, body: ContactCreate) {
  return api.post<Contact>(`/orgs/${orgId}/crm/contacts`, body)
}

export function updateContact(orgId: string, contactId: string, body: ContactUpdate) {
  return api.patch<Contact>(`/orgs/${orgId}/crm/contacts/${contactId}`, body)
}

export function deleteContact(orgId: string, contactId: string) {
  return api.delete(`/orgs/${orgId}/crm/contacts/${contactId}`)
}

// === Deals API ===

export function listDeals(orgId: string, params?: DealListParams) {
  return api.get<Deal[]>(`/orgs/${orgId}/crm/deals`, { params })
}

export function getDeal(orgId: string, dealId: string) {
  return api.get<Deal>(`/orgs/${orgId}/crm/deals/${dealId}`)
}

export function createDeal(orgId: string, body: DealCreate) {
  return api.post<Deal>(`/orgs/${orgId}/crm/deals`, body)
}

export function updateDeal(orgId: string, dealId: string, body: DealUpdate) {
  return api.patch<Deal>(`/orgs/${orgId}/crm/deals/${dealId}`, body)
}

export function deleteDeal(orgId: string, dealId: string) {
  return api.delete(`/orgs/${orgId}/crm/deals/${dealId}`)
}

export function updateDealStage(orgId: string, dealId: string, stage: string) {
  return api.patch<Deal>(`/orgs/${orgId}/crm/deals/${dealId}/stage?stage=${encodeURIComponent(stage)}`)
}

// === Organizations API ===

export function listOrganizations(orgId: string, params?: OrganizationListParams) {
  return api.get<Organization[]>(`/orgs/${orgId}/crm/organizations`, { params })
}

export function getOrganization(orgId: string, organizationId: string) {
  return api.get<Organization>(`/orgs/${orgId}/crm/organizations/${organizationId}`)
}

export function createOrganization(orgId: string, body: OrganizationCreate) {
  return api.post<Organization>(`/orgs/${orgId}/crm/organizations`, body)
}

export function updateOrganization(orgId: string, organizationId: string, body: OrganizationUpdate) {
  return api.patch<Organization>(`/orgs/${orgId}/crm/organizations/${organizationId}`, body)
}

export function deleteOrganization(orgId: string, organizationId: string) {
  return api.delete(`/orgs/${orgId}/crm/organizations/${organizationId}`)
}

// === Notes API ===

export function listNotes(orgId: string, params?: { limit?: number; offset?: number }) {
  return api.get<Note[]>(`/orgs/${orgId}/crm/notes`, { params })
}

export function getNote(orgId: string, noteId: string) {
  return api.get<Note>(`/orgs/${orgId}/crm/notes/${noteId}`)
}

export function createNote(orgId: string, body: NoteCreate) {
  return api.post<Note>(`/orgs/${orgId}/crm/notes`, body)
}

export function updateNote(orgId: string, noteId: string, body: NoteUpdate) {
  return api.patch<Note>(`/orgs/${orgId}/crm/notes/${noteId}`, body)
}

export function deleteNote(orgId: string, noteId: string) {
  return api.delete(`/orgs/${orgId}/crm/notes/${noteId}`)
}

// === Tasks API ===

export function listTasks(orgId: string, params?: TaskListParams) {
  return api.get<Task[]>(`/orgs/${orgId}/crm/tasks`, { params })
}

export function getTask(orgId: string, taskId: string) {
  return api.get<Task>(`/orgs/${orgId}/crm/tasks/${taskId}`)
}

export function createTask(orgId: string, body: TaskCreate) {
  return api.post<Task>(`/orgs/${orgId}/crm/tasks`, body)
}

export function updateTask(orgId: string, taskId: string, body: TaskUpdate) {
  return api.patch<Task>(`/orgs/${orgId}/crm/tasks/${taskId}`, body)
}

export function deleteTask(orgId: string, taskId: string) {
  return api.delete(`/orgs/${orgId}/crm/tasks/${taskId}`)
}

// === Call Logs API ===

export function listCallLogs(orgId: string, params?: CallLogListParams) {
  return api.get<CallLog[]>(`/orgs/${orgId}/crm/calls`, { params })
}

export function getCallLog(orgId: string, callId: string) {
  return api.get<CallLog>(`/orgs/${orgId}/crm/calls/${callId}`)
}

export function createCallLog(orgId: string, body: CallLogCreate) {
  return api.post<CallLog>(`/orgs/${orgId}/crm/calls`, body)
}

export function updateCallLog(orgId: string, callId: string, body: CallLogUpdate) {
  return api.patch<CallLog>(`/orgs/${orgId}/crm/calls/${callId}`, body)
}

export function deleteCallLog(orgId: string, callId: string) {
  return api.delete(`/orgs/${orgId}/crm/calls/${callId}`)
}

// === Analytics API ===

export function getCRMDashboard(orgId: string) {
  return api.get<CRMDashboard>(`/orgs/${orgId}/crm/analytics/dashboard`)
}

export function getSalesFunnel(orgId: string) {
  return api.get<SalesFunnelData>(`/orgs/${orgId}/crm/analytics/funnel`)
}

// === Pipelines API ===

export function listPipelines(orgId: string, params?: PipelineListParams) {
  return api.get<PipelineWithStages[]>(`/orgs/${orgId}/crm/pipelines`, { params })
}

export function getPipeline(orgId: string, pipelineId: string) {
  return api.get<PipelineWithStages>(`/orgs/${orgId}/crm/pipelines/${pipelineId}`)
}

export function createPipeline(orgId: string, body: PipelineCreate) {
  return api.post<Pipeline>(`/orgs/${orgId}/crm/pipelines`, body)
}

export function updatePipeline(orgId: string, pipelineId: string, body: PipelineUpdate) {
  return api.patch<Pipeline>(`/orgs/${orgId}/crm/pipelines/${pipelineId}`, body)
}

export function deactivatePipeline(orgId: string, pipelineId: string) {
  return api.delete(`/orgs/${orgId}/crm/pipelines/${pipelineId}`)
}

// === Pipeline Stages API ===

export function listStages(orgId: string, pipelineId: string) {
  return api.get<PipelineStage[]>(`/orgs/${orgId}/crm/pipelines/${pipelineId}/stages`)
}

export function createStage(orgId: string, pipelineId: string, body: PipelineStageCreate) {
  return api.post<PipelineStage>(`/orgs/${orgId}/crm/pipelines/${pipelineId}/stages`, body)
}

export function updateStage(orgId: string, stageId: string, body: PipelineStageUpdate) {
  return api.patch<PipelineStage>(`/orgs/${orgId}/crm/stages/${stageId}`, body)
}

export function reorderStages(orgId: string, pipelineId: string, stages: StageReorderItem[]) {
  return api.patch<PipelineStage[]>(`/orgs/${orgId}/crm/pipelines/${pipelineId}/stages/reorder`, stages)
}

export function deleteStage(orgId: string, stageId: string) {
  return api.delete(`/orgs/${orgId}/crm/stages/${stageId}`)
}

// === Automation API ===

export function listAutomationRules(orgId: string, params?: { include_inactive?: boolean }) {
  return api.get<AutomationRule[]>(`/orgs/${orgId}/crm/automation/rules`, { params })
}

export function getAutomationRule(orgId: string, ruleId: string) {
  return api.get<AutomationRule>(`/orgs/${orgId}/crm/automation/rules/${ruleId}`)
}

export function createAutomationRule(orgId: string, body: AutomationRuleCreate) {
  return api.post<AutomationRule>(`/orgs/${orgId}/crm/automation/rules`, body)
}

export function updateAutomationRule(orgId: string, ruleId: string, body: AutomationRuleUpdate) {
  return api.patch<AutomationRule>(`/orgs/${orgId}/crm/automation/rules/${ruleId}`, body)
}

export function toggleAutomationRule(orgId: string, ruleId: string, isActive: boolean) {
  return api.post<AutomationRule>(`/orgs/${orgId}/crm/automation/rules/${ruleId}/toggle?is_active=${isActive}`)
}

export function deleteAutomationRule(orgId: string, ruleId: string) {
  return api.delete(`/orgs/${orgId}/crm/automation/rules/${ruleId}`)
}

export function listAutomationExecutions(orgId: string, params?: AutomationExecutionListParams) {
  return api.get<AutomationExecution[]>(`/orgs/${orgId}/crm/automation/executions`, { params })
}

// === Activity Timeline API ===

export function getDealTimeline(
  orgId: string,
  dealId: string,
  params?: { activity_types?: string; limit?: number }
) {
  return api.get<ActivityTimelineResponse>(`/orgs/${orgId}/crm/deals/${dealId}/timeline`, { params })
}

export function getDealActivityCounts(orgId: string, dealId: string) {
  return api.get<ActivityCountsResponse>(`/orgs/${orgId}/crm/deals/${dealId}/activity-counts`)
}

export function createTaskForDeal(orgId: string, dealId: string, body: TaskCreate) {
  return api.post<Task>(`/orgs/${orgId}/crm/deals/${dealId}/tasks`, body)
}

export function createNoteForDeal(orgId: string, dealId: string, body: NoteCreate) {
  return api.post<Note>(`/orgs/${orgId}/crm/deals/${dealId}/notes`, body)
}
