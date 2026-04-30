import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Search,
  Server,
  Shield,
  User,
  Wifi,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'

type Severity = 'critical' | 'high' | 'medium' | 'low'
type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed'

interface Incident {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  category: string
  reportedBy: string
  reportedAt: string
  resolvedAt?: string
  description: string
  affectedServices: string[]
  timeline: { time: string; event: string }[]
}

const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'INC-001',
    title: 'Повышенная задержка API ответов',
    severity: 'high',
    status: 'investigating',
    category: 'Performance',
    reportedBy: 'Мониторинг',
    reportedAt: '2026-03-26T08:15:00',
    description: 'Среднее время ответа API увеличилось с 120ms до 850ms. Затрагивает все эндпоинты авторизации.',
    affectedServices: ['API Server', 'Auth Service'],
    timeline: [
      { time: '08:15', event: 'Обнаружено мониторингом' },
      { time: '08:18', event: 'Назначен SysAdmin Козлов' },
      { time: '08:25', event: 'Начато расследование, подозрение на нагрузку БД' },
    ],
  },
  {
    id: 'INC-002',
    title: 'Ошибка 502 при загрузке файлов > 5MB',
    severity: 'medium',
    status: 'open',
    category: 'Bug',
    reportedBy: 'Петрова М.А.',
    reportedAt: '2026-03-25T14:30:00',
    description: 'При загрузке файлов размером более 5MB возвращается ошибка 502 Bad Gateway. Затрагивает модуль документов.',
    affectedServices: ['File Upload', 'Nginx'],
    timeline: [
      { time: '14:30', event: 'Зарегистрирован пользователем' },
    ],
  },
  {
    id: 'INC-003',
    title: 'Плановое обслуживание БД — завершено',
    severity: 'low',
    status: 'resolved',
    category: 'Maintenance',
    reportedBy: 'SysAdmin',
    reportedAt: '2026-03-24T02:00:00',
    resolvedAt: '2026-03-24T03:30:00',
    description: 'Плановая миграция базы данных и очистка индексов. Время простоя: 90 минут.',
    affectedServices: ['Database'],
    timeline: [
      { time: '02:00', event: 'Начало обслуживания' },
      { time: '02:45', event: 'Миграция завершена' },
      { time: '03:15', event: 'Проверка целостности' },
      { time: '03:30', event: 'Сервис восстановлен' },
    ],
  },
]

