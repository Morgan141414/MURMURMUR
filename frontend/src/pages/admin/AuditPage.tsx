import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Activity,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Globe,
  LayoutGrid,
  MessageSquare,
  Monitor,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { exportAudit, getAuditEvent, listAudit } from '@/api/audit'
import type { AuditLog } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Helpers ────────────────────────────────────────────────────────────────

function toText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback
  return String(value)
}

function getEventCategory(event: string): string {
  const e = event.toLowerCase()
  if (e.startsWith('vacancy') || e.startsWith('application') || e.startsWith('interview') || e.startsWith('offer')) return 'vacancy'
  if (e.startsWith('hr_') || e.startsWith('leave') || e.startsWith('employee')) return 'hr'
  if (e.startsWith('approval')) return 'approval'
  if (e.startsWith('support')) return 'support'
  if (e.startsWith('org') || e.startsWith('company') || e.startsWith('moderation') || e.startsWith('billing') || e.startsWith('department')) return 'org'
  if (e.startsWith('auth') || e.startsWith('user') || e.startsWith('password') || e.startsWith('profile')) return 'user'
  if (e.startsWith('role') || e.startsWith('permission')) return 'role'
  if (e.startsWith('board') || e.startsWith('task') || e.startsWith('comment') || e.startsWith('project') || e.startsWith('team')) return 'task'
  if (e.startsWith('notification')) return 'notification'
  return 'other'
}

