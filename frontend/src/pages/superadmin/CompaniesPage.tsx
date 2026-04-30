import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Building2, Calendar, CreditCard, Globe, Hash, Loader2, Plus,
  Shield, ShieldCheck, ShieldOff, Users, X, Briefcase, Clock,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, DollarSign,
  Activity, FileText,
} from 'lucide-react'
import { listOrgs, suspendOrg, activateOrg } from '@/api/adminPlatform'
import { useCreateOrg, useMyOrgs } from '@/hooks/useOrg'
import { useAuthStore } from '@/stores/authStore'
import type { Org, OrgWithRole } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import api from '@/api/client'

interface NormalizedOrg {
  id: string
  name: string
  join_code: string
  industry?: string
  is_active: boolean
  description?: string
  website?: string
  owner_id?: string
  max_members?: number
  moderation_status?: string
  moderation_comment?: string
  created_at?: string
  updated_at?: string
  suspended_at?: string
  logo_url?: string
  theme_color?: string
  auto_approve?: boolean
  welcome_message?: string
}

interface OrgDetail {
  id: string
  name: string
  description?: string
  industry?: string
  website?: string
  logo_url?: string
  is_active: boolean
  max_members?: number
  members_count: number
  moderation_status: string
  moderation_comment?: string
  owner_id?: string
  join_code: string
  auto_approve?: boolean
  theme_color?: string
  welcome_message?: string
  created_at?: string
  updated_at?: string
  suspended_at?: string
  billing?: {
    plan_name: string
    status: string
    amount: number
    currency: string
    seats: number
    discount_percent?: number
    next_payment_at?: string
    last_payment_at?: string
  }
}

interface AuditEntry {
  id: string
  event: string
  user_name?: string
  user_email?: string
  severity: string
  created_at: string
  details?: Record<string, unknown>
}

function normalizeOrg(org: Org | OrgWithRole): NormalizedOrg {
  const raw = org as unknown as Record<string, unknown>
  return {
    id: org.id,
    name: org.name,
    join_code: org.join_code,
    industry: org.industry,
    is_active: org.is_active !== false,
    description: org.description,
    website: org.website,
    owner_id: org.owner_id,
    max_members: org.max_members,
    moderation_status: raw.moderation_status as string | undefined,
    moderation_comment: raw.moderation_comment as string | undefined,
    created_at: raw.created_at as string | undefined,
    suspended_at: raw.suspended_at as string | undefined,
    logo_url: raw.logo_url as string | undefined,
    auto_approve: raw.auto_approve as boolean | undefined,
  }
}

const MODERATION_BADGES: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'На модерации', color: 'text-amber-600 bg-amber-500/10', icon: Clock },
  approved: { label: 'Одобрена', color: 'text-green-600 bg-green-500/10', icon: CheckCircle2 },
  rejected: { label: 'Отклонена', color: 'text-red-600 bg-red-500/10', icon: XCircle },
  revision: { label: 'Доработка', color: 'text-blue-600 bg-blue-500/10', icon: AlertTriangle },
}