const severityConfig = {
  critical: { label: 'Критический', variant: 'error' as const, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  high: { label: 'Высокий', variant: 'warning' as const, tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  medium: { label: 'Средний', variant: 'warning' as const, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  low: { label: 'Низкий', variant: 'info' as const, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
}

const statusConfig = {
  open: { label: 'Открыт', variant: 'error' as const },
  investigating: { label: 'Расследование', variant: 'warning' as const },
  resolved: { label: 'Решён', variant: 'success' as const },
  closed: { label: 'Закрыт', variant: 'default' as const },
}

const categoryIcons = {
  Performance: Server,
  Bug: Bug,
  Security: Shield,
  Maintenance: Database,
  Network: Wifi,
}

export default function PlatformIncidentsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(DEMO_INCIDENTS[0]?.id ?? '')

  const filtered = useMemo(
    () =>
      DEMO_INCIDENTS.filter((incident) => {
        if (statusFilter !== 'all' && incident.status !== statusFilter) return false

        const query = search.trim().toLowerCase()
        if (!query) return true

        return [
          incident.id,
          incident.title,
          incident.category,
          incident.reportedBy,
          incident.description,
          ...incident.affectedServices,
        ].some((value) => value.toLowerCase().includes(query))
      }),
    [search, statusFilter],
  )

  const selectedIncident = filtered.find((incident) => incident.id === selectedIncidentId) ?? filtered[0]

  const columns = useMemo<ColumnDef<Incident>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Инцидент',
        cell: ({ row }) => {
          const incident = row.original
          const Icon = categoryIcons[incident.category as keyof typeof categoryIcons] ?? AlertCircle
          const severity = severityConfig[incident.severity]
          return (
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${severity.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
                  <p className="font-medium text-foreground">{incident.title}</p>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{incident.description}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'reportedBy',
        header: 'Источник',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {row.original.reportedBy}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(row.original.reportedAt).toLocaleString('ru-RU')}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Категория',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category}</span>,
      },
      {
        accessorKey: 'severity',
        header: t('incidents.severity', 'Severity'),
        cell: ({ row }) => {
          const config = severityConfig[row.original.severity]
          return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
        },
      },
      {
        accessorKey: 'status',
        header: 'Статус',
        cell: ({ row }) => {
          const config = statusConfig[row.original.status]
          return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
        },
      },
    ],
    [],
  )

  const openCount = DEMO_INCIDENTS.filter((incident) => incident.status === 'open').length
  const investigatingCount = DEMO_INCIDENTS.filter((incident) => incident.status === 'investigating').length
  const resolvedCount = DEMO_INCIDENTS.filter((incident) => incident.status === 'resolved').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.incidents')}
        description={t('platform.incidentsDesc', 'Инциденты и происшествия на платформе')}
        eyebrow="Platform operations"
        breadcrumbs={[
          { label: t('shell.platform'), to: '/platform' },
          { label: t('nav.incidents') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {openCount + investigatingCount} активных
          </span>
        }
        actions={
          <Button variant="outline">
            <Search className="mr-1.5 h-4 w-4" />
            {t('incidents.search', 'Incident search')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={AlertCircle} label={t('emergency.openIncidents', 'Открытые')} value={openCount} />
        <StatCard icon={Clock} label={t('emergency.investigating', 'На расследовании')} value={investigatingCount} />
        <StatCard icon={CheckCircle2} label={t('emergency.resolved', 'Решённые')} value={resolvedCount} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'open', 'investigating', 'resolved', 'closed'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {value === 'all' ? 'Все статусы' : statusConfig[value].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <EmptyState
            icon={AlertTriangle}
            title={t('emergency.noIncidents', 'Нет инцидентов')}
            description="Инциденты будут отображаться здесь при их регистрации."
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="rounded-2xl border border-border bg-card p-4">
            <DataTable
              columns={columns}
              data={filtered}
              searchable
              globalFilter={search}
              onGlobalFilterChange={setSearch}
              searchPlaceholder="Поиск по инцидентам, сервисам и источнику..."
              onRowClick={(incident) => setSelectedIncidentId(incident.id)}
              emptyTitle="Инциденты не найдены"
              emptyDescription="Попробуйте изменить статусный фильтр или строку поиска."
            />
          </div>

          {selectedIncident ? (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-text-tertiary">{selectedIncident.id}</p>
                  <h2 className="text-lg font-semibold text-foreground">{selectedIncident.title}</h2>
                  <p className="text-sm text-muted-foreground">{selectedIncident.category}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge variant={severityConfig[selectedIncident.severity].variant}>
                    {severityConfig[selectedIncident.severity].label}
                  </StatusBadge>
                  <StatusBadge variant={statusConfig[selectedIncident.status].variant}>
                    {statusConfig[selectedIncident.status].label}
                  </StatusBadge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm text-foreground">{selectedIncident.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{t('incidents.reportedBy', 'Reported by')}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedIncident.reportedBy}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{t('incidents.reportedAt', 'Reported at')}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {new Date(selectedIncident.reportedAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Затронутые сервисы</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncident.affectedServices.map((service) => (
                      <span key={service} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Хронология</h3>
                  <div className="space-y-3">
                    {selectedIncident.timeline.map((entry, index) => (
                      <div key={`${entry.time}-${index}`} className="flex gap-3">
                        <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">{entry.time}</span>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-sm text-foreground">{entry.event}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(selectedIncident.status === 'open' || selectedIncident.status === 'investigating') ? (
                  <div className="flex gap-2 border-t border-border pt-4">
                    {selectedIncident.status === 'open' ? (
                      <Button className="bg-amber-600 hover:bg-amber-700">
                        <Clock className="mr-1.5 h-4 w-4" />
                        Начать расследование
                      </Button>
                    ) : null}
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Отметить решённым
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
