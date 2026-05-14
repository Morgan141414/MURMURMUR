import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  MessageSquareMore,
  BarChart3,
  Plus,
  Send,
  Star,
  UserCheck,
  UserMinus,
  Users,
  Settings,
  Pause,
  Play,
  LayoutGrid,
  List,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateUserHRProfile, useUsers } from '@/hooks/useAdmin'
import { createProjectTask, updateProjectTask } from '@/api/board'
import { fetchHRDocumentContent } from '@/api/hr'
import { useMyBoardTasks } from '@/hooks/useBoard'
import { useMyTeams } from '@/hooks/useTeams'
import { queryKeys } from '@/lib/queryKeys'
import { accessVacancyApplicationAttachment } from '@/api/vacancies'
import {
  useCreateHiringOffer,
  useCreateRecruiterNote,
  useCreateVacancy,
  useCreateVacancyInterview,
  useHiringOffers,
  useOrgInterviews,
  useRecruiterNotes,
  useVacancies,
  useVacancyAnalytics,
  useVacancyApplications,
  useVacancyInterviews,
  useUpdateHiringOffer,
  useUpdateVacancy,
  useUpdateVacancyApplication,
  useUpdateVacancyInterview,
} from '@/hooks/useVacancies'
import {
  useCreateEmployeeChangeRequest,
  useCreateHRDocument,
  useCreateOffboarding,
  useCreateOnboarding,
  useCreateTerminationOrder,
  useCreateMessageTemplate,
  useDeleteMessageTemplate,
  useEmployeeChangeRequests,
  useExecuteTerminationOrder,
  useHRAnalytics,
  useHRDocuments,
  useLeaveRequests,
  useMessageTemplates,
  useOffboarding,
  useOnboarding,
  useTerminationOrders,
  useToggleOnboardingChecklist,
  useUpdateEmployeeChangeRequest,
  useUpdateHRDocument,
  useUpdateLeaveRequest,
  useUpdateMessageTemplate,
  useUpdateOffboarding,
  useUpdateOnboarding,
} from '@/hooks/useHR'
import type { InterviewSession, MessageTemplate, OrgRole, User } from '@/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/types'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FormField } from '@/components/shared/FormField'
import { EntityActivityFeed } from '@/components/shared/EntityActivityFeed'
import { Button } from '@/components/ui/button'

type HRTab = 'overview' | 'vacancies' | 'candidates' | 'interviews' | 'offers' | 'onboarding' | 'offboarding' | 'documents' | 'leave' | 'analytics' | 'employees' | 'tasks' | 'settings'
type DocumentFolderKey = 'company' | 'employee' | 'legal' | 'compliance' | 'other'

const KANBAN_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const
const KANBAN_STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}
const KANBAN_STAGE_COLORS: Record<string, string> = {
  applied: 'border-blue-500/40',
  screening: 'border-indigo-500/40',
  interview: 'border-amber-500/40',
  offer: 'border-emerald-500/40',
  hired: 'border-green-500/40',
  rejected: 'border-red-500/40',
}
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#22c55e', '#ef4444', '#06b6d4', '#ec4899']

const TEMPLATE_TYPES = [
  { value: 'interview_invite', label: 'Приглашение на интервью' },
  { value: 'rejection', label: 'Отказ' },
  { value: 'offer', label: 'Оффер' },
  { value: 'document_request', label: 'Запрос документов' },
  { value: 'onboarding_welcome', label: 'Приветственное письмо' },
  { value: 'general', label: 'Общий шаблон' },
]

const HR_MANAGE_ROLES: OrgRole[] = ['founder', 'ceo', 'hr', 'admin', 'sysadmin']
const HR_FINAL_DECISION_ROLES: OrgRole[] = ['founder', 'ceo', 'sysadmin']
const HIRING_MANAGE_ROLES: OrgRole[] = ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager']

const DOCUMENT_TEMPLATES = [
  {
    key: 'employment_contract',
    label: 'Трудовой договор',
    documentType: 'contract',
    category: 'employee',
    signers: ['HR', 'CEO', 'Сотрудник'],
    titlePrefix: 'Трудовой договор',
  },
  {
    key: 'nda',
    label: 'NDA',
    documentType: 'agreement',
    category: 'legal',
    signers: ['Legal', 'Сотрудник'],
    titlePrefix: 'NDA',
  },
  {
    key: 'offer_pack',
    label: 'Оффер-пакет',
    documentType: 'agreement',
    category: 'employee',
    signers: ['HR', 'Hiring manager', 'Кандидат'],
    titlePrefix: 'Оффер-пакет',
  },
  {
    key: 'document_request',
    label: 'Запрос документов',
    documentType: 'certificate',
    category: 'compliance',
    signers: ['HR', 'Сотрудник'],
    titlePrefix: 'Запрос документов',
  },
]

const inputClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring'
const selectClass = inputClass
const textareaClass = 'min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring'

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  awaiting_signature: 'Ожидает подписи',
  signed: 'Подписан',
}

const DOCUMENT_FOLDERS: Array<{
  key: DocumentFolderKey
  title: string
  description: string
}> = [
  { key: 'company', title: 'Документы компании', description: 'Реквизиты, внутренние регламенты и орг. документы' },
  { key: 'employee', title: 'Документы сотрудников', description: 'Трудовые договоры, офферы, персональные документы' },
  { key: 'legal', title: 'Юридический пакет', description: 'NDA, соглашения и документы legal-блока' },
  { key: 'compliance', title: 'Compliance', description: 'Проверки и обязательные документы соответствия' },
  { key: 'other', title: 'Прочие документы', description: 'Документы без явной категории' },
]

const PROCESS_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  in_progress: 'В работе',
  blocked: 'Заблокирован',
  completed: 'Завершён',
}

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  onboarding: 'Онбординг',
  probation: 'Испытательный срок',
  leave: 'В отпуске',
  suspended: 'Приостановлен',
  offboarding: 'Оффбординг',
  inactive: 'Неактивен',
}

const EMPLOYEE_CHANGE_TYPE_LABELS: Record<string, string> = {
  profile_update: 'Изменение профиля',
  status_change: 'Смена статуса',
  salary_review: 'Пересмотр условий',
  manager_change: 'Смена менеджера',
  department_transfer: 'Перевод в другой отдел',
}

