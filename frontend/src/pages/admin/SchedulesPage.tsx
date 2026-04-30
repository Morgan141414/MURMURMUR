import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useOrgStore } from '@/stores/orgStore'
import { listSchedules, createSchedule, runSchedule } from '@/api/schedules'
import type { ReportSchedule } from '@/types'
import { Plus, Play, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export default function SchedulesPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState('org_kpi')
  const [intervalDays, setIntervalDays] = useState(7)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState('json')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const r = await listSchedules(orgId)
      setSchedules(r.data)
    } catch {
      toast.error(t('admin.schedulesLoadError'))
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!orgId || !startDate || !endDate) return
    setCreating(true)
    try {
      await createSchedule(orgId, { report_type: reportType, interval_days: intervalDays, start_date: startDate, end_date: endDate, format })
      toast.success(t('admin.scheduleCreated'))
      load()
    } catch {
      toast.error(t('admin.scheduleCreateError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleRun(id: string) {
    if (!orgId) return
    try {
      await runSchedule(orgId, id, format)
      toast.success(t('admin.reportStarted'))
    } catch {
      toast.error(t('admin.reportStartError'))
    }
  }

  if (!orgId) {
    return (
      <div className="page-enter">
        <PageHeader title={t('admin.schedulesTab')} />
        <p className="text-sm text-muted-foreground">{t('admin.noOrg')}</p>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader title={t('admin.schedules')} description={t('admin.autoReportGeneration')} />

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('admin.createSchedule')}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="org_kpi">org_kpi</option>
            <option value="project_kpi">project_kpi</option>
          </select>
          <input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))}
            placeholder={t('admin.intervalDays')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
        </div>
        <button onClick={handleCreate} disabled={creating || !startDate || !endDate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('common.create')}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : schedules.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{t('admin.noSchedules')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.type')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.interval')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.formatLabel')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s: Record<string, unknown>) => (
                <tr key={String(s.id)} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2 text-foreground">{String(s.report_type)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{String(s.interval_days)}d</td>
                  <td className="px-4 py-2 text-muted-foreground">{String(s.format)}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleRun(String(s.id))}
                      className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                      <Play className="h-3 w-3" /> {t('admin.run')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
