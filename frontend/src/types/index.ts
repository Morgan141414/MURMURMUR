export interface User {
  id: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  patronymic?: string
  phone?: string
  iin?: string
  bio?: string
  specialty?: string
  avatar_url?: string
  socials_json?: string
  is_superadmin?: boolean
  platform_role?: string | null
  is_active?: boolean
  totp_enabled?: boolean
  position?: string
  experience_years?: number
  skills?: string[]
  education?: string
  city?: string
  portfolio_url?: string
  is_looking_for_job?: boolean
  desired_salary?: number
  desired_salary_currency?: 'USD' | 'KZT' | 'RUB'
  is_private_profile?: boolean
  last_seen_at?: string | null
  employee_status?: string | null
  work_email?: string | null
  department?: string | null
  work_format?: string | null
  manager_id?: string | null
  employee_recommendation?: string | null
  org_id?: string
  org_role?: OrgRole | null
  telegram_username?: string | null
  instagram_username?: string | null
  linkedin_url?: string | null
  github_url?: string | null
}

export interface ModerationDocument {
  id: string
  file_name: string
  content_type: string
  size: number
  document_type?: string
  document_label?: string
  data_url: string
}

export interface ModerationIssue {
  scope: 'field' | 'document'
  target: string
  label: string
  message: string
}

export interface OnboardingProcess {
  id: string
  org_id: string
  employee_id: string
  mentor_id?: string | null
  job_title?: string | null
  start_date?: string | null
  status: string
  checklist: Array<{ label: string; done: boolean; owner?: string; area?: string }>
  notes?: string | null
  meta_json?: {
    probation_end?: string | null
    employee_profile?: {
      work_email?: string | null
      department?: string | null
      location?: string | null
      format?: string | null
      equipment?: string | null
      start_manager?: string | null
    }
    handoffs?: Record<string, {
      status?: string
      owner?: string
      note?: string
      due_date?: string | null
    }>
  }
  created_at: string
  updated_at: string
}

export interface OffboardingProcess {
  id: string
  org_id: string
  employee_id: string
  last_day?: string | null
  reason?: string | null
  status: string
  checklist: Array<{ label: string; done: boolean; owner?: string; area?: string }>
  created_at: string
  updated_at: string
}

export interface TerminationOrderVote {
  id: string
  order_id: string
  approver_user_id: string
  approver_name?: string | null
  approver_email?: string | null
  decision: 'pending' | 'approved' | 'rejected'
  comment?: string | null
  decided_at?: string | null
  created_at: string
  updated_at: string
}

export interface TerminationOrder {
  id: string
  org_id: string
  target_employee_id: string
  target_employee_name?: string | null
  target_employee_email?: string | null
  created_by_id: string
  created_by_name?: string | null
  created_by_email?: string | null
  executed_by_id?: string | null
  executed_by_name?: string | null
  last_day?: string | null
  reason?: string | null
  document_title?: string | null
  document_body?: string | null
  document_url?: string | null
  status: 'pending_approval' | 'approved_all' | 'rejected' | 'executed' | 'cancelled'
  meta_json?: Record<string, unknown>
  votes: TerminationOrderVote[]
  approvals_required: number
  approved_count: number
  rejected_count: number
  pending_count: number
  all_approved: boolean
  created_at: string
  updated_at: string
  resolved_at?: string | null
  executed_at?: string | null
}

export interface LeaveRequest {
  id: string
  org_id: string
  employee_id: string
  requested_by_id: string
  approved_by_id?: string | null
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  status: string
  reason?: string | null
  created_at: string
  updated_at: string
}

export interface HRDocument {
  id: string
  org_id: string
  employee_id?: string | null
  created_by?: string | null
  name: string
  document_type: string
  status: string
  file_url?: string | null
  meta_json: {
    category?: string
    signers?: string[]
    generated_content?: string | null
    placeholders?: Record<string, string | null>
    signature_requests?: Array<{
      id: string
      signer_name: string
      signer_user_id?: string | null
      signer_role?: string | null
      status: string
      note?: string | null
      decided_at?: string | null
    }>
    template_key?: string | null
    file_name?: string | null
    content_type?: string | null
    size?: number
    folder_id?: string | null
  }
  created_at: string
  updated_at: string
}



