import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle, Building2, CheckCircle2, ChevronRight, Clock, Globe,
  Hash, Loader2, RotateCcw, Scale, Search, Users, X, XCircle,
  Briefcase, FileText, Calendar, Shield, Paperclip, MessageSquare,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import api from '@/api/client'

interface ModerationItem {
  id: string
  org_id: string
  org_name: string
  type: 'creation' | 'edit' | 'content'
  status: 'pending' | 'approved' | 'rejected' | 'revision'
  submitted_at: string
  reviewed_at?: string
  reviewer_id?: string
  details?: string
  documents_count?: number
  has_moderator_message?: boolean
  missing_required_documents?: string[]
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
  request_type?: 'creation' | 'edit'
  requested_changes?: Record<string, unknown>
  moderator_message?: string
  moderation_documents?: Array<{
    id: string
    file_name: string
    content_type: string
    size: number
    document_type?: string
    document_label?: string
    data_url?: string
  }>
  moderation_issues?: Array<{
    scope: 'field' | 'document'
    target: string
    label: string
    message: string
  }>
  missing_required_documents?: string[]
  created_at?: string
  updated_at?: string
  billing?: {
    plan_name: string
    status: string
    amount: number
    currency: string
    seats: number
  }
}

interface Template {
  id: string
  label: string
  text: string
}

const CREATION_FIELD_OPTIONS = [
  { target: 'legal_name_ru', label: 'Наименование (RU)', message: 'Проверьте наименование компании на русском языке.' },
  { target: 'legal_name_kz', label: 'Наименование (KZ)', message: 'Проверьте наименование компании на казахском языке.' },
  { target: 'organization_form', label: 'Форма организации', message: 'Уточните форму организации и приведите её к данным в документах.' },
  { target: 'bin', label: 'БИН', message: 'Проверьте БИН: он должен совпадать с регистрационными документами и содержать 12 цифр.' },
  { target: 'legal_address', label: 'Юридический адрес', message: 'Юридический адрес не совпадает с документами или заполнен не полностью.' },
  { target: 'company_phone', label: 'Телефон компании', message: 'Укажите корректный телефон компании.' },
  { target: 'company_email', label: 'Email компании', message: 'Укажите корректный email компании.' },
  { target: 'oked', label: 'ОКЭД', message: 'Проверьте код ОКЭД и приведите его к официальным данным компании.' },
] as const

const CREATION_DOCUMENT_OPTIONS = [
  { target: 'registration_certificate', label: 'Свидетельство о госрегистрации', message: 'Загрузите корректное свидетельство о госрегистрации.' },
  { target: 'charter', label: 'Устав', message: 'Загрузите актуальный устав компании.' },
  { target: 'founder_decision', label: 'Решение учредителя / протокол', message: 'Нужен документ, подтверждающий решение о создании компании.' },
  { target: 'ceo_appointment_order', label: 'Приказ о назначении CEO', message: 'Нужен документ о назначении руководителя компании.' },
] as const

function buildSelectedIssues(selectedKeys: string[]) {
  const allOptions = [
    ...CREATION_FIELD_OPTIONS.map((item) => ({ ...item, scope: 'field' as const })),
    ...CREATION_DOCUMENT_OPTIONS.map((item) => ({ ...item, scope: 'document' as const })),
  ]
  return allOptions
    .filter((item) => selectedKeys.includes(`${item.scope}:${item.target}`))
    .map((item) => ({
      scope: item.scope,
      target: item.target,
      label: item.label,
      message: item.message,
    }))
}

function moderationDecisionCanBeChanged(reviewedAt?: string): boolean {
  if (!reviewedAt) return false
  const reviewedTs = new Date(reviewedAt).getTime()
  if (Number.isNaN(reviewedTs)) return false
  const deadline = reviewedTs + 2 * 24 * 60 * 60 * 1000
  return Date.now() <= deadline
}

