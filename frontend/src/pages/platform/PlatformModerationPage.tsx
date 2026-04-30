import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Scale,
  Search,
  XCircle,
} from 'lucide-react'
import {
  listClinicApplications,
  moderateClinicApplication,
  type ClinicApplication,
  type ClinicApplicationStatus,
} from '@/api/clinicApplications'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/authStore'

type ModerationDecision = Extract<ClinicApplicationStatus, 'approved' | 'needs_changes' | 'rejected' | 'blocked' | 'in_review'>

export default function PlatformModerationPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const canModerate = isSuperAdmin || platformRole === 'moderator' || platformRole === 'tech_support'

  const [items, setItems] = useState<ClinicApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [selected, setSelected] = useState<ClinicApplication | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ClinicApplicationStatus>('all')
  const [moderatorComment, setModeratorComment] = useState('')

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listClinicApplications()
      setItems(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось загрузить заявки клиник')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    setModeratorComment(selected?.moderator_comment || '')
  }, [selected])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesSearch = !query
        || item.name.toLowerCase().includes(query)
        || item.legal_name.toLowerCase().includes(query)
        || item.bin_iin.toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [items, search, statusFilter])

  const counts = useMemo(() => ({
    all: items.length,
    submitted: items.filter((item) => item.status === 'submitted').length,
    in_review: items.filter((item) => item.status === 'in_review').length,
    needs_changes: items.filter((item) => item.status === 'needs_changes').length,
    approved: items.filter((item) => item.status === 'approved').length,
    rejected: items.filter((item) => item.status === 'rejected').length,
  }), [items])

  async function handleDecision(status: ModerationDecision) {
    if (!selected) return
    setProcessingId(selected.id)
    try {
      await moderateClinicApplication(selected.id, {
        status,
        moderator_comment: moderatorComment.trim() || undefined,
      })
      toast.success('Статус заявки обновлён')
      setSelected(null)
      await loadItems()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось обновить заявку')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Модерация клиник"
        description="Очередь founder-заявок на создание клиник в MVP1."
        eyebrow="Platform"
        badge={counts.submitted + counts.in_review > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
            <Clock className="h-3 w-3" />
            {counts.submitted + counts.in_review} в работе
          </span>
        ) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <ModerationStat icon={Clock} label="Отправлены" value={counts.submitted} tone="warning" />
        <ModerationStat icon={Scale} label="На проверке" value={counts.in_review} tone="info" />
        <ModerationStat icon={MessageSquare} label="Доработка" value={counts.needs_changes} tone="info" />
        <ModerationStat icon={CheckCircle2} label="Одобрены" value={counts.approved} tone="success" />
        <ModerationStat icon={XCircle} label="Отклонены" value={counts.rejected} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по клинике, юр. лицу или БИН"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ['all', `Все (${counts.all})`],
            ['submitted', `Отправлены (${counts.submitted})`],
            ['in_review', `На проверке (${counts.in_review})`],
            ['needs_changes', `Доработка (${counts.needs_changes})`],
            ['approved', `Одобрены (${counts.approved})`],
            ['rejected', `Отклонены (${counts.rejected})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value as 'all' | ClinicApplicationStatus)}
              className={[
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14">
              <EmptyState
                icon={Building2}
                title="Нет заявок на модерацию"
                description="Когда founder отправит заявку на создание клиники, она появится в этой очереди."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={[
                    'flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50',
                    selected?.id === item.id ? 'bg-accent/40' : '',
                  ].join(' ')}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <span className={statusPillClass(item.status)}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.legal_name}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>БИН/ИИН: {item.bin_iin}</span>
                      <span>{item.address}</span>
                      <span>{new Date(item.created_at).toLocaleString('ru-RU')}</span>
                    </div>
                    {item.moderator_comment ? (
                      <p className="mt-2 line-clamp-2 text-xs text-amber-300">{item.moderator_comment}</p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {!selected ? (
            <EmptyState
              icon={Scale}
              title="Выбери заявку"
              description="Справа откроются детали клиники и быстрые действия модератора."
            />
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
                  <span className={statusPillClass(selected.status)}>{statusLabel(selected.status)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{selected.legal_name}</p>
              </div>

              <DetailBlock label="БИН / ИИН" value={selected.bin_iin} />
              <DetailBlock label="Адрес" value={selected.address} />
              <DetailBlock label="Контакты" value={selected.contacts || 'Не указаны'} />
              <DetailBlock label="Founder" value={selected.founder_data || 'Не указано'} />
              <DetailBlock label="Реквизиты" value={selected.requisites || 'Не указаны'} />
              <DetailBlock label="Лицензия" value={selected.license_info || 'Не указана'} />
              <DetailBlock label="ОКЭД" value={selected.oked || 'Не указан'} />
              <DetailBlock label="Описание деятельности" value={selected.activity_description || 'Не заполнено'} multiline />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Комментарий модератора</span>
                <Textarea
                  value={moderatorComment}
                  onChange={(e) => setModeratorComment(e.target.value)}
                  placeholder="Что founder должен исправить или что вы проверили при модерации"
                  className="min-h-[120px]"
                  disabled={processingId === selected.id || !canModerate}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleDecision('approved')}
                  disabled={processingId === selected.id || !canModerate}
                >
                  {processingId === selected.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Одобрить
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDecision('in_review')}
                  disabled={processingId === selected.id || !canModerate}
                >
                  На проверку
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDecision('needs_changes')}
                  disabled={processingId === selected.id || !canModerate}
                >
                  На доработку
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDecision('rejected')}
                  disabled={processingId === selected.id || !canModerate}
                >
                  Отклонить
                </Button>
              </div>

              {selected.clinic_id ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
                  После approval уже создана клиника #{selected.clinic_id}.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function statusLabel(status: ClinicApplicationStatus) {
  switch (status) {
    case 'submitted':
      return 'Отправлена'
    case 'in_review':
      return 'На проверке'
    case 'needs_changes':
      return 'Нужны правки'
    case 'approved':
      return 'Одобрена'
    case 'rejected':
      return 'Отклонена'
    case 'blocked':
      return 'Заблокирована'
    default:
      return 'Черновик'
  }
}

function statusPillClass(status: ClinicApplicationStatus) {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium'
  switch (status) {
    case 'approved':
      return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`
    case 'rejected':
    case 'blocked':
      return `${base} border-red-500/20 bg-red-500/10 text-red-300`
    case 'needs_changes':
      return `${base} border-blue-500/20 bg-blue-500/10 text-blue-300`
    case 'submitted':
    case 'in_review':
      return `${base} border-amber-500/20 bg-amber-500/10 text-amber-300`
    default:
      return `${base} border-border bg-card text-muted-foreground`
  }
}

function ModerationStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock
  label: string
  value: number
  tone: 'warning' | 'info' | 'success' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-500'
      : tone === 'danger'
        ? 'bg-red-500/10 text-red-500'
        : tone === 'info'
          ? 'bg-blue-500/10 text-blue-500'
          : 'bg-amber-500/10 text-amber-500'

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

function DetailBlock({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={multiline ? 'whitespace-pre-wrap text-sm text-foreground' : 'text-sm text-foreground'}>
        {value}
      </p>
    </div>
  )
}
