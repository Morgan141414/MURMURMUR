/**
 * Типы для CRM модуля
 */

// === Лиды ===

export type LeadStatus =
  | 'New'
  | 'Qualified'
  | 'Unqualified'
  | 'Converted'

export type LeadSource =
  | 'Website'
  | 'Phone'
  | 'WhatsApp'
  | 'Telegram'
  | 'Email'
  | 'Advertisement'
  | 'Referral'
  | 'Exhibition'
  | 'Partner'
  | 'Other'

export const LEAD_STATUSES: Record<LeadStatus, LeadStatus> = {
  New: 'New',
  Qualified: 'Qualified',
  Unqualified: 'Unqualified',
  Converted: 'Converted',
}

export const LEAD_SOURCES: Record<LeadSource, LeadSource> = {
  Website: 'Website',
  Phone: 'Phone',
  WhatsApp: 'WhatsApp',
  Telegram: 'Telegram',
  Email: 'Email',
  Advertisement: 'Advertisement',
  Referral: 'Referral',
  Exhibition: 'Exhibition',
  Partner: 'Partner',
  Other: 'Other',
}

export interface Lead {
  id: string
  first_name: string
  last_name?: string
  email?: string
  mobile_no?: string
  phone?: string
  organization?: string
  organization_name?: string
  website?: string
  source?: string
  status: string
  notes?: string
  city?: string
  country?: string
  industry?: string
  owner_id?: string
  created_at: string
  updated_at: string
}

export interface LeadCreate {
  first_name: string
  last_name?: string
  email?: string
  mobile_no?: string
  phone?: string
  organization_name?: string
  website?: string
  source?: LeadSource
  status?: LeadStatus
  notes?: string
  city?: string
  country?: string
  industry?: string
}

export interface LeadUpdate {
  first_name?: string
  last_name?: string
  email?: string
  mobile_no?: string
  phone?: string
  organization_name?: string
  website?: string
  source?: LeadSource
  status?: LeadStatus
  notes?: string
  city?: string
  country?: string
  industry?: string
  owner_id?: string
}

// === Контакты ===

export interface Contact {
  name: string
  first_name: string
  last_name?: string
  email?: string
  mobile_no?: string
  phone?: string
  designation?: string
  organization?: string
  address?: string
  city?: string
  country?: string
  owner?: string
  creation: string
  modified: string
}

export interface ContactCreate {
  first_name: string
  last_name?: string
  email?: string
  mobile_no?: string
  phone?: string
  designation?: string
  organization?: string
  address?: string
  city?: string
  country?: string
}

export interface ContactUpdate {
  first_name?: string
  last_name?: string
  email?: string
  mobile_no?: string
  phone?: string
  designation?: string
  organization?: string
  address?: string
  city?: string
  country?: string
}

// === Сделки ===

export interface Deal {
  id: string
  name: string
  org_id: string
  organization_id?: string
  organization_name?: string
  contact_id?: string
  contact_name?: string
  annual_revenue?: number
  probability: number
  status: string
  close_date?: string
  deal_owner_id?: string
  notes?: string
  pipeline_id?: string
  stage_id?: string
  created_at: string
  updated_at: string
}

export interface DealCreate {
  name: string
  organization_id?: string
  organization_name?: string
  contact_id?: string
  contact_name?: string
  annual_revenue?: number
  probability?: number
  status?: string
  close_date?: string
  deal_owner_id?: string
  notes?: string
  pipeline_id?: string
  stage_id?: string
}

export interface DealUpdate {
  name?: string
  organization_id?: string
  organization_name?: string
  contact_id?: string
  contact_name?: string
  annual_revenue?: number
  probability?: number
  status?: string
  close_date?: string
  deal_owner_id?: string
  notes?: string
  pipeline_id?: string
  stage_id?: string
}

// === Аналитика ===

export interface SalesTrendData {
  date: string
  leads: number
  deals: number
  wonDeals: number
}

export interface DealsByStage {
  name: string
  value: number
  color: string
}

export interface CRMDashboard {
  new_leads_count: number
  qualified_leads_count: number
  open_deals_count: number
  contacts_count: number
  sales_trend: SalesTrendData[]
  deals_by_stage: DealsByStage[]
  total_leads: number
  total_deals: number
}

// === Sales Funnel ===

export interface FunnelStageMetrics {
  stage: string
  stage_order: number
  deal_count: number
  total_revenue: number
  expected_revenue: number
  avg_deal_value: number
  avg_probability: number
  conversion_rate: number | null
  color: string
}

export type FunnelViewMode = 'count' | 'revenue' | 'expected'

export interface SalesFunnelData {
  stages: FunnelStageMetrics[]
  total_pipeline_value: number
  total_expected_value: number
  overall_conversion_rate: number
  avg_deal_cycle_days: number | null
}

// === Параметры запросов ===

export interface LeadListParams {
  status?: string
  source?: string
  owner?: string
  search?: string
  limit?: number
  offset?: number
}

export interface ContactListParams {
  organization?: string
  search?: string
  limit?: number
  offset?: number
}

export interface DealListParams {
  status?: string
  owner?: string
  contact?: string
  organization?: string
  limit?: number
  offset?: number
}

// === Организации ===

