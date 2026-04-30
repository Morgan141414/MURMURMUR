import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Download, Loader2, Search, Shield, XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import api from '@/api/client'

interface AuditEntry {
  id: string
  event: string
  user_id?: string
  user_email?: string
  user_name?: string
  role?: string
  org_id?: string
  org_name?: string
  details?: Record<string, unknown>
  severity: string
  ip_address?: string
  created_at: string
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
  content_block_created: 'Контент создан',
  content_block_updated: 'Контент обновлён',
  content_block_deleted: 'Контент удалён',
  content_block_toggled: 'Публикация переключена',
  password_verify_success: 'Подтверждение пароля',
  password_verify_failed: 'Неудачное подтверждение',
  admin_org_suspend: 'Компания приостановлена',
  admin_org_activate: 'Компания активирована',
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  info: { label: 'Инфо', color: 'text-blue-500 bg-blue-500/10', icon: CheckCircle2 },
  warning: { label: 'Внимание', color: 'text-amber-500 bg-amber-500/10', icon: AlertTriangle },
  error: { label: 'Ошибка', color: 'text-red-500 bg-red-500/10', icon: XCircle },
}

const PAGE_SIZE = 50

export default function PlatformAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)

  // Filters
  const [eventFilter, setEventFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      if (eventFilter) params.set('event', eventFilter)
      if (severityFilter !== 'all') params.set('severity', severityFilter)

      const res = await api.get(`/platform/audit-log?${params.toString()}`)
      setEntries(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [page, eventFilter, severityFilter])

  useEffect(() => { void loadEntries() }, [loadEntries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) =>
      (e.event.toLowerCase().includes(q)) ||
      (e.user_name?.toLowerCase().includes(q)) ||
      (e.user_email?.toLowerCase().includes(q)) ||
      (e.org_name?.toLowerCase().includes(q)) ||
      (EVENT_LABELS[e.event]?.toLowerCase().includes(q))
    )
  }, [entries, search])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleExport() {
    const csv = [
      'Дата,Событие,Пользователь,Email,Роль,Компания,Уровень,IP',
      ...filtered.map((e) => [
        e.created_at,
        EVENT_LABELS[e.event] || e.event,
        e.user_name || '',
        e.user_email || '',
        e.role || '',
        e.org_name || '',
        e.severity,
        e.ip_address || '',
      ].map((v) => `"${v}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get unique events for filter
  const uniqueEvents = useMemo(() => {
    const set = new Set(entries.map((e) => e.event))
    return Array.from(set).sort()
  }, [entries])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Журнал аудита"
        description="Полная хронология всех системных событий, действий пользователей и изменений платформы."
        eyebrow="Platform"
        badge={
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            <Shield className="h-3 w-3" />
            {total} записей
          </span>
        }
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Экспорт CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по событию, пользователю, компании..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'info', 'warning', 'error'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSeverityFilter(s); setPage(0) }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                severityFilter === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Все' : SEVERITY_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        <select
          value={eventFilter}
          onChange={(e) => { setEventFilter(e.target.value); setPage(0) }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-ring focus:outline-none"
        >
          <option value="">Все события</option>
          {uniqueEvents.map((ev) => (
            <option key={ev} value={ev}>{EVENT_LABELS[ev] || ev}</option>
          ))}
        </select>
      </div>

      {/* Entries */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="Нет записей аудита"
            description="Системные события будут отображаться здесь по мере работы платформы."
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((entry) => {
              const sev = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info
              const SevIcon = sev.icon
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sev.color}`}>
                    <SevIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {EVENT_LABELS[entry.event] || entry.event}
                      </p>
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${sev.color}`}>
                        {sev.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.user_name || entry.user_email || 'Система'}
                      {entry.role && ` (${entry.role})`}
                      {entry.org_name && ` · ${entry.org_name}`}
                      {entry.ip_address && ` · ${entry.ip_address}`}
                    </p>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString('ru-RU', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString('ru-RU', { year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Страница {page + 1} из {totalPages} · {total} записей
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