export default function PlatformModerationPage() {
  const { t } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const canModerate = isSuperAdmin || platformRole === 'moderator' || platformRole === 'tech_support'

  const [items, setItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/platform/moderation')
      setItems(res.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || item.org_name.toLowerCase().includes(q) || item.type.includes(q)
      return matchesStatus && matchesSearch
    })
  }, [items, statusFilter, search])

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    revision: items.filter((i) => i.status === 'revision').length,
  }), [items])

  async function handleAction(
    id: string,
    action: 'approve' | 'reject' | 'revise',
    reason?: string,
    issues?: Array<{ scope: 'field' | 'document'; target: string; label: string; message: string }>,
  ) {
    setProcessingId(id)
    try {
      const endpoint = action === 'revise' ? 'revise' : action
      const payload = reason?.trim() || (issues?.length ?? 0) > 0
        ? {
            reason: reason?.trim() || undefined,
            issues: issues && issues.length > 0 ? issues : undefined,
          }
        : undefined
      await api.post(`/platform/moderation/${id}/${endpoint}`, payload)
      toast.success(
        action === 'approve' ? 'Одобрено'
        : action === 'reject' ? 'Отклонено'
        : 'Отправлено на доработку'
      )
      await loadItems()
      setSelectedItem(null)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось выполнить действие')
    } finally {
      setProcessingId(null)
    }
  }

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending: { label: 'На модерации', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
    approved: { label: 'Одобрено', icon: CheckCircle2, color: 'text-green-500 bg-green-500/10' },
    rejected: { label: 'Отклонено', icon: XCircle, color: 'text-red-500 bg-red-500/10' },
    revision: { label: 'Доработка', icon: RotateCcw, color: 'text-blue-500 bg-blue-500/10' },
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Модерация"
        description="Проверка и одобрение заявок на создание и изменение компаний."
        eyebrow="Platform"
        badge={
          counts.pending > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
              <Clock className="h-3 w-3" />
              {counts.pending} ожидает
            </span>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {([
          { key: 'pending' as const, icon: Clock, color: 'bg-amber-500/10 text-amber-500' },
          { key: 'revision' as const, icon: RotateCcw, color: 'bg-blue-500/10 text-blue-500' },
          { key: 'approved' as const, icon: CheckCircle2, color: 'bg-green-500/10 text-green-500' },
          { key: 'rejected' as const, icon: XCircle, color: 'bg-red-500/10 text-red-500' },
        ] as const).map(({ key, icon: Icon, color }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{counts[key]}</p>
                <p className="text-xs text-muted-foreground">{statusConfig[key].label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию компании..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'revision', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Все' : statusConfig[s]?.label || s} ({counts[s as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Нет заявок на модерацию"
            description="Когда компании подадут заявки, они появятся здесь."
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const cfg = statusConfig[item.status] || statusConfig.pending
              const StatusIcon = cfg.icon
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.org_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === 'creation' && 'Создание компании'}
                      {item.type === 'edit' && 'Редактирование'}
                      {item.type === 'content' && 'Контент'}
                      {' · '}
                      {new Date(item.submitted_at).toLocaleDateString('ru-RU')}
                    </p>
                    {item.details && (
                      <p className="mt-0.5 text-xs text-amber-600 truncate max-w-md">{item.details}</p>
                    )}
                    {(item.documents_count || item.has_moderator_message) ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {(item.documents_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                            <Paperclip className="h-3 w-3" />
                            Документы: {item.documents_count}
                          </span>
                        )}
                        {(item.missing_required_documents?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            Не хватает документов
                          </span>
                        )}
                        {item.has_moderator_message && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600">
                            <MessageSquare className="h-3 w-3" />
                            Есть сообщение
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                  {canModerate && item.status === 'pending' && (
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => handleAction(item.id, 'approve')}
                        disabled={processingId === item.id} className="text-green-600 border-green-200 hover:bg-green-50">
                        {processingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(item.id, 'reject')}
                        disabled={processingId === item.id} className="text-red-600 border-red-200 hover:bg-red-50">
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <ModerationDetailPanel
          item={selectedItem}
          canModerate={canModerate}
          processingId={processingId}
          onAction={handleAction}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}

async function openModerationDocument(itemId: string, documentId: string, action: 'view' | 'download') {
  const response = await api.get(`/platform/moderation/${itemId}/documents/${documentId}`, {
    params: { action },
  })
  const document = response.data as {
    file_name: string
    data_url: string
  }
  if (!document?.data_url) return
  if (action === 'download') {
    const link = window.document.createElement('a')
    link.href = document.data_url
    link.download = document.file_name
    link.click()
    return
  }
  window.open(document.data_url, '_blank', 'noopener,noreferrer')
}

// ── Moderation Detail Panel ──────────────────────────────────────────────────

function ModerationDetailPanel({
  item,
  canModerate,
  processingId,
  onAction,
  onClose,
}: {
  item: ModerationItem
  canModerate: boolean
  processingId: string | null
  onAction: (
    id: string,
    action: 'approve' | 'reject' | 'revise',
    reason?: string,
    issues?: Array<{ scope: 'field' | 'document'; target: string; label: string; message: string }>,
  ) => Promise<void>
  onClose: () => void
}) {
  const [detail, setDetail] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [reason, setReason] = useState('')
  const [showReasonPanel, setShowReasonPanel] = useState<'approve' | 'reject' | 'revise' | null>(null)
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<string[]>([])
  const canChangeDecision = useMemo(
    () => (item.status === 'approved' || item.status === 'rejected') && moderationDecisionCanBeChanged(item.reviewed_at),
    [item.reviewed_at, item.status],
  )

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      api.get(`/platform/moderation/${item.id}/detail`),
      api.get('/platform/moderation/templates'),
    ]).then(([detailRes, templatesRes]) => {
      if (detailRes.status === 'fulfilled') {
        const nextDetail = detailRes.value.data as OrgDetail
        setDetail(nextDetail)
        setSelectedIssueKeys((nextDetail.moderation_issues ?? []).map((issue) => `${issue.scope}:${issue.target}`))
      }
      if (templatesRes.status === 'fulfilled') setTemplates(templatesRes.value.data ?? [])
    }).finally(() => setLoading(false))
  }, [item.id])

  function handleApprove() {
    void onAction(item.id, 'approve')
  }

  function handleSubmitReason() {
    if (!showReasonPanel) return
    const issues = buildSelectedIssues(selectedIssueKeys)
    void onAction(item.id, showReasonPanel, reason?.trim() ? reason : undefined, issues)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{item.org_name}</h2>
              <p className="text-xs text-muted-foreground">Модерация · {item.type === 'creation' ? 'Создание' : item.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : detail ? (
            <>
              {/* Company info */}
              {detail.description && (
                <p className="text-sm text-muted-foreground">{detail.description}</p>
              )}

              {detail.requested_changes && Object.keys(detail.requested_changes).length > 0 && (
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Запрошенные изменения</p>
                  <div className="grid gap-2">
                    {Object.entries(detail.requested_changes).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="max-w-[65%] text-right text-foreground break-words">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.moderation_comment && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-amber-600 mb-1">Предыдущий комментарий модерации</p>
                  <p className="text-sm text-foreground">{detail.moderation_comment}</p>
                </div>
              )}

              {(detail.moderation_issues?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-300">Замечания по полям и документам</p>
                  <div className="mt-3 grid gap-2">
                    {(detail.moderation_issues ?? []).map((issue, index) => (
                      <div key={`${issue.scope}-${issue.target}-${index}`} className="rounded-lg border border-violet-500/20 bg-background/60 p-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                            {issue.scope === 'document' ? 'Документ' : 'Поле'}
                          </span>
                          <span className="text-sm font-medium text-foreground">{issue.label}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(detail.missing_required_documents?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-300">Не хватает обязательных документов</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.missing_required_documents?.map((label) => (
                      <span key={label} className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.moderator_message && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-300">Сообщение модератору</p>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{detail.moderator_message}</p>
                </div>
              )}

              {detail.moderation_documents && detail.moderation_documents.length > 0 && (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Документы компании</p>
                  <div className="grid gap-3">
                    {detail.moderation_documents.map((document) => {
                      const isImage = document.content_type.startsWith('image/')
                      return (
                        <div key={document.id} className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{document.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(document.document_label || document.document_type || document.content_type)} · {(document.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void openModerationDocument(item.id, document.id, 'view')}
                                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                              >
                                Открыть
                              </button>
                              <button
                                type="button"
                                onClick={() => void openModerationDocument(item.id, document.id, 'download')}
                                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                              >
                                Скачать
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {isImage ? 'Предпросмотр изображения доступен через кнопку "Открыть".' : document.content_type === 'application/pdf' ? 'PDF откроется в новой вкладке через кнопку "Открыть".' : 'Документ доступен через защищённый доступ.'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Hash} label="Код" value={detail.join_code} mono />
                <InfoCard icon={Briefcase} label="Отрасль" value={detail.industry || '—'} />
                <InfoCard icon={Users} label="Сотрудники" value={`${detail.members_count} / ${detail.max_members || '∞'}`} />
                <InfoCard icon={Shield} label="Статус" value={detail.is_active ? 'Активна' : 'Приостановлена'} />
                <InfoCard icon={Calendar} label="Создана" value={detail.created_at ? new Date(detail.created_at).toLocaleDateString('ru-RU') : '—'} />
                <InfoCard icon={CheckCircle2} label="Авто-подтверждение" value={detail.auto_approve ? 'Да' : 'Нет'} />
                {detail.website && <InfoCard icon={Globe} label="Сайт" value={detail.website} />}
                {detail.theme_color && <InfoCard icon={FileText} label="Цвет" value={detail.theme_color} />}
              </div>

              {detail.billing && (
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Биллинг</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Тариф</p>
                      <p className="text-sm font-medium text-foreground">{detail.billing.plan_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Сумма</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: detail.billing.currency || 'USD', maximumFractionDigits: 0 }).format(detail.billing.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Мест</p>
                      <p className="text-sm font-medium text-foreground">{detail.billing.seats}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason panel for reject/revise */}
              {showReasonPanel && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {showReasonPanel === 'reject'
                      ? 'Причина отклонения'
                      : showReasonPanel === 'approve'
                        ? 'Причина смены решения на одобрение'
                        : 'Причина доработки'}
                  </p>

                  {item.type === 'creation' && showReasonPanel === 'revise' && (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Отметьте проблемные поля</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {CREATION_FIELD_OPTIONS.map((option) => {
                            const key = `field:${option.target}`
                            const active = selectedIssueKeys.includes(key)
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedIssueKeys((current) => current.includes(key) ? current.filter((itemKey) => itemKey !== key) : [...current, key])}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Отметьте проблемные документы</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {CREATION_DOCUMENT_OPTIONS.map((option) => {
                            const key = `document:${option.target}`
                            const active = selectedIssueKeys.includes(key)
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedIssueKeys((current) => current.includes(key) ? current.filter((itemKey) => itemKey !== key) : [...current, key])}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Эти замечания появятся у founder прямо в карточке той же регистрационной заявки.
                      </p>
                    </div>
                  )}

                  {/* Templates */}
                  {templates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setReason(tpl.text)}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Укажите причину..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none"
                  />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={showReasonPanel === 'reject' ? 'destructive' : 'default'}
                      onClick={handleSubmitReason}
                      disabled={processingId === item.id}
                    >
                      {processingId === item.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {showReasonPanel === 'reject' ? 'Отклонить' : showReasonPanel === 'approve' ? 'Одобрить с причиной' : 'На доработку'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowReasonPanel(null); setReason('') }}>
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Не удалось загрузить данные</p>
          )}
        </div>

        {/* Footer actions */}
        {canModerate && (item.status === 'pending' || item.status === 'revision') && !showReasonPanel && (
          <div className="border-t border-border px-6 py-4 flex items-center gap-2">
            <Button onClick={handleApprove} disabled={processingId === item.id}
              className="bg-green-600 hover:bg-green-700 text-white">
              {processingId === item.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Одобрить
            </Button>
            <Button variant="outline" onClick={() => setShowReasonPanel('revise')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <RotateCcw className="h-4 w-4 mr-1" />
              На доработку
            </Button>
            <Button variant="outline" onClick={() => setShowReasonPanel('reject')} className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-1" />
              Отклонить
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>Закрыть</Button>
          </div>
        )}
        {canModerate && canChangeDecision && !showReasonPanel && (
          <div className="border-t border-border px-6 py-4 space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
              Решение можно изменить в течение 2 дней после проверки. При смене решения причина обязательна.
            </div>
            <div className="flex items-center gap-2">
              {item.status === 'approved' ? (
                <Button variant="outline" onClick={() => setShowReasonPanel('reject')} className="text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="h-4 w-4 mr-1" />
                  Изменить на “Отклонено”
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setShowReasonPanel('approve')} className="text-green-600 border-green-200 hover:bg-green-50">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Изменить на “Одобрено”
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose}>Закрыть</Button>
            </div>
          </div>
        )}
        {(!canModerate || ((item.status !== 'pending' && item.status !== 'revision') && !canChangeDecision) || showReasonPanel) && !showReasonPanel && (
          <div className="border-t border-border px-6 py-4">
            <Button variant="outline" className="w-full" onClick={onClose}>Закрыть</Button>
          </div>
        )}
      </div>
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