export interface Organization {
  id: string
  name: string
  website?: string
  phone?: string
  email?: string
  industry?: string
  territory?: string
  no_of_employees?: string
  annual_revenue?: number
  address?: string
  city?: string
  country?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OrganizationCreate {
  name: string
  website?: string
  phone?: string
  email?: string
  industry?: string
  territory?: string
  no_of_employees?: string
  annual_revenue?: number
  address?: string
  city?: string
  country?: string
  notes?: string
}

export interface OrganizationUpdate {
  name?: string
  website?: string
  phone?: string
  email?: string
  industry?: string
  territory?: string
  no_of_employees?: string
  annual_revenue?: number
  address?: string
  city?: string
  country?: string
  notes?: string
}

export interface OrganizationListParams {
  industry?: string
  territory?: string
  search?: string
  limit?: number
  offset?: number
}

// === Заметки ===

export interface Note {
  id: string
  org_id: string
  title: string
  content: string
  owner_id?: string
  created_at: string
  updated_at: string
}

export interface NoteCreate {
  title: string
  content: string
}

export interface NoteUpdate {
  title?: string
  content?: string
}

// === Задачи ===

export interface Task {
  id: string
  org_id: string
  title: string
  description?: string
  status: string  // Todo, In Progress, Backlog, Done
  priority: string  // Low, Medium, High
  due_date?: string
  assigned_to_id?: string
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  title: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  assigned_to_id?: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  assigned_to_id?: string
}

export interface TaskListParams {
  status?: string
  assigned_to?: string
  limit?: number
  offset?: number
}

// === Звонки ===

export interface CallLog {
  id: string
  org_id: string
  caller_id?: string
  caller_name: string
  receiver_id?: string
  receiver_name: string
  call_type: string  // Incoming, Outgoing
  status: string  // Completed, Missed Call, Busy, No Answer
  duration: number
  from_number?: string
  to_number?: string
  notes?: string
  created_at: string
}

export interface CallLogCreate {
  caller_name: string
  receiver_name: string
  call_type?: string
  status?: string
  duration?: number
  from_number?: string
  to_number?: string
  caller_id?: string
  receiver_id?: string
  notes?: string
}

export interface CallLogUpdate {
  caller_name?: string
  receiver_name?: string
  call_type?: string
  status?: string
  duration?: number
  from_number?: string
  to_number?: string
  caller_id?: string
  receiver_id?: string
  notes?: string
}

export interface CallLogListParams {
  call_type?: string
  status?: string
  limit?: number
  offset?: number
}

// === Пайплайны и этапы ===

export interface PipelineStage {
  id: string
  pipeline_id: string
  org_id: string
  name: string
  color: string  // Hex color (#RRGGBB)
  order: number
  probability_min?: number
  probability_max?: number
  is_closed_won: boolean
  is_closed_lost: boolean
  created_at: string
  updated_at: string
}

export interface PipelineStageCreate {
  name: string
  color: string
  order?: number
  probability_min?: number
  probability_max?: number
  is_closed_won?: boolean
  is_closed_lost?: boolean
}

export interface PipelineStageUpdate {
  name?: string
  color?: string
  probability_min?: number
  probability_max?: number
  is_closed_won?: boolean
  is_closed_lost?: boolean
}

export interface StageReorderItem {
  stage_id: string
  order: number
}

export interface Pipeline {
  id: string
  org_id: string
  name: string
  description?: string
  is_default: boolean
  is_active: boolean
  created_by_id?: string
  created_at: string
  updated_at: string
}

export interface PipelineCreate {
  name: string
  description?: string
  is_default?: boolean
}

export interface PipelineUpdate {
  name?: string
  description?: string
  is_default?: boolean
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[]
}

export interface PipelineListParams {
  include_inactive?: boolean
}

// === Автоматизация ===

export type AutomationTriggerType =
  | 'deal_created'
  | 'deal_updated'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'

export type AutomationOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'

export type AutomationActionType =
  | 'assign_user'
  | 'update_field'
  | 'send_notification'
  | 'create_task'

export type AutomationExecutionStatus = 'success' | 'failed' | 'skipped'

export interface AutomationCondition {
  field: string
  operator: AutomationOperator
  value?: any
}

export interface AutomationAction {
  type: AutomationActionType
  config: Record<string, any>
}

export interface AutomationRule {
  id: string
  org_id: string
  name: string
  description?: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, any>
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  is_active: boolean
  execution_mode: 'sync' | 'async'
  priority: number
  created_by_id?: string
  created_at: string
  updated_at: string
}

export interface AutomationRuleCreate {
  name: string
  description?: string
  trigger_type: AutomationTriggerType
  trigger_config?: Record<string, any>
  conditions?: AutomationCondition[]
  actions: AutomationAction[]
  execution_mode?: 'sync' | 'async'
  priority?: number
}

export interface AutomationRuleUpdate {
  name?: string
  description?: string
  trigger_type?: AutomationTriggerType
  trigger_config?: Record<string, any>
  conditions?: AutomationCondition[]
  actions?: AutomationAction[]
  is_active?: boolean
  execution_mode?: 'sync' | 'async'
  priority?: number
}

export interface AutomationExecution {
  id: string
  rule_id: string
  org_id: string
  deal_id?: string
  trigger_data: Record<string, any>
  status: AutomationExecutionStatus
  actions_executed: number
  error_message?: string
  execution_time_ms?: number
  executed_at: string
}

export interface AutomationExecutionListParams {
  rule_id?: string
  deal_id?: string
  status?: AutomationExecutionStatus
  limit?: number
  offset?: number
}

// === Activity Timeline ===

export type ActivityType = 'task' | 'note' | 'call' | 'history'

export interface ActivityTimelineItem {
  id: string
  activity_type: ActivityType
  timestamp: string
  title: string
  description?: string
  metadata: Record<string, any>
}

export interface ActivityTimelineResponse {
  deal_id: string
  activities: ActivityTimelineItem[]
  total: number
}

export interface ActivityCountsResponse {
  tasks: number
  notes: number
  calls: number
  history: number
  total: number
}
