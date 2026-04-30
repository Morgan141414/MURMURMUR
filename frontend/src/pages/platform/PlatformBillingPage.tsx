import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle, Building2, CheckCircle2, CreditCard, DollarSign,
  Loader2, Percent, Search, ShieldOff, TrendingUp, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import api from '@/api/client'

interface CompanyBilling {
  id: string
  org_id: string
  org_name: string
  plan_name: string
  status: string
  amount: number
  currency: string
  next_payment_at?: string
  last_payment_at?: string
  seats: number
  discount_percent?: number
  contract_url?: string | null
  provider_name?: string | null
  provider_profile?: Record<string, unknown>
  services?: Array<Record<string, unknown>>
  history?: Array<{
    id: string
    event: string
    actor_name?: string | null
    note?: string | null
    created_at: string
  }>
}

interface BillingStats {
  total_revenue: number
  active_subscriptions: number
  trial_accounts: number
  expired_accounts: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'text-green-600 bg-green-500/10' },
  trial: { label: 'Пробная', color: 'text-blue-600 bg-blue-500/10' },
  expired: { label: 'Просрочена', color: 'text-red-600 bg-red-500/10' },
  cancelled: { label: 'Отменена', color: 'text-gray-600 bg-gray-500/10' },
  suspended: { label: 'Приостановлена', color: 'text-orange-600 bg-orange-500/10' },
  overdue: { label: 'Просрочена', color: 'text-red-600 bg-red-500/10' },
}

const DEFAULT_BILLING_STATS: BillingStats = {
  total_revenue: 0,
  active_subscriptions: 0,
  trial_accounts: 0,
  expired_accounts: 0,
}