export default function CompaniesPage() {
  const { t } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const createOrgMutation = useCreateOrg()
  const myOrgsQuery = useMyOrgs()
  const [newCompanyName, setNewCompanyName] = useState('')
  const [platformOrgs, setPlatformOrgs] = useState<Org[]>([])
  const [platformLoading, setPlatformLoading] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadPlatformOrgs = useCallback(async () => {
    if (!isSuperAdmin) return
    setPlatformLoading(true)
    try {
      const response = await listOrgs()
      setPlatformOrgs(response.data)
    } catch {
      toast.error(t('superadmin.loadError'))
    } finally {
      setPlatformLoading(false)
    }
  }, [isSuperAdmin, t])

  useEffect(() => {
    if (isSuperAdmin) {
      void loadPlatformOrgs()
    }
  }, [isSuperAdmin, loadPlatformOrgs])

  const orgs = useMemo(
    () => (isSuperAdmin ? platformOrgs.map(normalizeOrg) : (myOrgsQuery.data ?? []).map(normalizeOrg)),
    [isSuperAdmin, myOrgsQuery.data, platformOrgs],
  )

  const filtered = useMemo(() => {
    return orgs.filter((org) => {
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || org.name.toLowerCase().includes(q) || (org.industry?.toLowerCase().includes(q))
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && org.is_active)
        || (statusFilter === 'suspended' && !org.is_active)
        || (statusFilter === 'pending' && org.moderation_status === 'pending')
      return matchesSearch && matchesStatus
    })
  }, [orgs, search, statusFilter])

  const counts = useMemo(() => ({
    all: orgs.length,
    active: orgs.filter((o) => o.is_active).length,
    suspended: orgs.filter((o) => !o.is_active).length,
    pending: orgs.filter((o) => o.moderation_status === 'pending').length,
  }), [orgs])

  const loading = isSuperAdmin ? platformLoading : myOrgsQuery.isLoading

  async function handleCreateCompany() {
    if (!newCompanyName.trim()) return
    try {
      await createOrgMutation.mutateAsync(newCompanyName.trim())
      setNewCompanyName('')
      toast.success(t('dashboard.orgCreated'))
      if (isSuperAdmin) await loadPlatformOrgs()
    } catch {
      toast.error(t('dashboard.failedCreateOrg'))
    }
  }

  async function handleSuspend(orgId: string) {
    try {
      await suspendOrg(orgId)
      toast.success(t('superadmin.orgSuspended'))
      await loadPlatformOrgs()
    } catch {
      toast.error(t('superadmin.suspendError'))
    }
  }

  async function handleActivate(orgId: string) {
    try {
      await activateOrg(orgId)
      toast.success(t('superadmin.orgActivated'))
      await loadPlatformOrgs()
    } catch {
      toast.error(t('superadmin.activateError'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('superadmin.companies')}
        description={isSuperAdmin ? t('superadmin.companiesDesc') : t('superadmin.myCompaniesDesc')}
        eyebrow={t('shell.platform')}
        actions={
          <div className="flex items-center gap-2">
            <input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder={t('superadmin.companyNamePlaceholder')}
              className="h-9 min-w-[240px] rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
            <Button onClick={handleCreateCompany} disabled={!newCompanyName.trim() || createOrgMutation.isPending}>
              {createOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('superadmin.createCompany')}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Всего компаний" value={counts.all} />
        <StatCard icon={CheckCircle2} label="Активные" value={counts.active} />
        <StatCard icon={ShieldOff} label="Приостановлены" value={counts.suspended} />
        <StatCard icon={Clock} label="На модерации" value={counts.pending} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или отрасли..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'suspended', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Все' : s === 'active' ? 'Активные' : s === 'suspended' ? 'Приостановлены' : 'На модерации'}{' '}
              ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t('superadmin.noCompanies')}
            description={t('superadmin.noCompaniesDesc')}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Компания</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Код</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Отрасль</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Модерация</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => {
                const modBadge = MODERATION_BADGES[org.moderation_status || 'pending'] || MODERATION_BADGES.pending
                const ModIcon = modBadge.icon
                return (
                  <tr
                    key={org.id}
                    className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedOrgId(org.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{org.name}</p>
                          {org.created_at && (
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(org.created_at).toLocaleDateString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{org.join_code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{org.industry || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${modBadge.color}`}>
                        <ModIcon className="h-3 w-3" />
                        {modBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {org.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                          Активна
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                          Приостановлена
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isSuperAdmin && (
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {org.is_active ? (
                            <button
                              onClick={() => handleSuspend(org.id)}
                              className="flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/20 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
                            >
                              <ShieldOff className="h-3 w-3" />
                              Приостановить
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(org.id)}
                              className="flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/20 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Активировать
                            </button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedOrgId && (
        <CompanyDetailDrawer
          orgId={selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          onSuspend={handleSuspend}
          onActivate={handleActivate}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  )
}

// ── Detail Drawer with Tabs ──────────────────────────────────────────────────

type DrawerTab = 'overview' | 'billing' | 'audit'

function CompanyDetailDrawer({
  orgId,
  onClose,
  onSuspend,
  onActivate,
  isSuperAdmin,
}: {
  orgId: string
  onClose: () => void
  onSuspend: (id: string) => Promise<void>
  onActivate: (id: string) => Promise<void>
  isSuperAdmin: boolean
}) {
  const [detail, setDetail] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<DrawerTab>('overview')
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/platform/moderation/${orgId}/detail`)
      .then((res) => setDetail(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => {
    if (tab === 'audit' && auditEntries.length === 0) {
      setAuditLoading(true)
      api.get(`/platform/audit-log?org_id=${orgId}&limit=20`)
        .then((res) => setAuditEntries(res.data?.items ?? []))
        .catch(() => {})
        .finally(() => setAuditLoading(false))
    }
  }, [tab, orgId, auditEntries.length])

  const tabs: { key: DrawerTab; label: string; icon: typeof Building2 }[] = [
    { key: 'overview', label: 'Обзор', icon: Building2 },
    { key: 'billing', label: 'Биллинг', icon: CreditCard },
    { key: 'audit', label: 'Аудит', icon: Activity },
  ]

  const modBadge = detail
    ? (MODERATION_BADGES[detail.moderation_status] || MODERATION_BADGES.pending)
    : MODERATION_BADGES.pending

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{detail?.name || '...'}</h2>
              {detail && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${modBadge.color}`}>
                    {modBadge.label}
                  </span>
                  {detail.is_active ? (
                    <span className="text-[11px] text-green-600">Активна</span>
                  ) : (
                    <span className="text-[11px] text-red-600">Приостановлена</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !detail ? (
            <p className="text-sm text-muted-foreground">Не удалось загрузить данные</p>
          ) : tab === 'overview' ? (
            <OverviewTab detail={detail} />
          ) : tab === 'billing' ? (
            <BillingTab detail={detail} />
          ) : (
            <AuditTab entries={auditEntries} loading={auditLoading} />
          )}
        </div>

        {/* Footer actions */}
        {detail && isSuperAdmin && (
          <div className="border-t border-border px-6 py-4 flex items-center gap-2">
            {detail.is_active ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => { await onSuspend(detail.id); onClose() }}
              >
                <ShieldOff className="h-4 w-4 mr-1" />
                Приостановить
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={async () => { await onActivate(detail.id); onClose() }}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                Активировать
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>Закрыть</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function OverviewTab({ detail }: { detail: OrgDetail }) {
  return (
    <div className="space-y-5">
      {detail.description && (
        <p className="text-sm text-muted-foreground">{detail.description}</p>
      )}

      {detail.moderation_comment && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-600 mb-1">Комментарий модерации</p>
          <p className="text-sm text-foreground">{detail.moderation_comment}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={Hash} label="Код для вступления" value={detail.join_code} mono />
        <InfoCard icon={Briefcase} label="Отрасль" value={detail.industry || '—'} />
        <InfoCard icon={Users} label="Сотрудники" value={`${detail.members_count} / ${detail.max_members || '∞'}`} />
        <InfoCard icon={Shield} label="Модерация" value={MODERATION_BADGES[detail.moderation_status]?.label || detail.moderation_status} />
        <InfoCard icon={Calendar} label="Создана" value={detail.created_at ? new Date(detail.created_at).toLocaleDateString('ru-RU') : '—'} />
        <InfoCard icon={CheckCircle2} label="Автоподтверждение" value={detail.auto_approve ? 'Да' : 'Нет'} />
        {detail.website && <InfoCard icon={Globe} label="Сайт" value={detail.website} />}
        {detail.theme_color && <InfoCard icon={FileText} label="Цвет темы" value={detail.theme_color} />}
      </div>

      {detail.welcome_message && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground mb-1">Приветственное сообщение</p>
          <p className="text-sm text-foreground">{detail.welcome_message}</p>
        </div>
      )}

      {detail.suspended_at && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs font-medium text-red-600">
            Приостановлена {new Date(detail.suspended_at).toLocaleString('ru-RU')}
          </p>
        </div>
      )}
    </div>
  )
}

function BillingTab({ detail }: { detail: OrgDetail }) {
  const billing = detail.billing

  if (!billing) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Нет данных биллинга"
        description="Информация о подписке этой компании ещё не создана."
      />
    )
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: billing!.currency || 'USD', maximumFractionDigits: 0 }).format(amount)
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: 'Активна', color: 'text-green-600 bg-green-500/10' },
    trial: { label: 'Пробная', color: 'text-blue-600 bg-blue-500/10' },
    expired: { label: 'Просрочена', color: 'text-red-600 bg-red-500/10' },
    cancelled: { label: 'Отменена', color: 'text-gray-600 bg-gray-500/10' },
    suspended: { label: 'Приостановлена', color: 'text-orange-600 bg-orange-500/10' },
  }

  const statusInfo = STATUS_LABELS[billing.status] || STATUS_LABELS.active

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={CreditCard} label="Тариф" value={billing.plan_name} />
        <InfoCard icon={DollarSign} label="Сумма" value={formatCurrency(billing.amount)} />
        <InfoCard icon={Users} label="Мест" value={String(billing.seats)} />
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Shield className="h-3.5 w-3.5" />
            Статус подписки
          </div>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {billing.discount_percent && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">Скидка: {billing.discount_percent}%</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <InfoCard
          icon={Calendar}
          label="Следующий платёж"
          value={billing.next_payment_at ? new Date(billing.next_payment_at).toLocaleDateString('ru-RU') : '—'}
        />
        <InfoCard
          icon={Calendar}
          label="Последний платёж"
          value={billing.last_payment_at ? new Date(billing.last_payment_at).toLocaleDateString('ru-RU') : '—'}
        />
      </div>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  platform_moderation_approve: 'Компания одобрена',
  platform_moderation_reject: 'Компания отклонена',
  moderation_revision: 'Запрос на доработку',
  billing_discount_set: 'Установлена скидка',
  billing_company_suspended: 'Компания приостановлена',
  billing_company_restored: 'Компания восстановлена',
  billing_marked_overdue: 'Отмечена просрочка',
  billing_marked_paid: 'Оплата подтверждена',
  admin_org_suspend: 'Компания приостановлена',
  admin_org_activate: 'Компания активирована',
}

const SEVERITY_STYLES: Record<string, string> = {
  info: 'text-blue-500 bg-blue-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  error: 'text-red-500 bg-red-500/10',
}

function AuditTab({ entries, loading }: { entries: AuditEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Нет записей аудита"
        description="События по этой компании будут отображаться по мере работы платформы."
      />
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.info}`}>
            {entry.severity === 'warning' || entry.severity === 'error'
              ? <AlertTriangle className="h-3.5 w-3.5" />
              : <CheckCircle2 className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{EVENT_LABELS[entry.event] || entry.event}</p>
            <p className="text-xs text-muted-foreground">
              {entry.user_name || entry.user_email || 'Система'}
              {' · '}
              {new Date(entry.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, mono }: {
  icon: typeof Building2
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
