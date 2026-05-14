import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  Bell,
  CalendarPlus,
  ChevronRight,
  FilePlus2,
  Inbox,
  LifeBuoy,
  Menu,
  Plus,
  Search,
  ScrollText,
  UserPlus,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import type { NotificationFeedItem, ShellType } from '@/types'
import { AvatarImage } from '@/components/shared/AvatarImage'
import { getNotificationFeed, markAllNotificationsRead, markNotificationRead } from '@/api/notifications'
import { acceptDepartmentInvite, rejectDepartmentInvite, approveDepartmentInviteRequest, rejectDepartmentInviteRequest } from '@/api/projects'
import { respondHRDocumentShareRequest, respondHRDocumentFolderShareRequest } from '@/api/hr'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'

/* ── Shell meta for indicator ── */
const SHELL_META: Record<ShellType, { labelKey: string; accent: string; bg: string; dot: string }> = {
  platform: {
    labelKey: 'shell.platform',
    accent: 'text-shell-platform',
    bg: 'bg-shell-platform/10',
    dot: 'bg-shell-platform',
  },
  company: {
    labelKey: 'shell.company',
    accent: 'text-shell-company',
    bg: 'bg-shell-company/10',
    dot: 'bg-shell-company',
  },
  department: {
    labelKey: 'shell.department',
    accent: 'text-shell-department',
    bg: 'bg-shell-department/10',
    dot: 'bg-shell-department',
  },
}

interface ShellHeaderProps {
  onMobileMenuToggle?: () => void
}

const NOTIFICATION_POLL_INTERVAL_MS = 60_000
const NOTIFICATION_MIN_GAP_MS = 10_000

const QUICK_ACTIONS = [
  { label: 'Новая запись', to: '/clinic/calendar', icon: CalendarPlus },
  { label: 'Новый пациент', to: '/clinic/patients', icon: UserPlus },
  { label: 'Документ', to: '/clinic/documents', icon: FilePlus2 },
]

const CLINIC_SEARCH_RESULTS = [
  {
    id: 'patient:p-1042',
    group: 'Пациенты',
    title: 'Айгерим Нурланова',
    meta: 'ИИН 890512450012 · +7 701 245 18 90 · прием сегодня 10:30',
    to: '/clinic/patients/p-1042',
  },
  {
    id: 'patient:p-1188',
    group: 'Пациенты',
    title: 'Марат Сейдахмет',
    meta: 'ИИН 760301300442 · +7 775 010 44 20 · долг 18 000 ₸',
    to: '/clinic/patients/p-1188',
  },
  {
    id: 'patient:p-1220',
    group: 'Пациенты',
    title: 'Динара Касымова',
    meta: 'ИИН 920812600333 · +7 700 888 55 11 · первичная карта',
    to: '/clinic/patients/p-1220',
  },
  {
    id: 'appointment:1030',
    group: 'Записи',
    title: '10:30 · Повторный прием',
    meta: 'Айгерим Нурланова · терапевт · кабинет 201 · на приеме',
    to: '/clinic/calendar',
  },
  {
    id: 'appointment:1100',
    group: 'Записи',
    title: '11:00 · Кардиология',
    meta: 'Марат Сейдахмет · аллергия · требуется подтверждение',
    to: '/clinic/appointments',
  },
  {
    id: 'document:therapy-template',
    group: 'Документы',
    title: 'Первичный прием терапевта',
    meta: 'Шаблон · переменные пациента, врача и приема · готов к выпуску',
    to: '/clinic/documents',
  },
]

