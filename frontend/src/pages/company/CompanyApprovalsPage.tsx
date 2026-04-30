import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileWarning,
  Loader2,
  MessageSquare,
  Paperclip,
  User,
  XCircle,
} from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import {
  listApprovals,
  approveApproval,
  rejectApproval,
  type Approval,
} from '@/api/approvals'
import {
  executeTerminationOrder as executeTerminationOrderRequest,
  listTerminationOrders,
  voteTerminationOrder,
} from '@/api/hr'
import { getOrgModerationSummary, getOrgRegistrationSubmission, updateOrgRegistrationSubmission } from '@/api/orgs'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { ApprovalStatusBadge } from '@/components/shared/ApprovalStatusBadge'
import { ApprovalModal, type ApprovalPayloadDetails } from '@/components/shared/ApprovalModal'
import { EntityActivityFeed } from '@/components/shared/EntityActivityFeed'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, type ModerationDocument, type OrgModerationSummary, type OrgRegistrationSubmission, type OrgRole } from '@/types'

const REGISTRATION_REQUIRED_DOCUMENTS = [
  { type: 'registration_certificate', label: 'Свидетельство о госрегистрации' },
  { type: 'charter', label: 'Устав' },
  { type: 'founder_decision', label: 'Решение учредителя / протокол' },
  { type: 'ceo_appointment_order', label: 'Приказ о назначении CEO' },
] as const

const ACTION_LABELS: Record<string, string> = {
  hire: 'Приём на работу',
  fire: 'Увольнение',
  move_department: 'Перемещение по отделам',
  change_position: 'Смена должности',
  change_role: 'Смена роли',
}

const ACTION_COLORS: Record<string, string> = {
  hire: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  fire: 'bg-red-500/10 text-red-600 border-red-200',
  move_department: 'bg-blue-500/10 text-blue-600 border-blue-200',
  change_position: 'bg-amber-500/10 text-amber-600 border-amber-200',
  change_role: 'bg-violet-500/10 text-violet-600 border-violet-200',
}

function getRegistrationStatusLabel(status: string): string {
  if (status === 'revision') return 'Нужны исправления'
  if (status === 'pending') return 'На проверке'
  if (status === 'approved') return 'Одобрено'
  if (status === 'rejected') return 'Отклонено'
  if (status === 'draft') return 'Черновик'
  return status
}

function getFieldIssues(form: {
  legal_name_kz: string
  legal_name_ru: string
  organization_form: string
  bin: string
  legal_address: string
  company_phone: string
  company_email: string
  oked: string
}): string[] {
  const issues: string[] = []
  if (!form.legal_name_ru.trim()) issues.push('Не заполнено наименование компании на русском языке')
  if (!form.legal_name_kz.trim()) issues.push('Не заполнено наименование компании на казахском языке')
  if (!form.organization_form.trim()) issues.push('Не указана форма организации')
  if (!/^\d{12}$/.test(form.bin.trim())) issues.push('БИН должен содержать 12 цифр')
  if (!form.legal_address.trim()) issues.push('Не указан юридический адрес')
  if (!form.company_phone.trim()) issues.push('Не указан телефон компании')
  if (!form.company_email.trim()) {
    issues.push('Не указан email компании')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email.trim())) {
    issues.push('Email компании заполнен в неверном формате')
  }
  if (!form.oked.trim()) issues.push('Не указан ОКЭД')
  return issues
}

function getPayloadSummary(approval: Approval): string | null {
  const payload = approval.payload || {}
  switch (approval.action_type) {
    case 'move_department':
      return payload.department ? `Отдел: ${payload.department}` : null
    case 'change_position':
      return payload.position ? `Должность: ${payload.position}` : null
    case 'change_role': {
      const role = payload.role as string | undefined
      if (!role) return null
      const label = ROLE_LABELS[role as OrgRole] || role
      return `Роль: ${label}`
    }
    case 'hire': {
      const role = payload.role as string | undefined
      if (!role) return null
      const label = ROLE_LABELS[role as OrgRole] || role
      return `Роль: ${label}`
    }
    default:
      return null
  }
}

function buildModalDetails(approval: Approval): ApprovalPayloadDetails {
  const payload = approval.payload || {}
  const role = payload.role as string | undefined
  return {
    targetUserName: approval.target_user_name,
    targetUserEmail: approval.target_user_email,
    requesterName: approval.requester_name,
    requesterEmail: approval.requester_email,
    department: payload.department as string | undefined,
    position: payload.position as string | undefined,
    role: role,
    roleLabel: role ? (ROLE_LABELS[role as OrgRole] || role) : undefined,
  }
}

