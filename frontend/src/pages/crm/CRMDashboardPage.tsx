import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getCRMDashboard, getSalesFunnel } from '../../api/crm'
import type { CRMDashboard, SalesFunnelData } from '../../types/crm'
import { useOrgStore } from '@/stores/orgStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CHART_GRID = 'rgba(125, 151, 157, 0.22)'
const CHART_BAR = '#14B8A6'

const followUpTasks = [
  { title: 'Повторный контакт после кардиологии', patient: 'Марат Сейдахмет', due: 'Сегодня 16:00', status: 'Просрочено' },
  { title: 'Записать на контроль анализов', patient: 'Динара Касымова', due: 'Завтра 09:00', status: 'В работе' },
  { title: 'Уточнить источник обращения', patient: 'Айгерим Нурланова', due: '11.05.2026', status: 'Новая' },
]

const leadSources = [
  { name: 'WhatsApp', value: 18 },
  { name: 'Звонки', value: 14 },
  { name: 'Сайт', value: 9 },
  { name: 'Повторные', value: 7 },
]

export default function CRMDashboardPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [dashboard, setDashboard] = useState<CRMDashboard | null>(null)
  const [funnelData, setFunnelData] = useState<SalesFunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const [dashboardResponse, funnelResponse] = await Promise.all([
        getCRMDashboard(activeOrgId),
        getSalesFunnel(activeOrgId),
      ])
      setDashboard(dashboardResponse.data)
      setFunnelData(funnelResponse.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Не удалось загрузить CRM. Проверьте подключение и попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const stages = useMemo(() => funnelData?.stages ?? [], [funnelData])
  const hasCrmData = Boolean(dashboard && (
    dashboard.total_leads > 0 ||
    dashboard.total_deals > 0 ||
    dashboard.contacts_count > 0 ||
    stages.length > 0
  ))

  if (loading) {
    return <LoadingState text="Загружаем CRM: лиды, повторные контакты и задачи на сегодня." />
  }

  if (error) {
    return <ErrorState title="CRM недоступна" message={error} onRetry={loadDashboard} />
  }

  if (!activeOrgId) {
    return (
      <EmptyState
        title="Выберите клинику"
        description="CRM работает в контексте активной клиники: лиды, задачи и повторные визиты привязаны к ней."
        icon={ClipboardList}
      />
    )
  }

  return (
    <div className="mis-workspace space-y-5">
      <section className="mis-command-panel">
        <div>
          <p className="mis-kicker">CRM клиники</p>
          <h1>Лиды, обращения и повторные визиты</h1>
          <p>CRM связана с пациентами, записями и follow-up задачами, чтобы клиника не теряла обращения после приема.</p>
        </div>
        <div className="mis-command-actions">
          <Button variant="outline" onClick={loadDashboard}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Новый лид
          </Button>
        </div>
      </section>

      <PageHeader
        title="Рабочий стол CRM"
        description="Новые обращения, задачи на сегодня, воронка и источники пациентов."
        eyebrow="Рост клиники"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Новые лиды" value={String(dashboard?.new_leads_count ?? 0)} tone="blue" />
        <MetricCard title="Квалифицированы" value={String(dashboard?.qualified_leads_count ?? 0)} tone="green" />
        <MetricCard title="Открытые сделки" value={String(dashboard?.open_deals_count ?? 0)} tone="amber" />
        <MetricCard title="Контакты" value={String(dashboard?.contacts_count ?? 0)} tone="violet" />
      </div>

      {!hasCrmData ? (
        <EmptyState
          title="CRM пока пустая"
          description="Добавьте первый лид или создайте повторный контакт из завершенного приема."
          icon={MessageSquare}
          action={<Link className="clinic-os-button" to="/company/crm/leads">Открыть лиды</Link>}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Воронка обращений</h2>
              <p className="text-[12px] text-text-tertiary">От нового обращения до записи и повторного контакта</p>
            </div>
            <Link className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover" to="/company/crm/deals">
              Сделки <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {stages.length > 0 ? (
            <div className="space-y-3">
              {stages.map((stage) => (
                <div key={stage.stage} className="rounded-lg border border-border/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-foreground">{stage.stage}</span>
                    <span className="text-[12px] text-text-secondary">{stage.deal_count} обращ.</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(8, Math.min(100, stage.conversion_rate ?? stage.avg_probability ?? 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-[13px] text-text-tertiary">
              Воронка появится после первых лидов и задач.
            </div>
          )}
        </section>

        <aside className="mis-card rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-foreground">Задачи на сегодня</h2>
            <p className="text-[12px] text-text-tertiary">Follow-up и повторные визиты</p>
          </div>
          <div className="space-y-2">
            {followUpTasks.map((task) => (
              <Link
                key={task.title}
                to="/company/crm/tasks"
                className="block rounded-lg border border-border/70 p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{task.title}</p>
                    <p className="mt-0.5 text-[12px] text-text-tertiary">{task.patient} - {task.due}</p>
                  </div>
                  <StatusPill status={task.status} />
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <section className="mis-card rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Источники пациентов</h2>
            <p className="text-[12px] text-text-tertiary">Каналы обращений за последние 30 дней</p>
          </div>
          <Link className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover" to="/company/crm/leads">
            Все лиды <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadSources}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_BAR} radius={[6, 6, 0, 0]} name="Обращения" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ title, value, tone }: { title: string; value: string; tone: 'blue' | 'green' | 'amber' | 'violet' }) {
  const iconClass = {
    blue: 'icon-blue',
    green: 'icon-green',
    amber: 'icon-amber',
    violet: 'icon-violet',
  }[tone]

  return (
    <div className="mis-card rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('icon-container icon-container-sm rounded-md', iconClass)}>
          {tone === 'amber' ? <AlertCircle className="h-4 w-4" /> : tone === 'green' ? <CheckCircle2 className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-[22px] font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 text-[12px] text-text-tertiary">{title}</p>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const className = status === 'Просрочено'
    ? 'border-red-500/20 bg-red-500/10 text-red-400'
    : status === 'В работе'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-400'

  return (
    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold', className)}>
      {status}
    </span>
  )
}
