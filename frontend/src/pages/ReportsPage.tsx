import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { useOrgStore } from '@/stores/orgStore'
import { getOrgKpi, getProjectKpi, exportOrgKpi, exportProjectKpi, listReportExports } from '@/api/reports'
import { getAiScorecards } from '@/api/ai'
import { PageHeader } from '@/components/shared/PageHeader'

import {
  BarChart3,
  FolderKanban,
  FileDown,
  Brain,
  Download,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  Target,
  ArrowUpRight,
  Building2,
  Zap,
} from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'
const selectClass = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none'
const btnPrimary = 'flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
const btnSecondary = 'flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50'

function JsonBlock({ data }: { data: unknown }) {
  return (
    <div className="mt-4 max-h-[500px] overflow-auto rounded-lg border border-border bg-muted p-4">
      <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

function LoadingSpinner() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="ml-2 text-sm text-muted-foreground">{t('common.loading')}</span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-semibold text-foreground">
          {entry.dataKey}: <span className="text-primary">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ─── Tab 1: KPI организации ─── */

function OrgKpiTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [teamId, setTeamId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function handleLoad() {
    setLoading(true)
    try {
      const res = await getOrgKpi(orgId, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        team_id: teamId || undefined,
        project_id: projectId || undefined,
      })
      setData(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('reports.loadError')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    try {
      await exportOrgKpi(orgId, {
        export_format: exportFormat,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        team_id: teamId || undefined,
        project_id: projectId || undefined,
      })
      toast.success(t('reports.exportSuccess'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('reports.exportError')
      toast.error(message)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{t('reports.orgKpi')}</h3>
          <p className="text-xs text-muted-foreground">{t('reports.orgKpiDescription')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.from')}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.to')}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.teamId')}</label>
          <input placeholder="team_id" value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.projectId')}</label>
          <input placeholder="project_id" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleLoad} disabled={loading} className={btnPrimary}>
          {loading ? t('common.loading') : t('reports.load')}
        </button>
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className={selectClass}>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <button onClick={handleExport} className={btnSecondary}>
          <Download className="h-4 w-4" />
          {t('reports.export')}
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {!loading && data != null && <JsonBlock data={data} />}
    </div>
  )
}

/* ─── Tab 2: KPI проектов ─── */

function ProjectKpiTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function handleLoad() {
    setLoading(true)
    try {
      const res = await getProjectKpi(orgId, { start_date: startDate || undefined, end_date: endDate || undefined })
      setData(res.data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('reports.loadError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    try {
      await exportProjectKpi(orgId, { export_format: exportFormat, start_date: startDate || undefined, end_date: endDate || undefined })
      toast.success(t('reports.exportSuccess'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('reports.exportError'))
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <FolderKanban className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{t('reports.projectKpi')}</h3>
          <p className="text-xs text-muted-foreground">{t('reports.projectKpiDescription')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.from')}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.to')}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleLoad} disabled={loading} className={btnPrimary}>{loading ? t('common.loading') : t('reports.load')}</button>
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className={selectClass}>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <button onClick={handleExport} className={btnSecondary}>
          <Download className="h-4 w-4" />{t('reports.export')}
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {!loading && data != null && <JsonBlock data={data} />}
    </div>
  )
}

/* ─── Tab 3: Экспорты ─── */

function ExportsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    try {
      const res = await listReportExports(orgId)
      setData(res.data)
      setLoaded(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('reports.loadError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t('reports.exports')}</h3>
            <p className="text-xs text-muted-foreground">{t('reports.exportsHistory')}</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={loading} className={btnSecondary}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('reports.refresh')}
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && loaded && (
        Array.isArray(data) && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">{t('reports.format')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">{t('reports.status')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">{t('reports.created')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => {
                  const row = item as Record<string, unknown>
                  return (
                    <tr key={String(row.id ?? idx)} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(row.id ?? '\u2014')}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {String(row.export_format ?? row.format ?? '\u2014')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                          {String(row.status ?? '\u2014')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{String(row.created_at ?? '\u2014')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <FileDown className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t('reports.noExports')}</p>
          </div>
        )
      )}
    </div>
  )
}

/* ─── Tab 6: AI Аналитика ─── */

function AiAnalyticsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState('day')
  const [mode, setMode] = useState('employee')
  const [roleProfile, setRoleProfile] = useState('developer')
  const [asOf, setAsOf] = useState('')
  const [userId, setUserId] = useState('')
  const [data, setData] = useState<Record<string, unknown>[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLoad() {
    setLoading(true)
    try {
      const res = await getAiScorecards(orgId, {
        period, as_of: asOf || undefined, user_id: userId || undefined,
        mode: mode || undefined, role_profile: roleProfile || undefined,
      })
      setData(res.data as Record<string, unknown>[])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('reports.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const scorecard = data && data.length > 0 ? data[0] : null
  const score = scorecard ? Number(scorecard.score ?? 0) : 0
  const baseline = scorecard ? Number(scorecard.baseline ?? 0) : 0
  const delta = baseline !== 0 ? ((score - baseline) / baseline) * 100 : 0
  const trend = (scorecard?.trend as Array<Record<string, unknown>> | undefined) ?? []
  const primaryDrivers = (scorecard?.primary_drivers as Array<Record<string, unknown>> | undefined) ?? []
  const interpretation = scorecard?.interpretation as Record<string, unknown> | undefined
  const userName = scorecard?.user_name ?? scorecard?.user_id ?? ''
  const periodStart = scorecard?.period_start ?? ''
  const periodEnd = scorecard?.period_end ?? ''

  function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t('reports.aiAnalytics')}</h3>
            <p className="text-xs text-muted-foreground">{t('reports.aiAnalyticsSubtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.period')}</label>
            <div className="flex gap-1 p-0.5 rounded-lg bg-muted">
              <PillButton active={period === 'day'} onClick={() => setPeriod('day')}>{t('reports.day')}</PillButton>
              <PillButton active={period === 'week'} onClick={() => setPeriod('week')}>{t('reports.week')}</PillButton>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.mode')}</label>
            <div className="flex gap-1 p-0.5 rounded-lg bg-muted">
              <PillButton active={mode === 'employee'} onClick={() => setMode('employee')}>{t('reports.employee')}</PillButton>
              <PillButton active={mode === 'executive'} onClick={() => setMode('executive')}>{t('reports.manager')}</PillButton>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.role')}</label>
            <select value={roleProfile} onChange={(e) => setRoleProfile(e.target.value)} className={selectClass}>
              <option value="developer">{t('reports.developer')}</option>
              <option value="manager">{t('reports.managerRole')}</option>
              <option value="office">{t('reports.office')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.date')}</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('reports.userId')}</label>
            <input placeholder={`user_id (${t('reports.userIdOptional')})`} value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button onClick={handleLoad} disabled={loading} className={btnPrimary}>
          <Sparkles className="h-4 w-4" />
          {loading ? t('reports.loading') : t('reports.load')}
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && scorecard != null && (
        <>
          {/* Score Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{t('reports.currentScore')}</p>
              <p className="text-3xl font-bold text-foreground mb-1">{score.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{String(userName)}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{t('reports.baseline')}</p>
              <p className="text-3xl font-bold text-muted-foreground mb-1">{baseline.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{String(periodStart)} \u2014 {String(periodEnd)}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${delta >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {delta >= 0 ? <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" /> : <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{t('reports.delta')}</p>
              <p className={`text-3xl font-bold ${delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h4 className="text-base font-semibold text-foreground">{t('reports.trend')}</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period_start" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Drivers */}
          {primaryDrivers.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-orange-500" />
                <h4 className="text-base font-semibold text-foreground">{t('reports.keyFactors')}</h4>
              </div>
              <div className="space-y-2">
                {primaryDrivers.map((driver, idx) => {
                  const impact = Number(driver.impact ?? 0)
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-accent/50 transition-colors">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${impact >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {impact >= 0 ? '+' : ''}{impact.toFixed(1)}%
                      </span>
                      <span className="text-sm text-foreground">{String(driver.name ?? driver.label ?? driver.factor ?? '\u2014')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Interpretation */}
          {interpretation != null && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-purple-500" />
                <h4 className="text-base font-semibold text-foreground">{t('reports.interpretation')}</h4>
              </div>
              <div className="space-y-3">
                {Object.entries(interpretation).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{key}</p>
                    <p className="text-sm text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && data != null && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Brain className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Main ReportsPage ─── */

export default function ReportsPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const [activeTab, setActiveTab] = useState(0)

  const reportTabs = [
    { id: 0, label: t('reports.orgKpiTab'), icon: BarChart3 },
    { id: 1, label: t('reports.projectKpiTab'), icon: FolderKanban },
    { id: 2, label: t('reports.exportsTab'), icon: FileDown },
    { id: 3, label: t('reports.aiAnalyticsTab'), icon: Brain },
  ]

  if (!orgId) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Building2 className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t('reports.joinOrg')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader title={t('reports.reportsAndAnalytics')} />

      {/* Tab Navigation */}
      <div className="overflow-x-auto pb-1">
        <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
          {reportTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 0 && <OrgKpiTab orgId={orgId} />}
      {activeTab === 1 && <ProjectKpiTab orgId={orgId} />}
      {activeTab === 2 && <ExportsTab orgId={orgId} />}
      {activeTab === 3 && <AiAnalyticsTab orgId={orgId} />}
    </div>
  )
}