export default function CompanyApprovalsPage() {
  const { t } = useTranslation()
  const { activeOrgId, activeOrg } = useOrgStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const currentUserId = useAuthStore((s) => s.userId)
  const activeRole = useOrgStore((s) => s.activeOrgRole())

  const [approvals, setApprovals] = useState<Approval[]>([])
  const [moderationSummary, setModerationSummary] = useState<OrgModerationSummary | null>(null)
  const [registrationSubmission, setRegistrationSubmission] = useState<OrgRegistrationSubmission | null>(null)
  const [registrationForm, setRegistrationForm] = useState({
    legal_name_kz: '',
    legal_name_ru: '',
    organization_form: '',
    bin: '',
    legal_address: '',
    company_phone: '',
    company_email: '',
    oked: '',
    moderator_message: '',
  })
  const [registrationDocuments, setRegistrationDocuments] = useState<ModerationDocument[]>([])
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [terminationOrders, setTerminationOrders] = useState<any[]>([])

  const canApprove = activeRole === 'ceo' || activeRole === 'founder' || isSuperAdmin
  const canEditRegistration = activeRole === 'founder'

  function handleApprovalPolicyInfo() {
    toast.info('Политика согласований в разработке: сейчас доступен базовый workflow с голосованием и исполнением')
  }

  const loadApprovals = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    const [approvalsResult, moderationResult, registrationResult, terminationOrdersResult] = await Promise.allSettled([
      listApprovals(activeOrgId),
      getOrgModerationSummary(activeOrgId),
      getOrgRegistrationSubmission(activeOrgId),
      listTerminationOrders(activeOrgId),
    ])

    if (approvalsResult.status === 'fulfilled') {
      setApprovals(approvalsResult.value.data)
    } else {
      setApprovals([])
    }

    if (moderationResult.status === 'fulfilled') {
      setModerationSummary(moderationResult.value.data)
    } else {
      setModerationSummary(null)
    }

    if (registrationResult.status === 'fulfilled') {
      const submission = registrationResult.value.data as OrgRegistrationSubmission | null
      setRegistrationSubmission(submission)
      if (submission) {
        setRegistrationForm({
          legal_name_kz: submission.legal_name_kz || '',
          legal_name_ru: submission.legal_name_ru || '',
          organization_form: submission.organization_form || '',
          bin: submission.bin || '',
          legal_address: submission.legal_address || '',
          company_phone: submission.company_phone || '',
          company_email: submission.company_email || '',
          oked: submission.oked || '',
          moderator_message: submission.moderator_message || '',
        })
        setRegistrationDocuments(submission.attachments_json ?? [])
      }
    } else {
      setRegistrationSubmission(null)
      setRegistrationDocuments([])
    }

    if (terminationOrdersResult.status === 'fulfilled') {
      setTerminationOrders((terminationOrdersResult.value.data || []) as any[])
    } else {
      setTerminationOrders([])
    }

    if (approvalsResult.status === 'rejected' && terminationOrdersResult.status === 'rejected') {
      toast.error(t('approval.loadError', 'Не удалось загрузить согласования'))
    }

    setLoading(false)
  }, [activeOrgId, t])

  useEffect(() => {
    void loadApprovals()
  }, [loadApprovals])

  const filteredApprovals = useMemo(
    () => statusFilter === 'all' ? approvals : approvals.filter((a) => a.status === statusFilter),
    [approvals, statusFilter],
  )
  const moderationIssues = registrationSubmission?.moderation_issues ?? []
  const moderationIssueKeys = useMemo(
    () => moderationIssues.map((issue) => `${issue.scope}:${issue.target}`),
    [moderationIssues],
  )
  const moderationChecklistStorageKey = useMemo(
    () => (activeOrgId ? `company_registration_issue_checklist:${activeOrgId}` : null),
    [activeOrgId],
  )
  const [resolvedIssueKeys, setResolvedIssueKeys] = useState<string[]>([])
  const moderationIssueByTarget = useMemo(() => {
    const map = new Map<string, { scope: string; target: string; label: string; message: string }>()
    for (const issue of moderationIssues) {
      if (!issue?.target || map.has(issue.target)) continue
      map.set(issue.target, issue)
    }
    return map
  }, [moderationIssues])
  const unresolvedIssues = useMemo(
    () => moderationIssues.filter((issue) => !resolvedIssueKeys.includes(`${issue.scope}:${issue.target}`)),
    [moderationIssues, resolvedIssueKeys],
  )
  const registrationDocumentsByType = useMemo(() => {
    return REGISTRATION_REQUIRED_DOCUMENTS.map((requiredDocument) => ({
      ...requiredDocument,
      document: registrationDocuments.find((item) => item.document_type === requiredDocument.type),
    }))
  }, [registrationDocuments])
  const missingRegistrationDocuments = useMemo(
    () => registrationDocumentsByType.filter((item) => !item.document),
    [registrationDocumentsByType],
  )
  const registrationFieldIssues = useMemo(
    () => getFieldIssues(registrationForm),
    [registrationForm],
  )
  const canResubmitRegistration = canEditRegistration && registrationFieldIssues.length === 0 && missingRegistrationDocuments.length === 0
  const registrationProgress = useMemo(() => {
    const completed =
      REGISTRATION_REQUIRED_DOCUMENTS.length - missingRegistrationDocuments.length + (registrationFieldIssues.length === 0 ? 1 : 0)
    const total = REGISTRATION_REQUIRED_DOCUMENTS.length + 1
    return Math.round((completed / total) * 100)
  }, [missingRegistrationDocuments.length, registrationFieldIssues.length])

  useEffect(() => {
    setResolvedIssueKeys((current) => current.filter((key) => moderationIssueKeys.includes(key)))
  }, [moderationIssueKeys])

  useEffect(() => {
    if (!moderationChecklistStorageKey) return
    try {
      const rawValue = window.localStorage.getItem(moderationChecklistStorageKey)
      if (!rawValue) {
        setResolvedIssueKeys([])
        return
      }
      const parsed = JSON.parse(rawValue)
      if (!Array.isArray(parsed)) {
        setResolvedIssueKeys([])
        return
      }
      const normalized = parsed
        .map((item) => String(item))
        .filter((key) => moderationIssueKeys.includes(key))
      setResolvedIssueKeys(normalized)
    } catch {
      setResolvedIssueKeys([])
    }
  }, [moderationChecklistStorageKey, moderationIssueKeys])

  useEffect(() => {
    if (!moderationChecklistStorageKey) return
    try {
      window.localStorage.setItem(
        moderationChecklistStorageKey,
        JSON.stringify(resolvedIssueKeys.filter((key) => moderationIssueKeys.includes(key))),
      )
    } catch {
      // Ignore storage failures silently (private mode / quota).
    }
  }, [moderationChecklistStorageKey, moderationIssueKeys, resolvedIssueKeys])

  useEffect(() => {
    if ((registrationSubmission?.moderation_status !== 'revision') || unresolvedIssues.length === 0) return
    const firstIssue = unresolvedIssues[0]
    const targetId = firstIssue.scope === 'document'
      ? `registration-document-${firstIssue.target}`
      : `registration-field-${firstIssue.target}`
    const timer = window.setTimeout(() => {
      const element = window.document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [registrationSubmission?.moderation_status, unresolvedIssues])

  const pendingCount = approvals.filter((a) => a.status === 'pending').length
  const approvedCount = approvals.filter((a) => a.status === 'approved').length
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length

  async function handleApprove(comment?: string) {
    if (!activeOrgId || !selectedApproval) return
    try {
      await approveApproval(activeOrgId, selectedApproval.id, comment)
      toast.success(t('approval.approvedMsg', 'Действие одобрено'))
      setSelectedApproval(null)
      await loadApprovals()
    } catch {
      toast.error(t('approval.approveError', 'Не удалось одобрить действие'))
    }
  }

  async function handleReject(comment: string) {
    if (!activeOrgId || !selectedApproval) return
    try {
      await rejectApproval(activeOrgId, selectedApproval.id, comment)
      toast.success(t('approval.rejectedMsg', 'Действие отклонено'))
      setSelectedApproval(null)
      await loadApprovals()
    } catch {
      toast.error(t('approval.rejectError', 'Не удалось отклонить действие'))
    }
  }

  async function handleTerminationVote(orderId: string, decision: 'approved' | 'rejected') {
    if (!activeOrgId) return
    try {
      await voteTerminationOrder(activeOrgId, orderId, { decision })
      toast.success(decision === 'approved' ? 'Голос согласования отправлен' : 'Голос отклонения отправлен')
      await loadApprovals()
    } catch {
      toast.error('Не удалось отправить голос по приказу на увольнение')
    }
  }

  async function handleTerminationExecute(orderId: string) {
    if (!activeOrgId) return
    try {
      await executeTerminationOrderRequest(activeOrgId, orderId)
      toast.success('Сотрудник уволен из компании')
      await loadApprovals()
    } catch {
      toast.error('Не удалось исполнить увольнение')
    }
  }

  async function fileToModerationDocument(
    file: File,
    documentType: string,
    documentLabel: string,
  ): Promise<ModerationDocument> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
      reader.readAsDataURL(file)
    })
    return {
      id: crypto.randomUUID(),
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      size: file.size,
      data_url: dataUrl,
      document_type: documentType,
      document_label: documentLabel,
    }
  }

  async function handleResubmitRegistration() {
    if (!activeOrgId) return
    if (registrationFieldIssues.length > 0 || missingRegistrationDocuments.length > 0) {
      toast.error('Сначала исправьте обязательные поля и загрузите недостающие документы')
      return
    }
    setRegistrationSubmitting(true)
    try {
      const { data } = await updateOrgRegistrationSubmission(activeOrgId, {
        legal_name_kz: registrationForm.legal_name_kz || undefined,
        legal_name_ru: registrationForm.legal_name_ru || undefined,
        organization_form: registrationForm.organization_form || undefined,
        bin: registrationForm.bin || undefined,
        legal_address: registrationForm.legal_address || undefined,
        company_phone: registrationForm.company_phone || undefined,
        company_email: registrationForm.company_email || undefined,
        oked: registrationForm.oked || undefined,
        moderator_message: registrationForm.moderator_message || undefined,
        attachments: registrationDocuments.map((document) => ({
          id: document.id,
          file_name: document.file_name,
          content_type: document.content_type,
          size: document.size,
          data_url: document.data_url,
          document_type: document.document_type || 'registration_certificate',
          document_label: document.document_label,
        })),
      })
      setRegistrationSubmission(data)
      setRegistrationDocuments(data.attachments_json ?? [])
      toast.success('Текущая заявка обновлена и повторно отправлена на проверку')
      await loadApprovals()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось обновить текущую заявку')
    } finally {
      setRegistrationSubmitting(false)
    }
  }

  function toggleResolvedIssue(issueKey: string) {
    setResolvedIssueKeys((current) => current.includes(issueKey)
      ? current.filter((key) => key !== issueKey)
      : [...current, issueKey])
  }

  function jumpToIssue(scope: string, target: string) {
    const targetId = scope === 'document' ? `registration-document-${target}` : `registration-field-${target}`
    const element = window.document.getElementById(targetId)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (!activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t('company.noOrgSelected')}</h2>
        <p className="text-sm text-muted-foreground">{t('company.selectOrgHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.approvals', 'Согласования')}
        description={t('approvals.description', 'Критичные действия компании, требующие подтверждения CEO или Основателя.')}
        eyebrow={t('approvals.eyebrow', 'Workflow подтверждений')}
        breadcrumbs={[
          { label: activeOrg()?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('nav.approvals', 'Согласования') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {t('approvals.pendingCount', { count: pendingCount, defaultValue: `${pendingCount} ожидают` })}
          </span>
        }
        actions={
          <Button type="button" variant="outline" onClick={handleApprovalPolicyInfo}>
            <MessageSquare className="mr-1.5 h-4 w-4" />
            {t('approvals.approvalPolicy', 'Политика согласований')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Clock} label={t('approvals.pending', 'Ожидают')} value={pendingCount} />
        <StatCard icon={CheckCircle2} label={t('approvals.approved', 'Одобрено')} value={approvedCount} />
        <StatCard icon={XCircle} label={t('approvals.rejected', 'Отклонено')} value={rejectedCount} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Приказы на увольнение</h3>
            <p className="text-sm text-muted-foreground">Согласование выбранными руководителями. Исполнение возможно только после 100% голосов.</p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
            {terminationOrders.length} всего
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {terminationOrders.length === 0 ? (
            <EmptyState title="Нет приказов на увольнение" />
          ) : terminationOrders.map((order) => {
            const myVote = (order.votes || []).find((vote: any) => vote.approver_user_id === currentUserId)
            const canVote = order.status === 'pending_approval' && myVote?.decision === 'pending'
            const canExecute = order.status === 'approved_all' && (
              order.created_by_id === currentUserId || ['founder', 'ceo', 'sysadmin'].includes(activeRole || '')
            )
            return (
              <div key={order.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{order.target_employee_name || order.target_employee_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.reason || 'Причина не указана'} {order.last_day ? `· Последний день: ${order.last_day}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Инициатор: {order.created_by_name || order.created_by_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ApprovalStatusBadge
                      status={order.status === 'executed' ? 'approved' : order.status === 'rejected' ? 'rejected' : 'pending'}
                    />
                    <span className="text-xs text-muted-foreground">{order.approved_count}/{order.approvals_required} голосов</span>
                    {canVote ? (
                      <>
                        <Button size="sm" onClick={() => void handleTerminationVote(order.id, 'approved')}>
                          Согласовать
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleTerminationVote(order.id, 'rejected')}>
                          Отклонить
                        </Button>
                      </>
                    ) : null}
                    {canExecute ? (
                      <Button size="sm" onClick={() => void handleTerminationExecute(order.id)}>
                        Уволить сотрудника
                      </Button>
                    ) : null}
                  </div>
                </div>
                {(order.votes || []).length > 0 ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(order.votes || []).map((vote: any) => (
                      <div key={vote.id} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                        <p className="font-medium text-foreground">{vote.approver_name || vote.approver_user_id}</p>
                        <p className="text-muted-foreground">
                          {vote.decision === 'pending'
                            ? 'Ожидает голос'
                            : vote.decision === 'approved'
                              ? 'Согласовано'
                              : vote.decision === 'rejected'
                                ? 'Отклонено'
                                : vote.decision}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {moderationSummary && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Модерация компании</h3>
                <ApprovalStatusBadge
                  status={
                    moderationSummary.moderation_status === 'revision'
                      ? 'rejected'
                      : moderationSummary.moderation_status === 'pending'
                        ? 'pending'
                        : moderationSummary.moderation_status === 'approved'
                          ? 'approved'
                          : 'rejected'
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {moderationSummary.moderator_name || moderationSummary.moderator_email
                  ? `Решение модератора: ${moderationSummary.moderator_name || moderationSummary.moderator_email}`
                  : 'Заявка ещё не обработана модератором платформы'}
              </p>
              {moderationSummary.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Проверено: {new Date(moderationSummary.reviewed_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {moderationSummary.moderation_comment && (
                <p className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground/80">
                  {moderationSummary.moderation_comment}
                </p>
              )}
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground lg:min-w-[360px] lg:max-w-[420px]">
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <p className="mb-2 text-sm font-medium text-foreground">Полная информация о компании</p>
                <div className="space-y-1.5">
                  <p><span className="text-foreground">Название:</span> {moderationSummary.company.name}</p>
                  <p><span className="text-foreground">Код компании:</span> {moderationSummary.company.code || '—'}</p>
                  <p><span className="text-foreground">Код вступления:</span> {moderationSummary.company.join_code}</p>
                  <p><span className="text-foreground">Отрасль:</span> {moderationSummary.company.industry || '—'}</p>
                  <p><span className="text-foreground">Сайт:</span> {moderationSummary.company.website || '—'}</p>
                  <p><span className="text-foreground">Лимит сотрудников:</span> {moderationSummary.company.max_members || '—'}</p>
                  <p><span className="text-foreground">Описание:</span> {moderationSummary.company.description || '—'}</p>
                  <p><span className="text-foreground">Приветствие:</span> {moderationSummary.company.welcome_message || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {registrationSubmission?.registration_kind === 'company' && (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Текущая регистрационная заявка</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Одна заявка, одна история, один поток исправлений. Здесь можно править текущую карточку компании после замечаний модератора.
                </p>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {getRegistrationStatusLabel(registrationSubmission.moderation_status)}
              </span>
            </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Прогресс заявки</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Перед повторной отправкой система проверяет обязательные поля и комплект документов.
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">{registrationProgress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-border/60">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${registrationProgress}%` }} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <StatusPill
                  label="Статус"
                  value={getRegistrationStatusLabel(registrationSubmission.moderation_status)}
                  tone={registrationSubmission.moderation_status === 'approved' ? 'success' : registrationSubmission.moderation_status === 'revision' ? 'warning' : 'default'}
                />
                <StatusPill
                  label="Поля"
                  value={registrationFieldIssues.length === 0 ? 'Готово' : `${registrationFieldIssues.length} проблем`}
                  tone={registrationFieldIssues.length === 0 ? 'success' : 'warning'}
                />
                <StatusPill
                  label="Документы"
                  value={missingRegistrationDocuments.length === 0 ? 'Полный комплект' : `Не хватает ${missingRegistrationDocuments.length}`}
                  tone={missingRegistrationDocuments.length === 0 ? 'success' : 'warning'}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">Поток проверки</p>
              <div className="mt-3 space-y-3 text-sm">
                {[
                  ['Черновик', 'Данные подготовлены и сохранены'],
                  ['На проверке', 'Заявка ушла модератору платформы'],
                  ['Нужны исправления', 'Модератор вернул конкретные замечания'],
                  ['Одобрено', 'Компания подтверждена и активирована'],
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{title}</p>
                      <p className="text-muted-foreground">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {registrationSubmission.moderation_comment ? (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
              <p className="font-medium">Замечание модератора</p>
              <p className="mt-1">{registrationSubmission.moderation_comment}</p>
            </div>
          ) : null}

          {(registrationSubmission.moderation_issues?.length ?? 0) > 0 ? (
            <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Замечания по полям и документам</p>
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300">
                  Осталось: {unresolvedIssues.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {(registrationSubmission.moderation_issues ?? []).map((issue, index) => (
                  <div key={`${issue.scope}-${issue.target}-${index}`} className="rounded-xl border border-violet-500/20 bg-background/60 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                        {issue.scope === 'document' ? 'Документ' : 'Поле'}
                      </span>
                      <span className="text-sm font-medium text-foreground">{issue.label}</span>
                      <span className={[
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        resolvedIssueKeys.includes(`${issue.scope}:${issue.target}`)
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-300',
                      ].join(' ')}>
                        {resolvedIssueKeys.includes(`${issue.scope}:${issue.target}`) ? 'Исправлено' : 'Требует исправления'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => jumpToIssue(issue.scope, issue.target)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        Перейти к месту
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleResolvedIssue(`${issue.scope}:${issue.target}`)}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15"
                      >
                        {resolvedIssueKeys.includes(`${issue.scope}:${issue.target}`) ? 'Снять отметку' : 'Отметить исправленным'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(registrationFieldIssues.length > 0 || missingRegistrationDocuments.length > 0) ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <FileWarning className="mt-0.5 h-5 w-5 text-red-400" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Что нужно исправить перед повторной отправкой</p>
                    <p className="text-sm text-muted-foreground">
                      Система не создаст новую заявку. Она обновит текущую карточку и отправит её модератору повторно.
                    </p>
                  </div>
                  {registrationFieldIssues.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Поля</p>
                      <ul className="mt-2 space-y-1 text-sm text-foreground/90">
                        {registrationFieldIssues.map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {missingRegistrationDocuments.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Документы</p>
                      <ul className="mt-2 space-y-1 text-sm text-foreground/90">
                        {missingRegistrationDocuments.map((item) => (
                          <li key={item.type}>• Не загружен документ: {item.label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RegistrationField id="registration-field-legal_name_ru" label="Наименование (RU)">
              <input value={registrationForm.legal_name_ru} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, legal_name_ru: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('legal_name_ru'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('legal_name_ru') ? <FieldIssueText issue={moderationIssueByTarget.get('legal_name_ru')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-legal_name_kz" label="Наименование (KZ)">
              <input value={registrationForm.legal_name_kz} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, legal_name_kz: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('legal_name_kz'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('legal_name_kz') ? <FieldIssueText issue={moderationIssueByTarget.get('legal_name_kz')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-organization_form" label="Форма организации">
              <input value={registrationForm.organization_form} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, organization_form: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('organization_form'))} disabled={!canEditRegistration} placeholder="ТОО" />
              {moderationIssueByTarget.get('organization_form') ? <FieldIssueText issue={moderationIssueByTarget.get('organization_form')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-bin" label="БИН">
              <input value={registrationForm.bin} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, bin: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('bin'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('bin') ? <FieldIssueText issue={moderationIssueByTarget.get('bin')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-legal_address" label="Юридический адрес">
              <input value={registrationForm.legal_address} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, legal_address: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('legal_address'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('legal_address') ? <FieldIssueText issue={moderationIssueByTarget.get('legal_address')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-oked" label="ОКЭД">
              <input value={registrationForm.oked} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, oked: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('oked'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('oked') ? <FieldIssueText issue={moderationIssueByTarget.get('oked')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-company_email" label="Email компании">
              <input value={registrationForm.company_email} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, company_email: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('company_email'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('company_email') ? <FieldIssueText issue={moderationIssueByTarget.get('company_email')?.message || ''} /> : null}
            </RegistrationField>
            <RegistrationField id="registration-field-company_phone" label="Телефон компании">
              <input value={registrationForm.company_phone} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, company_phone: e.target.value }))} className={resolveFieldClass(moderationIssueByTarget.get('company_phone'))} disabled={!canEditRegistration} />
              {moderationIssueByTarget.get('company_phone') ? <FieldIssueText issue={moderationIssueByTarget.get('company_phone')?.message || ''} /> : null}
            </RegistrationField>
            <div className="lg:col-span-2">
              <RegistrationField label="Комментарий к повторной отправке">
                <textarea
                  value={registrationForm.moderator_message}
                  onChange={(e) => setRegistrationForm((prev) => ({ ...prev, moderator_message: e.target.value }))}
                  className={textareaClass}
                  disabled={!canEditRegistration}
                  placeholder="Что исправили и на что обратить внимание при повторной проверке"
                />
              </RegistrationField>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Документы по заявке</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Требуется полный комплект: {REGISTRATION_REQUIRED_DOCUMENTS.map((item) => item.label).join(', ')}.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {registrationDocumentsByType.map((item) => (
                <div
                  key={item.type}
                  id={`registration-document-${item.type}`}
                  className={[
                    'rounded-2xl border p-4',
                    item.document
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-amber-500/20 bg-amber-500/5',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <span className={[
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          item.document
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-300',
                        ].join(' ')}>
                          {item.document ? 'Загружен' : 'Обязателен'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.document
                          ? `${item.document.file_name} · ${Math.max(1, Math.round(item.document.size / 1024))} KB`
                          : 'Документ ещё не прикреплён к текущей заявке'}
                      </p>
                      {moderationIssueByTarget.get(item.type) ? (
                        <FieldIssueText issue={moderationIssueByTarget.get(item.type)?.message || ''} />
                      ) : null}
                    </div>
                    {canEditRegistration ? (
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                          {item.document ? 'Заменить файл' : 'Загрузить файл'}
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0]
                              if (!file) return
                              try {
                                const document = await fileToModerationDocument(file, item.type, item.label)
                                setRegistrationDocuments((current) => [
                                  ...current.filter((entry) => entry.document_type !== item.type),
                                  document,
                                ])
                              } catch {
                                toast.error('Не удалось подготовить документ')
                              } finally {
                                event.currentTarget.value = ''
                              }
                            }}
                          />
                        </label>
                        {item.document ? (
                          <button
                            type="button"
                            onClick={() => setRegistrationDocuments((current) => current.filter((entry) => entry.document_type !== item.type))}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15"
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {registrationDocuments.filter((document) => !REGISTRATION_REQUIRED_DOCUMENTS.some((item) => item.type === document.document_type)).length > 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Дополнительные файлы</p>
                <div className="mt-3 space-y-2">
                  {registrationDocuments
                    .filter((document) => !REGISTRATION_REQUIRED_DOCUMENTS.some((item) => item.type === document.document_type))
                    .map((document) => (
                      <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{document.file_name}</p>
                          <p className="text-xs text-muted-foreground">{document.document_label || document.document_type || 'document'}</p>
                        </div>
                        {canEditRegistration ? (
                          <button
                            type="button"
                            onClick={() => setRegistrationDocuments((current) => current.filter((item) => item.id !== document.id))}
                            className="text-xs font-medium text-red-500 transition-colors hover:text-red-400"
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            {canEditRegistration ? (
              <div className="mt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                  Добавить дополнительный файл
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      try {
                        const document = await fileToModerationDocument(file, 'supporting_document', file.name)
                        setRegistrationDocuments((current) => [...current, document])
                      } catch {
                        toast.error('Не удалось подготовить документ')
                      } finally {
                        event.currentTarget.value = ''
                      }
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-sm font-semibold text-foreground">Страница статуса заявки</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatusMetric label="Текущий статус" value={getRegistrationStatusLabel(registrationSubmission.moderation_status)} />
              <StatusMetric label="Последнее замечание" value={registrationSubmission.moderation_comment ? 'Есть комментарий' : 'Без замечаний'} />
              <StatusMetric label="Документов" value={`${registrationDocuments.length}`} />
              <StatusMetric label="Ошибок перед отправкой" value={`${registrationFieldIssues.length + missingRegistrationDocuments.length}`} />
            </div>
          </div>

          {canEditRegistration ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={handleResubmitRegistration} disabled={registrationSubmitting || !canResubmitRegistration}>
                {registrationSubmitting ? 'Отправка...' : 'Исправить и отправить ту же заявку'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!registrationSubmission) return
                  setRegistrationForm({
                    legal_name_kz: registrationSubmission.legal_name_kz || '',
                    legal_name_ru: registrationSubmission.legal_name_ru || '',
                    organization_form: registrationSubmission.organization_form || '',
                    bin: registrationSubmission.bin || '',
                    legal_address: registrationSubmission.legal_address || '',
                    company_phone: registrationSubmission.company_phone || '',
                    company_email: registrationSubmission.company_email || '',
                    oked: registrationSubmission.oked || '',
                    moderator_message: registrationSubmission.moderator_message || '',
                  })
                  setRegistrationDocuments(registrationSubmission.attachments_json ?? [])
                }}
              >
                Сбросить правки
              </Button>
              {!canResubmitRegistration ? (
                <p className="self-center text-sm text-muted-foreground">
                  Сначала закройте все обязательные замечания и загрузите недостающие документы.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => {
          const count = s === 'all' ? approvals.length : s === 'pending' ? pendingCount : s === 'approved' ? approvedCount : rejectedCount
          const label = s === 'all' ? t('companyPeople.all', 'Все') : s === 'pending' ? t('approval.statusPending', 'Ожидает') : s === 'approved' ? t('approval.statusApproved', 'Одобрено') : t('approval.statusRejected', 'Отклонено')
          return (
            <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {label} ({count})
            </FilterChip>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={ClipboardCheck}
              title={t('approvals.emptyTitle', 'Нет согласований')}
              description={t('approvals.emptyDescription', 'Когда в компании появится запрос на согласование, он отобразится здесь.')}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredApprovals.map((approval) => {
              const payloadSummary = getPayloadSummary(approval)
              const actionColor = ACTION_COLORS[approval.action_type] || 'bg-gray-500/10 text-gray-600 border-gray-200'

              return (
                <div
                  key={approval.id}
                  className="px-5 py-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Action type badge + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${actionColor}`}>
                          {ACTION_LABELS[approval.action_type] || approval.action_type}
                        </span>
                        <ApprovalStatusBadge status={approval.status} />
                      </div>

                      {/* Target user */}
                      {approval.target_user_name && (
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{approval.target_user_name}</span>
                          {approval.target_user_email && (
                            <span className="text-muted-foreground">({approval.target_user_email})</span>
                          )}
                        </div>
                      )}

                      {/* Payload details */}
                      {payloadSummary && (
                        <p className="text-sm text-foreground/80">
                          {payloadSummary}
                        </p>
                      )}

                      {/* Meta: requester, approver role, date */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        {approval.requester_name && (
                          <>
                            <span>Запросил: {approval.requester_name}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>Утверждает: {approval.approver_role === 'ceo' ? 'CEO' : 'Founder'}</span>
                        <span>·</span>
                        <span>{new Date(approval.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {approval.resolved_at && (
                          <>
                            <span>·</span>
                            <span>
                              {approval.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                              {' '}
                              {new Date(approval.resolved_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Comment if resolved */}
                      {approval.comment && approval.status !== 'pending' && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3 mt-1">
                          {approval.comment}
                        </p>
                      )}
                    </div>

                    {canApprove && approval.status === 'pending' && (
                      <button
                        onClick={() => setSelectedApproval(approval)}
                        className="shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        {t('approval.review', 'Рассмотреть')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeOrgId ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <EntityActivityFeed
            orgId={activeOrgId}
            entityType="org"
            entityId={activeOrgId}
            title="Activity по заявке компании"
            limit={25}
          />
          <EntityActivityFeed
            orgId={activeOrgId}
            entityType="approval"
            entityId={selectedApproval?.id ?? null}
            title="Activity по выбранному согласованию"
            limit={25}
          />
        </div>
      ) : null}

      {selectedApproval && (
        <ApprovalModal
          open={!!selectedApproval}
          onClose={() => setSelectedApproval(null)}
          title={t('approval.reviewTitle', 'Рассмотрение заявки')}
          description={t('approval.reviewDesc', 'Одобрите или отклоните запрос сотрудника.')}
          actionType={ACTION_LABELS[selectedApproval.action_type] || selectedApproval.action_type}
          details={buildModalDetails(selectedApproval)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}

function RegistrationField({
  id,
  label,
  children,
}: {
  id?: string
  label: string
  children: React.ReactNode
}) {
  return (
    <label id={id} className="block space-y-2 scroll-mt-28">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

const fieldClass = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring'
const textareaClass = 'min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring'
const fieldIssueClass = `${fieldClass} border-amber-500/40 bg-amber-500/5`

function resolveFieldClass(issue?: { scope: string; target: string; label: string; message: string }) {
  return issue ? fieldIssueClass : fieldClass
}

function FieldIssueText({ issue }: { issue: string }) {
  return (
    <p className="text-xs text-amber-300">{issue}</p>
  )
}

function StatusPill({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const toneClass = tone === 'success'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    : tone === 'warning'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
      : 'border-border bg-card text-muted-foreground'

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function StatusMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