export default function PlatformBillingPage() {
  const { t } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const canManage = isSuperAdmin

  const [companies, setCompanies] = useState<CompanyBilling[]>([])
  const [stats, setStats] = useState<BillingStats>(DEFAULT_BILLING_STATS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionTarget, setActionTarget] = useState<CompanyBilling | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)
  const [discountValue, setDiscountValue] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyBilling | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [contractUrl, setContractUrl] = useState('')
  const [providerName, setProviderName] = useState('')
  const [providerPortfolio, setProviderPortfolio] = useState('')
  const [providerDescription, setProviderDescription] = useState('')
  const [servicesJson, setServicesJson] = useState('[\n  {\n    "name": "Payroll support",\n    "status": "active",\n    "cost": 500,\n    "description": "Monthly payroll operations"\n  }\n]')
  const [workflowNote, setWorkflowNote] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [companiesRes, statsRes] = await Promise.allSettled([
        api.get('/platform/billing/companies'),
        api.get('/platform/billing/stats'),
      ])
      if (companiesRes.status === 'fulfilled') setCompanies(companiesRes.value.data ?? [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data ?? DEFAULT_BILLING_STATS)
    } catch { /* API may not be ready */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || c.org_name.toLowerCase().includes(q) || c.plan_name.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [companies, statusFilter, search])

  function formatCurrency(amount: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  }

  function openAction(company: CompanyBilling, type: string) {
    setActionTarget(company)
    setActionType(type)
    setDiscountValue(String(company.discount_percent ?? ''))
    setActionReason('')
  }

  async function executeAction() {
    if (!actionTarget || !actionType) return
    setActionLoading(true)
    try {
      const orgId = actionTarget.org_id
      switch (actionType) {
        case 'discount':
          await api.post(`/platform/billing/${orgId}/discount`, {
            discount_percent: discountValue ? parseInt(discountValue) : null,
            reason: actionReason || undefined,
          })
          toast.success('Скидка установлена')
          break
        case 'suspend':
          await api.post(`/platform/billing/${orgId}/suspend`, { reason: actionReason || undefined })
          toast.success('Компания приостановлена')
          break
        case 'restore':
          await api.post(`/platform/billing/${orgId}/restore`)
          toast.success('Компания восстановлена')
          break
        case 'mark-overdue':
          await api.post(`/platform/billing/${orgId}/mark-overdue`)
          toast.success('Отмечена как просроченная')
          break
        case 'mark-paid':
          await api.post(`/platform/billing/${orgId}/mark-paid`)
          toast.success('Оплата подтверждена')
          break
      }
      setActionTarget(null)
      setActionType(null)
      await loadData()
    } catch {
      toast.error('Не удалось выполнить действие')
    } finally {
      setActionLoading(false)
    }
  }

  async function openCompanyBilling(company: CompanyBilling) {
    setDetailLoading(true)
    setSelectedCompany(company)
    try {
      const res = await api.get(`/platform/billing/${company.org_id}/detail`)
      const detail = res.data as CompanyBilling
      setSelectedCompany(detail)
      setContractUrl(detail.contract_url || '')
      setProviderName(detail.provider_name || '')
      setProviderPortfolio(String(detail.provider_profile?.portfolio_url || ''))
      setProviderDescription(String(detail.provider_profile?.description || ''))
      setServicesJson(JSON.stringify(detail.services || [], null, 2))
      setWorkflowNote('')
    } catch {
      toast.error('Не удалось загрузить детали биллинга')
    } finally {
      setDetailLoading(false)
    }
  }

  async function saveWorkflow() {
    if (!selectedCompany) return
    setActionLoading(true)
    try {
      await api.post(`/platform/billing/${selectedCompany.org_id}/workflow`, {
        contract_url: contractUrl || null,
        provider_name: providerName || null,
        provider_profile: {
          portfolio_url: providerPortfolio || null,
          description: providerDescription || null,
        },
        services: JSON.parse(servicesJson),
        note: workflowNote || undefined,
      })
      toast.success(t('platform.billingWorkflowUpdated'))
      await openCompanyBilling(selectedCompany)
      await loadData()
    } catch {
      toast.error(t('platform.billingWorkflowSaveError'))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Биллинг и финансы"
        description="Финансовое управление: подписки компаний, платежи, скидки и доходность."
        eyebrow="Platform"
        badge={
          stats.expired_accounts > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {stats.expired_accounts} просрочено
            </span>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(stats.total_revenue)}</p>
              <p className="text-xs text-muted-foreground">Общий доход</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.active_subscriptions}</p>
              <p className="text-xs text-muted-foreground">Активные подписки</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.trial_accounts}</p>
              <p className="text-xs text-muted-foreground">Пробный период</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.expired_accounts}</p>
              <p className="text-xs text-muted-foreground">Просрочены</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по компании или тарифу..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'trial', 'expired', 'suspended', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Все' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Companies table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Нет данных по биллингу"
            description="Финансовые данные компаний будут отображаться здесь."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Компания</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Тариф</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Сумма</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Мест</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Следующий платёж</th>
                {canManage && <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const statusCfg = STATUS_CONFIG[company.status] || STATUS_CONFIG.active
                return (
                  <tr key={company.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => void openCompanyBilling(company)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{company.org_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{company.plan_name}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(company.amount, company.currency)}
                      {company.discount_percent ? (
                        <span className="ml-1 text-xs text-green-600">-{company.discount_percent}%</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{company.seats}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.next_payment_at ? new Date(company.next_payment_at).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openAction(company, 'discount') }}
                            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
                            title="Скидка"
                          >
                            <Percent className="h-3 w-3" />
                          </button>
                          {company.status === 'active' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); openAction(company, 'suspend') }}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                title="Приостановить"
                              >
                                <ShieldOff className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openAction(company, 'mark-overdue') }}
                                className="rounded-md border border-amber-200 px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Просрочка"
                              >
                                <AlertTriangle className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          {(company.status === 'suspended' || company.status === 'cancelled') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openAction(company, 'restore') }}
                              className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50 transition-colors"
                              title="Восстановить"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                          )}
                          {company.status === 'expired' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openAction(company, 'mark-paid') }}
                              className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50 transition-colors"
                              title="Подтвердить оплату"
                            >
                              <DollarSign className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Action Modal */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setActionTarget(null); setActionType(null) }} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">
                {actionType === 'discount' && 'Установить скидку'}
                {actionType === 'suspend' && 'Приостановить компанию'}
                {actionType === 'restore' && 'Восстановить компанию'}
                {actionType === 'mark-overdue' && 'Отметить просрочку'}
                {actionType === 'mark-paid' && 'Подтвердить оплату'}
              </h3>
              <button onClick={() => { setActionTarget(null); setActionType(null) }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{actionTarget.org_name}</span>
              </div>

              {actionType === 'discount' && (
                <div>
                  <label className="text-xs text-muted-foreground">Скидка (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              )}

              {(actionType === 'discount' || actionType === 'suspend') && (
                <div>
                  <label className="text-xs text-muted-foreground">Причина (необязательно)</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Укажите причину..."
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none"
                  />
                </div>
              )}

              {(actionType === 'restore' || actionType === 'mark-overdue' || actionType === 'mark-paid') && (
                <p className="text-sm text-muted-foreground">
                  {actionType === 'restore' && 'Компания будет восстановлена и снова станет активной.'}
                  {actionType === 'mark-overdue' && 'Компания будет отмечена как просроченная. Это повлияет на её статус.'}
                  {actionType === 'mark-paid' && 'Оплата будет подтверждена. Следующий платёж будет через 30 дней.'}
                </p>
              )}
            </div>
            <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setActionTarget(null); setActionType(null) }}>
                Отмена
              </Button>
              <Button
                onClick={executeAction}
                disabled={actionLoading}
                variant={actionType === 'suspend' || actionType === 'mark-overdue' ? 'destructive' : 'default'}
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Подтвердить
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedCompany && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedCompany(null)} />
          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedCompany.org_name}</h3>
                <p className="text-sm text-muted-foreground">{t('platform.billingWorkflowDesc')}</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedCompany(null)}>Закрыть</Button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Ссылка на договор</label>
                    <input value={contractUrl} onChange={(e) => setContractUrl(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Поставщик</label>
                    <input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Портфолио поставщика</label>
                    <input value={providerPortfolio} onChange={(e) => setProviderPortfolio(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Описание поставщика</label>
                    <input value={providerDescription} onChange={(e) => setProviderDescription(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Услуги и статусы (JSON)</label>
                  <textarea value={servicesJson} onChange={(e) => setServicesJson(e.target.value)} rows={10} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Комментарий в историю</label>
                  <textarea value={workflowNote} onChange={(e) => setWorkflowNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => void saveWorkflow()} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Сохранить workflow
                  </Button>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">История биллинга</p>
                  <div className="space-y-2">
                    {(selectedCompany.history || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">История пока пустая</p>
                    ) : (selectedCompany.history || []).map((item) => (
                      <div key={item.id} className="rounded-lg bg-muted/30 px-3 py-2">
                        <p className="text-sm font-medium text-foreground">{item.event}</p>
                        <p className="text-xs text-muted-foreground">{item.actor_name || 'Система'} · {new Date(item.created_at).toLocaleString('ru-RU')}</p>
                        {item.note && <p className="text-xs text-muted-foreground mt-1">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