function dedupeOfferApprovals(items: Array<{ user_id?: string | null; name: string; role?: string | null; status: string; note?: string | null; decided_at?: string | null }>) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.user_id || `${item.name}-${item.role || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatEmployeeChangeValue(key: string, value: unknown, users: User[]) {
  if (value == null || value === '') return '—'
  if (key === 'manager_id') {
    return users.find((user) => user.id === value)?.full_name || String(value)
  }
  if (key === 'employee_status') {
    return EMPLOYEE_STATUS_LABELS[String(value)] || String(value)
  }
  return String(value)
}

function fileNameFromDisposition(value?: string): string | null {
  if (!value) return null
  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }
  const plainMatch = value.match(/filename="?([^";]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]
  return null
}

function buildDocumentTemplateContent(templateKey: string, employee: User | null, signers: string[]) {
  const employeeName = employee?.full_name || 'Сотрудник'
  const position = employee?.position || 'должность уточняется'
  const department = employee?.department || 'отдел уточняется'
  const city = employee?.city || 'локация уточняется'
  const workEmail = employee?.work_email || 'work email будет назначен'
  const signersLine = signers.length > 0 ? signers.join(', ') : 'HR'
  const templates: Record<string, string> = {
    employment_contract: [
      `Документ: Трудовой договор`,
      `Сотрудник: ${employeeName}`,
      `Должность: ${position}`,
      `Отдел: ${department}`,
      `Локация: ${city}`,
      `Рабочий email: ${workEmail}`,
      '',
      `Стороны подтверждают намерение оформить трудовые отношения и запустить сотрудника в работу согласно внутренним правилам компании.`,
      `Подписанты: ${signersLine}.`,
    ].join('\n'),
    nda: [
      `Документ: NDA`,
      `Сотрудник: ${employeeName}`,
      `Должность: ${position}`,
      '',
      `Сотрудник обязуется сохранять конфиденциальность данных компании, клиентов и внутренних процессов.`,
      `Подписанты: ${signersLine}.`,
    ].join('\n'),
    offer_pack: [
      `Документ: Оффер-пакет`,
      `Кандидат/сотрудник: ${employeeName}`,
      `Роль: ${position}`,
      `Команда: ${department}`,
      '',
      `Пакет включает оффер, условия выхода, согласование доступов и базовый welcome-flow.`,
      `Подписанты: ${signersLine}.`,
    ].join('\n'),
    document_request: [
      `Документ: Запрос документов`,
      `Получатель: ${employeeName}`,
      '',
      `Просим предоставить пакет документов для кадрового оформления и проверки compliance.`,
      `Подписанты: ${signersLine}.`,
    ].join('\n'),
    employment_confirmation: [
      `Документ: Справка о занятости`,
      `Сотрудник: ${employeeName}`,
      `Должность: ${position}`,
      `Отдел: ${department}`,
      `Город: ${city}`,
      `Рабочий email: ${workEmail}`,
      '',
      `Настоящим подтверждается занятость сотрудника в компании на указанных условиях.`,
    ].join('\n'),
  }
  return templates[templateKey] || ''
}

function interpolateTemplateBody(templateBody: string, values: Record<string, string>) {
  return templateBody.replace(/\{(\w+)\}/g, (_, key: string) => values[key] || '')
}

function resolveDocumentFolder(document: { employee_id?: string | null; document_type?: string | null; meta_json?: Record<string, unknown> }): DocumentFolderKey {
  const category = String(document.meta_json?.category ?? '').toLowerCase()
  if (category.includes('company')) return 'company'
  if (category.includes('employee')) return 'employee'
  if (category.includes('legal')) return 'legal'
  if (category.includes('compliance')) return 'compliance'

  const type = String(document.document_type ?? '').toLowerCase()
  if (type.includes('certificate')) return 'company'
  if (type.includes('contract') || type.includes('order')) return document.employee_id ? 'employee' : 'company'
  if (type.includes('agreement')) return 'legal'

  if (document.employee_id) return 'employee'
  return 'other'
}

function buildDefaultOnboardingChecklist() {
  return [
    { label: 'Подготовить offer pack и welcome-письмо', done: false, owner: 'HR', area: 'hr' },
    { label: 'Собрать документы сотрудника', done: false, owner: 'HR', area: 'documents' },
    { label: 'Передать данные в бухгалтерию', done: false, owner: 'Accounting', area: 'accounting' },
    { label: 'Передать данные в IT на доступы и технику', done: false, owner: 'IT', area: 'it' },
    { label: 'Передать данные юристам / compliance', done: false, owner: 'Legal', area: 'legal' },
    { label: 'Подписать договор и NDA', done: false, owner: 'Employee + CEO', area: 'documents' },
    { label: 'Назначить задачи на первый спринт', done: false, owner: 'Manager', area: 'manager' },
    { label: 'Проверить прохождение испытательного срока', done: false, owner: 'HR', area: 'probation' },
  ]
}

function resolveTab(pathname: string): HRTab {
  const normalized = pathname.toLowerCase()
  if (normalized.startsWith('/company/hr/')) {
    const suffix = normalized.slice('/company/hr/'.length).split('/')[0]
    if (suffix === 'vacancies') return 'vacancies'
    if (suffix === 'candidates') return 'candidates'
    if (suffix === 'interviews') return 'interviews'
    if (suffix === 'offers') return 'offers'
    if (suffix === 'analytics') return 'analytics'
    if (suffix === 'onboarding') return 'onboarding'
    if (suffix === 'offboarding') return 'offboarding'
    if (suffix === 'documents' || suffix === 'signatures') return 'documents'
    if (suffix === 'leave') return 'leave'
    if (suffix === 'employees') return 'employees'
    if (suffix === 'tasks') return 'tasks'
    if (suffix === 'settings') return 'settings'
  }
  return 'overview'
}

export default function HRWorkspacePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { activeOrgId } = useOrgStore()
  const org = useOrgStore((s) => s.activeOrg())
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const currentUserId = useAuthStore((s) => s.userId)
  const { data: users = [], isLoading: usersLoading } = useUsers(activeOrgId ?? '')
  const { data: myBoardTasks = [] } = useMyBoardTasks(activeOrgId, 'active')
  const { data: myTeams = [] } = useMyTeams(activeOrgId)
  const updateUserHRProfile = useUpdateUserHRProfile(activeOrgId ?? '')
  const { data: vacancies = [], isLoading: vacanciesLoading } = useVacancies(activeOrgId)
  const { data: vacancyAnalytics, isLoading: vacancyAnalyticsLoading } = useVacancyAnalytics(activeOrgId)
  const { data: hrAnalytics, isLoading: hrAnalyticsLoading } = useHRAnalytics(activeOrgId)
  const { data: onboarding = [], isLoading: onboardingLoading } = useOnboarding(activeOrgId)
  const { data: offboarding = [], isLoading: offboardingLoading } = useOffboarding(activeOrgId)
  const { data: terminationOrders = [], isLoading: terminationOrdersLoading } = useTerminationOrders(activeOrgId)
  const { data: leaveRequests = [], isLoading: leaveLoading } = useLeaveRequests(activeOrgId)
  const { data: documents = [], isLoading: documentsLoading } = useHRDocuments(activeOrgId)
  const { data: employeeChangeRequests = [], isLoading: employeeChangeRequestsLoading } = useEmployeeChangeRequests(activeOrgId)
  const createVacancy = useCreateVacancy(activeOrgId ?? '')
  const createOnboarding = useCreateOnboarding(activeOrgId ?? '')
  const updateOnboarding = useUpdateOnboarding(activeOrgId ?? '')
  const createOffboarding = useCreateOffboarding(activeOrgId ?? '')
  const createTerminationOrder = useCreateTerminationOrder(activeOrgId ?? '')
  const executeTerminationOrder = useExecuteTerminationOrder(activeOrgId ?? '')
  const updateOffboarding = useUpdateOffboarding(activeOrgId ?? '')
  const createDocument = useCreateHRDocument(activeOrgId ?? '')
  const createEmployeeChangeRequest = useCreateEmployeeChangeRequest(activeOrgId ?? '')
  const updateEmployeeChangeRequest = useUpdateEmployeeChangeRequest(activeOrgId ?? '')
  const updateDocument = useUpdateHRDocument(activeOrgId ?? '')
  const updateLeaveRequest = useUpdateLeaveRequest(activeOrgId ?? '')
  const [selectedVacancyId, setSelectedVacancyId] = useState('')
  const { data: applications = [], isLoading: applicationsLoading } = useVacancyApplications(activeOrgId, selectedVacancyId || null)
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const { data: interviews = [], isLoading: interviewsLoading } = useVacancyInterviews(activeOrgId, selectedVacancyId || null, selectedApplicationId || null)
  const { data: offers = [], isLoading: offersLoading } = useHiringOffers(activeOrgId, selectedVacancyId || null, selectedApplicationId || null)
  const { data: notes = [], isLoading: notesLoading } = useRecruiterNotes(activeOrgId, selectedVacancyId || null, selectedApplicationId || null)
  const createInterview = useCreateVacancyInterview(activeOrgId ?? '', selectedVacancyId || '', selectedApplicationId || '')
  const createOffer = useCreateHiringOffer(activeOrgId ?? '', selectedVacancyId || '', selectedApplicationId || '')
  const createNote = useCreateRecruiterNote(activeOrgId ?? '', selectedVacancyId || '', selectedApplicationId || '')
  const updateApplication = useUpdateVacancyApplication(activeOrgId ?? '', selectedVacancyId || '')
  const updateVacancy = useUpdateVacancy(activeOrgId ?? '')
  const updateOffer = useUpdateHiringOffer(activeOrgId ?? '', selectedVacancyId || '', selectedApplicationId || '')
  const updateInterview = useUpdateVacancyInterview(activeOrgId ?? '', selectedVacancyId || '', selectedApplicationId || '')
  const toggleChecklist = useToggleOnboardingChecklist(activeOrgId ?? '')
  const { data: messageTemplates = [], isLoading: templatesLoading } = useMessageTemplates(activeOrgId)
  const createTemplate = useCreateMessageTemplate(activeOrgId ?? '')
  const updateTemplate = useUpdateMessageTemplate(activeOrgId ?? '')
  const deleteTemplate = useDeleteMessageTemplate(activeOrgId ?? '')
  const activeTab = resolveTab(location.pathname)
  const documentFileInputRef = useRef<HTMLInputElement | null>(null)
  const [vacancyTitle, setVacancyTitle] = useState('')
  const [vacancyCity, setVacancyCity] = useState('')
  const [vacancyDepartment, setVacancyDepartment] = useState('')
  const [vacancySalaryFrom, setVacancySalaryFrom] = useState('')
  const [vacancySalaryTo, setVacancySalaryTo] = useState('')
  const [vacancyFormat, setVacancyFormat] = useState('hybrid')
  const [vacancyGrade, setVacancyGrade] = useState('')
  const [vacancyRequirements, setVacancyRequirements] = useState('')
  const [vacancyResponsibilities, setVacancyResponsibilities] = useState('')
  const [vacancyConditions, setVacancyConditions] = useState('')
  const [editingVacancyId, setEditingVacancyId] = useState('')
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidateStageFilter, setCandidateStageFilter] = useState('all')
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('all')
  const [candidateOwnerFilter, setCandidateOwnerFilter] = useState('all')
  const [candidateExperienceFilter, setCandidateExperienceFilter] = useState('all')
  const [candidateEducationFilter, setCandidateEducationFilter] = useState('all')
  const [candidateCityFilter, setCandidateCityFilter] = useState('all')
  const [candidateSkillFilter, setCandidateSkillFilter] = useState('')
  const [candidateSalaryMinFilter, setCandidateSalaryMinFilter] = useState('')
  const [candidateSalaryMaxFilter, setCandidateSalaryMaxFilter] = useState('')
  const [candidateTags, setCandidateTags] = useState('')
  const [candidateVerificationStatus, setCandidateVerificationStatus] = useState('unverified')
  const [candidateRecommendation, setCandidateRecommendation] = useState('')
  const [candidateSummary, setCandidateSummary] = useState('')
  const [candidateRating, setCandidateRating] = useState('')
  const [candidateRejectionReason, setCandidateRejectionReason] = useState('')
  const [candidateRejectionTemplateId, setCandidateRejectionTemplateId] = useState('')
  const [candidateNextStepAt, setCandidateNextStepAt] = useState('')
  const [candidateOwnerId, setCandidateOwnerId] = useState('')
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [candidateAttachments, setCandidateAttachments] = useState<Array<{
    id: string
    file_name: string
    content_type?: string | null
    data_url: string
    size: number
  }>>([])
  const [noteText, setNoteText] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewDuration, setInterviewDuration] = useState('60')
  const [interviewFormat, setInterviewFormat] = useState('online')
  const [interviewLocation, setInterviewLocation] = useState('')
  const [interviewMeetingLink, setInterviewMeetingLink] = useState('')
  const [interviewInterviewerId, setInterviewInterviewerId] = useState('')
  const [interviewParticipantIds, setInterviewParticipantIds] = useState<string[]>([])
  const [interviewComment, setInterviewComment] = useState('')
  const [interviewInvitationMessage, setInterviewInvitationMessage] = useState('')
  const [interviewTemplateId, setInterviewTemplateId] = useState('')
  const [offerTitle, setOfferTitle] = useState('Job Offer')
  const [offerSalary, setOfferSalary] = useState('')
  const [offerCurrency, setOfferCurrency] = useState('USD')
  const [offerTerms, setOfferTerms] = useState('')
  const [offerBenefits, setOfferBenefits] = useState('')
  const [offerApprovalNote, setOfferApprovalNote] = useState('')
  const [offerTemplateId, setOfferTemplateId] = useState('')
  const [onboardingEmployeeId, setOnboardingEmployeeId] = useState('')
  const [onboardingMentorId, setOnboardingMentorId] = useState('')
  const [onboardingTitle, setOnboardingTitle] = useState('')
  const [onboardingStartDate, setOnboardingStartDate] = useState('')
  const [onboardingProbationEnd, setOnboardingProbationEnd] = useState('')
  const [onboardingNotes, setOnboardingNotes] = useState('')
  const [offboardingEmployeeId, setOffboardingEmployeeId] = useState('')
  const [offboardingReason, setOffboardingReason] = useState('')
  const [offboardingLastDay, setOffboardingLastDay] = useState('')
  const [offboardingDocumentTitle, setOffboardingDocumentTitle] = useState('Приказ на увольнение')
  const [offboardingDocumentBody, setOffboardingDocumentBody] = useState('')
  const [offboardingApproverIds, setOffboardingApproverIds] = useState<string[]>([])
  const [offboardingApproverPickerOpen, setOffboardingApproverPickerOpen] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [documentType, setDocumentType] = useState('contract')
  const [documentEmployeeId, setDocumentEmployeeId] = useState('')
  const [documentSigners, setDocumentSigners] = useState('')
  const [documentCategory, setDocumentCategory] = useState('employee')
  const [documentTemplateKey, setDocumentTemplateKey] = useState('')
  const [documentBody, setDocumentBody] = useState('')
  const [documentMessageTemplateId, setDocumentMessageTemplateId] = useState('')
  const [documentFile, setDocumentFile] = useState<{
    file_name: string
    content_type?: string | null
    size: number
    data_url: string
  } | null>(null)
  const [documentAuditId, setDocumentAuditId] = useState('')
  const [documentFolderFilter, setDocumentFolderFilter] = useState<'all' | DocumentFolderKey>('all')

  // Candidate extra filters
  const [candidateTagsFilter, setCandidateTagsFilter] = useState('')
  const [candidateVerificationFilter, setCandidateVerificationFilter] = useState('all')
  const [candidateFavoriteFilter, setCandidateFavoriteFilter] = useState(false)
  const [candidateSourceFilter, setCandidateSourceFilter] = useState('all')
  const [candidateViewMode, setCandidateViewMode] = useState<'list' | 'kanban'>('list')
  const [draggingCandidateId, setDraggingCandidateId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  // Interview feedback state
  const [interviewFeedbackMap, setInterviewFeedbackMap] = useState<Record<string, { score: string; feedback: string }>>({})

  // Tasks tab local state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')

  // Settings tab state
  const [templateName, setTemplateName] = useState('')
  const [templateType, setTemplateType] = useState('general')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [employeeStatus, setEmployeeStatus] = useState('active')
  const [employeeWorkEmail, setEmployeeWorkEmail] = useState('')
  const [employeeDepartment, setEmployeeDepartment] = useState('')
  const [employeeWorkFormat, setEmployeeWorkFormat] = useState('hybrid')
  const [employeeManagerId, setEmployeeManagerId] = useState('')
  const [employeePosition, setEmployeePosition] = useState('')
  const [employeeCity, setEmployeeCity] = useState('')
  const [employeePhone, setEmployeePhone] = useState('')
  const [employeeRecommendation, setEmployeeRecommendation] = useState('')
  const [employeeChangeType, setEmployeeChangeType] = useState('profile_update')
  const [employeeChangeComment, setEmployeeChangeComment] = useState('')

  useEffect(() => {
    if (!selectedVacancyId && vacancies.length > 0) {
      setSelectedVacancyId(vacancies[0].id)
    }
  }, [selectedVacancyId, vacancies])

  useEffect(() => {
    if (!selectedEmployeeId && users.length > 0) {
      setSelectedEmployeeId(users[0].id)
    }
  }, [selectedEmployeeId, users])

  useEffect(() => {
    if (!documentAuditId && documents.length > 0) {
      setDocumentAuditId(documents[0].id)
      return
    }
    if (documentAuditId && !documents.some((item) => item.id === documentAuditId)) {
      setDocumentAuditId(documents[0]?.id ?? '')
    }
  }, [documentAuditId, documents])

  useEffect(() => {
    if (!selectedVacancyId) {
      setSelectedApplicationId('')
      return
    }
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0].id)
      return
    }
    if (selectedApplicationId && !applications.some((item) => item.id === selectedApplicationId)) {
      setSelectedApplicationId(applications[0]?.id ?? '')
    }
  }, [applications, selectedApplicationId, selectedVacancyId])

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const vacancyMap = useMemo(() => new Map(vacancies.map((vacancy) => [vacancy.id, vacancy])), [vacancies])
  const selectedVacancy = selectedVacancyId ? vacancyMap.get(selectedVacancyId) ?? null : null
  const selectedApplication = selectedApplicationId ? applications.find((item) => item.id === selectedApplicationId) ?? null : null
  const selectedEmployee = selectedEmployeeId ? userMap.get(selectedEmployeeId) ?? null : null
  const interviewDateFrom = interviewDate ? new Date(interviewDate).toISOString() : null
  const { data: interviewerSchedule = [], isLoading: interviewerScheduleLoading } = useOrgInterviews(
    activeOrgId,
    interviewInterviewerId || null,
    interviewDateFrom,
    null,
  )
  useEffect(() => {
    if (!selectedApplication) {
      setCandidateTags('')
      setCandidateVerificationStatus('unverified')
      setCandidateRecommendation('')
      setCandidateSummary('')
      setCandidateRating('')
      setCandidateRejectionReason('')
      setCandidateNextStepAt('')
      setCandidateAttachments([])
      return
    }
    setCandidateTags((selectedApplication.tags || []).join(', '))
    setCandidateVerificationStatus(selectedApplication.verification_status || 'unverified')
    setCandidateRecommendation(selectedApplication.service_recommendation || '')
    setCandidateSummary(selectedApplication.recruiter_summary || '')
    setCandidateRating(selectedApplication.rating != null ? String(selectedApplication.rating) : '')
    setCandidateRejectionReason(selectedApplication.rejection_reason || '')
    setCandidateNextStepAt(selectedApplication.next_step_at ? selectedApplication.next_step_at.slice(0, 16) : '')
    setCandidateOwnerId(selectedApplication.owner_recruiter_id || '')
    setCandidateAttachments(selectedApplication.attachments || [])
  }, [selectedApplication])

  useEffect(() => {
    setSelectedCandidateIds((current) => current.filter((id) => applications.some((item) => item.id === id)))
  }, [applications])

  useEffect(() => {
    if (!selectedEmployee) {
      setEmployeeStatus('active')
      setEmployeeWorkEmail('')
      setEmployeeDepartment('')
      setEmployeeWorkFormat('hybrid')
      setEmployeeManagerId('')
      setEmployeePosition('')
      setEmployeeCity('')
      setEmployeePhone('')
      setEmployeeRecommendation('')
      return
    }
    setEmployeeStatus(selectedEmployee.employee_status || 'active')
    setEmployeeWorkEmail(selectedEmployee.work_email || '')
    setEmployeeDepartment(selectedEmployee.department || '')
    setEmployeeWorkFormat(selectedEmployee.work_format || 'hybrid')
    setEmployeeManagerId(selectedEmployee.manager_id || '')
    setEmployeePosition(selectedEmployee.position || '')
    setEmployeeCity(selectedEmployee.city || '')
    setEmployeePhone(selectedEmployee.phone || '')
    setEmployeeRecommendation(selectedEmployee.employee_recommendation || '')
  }, [selectedEmployee])

  useEffect(() => {
    if (!editingVacancyId) return
    const vacancy = vacancyMap.get(editingVacancyId)
    if (!vacancy) return
    const sections = (vacancy.description || '').split('\n\n')
    const departmentLine = sections.find((section) => section.startsWith('Отдел: '))
    setVacancyTitle(vacancy.title || '')
    setVacancyCity(vacancy.city || '')
    setVacancyDepartment(departmentLine ? departmentLine.replace('Отдел: ', '') : '')
    setVacancySalaryFrom(vacancy.salary_from != null ? String(vacancy.salary_from) : '')
    setVacancySalaryTo(vacancy.salary_to != null ? String(vacancy.salary_to) : '')
    setVacancyFormat(vacancy.employment_type || 'hybrid')
    setVacancyGrade(vacancy.experience_years != null ? String(vacancy.experience_years) : '')
    setVacancyRequirements((vacancy.skills || []).join(', '))
    setVacancyResponsibilities(sections[2] || '')
    setVacancyConditions(sections[3] || '')
  }, [editingVacancyId, vacancyMap])

  const filteredApplications = useMemo(() => {
    const query = candidateQuery.trim().toLowerCase()
    const tagsFilter = candidateTagsFilter.trim().toLowerCase()
    const skillFilter = candidateSkillFilter.trim().toLowerCase()
    const minSalary = candidateSalaryMinFilter ? Number(candidateSalaryMinFilter) : null
    const maxSalary = candidateSalaryMaxFilter ? Number(candidateSalaryMaxFilter) : null
    return applications.filter((item) => {
      const applicant = item.applicant_user_id ? userMap.get(item.applicant_user_id) : undefined
      const matchesQuery =
        !query ||
        item.full_name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.phone || '').toLowerCase().includes(query)
      const matchesStage = candidateStageFilter === 'all' || item.stage === candidateStageFilter
      const matchesStatus = candidateStatusFilter === 'all' || item.status === candidateStatusFilter
      const matchesTags = !tagsFilter || (item.tags || []).some((tag) => tag.toLowerCase().includes(tagsFilter))
      const matchesVerification = candidateVerificationFilter === 'all' || (item.verification_status || 'unverified') === candidateVerificationFilter
      const matchesFavorite = !candidateFavoriteFilter || !!item.is_favorite
      const matchesSource = candidateSourceFilter === 'all' || item.source === candidateSourceFilter
      const matchesOwner = candidateOwnerFilter === 'all' || (item.owner_recruiter_id || 'unassigned') === candidateOwnerFilter
      const experience = applicant?.experience_years ?? null
      const matchesExperience =
        candidateExperienceFilter === 'all' ||
        (candidateExperienceFilter === '0-2' && experience != null && experience <= 2) ||
        (candidateExperienceFilter === '3-5' && experience != null && experience >= 3 && experience <= 5) ||
        (candidateExperienceFilter === '6+' && experience != null && experience >= 6)
      const educationValue = (applicant?.education || '').toLowerCase()
      const matchesEducation =
        candidateEducationFilter === 'all' ||
        (candidateEducationFilter === 'higher' && /(higher|bachelor|master|универ|degree)/.test(educationValue)) ||
        (candidateEducationFilter === 'technical' && /(technical|bootcamp|college|тех|колледж)/.test(educationValue)) ||
        (candidateEducationFilter === 'other' && !!educationValue && !/(higher|bachelor|master|универ|degree|technical|bootcamp|college|тех|колледж)/.test(educationValue))
      const cityValue = (applicant?.city || '').trim().toLowerCase()
      const matchesCity = candidateCityFilter === 'all' || cityValue === candidateCityFilter.toLowerCase()
      const skills = applicant?.skills || []
      const matchesSkill = !skillFilter || skills.some((skill) => skill.toLowerCase().includes(skillFilter))
      const desiredSalary = applicant?.desired_salary ?? null
      const matchesMinSalary = minSalary == null || (desiredSalary != null && desiredSalary >= minSalary)
      const matchesMaxSalary = maxSalary == null || (desiredSalary != null && desiredSalary <= maxSalary)
      return matchesQuery && matchesStage && matchesStatus && matchesTags && matchesVerification && matchesFavorite && matchesSource && matchesOwner && matchesExperience && matchesEducation && matchesCity && matchesSkill && matchesMinSalary && matchesMaxSalary
    })
  }, [applications, candidateCityFilter, candidateEducationFilter, candidateExperienceFilter, candidateFavoriteFilter, candidateOwnerFilter, candidateQuery, candidateSalaryMaxFilter, candidateSalaryMinFilter, candidateSkillFilter, candidateSourceFilter, candidateStageFilter, candidateStatusFilter, candidateTagsFilter, candidateVerificationFilter, userMap])

  const candidateSources = useMemo(() => {
    const sources = new Set<string>()
    applications.forEach((item) => { if (item.source) sources.add(item.source) })
    return Array.from(sources)
  }, [applications])

  const candidateCities = useMemo(() => {
    const cities = new Set<string>()
    applications.forEach((item) => {
      const city = item.applicant_user_id ? userMap.get(item.applicant_user_id)?.city : null
      if (city) cities.add(city)
    })
    return Array.from(cities).sort((a, b) => a.localeCompare(b))
  }, [applications, userMap])

  const recruiterUsers = useMemo(() => (
    users.filter((user) => ['hr', 'recruiter', 'admin', 'ceo', 'founder', 'hiring_manager'].includes(user.org_role || ''))
  ), [users])

  const offboardingApproverCandidates = useMemo(() => (
    users
      .filter((user) => user.id !== offboardingEmployeeId && user.id !== currentUserId)
      .sort((a, b) => {
        const aPriority = ['founder', 'ceo', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'].includes(a.org_role || '') ? 0 : 1
        const bPriority = ['founder', 'ceo', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'].includes(b.org_role || '') ? 0 : 1
        if (aPriority !== bPriority) return aPriority - bPriority
        return (a.full_name || '').localeCompare(b.full_name || '')
      })
  ), [users, offboardingEmployeeId, currentUserId])

  useEffect(() => {
    const allowedIds = new Set(offboardingApproverCandidates.map((user) => user.id))
    setOffboardingApproverIds((current) => current.filter((id) => allowedIds.has(id)))
  }, [offboardingApproverCandidates])

  const interviewParticipantsPreview = useMemo(() => (
    interviewParticipantIds
      .map((id) => userMap.get(id))
      .filter((user): user is User => !!user)
  ), [interviewParticipantIds, userMap])

  const interviewConflictIds = useMemo(() => {
    if (!interviewDate || !interviewDuration) return new Set<string>()
    const start = new Date(interviewDate).getTime()
    const end = start + Number(interviewDuration || 60) * 60_000
    const conflictIds = new Set<string>()
    interviewerSchedule.forEach((item) => {
      if (!item.scheduled_at || !item.duration_minutes) return
      const existingStart = new Date(item.scheduled_at).getTime()
      const existingEnd = existingStart + item.duration_minutes * 60_000
      if (start < existingEnd && existingStart < end) {
        conflictIds.add(item.id)
      }
    })
    return conflictIds
  }, [interviewDate, interviewDuration, interviewerSchedule])

  const interviewUpcomingSchedule = useMemo(() => (
    interviewerSchedule
      .filter((item) => item.scheduled_at)
      .slice(0, 6)
  ), [interviewerSchedule])

  const hrTeamOptions = useMemo(() => (
    myTeams
      .filter((team) => !!team.project_id)
      .map((team) => ({
        teamId: team.id,
        projectId: team.project_id as string,
        label: team.name,
      }))
  ), [myTeams])

  const hrPersistentTasks = useMemo(() => (
    myBoardTasks.filter((task) => task.is_personal).map((task) => ({
      id: task.id,
      title: task.title,
      assignee: task.assignee_id || '',
      dueDate: task.due_date || '',
      priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
      done: task.status === 'done' || task.status === 'completed',
      projectId: task.project_id || '',
      status: task.status,
    }))
  ), [myBoardTasks])

  const dashboardMetrics = useMemo(() => {
    const allApplications = applications
    const hiredCount = allApplications.filter((item) => item.stage === 'hired').length
    const interviewCount = allApplications.filter((item) => item.stage === 'interview').length
    const favoriteCount = allApplications.filter((item) => item.is_favorite).length
    const verifiedCount = allApplications.filter((item) => item.verification_status === 'verified').length
    const avgRating = allApplications.reduce((sum, item) => sum + (item.rating || 0), 0) / (allApplications.filter((item) => item.rating != null).length || 1)
    const sourceStats = allApplications.reduce<Record<string, number>>((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1
      return acc
    }, {})
    const stageStats = KANBAN_STAGES.map((stage) => ({
      stage,
      label: KANBAN_STAGE_LABELS[stage],
      count: allApplications.filter((item) => item.stage === stage).length,
      share: allApplications.length ? Math.round((allApplications.filter((item) => item.stage === stage).length / allApplications.length) * 100) : 0,
    }))
    return {
      hiredCount,
      interviewCount,
      favoriteCount,
      verifiedCount,
      avgRating: Number.isFinite(avgRating) ? avgRating.toFixed(1) : '0.0',
      sourceStats,
      stageStats,
    }
  }, [applications])

  const employeeChangeRequestSummary = useMemo(() => (
    employeeChangeRequests.map((request) => {
      const payload = request.payload_json || {}
      const changes = Object.entries(payload)
        .filter(([, value]) => value != null && value !== '')
        .map(([key, value]) => ({
          key,
          label: key.replace(/_/g, ' '),
          value: formatEmployeeChangeValue(key, value, users),
        }))
      return {
        ...request,
        employeeName: userMap.get(request.employee_id)?.full_name || request.employee_id,
        requestedByName: userMap.get(request.requested_by_id)?.full_name || request.requested_by_id,
        reviewedByName: request.reviewed_by_id ? (userMap.get(request.reviewed_by_id)?.full_name || request.reviewed_by_id) : null,
        changes,
      }
    })
  ), [employeeChangeRequests, userMap, users])

  const templateCollections = useMemo(() => ({
    interviewInvite: messageTemplates.filter((template) => template.template_type === 'interview_invite'),
    rejection: messageTemplates.filter((template) => template.template_type === 'rejection'),
    offer: messageTemplates.filter((template) => template.template_type === 'offer'),
    documentRequest: messageTemplates.filter((template) => template.template_type === 'document_request'),
  }), [messageTemplates])

  if (!activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t('company.noOrgSelected')}</h2>
      </div>
    )
  }

  const tabs: { id: HRTab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: t('hr.overview', 'Обзор'), icon: ClipboardList },
    { id: 'employees', label: 'Сотрудники', icon: Users },
    { id: 'vacancies', label: t('vacancies.title', 'Вакансии'), icon: Briefcase },
    { id: 'candidates', label: t('hr.candidates', 'Кандидаты'), icon: Users },
    { id: 'interviews', label: t('hr.interviews', 'Интервью'), icon: Calendar },
    { id: 'offers', label: t('hr.offers', 'Офферы'), icon: Send },
    { id: 'onboarding', label: t('nav.onboarding'), icon: UserCheck },
    { id: 'offboarding', label: t('nav.offboarding'), icon: UserMinus },
    { id: 'documents', label: t('hr.documents', 'Документы'), icon: FileText },
    { id: 'leave', label: t('nav.leaveAbsence'), icon: Calendar },
    { id: 'analytics', label: t('nav.reports', 'Аналитика'), icon: BarChart3 },
    { id: 'tasks', label: 'Задачи', icon: ClipboardList },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ]

  const tabAllowedRoles: Partial<Record<HRTab, OrgRole[]>> = {
    overview: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager', 'team_lead', 'project_manager'],
    employees: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'],
    vacancies: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager'],
    candidates: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager'],
    interviews: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager'],
    offers: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager'],
    onboarding: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'],
    offboarding: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'],
    documents: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'],
    leave: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'team_lead', 'project_manager', 'hiring_manager'],
    analytics: ['founder', 'ceo', 'hr', 'admin', 'sysadmin'],
    tasks: ['founder', 'ceo', 'hr', 'admin', 'sysadmin', 'recruiter', 'hiring_manager', 'team_lead', 'project_manager'],
    settings: ['founder', 'ceo', 'hr', 'admin', 'sysadmin'],
  }
  const visibleTabs = tabs.filter((tab) => {
    if (!activeRole) return false
    const allowed = tabAllowedRoles[tab.id]
    return !allowed || allowed.includes(activeRole)
  })
  const canManageHRCore = !!activeRole && HR_MANAGE_ROLES.includes(activeRole)
  const canFinalizeHRDecision = !!activeRole && HR_FINAL_DECISION_ROLES.includes(activeRole)
  const canManageHiring = !!activeRole && HIRING_MANAGE_ROLES.includes(activeRole)

  const goToTab = (tab: HRTab) => {
    const routes: Record<HRTab, string> = {
      overview: '/company/hr',
      employees: '/company/hr/employees',
      vacancies: '/company/hr/vacancies',
      candidates: '/company/hr/candidates',
      interviews: '/company/hr/interviews',
      offers: '/company/hr/offers',
      onboarding: '/company/hr/onboarding',
      offboarding: '/company/hr/offboarding',
      documents: '/company/hr/documents',
      leave: '/company/hr/leave',
      analytics: '/company/hr/analytics',
      tasks: '/company/hr/tasks',
      settings: '/company/hr/settings',
    }
    navigate(routes[tab])
  }

  const canAccessActiveTab = visibleTabs.some((tab) => tab.id === activeTab)
  if (!canAccessActiveTab) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="HR рабочий стол"
          description="Доступ к этому разделу ограничен вашей ролью."
          breadcrumbs={[{ label: org?.orgName || 'Компания', to: '/company' }, { label: 'HR' }]}
        />
        <EmptyState title="Нет доступа к разделу" description="Обратитесь к Founder/CEO или HR администратору для изменения прав доступа." />
      </div>
    )
  }

  async function handleCreateVacancy() {
    if (!canManageHiring) {
      toast.error('Недостаточно прав для управления вакансиями')
      return
    }
    if (!vacancyTitle.trim()) return toast.error('Укажите название вакансии')
    const payload = {
      title: vacancyTitle.trim(),
      city: vacancyCity || undefined,
      salary_from: vacancySalaryFrom ? Number(vacancySalaryFrom) : undefined,
      salary_to: vacancySalaryTo ? Number(vacancySalaryTo) : undefined,
      employment_type: vacancyFormat || undefined,
      experience_years: vacancyGrade ? Number(vacancyGrade) : undefined,
      description: [vacancyDepartment && `Отдел: ${vacancyDepartment}`, vacancyRequirements, vacancyResponsibilities, vacancyConditions]
        .filter(Boolean)
        .join('\n\n'),
      skills: vacancyRequirements.split(',').map((item) => item.trim()).filter(Boolean),
    }
    try {
      if (editingVacancyId) {
        await updateVacancy.mutateAsync({
          vacancyId: editingVacancyId,
          body: payload,
        })
        toast.success('Вакансия обновлена')
      } else {
        await createVacancy.mutateAsync({
          ...payload,
          status: 'draft',
        })
        toast.success('Вакансия создана')
      }
      setVacancyTitle('')
      setVacancyCity('')
      setVacancyDepartment('')
      setVacancySalaryFrom('')
      setVacancySalaryTo('')
      setVacancyFormat('hybrid')
      setVacancyGrade('')
      setVacancyRequirements('')
      setVacancyResponsibilities('')
      setVacancyConditions('')
      setEditingVacancyId('')
    } catch {
      toast.error(editingVacancyId ? 'Не удалось обновить вакансию' : 'Не удалось создать вакансию')
    }
  }

  function handleEditVacancy(vacancyId: string) {
    setEditingVacancyId(vacancyId)
  }

  function handleCancelVacancyEdit() {
    setEditingVacancyId('')
    setVacancyTitle('')
    setVacancyCity('')
    setVacancyDepartment('')
    setVacancySalaryFrom('')
    setVacancySalaryTo('')
    setVacancyFormat('hybrid')
    setVacancyGrade('')
    setVacancyRequirements('')
    setVacancyResponsibilities('')
    setVacancyConditions('')
  }

  async function handleVacancyStatusChange(vacancyId: string, status: string) {
    if (!canManageHiring) {
      toast.error('Недостаточно прав для изменения вакансии')
      return
    }
    try {
      await updateVacancy.mutateAsync({ vacancyId, body: { status } })
      toast.success('Статус вакансии обновлён')
    } catch {
      toast.error('Не удалось обновить статус вакансии')
    }
  }

  async function handleCandidateStageChange(applicationId: string, stage: string) {
    try {
      await updateApplication.mutateAsync({ applicationId, body: { stage, status: stage === 'rejected' ? 'rejected' : undefined } })
      toast.success('Этап кандидата обновлён')
    } catch {
      toast.error('Не удалось обновить этап')
    }
  }

  async function toggleCandidateFavorite(applicationId: string, isFavorite: boolean) {
    try {
      await updateApplication.mutateAsync({ applicationId, body: { is_favorite: !isFavorite } })
      toast.success(!isFavorite ? 'Кандидат добавлен в избранное' : 'Кандидат убран из избранного')
    } catch {
      toast.error('Не удалось обновить избранное')
    }
  }

  function toggleCandidateSelection(applicationId: string) {
    setSelectedCandidateIds((current) => (
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId]
    ))
  }

  async function handleBulkCandidateAction(action: 'favorite' | 'reject' | 'screening' | 'interview' | 'assign', payload?: { ownerId?: string }) {
    if (selectedCandidateIds.length === 0) return toast.error('Выберите хотя бы одного кандидата')
    try {
      await Promise.all(selectedCandidateIds.map((applicationId) => {
        const body: Record<string, unknown> = {}
        if (action === 'favorite') body.is_favorite = true
        if (action === 'reject') {
          body.stage = 'rejected'
          body.status = 'rejected'
        }
        if (action === 'screening') body.stage = 'screening'
        if (action === 'interview') body.stage = 'interview'
        if (action === 'assign' && payload?.ownerId) body.owner_recruiter_id = payload.ownerId
        return updateApplication.mutateAsync({ applicationId, body })
      }))
      setSelectedCandidateIds([])
      toast.success('Массовое действие выполнено')
    } catch {
      toast.error('Не удалось выполнить массовое действие')
    }
  }

  async function handleCandidateDrop(applicationId: string, targetStage: string) {
    const application = applications.find((item) => item.id === applicationId)
    if (!application || application.stage === targetStage) return
    try {
      await updateApplication.mutateAsync({
        applicationId,
        body: {
          stage: targetStage,
          status: targetStage === 'rejected' ? 'rejected' : targetStage === 'hired' ? 'hired' : undefined,
        },
      })
      toast.success(`Кандидат переведён в ${KANBAN_STAGE_LABELS[targetStage] || targetStage}`)
    } catch {
      toast.error('Не удалось переместить кандидата')
    } finally {
      setDraggingCandidateId(null)
      setDragOverStage(null)
    }
  }

  async function handleSaveCandidateCard() {
    if (!selectedApplicationId) return
    try {
      await updateApplication.mutateAsync({
        applicationId: selectedApplicationId,
        body: {
          tags: candidateTags.split(',').map((item) => item.trim()).filter(Boolean),
          verification_status: candidateVerificationStatus,
          service_recommendation: candidateRecommendation || undefined,
          recruiter_summary: candidateSummary || undefined,
          rating: candidateRating ? Number(candidateRating) : undefined,
          rejection_reason: candidateRejectionReason || undefined,
          next_step_at: candidateNextStepAt || undefined,
          owner_recruiter_id: candidateOwnerId || undefined,
          attachments: candidateAttachments,
        },
      })
      toast.success('Карточка кандидата обновлена')
    } catch {
      toast.error('Не удалось сохранить карточку кандидата')
    }
  }

  async function handleCandidateAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    try {
      const nextFiles = await Promise.all(files.map(async (file) => {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        return {
          id: crypto.randomUUID(),
          file_name: file.name,
          content_type: file.type || 'application/octet-stream',
          data_url: dataUrl,
          size: file.size,
        }
      }))
      setCandidateAttachments((current) => [...current, ...nextFiles])
      event.target.value = ''
    } catch {
      toast.error('Не удалось загрузить вложения')
    }
  }

  function removeCandidateAttachment(attachmentId: string) {
    setCandidateAttachments((current) => current.filter((item) => item.id !== attachmentId))
  }

  async function handleAccessCandidateAttachment(attachmentId: string, action: 'view' | 'download') {
    if (!activeOrgId || !selectedVacancyId || !selectedApplicationId) return
    const localAttachment = candidateAttachments.find((item) => item.id === attachmentId)
    if (localAttachment?.data_url) {
      if (action === 'download') {
        const link = window.document.createElement('a')
        link.href = localAttachment.data_url
        link.download = localAttachment.file_name
        link.click()
        return
      }
      window.open(localAttachment.data_url, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const { data } = await accessVacancyApplicationAttachment(
        activeOrgId,
        selectedVacancyId,
        selectedApplicationId,
        attachmentId,
        action,
      )
      if (action === 'download') {
        const link = window.document.createElement('a')
        link.href = data.data_url
        link.download = data.file_name
        link.click()
        return
      }
      window.open(data.data_url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить файл с документом')
    }
  }

  async function handleCreateInterview() {
    if (!selectedVacancyId || !selectedApplicationId || !interviewDate) return toast.error('Выберите кандидата и дату интервью')
    try {
      const participants = interviewParticipantIds
        .map((userId) => userMap.get(userId))
        .filter((user): user is User => !!user)
        .map((user) => ({
          user_id: user.id,
          name: user.full_name,
          role: user.org_role || null,
        }))
      const interviewer = interviewInterviewerId ? userMap.get(interviewInterviewerId) : null
      await createInterview.mutateAsync({
        stage: 'interview',
        scheduled_at: interviewDate,
        duration_minutes: interviewDuration ? Number(interviewDuration) : undefined,
        format: interviewFormat,
        location: interviewLocation || undefined,
        meeting_link: interviewMeetingLink || undefined,
        status: 'scheduled',
        result: 'pending',
        invitation_status: 'sent',
        invitation_message: interviewInvitationMessage || undefined,
        interviewer_id: interviewInterviewerId || undefined,
        interviewer_name: interviewer?.full_name || undefined,
        participants_json: participants,
        feedback: interviewComment || undefined,
      })
      setInterviewDate('')
      setInterviewDuration('60')
      setInterviewFormat('online')
      setInterviewLocation('')
      setInterviewMeetingLink('')
      setInterviewInterviewerId('')
      setInterviewParticipantIds([])
      setInterviewComment('')
      setInterviewInvitationMessage('')
      toast.success('Интервью назначено')
    } catch {
      toast.error('Не удалось создать интервью')
    }
  }

  async function handleCreateOffer() {
    if (!selectedVacancyId || !selectedApplicationId || !offerSalary) return toast.error('Укажите сумму оффера')
    const defaultApprovals = dedupeOfferApprovals([
      ...(selectedVacancy?.hiring_manager_id && userMap.get(selectedVacancy.hiring_manager_id)
        ? [{
            user_id: selectedVacancy.hiring_manager_id,
            name: userMap.get(selectedVacancy.hiring_manager_id)?.full_name || 'Hiring manager',
            role: 'hiring_manager',
            status: 'pending',
            note: 'Нужно подтвердить решение по кандидату',
            decided_at: null,
          }]
        : []),
      ...users
        .filter((user) => user.org_role === 'ceo' || user.org_role === 'founder')
        .map((user) => ({
          user_id: user.id,
          name: user.full_name,
          role: user.org_role,
          status: 'pending',
          note: offerApprovalNote || 'Нужно согласовать оффер',
          decided_at: null,
        })),
    ])
    try {
      await createOffer.mutateAsync({
        title: offerTitle || 'Job Offer',
        salary_amount: Number(offerSalary),
        currency: offerCurrency,
        benefits: offerBenefits.split(',').map((item) => item.trim()).filter(Boolean),
        terms: offerTerms || undefined,
        meta_json: {
          approvals: defaultApprovals,
          candidate_response: {
            status: 'pending',
            note: null,
            decided_at: null,
          },
        },
        status: 'sent',
      })
      setOfferSalary('')
      setOfferTerms('')
      setOfferBenefits('')
      setOfferApprovalNote('')
      toast.success('Оффер отправлен')
    } catch {
      toast.error('Не удалось создать оффер')
    }
  }

  async function handleCreateNote() {
    if (!selectedVacancyId || !selectedApplicationId || !noteText.trim()) return
    try {
      await createNote.mutateAsync({ body: noteText.trim(), visibility: 'internal' })
      setNoteText('')
      toast.success('Комментарий добавлен')
    } catch {
      toast.error('Не удалось сохранить комментарий')
    }
  }

  async function handleCreateOnboarding() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для создания онбординга')
      return
    }
    if (!onboardingEmployeeId) return toast.error('Выберите сотрудника')
    try {
      const checklist = buildDefaultOnboardingChecklist()
      await createOnboarding.mutateAsync({
        employee_id: onboardingEmployeeId,
        mentor_id: onboardingMentorId || undefined,
        job_title: onboardingTitle || undefined,
        start_date: onboardingStartDate || undefined,
        status: 'in_progress',
        checklist,
        notes: [
          onboardingNotes && `Примечание HR: ${onboardingNotes}`,
          onboardingProbationEnd && `Испытательный срок до: ${onboardingProbationEnd}`,
        ].filter(Boolean).join('\n'),
        meta_json: {
          probation_end: onboardingProbationEnd || null,
          employee_profile: {
            work_email: userMap.get(onboardingEmployeeId)?.work_email || null,
            department: userMap.get(onboardingEmployeeId)?.department || null,
            location: userMap.get(onboardingEmployeeId)?.city || null,
            format: userMap.get(onboardingEmployeeId)?.work_format || null,
            start_manager: onboardingMentorId || userMap.get(onboardingEmployeeId)?.manager_id || null,
          },
          handoffs: {
            hr: { status: 'in_progress', owner: 'HR', note: 'Оформление и welcome-пакет', due_date: onboardingStartDate || null },
            accounting: { status: 'pending', owner: 'Accounting', note: 'Подготовить payroll и реквизиты', due_date: onboardingStartDate || null },
            it: { status: 'pending', owner: 'IT', note: 'Доступы, техника и рабочие сервисы', due_date: onboardingStartDate || null },
            legal: { status: 'pending', owner: 'Legal', note: 'Договор, NDA и compliance', due_date: onboardingStartDate || null },
          },
        },
      })
      setOnboardingEmployeeId('')
      setOnboardingMentorId('')
      setOnboardingTitle('')
      setOnboardingStartDate('')
      setOnboardingProbationEnd('')
      setOnboardingNotes('')
      toast.success('Онбординг создан')
    } catch {
      toast.error('Не удалось создать онбординг')
    }
  }

  async function handleCreateOffboarding() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для создания оффбординга')
      return
    }
    if (!offboardingEmployeeId) return toast.error('Выберите сотрудника')
    if (offboardingApproverIds.length === 0) {
      toast.error('Выберите минимум одного согласующего для приказа на увольнение')
      return
    }
    try {
      const selectedEmployee = userMap.get(offboardingEmployeeId)
      await createOffboarding.mutateAsync({
        employee_id: offboardingEmployeeId,
        reason: offboardingReason || undefined,
        last_day: offboardingLastDay || undefined,
        status: 'in_progress',
        checklist: [
          { label: 'Закрыть доступы', done: false },
          { label: 'Передать дела', done: false },
          { label: 'Оформить документы', done: false },
        ],
      })
      await createTerminationOrder.mutateAsync({
        target_employee_id: offboardingEmployeeId,
        reason: offboardingReason || undefined,
        last_day: offboardingLastDay || undefined,
        document_title: offboardingDocumentTitle || 'Приказ на увольнение',
        document_body: offboardingDocumentBody || undefined,
        approver_user_ids: offboardingApproverIds,
        meta_json: {
          source: 'hr_workspace_offboarding',
          employee_name: selectedEmployee?.full_name || null,
        },
      })
      setOffboardingEmployeeId('')
      setOffboardingReason('')
      setOffboardingLastDay('')
      setOffboardingDocumentBody('')
      setOffboardingApproverIds([])
      setOffboardingApproverPickerOpen(false)
      toast.success('Оффбординг и приказ на увольнение отправлены на согласование')
    } catch {
      toast.error('Не удалось создать оффбординг')
    }
  }

  function toggleOffboardingApprover(userId: string) {
    setOffboardingApproverIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ))
  }

  async function handleExecuteTermination(orderId: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для исполнения увольнения')
      return
    }
    try {
      await executeTerminationOrder.mutateAsync(orderId)
      toast.success('Сотрудник уволен из компании')
    } catch {
      toast.error('Не удалось исполнить увольнение')
    }
  }

  async function handleCreateDocument() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для создания документа')
      return
    }
    if (!documentName.trim()) return toast.error('Укажите название документа')
    const rawSigners = documentSigners.split(',').map((item) => item.trim()).filter(Boolean)
    const employee = documentEmployeeId ? (userMap.get(documentEmployeeId) || null) : null
    const generatedContent = documentBody.trim() || buildDocumentTemplateContent(documentTemplateKey || '', employee, rawSigners)
    try {
      await createDocument.mutateAsync({
        name: documentName.trim(),
        document_type: documentType,
        employee_id: documentEmployeeId || undefined,
        file_url: documentFile?.data_url,
        meta_json: {
          category: documentCategory,
          signers: rawSigners,
          signature_requests: rawSigners.map((signer) => {
            const matchedUser = users.find((user) => user.full_name?.toLowerCase() === signer.toLowerCase())
            return {
              id: crypto.randomUUID(),
              signer_name: signer,
              signer_user_id: matchedUser?.id || null,
              signer_role: matchedUser?.org_role || null,
              status: 'pending',
              note: null,
              decided_at: null,
            }
          }),
          template_key: documentTemplateKey || null,
          generated_content: generatedContent || null,
          placeholders: {
            employee_name: employee?.full_name || null,
            position: employee?.position || null,
            department: employee?.department || null,
            city: employee?.city || null,
            work_email: employee?.work_email || null,
          },
          file_name: documentFile?.file_name || null,
          content_type: documentFile?.content_type || null,
          size: documentFile?.size || 0,
        },
        status: 'draft',
      })
      setDocumentName('')
      setDocumentType('contract')
      setDocumentEmployeeId('')
      setDocumentSigners('')
      setDocumentCategory('employee')
      setDocumentTemplateKey('')
      setDocumentBody('')
      setDocumentFile(null)
      toast.success('Документ создан')
    } catch {
      toast.error('Не удалось создать документ')
    }
  }

  async function handleDocumentFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      setDocumentFile({
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        size: file.size,
        data_url: dataUrl,
      })
      event.target.value = ''
    } catch {
      toast.error('Не удалось прочитать файл')
    }
  }

  async function changeOnboardingStatus(processId: string, status: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для изменения онбординга')
      return
    }
    try {
      await updateOnboarding.mutateAsync({ processId, body: { status } })
      toast.success('Статус онбординга обновлён')
    } catch {
      toast.error('Не удалось обновить онбординг')
    }
  }

  async function changeOffboardingStatus(processId: string, status: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для изменения оффбординга')
      return
    }
    try {
      await updateOffboarding.mutateAsync({ processId, body: { status } })
      toast.success('Статус оффбординга обновлён')
    } catch {
      toast.error('Не удалось обновить оффбординг')
    }
  }

  async function changeDocumentStatus(documentId: string, status: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для изменения документа')
      return
    }
    try {
      await updateDocument.mutateAsync({ documentId, body: { status } })
      toast.success('Статус документа обновлен')
    } catch {
      toast.error('Не удалось обновить документ')
    }
  }

  function handleApplyDocumentTemplate(templateKey: string) {
    setDocumentTemplateKey(templateKey)
    const template = DOCUMENT_TEMPLATES.find((item) => item.key === templateKey)
    if (!template) return
    setDocumentType(template.documentType)
    setDocumentCategory(template.category)
    setDocumentSigners(template.signers.join(', '))
    if (!documentName.trim()) {
      setDocumentName(template.titlePrefix)
    }
    const employee = documentEmployeeId ? (userMap.get(documentEmployeeId) || null) : null
    setDocumentBody(buildDocumentTemplateContent(templateKey, employee, template.signers))
  }

  async function handleRequestDocumentSignatures(documentId: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для запроса подписей')
      return
    }
    const document = documents.find((item) => item.id === documentId)
    if (!document) return
    const currentRequests = document.meta_json.signature_requests || []
    const refreshedRequests = currentRequests.length > 0
      ? currentRequests
      : (document.meta_json.signers || []).map((signer) => ({
          id: crypto.randomUUID(),
          signer_name: signer,
          signer_user_id: null,
          signer_role: null,
          status: 'pending',
          note: null,
          decided_at: null,
        }))
    try {
      await updateDocument.mutateAsync({
        documentId,
        body: {
          status: 'awaiting_signature',
          meta_json: {
            ...document.meta_json,
            signature_requests: refreshedRequests,
          },
        },
      })
      toast.success('Документ отправлен на подпись')
    } catch {
      toast.error('Не удалось отправить документ на подпись')
    }
  }

  async function handleDocumentSignerDecision(documentId: string, requestId: string, status: 'signed' | 'rejected') {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для подписи документа')
      return
    }
    const document = documents.find((item) => item.id === documentId)
    if (!document) return
    const nextRequests = (document.meta_json.signature_requests || []).map((request) => (
      request.id === requestId
        ? { ...request, status, decided_at: new Date().toISOString() }
        : request
    ))
    const allSigned = nextRequests.length > 0 && nextRequests.every((request) => request.status === 'signed')
    try {
      await updateDocument.mutateAsync({
        documentId,
        body: {
          status: allSigned ? 'signed' : document.status,
          meta_json: {
            ...document.meta_json,
            signature_requests: nextRequests,
          },
        },
      })
      toast.success(status === 'signed' ? 'Подпись подтверждена' : 'Отказ от подписи зафиксирован')
    } catch {
      toast.error('Не удалось обновить статус подписи')
    }
  }

  async function changeLeaveStatus(requestId: string, status: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для обработки отпусков')
      return
    }
    try {
      const result: any = await updateLeaveRequest.mutateAsync({ requestId, body: { status } })
      if (result?.approval_required) {
        toast.success('Решение по отпуску отправлено на согласование')
        return
      }
      toast.success('Статус заявки обновлен')
    } catch {
      toast.error('Не удалось обновить заявку')
    }
  }

  async function handleVacancyPauseToggle(vacancyId: string, currentStatus: string) {
    const newStatus = currentStatus === 'paused' ? 'published' : 'paused'
    try {
      await updateVacancy.mutateAsync({ vacancyId, body: { status: newStatus } })
      toast.success(newStatus === 'paused' ? 'Вакансия приостановлена' : 'Вакансия возобновлена')
    } catch {
      toast.error('Не удалось обновить статус вакансии')
    }
  }

  async function handleSaveInterviewFeedback(interviewId: string) {
    const entry = interviewFeedbackMap[interviewId]
    if (!entry) return
    try {
      await updateInterview.mutateAsync({
        interviewId,
        body: {
          score: entry.score ? Number(entry.score) : undefined,
          feedback: entry.feedback || undefined,
        },
      })
      toast.success('Фидбек по интервью сохранён')
    } catch {
      toast.error('Не удалось сохранить фидбек')
    }
  }

  async function handleSendInterviewInvite(interview: InterviewSession) {
    try {
      await updateInterview.mutateAsync({
        interviewId: interview.id,
        body: {
          invitation_status: 'sent',
          invitation_message: interview.invitation_message || interviewInvitationMessage || undefined,
        },
      })
      toast.success('Приглашение на интервью отправлено')
    } catch {
      toast.error('Не удалось отправить приглашение')
    }
  }

  async function handleAdvanceCandidateWorkflow(target: 'interviews' | 'offers' | 'documents', nextStage?: string) {
    if (!selectedApplicationId) return toast.error('Выберите кандидата')
    try {
      if (nextStage) {
        await updateApplication.mutateAsync({
          applicationId: selectedApplicationId,
          body: {
            stage: nextStage,
            status: nextStage === 'rejected' ? 'rejected' : nextStage === 'hired' ? 'hired' : undefined,
          },
        })
      }
      goToTab(target)
      toast.success('Следующий шаг подготовлен')
    } catch {
      toast.error('Не удалось подготовить следующий этап')
    }
  }

  async function handleAccessHRDocument(documentId: string, action: 'view' | 'download') {
    if (!activeOrgId) return
    try {
      const response = await fetchHRDocumentContent(activeOrgId, documentId, action)
      const contentTypeHeader = response.headers['content-type']
      const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'application/octet-stream'
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: contentType })
      const blobUrl = URL.createObjectURL(blob)

      if (action === 'download') {
        const link = window.document.createElement('a')
        link.href = blobUrl
        link.download = fileNameFromDisposition(response.headers['content-disposition']) || 'document'
        link.click()
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer')
      }

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить файл с документом')
    }
  }

  async function handleStartHiringFromOffer() {
    if (!selectedApplication) return toast.error('Выберите кандидата')
    try {
      await updateApplication.mutateAsync({
        applicationId: selectedApplication.id,
        body: {
          stage: 'hired',
          status: 'hired',
        },
      })
      if (selectedApplication.applicant_user_id) {
        const employee = userMap.get(selectedApplication.applicant_user_id)
        await createOnboarding.mutateAsync({
          employee_id: selectedApplication.applicant_user_id,
          job_title: selectedVacancy?.title || employee?.position || undefined,
          start_date: new Date().toISOString().slice(0, 10),
          status: 'in_progress',
          checklist: buildDefaultOnboardingChecklist(),
          notes: `Автоматический старт онбординга после принятого оффера по вакансии ${selectedVacancy?.title || 'без названия'}.`,
          meta_json: {
            employee_profile: {
              work_email: employee?.work_email || null,
              department: employee?.department || null,
              location: employee?.city || null,
              format: employee?.work_format || null,
              start_manager: employee?.manager_id || null,
            },
          },
        })
        await createDocument.mutateAsync({
          name: `Трудовой договор: ${selectedApplication.full_name}`,
          document_type: 'contract',
          employee_id: selectedApplication.applicant_user_id,
          status: 'draft',
          meta_json: {
            category: 'employee',
            signers: ['HR', 'CEO', selectedApplication.full_name],
            signature_requests: [],
            template_key: 'employment_contract',
            generated_content: buildDocumentTemplateContent('employment_contract', employee || null, ['HR', 'CEO', selectedApplication.full_name]),
            placeholders: {
              employee_name: employee?.full_name || selectedApplication.full_name,
              position: employee?.position || selectedVacancy?.title || null,
              department: employee?.department || null,
              city: employee?.city || null,
              work_email: employee?.work_email || null,
            },
          },
        })
      }
      goToTab(selectedApplication.applicant_user_id ? 'onboarding' : 'employees')
      toast.success(selectedApplication.applicant_user_id ? 'Найм запущен: кандидат переведён в hired, онбординг и договор созданы' : 'Кандидат переведён в hired. Для онбординга нужен профиль сотрудника.')
    } catch {
      toast.error('Не удалось запустить оформление найма')
    }
  }

  async function handleOfferStatusChange(offerId: string, status: string) {
    try {
      const offer = offers.find((item) => item.id === offerId)
      await updateOffer.mutateAsync({
        offerId,
        body: {
          status,
          meta_json: {
            ...(offer?.meta_json || {}),
            candidate_response: {
              ...((offer?.meta_json as any)?.candidate_response || {}),
              status,
              decided_at: new Date().toISOString(),
            },
          },
        },
      })
      toast.success('Статус оффера обновлён')
    } catch {
      toast.error('Не удалось обновить статус оффера')
    }
  }

  async function handleOfferApprovalDecision(offerId: string, approverKey: string, status: 'approved' | 'rejected') {
    if (!canManageHiring) {
      toast.error('Недостаточно прав для согласования оффера')
      return
    }
    const offer = offers.find((item) => item.id === offerId)
    if (!offer) return
    const approvals = ((offer.meta_json?.approvals || []) as Array<{ user_id?: string | null; name: string; role?: string | null; status: string; note?: string | null; decided_at?: string | null }>).map((entry) => {
      const key = entry.user_id || `${entry.name}-${entry.role || ''}`
      if (key !== approverKey) return entry
      return {
        ...entry,
        status,
        decided_at: new Date().toISOString(),
      }
    })
    const allApproved = approvals.length > 0 && approvals.every((entry) => entry.status === 'approved')
    try {
      await updateOffer.mutateAsync({
        offerId,
        body: {
          status: allApproved ? 'approved' : offer.status,
          meta_json: {
            ...(offer.meta_json || {}),
            approvals,
          },
        },
      })
      toast.success(status === 'approved' ? 'Согласование отмечено' : 'Отклонение согласования отмечено')
    } catch {
      toast.error('Не удалось обновить согласование оффера')
    }
  }

  async function handleSaveEmployeeProfile() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для обновления профиля сотрудника')
      return
    }
    if (!selectedEmployeeId) return toast.error('Выберите сотрудника')
    try {
      await updateUserHRProfile.mutateAsync({
        userId: selectedEmployeeId,
        body: {
          employee_status: employeeStatus,
          work_email: employeeWorkEmail || null,
          department: employeeDepartment || null,
          work_format: employeeWorkFormat || null,
          manager_id: employeeManagerId || null,
          position: employeePosition || null,
          city: employeeCity || null,
          phone: employeePhone || null,
          employee_recommendation: employeeRecommendation || null,
        },
      })
      toast.success('Профиль сотрудника обновлён')
    } catch {
      toast.error('Не удалось обновить профиль сотрудника')
    }
  }

  async function handleCreateEmployeeChangeRequest() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для кадровой заявки')
      return
    }
    if (!selectedEmployeeId) return toast.error('Выберите сотрудника')
    try {
      await createEmployeeChangeRequest.mutateAsync({
        employee_id: selectedEmployeeId,
        change_type: employeeChangeType,
        comment: employeeChangeComment || undefined,
        payload_json: {
          employee_status: employeeStatus,
          work_email: employeeWorkEmail,
          department: employeeDepartment,
          work_format: employeeWorkFormat,
          manager_id: employeeManagerId,
          position: employeePosition,
          city: employeeCity,
          phone: employeePhone,
          employee_recommendation: employeeRecommendation,
        },
      })
      setEmployeeChangeComment('')
      toast.success('Кадровая заявка создана')
    } catch {
      toast.error('Не удалось создать кадровую заявку')
    }
  }

  async function handleEmployeeChangeDecision(requestId: string, status: 'approved' | 'rejected') {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для обработки кадровой заявки')
      return
    }
    try {
      const result: any = await updateEmployeeChangeRequest.mutateAsync({ requestId, body: { status } })
      if (result?.approval_required) {
        toast.success('Заявка отправлена на согласование')
        return
      }
      toast.success('Статус кадровой заявки обновлён')
    } catch {
      toast.error('Не удалось обновить кадровую заявку')
    }
  }

  async function handleCreateEmploymentConfirmation() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для создания документа')
      return
    }
    if (!selectedEmployeeId) return toast.error('Выберите сотрудника')
    const employee = userMap.get(selectedEmployeeId)
    try {
      await createDocument.mutateAsync({
        name: `Справка о занятости: ${employee?.full_name || selectedEmployeeId}`,
        document_type: 'certificate',
        employee_id: selectedEmployeeId,
        status: 'draft',
        meta_json: {
          category: 'employee',
          template_key: 'employment_confirmation',
          signers: ['HR'],
          signature_requests: [],
          generated_content: buildDocumentTemplateContent('employment_confirmation', employee || null, ['HR']),
          placeholders: {
            employee_name: employee?.full_name || null,
            position: employee?.position || null,
            department: employee?.department || null,
            city: employee?.city || null,
            work_email: employee?.work_email || null,
          },
          confirmation: {
            employee_status: employee?.employee_status || 'active',
            department: employee?.department || null,
            position: employee?.position || null,
            work_email: employee?.work_email || null,
          },
        },
      })
      toast.success('Справка о занятости создана')
    } catch {
      toast.error('Не удалось создать справку о занятости')
    }
  }

  async function handleToggleChecklistItem(processId: string, index: number, done: boolean) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для чеклиста')
      return
    }
    try {
      await toggleChecklist.mutateAsync({ processId, body: { index, done: !done } })
      toast.success('Чеклист обновлён')
    } catch {
      toast.error('Не удалось обновить чеклист')
    }
  }

  async function handleAddLocalTask() {
    if (!taskTitle.trim()) return toast.error('Укажите название задачи')
    if (!activeOrgId || !currentUserId) return toast.error('Нет активной организации')
    const selectedTeam = hrTeamOptions[0]
    if (!selectedTeam) return toast.error('Нет доступной команды или проекта для сохранения кадровой задачи')
    try {
      await createProjectTask(activeOrgId, selectedTeam.projectId, {
        title: taskTitle.trim(),
        description: 'HR personal task',
        due_date: taskDueDate || undefined,
        assignee_id: currentUserId,
        team_id: selectedTeam.teamId,
        priority: taskPriority,
        is_personal: true,
      })
      setTaskTitle('')
      setTaskDueDate('')
      setTaskPriority('medium')
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.myTasks(activeOrgId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(activeOrgId, selectedTeam.projectId) })
      toast.success('Задача добавлена')
    } catch {
      toast.error('Не удалось сохранить кадровую задачу')
    }
  }

  async function handleToggleLocalTask(taskId: string) {
    if (!activeOrgId) return
    const task = hrPersistentTasks.find((item) => item.id === taskId)
    if (!task?.projectId) return
    try {
      await updateProjectTask(activeOrgId, task.projectId, taskId, {
        status: task.done ? 'todo' : 'done',
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.myTasks(activeOrgId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(activeOrgId, task.projectId) })
    } catch {
      toast.error('Не удалось обновить задачу')
    }
  }

  async function handleDeleteLocalTask(taskId: string) {
    if (!activeOrgId) return
    const task = hrPersistentTasks.find((item) => item.id === taskId)
    if (!task?.projectId) return
    try {
      await updateProjectTask(activeOrgId, task.projectId, taskId, {
        status: 'archived',
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.myTasks(activeOrgId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(activeOrgId, task.projectId) })
    } catch {
      toast.error('Не удалось архивировать задачу')
    }
  }

  async function handleSaveTemplate() {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для управления шаблонами')
      return
    }
    if (!templateName.trim()) return toast.error('Укажите название шаблона')
    if (!templateBody.trim()) return toast.error('Заполните тело шаблона')
    try {
      if (editingTemplateId) {
        await updateTemplate.mutateAsync({
          templateId: editingTemplateId,
          body: {
            name: templateName.trim(),
            template_type: templateType,
            subject: templateSubject || null,
            body: templateBody.trim(),
          },
        })
        toast.success('Шаблон обновлён')
      } else {
        await createTemplate.mutateAsync({
          name: templateName.trim(),
          template_type: templateType,
          subject: templateSubject || null,
          body: templateBody.trim(),
        })
        toast.success('Шаблон создан')
      }
      setTemplateName('')
      setTemplateType('general')
      setTemplateSubject('')
      setTemplateBody('')
      setEditingTemplateId(null)
    } catch {
      toast.error('Не удалось сохранить шаблон')
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!canManageHRCore) {
      toast.error('Недостаточно прав для удаления шаблона')
      return
    }
    try {
      await deleteTemplate.mutateAsync(templateId)
      toast.success('Шаблон удалён')
    } catch {
      toast.error('Не удалось удалить шаблон')
    }
  }

  function handleEditTemplate(template: MessageTemplate) {
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    setTemplateType(template.template_type)
    setTemplateSubject(template.subject || '')
    setTemplateBody(template.body)
  }

  function handleToggleInterviewParticipant(userId: string) {
    setInterviewParticipantIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ))
  }

  function formatInterviewWindow(interview: InterviewSession) {
    if (!interview.scheduled_at) return 'Время не указано'
    const start = new Date(interview.scheduled_at)
    const end = new Date(start.getTime() + (interview.duration_minutes || 60) * 60_000)
    return `${start.toISOString().slice(0, 16).replace('T', ' ')} - ${end.toISOString().slice(11, 16)}`
  }

  function buildTemplateValues() {
    const selectedApplicant = selectedApplication?.applicant_user_id ? userMap.get(selectedApplication.applicant_user_id) : null
    const selectedDocEmployee = documentEmployeeId ? (userMap.get(documentEmployeeId) || null) : null
    return {
      name: selectedApplication?.full_name || selectedDocEmployee?.full_name || selectedEmployee?.full_name || 'Коллега',
      full_name: selectedApplication?.full_name || selectedDocEmployee?.full_name || selectedEmployee?.full_name || 'Коллега',
      email: selectedApplication?.email || selectedDocEmployee?.email || selectedEmployee?.email || '',
      vacancy: selectedVacancy?.title || '',
      position: selectedVacancy?.title || selectedDocEmployee?.position || selectedEmployee?.position || '',
      department: selectedVacancy ? (vacancyDepartment || selectedVacancy.title) : (selectedDocEmployee?.department || selectedEmployee?.department || ''),
      company: org?.orgName || '',
      interview_date: interviewDate || '',
      interview_format: interviewFormat || '',
      work_email: selectedDocEmployee?.work_email || selectedEmployee?.work_email || '',
      city: selectedDocEmployee?.city || selectedEmployee?.city || '',
    }
  }

  function applyTemplateToField(templateId: string, target: 'rejection' | 'interview' | 'offer' | 'document') {
    const template = messageTemplates.find((item) => item.id === templateId)
    if (!template) return
    const body = interpolateTemplateBody(template.body, buildTemplateValues())
    if (target === 'rejection') {
      setCandidateRejectionReason(body)
      setCandidateRejectionTemplateId(templateId)
      return
    }
    if (target === 'interview') {
      setInterviewInvitationMessage(body)
      setInterviewTemplateId(templateId)
      return
    }
    if (target === 'offer') {
      setOfferTerms(body)
      setOfferTemplateId(templateId)
      return
    }
    setDocumentBody(body)
    setDocumentMessageTemplateId(templateId)
  }

  const loading = usersLoading || onboardingLoading || offboardingLoading || terminationOrdersLoading || leaveLoading || documentsLoading
  const documentFolders = useMemo(() => {
    const grouped: Record<DocumentFolderKey, typeof documents> = {
      company: [],
      employee: [],
      legal: [],
      compliance: [],
      other: [],
    }
    for (const document of documents) {
      const folder = resolveDocumentFolder(document)
      grouped[folder].push(document)
    }
    return DOCUMENT_FOLDERS.map((folder) => ({
      ...folder,
      items: grouped[folder.key],
    }))
  }, [documents])
  const visibleDocumentFolders = useMemo(() => {
    if (documentFolderFilter === 'all') return documentFolders.filter((folder) => folder.items.length > 0)
    return documentFolders.filter((folder) => folder.key === documentFolderFilter)
  }, [documentFolderFilter, documentFolders])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.hrWorkspace')}
        description={t('hr.subtitle', 'Кадровый центр компании')}
        eyebrow={t('hr.eyebrow', 'Кадровые операции')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('nav.hrWorkspace') },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card p-2">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => goToTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Сотрудники" value={users.length} />
            <StatCard icon={UserCheck} label="Онбординг" value={onboarding.filter((item) => item.status !== 'completed').length} />
            <StatCard icon={UserMinus} label="Оффбординг" value={offboarding.filter((item) => item.status !== 'completed').length} />
            <StatCard icon={FileText} label="Документы на подписи" value={documents.filter((item) => item.status === 'awaiting_signature').length} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Briefcase} label="Открытые вакансии" value={vacancyAnalytics?.published_vacancies ?? vacancies.filter((item) => item.status === 'published').length} color="violet" />
            <StatCard icon={Users} label="Кандидаты" value={vacancyAnalytics?.total_applications ?? 0} color="cyan" />
            <StatCard icon={Calendar} label="Интервью в работе" value={vacancyAnalytics?.stage_counts?.interview ?? 0} color="amber" />
            <StatCard icon={Send} label="Отправленные офферы" value={vacancyAnalytics?.offers_sent ?? 0} color="green" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Активный онбординг">
              {loading ? <LoadingSkeleton rows={4} /> : onboarding.length === 0 ? <EmptyState title="Нет активных процессов" /> : (
                <SimpleList
                  items={onboarding.slice(0, 5).map((item) => ({
                    id: item.id,
                    title: userMap.get(item.employee_id)?.full_name ?? item.employee_id,
                    subtitle: item.job_title || 'Должность не указана',
                    status: item.status,
                  }))}
                />
              )}
            </Panel>

            <Panel title="Последние документы">
              {loading ? <LoadingSkeleton rows={4} /> : documents.length === 0 ? <EmptyState title="Нет документов" /> : (
                <SimpleList
                  items={documents.slice(0, 5).map((item) => ({
                    id: item.id,
                    title: item.name,
                    subtitle: item.document_type,
                    status: item.status,
                  }))}
                />
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Star} label="Избранные кандидаты" value={dashboardMetrics.favoriteCount} color="amber" />
            <StatCard icon={CheckCircle2} label="Верифицированы" value={dashboardMetrics.verifiedCount} color="green" />
            <StatCard icon={Calendar} label="На интервью" value={dashboardMetrics.interviewCount} color="cyan" />
            <StatCard icon={BarChart3} label="Средний рейтинг" value={dashboardMetrics.avgRating} color="violet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Пайплайн найма" description="Статус кандидатов по этапам текущей вакансии.">
              <div className="space-y-3">
                {dashboardMetrics.stageStats.map((stage) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="font-medium text-foreground">{stage.count} · {stage.share}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${stage.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Источники кандидатов" description="Быстрый обзор эффективности каналов привлечения.">
              <div className="space-y-2">
                {Object.keys(dashboardMetrics.sourceStats).length === 0 ? <EmptyState title="Нет данных по источникам" /> : Object.entries(dashboardMetrics.sourceStats).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
                    <span className="text-muted-foreground">{source}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="space-y-6">
          <Panel title="HR-профиль сотрудника" description="Статус сотрудника, внутренние реквизиты и служебные рекомендации.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Сотрудник" required>
                <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className={selectClass}>
                  <option value="">Выберите сотрудника</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Статус сотрудника">
                <select value={employeeStatus} onChange={(e) => setEmployeeStatus(e.target.value)} className={selectClass}>
                  {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField label="Рабочий email">
                <input value={employeeWorkEmail} onChange={(e) => setEmployeeWorkEmail(e.target.value)} className={inputClass} placeholder="employee@company.com" />
              </FormField>
              <FormField label="Отдел">
                <input value={employeeDepartment} onChange={(e) => setEmployeeDepartment(e.target.value)} className={inputClass} placeholder="Product / HR / Finance" />
              </FormField>
              <FormField label="Формат работы">
                <select value={employeeWorkFormat} onChange={(e) => setEmployeeWorkFormat(e.target.value)} className={selectClass}>
                  <option value="hybrid">Гибрид</option>
                  <option value="remote">Удалённо</option>
                  <option value="office">Офис</option>
                  <option value="field">Разъездной</option>
                </select>
              </FormField>
              <FormField label="Менеджер">
                <select value={employeeManagerId} onChange={(e) => setEmployeeManagerId(e.target.value)} className={selectClass}>
                  <option value="">Не назначен</option>
                  {users.filter((user) => user.id !== selectedEmployeeId).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Должность">
                <input value={employeePosition} onChange={(e) => setEmployeePosition(e.target.value)} className={inputClass} placeholder="Senior Frontend Engineer" />
              </FormField>
              <FormField label="Город">
                <input value={employeeCity} onChange={(e) => setEmployeeCity(e.target.value)} className={inputClass} placeholder="Almaty" />
              </FormField>
              <FormField label="Телефон">
                <input value={employeePhone} onChange={(e) => setEmployeePhone(e.target.value)} className={inputClass} placeholder="+7..." />
              </FormField>
              <div className="md:col-span-2 xl:col-span-3">
                <FormField label="Служебная рекомендация">
                  <textarea value={employeeRecommendation} onChange={(e) => setEmployeeRecommendation(e.target.value)} className={textareaClass} placeholder="Внутренний комментарий HR: потенциал, риски, рекомендации по развитию, кадровые пометки..." />
                </FormField>
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleSaveEmployeeProfile()} disabled={updateUserHRProfile.isPending || !canManageHRCore}>
                  Сохранить профиль
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Кадровые действия" description="Изменение данных сотрудника и подтверждение занятости.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Тип изменения">
                <select value={employeeChangeType} onChange={(e) => setEmployeeChangeType(e.target.value)} className={selectClass}>
                  <option value="profile_update">Изменение профиля</option>
                  <option value="status_change">Смена статуса</option>
                  <option value="salary_review">Пересмотр условий</option>
                  <option value="manager_change">Смена менеджера</option>
                  <option value="department_transfer">Перевод в другой отдел</option>
                </select>
              </FormField>
              <div className="md:col-span-2 xl:col-span-2">
                <FormField label="Комментарий HR">
                  <textarea value={employeeChangeComment} onChange={(e) => setEmployeeChangeComment(e.target.value)} className={textareaClass} placeholder="Что именно меняется, почему это нужно, есть ли дедлайн или согласование..." />
                </FormField>
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleCreateEmployeeChangeRequest()} disabled={createEmployeeChangeRequest.isPending || !selectedEmployeeId || !canManageHRCore}>
                  Создать заявку
                </Button>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => void handleCreateEmploymentConfirmation()} disabled={createDocument.isPending || !selectedEmployeeId || !canManageHRCore}>
                  Подтвердить занятость
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Кадровые заявки">
            {employeeChangeRequestsLoading ? <LoadingSkeleton rows={4} /> : employeeChangeRequestSummary.length === 0 ? <EmptyState title="Нет кадровых заявок" /> : (
              <div className="space-y-3">
                {employeeChangeRequestSummary.map((request) => (
                  <div key={request.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{request.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{EMPLOYEE_CHANGE_TYPE_LABELS[request.change_type] || request.change_type}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Инициатор: {request.requestedByName}
                          {request.reviewedByName ? ` · Рассмотрел: ${request.reviewedByName}` : ''}
                          {request.reviewed_at ? ` · ${request.reviewed_at.slice(0, 16).replace('T', ' ')}` : ''}
                        </p>
                        {request.comment ? <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{request.comment}</p> : null}
                        {request.changes.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {request.changes.map((change) => (
                              <span key={`${request.id}-${change.key}`} className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                {change.label}: {change.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'error' : 'warning'}>
                          {request.status}
                        </StatusBadge>
                        {request.status === 'pending' && canManageHRCore ? (
                          <>
                            <Button size="sm" onClick={() => void handleEmployeeChangeDecision(request.id, 'approved')}>Одобрить</Button>
                            <Button size="sm" variant="outline" onClick={() => void handleEmployeeChangeDecision(request.id, 'rejected')}>Отклонить</Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Сотрудники" description="Список сотрудников компании, роли и контакты.">
            {usersLoading ? <LoadingSkeleton rows={6} /> : users.length === 0 ? <EmptyState title="Нет сотрудников" /> : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{user.full_name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {user.org_role ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[user.org_role] || 'bg-gray-500/10 text-gray-600'}`}>
                          {ROLE_LABELS[user.org_role] || user.org_role}
                        </span>
                      ) : null}
                      {user.employee_status ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          {EMPLOYEE_STATUS_LABELS[user.employee_status] || user.employee_status}
                        </span>
                      ) : null}
                      {user.department ? <span className="text-xs text-muted-foreground">{user.department}</span> : null}
                      {user.position ? <span className="text-xs text-muted-foreground">{user.position}</span> : null}
                      {user.city ? <span className="text-xs text-muted-foreground">{user.city}</span> : null}
                      {user.manager_id ? <span className="text-xs text-muted-foreground">Manager: {userMap.get(user.manager_id)?.full_name ?? user.manager_id}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'vacancies' && (
        <div className="space-y-6">
          <Panel title={editingVacancyId ? 'Редактировать вакансию' : 'Создать вакансию'} description="Базовый рекрутмент-поток HR: вакансия, требования, условия, зарплатный диапазон.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Название" required>
                <input value={vacancyTitle} onChange={(e) => setVacancyTitle(e.target.value)} className={inputClass} placeholder="Senior Frontend Engineer" />
              </FormField>
              <FormField label="Отдел">
                <input value={vacancyDepartment} onChange={(e) => setVacancyDepartment(e.target.value)} className={inputClass} placeholder="IT / Product" />
              </FormField>
              <FormField label="Локация">
                <input value={vacancyCity} onChange={(e) => setVacancyCity(e.target.value)} className={inputClass} placeholder="Almaty" />
              </FormField>
              <FormField label="Формат работы">
                <select value={vacancyFormat} onChange={(e) => setVacancyFormat(e.target.value)} className={selectClass}>
                  <option value="hybrid">Гибрид</option>
                  <option value="remote">Удалённо</option>
                  <option value="office">Офис</option>
                </select>
              </FormField>
              <FormField label="Грейд / опыт">
                <input value={vacancyGrade} onChange={(e) => setVacancyGrade(e.target.value)} className={inputClass} placeholder="3" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Зарплата от">
                  <input value={vacancySalaryFrom} onChange={(e) => setVacancySalaryFrom(e.target.value)} className={inputClass} placeholder="2500" />
                </FormField>
                <FormField label="Зарплата до">
                  <input value={vacancySalaryTo} onChange={(e) => setVacancySalaryTo(e.target.value)} className={inputClass} placeholder="4000" />
                </FormField>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <FormField label="Требования">
                <textarea value={vacancyRequirements} onChange={(e) => setVacancyRequirements(e.target.value)} className={textareaClass} placeholder="React, TypeScript, 3+ years..." />
              </FormField>
              <FormField label="Обязанности">
                <textarea value={vacancyResponsibilities} onChange={(e) => setVacancyResponsibilities(e.target.value)} className={textareaClass} placeholder="Разработка, code review, участие в продукте..." />
              </FormField>
              <FormField label="Условия">
                <textarea value={vacancyConditions} onChange={(e) => setVacancyConditions(e.target.value)} className={textareaClass} placeholder="ДМС, бонусы, удалённый формат..." />
              </FormField>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {editingVacancyId ? (
                <Button variant="outline" onClick={handleCancelVacancyEdit} disabled={!canManageHiring}>
                  Отмена
                </Button>
              ) : null}
              <Button onClick={() => void handleCreateVacancy()} disabled={createVacancy.isPending || updateVacancy.isPending || !canManageHiring}>
                <Plus className="h-4 w-4" />
                {editingVacancyId ? 'Сохранить изменения' : 'Создать вакансию'}
              </Button>
            </div>
          </Panel>

          <Panel title="Вакансии" description="Черновики, публикация, бюджетный и approval-контур.">
            {vacanciesLoading ? <LoadingSkeleton rows={5} /> : vacancies.length === 0 ? <EmptyState title="Нет вакансий" /> : (
              <div className="space-y-3">
                {vacancies.map((vacancy) => (
                  <div key={vacancy.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{vacancy.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {vacancy.city || 'Локация не указана'} · {vacancy.employment_type || 'Формат не указан'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vacancy.salary_from ? `$${vacancy.salary_from}` : '—'} - {vacancy.salary_to ? `$${vacancy.salary_to}` : '—'}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {vacancy.experience_years != null ? <span>Опыт: {vacancy.experience_years}+ лет</span> : null}
                          {vacancy.skills?.length ? <span>Навыки: {vacancy.skills.join(', ')}</span> : null}
                          {vacancy.published_at ? <span>Опубликована: {vacancy.published_at.slice(0, 10)}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={vacancy.status as any}>{vacancy.status}</StatusBadge>
                        <StatusBadge variant={vacancy.approval_status as any}>{vacancy.approval_status}</StatusBadge>
                        <StatusBadge variant={vacancy.budget_status as any}>{vacancy.budget_status}</StatusBadge>
                        <Button size="sm" variant="outline" onClick={() => handleEditVacancy(vacancy.id)} disabled={!canManageHiring}>
                          <Edit3 className="mr-1 h-3.5 w-3.5" />
                          Редактировать
                        </Button>
                        {vacancy.status !== 'published' ? (
                          <Button size="sm" onClick={() => void handleVacancyStatusChange(vacancy.id, 'published')} disabled={updateVacancy.isPending || !canManageHiring}>
                            Опубликовать
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void handleVacancyStatusChange(vacancy.id, 'draft')} disabled={updateVacancy.isPending || !canManageHiring}>
                            Снять с публикации
                          </Button>
                        )}
                        {(vacancy.status === 'published' || vacancy.status === 'paused') && (
                          <Button
                            size="sm"
                            variant={vacancy.status === 'paused' ? 'default' : 'outline'}
                            onClick={() => void handleVacancyPauseToggle(vacancy.id, vacancy.status)}
                            disabled={updateVacancy.isPending || !canManageHiring}
                          >
                            {vacancy.status === 'paused' ? <Play className="mr-1 h-3.5 w-3.5" /> : <Pause className="mr-1 h-3.5 w-3.5" />}
                            {vacancy.status === 'paused' ? 'Возобновить' : 'Пауза'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="space-y-6">
          <Panel title="Кандидаты" description="ATS-поток: список откликов, фильтры, этапы, заметки и избранное.">
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Вакансия">
                <select value={selectedVacancyId} onChange={(e) => setSelectedVacancyId(e.target.value)} className={selectClass}>
                  <option value="">Выберите вакансию</option>
                  {vacancies.map((vacancy) => <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>)}
                </select>
              </FormField>
              <FormField label="Поиск">
                <input value={candidateQuery} onChange={(e) => setCandidateQuery(e.target.value)} className={inputClass} placeholder="Имя, email, телефон" />
              </FormField>
              <FormField label="Этап">
                <select value={candidateStageFilter} onChange={(e) => setCandidateStageFilter(e.target.value)} className={selectClass}>
                  <option value="all">Все этапы</option>
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </FormField>
              <FormField label="Статус">
                <select value={candidateStatusFilter} onChange={(e) => setCandidateStatusFilter(e.target.value)} className={selectClass}>
                  <option value="all">Все статусы</option>
                  <option value="new">New</option>
                  <option value="in_review">In review</option>
                  <option value="rejected">Rejected</option>
                  <option value="hired">Hired</option>
                </select>
              </FormField>
              <FormField label="Теги">
                <input value={candidateTagsFilter} onChange={(e) => setCandidateTagsFilter(e.target.value)} className={inputClass} placeholder="Фильтр по тегам" />
              </FormField>
              <FormField label="Верификация">
                <select value={candidateVerificationFilter} onChange={(e) => setCandidateVerificationFilter(e.target.value)} className={selectClass}>
                  <option value="all">Все</option>
                  <option value="unverified">Не верифицирован</option>
                  <option value="documents_requested">Запрошены документы</option>
                  <option value="verified">Верифицирован</option>
                  <option value="risk_review">Нужна проверка</option>
                </select>
              </FormField>
              <FormField label="Источник">
                <select value={candidateSourceFilter} onChange={(e) => setCandidateSourceFilter(e.target.value)} className={selectClass}>
                  <option value="all">Все источники</option>
                  {candidateSources.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </FormField>
              <FormField label="Ответственный HR">
                <select value={candidateOwnerFilter} onChange={(e) => setCandidateOwnerFilter(e.target.value)} className={selectClass}>
                  <option value="all">Все</option>
                  <option value="unassigned">Не назначен</option>
                  {users.filter((user) => ['hr', 'recruiter', 'admin', 'ceo', 'founder'].includes(user.org_role || '')).map((user) => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Опыт">
                <select value={candidateExperienceFilter} onChange={(e) => setCandidateExperienceFilter(e.target.value)} className={selectClass}>
                  <option value="all">Любой</option>
                  <option value="0-2">0-2 года</option>
                  <option value="3-5">3-5 лет</option>
                  <option value="6+">6+ лет</option>
                </select>
              </FormField>
              <FormField label="Образование">
                <select value={candidateEducationFilter} onChange={(e) => setCandidateEducationFilter(e.target.value)} className={selectClass}>
                  <option value="all">Любое</option>
                  <option value="higher">Высшее</option>
                  <option value="technical">Техническое / bootcamp</option>
                  <option value="other">Другое</option>
                </select>
              </FormField>
              <FormField label="Город">
                <select value={candidateCityFilter} onChange={(e) => setCandidateCityFilter(e.target.value)} className={selectClass}>
                  <option value="all">Все города</option>
                  {candidateCities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </FormField>
              <FormField label="Навык">
                <input value={candidateSkillFilter} onChange={(e) => setCandidateSkillFilter(e.target.value)} className={inputClass} placeholder="React, Python, HRBP" />
              </FormField>
              <FormField label="Ожидания от">
                <input value={candidateSalaryMinFilter} onChange={(e) => setCandidateSalaryMinFilter(e.target.value)} className={inputClass} placeholder="2500" />
              </FormField>
              <FormField label="Ожидания до">
                <input value={candidateSalaryMaxFilter} onChange={(e) => setCandidateSalaryMaxFilter(e.target.value)} className={inputClass} placeholder="6000" />
              </FormField>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={candidateFavoriteFilter} onChange={(e) => setCandidateFavoriteFilter(e.target.checked)} className="rounded border-border" />
                  Только избранные
                </label>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Вид:</span>
              <button
                onClick={() => setCandidateViewMode('list')}
                className={`rounded-lg p-1.5 transition-colors ${candidateViewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCandidateViewMode('kanban')}
                className={`rounded-lg p-1.5 transition-colors ${candidateViewMode === 'kanban' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <span className="ml-2 text-xs text-muted-foreground">{filteredApplications.length} кандидатов</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleBulkCandidateAction('assign', { ownerId: currentUserId || undefined })} disabled={selectedCandidateIds.length === 0 || !currentUserId}>
                Назначить мне
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleBulkCandidateAction('favorite')} disabled={selectedCandidateIds.length === 0}>
                В избранное
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleBulkCandidateAction('screening')} disabled={selectedCandidateIds.length === 0}>
                В screening
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleBulkCandidateAction('interview')} disabled={selectedCandidateIds.length === 0}>
                В interview
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleBulkCandidateAction('reject')} disabled={selectedCandidateIds.length === 0}>
                Отклонить
              </Button>
              <span className="text-xs text-muted-foreground">Выбрано: {selectedCandidateIds.length}</span>
            </div>
          </Panel>

          {candidateViewMode === 'kanban' && (
            <Panel title="Kanban-воронка кандидатов">
              {applicationsLoading ? <LoadingSkeleton rows={5} /> : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {KANBAN_STAGES.map((stage) => {
                    const stageApps = filteredApplications.filter((a) => a.stage === stage)
                    return (
                      <div
                        key={stage}
                        onDragOver={(event) => {
                          event.preventDefault()
                          if (dragOverStage !== stage) setDragOverStage(stage)
                        }}
                        onDragLeave={() => {
                          if (dragOverStage === stage) setDragOverStage(null)
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          const applicationId = event.dataTransfer.getData('text/plain') || draggingCandidateId
                          if (applicationId) {
                            void handleCandidateDrop(applicationId, stage)
                          }
                        }}
                        className={`min-w-[220px] flex-1 rounded-xl border-2 bg-card p-3 transition-colors ${
                          dragOverStage === stage ? 'border-primary bg-primary/5' : (KANBAN_STAGE_COLORS[stage] || 'border-border')
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground">{KANBAN_STAGE_LABELS[stage]}</h4>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{stageApps.length}</span>
                        </div>
                        <div className="space-y-2">
                          {stageApps.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground py-4">Нет кандидатов</p>
                          ) : stageApps.map((app) => (
                            <button
                              key={app.id}
                              draggable
                              onDragStart={(event) => {
                                setDraggingCandidateId(app.id)
                                event.dataTransfer.setData('text/plain', app.id)
                                event.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragEnd={() => {
                                setDraggingCandidateId(null)
                                setDragOverStage(null)
                              }}
                              onClick={() => setSelectedApplicationId(app.id)}
                              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                draggingCandidateId === app.id
                                  ? 'border-primary bg-primary/10 opacity-70'
                                  : selectedApplicationId === app.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-background hover:bg-accent'
                              }`}
                            >
                              <p className="text-sm font-medium text-foreground truncate">{app.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {app.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                                {app.rating ? <span className="text-xs text-muted-foreground">Rating: {app.rating}</span> : null}
                              </div>
                              <p className="mt-2 text-[11px] text-muted-foreground">Перетащите в нужную колонку</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          )}

          {candidateViewMode === 'list' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Panel title="Список кандидатов">
              {applicationsLoading ? <LoadingSkeleton rows={5} /> : filteredApplications.length === 0 ? <EmptyState title="Нет кандидатов" /> : (
                <div className="space-y-3">
                  {filteredApplications.map((application) => (
                    <div
                      key={application.id}
                      className={`rounded-xl border p-4 transition-colors ${selectedApplicationId === application.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.includes(application.id)}
                            onChange={() => toggleCandidateSelection(application.id)}
                            className="mt-1 rounded border-border"
                          />
                          <button className="min-w-0 text-left" onClick={() => setSelectedApplicationId(application.id)}>
                            <p className="font-medium text-foreground">{application.full_name}</p>
                            <p className="text-sm text-muted-foreground">{application.email}{application.phone ? ` · ${application.phone}` : ''}</p>
                            <p className="text-xs text-muted-foreground">
                              Ответственный: {application.owner_recruiter_id ? (userMap.get(application.owner_recruiter_id)?.full_name ?? application.owner_recruiter_id) : 'не назначен'}
                            </p>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => void toggleCandidateFavorite(application.id, !!application.is_favorite)} className={`rounded-lg border px-2 py-1 text-xs ${application.is_favorite ? 'border-amber-500 text-amber-400' : 'border-border text-muted-foreground'}`}>
                            {application.is_favorite ? 'В избранном' : 'В избранное'}
                          </button>
                          <StatusBadge variant={application.stage as any}>{application.stage}</StatusBadge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select value={application.stage} onChange={(e) => void handleCandidateStageChange(application.id, e.target.value)} className={selectClass}>
                          <option value="applied">Applied</option>
                          <option value="screening">Screening</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Карточка кандидата" description="Профиль кандидата, верификация, теги, вложения и служебная рекомендация.">
              {!selectedApplication ? <EmptyState title="Выберите кандидата" /> : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{selectedApplication.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedApplication.email}</p>
                        {selectedApplication.applicant_user_id && userMap.get(selectedApplication.applicant_user_id) ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[userMap.get(selectedApplication.applicant_user_id)?.city, userMap.get(selectedApplication.applicant_user_id)?.position].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      {selectedApplication.is_favorite ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Избранный кандидат
                        </span>
                      ) : null}
                    </div>
                    {selectedApplication.cover_letter ? (
                      <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge variant={selectedApplication.status as any}>{selectedApplication.status}</StatusBadge>
                      <StatusBadge variant={selectedApplication.stage as any}>{selectedApplication.stage}</StatusBadge>
                      <StatusBadge variant={(selectedApplication.verification_status || 'unverified') as any}>{selectedApplication.verification_status || 'unverified'}</StatusBadge>
                    </div>
                    {selectedApplication.applicant_user_id && userMap.get(selectedApplication.applicant_user_id) ? (
                      <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <div>Опыт: {userMap.get(selectedApplication.applicant_user_id)?.experience_years ?? '—'} лет</div>
                        <div>Образование: {userMap.get(selectedApplication.applicant_user_id)?.education || '—'}</div>
                        <div>Город: {userMap.get(selectedApplication.applicant_user_id)?.city || '—'}</div>
                        <div>Ожидания: {userMap.get(selectedApplication.applicant_user_id)?.desired_salary ?? '—'}</div>
                        <div className="md:col-span-2">Навыки: {(userMap.get(selectedApplication.applicant_user_id)?.skills || []).join(', ') || '—'}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Теги">
                      <input value={candidateTags} onChange={(e) => setCandidateTags(e.target.value)} className={inputClass} placeholder="frontend, react, senior, relocation" />
                    </FormField>
                    <FormField label="Статус верификации">
                      <select value={candidateVerificationStatus} onChange={(e) => setCandidateVerificationStatus(e.target.value)} className={selectClass}>
                        <option value="unverified">Не верифицирован</option>
                        <option value="documents_requested">Запрошены документы</option>
                        <option value="verified">Верифицирован</option>
                        <option value="risk_review">Нужна проверка</option>
                      </select>
                    </FormField>
                    <FormField label="Ответственный HR">
                      <select value={candidateOwnerId} onChange={(e) => setCandidateOwnerId(e.target.value)} className={selectClass}>
                        <option value="">Не назначен</option>
                        {users.filter((user) => ['hr', 'recruiter', 'admin', 'ceo', 'founder'].includes(user.org_role || '')).map((user) => (
                          <option key={user.id} value={user.id}>{user.full_name}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Оценка HR (1-10)">
                      <input type="number" min={1} max={10} value={candidateRating} onChange={(e) => setCandidateRating(e.target.value)} className={inputClass} placeholder="8" />
                    </FormField>
                    <FormField label="Следующий шаг">
                      <input type="datetime-local" value={candidateNextStepAt} onChange={(e) => setCandidateNextStepAt(e.target.value)} className={inputClass} />
                    </FormField>
                  </div>

                  <FormField label="HR summary">
                    <textarea value={candidateSummary} onChange={(e) => setCandidateSummary(e.target.value)} className={textareaClass} placeholder="Краткая оценка профиля, сильные стороны, риски, рекомендации по следующему этапу..." />
                  </FormField>

                  <FormField label="Причина отказа">
                    <textarea value={candidateRejectionReason} onChange={(e) => setCandidateRejectionReason(e.target.value)} className={textareaClass} placeholder="Заполняется, если кандидат отклонён или есть серьёзные замечания." />
                  </FormField>
                  {templateCollections.rejection.length > 0 ? (
                    <FormField label="Шаблон отказа">
                      <select value={candidateRejectionTemplateId} onChange={(e) => applyTemplateToField(e.target.value, 'rejection')} className={selectClass}>
                        <option value="">Выберите шаблон</option>
                        {templateCollections.rejection.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </select>
                    </FormField>
                  ) : null}

                  <FormField label="Служебная рекомендация">
                    <textarea value={candidateRecommendation} onChange={(e) => setCandidateRecommendation(e.target.value)} className={textareaClass} placeholder="Внутренняя рекомендация HR по кандидату, риски, сильные стороны, что проверить дальше..." />
                  </FormField>

                  <FormField label="Вложения кандидата">
                    <input type="file" multiple onChange={(e) => void handleCandidateAttachmentUpload(e)} className={inputClass} />
                  </FormField>
                  <div className="space-y-2">
                    {candidateAttachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Пока нет вложений.</p>
                    ) : candidateAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">{Math.round((attachment.size || 0) / 1024)} KB</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => void handleAccessCandidateAttachment(attachment.id, 'view')} className="text-xs text-primary hover:underline">Открыть</button>
                          <button type="button" onClick={() => void handleAccessCandidateAttachment(attachment.id, 'download')} className="text-xs text-primary hover:underline">Скачать</button>
                          <button type="button" onClick={() => removeCandidateAttachment(attachment.id)} className="text-xs text-destructive hover:underline">Удалить</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => void handleSaveCandidateCard()} disabled={updateApplication.isPending}>
                      Сохранить карточку кандидата
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium text-foreground">Следующие действия</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void handleAdvanceCandidateWorkflow('interviews', 'interview')}>
                        Назначить интервью
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleAdvanceCandidateWorkflow('offers', 'offer')}>
                        Подготовить оффер
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleAdvanceCandidateWorkflow('documents')}>
                        Запросить документы
                      </Button>
                    </div>
                  </div>

                  <FormField label="Внутренний комментарий">
                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className={textareaClass} placeholder="Оценка, заметка, служебная рекомендация..." />
                  </FormField>
                  <div className="flex justify-end">
                    <Button onClick={() => void handleCreateNote()} disabled={createNote.isPending || !noteText.trim()}>
                      <MessageSquareMore className="h-4 w-4" />
                      Добавить заметку
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {notesLoading ? <LoadingSkeleton rows={3} /> : notes.length === 0 ? <EmptyState title="Нет заметок" /> : notes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-border bg-card p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{note.created_at?.slice(0, 16).replace('T', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </div>
          )}
        </div>
      )}

      {activeTab === 'interviews' && (
        <div className="space-y-6">
          <Panel title="Назначить интервью" description="Календарь интервью и фиксация результатов собеседования.">
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Вакансия">
                <select value={selectedVacancyId} onChange={(e) => setSelectedVacancyId(e.target.value)} className={selectClass}>
                  <option value="">Выберите вакансию</option>
                  {vacancies.map((vacancy) => <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>)}
                </select>
              </FormField>
              <FormField label="Кандидат">
                <select value={selectedApplicationId} onChange={(e) => setSelectedApplicationId(e.target.value)} className={selectClass}>
                  <option value="">Выберите кандидата</option>
                  {applications.map((application) => <option key={application.id} value={application.id}>{application.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Дата и время">
                <input type="datetime-local" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Длительность (мин)">
                <input type="number" min={15} max={480} step={15} value={interviewDuration} onChange={(e) => setInterviewDuration(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Формат">
                <select value={interviewFormat} onChange={(e) => setInterviewFormat(e.target.value)} className={selectClass}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="phone">Phone</option>
                </select>
              </FormField>
              <FormField label="Интервьюер">
                <select value={interviewInterviewerId} onChange={(e) => setInterviewInterviewerId(e.target.value)} className={selectClass}>
                  <option value="">Не назначен</option>
                  {recruiterUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField label={interviewFormat === 'offline' ? 'Локация' : 'Ссылка на встречу'}>
                <input
                  value={interviewFormat === 'offline' ? interviewLocation : interviewMeetingLink}
                  onChange={(e) => interviewFormat === 'offline' ? setInterviewLocation(e.target.value) : setInterviewMeetingLink(e.target.value)}
                  className={inputClass}
                  placeholder={interviewFormat === 'offline' ? 'Переговорка A / офис' : 'https://meet.google.com/...'}
                />
              </FormField>
              <FormField label="Участники интервью">
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="flex flex-wrap gap-2">
                    {recruiterUsers.length === 0 ? <span className="text-sm text-muted-foreground">Нет доступных участников</span> : recruiterUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleToggleInterviewParticipant(user.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${interviewParticipantIds.includes(user.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                      >
                        {user.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              </FormField>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <FormField label="Комментарий / feedback">
                <textarea value={interviewComment} onChange={(e) => setInterviewComment(e.target.value)} className={textareaClass} placeholder="Что важно проверить на интервью" />
              </FormField>
              <div className="flex items-end">
                <Button onClick={() => void handleCreateInterview()} disabled={createInterview.isPending}>
                  <Calendar className="h-4 w-4" />
                  Назначить
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <FormField label="Текст приглашения">
                <textarea
                  value={interviewInvitationMessage}
                  onChange={(e) => setInterviewInvitationMessage(e.target.value)}
                  className={textareaClass}
                  placeholder="Здравствуйте! Приглашаем вас на интервью. Ниже детали встречи..."
                />
              </FormField>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">Занятость интервьюера</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {interviewInterviewerId ? 'Показываем ближайшие интервью и пересечения по времени.' : 'Выберите интервьюера, чтобы увидеть его календарь.'}
                </p>
                {interviewerScheduleLoading ? <div className="mt-3"><LoadingSkeleton rows={2} /></div> : interviewInterviewerId ? (
                  <div className="mt-3 space-y-2">
                    {interviewConflictIds.size > 0 ? (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                        Найден конфликт по времени. Лучше перенести слот или выбрать другого интервьюера.
                      </div>
                    ) : null}
                    {interviewUpcomingSchedule.length === 0 ? <p className="text-sm text-muted-foreground">Ближайших интервью нет.</p> : interviewUpcomingSchedule.map((item) => (
                      <div key={item.id} className={`rounded-lg border px-3 py-2 text-sm ${interviewConflictIds.has(item.id) ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-card'}`}>
                        <p className="font-medium text-foreground">{formatInterviewWindow(item)}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.format, item.location || item.meeting_link, item.status].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {interviewParticipantsPreview.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                    Участники: {interviewParticipantsPreview.map((user) => user.full_name).join(', ')}
                  </div>
                ) : null}
              </div>
            </div>
            {templateCollections.interviewInvite.length > 0 ? (
              <FormField label="Шаблон приглашения">
                <select value={interviewTemplateId} onChange={(e) => applyTemplateToField(e.target.value, 'interview')} className={selectClass}>
                  <option value="">Выберите шаблон</option>
                  {templateCollections.interviewInvite.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </FormField>
            ) : null}
          </Panel>

          <Panel title="Интервью">
            {interviewsLoading ? <LoadingSkeleton rows={4} /> : interviews.length === 0 ? <EmptyState title="Нет интервью" /> : (
              <div className="space-y-3">
                {interviews.map((interview) => {
                  const fb = interviewFeedbackMap[interview.id] || { score: String(interview.score ?? ''), feedback: interview.feedback ?? '' }
                  return (
                    <div key={interview.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{selectedApplication?.full_name || 'Кандидат'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatInterviewWindow(interview)} · {interview.format || 'Формат не указан'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[interview.interviewer_name || (interview.interviewer_id ? userMap.get(interview.interviewer_id)?.full_name : null), interview.location || interview.meeting_link].filter(Boolean).join(' · ') || 'Интервьюер и место не указаны'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={interview.status as any}>{interview.status}</StatusBadge>
                          <StatusBadge variant={(interview.invitation_status || 'draft') as any}>{interview.invitation_status || 'draft'}</StatusBadge>
                          {typeof interview.score === 'number' ? <StatusBadge variant="info">Score: {interview.score}/10</StatusBadge> : null}
                        </div>
                      </div>
                      {(interview.participants_json || []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(interview.participants_json || []).map((participant) => (
                            <span key={`${participant.user_id || participant.name}-${participant.role || ''}`} className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                              {participant.name}
                              {participant.role ? ` · ${participant.role}` : ''}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {interview.invitation_message ? <p className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap">{interview.invitation_message}</p> : null}
                      {interview.feedback ? <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{interview.feedback}</p> : null}
                      <div className="mt-4 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_140px_auto]">
                        <FormField label="Оценка (1-10)">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={fb.score}
                            onChange={(e) => setInterviewFeedbackMap((prev) => ({ ...prev, [interview.id]: { ...fb, score: e.target.value } }))}
                            className={inputClass}
                            placeholder="1-10"
                          />
                        </FormField>
                        <FormField label="Фидбек">
                          <textarea
                            value={fb.feedback}
                            onChange={(e) => setInterviewFeedbackMap((prev) => ({ ...prev, [interview.id]: { ...fb, feedback: e.target.value } }))}
                            className={textareaClass}
                            placeholder="Результат интервью, сильные/слабые стороны..."
                          />
                        </FormField>
                        <FormField label="Результат">
                          <select
                            value={interview.result || 'pending'}
                            onChange={(e) => void updateInterview.mutateAsync({ interviewId: interview.id, body: { result: e.target.value } })}
                            className={selectClass}
                          >
                            <option value="pending">Pending</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="no_show">No show</option>
                            <option value="rescheduled">Rescheduled</option>
                          </select>
                        </FormField>
                        <div className="flex items-end">
                          <div className="flex gap-2">
                            {interview.result === 'passed' ? (
                              <Button size="sm" variant="outline" onClick={() => void handleAdvanceCandidateWorkflow('offers', 'offer')} disabled={updateApplication.isPending}>
                                В оффер
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" onClick={() => void handleSendInterviewInvite(interview)} disabled={updateInterview.isPending || interview.invitation_status === 'sent'}>
                              Приглашение
                            </Button>
                            <Button size="sm" onClick={() => void handleSaveInterviewFeedback(interview.id)} disabled={updateInterview.isPending}>
                              Сохранить
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="space-y-6">
          <Panel title="Отправить оффер" description="Создание оффера по кандидату и фиксация статуса согласования.">
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Вакансия">
                <select value={selectedVacancyId} onChange={(e) => setSelectedVacancyId(e.target.value)} className={selectClass}>
                  <option value="">Выберите вакансию</option>
                  {vacancies.map((vacancy) => <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>)}
                </select>
              </FormField>
              <FormField label="Кандидат">
                <select value={selectedApplicationId} onChange={(e) => setSelectedApplicationId(e.target.value)} className={selectClass}>
                  <option value="">Выберите кандидата</option>
                  {applications.map((application) => <option key={application.id} value={application.id}>{application.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Заголовок">
                <input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} className={inputClass} placeholder="Job Offer" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Сумма">
                  <input value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} className={inputClass} placeholder="3000" />
                </FormField>
                <FormField label="Валюта">
                  <select value={offerCurrency} onChange={(e) => setOfferCurrency(e.target.value)} className={selectClass}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="KZT">KZT</option>
                  </select>
                </FormField>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <FormField label="Условия оффера">
                <textarea value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)} className={textareaClass} placeholder="Условия, бонусы, probation, доступы..." />
              </FormField>
              <FormField label="Бенефиты">
                <textarea value={offerBenefits} onChange={(e) => setOfferBenefits(e.target.value)} className={textareaClass} placeholder="Медстраховка, бонусы, техника, relocation..." />
              </FormField>
              <FormField label="Комментарий для согласующих">
                <textarea value={offerApprovalNote} onChange={(e) => setOfferApprovalNote(e.target.value)} className={textareaClass} placeholder="Что должен проверить CEO / hiring manager перед подтверждением оффера..." />
              </FormField>
              <div className="flex items-end">
                <Button onClick={() => void handleCreateOffer()} disabled={createOffer.isPending}>
                  <Send className="h-4 w-4" />
                  Отправить оффер
                </Button>
              </div>
            </div>
            {templateCollections.offer.length > 0 ? (
              <FormField label="Шаблон оффера">
                <select value={offerTemplateId} onChange={(e) => applyTemplateToField(e.target.value, 'offer')} className={selectClass}>
                  <option value="">Выберите шаблон</option>
                  {templateCollections.offer.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </FormField>
            ) : null}
          </Panel>

          <Panel title="Офферы">
            {offersLoading ? <LoadingSkeleton rows={4} /> : offers.length === 0 ? <EmptyState title="Нет офферов" /> : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{offer.title || 'Offer'}</p>
                        <p className="text-sm text-muted-foreground">
                          {offer.salary_amount ? `${offer.currency} ${offer.salary_amount}` : 'Сумма не указана'}
                        </p>
                        {offer.benefits?.length ? <p className="mt-2 text-xs text-muted-foreground">Бенефиты: {offer.benefits.join(', ')}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={offer.status as any}>{offer.status}</StatusBadge>
                        <select value={offer.status} onChange={(e) => void handleOfferStatusChange(offer.id, e.target.value)} className={selectClass}>
                          <option value="draft">Черновик</option>
                          <option value="sent">Отправлен</option>
                          <option value="approved">Согласован</option>
                          <option value="accepted">Принят</option>
                          <option value="declined">Отклонён</option>
                        </select>
                      </div>
                    </div>
                    {offer.terms ? <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{offer.terms}</p> : null}
                    {offer.meta_json?.candidate_response ? (
                      <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                        Ответ кандидата: {offer.meta_json.candidate_response.status || 'pending'}
                        {offer.meta_json.candidate_response.decided_at ? ` · ${offer.meta_json.candidate_response.decided_at.slice(0, 16).replace('T', ' ')}` : ''}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void handleAdvanceCandidateWorkflow('documents')}>
                        Документы
                      </Button>
                      {offer.status === 'accepted' ? (
                        <Button size="sm" onClick={() => void handleStartHiringFromOffer()} disabled={createOnboarding.isPending || createDocument.isPending || updateApplication.isPending}>
                          Запустить найм
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Согласование</p>
                      {(offer.meta_json?.approvals || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Согласующие не назначены.</p>
                      ) : (offer.meta_json?.approvals || []).map((approval) => {
                        const approvalKey = approval.user_id || `${approval.name}-${approval.role || ''}`
                        return (
                          <div key={approvalKey} className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{approval.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[approval.role, approval.note].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'error' : 'warning'}>
                                {approval.status}
                              </StatusBadge>
                              <Button size="sm" variant="outline" onClick={() => void handleOfferApprovalDecision(offer.id, approvalKey, 'approved')} disabled={updateOffer.isPending || !canManageHiring}>
                                Согласовано
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void handleOfferApprovalDecision(offer.id, approvalKey, 'rejected')} disabled={updateOffer.isPending || !canManageHiring}>
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <Panel title="Создать онбординг" description="Оформление нового сотрудника в живом HR-процессе.">
            {!canManageHRCore ? (
              <p className="mb-4 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                У вас режим просмотра. Создание и смена статусов onboarding доступны HR/Founder/CEO/Admin.
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Сотрудник" required>
                <select value={onboardingEmployeeId} onChange={(e) => setOnboardingEmployeeId(e.target.value)} className={selectClass}>
                  <option value="">Выберите сотрудника</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Ментор / buddy">
                <select value={onboardingMentorId} onChange={(e) => setOnboardingMentorId(e.target.value)} className={selectClass}>
                  <option value="">Не назначен</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Должность">
                <input value={onboardingTitle} onChange={(e) => setOnboardingTitle(e.target.value)} className={inputClass} placeholder="Frontend Engineer" />
              </FormField>
              <FormField label="Дата выхода">
                <input type="date" value={onboardingStartDate} onChange={(e) => setOnboardingStartDate(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Испытательный срок до">
                <input type="date" value={onboardingProbationEnd} onChange={(e) => setOnboardingProbationEnd(e.target.value)} className={inputClass} />
              </FormField>
              <div className="md:col-span-2 xl:col-span-3">
                <FormField label="Примечание HR">
                  <textarea value={onboardingNotes} onChange={(e) => setOnboardingNotes(e.target.value)} className={textareaClass} placeholder="Что нужно подготовить к первому дню, какие доступы критичны, какие риски и рекомендации..." />
                </FormField>
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleCreateOnboarding()} disabled={createOnboarding.isPending || !canManageHRCore}>
                  <Plus className="h-4 w-4" />
                  Создать
                </Button>
              </div>
            </div>
          </Panel>
          <ProcessList
            title="Процессы онбординга"
            loading={onboardingLoading}
            emptyTitle="Нет процессов онбординга"
            items={onboarding}
            userMap={userMap}
            onStatusChange={changeOnboardingStatus}
            statusEditable={canManageHRCore}
          />
        </div>
      )}

      {activeTab === 'offboarding' && (
        <div className="space-y-6">
          <Panel title="Создать оффбординг" description="HR формирует приказ, выбирает согласующих, и только после всех согласований сотрудник может быть уволен.">
            {!canManageHRCore ? (
              <p className="mb-4 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                У вас режим просмотра. Создание и смена статусов offboarding доступны HR/Founder/CEO/Admin.
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Сотрудник" required>
                <select value={offboardingEmployeeId} onChange={(e) => setOffboardingEmployeeId(e.target.value)} className={selectClass}>
                  <option value="">Выберите сотрудника</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Последний рабочий день">
                <input type="date" value={offboardingLastDay} onChange={(e) => setOffboardingLastDay(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Причина">
                <input value={offboardingReason} onChange={(e) => setOffboardingReason(e.target.value)} className={inputClass} placeholder="По соглашению сторон" />
              </FormField>
              <FormField label="Название приказа">
                <input value={offboardingDocumentTitle} onChange={(e) => setOffboardingDocumentTitle(e.target.value)} className={inputClass} placeholder="Приказ на увольнение" />
              </FormField>
              <div className="md:col-span-2 xl:col-span-4">
                <FormField label="Текст приказа / комментарий HR">
                  <textarea
                    value={offboardingDocumentBody}
                    onChange={(e) => setOffboardingDocumentBody(e.target.value)}
                    className={textareaClass}
                    placeholder="Кратко укажите основание увольнения, условия передачи дел и дополнительные пояснения для согласующих."
                  />
                </FormField>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <FormField label="Согласующие" required>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setOffboardingApproverPickerOpen((current) => !current)}
                      disabled={!canManageHRCore}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      <span className="text-foreground">
                        {offboardingApproverIds.length > 0
                          ? `Выбрано: ${offboardingApproverIds.length}`
                          : 'Выбрать согласующих'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {offboardingApproverPickerOpen ? 'Скрыть' : 'Открыть'}
                      </span>
                    </button>

                    {offboardingApproverIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {offboardingApproverIds.map((userId) => {
                          const user = userMap.get(userId)
                          return (
                            <span key={userId} className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground">
                              {user?.full_name || userId}
                            </span>
                          )
                        })}
                      </div>
                    ) : null}

                    {offboardingApproverPickerOpen ? (
                      <div className="rounded-xl border border-border bg-card p-3">
                        {offboardingApproverCandidates.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Нет доступных сотрудников для согласования.</p>
                        ) : (
                          <div className="grid max-h-64 gap-2 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                            {offboardingApproverCandidates.map((user) => {
                              const isSelected = offboardingApproverIds.includes(user.id)
                              return (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => toggleOffboardingApprover(user.id)}
                                  className={[
                                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                    isSelected
                                      ? 'border-primary/40 bg-primary/10 text-foreground'
                                      : 'border-border bg-background text-foreground hover:bg-accent',
                                  ].join(' ')}
                                >
                                  <span className="min-w-0 truncate">{user.full_name}</span>
                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {ROLE_LABELS[user.org_role as OrgRole] || user.org_role || 'member'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </FormField>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => void handleCreateOffboarding()}
                  disabled={createOffboarding.isPending || createTerminationOrder.isPending || !canManageHRCore}
                >
                  <Plus className="h-4 w-4" />
                  Отправить на согласование
                </Button>
              </div>
            </div>
          </Panel>
          <Panel title="Приказы на увольнение (согласование)" description="HR отправляет приказ выбранным согласующим. После 100% голосов HR исполняет увольнение.">
            {terminationOrdersLoading ? <LoadingSkeleton rows={4} /> : terminationOrders.length === 0 ? <EmptyState title="Нет приказов на увольнение" /> : (
              <div className="space-y-3">
                {terminationOrders.map((order) => {
                  const canExecute = order.status === 'approved_all' && canManageHRCore && (
                    order.created_by_id === currentUserId || ['founder', 'ceo', 'sysadmin'].includes(activeRole || '')
                  )
                  return (
                    <div key={order.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {order.target_employee_name || order.target_employee_id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.reason || 'Причина не указана'} {order.last_day ? `· Последний день: ${order.last_day}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Инициатор: {order.created_by_name || order.created_by_id}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge variant={order.status === 'executed' ? 'success' : order.status === 'rejected' ? 'error' : 'warning'}>
                            {{
                              pending_approval: 'Ожидает голосов',
                              approved_all: 'Все согласовали',
                              rejected: 'Отклонён',
                              cancelled: 'Отменён',
                              executed: 'Исполнен',
                            }[order.status] || order.status}
                          </StatusBadge>
                          <span className="text-xs text-muted-foreground">
                            {order.approved_count}/{order.approvals_required} голосов
                          </span>
                          {canExecute ? (
                            <Button
                              size="sm"
                              onClick={() => void handleExecuteTermination(order.id)}
                              disabled={executeTerminationOrder.isPending}
                            >
                              Исполнить увольнение
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {order.votes.map((vote) => (
                          <div key={vote.id} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                            <div className="font-medium text-foreground">{vote.approver_name || vote.approver_user_id}</div>
                            <div className="text-muted-foreground">
                              {{
                                pending: 'Ожидает голос',
                                approved: 'Согласовано',
                                rejected: 'Отклонено',
                              }[vote.decision] || vote.decision}
                              {vote.decided_at ? ` · ${new Date(vote.decided_at).toLocaleString()}` : ''}
                            </div>
                            {vote.comment ? <div className="mt-1 text-muted-foreground">{vote.comment}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <Panel title="Создать документ" description="Кадровые документы, договоры и справки.">
            {!canManageHRCore ? (
              <p className="mb-4 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                У вас режим просмотра. Создание и изменение документов доступны HR/Founder/CEO/Admin.
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Шаблон документа">
                <select value={documentTemplateKey} onChange={(e) => handleApplyDocumentTemplate(e.target.value)} className={selectClass}>
                  <option value="">Без шаблона</option>
                  {DOCUMENT_TEMPLATES.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}
                </select>
              </FormField>
              <FormField label="Название" required>
                <input value={documentName} onChange={(e) => setDocumentName(e.target.value)} className={inputClass} placeholder="Трудовой договор №127" />
              </FormField>
              <FormField label="Тип">
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={selectClass}>
                  <option value="contract">Договор</option>
                  <option value="order">Приказ</option>
                  <option value="agreement">Соглашение</option>
                  <option value="certificate">Справка</option>
                </select>
              </FormField>
              <FormField label="Сотрудник">
                <select value={documentEmployeeId} onChange={(e) => setDocumentEmployeeId(e.target.value)} className={selectClass}>
                  <option value="">Без привязки</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </FormField>
              <FormField label="Категория">
                <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className={selectClass}>
                  <option value="employee">Документ сотрудника</option>
                  <option value="company">Документ компании</option>
                  <option value="compliance">Compliance</option>
                  <option value="legal">Юридический пакет</option>
                </select>
              </FormField>
              <FormField label="Кто подписывает">
                <input value={documentSigners} onChange={(e) => setDocumentSigners(e.target.value)} className={inputClass} placeholder="CEO, HR, сотрудник" />
              </FormField>
              <div className="md:col-span-2 xl:col-span-4">
                <FormField label="Содержимое документа">
                  <textarea
                    value={documentBody}
                    onChange={(e) => setDocumentBody(e.target.value)}
                    className={textareaClass}
                    placeholder="Текст документа, шаблонный блок для согласования и подписи..."
                  />
                </FormField>
                <p className="mt-2 text-xs text-muted-foreground">
                  Шаблон может заполнить текст автоматически. При необходимости его можно отредактировать вручную перед созданием.
                </p>
              </div>
              {templateCollections.documentRequest.length > 0 ? (
                <div className="md:col-span-2 xl:col-span-4">
                  <FormField label="Шаблон сообщения для документа">
                    <select value={documentMessageTemplateId} onChange={(e) => applyTemplateToField(e.target.value, 'document')} className={selectClass}>
                      <option value="">Выберите шаблон</option>
                      {templateCollections.documentRequest.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                  </FormField>
                </div>
              ) : null}
              <div className="md:col-span-2 xl:col-span-3">
                <FormField label="Файл документа">
                  <input
                    ref={documentFileInputRef}
                    type="file"
                    onChange={(e) => void handleDocumentFileChange(e)}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button type="button" variant="outline" onClick={() => documentFileInputRef.current?.click()}>
                      Выберите файл
                    </Button>
                    <div className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                      <span className="block truncate">
                        {documentFile?.file_name || 'Файл не выбран'}
                      </span>
                    </div>
                  </div>
                </FormField>
                {documentFile ? (
                  <div className="mt-2 rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{documentFile.file_name}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(documentFile.size / 1024)} KB</p>
                  </div>
                ) : null}
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleCreateDocument()} disabled={createDocument.isPending || !canManageHRCore}>
                  <Plus className="h-4 w-4" />
                  Создать
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Документы">
            {documentsLoading ? <LoadingSkeleton rows={5} /> : documents.length === 0 ? <EmptyState title="Нет документов" /> : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDocumentFolderFilter('all')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${documentFolderFilter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                  >
                    Все ({documents.length})
                  </button>
                  {documentFolders.map((folder) => (
                    <button
                      key={folder.key}
                      type="button"
                      onClick={() => setDocumentFolderFilter(folder.key)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${documentFolderFilter === folder.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                    >
                      {folder.title} ({folder.items.length})
                    </button>
                  ))}
                </div>

                {visibleDocumentFolders.length === 0 ? (
                  <EmptyState title="В выбранной папке нет документов" />
                ) : (
                  visibleDocumentFolders.map((folder) => (
                    <div key={folder.key} className="space-y-3 rounded-xl border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{folder.title}</p>
                          <p className="text-xs text-muted-foreground">{folder.description}</p>
                        </div>
                        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                          {folder.items.length} файлов
                        </span>
                      </div>

                      {folder.items.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground">
                          В этой папке пока нет документов.
                        </div>
                      ) : (
                        folder.items.map((document) => (
                          <div key={document.id} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{document.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {document.document_type} {document.employee_id ? `· ${userMap.get(document.employee_id)?.full_name ?? document.employee_id}` : ''}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {'category' in document.meta_json ? <span>Категория: {String(document.meta_json.category)}</span> : null}
                                  {Array.isArray(document.meta_json.signers) && document.meta_json.signers.length > 0 ? (
                                    <span>Подписанты: {(document.meta_json.signers as string[]).join(', ')}</span>
                                  ) : null}
                                </div>
                                {document.meta_json.generated_content ? (
                                  <div className="mt-3 rounded-xl border border-border bg-background px-3 py-3">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Содержимое</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{document.meta_json.generated_content}</p>
                                  </div>
                                ) : null}
                                {document.meta_json.placeholders && Object.keys(document.meta_json.placeholders).length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {Object.entries(document.meta_json.placeholders).map(([key, value]) => value ? (
                                      <span key={`${document.id}-${key}`} className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1">
                                        {key.replace(/_/g, ' ')}: {String(value)}
                                      </span>
                                    ) : null)}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                {document.file_url ? (
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => void handleAccessHRDocument(document.id, 'view')} className="text-xs text-primary hover:underline">
                                      Открыть
                                    </button>
                                    <button type="button" onClick={() => void handleAccessHRDocument(document.id, 'download')} className="text-xs text-primary hover:underline">
                                      Скачать
                                    </button>
                                  </div>
                                ) : null}
                                {document.status === 'draft' ? (
                                  <Button size="sm" variant="outline" onClick={() => void handleRequestDocumentSignatures(document.id)} disabled={updateDocument.isPending || !canManageHRCore}>
                                    На подпись
                                  </Button>
                                ) : null}
                                <StatusBadge variant={document.status === 'signed' ? 'success' : document.status === 'awaiting_signature' ? 'warning' : 'default'}>
                                  {DOCUMENT_STATUS_LABELS[document.status] || document.status}
                                </StatusBadge>
                                <select value={document.status} onChange={(e) => void changeDocumentStatus(document.id, e.target.value)} className={selectClass} disabled={!canManageHRCore}>
                                  <option value="draft">Черновик</option>
                                  <option value="awaiting_signature">Ожидает подписи</option>
                                  <option value="signed">Подписан</option>
                                </select>
                              </div>
                            </div>
                            {(document.meta_json.signature_requests || []).length > 0 ? (
                              <div className="mt-4 w-full space-y-2 md:mt-3">
                                {(document.meta_json.signature_requests || []).map((request) => (
                                  <div key={request.id} className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{request.signer_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {[request.signer_role, request.note].filter(Boolean).join(' · ')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StatusBadge variant={request.status === 'signed' ? 'success' : request.status === 'rejected' ? 'error' : 'warning'}>
                                        {request.status}
                                      </StatusBadge>
                                      <Button size="sm" variant="outline" onClick={() => void handleDocumentSignerDecision(document.id, request.id, 'signed')} disabled={updateDocument.isPending || !canManageHRCore}>
                                        Подписано
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => void handleDocumentSignerDecision(document.id, request.id, 'rejected')} disabled={updateDocument.isPending || !canManageHRCore}>
                                        Отклонено
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Panel>

          <Panel title="Activity по документу" description="История действий по выбранному документу: создание, статус, подписи, комментарии.">
            <div className="mb-4 max-w-sm">
              <FormField label="Документ">
                <select value={documentAuditId} onChange={(e) => setDocumentAuditId(e.target.value)} className={selectClass}>
                  <option value="">Выберите документ</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <EntityActivityFeed
              orgId={activeOrgId}
              entityType="document"
              entityId={documentAuditId || null}
              title="Журнал документа"
              limit={30}
            />
          </Panel>
        </div>
      )}

      {activeTab === 'leave' && (
        <Panel title="Заявки на отпуск и отсутствие">
          {!canManageHRCore ? (
            <p className="mb-4 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              У вас режим просмотра. Обработка отпусков доступна HR/Founder/CEO/Admin.
            </p>
          ) : !canFinalizeHRDecision ? (
            <p className="mb-4 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Вы можете отправлять решения в поток согласования. Финальное подтверждение делает Founder/CEO/Sysadmin.
            </p>
          ) : null}
          {leaveLoading ? <LoadingSkeleton rows={5} /> : leaveRequests.length === 0 ? <EmptyState title="Нет заявок на отпуск" /> : (
            <div className="space-y-3">
              {leaveRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{userMap.get(request.employee_id)?.full_name ?? request.employee_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.leave_type} · {request.start_date} - {request.end_date} · {request.days_count} дн.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'error' : 'warning'}>
                      {request.status}
                    </StatusBadge>
                    {request.status === 'pending' && canManageHRCore && (
                      <>
                        <Button size="sm" onClick={() => void changeLeaveStatus(request.id, 'approved')}>Одобрить</Button>
                        <Button size="sm" variant="destructive" onClick={() => void changeLeaveStatus(request.id, 'rejected')}>Отклонить</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Briefcase} label="Всего вакансий" value={vacancyAnalytics?.total_vacancies ?? 0} color="violet" />
            <StatCard icon={Users} label="Всего кандидатов" value={vacancyAnalytics?.total_applications ?? 0} color="cyan" />
            <StatCard icon={Send} label="Офферы отправлены" value={vacancyAnalytics?.offers_sent ?? 0} color="green" />
            <StatCard icon={UserCheck} label="Нанято" value={vacancyAnalytics?.hired_candidates ?? 0} color="amber" />
          </div>

          {hrAnalyticsLoading ? <LoadingSkeleton rows={2} /> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Сотрудники в компании" value={hrAnalytics?.total_employees ?? 0} color="cyan" />
              <StatCard icon={UserCheck} label="Активный онбординг" value={hrAnalytics?.active_onboarding ?? 0} color="green" />
              <StatCard icon={UserMinus} label="Активный оффбординг" value={hrAnalytics?.active_offboarding ?? 0} color="amber" />
              <StatCard icon={FileText} label="Документы на подписи" value={hrAnalytics?.documents_awaiting_signature ?? 0} color="violet" />
            </div>
          )}

          <Panel title="Воронка по этапам" description="Визуализация количества кандидатов на каждом этапе.">
            {vacancyAnalyticsLoading ? <LoadingSkeleton rows={6} /> : (() => {
              const stageCounts = vacancyAnalytics?.stage_counts ?? {}
              const barData = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count: count as number }))
              if (barData.length === 0) return <EmptyState title="Пока нет данных по этапам" />
              return (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            })()}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Конверсия по этапам" description="Процент перехода кандидатов между этапами.">
              {vacancyAnalyticsLoading ? <LoadingSkeleton rows={4} /> : (() => {
                const enhanced = vacancyAnalytics as any
                const rates = enhanced?.conversion_rates
                const conversionData = rates ? [
                  { label: 'Applied -> Screening', value: rates.applied_to_screening },
                  { label: 'Screening -> Interview', value: rates.screening_to_interview },
                  { label: 'Interview -> Offer', value: rates.interview_to_offer },
                  { label: 'Offer -> Hired', value: rates.offer_to_hired },
                ] : Object.entries(vacancyAnalytics?.stage_counts ?? {}).map(([stage, count]) => ({
                  label: stage,
                  value: vacancyAnalytics?.total_applications ? Math.round(((count as number) / vacancyAnalytics.total_applications) * 100) : 0,
                }))
                if (conversionData.length === 0) return <EmptyState title="Нет данных" />
                return (
                  <div className="space-y-3">
                    {conversionData.map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.value}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(item.value, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Panel>

            <Panel title="Источники кандидатов" description="Распределение кандидатов по источникам.">
              {vacancyAnalyticsLoading ? <LoadingSkeleton rows={4} /> : (() => {
                const enhanced = vacancyAnalytics as any
                const sourceStats: Record<string, number> = enhanced?.source_stats ?? {}
                const pieData = Object.entries(sourceStats).map(([name, value]) => ({ name, value }))
                if (pieData.length === 0) {
                  const sourceCounts: Record<string, number> = {}
                  applications.forEach((a) => { sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1 })
                  Object.entries(sourceCounts).forEach(([name, value]) => pieData.push({ name, value }))
                }
                if (pieData.length === 0) return <EmptyState title="Нет данных по источникам" />
                return (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </Panel>
          </div>

          <Panel title="Операционные метрики HR" description="Пульс команды найма и качество обработки кандидатов.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Избранные</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{dashboardMetrics.favoriteCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Верифицированные</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{dashboardMetrics.verifiedCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">На интервью</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{dashboardMetrics.interviewCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Средний рейтинг</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{dashboardMetrics.avgRating}</p>
              </div>
            </div>
          </Panel>

          {(() => {
            const enhanced = vacancyAnalytics as any
            if (!enhanced) return null
            return (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Скорость и качество найма" description="Метрики, которые помогают HR видеть узкие места в процессе.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Принято офферов</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{enhanced.offers_accepted ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Отклонено офферов</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{enhanced.offers_declined ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Acceptance rate</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{Math.round((enhanced.offer_acceptance_rate ?? 0) * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Rejection rate</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{Math.round((enhanced.rejection_rate ?? 0) * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">До первого интервью</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{enhanced.avg_time_to_first_interview ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">дней в среднем</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Застрявшие кандидаты</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{enhanced.stale_candidates ?? 0}</p>
                      <p className="text-xs text-muted-foreground">без движения более 7 дней</p>
                    </div>
                  </div>
                </Panel>

                <Panel title="Топ вакансий" description="Где воронка работает лучше всего прямо сейчас.">
                  {Array.isArray(enhanced.top_vacancies) && enhanced.top_vacancies.length > 0 ? (
                    <div className="space-y-2">
                      {enhanced.top_vacancies.map((vacancy: any) => (
                        <div key={vacancy.vacancy_id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{vacancy.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {vacancy.applications} кандидатов · {vacancy.interviews} интервью · {vacancy.offers} офферов · {vacancy.hired} найм
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              Hire rate {Math.round((vacancy.hire_rate ?? 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState title="Пока нет данных по вакансиям" />}
                </Panel>
              </div>
            )
          })()}

          {(() => {
            const enhanced = vacancyAnalytics as any
            if (typeof enhanced?.avg_days_to_close !== 'number') return null
            return (
              <Panel title="Среднее время закрытия вакансии">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-foreground">{enhanced.avg_days_to_close}</span>
                  <span className="text-sm text-muted-foreground">дней</span>
                </div>
              </Panel>
            )
          })()}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <Panel title="Добавить задачу" description="Персональные HR-задачи теперь сохраняются в вашей доске задач организации.">
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Название" required>
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={inputClass} placeholder="Провести exit-интервью" />
              </FormField>
              <FormField label="Исполнитель">
                <input value={currentUserId ? (userMap.get(currentUserId)?.full_name || 'Я') : 'Я'} readOnly className={inputClass} />
              </FormField>
              <FormField label="Срок">
                <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Приоритет">
                <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)} className={selectClass}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </FormField>
            </div>
            {hrTeamOptions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                У вас пока нет доступной команды или проекта, поэтому HR-задачу некуда сохранить. После подключения к проекту задачи будут сохраняться автоматически.
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void handleAddLocalTask()} disabled={hrTeamOptions.length === 0}>
                <Plus className="h-4 w-4" />
                Добавить задачу
              </Button>
            </div>
          </Panel>

          <Panel title="Задачи HR">
            {hrPersistentTasks.length === 0 ? <EmptyState title="Нет задач" /> : (
              <div className="space-y-2">
                {hrPersistentTasks.map((task) => (
                  <div key={task.id} className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-opacity ${task.done ? 'opacity-60' : ''}`}>
                    <button onClick={() => void handleToggleLocalTask(task.id)} className="flex-shrink-0">
                      {task.done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-foreground ${task.done ? 'line-through' : ''}`}>{task.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {task.assignee && <span>{userMap.get(task.assignee)?.full_name ?? 'Не назначен'}</span>}
                        {task.dueDate && <span>До: {task.dueDate}</span>}
                        <span>Статус: {task.status}</span>
                        <span className={`rounded-full px-2 py-0.5 ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-500'}`}>
                          {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => void handleDeleteLocalTask(task.id)} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Panel title={editingTemplateId ? 'Редактировать шаблон' : 'Создать шаблон сообщения'} description="Шаблоны для писем, приглашений, отказов и офферов.">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Название" required>
                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className={inputClass} placeholder="Приглашение на интервью" />
              </FormField>
              <FormField label="Тип шаблона">
                <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className={selectClass}>
                  {TEMPLATE_TYPES.map((tt) => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                </select>
              </FormField>
              <FormField label="Тема письма">
                <input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} className={inputClass} placeholder="Приглашение на собеседование в компанию" />
              </FormField>
            </div>
            <div className="mt-4">
              <FormField label="Тело шаблона" required>
                <textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} className={textareaClass} rows={6} placeholder="Здравствуйте, {name}! Мы рады пригласить вас на собеседование..." />
              </FormField>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-end">
              {editingTemplateId && (
                <Button variant="outline" onClick={() => { setEditingTemplateId(null); setTemplateName(''); setTemplateType('general'); setTemplateSubject(''); setTemplateBody('') }}>
                  Отмена
                </Button>
              )}
              <Button onClick={() => void handleSaveTemplate()} disabled={createTemplate.isPending || updateTemplate.isPending || !canManageHRCore}>
                <Plus className="h-4 w-4" />
                {editingTemplateId ? 'Сохранить' : 'Создать шаблон'}
              </Button>
            </div>
          </Panel>

          <Panel title="Шаблоны сообщений">
            {templatesLoading ? <LoadingSkeleton rows={4} /> : messageTemplates.length === 0 ? <EmptyState title="Нет шаблонов" /> : (
              <div className="space-y-3">
                {messageTemplates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {TEMPLATE_TYPES.find((tt) => tt.value === template.template_type)?.label ?? template.template_type}
                          {template.subject ? ` · ${template.subject}` : ''}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{template.body}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleEditTemplate(template)} disabled={!canManageHRCore} className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => void handleDeleteTemplate(template.id)} disabled={!canManageHRCore} className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function ProcessList({
  title,
  loading,
  emptyTitle,
  items,
  userMap,
  onStatusChange,
  onToggleChecklist,
  statusEditable = true,
}: {
  title: string
  loading: boolean
  emptyTitle: string
  items: Array<{
    id: string
    employee_id: string
    status: string
    checklist: Array<{ label: string; done: boolean; owner?: string; area?: string }>
    job_title?: string | null
    reason?: string | null
    notes?: string | null
    meta_json?: {
      handoffs?: Record<string, { status?: string; owner?: string; note?: string; due_date?: string | null }>
      employee_profile?: {
        work_email?: string | null
        department?: string | null
        location?: string | null
        format?: string | null
        start_manager?: string | null
      }
    }
  }>
  userMap: Map<string, { full_name: string }>
  onStatusChange: (processId: string, status: string) => Promise<void>
  onToggleChecklist?: (processId: string, index: number, done: boolean) => void
  statusEditable?: boolean
}) {
  return (
    <Panel title={title}>
      {loading ? <LoadingSkeleton rows={5} /> : items.length === 0 ? <EmptyState title={emptyTitle} /> : (
        <div className="space-y-3">
          {items.map((item) => {
            const completed = item.checklist.filter((step) => step.done).length
            const areaProgress = item.checklist.reduce<Record<string, { done: number; total: number; owner?: string }>>((acc, step) => {
              const key = step.area || 'other'
              if (!acc[key]) acc[key] = { done: 0, total: 0, owner: step.owner }
              acc[key].total += 1
              if (step.done) acc[key].done += 1
              return acc
            }, {})
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{userMap.get(item.employee_id)?.full_name ?? item.employee_id}</p>
                    <p className="text-sm text-muted-foreground">{item.job_title || item.reason || 'Без дополнительных деталей'}</p>
                    {typeof item.notes === 'string' && item.notes.trim() ? (
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={item.status === 'completed' ? 'success' : item.status === 'blocked' ? 'error' : 'warning'}>
                      {PROCESS_STATUS_LABELS[item.status] || item.status}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">{completed}/{item.checklist.length} шагов</span>
                    <select value={item.status} onChange={(e) => void onStatusChange(item.id, e.target.value)} className={selectClass} disabled={!statusEditable}>
                      <option value="draft">Черновик</option>
                      <option value="in_progress">В работе</option>
                      <option value="blocked">Заблокирован</option>
                      <option value="completed">Завершён</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(areaProgress).map(([area, progress]) => (
                    <div key={area} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {{
                          hr: 'HR',
                          documents: 'Документы',
                          accounting: 'Бухгалтерия',
                          it: 'IT',
                          legal: 'Юристы',
                          manager: 'Руководитель',
                          probation: 'Испытательный срок',
                          other: 'Прочее',
                        }[area] || area}
                      </span>
                      {`: ${progress.done}/${progress.total}`}
                      {progress.owner ? ` · ${progress.owner}` : ''}
                    </div>
                  ))}
                </div>
                {item.meta_json?.employee_profile ? (
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    {item.meta_json.employee_profile.department ? <div>Отдел: {item.meta_json.employee_profile.department}</div> : null}
                    {item.meta_json.employee_profile.location ? <div>Локация: {item.meta_json.employee_profile.location}</div> : null}
                    {item.meta_json.employee_profile.format ? <div>Формат: {item.meta_json.employee_profile.format}</div> : null}
                    {item.meta_json.employee_profile.work_email ? <div>Work email: {item.meta_json.employee_profile.work_email}</div> : null}
                  </div>
                ) : null}
                {item.meta_json?.handoffs && Object.keys(item.meta_json.handoffs).length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {Object.entries(item.meta_json.handoffs).map(([key, handoff]) => (
                      <div key={key} className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{key.toUpperCase()}</span>
                          <span className="text-muted-foreground">{handoff.status || 'pending'}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-muted-foreground">
                          {handoff.owner ? <span>Owner: {handoff.owner}</span> : null}
                          {handoff.due_date ? <span>Due: {handoff.due_date}</span> : null}
                        </div>
                        {handoff.note ? <p className="mt-1 text-muted-foreground">{handoff.note}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function SimpleList({
  items,
}: {
  items: Array<{ id: string; title: string; subtitle: string; status: string }>
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
          <StatusBadge variant={item.status === 'completed' ? 'success' : item.status === 'blocked' ? 'error' : 'warning'}>
            {item.status}
          </StatusBadge>
        </div>
      ))}
    </div>
  )
}