export function ShellHeader({ onMobileMenuToggle }: ShellHeaderProps) {
  const { t } = useTranslation()
  const fullName = useAuthStore((s) => s.fullName)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const activeOrg = useOrgStore((s) => s.activeOrg)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const { shell } = useContextStore()
  const location = useLocation()
  const navigate = useNavigate()

  const current = activeOrg()
  const currentShell = shell ?? 'company'
  const meta = SHELL_META[currentShell] ?? SHELL_META.company
  const role = current?.role ?? null

  /* ── Breadcrumb logic ── */
  const pathParts = location.pathname.split('/').filter(Boolean)
  const shellLabel = t(meta.labelKey)
  const contextName = current?.orgName || shellLabel

  const segmentLabels: Record<string, string> = {
    dashboard: t('nav.dashboard'),
    company: t('shell.company'),
    people: t('nav.employees'),
    teams: t('nav.teams'),
    projects: t('nav.departments'),
    approvals: t('nav.approvals'),
    documents: t('nav.documents'),
    clinical: 'Клинический центр',
    clinic: 'Клинический центр',
    calendar: t('nav.calendar'),
    patients: t('nav.patients'),
    visits: t('nav.visitWorkspace', 'Прием врача'),
    payments: t('nav.clinicPayments', 'Касса'),
    analytics: location.pathname.startsWith('/clinic') ? t('nav.clinicAnalytics', 'Аналитика') : t('nav.reports'),
    settings: t('nav.settings'),
    platform: t('shell.platform'),
    companies: t('nav.companies'),
    users: t('nav.platformUsers'),
    department: t('shell.department'),
    board: t('nav.board'),
    tasks: t('nav.tasks'),
    members: t('nav.members'),
    support: t('nav.support'),
    profile: t('nav.profile'),
    search: t('nav.search', 'Поиск'),
    explore: t('search.eyebrow', 'Обзор'),
  }

  let breadcrumbSegments: string[] = [contextName]
  let title = ''

  if (location.pathname.startsWith('/explore/companies/')) {
    breadcrumbSegments = [t('search.title', 'Поиск')]
    title = t('search.openCompany', 'Company')
  } else if (location.pathname.startsWith('/explore/users/') || location.pathname.startsWith('/users/')) {
    breadcrumbSegments = [t('search.title', 'Поиск')]
    title = t('search.openProfile', 'Profile')
  } else if (location.pathname === '/search') {
    breadcrumbSegments = []
    title = t('search.title', 'Поиск')
  } else if (pathParts.length > 1) {
    const rawPageName = pathParts[pathParts.length - 1]
    const pageName = segmentLabels[rawPageName] ??
      rawPageName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    breadcrumbSegments = [contextName]
    title = pageName
  } else {
    title = t(`shell.${currentShell}`)
  }

  /* ── Notification dropdown ── */
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationFeedItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const prevUnreadCountRef = useRef(0)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const feedInFlightRef = useRef(false)
  const lastFeedLoadedAtRef = useRef(0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadFeed(showToastForNew = false, force = false) {
    if (!force && document.visibilityState !== 'visible') return
    if (feedInFlightRef.current) return

    const now = Date.now()
    if (!force && now - lastFeedLoadedAtRef.current < NOTIFICATION_MIN_GAP_MS) {
      return
    }

    feedInFlightRef.current = true
    try {
      const response = await getNotificationFeed(50)
      setNotifications(response.data.items)
      setUnreadCount(response.data.unread_count)
      if (showToastForNew && document.visibilityState === 'visible' && response.data.unread_count > prevUnreadCountRef.current) {
        const latest = response.data.items.find((item) => !item.is_read && !String(item.type || '').startsWith('messenger_')) || response.data.items.find((item) => !item.is_read)
        if (latest) {
          toast.info(latest.title, {
              description: latest.body || 'Получено новое уведомление',
          })
        }
      }
      prevUnreadCountRef.current = response.data.unread_count
      lastFeedLoadedAtRef.current = Date.now()
    } catch {
      return
    } finally {
      feedInFlightRef.current = false
    }
  }


  useEffect(() => {
    let mounted = true

    void loadFeed(false, true)
    const intervalId = window.setInterval(() => {
      if (!mounted) return
      void loadFeed(true)
    }, NOTIFICATION_POLL_INTERVAL_MS)

    function handleVisibility() {
      if (!mounted) return
      if (document.visibilityState === 'visible') {
        void loadFeed(false, true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeOrgId])

  useEffect(() => {
    function handleNotificationsRefresh() {
      void loadFeed(false, true)
    }
    window.addEventListener('notifications:refresh', handleNotificationsRefresh)
    return () => window.removeEventListener('notifications:refresh', handleNotificationsRefresh)
  }, [activeOrgId])

  const generalNotifications = notifications.filter((item) => !String(item.type || '').startsWith('messenger_'))
  const generalUnreadCount = generalNotifications.filter((item) => !item.is_read).length

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
      setUnreadCount(0)
    } catch {
      return
    }
  }

  async function handleOpenNotification(item: NotificationFeedItem) {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id)
      } catch {
        return
      }
      setNotifications((items) => items.map((row) => row.id === item.id ? { ...row, is_read: true } : row))
      setUnreadCount((value) => Math.max(0, value - 1))
    }
    setShowNotifications(false)
    if (item.link_url) navigate(item.link_url)
  }

  async function handleDepartmentInviteApprovalAction(notificationId: string, inviteId: string, action: 'approve' | 'reject') {
    if (!activeOrgId) {
      toast.error('Сначала выберите компанию')
      return
    }
    try {
      if (action === 'approve') {
        await approveDepartmentInviteRequest(activeOrgId, inviteId)
      } else {
        await rejectDepartmentInviteRequest(activeOrgId, inviteId)
      }
      await markNotificationRead(notificationId)
      await loadFeed(false, true)
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
      toast.success(action === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена')
    } catch {
      toast.error('Не удалось обработать заявку')
    }
  }

  async function handleDepartmentInviteAction(notificationId: string, inviteId: string, action: 'accept' | 'reject') {
    if (!activeOrgId) {
      toast.error('Сначала выберите компанию')
      return
    }
    try {
      if (action === 'accept') {
        await acceptDepartmentInvite(activeOrgId, inviteId)
      } else {
        await rejectDepartmentInvite(activeOrgId, inviteId)
      }
      await markNotificationRead(notificationId)
      await loadFeed()
      toast.success(action === 'accept' ? 'Приглашение принято' : 'Приглашение отклонено')
    } catch {
      toast.error('Не удалось обработать приглашение')
    }
  }


  async function handleHrShareRequestAction(item: NotificationFeedItem, action: 'accept' | 'reject') {
    const requestId = typeof item.meta_json?.request_id === 'string' ? item.meta_json.request_id : null
    const orgId = (typeof item.org_id === 'string' && item.org_id) ? item.org_id : activeOrgId

    if (!requestId || !orgId) {
      toast.error('Не хватает данных запроса')
      return
    }

    try {
      if (item.type === 'hr_document_share_request') {
        await respondHRDocumentShareRequest(orgId, requestId, { action })
      } else if (item.type === 'hr_folder_share_request') {
        await respondHRDocumentFolderShareRequest(orgId, requestId, { action })
      } else {
        toast.error('Неизвестный тип запроса')
        return
      }

      await markNotificationRead(item.id)
      await loadFeed(false, true)
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
      toast.success(action === 'accept' ? 'Доступ предоставлен' : 'Запрос отклонен')
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        await markNotificationRead(item.id)
        await loadFeed(false, true)
        window.dispatchEvent(new CustomEvent('notifications:refresh'))
        toast.error('Запрос больше недоступен')
        return
      }
      toast.error('Не удалось обработать запрос доступа')
    }
  }

  return (
    <header
      className="shell-header-surface sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between px-4 md:px-6"
      role="banner"
    >
      {/* ═══ Left side ═══ */}
      <div className="min-w-0 flex items-center gap-3">
        {/* Mobile menu toggle */}
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label={t('a11y.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Shell indicator pill */}
        <div className={cn('hidden h-6 items-center gap-1.5 rounded-md px-2 sm:flex', meta.bg)}>
          <div className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', meta.accent)}>
            {shellLabel}
          </span>
        </div>

        {/* Breadcrumb + Title */}
        <div className="min-w-0">
          {breadcrumbSegments.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-text-tertiary">
              {breadcrumbSegments.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                  <span className="truncate max-w-[160px]">{seg}</span>
                </span>
              ))}
              {title && (
                <>
                  <ChevronRight className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[200px] text-text-secondary font-medium">{title}</span>
                </>
              )}
            </div>
          )}
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground sm:hidden">
            {title}
          </h1>
        </div>

        {/* Role badge */}
        {role && (
          <span className="hidden items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary lg:inline-flex">
            {ROLE_LABELS[role]}
          </span>
        )}
      </div>

      <GlobalSearchBox />

      {/* ═══ Right side ═══ */}
      <div className="flex items-center gap-1 md:gap-1.5">
        <QuickActionsMenu />

        <button
          onClick={() => navigate('/support')}
          className="hidden h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-text-secondary transition-colors hover:bg-muted hover:text-foreground hover:border-border-hover md:flex"
          aria-label="Поддержка"
          title="Поддержка с контекстом текущего экрана"
        >
          <LifeBuoy className="h-3.5 w-3.5" />
        </button>

        {/* Audit logs */}
        <button
          onClick={() => navigate(currentShell === 'platform' ? '/platform/audit-log' : '/company/audit-log')}
          className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-muted hover:text-foreground hover:border-border-hover md:flex"
          aria-label={t('nav.auditLog', 'Журнал аудита')}
        >
          <ScrollText className="h-3.5 w-3.5" />
          <span>{t('nav.auditLog', 'Журнал аудита')}</span>
        </button>

        {/* Language switcher */}
        <div className="hidden md:block">
          <LanguageSwitcher />
        </div>


        {/* Notifications */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setShowNotifications((v) => !v)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-muted hover:text-foreground"
            title={t('header.notificationsTooltip')}
            aria-label={t('header.notificationsTooltip', 'Notifications')}
            aria-expanded={showNotifications}
          >
            <Bell className="h-[18px] w-[18px]" />
            {generalUnreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white">
                {generalUnreadCount > 9 ? '9+' : generalUnreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div
              ref={dropdownRef}
              className="notification-dropdown absolute right-0 top-full z-50 mt-2 w-[340px] rounded-lg border border-border bg-card shadow-md"
              role="dialog"
              aria-label={t('a11y.notifications')}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <span className="text-[13px] font-semibold text-foreground">
                  {t('header.notifications')}
                </span>
                <div className="flex items-center gap-2">
                  {generalNotifications.length > 0 && generalUnreadCount > 0 ? (
                    <button
                      onClick={() => void handleMarkAllRead()}
                      className="text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      Прочитать всё
                    </button>
                  ) : null}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    {generalUnreadCount}
                  </span>
                </div>
              </div>

              <div className="mx-4 h-px bg-border" />

              {generalNotifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 px-4 py-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2">
                    <Inbox className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <p className="text-[13px] font-medium text-foreground">
                    {t('header.noNotifications')}
                  </p>
                  <p className="max-w-[240px] text-center text-[12px] leading-5 text-text-tertiary">
                    Здесь появятся важные события, заявки и системные уведомления.
                  </p>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto px-2 py-2">
                  {generalNotifications.map((item) => {
                    const inviteId = typeof item.meta_json?.department_invite_id === 'string'
                      ? item.meta_json.department_invite_id
                      : null
                    const inviteStatus = typeof item.meta_json?.status === 'string' ? item.meta_json.status : null
                    const isDepartmentInvite = item.type === 'department_invite' && !!inviteId && (inviteStatus === null || inviteStatus === 'pending')
                    const isDepartmentInviteApproval = item.type === 'department_invite_approval_required' && !!inviteId && inviteStatus === 'approval_pending'
                    const hrRequestId = typeof item.meta_json?.request_id === 'string' ? item.meta_json.request_id : null
                    const isHrShareRequest = (item.type === 'hr_document_share_request' || item.type === 'hr_folder_share_request') && !!hrRequestId

                    return (
                      <button
                        key={item.id}
                        onClick={() => void handleOpenNotification(item)}
                        className={cn(
                          'flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover',
                          !item.is_read && 'bg-primary/5',
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="text-[12px] font-medium text-foreground">{item.title}</span>
                          <span className="text-[10px] text-text-tertiary">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {item.body ? (
                          <span className="line-clamp-2 text-[11px] leading-5 text-text-secondary">{item.body}</span>
                        ) : null}
                        {isDepartmentInviteApproval && inviteId ? (
                          <div className="mt-1 flex gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDepartmentInviteApprovalAction(item.id, inviteId, 'approve')
                              }}
                            >
                              Одобрить
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDepartmentInviteApprovalAction(item.id, inviteId, 'reject')
                              }}
                            >
                              Отклонить
                            </button>
                          </div>
                        ) : null}
                        {isDepartmentInvite && inviteId ? (
                          <div className="mt-1 flex gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDepartmentInviteAction(item.id, inviteId, 'accept')
                              }}
                            >
                              Принять
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDepartmentInviteAction(item.id, inviteId, 'reject')
                              }}
                            >
                              Отклонить
                            </button>
                          </div>
                        ) : null}
                        {isHrShareRequest ? (
                          <div className="mt-1 flex gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleHrShareRequestAction(item, 'accept')
                              }}
                            >
                              {"\u041f\u0440\u0438\u043d\u044f\u0442\u044c"}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleHrShareRequestAction(item, 'reject')
                              }}
                            >
                              {"\u041e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c"}
                            </button>
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User button */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
          aria-label={t('a11y.profile')}
        >
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              name={fullName}
              className="h-7 w-7 rounded-lg object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-[11px] font-bold text-primary ring-1 ring-border">
              {initials}
            </div>
          )}
          <span className="hidden max-w-[100px] truncate text-[13px] font-medium text-foreground sm:inline">
            {fullName ?? t('common.user')}
          </span>
        </button>
      </div>
    </header>
  )

  function GlobalSearchBox() {
    const [query, setQuery] = useState('')
    const [focused, setFocused] = useState(false)
    const { results: workspaceResults, recent } = useGlobalSearch(query)
    const normalizedQuery = query.trim().toLowerCase()

    const clinicalResults = CLINIC_SEARCH_RESULTS.filter((item) =>
      `${item.group} ${item.title} ${item.meta}`.toLowerCase().includes(normalizedQuery),
    )

    const groupedResults = [
      ...clinicalResults.map((item) => ({
        ...item,
        label: item.title,
        description: item.meta,
      })),
      ...workspaceResults.slice(0, 6).map((item) => ({
        id: item.id,
        group: item.group === 'companies' ? 'Клиники/компании' : item.group === 'actions' ? 'Действия' : 'Разделы',
        title: item.label,
        meta: item.description ?? '',
        label: item.label,
        description: item.description,
        to: item.to,
      })),
    ].slice(0, 8)

    const defaultResults = [
      ...CLINIC_SEARCH_RESULTS.slice(0, 4),
      ...recent.slice(0, 3).map((item) => ({
        id: item.id,
        group: 'Разделы',
        title: item.label,
        meta: item.description ?? '',
        to: item.to,
      })),
    ]

    const visibleResults = normalizedQuery ? groupedResults : defaultResults
    const showResults = focused

    function handleSearch() {
      setFocused(true)
    }

    function openResult(to?: string) {
      setFocused(false)
      setQuery('')
      navigate(to && to !== '#switch-company' ? to : '/search')
    }

    return (
      <div className="relative mx-3 hidden min-w-[260px] max-w-[520px] flex-1 lg:block">
        <div className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-text-secondary transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={handleSearch}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (visibleResults[0]) openResult(visibleResults[0].to)
                else navigate('/search')
              }
              if (event.key === 'Escape') setFocused(false)
            }}
            placeholder="Пациент, ИИН, телефон, запись, документ..."
            className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-text-tertiary"
            aria-label="Глобальный поиск"
          />
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary xl:inline-flex">
            ⌘K
          </kbd>
        </div>

        {showResults ? (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-md"
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Быстрый поиск
              </span>
              <button
                type="button"
                onClick={() => openResult('/search')}
                className="text-[11px] font-medium text-primary hover:text-primary-hover"
              >
                Расширенный поиск
              </button>
            </div>
            {visibleResults.length > 0 ? (
              <div className="max-h-[340px] overflow-y-auto p-1.5">
                {visibleResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openResult(item.to)}
                    className="flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-foreground">{item.title}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-text-secondary">{item.group}</span>
                      </span>
                      {item.meta ? <span className="mt-0.5 block truncate text-[11px] text-text-tertiary">{item.meta}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] font-medium text-foreground">Ничего не найдено</p>
                <p className="mt-1 text-[12px] text-text-tertiary">Проверьте ИИН, телефон, фамилию или номер записи.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  function QuickActionsMenu() {
    const [open, setOpen] = useState(false)

    function go(to: string) {
      setOpen(false)
      navigate(to)
    }

    return (
      <div className="relative hidden md:block">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          aria-label="Быстрые действия"
          aria-expanded={open}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Создать</span>
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-md">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => go(action.to)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-surface-hover"
              >
                <action.icon className="h-4 w-4 text-primary" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }
}
