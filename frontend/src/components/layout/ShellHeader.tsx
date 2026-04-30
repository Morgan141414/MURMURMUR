import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Bell, Inbox, Menu, Search, ChevronRight, ScrollText } from 'lucide-react'
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
    analytics: t('nav.reports'),
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
    search: t('nav.search', 'Search'),
    explore: t('search.eyebrow', 'Explore'),
  }

  let breadcrumbSegments: string[] = [contextName]
  let title = ''

  if (location.pathname.startsWith('/explore/companies/')) {
    breadcrumbSegments = [t('search.title', 'Search')]
    title = t('search.openCompany', 'Company')
  } else if (location.pathname.startsWith('/explore/users/') || location.pathname.startsWith('/users/')) {
    breadcrumbSegments = [t('search.title', 'Search')]
    title = t('search.openProfile', 'Profile')
  } else if (location.pathname === '/search') {
    breadcrumbSegments = []
    title = t('search.title', 'Search')
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
            description: latest.body || 'New notification received',
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
      toast.error('Select a company first')
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
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected')
    } catch {
      toast.error('Failed to process invite request')
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
      toast.error('Missing request details')
      return
    }

    try {
      if (item.type === 'hr_document_share_request') {
        await respondHRDocumentShareRequest(orgId, requestId, { action })
      } else if (item.type === 'hr_folder_share_request') {
        await respondHRDocumentFolderShareRequest(orgId, requestId, { action })
      } else {
        toast.error('Unknown request type')
        return
      }

      await markNotificationRead(item.id)
      await loadFeed(false, true)
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
      toast.success(action === 'accept' ? 'Access accepted' : 'Request rejected')
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        await markNotificationRead(item.id)
        await loadFeed(false, true)
        window.dispatchEvent(new CustomEvent('notifications:refresh'))
        toast.error('Request is no longer available')
        return
      }
      toast.error('Failed to process access request')
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
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label={t('a11y.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Shell indicator pill */}
        <div className={cn('hidden sm:flex h-6 items-center gap-1.5 rounded-md px-2', meta.bg)}>
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
          <span className="hidden lg:inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            {ROLE_LABELS[role]}
          </span>
        )}
      </div>

      {/* ═══ Right side ═══ */}
      <div className="flex items-center gap-1 md:gap-1.5">
        {/* Audit logs */}
        <button
          onClick={() => navigate(currentShell === 'platform' ? '/platform/audit-log' : '/company/audit-log')}
          className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-surface-hover/50 px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground hover:border-border-hover"
          aria-label={t('nav.auditLog', 'Audit Log')}
        >
          <ScrollText className="h-3.5 w-3.5" />
          <span>{t('nav.auditLog', 'Audit Log')}</span>
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
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
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
              className="notification-dropdown absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl border border-border bg-surface-1 shadow-xl"
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
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
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
                    Important events and updates will appear here.
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
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-secondary"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDepartmentInviteApprovalAction(item.id, inviteId, 'reject')
                              }}
                            >
                              Reject
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
}