function getCategoryIcon(category: string) {
  const cls = 'h-4 w-4'
  switch (category) {
    case 'vacancy': return <Briefcase className={cls} />
    case 'hr': return <UserCheck className={cls} />
    case 'approval': return <CheckCircle2 className={cls} />
    case 'support': return <MessageSquare className={cls} />
    case 'org': return <Globe className={cls} />
    case 'user': return <Users className={cls} />
    case 'role': return <ShieldCheck className={cls} />
    case 'task': return <LayoutGrid className={cls} />
    case 'notification': return <Activity className={cls} />
    default: return <Activity className={cls} />
  }
}

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  vacancy:  { bg: 'bg-blue-500/10',    border: 'border-blue-400/25',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  hr:       { bg: 'bg-violet-500/10',  border: 'border-violet-400/25', text: 'text-violet-300', dot: 'bg-violet-400' },
  approval: { bg: 'bg-amber-500/10',   border: 'border-amber-400/25',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  support:  { bg: 'bg-cyan-500/10',    border: 'border-cyan-400/25',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  org:      { bg: 'bg-emerald-500/10', border: 'border-emerald-400/25',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  user:     { bg: 'bg-sky-500/10',     border: 'border-sky-400/25',    text: 'text-sky-300',    dot: 'bg-sky-400' },
  role:     { bg: 'bg-rose-500/10',    border: 'border-rose-400/25',   text: 'text-rose-300',   dot: 'bg-rose-400' },
  task:     { bg: 'bg-indigo-500/10',  border: 'border-indigo-400/25', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  notification: { bg: 'bg-orange-500/10', border: 'border-orange-400/25', text: 'text-orange-300', dot: 'bg-orange-400' },
  other:    { bg: 'bg-white/5',        border: 'border-white/10',      text: 'text-white/60',   dot: 'bg-white/40' },
}

const CATEGORY_LABELS_RU: Record<string, string> = {
  vacancy:  'Вакансии',
  hr:       'HR',
  approval: 'Согласования',
  support:  'Поддержка',
  org:      'Компания',
  user:     'Пользователи',
  role:     'Роли',
  task:     'Задачи',
  notification: 'Уведомления',
  other:    'Прочее',
}

function getResultStyle(result: string) {
  const r = result.toLowerCase()
  if (r === 'success') return { bg: 'bg-emerald-500/15', border: 'border-emerald-400/30', text: 'text-emerald-200', label: 'Успешно' }
  if (r === 'failed')  return { bg: 'bg-red-500/15',     border: 'border-red-400/30',     text: 'text-red-200',     label: 'Ошибка' }
  if (r === 'blocked') return { bg: 'bg-red-500/15',     border: 'border-red-400/30',     text: 'text-red-200',     label: 'Заблокировано' }
  if (r === 'pending') return { bg: 'bg-amber-500/15',   border: 'border-amber-400/30',   text: 'text-amber-200',   label: 'В обработке' }
  if (r === 'reverted')return { bg: 'bg-orange-500/15',  border: 'border-orange-400/30',  text: 'text-orange-200',  label: 'Отменено' }
  return { bg: 'bg-white/5', border: 'border-white/15', text: 'text-white/60', label: result }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateGroup(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Сегодня'
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDateGroupKey(iso: string) {
  return new Date(iso).toDateString()
}

const ACTION_LABELS: Record<string, string> = {
  // Auth
  user_login: 'вошёл в систему',
  user_logout: 'вышел из системы',
  user_register: 'зарегистрировался',
  token_refresh: 'обновил токен',
  password_verify_success: 'успешная проверка пароля',
  password_reset_requested: 'запросил сброс пароля',
  password_changed: 'изменил пароль',
  login_success: 'успешно вошёл в систему',
  login_failed: 'неудачная попытка входа',
  logout: 'вышел из системы',
  // Board Tasks (event field)
  board_task_update: 'обновил задачу',
  board_task_create: 'создал задачу',
  board_task_delete: 'удалил задачу',
  board_task_reorder: 'изменил порядок задач',
  board_task_assign: 'назначил исполнителя',
  board_task_unassign: 'убрал исполнителя',
  board_task_comment_create: 'написал комментарий',
  board_task_comment_update: 'обновил комментарий',
  board_task_comment_delete: 'удалил комментарий',
  board_task_checklist_create: 'добавил пункт чеклиста',
  board_task_checklist_update: 'обновил пункт чеклиста',
  board_task_checklist_delete: 'удалил пункт чеклиста',
  board_task_attachment_upload: 'загрузил вложение',
  board_task_attachment_delete: 'удалил вложение',
  // Tasks (action_type field)
    task_create: 'создал задачу',
    task_update: 'обновил задачу',
    task_delete: 'удалил задачу',
    task_reorder: 'изменил порядок задач',
    task_assign: 'назначил исполнителя',
    task_unassign: 'убрал исполнителя',
    task_status_changed: 'изменил статус задачи',
    task_assigned: 'назначил исполнителя',
    task_unassigned: 'убрал исполнителя',
    task_completed: 'выполнил задачу',
    task_reopened: 'открыл задачу заново',
    task_checklist_create: 'добавил пункт чеклиста',
    task_checklist_update: 'обновил пункт чеклиста',
    task_checklist_delete: 'удалил пункт чеклиста',
    task_comment_create: 'написал комментарий',
    task_comment_update: 'обновил комментарий',
    task_comment_delete: 'удалил комментарий',
    task_attachment_upload: 'загрузил вложение',
    task_attachment_delete: 'удалил вложение',
    // Projects
    project_create: 'создал проект',
    project_update: 'обновил проект',
    project_delete: 'удалил проект',
    org_create: 'создал организацию',
    org_update: 'обновил организацию',
    company_updated: 'обновил информацию о компании',
    department_created: 'создал отдел',
    department_updated: 'обновил отдел',
    department_deleted: 'удалил отдел',
    // Teams
    team_create: 'создал команду',
    team_update: 'обновил команду',
    team_delete: 'удалил команду',
    team_member_add: 'добавил в команду',
    team_member_remove: 'убрал из команды',
    team_member_added: 'добавил в команду',
    team_member_removed: 'убрал из команды',
    team_lead_assigned: 'назначил лидера команды',
    // Columns
    column_create: 'создал колонку',
    column_update: 'обновил колонку',
    column_delete: 'удалил колонку',
    board_column_created: 'создал колонку',
    board_column_updated: 'обновил колонку',
    board_column_deleted: 'удалил колонку',
    project_column_created: 'создал колонку',
    project_column_updated: 'обновил колонку',
    project_column_deleted: 'удалил колонку',
    // Organization
    org_invitation_created: 'создал приглашение',
    org_invitation_sent: 'отправил приглашение',
    org_invitation_accepted: 'принял приглашение',
    org_invitation_rejected: 'отклонил приглашение',
    org_join_request: 'подал заявку на вступление',
    org_join_request_approved: 'одобрил заявку',
    org_join_request_rejected: 'отклонил заявку',
    org_join_request_created: 'подал заявку на вступление',
    member_invited: 'создал приглашение',
    invitation_sent: 'отправил приглашение',
    invitation_accepted: 'принял приглашение',
    invitation_rejected: 'отклонил приглашение',
    // Users
    user_create: 'создал пользователя',
    user_update: 'обновил пользователя',
    user_delete: 'удалил пользователя',
    user_profile_updated: 'обновил профиль',
    profile_updated: 'обновил профиль',
    user_avatar_updated: 'обновил аватар',
    role_assign: 'назначил роль',
    role_changed: 'изменил роль',
    // Support
    support_ticket_created: 'создал тикет поддержки',
    support_ticket_reply: 'ответил в тикете',
    support_ticket_resolved: 'закрыл тикет',
    support_ticket_assigned: 'назначил тикет',
    support_ticket_routed_to_moderation: 'передал на модерацию',
    org_support_thread_create: 'создал обращение в поддержку',
    org_support_ticket_reply: 'ответил в тикете поддержки',
    org_support_ticket_resolved: 'закрыл тикет поддержки',
    org_support_message: 'написал в поддержку',
    support_thread_created: 'создал обращение в поддержку',
    // Moderation
    moderation_document_view: 'просмотрел документ',
    moderation_document_download: 'скачал документ',
    moderation_submission_updated: 'обновил заявку',
    moderation_submission_created: 'создал заявку',
    moderation_submission_approved: 'одобрил заявку',
    moderation_submission_rejected: 'отклонил заявку',
    platform_moderation_approve_ceo_change: 'одобрил изменение CEO',
    // Platform
    platform_user_role_set: 'установил роль пользователя',
    platform_user_role_removed: 'убрал роль пользователя',
    // Comments
    comment_create: 'написал комментарий',
    comment_update: 'обновил комментарий',
    comment_delete: 'удалил комментарий',
    // Notifications
    notification_sent: 'отправил уведомление',
    notification_read: 'прочитал уведомление',
    notification_created: 'создал уведомление',
    // Vacancies
    vacancy_create: 'создал вакансию',
    vacancy_update: 'обновил вакансию',
    vacancy_delete: 'удалил вакансию',
    vacancy_published: 'опубликовал вакансию',
    vacancy_closed: 'закрыл вакансию',
    application_created: 'подал заявку на вакансию',
    application_reviewed: 'просмотрел заявку',
    interview_scheduled: 'назначил собеседование',
    interview_completed: 'провел собеседование',
    offer_sent: 'отправил оффер',
    offer_accepted: 'принял оффер',
    offer_rejected: 'отклонил оффер',
    // HR
    employee_create: 'создал сотрудника',
    employee_update: 'обновил сотрудника',
    org_user_hr_profile_updated: 'обновил HR профиль',
    leave_request_create: 'создал заявку на отпуск',
    leave_request_approve: 'одобрил заявку на отпуск',
    leave_request_reject: 'отклонил заявку на отпуск',
    // Approvals
    approval_create: 'создал запрос на согласование',
    approval_approved: 'одобрил запрос на согласование',
    approval_rejected: 'отклонил запрос на согласование',
    // Billing
    billing_updated: 'обновил платежные данные',
    subscription_updated: 'обновил подписку',
    // Generic
    create: 'создал',
    update: 'обновил',
    delete: 'удалил',
}

function translateAction(code: string): string {
  const result = ACTION_LABELS[code] || code.replaceAll('_', ' ')
  return result
}

function buildSentence(item: AuditLog): string {
  const actor = toText(item.actor_name || item.actor_email || item.actor_id, 'Пользователь')
  const rawCode = item.event || item.action_type || item.action || 'unknown'
  const actionCode = toText(rawCode, 'unknown')
  const action = translateAction(actionCode)
  return `${actor} ${action}`
}

function getInitial(item: AuditLog) {
  return toText(item.actor_name || item.actor_email || item.actor_id, 'U').slice(0, 1).toUpperCase()
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AuditPage() {
  const { t } = useTranslation()
  const orgId   = useOrgStore((s) => s.activeOrgId)
  const org     = useOrgStore((s) => s.activeOrg())
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const [logs, setLogs]           = useState<AuditLog[]>([])
  const [selected, setSelected]   = useState<AuditLog | null>(null)
  const [loading, setLoading]     = useState(false)
  const [scope, setScope]         = useState<'my' | 'all'>('all')
  const [actionFilter, setActionFilter]   = useState('')
  const [actorFilter, setActorFilter]     = useState('')
  const [resultFilter, setResultFilter]   = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const canSeeAll = isSuperAdmin || ['founder', 'ceo', 'admin', 'sysadmin'].includes(activeRole ?? '')
  const isHR      = activeRole === 'hr'
  const canChooseScope = canSeeAll || isHR
  const scopeForQuery: 'my' | 'all' = canChooseScope ? scope : 'all'

  // ─── Scope label ──────────────────────────────────────────────────────────
  const scopeLabel = useMemo(() => {
    if (canSeeAll) return 'Активности всей компании'
    if (isHR) return 'HR-журнал + личные действия'
    return 'Доступные вам активности'
  }, [canSeeAll, isHR])

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await listAudit(orgId, {
        scope: scopeForQuery,
        action_type: actionFilter || undefined,
        actor: actorFilter || undefined,
        result_status: resultFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
        limit: 400,
      })
      const items = Array.isArray(res.data) ? (res.data as AuditLog[]) : []
      setLogs(items)
      setSelected((prev) => {
        if (!prev && items.length > 0) return items[0]
        if (prev && !items.some((i) => (i.event_id || i.id) === (prev.event_id || prev.id))) return items[0] ?? null
        return prev
      })
    } catch (err) {
      console.error('[AuditPage] Failed to load audit logs:', err)
      toast.error(t('admin.auditLoadError'))
    } finally {
      setLoading(false)
    }
  }, [orgId, scopeForQuery, actionFilter, actorFilter, resultFilter, dateFrom, dateTo, search, t])

  const handleExport = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await exportAudit(orgId, { scope: scopeForQuery, action_type: actionFilter || undefined, actor: actorFilter || undefined, result_status: resultFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, search: search || undefined, limit: 500 })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `audit-${orgId}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Не удалось экспортировать') }
  }, [orgId, scopeForQuery, actionFilter, actorFilter, resultFilter, dateFrom, dateTo, search])

  const selectEvent = useCallback(async (row: AuditLog) => {
    setSelected(row)
    if (!orgId) return
    const eventId = row.event_id || row.id
    if (!eventId) return
    try { const r = await getAuditEvent(orgId, String(eventId)); setSelected(r.data) } catch { /* ignore */ }
  }, [orgId])

  useEffect(() => { void load() }, [load])

  // ─── Filtered logs ────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    if (!categoryFilter) return logs
    return logs.filter((l) => getEventCategory(toText(l.event || l.action_type || l.action, '')) === categoryFilter)
  }, [logs, categoryFilter])

  // ─── Group by date ────────────────────────────────────────────────────────
  const groupedLogs = useMemo(() => {
    const groups: { key: string; label: string; items: AuditLog[] }[] = []
    const seen = new Map<string, number>()
    for (const item of filteredLogs) {
      const iso = String(item.created_at || '')
      if (!iso) continue
      const key = getDateGroupKey(iso)
      if (!seen.has(key)) {
        seen.set(key, groups.length)
        groups.push({ key, label: formatDateGroup(iso), items: [] })
      }
      groups[seen.get(key)!].items.push(item)
    }
    return groups
  }, [filteredLogs])

  // ─── Category counts ──────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of logs) {
      const cat = getEventCategory(toText(l.event || l.action_type || l.action, ''))
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
  }, [logs])

  if (!orgId) {
    return (
      <div className="page-enter">
        <PageHeader title={t('nav.auditLog')} description={t('admin.noOrg')} breadcrumbs={[{ label: t('shell.company'), to: '/company' }, { label: t('nav.auditLog') }]} />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Активности"
        description={scopeLabel}
        eyebrow="Активности компании"
        breadcrumbs={[{ label: org?.orgName ?? t('shell.company'), to: '/company' }, { label: 'Активность' }]}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            <Activity className="h-3 w-3" />
            {filteredLogs.length} {filteredLogs.length === 1 ? 'событие' : 'событий'}
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Экспорт CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Обновить
            </Button>
          </div>
        }
      />

      {/* ── Main panel ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#07132a] via-[#081530] to-[#0b1e42]" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_84%_24%,rgba(56,189,248,0.10),transparent_40%)]" />

        <div className="relative z-10 flex h-full flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ── Top bar: filters ─────────────────────────────────────────── */}
          <div className="border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              {/* Scope */}
              {canChooseScope ? (
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'my' | 'all')}
                  className="h-9 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white"
                >
                  <option value="all">{canSeeAll ? 'Вся компания' : 'HR + мои действия'}</option>
                  <option value="my">Только мои</option>
                </select>
              ) : (
                <div className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white/50">
                  <ShieldCheck className="h-3.5 w-3.5" /> Доступные события
                </div>
              )}

              {/* Action type */}
              <input
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="Тип действия"
                className="h-9 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/35 w-36"
              />

              {/* Actor */}
              <input
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="Пользователь"
                className="h-9 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/35 w-36"
              />

              {/* Result */}
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="h-9 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white"
              >
                <option value="">Любой результат</option>
                <option value="success">Успешно</option>
                <option value="failed">Ошибка</option>
                <option value="pending">В обработке</option>
                <option value="blocked">Заблокировано</option>
                <option value="reverted">Отменено</option>
              </select>

              {/* Date range */}
              <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white" />
              <span className="text-white/30 text-xs">—</span>
              <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white" />

              {/* Search */}
              <div className="relative ml-auto">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="h-9 w-44 rounded-lg border border-white/15 bg-black/30 pl-8 pr-3 text-sm text-white placeholder:text-white/35"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter('')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  categoryFilter === ''
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/50 hover:text-white/80 border border-transparent'
                }`}
              >
                <LayoutGrid className="h-3 w-3" /> Все <span className="opacity-60">({logs.length})</span>
              </button>
              {Object.entries(CATEGORY_LABELS_RU).map(([cat, label]) => {
                const count = categoryCounts[cat] ?? 0
                if (!count) return null
                const style = CATEGORY_STYLES[cat]
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                      categoryFilter === cat
                        ? `${style.bg} ${style.border} ${style.text}`
                        : 'border-transparent text-white/50 hover:text-white/75'
                    }`}
                  >
                    {getCategoryIcon(cat)} {label} <span className="opacity-60">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div className="grid flex-1 gap-0 xl:grid-cols-[1fr_400px]" style={{ minHeight: 'calc(100vh - 340px)' }}>

            {/* ── Feed ─────────────────────────────────────────────────── */}
            <div className="border-r border-white/10 bg-black/10 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              {filteredLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState icon={ScrollText} title="Событий нет" description="Когда появятся действия, они отобразятся здесь." />
                </div>
              ) : (
                <div className="px-4 py-4 space-y-6">
                  {groupedLogs.map((group) => (
                    <div key={group.key}>
                      {/* Date group header */}
                      <div className="flex items-center gap-2 mb-3 sticky top-0 z-10 py-1">
                        <div className="flex items-center gap-1.5 rounded-md bg-[#0d1730]/90 border border-white/10 px-2.5 py-1 backdrop-blur-sm">
                          <Clock className="h-3 w-3 text-white/40" />
                          <span className="text-xs font-semibold text-white/60">{group.label}</span>
                          <span className="text-[10px] text-white/30">· {group.items.length}</span>
                        </div>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>

                      {/* Events in group */}
                      <div className="relative pl-5 space-y-2">
                        <span className="absolute inset-y-0 left-1.5 w-px bg-white/10" />
                        {group.items.map((item) => {
                          const itemId = item.event_id || item.id
                          const isActive = (selected?.event_id || selected?.id) === itemId
                          const cat = getEventCategory(toText(item.event || item.action_type || item.action, ''))
                          const style = CATEGORY_STYLES[cat]
                          const result = getResultStyle(toText(item.result_status, 'success'))
                          const sentence = buildSentence(item)

                          return (
                            <button
                              key={itemId}
                              onClick={() => void selectEvent(item)}
                              className={[
                                'group relative w-full rounded-xl border p-3.5 text-left transition-all duration-150',
                                'before:absolute before:-left-[18px] before:top-[18px] before:h-2.5 before:w-2.5 before:rounded-full before:border',
                                isActive
                                  ? `border-white/25 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] before:${style.dot} before:border-white/40`
                                  : 'border-white/8 bg-[#0d1932]/60 hover:border-white/18 hover:bg-[#0d1932]/90 before:bg-white/15 before:border-white/20',
                              ].join(' ')}
                            >
                              <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-white ${style.bg} ${style.border}`}>
                                  {getInitial(item)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  {/* Main sentence */}
                                  <p className="text-sm font-medium text-white leading-snug line-clamp-2">
                                    {sentence}
                                  </p>

                                  {/* Meta row */}
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {/* Category badge */}
                                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${style.bg} ${style.border} ${style.text}`}>
                                      {getCategoryIcon(cat)}
                                      {CATEGORY_LABELS_RU[cat]}
                                    </span>

                                    {/* Result badge */}
                                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] border ${result.bg} ${result.border} ${result.text}`}>
                                      {result.label}
                                    </span>

                                    {/* Role */}
                                    {item.actor_role && (
                                      <span className="text-[10px] text-white/40">{item.actor_role}</span>
                                    )}

                                    {/* Time */}
                                    <span className="ml-auto text-[10px] text-white/35 tabular-nums">
                                      {item.created_at ? formatDate(String(item.created_at)) : '—'}
                                    </span>
                                  </div>

                                  {/* Comment preview */}
                                  {item.comment ? (
                                    <p className="mt-1.5 text-xs text-white/60 line-clamp-1 italic">"{item.comment}"</p>
                                  ) : null}
                                </div>

                                <ChevronRight className={`mt-1 h-4 w-4 shrink-0 transition-opacity ${isActive ? 'text-white/60 opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-100'}`} />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Detail panel ─────────────────────────────────────────── */}
            <aside className="bg-[#0d1427]/95 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              {!selected ? (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/40">
                  <div>
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Выберите событие слева, чтобы увидеть детали</p>
                  </div>
                </div>
              ) : (() => {
                const cat = getEventCategory(toText(selected.event || selected.action_type || selected.action, ''))
                const style = CATEGORY_STYLES[cat]
                const result = getResultStyle(toText(selected.result_status, 'success'))
                const sentence = buildSentence(selected)

                return (
                  <div className="p-5 space-y-4">
                    {/* Header card */}
                    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${style.border} bg-black/20 text-sm font-semibold text-white`}>
                          {getInitial(selected)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-snug">{sentence}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${style.bg} ${style.border} ${style.text}`}>
                              {getCategoryIcon(cat)} {CATEGORY_LABELS_RU[cat]}
                            </span>
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] border ${result.bg} ${result.border} ${result.text}`}>
                              {result.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Who */}
                    <DetailSection title="Кто" icon={<Users className="h-3.5 w-3.5" />}>
                      <DetailRow label="Имя" value={selected.actor_name} />
                      <DetailRow label="Email" value={selected.actor_email} />
                      <DetailRow label="Роль" value={selected.actor_role} />
                    </DetailSection>

                    {/* Section: What */}
                    <DetailSection title="Что" icon={<Activity className="h-3.5 w-3.5" />}>
                      <DetailRow label="Действие" value={translateAction(selected.event || selected.action_type || selected.action || '—')} mono />
                      <DetailRow label="Код события" value={selected.event || '—'} mono />
                      <DetailRow label="Объект" value={selected.entity_type || selected.object_type} />
                      <DetailRow label="ID объекта" value={selected.entity_id || selected.object_id} mono />
                    </DetailSection>

                    {/* Section: When */}
                    <DetailSection title="Когда" icon={<Clock className="h-3.5 w-3.5" />}>
                      <DetailRow label="Время" value={selected.created_at ? formatDate(String(selected.created_at)) : undefined} />
                    </DetailSection>

                    {/* Section: Where/Device */}
                    <DetailSection title="Источник" icon={<Monitor className="h-3.5 w-3.5" />}>
                      <DetailRow label="IP" value={selected.source_ip} mono />
                      <DetailRow label="Устройство" value={selected.device_label} />
                      <DetailRow label="Канал" value={selected.source} />
                      <DetailRow label="Request ID" value={selected.request_id} mono />
                    </DetailSection>

                    {/* Comment */}
                    {selected.comment ? (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Комментарий</p>
                        <p className="text-sm text-white/85 italic">"{selected.comment}"</p>
                      </div>
                    ) : null}

                    {/* Old / New value diff */}
                    {(selected.old_value !== undefined || selected.new_value !== undefined) ? (
                      <div className="space-y-2">
                        {selected.old_value !== undefined && (
                          <div className="rounded-lg border border-red-400/15 bg-red-500/8 p-3">
                            <p className="mb-1 text-[10px] uppercase tracking-wider text-red-400/70">Было</p>
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] text-red-200/80">
                              {typeof selected.old_value === 'string' ? selected.old_value : JSON.stringify(selected.old_value, null, 2)}
                            </pre>
                          </div>
                        )}
                        {selected.new_value !== undefined && (
                          <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/8 p-3">
                            <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-400/70">Стало</p>
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] text-emerald-200/80">
                              {typeof selected.new_value === 'string' ? selected.new_value : JSON.stringify(selected.new_value, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Event ID (collapsed) */}
                    <p className="text-[10px] text-white/20 font-mono break-all">ID: {toText(selected.event_id || selected.id)}</p>
                  </div>
                )
              })()}
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/15 overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-white/8 px-3 py-2 bg-white/3">
        <span className="text-white/40">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</span>
      </div>
      <div className="divide-y divide-white/5 px-3">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  const display = value == null || value === '' ? '—' : value
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-24 shrink-0 text-[11px] text-white/35">{label}</span>
      <span className={`flex-1 break-all text-[11px] ${display === '—' ? 'text-white/25' : 'text-white/75'} ${mono ? 'font-mono' : ''}`}>
        {display}
      </span>
    </div>
  )
}