export interface HRDocumentShareRequest {
  id: string
  org_id: string
  document_id: string
  requested_by_id: string
  requested_by_name?: string | null
  requested_by_email?: string | null
  target_user_id: string
  target_user_name?: string | null
  target_user_email?: string | null
  target_user_avatar_url?: string | null
  permission: 'view' | 'edit' | 'owner' | string
  status: 'pending' | 'accepted' | 'rejected' | string
  comment?: string | null
  resolved_by_id?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

export interface HRDocumentVersion {
  id: string
  org_id: string
  document_id: string
  version_number: number
  changed_by?: string | null
  snapshot_json: Record<string, unknown>
  created_at?: string | null
}

export interface HRDocumentFolder {
  id: string
  org_id: string
  name: string
  parent_id?: string | null
  created_by?: string | null
  meta_json: Record<string, unknown>
  created_at?: string | null
  updated_at?: string | null
}

export interface HRDocumentFolderShareRequest {
  id: string
  org_id: string
  folder_id: string
  requested_by_id: string
  requested_by_name?: string | null
  requested_by_email?: string | null
  target_user_id: string
  target_user_name?: string | null
  target_user_email?: string | null
  target_user_avatar_url?: string | null
  permission: 'view' | 'edit' | 'owner' | string
  status: 'pending' | 'accepted' | 'rejected' | string
  comment?: string | null
  resolved_by_id?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeChangeRequest {
  id: string
  org_id: string
  employee_id: string
  requested_by_id: string
  reviewed_by_id?: string | null
  change_type: string
  payload_json: Record<string, unknown>
  status: string
  comment?: string | null
  created_at: string
  updated_at: string
  reviewed_at?: string | null
  approval_required?: boolean
}

export interface BillingPlan {
  id: string
  code: string
  name: string
  billing_period: string
  price_amount: number
  currency: string
  members_limit?: number | null
  projects_limit?: number | null
  features: string[]
  is_active: boolean
}

export interface Subscription {
  id: string
  org_id: string
  plan_id: string
  status: string
  seats: number
  started_at: string
  ends_at?: string | null
  trial_ends_at?: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  org_id: string
  subscription_id?: string | null
  invoice_number: string
  status: string
  amount: number
  currency: string
  description?: string | null
  due_at?: string | null
  paid_at?: string | null
  created_at: string
}

export interface BillingOverview {
  plans: BillingPlan[]
  active_subscription?: Subscription | null
  invoices: Invoice[]
}

export interface BillingWorkflowEntry {
  id: string
  event: string
  actor_id?: string | null
  actor_name?: string | null
  note?: string | null
  extra?: Record<string, unknown>
  created_at: string
}

export interface Vacancy {
  id: string
  org_id: string
  owner_recruiter_id?: string | null
  hiring_manager_id?: string | null
  title: string
  description?: string | null
  city?: string | null
  salary_from?: number | null
  salary_to?: number | null
  employment_type?: string | null
  experience_years?: number | null
  skills: string[]
  status: string
  approval_status: string
  budget_status: string
  budget_approved_by?: string | null
  budget_approved_at?: string | null
  budget_notes?: string | null
  approved_by?: string | null
  approved_at?: string | null
  published_at?: string | null
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  org_id: string
  vacancy_id: string
  applicant_user_id?: string | null
  full_name: string
  email: string
  phone?: string | null
  cover_letter?: string | null
  source: string
  status: string
  stage: string
  rating?: number | null
  recruiter_summary?: string | null
  rejection_reason?: string | null
  tags?: string[]
  attachments?: Array<{
    id: string
    file_name: string
    content_type?: string | null
    data_url: string
    size: number
  }>
  verification_status?: string | null
  service_recommendation?: string | null
  is_favorite?: boolean
  owner_recruiter_id?: string | null
  reviewed_by_id?: string | null
  next_step_at?: string | null
  created_at: string
  updated_at: string
  reviewed_at?: string | null
}

export interface InterviewSession {
  id: string
  org_id: string
  vacancy_id: string
  application_id: string
  stage: string
  scheduled_at?: string | null
  duration_minutes?: number | null
  format?: string | null
  location?: string | null
  meeting_link?: string | null
  status: string
  result?: string | null
  invitation_status?: string | null
  invitation_sent_at?: string | null
  invitation_message?: string | null
  interviewer_name?: string | null
  interviewer_id?: string | null
  participants_json?: Array<{
    user_id?: string | null
    name: string
    role?: string | null
  }>
  feedback?: string | null
  score?: number | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface RecruiterNote {
  id: string
  org_id: string
  vacancy_id: string
  application_id: string
  author_id?: string | null
  body: string
  visibility: string
  created_at: string
  updated_at: string
}

export interface HiringOffer {
  id: string
  org_id: string
  vacancy_id: string
  application_id: string
  status: string
  title?: string | null
  salary_amount?: number | null
  currency: string
  starts_at?: string | null
  expires_at?: string | null
  benefits: string[]
  terms?: string | null
  meta_json?: {
    approvals?: Array<{
      user_id?: string | null
      name: string
      role?: string | null
      status: string
      note?: string | null
      decided_at?: string | null
    }>
    candidate_response?: {
      status?: string | null
      note?: string | null
      decided_at?: string | null
    }
  }
  created_by?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
}

export interface VacancyAnalytics {
  total_vacancies: number
  published_vacancies: number
  approval_queue: number
  budget_pending: number
  total_applications: number
  hired_candidates: number
  offers_sent: number
  stage_counts: Record<string, number>
}

export interface MessageTemplate {
  id: string
  org_id: string
  name: string
  template_type: string
  subject: string | null
  body: string
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface HRAnalytics {
  total_employees: number
  active_onboarding: number
  completed_onboarding: number
  active_offboarding: number
  pending_leave_requests: number
  documents_awaiting_signature: number
  documents_total: number
}

export interface EnhancedVacancyAnalytics extends VacancyAnalytics {
  avg_days_to_close: number | null
  source_stats: Record<string, number>
  offers_accepted: number
  offers_declined: number
  offer_acceptance_rate: number
  rejection_rate: number
  avg_time_to_first_interview: number | null
  stale_candidates: number
  top_vacancies: Array<{
    vacancy_id: string
    title: string
    applications: number
    interviews: number
    offers: number
    hired: number
    rejected: number
    hire_rate: number
  }>
  conversion_rates: {
    applied_to_screening: number
    screening_to_interview: number
    interview_to_offer: number
    offer_to_hired: number
  }
}

export type OrgRole =
  | 'founder'
  | 'ceo'
  | 'superadmin'
  | 'hr'
  | 'recruiter'
  | 'hiring_manager'
  | 'accountant'
  | 'sysadmin'
  | 'admin'
  | 'team_lead'
  | 'project_manager'
  | 'developer'
  | 'lawyer'
  | 'sales_director'
  | 'sales_manager'
  | 'sales_support'
  | 'member'

// ── Shell / Context system ──

/** The interface shells that determine what the user sees */
export type ShellType = 'platform' | 'company' | 'department'

/** Active context describes WHERE the user is working right now */
export interface AppContext {
  shell: ShellType
  orgId?: string | null
  projectId?: string | null
  /** True when superadmin is in emergency access mode */
  emergencyMode?: boolean
  /** Reason for emergency access (required when emergencyMode is true) */
  emergencyReason?: string
}

/** Maps roles to their primary (default) shell */
export const ROLE_DEFAULT_SHELL: Record<OrgRole, ShellType> = {
  founder: 'company',
  superadmin: 'platform',
  sysadmin: 'company',
  ceo: 'company',
  hr: 'company',
  recruiter: 'company',
  hiring_manager: 'company',
  accountant: 'company',
  admin: 'company',
  team_lead: 'company',
  project_manager: 'company',
  developer: 'company',
  lawyer: 'company',
  sales_director: 'company',
  sales_manager: 'company',
  sales_support: 'company',
  member: 'company',
}

/** Which shells each role is allowed to access */
export const ROLE_ALLOWED_SHELLS: Record<OrgRole, ShellType[]> = {
  founder: ['company', 'department'],
  superadmin: ['platform', 'company', 'department'],
  sysadmin: ['company', 'department'],
  ceo: ['company', 'department'],
  hr: ['company'],
  recruiter: ['company'],
  hiring_manager: ['company', 'department'],
  accountant: ['company'],
  admin: ['company', 'department'],
  team_lead: ['company', 'department'],
  project_manager: ['company', 'department'],
  developer: ['company', 'department'],
  lawyer: ['company'],
  sales_director: ['company'],
  sales_manager: ['company'],
  sales_support: ['company'],
  member: ['company'],
}

/** Human-readable role labels (actual roles, not legacy labels) */
export const ROLE_LABELS: Record<OrgRole, string> = {
  founder: 'Founder',
  ceo: 'CEO',
  superadmin: 'Super Admin',
  hr: 'HR',
  recruiter: 'Recruiter',
  hiring_manager: 'Hiring Manager',
  accountant: 'Accountant',
  sysadmin: 'System Admin',
  admin: 'Admin',
  team_lead: 'Team Lead',
  project_manager: 'Projects Manager',
  developer: 'Developer',
  lawyer: 'Юрист',
  sales_director: 'Sales Director',
  sales_manager: 'Sales Manager',
  sales_support: 'Sales Support',
  member: 'Member',
}

/** Color classes for role badges */
export const ROLE_COLORS: Partial<Record<OrgRole, string>> = {
  founder: 'bg-red-500/10 text-red-600',
  ceo: 'bg-red-500/10 text-red-600',
  superadmin: 'bg-blue-500/10 text-blue-600',
  hr: 'bg-emerald-500/10 text-emerald-600',
  recruiter: 'bg-indigo-500/10 text-indigo-600',
  hiring_manager: 'bg-orange-500/10 text-orange-600',
  accountant: 'bg-sky-500/10 text-sky-600',
  sysadmin: 'bg-blue-500/10 text-blue-600',
  admin: 'bg-blue-500/10 text-blue-600',
  team_lead: 'bg-amber-500/10 text-amber-600',
  project_manager: 'bg-amber-500/10 text-amber-600',
  developer: 'bg-violet-500/10 text-violet-600',
  lawyer: 'bg-teal-500/10 text-teal-600',
  member: 'bg-gray-500/10 text-gray-600',
}

export interface Org {
  id: string
  name: string
  code?: string
  join_code: string
  owner_id?: string
  description?: string
  industry?: string
  industry_group?: string | null
  niche_code?: string | null
  website?: string
  logo_url?: string
  is_active?: boolean
  suspended_at?: string
  max_members?: number
  auto_approve?: boolean
  welcome_message?: string
  theme_color?: string
  moderation_status?: string
  moderation_comment?: string | null
  legal_name_kz?: string | null
  legal_name_ru?: string | null
  registration_kind?: 'company' | 'startup' | string
  organization_form?: string | null
  bin?: string | null
  legal_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  oked?: string | null
  ceo_user_id?: string | null
  founders_json?: CompanyParticipant[]
  company_accounts_json?: CompanyAccount[]
}

export interface ExploreOrg extends Org {
  is_member: boolean
  viewer_role?: OrgRole | null
  member_count: number
}

export interface UserOrgAffiliation {
  org_id: string
  org_name: string
  org_logo_url?: string | null
  org_industry?: string | null
  role: string
  joined_at?: string | null
}

export interface ExploreUser extends User {
  is_self: boolean
  primary_org?: UserOrgAffiliation | null
  org_affiliations?: UserOrgAffiliation[]
}

export interface OrgWithRole extends Org {
  role: OrgRole
}





export interface OwnershipPolicy {
  org_id: string
  min_approvals: number
  platform_review_share_threshold: number
  allow_external_buyers: boolean
  require_documents: boolean
  rofr_enabled: boolean
  currency_default: string
}

export interface OwnershipTransaction {
  id: string
  org_id: string
  transaction_type: 'buy' | 'sell' | 'transfer'
  seller_participant_id?: string | null
  buyer_participant_id?: string | null
  seller_user_id?: string | null
  buyer_user_id?: string | null
  buyer_email?: string | null
  share_percent: number
  price_amount?: number | null
  currency: string
  status: string
  approvals_required: number
  approvals_count: number
  rejections_count: number
  requires_platform_review: boolean
  platform_review_status?: string | null
  risk_flags_json: Array<{ code?: string; label?: string } & Record<string, unknown>>
  documents_json: ModerationDocument[]
  note?: string | null
  created_at?: string | null
  updated_at?: string | null
  approved_at?: string | null
  executed_at?: string | null
}

export interface OrgProfileUpdateRequest {
  id: string
  org_id: string
  change_type: string
  status: string
  payload_json: Record<string, unknown>
  attachments_json?: ModerationDocument[]
  comment?: string | null
  submitted_by: string
  reviewed_by?: string | null
  created_at?: string | null
  reviewed_at?: string | null
  applied_at?: string | null
}

export interface CompanyParticipant {
  id: string
  entity_type: string
  user_id?: string | null
  full_name?: string | null
  company_name?: string | null
  email?: string | null
  display_name: string
  iin?: string | null
  bin?: string | null
  identifier?: string | null
  role: string
  share_percent: number
  status: string
  appointment_basis?: string | null
  start_date?: string | null
  end_date?: string | null
  documents?: ModerationDocument[]
  is_owner?: boolean
}

export interface OrgRegistrationSubmission {
  org_id: string
  registration_kind: string
  moderation_status: string
  moderation_comment?: string | null
  moderation_issues?: ModerationIssue[]
  name?: string | null
  description?: string | null
  industry?: string | null
  industry_group?: string | null
  niche_code?: string | null
  moderator_message?: string | null
  legal_name_kz?: string | null
  legal_name_ru?: string | null
  organization_form?: string | null
  bin?: string | null
  legal_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  oked?: string | null
  company_accounts_json?: CompanyAccount[]
  attachments_json?: ModerationDocument[]
}

export interface CompanyAccount {
  id?: string
  iban: string
  bank_name?: string | null
  bic?: string | null
  kbe?: string | null
  client_iin?: string | null
  currency?: string | null
  comment?: string | null
}

export interface RegistrationProfileDocument {
  type: string
  label: string
}

export interface RegistrationProfile {
  niche_code: string
  industry_group: string
  label: string
  industry_label: string
  description?: string | null
  allowed_registration_kinds: string[]
  required_creation_documents: RegistrationProfileDocument[]
  workspace_blueprint: string[]
  version: number
}

export interface OrgInvitation {
  id: string
  org_id: string
  token: string
  invite_url: string
  email?: string | null
  role: string
  status: string
  note?: string | null
  expires_at: string
  accepted_by?: string | null
  accepted_at?: string | null
  created_by: string
  created_at?: string | null
}

export interface OrgModerationSummary {
  org_id: string
  company_name: string
  moderation_status: string
  moderation_comment?: string | null
  moderator_id?: string | null
  moderator_name?: string | null
  moderator_email?: string | null
  reviewed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  company: {
    name: string
    code?: string
    join_code: string
    description?: string | null
    industry?: string | null
    website?: string | null
    logo_url?: string | null
    is_active: boolean
    max_members?: number | null
    auto_approve?: boolean | null
    theme_color?: string | null
    welcome_message?: string | null
    owner_id?: string | null
  }
}

export interface JoinRequest {
  id: string
  user_id: string
  user_email?: string
  user_full_name?: string | null
  org_id: string
  org_name?: string | null
  status: string
  comment?: string | null
  reviewed_by?: string | null
  reviewed_by_name?: string | null
  reviewed_by_email?: string | null
  created_at: string
  reviewed_at?: string | null
}

export interface Project {
  id: string
  name: string
  description?: string
  logo_url?: string | null
  position?: number
  org_id: string
  department_head_user_id?: string | null
}

export interface Team {
  id: string
  name: string
  logo_url?: string | null
  project_id?: string
  org_id: string
  team_lead_user_id?: string | null
  members?: TeamMember[]
  timezone?: string | null
  working_hours_start?: string | null
  working_hours_end?: string | null
  working_days?: string | null
}

export interface TeamMember {
  user_id: string
  role?: string
}

export interface DepartmentInvite {
  id: string
  org_id: string
  project_id: string
  team_id?: string | null
  inviter_user_id: string
  invitee_user_id: string
  role?: string | null
  note?: string | null
  status: string
  responded_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Task {
  id: string
  title: string
  description?: string
  status: string
  assignee_id?: string
  team_id?: string
  due_date?: string
  report?: string
  created_at: string
}

// Board types
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface TaskColumn {
  id: string
  org_id: string
  project_id: string
  name: string
  name_ru?: string | null
  name_kz?: string | null
  color?: string | null
  position: number
  mapped_status?: string | null
  created_at: string
}

export interface BoardTask {
  id: string
  org_id: string
  project_id?: string | null
  project_name?: string | null
  team_id?: string | null
  assignee_id?: string | null
  assignee_ids?: string[] | null
  column_id?: string | null
  is_personal?: boolean
  title: string
  description?: string | null
  status: string
  priority?: string | null
  story_points?: number | null
  position: number
  report?: string | null
  due_date?: string | null
  reminders?: Record<string, unknown> | null
  created_at: string
  checklist_total: number
  checklist_done: number
  comments_count: number
  attachments_count?: number
  created_by_id?: string | null
  approval_user_ids?: string[] | null
  approved_by?: { full_name?: string; first_name?: string } | null
  approved_by_id?: string | null
  assignee?: { id?: string; full_name?: string; first_name?: string; avatar_url?: string | null } | null
  created_by?: { full_name?: string; first_name?: string } | null
  approved_at?: string | null
  work_started_at?: string | null
  work_finished_at?: string | null
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  text: string
  is_done: boolean
  position: number
  created_at: string
}

export interface TaskComment {
  id: string
  org_id: string
  task_id: string
  user_id: string
  text: string
  created_at: string
  updated_at?: string | null
}

export interface TaskAttachment {
  id: string
  org_id: string
  task_id: string
  filename: string
  path: string
  size_bytes: number
  content_type?: string | null
  uploaded_by?: string | null
  created_at: string
}

export interface ProjectStats {
  total_tasks: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  overdue: number
  total_story_points: number
}

export interface Session {
  id: string
  user_id: string
  device_name?: string
  os_name?: string
  started_at: string
  ended_at?: string
}

export interface ConsentStatus {
  accepted: boolean
  policy_version?: string
  accepted_at?: string
}

export interface Certificate {
  id: string
  org_id: string
  certificate_number: string
  issued_at: string
  expires_at: string
  status: 'active' | 'expired' | 'revoked'
  issued_by: string
  revoked_at?: string
  revoke_reason?: string
  pdf_url?: string
}

export interface Permission {
  id: string
  codename: string
  description?: string
}

export interface RolePermission {
  id: string
  role: string
  permission_id: string
}

export type KpiReport = Record<string, unknown>
export type AiScorecard = Record<string, unknown>
export interface AuditLog {
  id: string
  event_id?: string
  action?: string
  action_type?: string
  event?: string
  entity_type?: string | null
  entity_id?: string | null
  object_type?: string | null
  object_id?: string | null
  actor_id?: string | null
  actor_name?: string | null
  actor_email?: string | null
  actor_role?: string | null
  result_status?: 'success' | 'failed' | 'pending' | 'blocked' | 'reverted' | string
  source?: string | null
  comment?: string | null
  old_value?: unknown
  new_value?: unknown
  request_id?: string | null
  session_id?: string | null
  source_ip?: string | null
  user_agent?: string | null
  device_label?: string | null
  details?: Record<string, unknown>
  description?: string | null
  created_at?: string | null
  org_id?: string | null
}
export type PrivacyRule = Record<string, unknown>
export type NotificationHook = Record<string, unknown>
export interface NotificationFeedItem {
  id: string
  org_id?: string | null
  user_id: string
  type: string
  title: string
  body?: string | null
  link_url?: string | null
  severity: string
  is_read: boolean
  read_at?: string | null
  meta_json: Record<string, unknown>
  created_at: string
}
export type ReportExport = Record<string, unknown>
export type ReportSchedule = Record<string, unknown>
export interface SupportMessage {
  id: string
  thread_id: string
  author_id: string
  author_name: string
  author_role: string
  body: string
  created_at: string
  attachments: SupportMessageAttachment[]
  meta_json?: Record<string, unknown>
  read_by?: string[]
  read_at_map?: Record<string, string>
  event_type?: string
  media_kind?: string | null
  reply_to_message_id?: string | null
  reply_preview?: {
    id?: string
    author_name?: string
    body?: string
  } | null
  forwarded_from?: {
    message_id?: string
    author_name?: string
    body?: string
  } | null
  edited_at?: string | null
  deleted_for_all?: boolean
  call_status?: 'accepted' | 'missed' | 'ended' | null
  duration_seconds?: number | null
  encryption?: {
    scheme?: string
    algorithm?: string
    ciphertext_b64?: string
    iv_b64?: string
    key_version?: number
    aad_b64?: string
  } | null
}

export interface SupportMessageAttachment {
  id: string
  file_name: string
  content_type: string
  size_bytes: number
  url?: string | null
  encryption?: {
    scheme?: string
    algorithm?: string
    iv_b64?: string
    key_version?: number
    encrypted_blob?: boolean
    original_size_bytes?: number
  } | null
}

export interface SupportThread {
  id: string
  org_id: string
  requester_id: string
  requester_name: string
  requester_role: string
  subject: string
  request_type?: string
  meta_json?: Record<string, unknown>
  status: 'open' | 'answered' | 'closed'
  priority?: string
  assigned_to?: string | null
  created_at: string
  updated_at: string
  last_message_preview?: string | null
  unread_count: number
  thread_kind?: 'direct' | 'group'
  avatar_url?: string | null
  group_avatar?: {
    id: string
    file_name?: string | null
    content_type?: string | null
    size_bytes?: number | null
    url?: string | null
  } | null
  group_admin_ids?: string[]
  current_user_group_permissions?: {
    manage_info: boolean
    manage_members: boolean
    manage_admins: boolean
  } | null
  participant_ids?: string[]
  participant_profiles?: Array<{
    id: string
    name: string
    role?: string
    avatar_url?: string | null
    last_seen_at?: string | null
    is_group_admin?: boolean
    group_permissions?: {
      manage_info?: boolean
      manage_members?: boolean
      manage_admins?: boolean
    } | null
  }>
  pinned_message_ids?: string[]
  is_archived?: boolean
  is_muted?: boolean
  is_pinned?: boolean
  messages: SupportMessage[]
}

export interface SupportStats {
  total: number
  open: number
  answered: number
  closed: number
  unread_total: number
}

// ── Metrics ──

export interface SessionMetrics {
  id: string
  org_id: string
  session_id: string
  user_id: string
  started_at: string
  ended_at?: string | null
  duration_seconds?: number | null
  device_name?: string | null
  os_name?: string | null
  ip_address?: string | null
  actions_count?: number
  pages_visited?: number
  last_activity_at?: string | null
}

export interface UserMetrics {
  user_id: string
  org_id: string
  total_sessions: number
  total_tasks: number
  completed_tasks: number
  total_projects: number
  active_projects: number
  total_story_points?: number
  average_session_duration?: number | null
  last_active_at?: string | null
  start_date?: string
  end_date?: string
  project_id?: string
}
