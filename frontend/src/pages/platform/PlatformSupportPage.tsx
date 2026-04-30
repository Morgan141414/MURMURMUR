import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock, HeadphonesIcon,
  Loader2, Mail, MessageSquare, Search, User, X, Building2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import api from '@/api/client'
import { applyProfileChangesFromTicket } from '@/api/support'

interface SupportTicket {
  id: string
  subject: string
  requester_name: string
  requester_email: string
  org_id?: string
  org_name?: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  assigned_to?: string
  request_type?: string
  meta_json?: Record<string, unknown>
  messages?: Array<{
    id: string
    author_name: string
    author_role: string
    body: string
    created_at: string
    attachments: Array<{ id: string; file_name: string; content_type: string; size_bytes: number }>
  }>
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкий', color: 'text-gray-500 bg-gray-500/10' },
  normal: { label: 'Обычный', color: 'text-blue-500 bg-blue-500/10' },
  high: { label: 'Высокий', color: 'text-orange-500 bg-orange-500/10' },
  urgent: { label: 'Срочный', color: 'text-red-500 bg-red-500/10' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Открыт', color: 'text-amber-500 bg-amber-500/10', icon: AlertCircle },
  in_progress: { label: 'В работе', color: 'text-blue-500 bg-blue-500/10', icon: Clock },
  resolved: { label: 'Решён', color: 'text-green-500 bg-green-500/10', icon: CheckCircle2 },
  closed: { label: 'Закрыт', color: 'text-gray-500 bg-gray-500/10', icon: CheckCircle2 },
}

export default function PlatformSupportPage() {
  const { t, i18n } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const canManage = isSuperAdmin || platformRole === 'tech_support' || platformRole === 'moderator'
  const canApplyProfileChanges = isSuperAdmin || platformRole === 'tech_support'

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const LEGAL_REQUEST_TYPES = new Set(['ceo_change', 'founder_change', 'company_transfer', 'legal_details_change'])
  const PROFILE_CHANGE_TYPE = 'company_profile_change'
  const locale = i18n.resolvedLanguage || i18n.language || 'ru-RU'

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/platform/support-tickets')
      setTickets(res.data ?? [])
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadTickets() }, [loadTickets])

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
      const q = search.trim().toLowerCase()
      const matchesSearch = !q ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.requester_name.toLowerCase().includes(q) ||
        ticket.requester_email.toLowerCase().includes(q)
      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [tickets, statusFilter, priorityFilter, search])

  const counts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  }), [tickets])

  async function handleAssign(ticketId: string) {
    try {
      await api.post(`/platform/support-tickets/${ticketId}/assign`)
      toast.success('Тикет назначен на вас')
      await loadTickets()
    } catch {
      toast.error('Не удалось назначить тикет')
    }
  }

  async function handleResolve(ticketId: string) {
    try {
      await api.post(`/platform/support-tickets/${ticketId}/resolve`)
      toast.success('Тикет решён')
      await loadTickets()
      setSelectedTicket(null)
    } catch {
      toast.error('Не удалось решить тикет')
    }
  }

  async function openTicket(ticket: SupportTicket) {
    try {
      const res = await api.get(`/platform/support-tickets/${ticket.id}`)
      setSelectedTicket(res.data ?? ticket)
    } catch {
      setSelectedTicket(ticket)
    }
  }

  async function handleReply(ticketId: string, body: string) {
    const trimmed = body.trim()
    if (!trimmed) {
      toast.error('Введите сообщение для ответа')
      return
    }
    try {
      const res = await api.post(`/platform/support-tickets/${ticketId}/messages`, { body: trimmed })
      setSelectedTicket(res.data)
      await loadTickets()
      toast.success('Ответ отправлен')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось отправить ответ')
    }
  }

  async function handleApplyProfileChanges(ticketId: string) {
    try {
      await applyProfileChangesFromTicket(ticketId)
      toast.success('Изменения компании применены')
      await loadTickets()
      setSelectedTicket(null)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось применить изменения')
    }
  }

  async function handleRouteToModeration(ticketId: string) {
    try {
      await api.post(`/platform/support-tickets/${ticketId}/route-to-moderation`)
      toast.success('Кейс отправлен на модерацию')
      await loadTickets()
      const res = await api.get(`/platform/support-tickets/${ticketId}`)
      setSelectedTicket(res.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось передать кейс на модерацию')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Техническая поддержка"
        description="Управление обращениями пользователей и компаний. Назначение и решение тикетов."
        eyebrow="Platform"
        badge={
          counts.open > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
              <AlertCircle className="h-3 w-3" />
              {counts.open} открыто
            </span>
          ) : undefined
        }
      />

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{counts.open}</p>
              <p className="text-xs text-muted-foreground">Открытые</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{counts.in_progress}</p>
              <p className="text-xs text-muted-foreground">В работе</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{counts.resolved}</p>
              <p className="text-xs text-muted-foreground">Решённые</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <label htmlFor="platform-support-search" className="sr-only">Поиск тикетов</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="platform-support-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по теме, имени или email..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Все' : STATUS_CONFIG[s]?.label || s} ({counts[s as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'urgent', 'high', 'normal', 'low'] as const).map((p) => (
            <button
              type="button"
              key={p}
              aria-pressed={priorityFilter === p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                priorityFilter === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {p === 'all' ? 'Все приоритеты' : PRIORITY_CONFIG[p]?.label || p}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets list */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HeadphonesIcon}
            title={search.trim() ? 'Ничего не найдено' : 'Нет тикетов'}
            description={search.trim() ? 'Попробуйте изменить поисковый запрос или фильтры.' : 'Когда пользователи создадут обращения, они появятся здесь.'}
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
              const StatusIcon = cfg.icon
              const prCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal
              return (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Открыть тикет: ${ticket.subject}`}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selectedTicket?.id === ticket.id ? 'bg-accent/60' : 'hover:bg-accent/50'}`}
                  onClick={() => void openTicket(ticket)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a, input, textarea, select')) return
                      e.preventDefault()
                      void openTicket(ticket)
                    }
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.requester_name} · {ticket.requester_email}
                      {ticket.org_name && ` · ${ticket.org_name}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${prCfg.color}`}>
                    {prCfg.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                  {canManage && ticket.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAssign(ticket.id) }}>
                      Взять
                    </Button>
                  )}
                  {canManage && ticket.status === 'in_progress' && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleResolve(ticket.id) }}
                      className="text-green-600 border-green-200 hover:bg-green-50">
                      Решить
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail Panel */}
      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          canManage={canManage}
          canApplyProfileChanges={canApplyProfileChanges}
          onAssign={handleAssign}
          onResolve={handleResolve}
          onReply={handleReply}
          onRouteToModeration={handleRouteToModeration}
          onApplyProfileChanges={handleApplyProfileChanges}
          onClose={() => setSelectedTicket(null)}
          isLegalRequest={LEGAL_REQUEST_TYPES.has(selectedTicket.request_type || '')}
          isProfileChangeRequest={selectedTicket.request_type === PROFILE_CHANGE_TYPE}
          locale={locale}
        />
      )}
    </div>
  )
}

function TicketDetailPanel({
  ticket,
  canManage,
  canApplyProfileChanges,
  onAssign,
  onResolve,
  onReply,
  onRouteToModeration,
  onApplyProfileChanges,
  onClose,
  isLegalRequest,
  isProfileChangeRequest,
  locale,
}: {
  ticket: SupportTicket
  canManage: boolean
  canApplyProfileChanges: boolean
  onAssign: (id: string) => Promise<void>
  onResolve: (id: string) => Promise<void>
  onReply: (id: string, body: string) => Promise<void>
  onRouteToModeration: (id: string) => Promise<void>
  onApplyProfileChanges: (id: string) => Promise<void>
  onClose: () => void
  isLegalRequest: boolean
  isProfileChangeRequest: boolean
  locale: string
}) {
  const [replyBody, setReplyBody] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
  const prCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal
  const StatusIcon = cfg.icon
  const assignedToRaw = (ticket as { assigned_to?: unknown }).assigned_to
  const assignedTo = typeof assignedToRaw === 'string' && assignedToRaw.trim().length > 0
    ? assignedToRaw.trim()
    : null
  const profileChangesRaw = (ticket.meta_json as Record<string, unknown> | undefined)?.profile_changes
  const profileChanges = profileChangesRaw && typeof profileChangesRaw === 'object'
    ? (profileChangesRaw as Record<string, string>)
    : null

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement

      if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  async function handleSendReply() {
    if (!replyBody.trim()) return
    setSendingReply(true)
    try {
      await onReply(ticket.id, replyBody)
      setReplyBody('')
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-ticket-dialog-title"
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 id="platform-ticket-dialog-title" className="text-base font-semibold text-foreground">{ticket.subject}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${prCfg.color}`}>
                  {prCfg.label}
                </span>
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Закрыть панель тикета"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Requester info */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Заявитель</p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{ticket.requester_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {ticket.requester_email}
                </p>
              </div>
            </div>
            {ticket.org_name && (
              <p className="text-xs text-muted-foreground">Компания: <span className="text-foreground font-medium">{ticket.org_name}</span></p>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Создан
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(ticket.created_at).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                Обновлён
              </div>
              <p className="text-sm font-medium text-foreground">
                {new Date(ticket.updated_at).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {assignedTo && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">Назначен: <span className="font-medium">{assignedTo}</span></span>
            </div>
          )}

          {isLegalRequest && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Юридический кейс</p>
              <p className="text-sm text-foreground">Тип: {ticket.request_type}</p>
              {ticket.meta_json && Object.keys(ticket.meta_json).length > 0 && Object.entries(ticket.meta_json).map(([key, value]) => (
                <p key={key} className="text-xs text-muted-foreground">{key}: {String(value)}</p>
              ))}
            </div>
          )}

          {isProfileChangeRequest && profileChanges && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-500" />
                <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Запрошенные изменения данных компании</p>
              </div>
              <div className="space-y-1.5">
                {Object.entries(profileChanges).map(([field, value]) => {
                  const labels: Record<string, string> = {
                    name: 'Название', description: 'Описание', industry: 'Отрасль',
                    website: 'Сайт', logo_url: 'Логотип URL', theme_color: 'Цвет темы',
                    welcome_message: 'Приветственное сообщение',
                  }
                  return (
                    <div key={field} className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{labels[field] || field}</p>
                      <p className="mt-0.5 text-sm text-foreground">{value}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {ticket.messages && ticket.messages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Сообщения</p>
              {ticket.messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{message.author_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString(locale)}</p>
                  </div>
                  {message.body && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{message.body}</p>}
                  {message.attachments.length > 0 && message.attachments.map((attachment) => (
                    <p key={attachment.id} className="text-xs text-muted-foreground">{attachment.file_name}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <label htmlFor="platform-ticket-reply" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ответ модератора</label>
              <textarea
                id="platform-ticket-reply"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Напишите ответ по обращению, запросите уточнение или сообщите решение..."
                className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
              <div className="flex justify-end">
                <Button onClick={() => void handleSendReply()} disabled={sendingReply || !replyBody.trim()}>
                  {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Ответить
                </Button>
              </div>
            </div>
          )}

          {/* SLA indicator */}
          {ticket.status === 'open' && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-600">
                Ожидает назначения с {new Date(ticket.created_at).toLocaleDateString(locale)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center gap-2">
          {canManage && ticket.status === 'open' && (
            <Button onClick={() => onAssign(ticket.id)}>
              <HeadphonesIcon className="h-4 w-4 mr-1" />
              Взять в работу
            </Button>
          )}
          {canManage && ticket.status === 'in_progress' && (
            <Button onClick={() => onResolve(ticket.id)} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Решить
            </Button>
          )}
          {canManage && isLegalRequest && (
            <Button variant="outline" onClick={() => onRouteToModeration(ticket.id)}>
              На модерацию
            </Button>
          )}
          {canApplyProfileChanges && isProfileChangeRequest && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <Button
              onClick={() => onApplyProfileChanges(ticket.id)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Применить изменения
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  )
}
