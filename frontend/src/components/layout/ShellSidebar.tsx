import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  Moon, Sun, Settings, LogOut,
  Building2, FolderKanban, UserCircle, LifeBuoy, Search, MessageSquare,
  ChevronRight, PanelLeftClose, PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { ContextSwitcher } from './ContextSwitcher'
import { getNavForShell, filterNavByRole } from '@/config/navigation'
import type { NavItem } from '@/config/navigation'
import { AvatarImage } from '@/components/shared/AvatarImage'
import { listMessengerThreads } from '@/api/messenger'
import { CRMSidebar } from '@/components/crm/CRMSidebar'
import { redirectToClinicCreation } from '@/config/externalLinks'

/* ── Shell icon map ── */
const SHELL_ICONS: Record<string, LucideIcon> = {
  platform: Building2,
  company: Building2,
  department: FolderKanban,
}

/* ── Shell accent colors ── */
const SHELL_ACCENT: Record<string, string> = {
  platform: 'bg-shell-platform',
  company: 'bg-shell-company',
  department: 'bg-shell-department',
}

const MESSENGER_BADGE_POLL_INTERVAL_MS = 60_000
const MESSENGER_BADGE_MIN_GAP_MS = 10_000

export function ShellSidebar() {
  const location = useLocation()

  // Check if we're in CRM section
  const isCRMSection = location.pathname.startsWith('/company/crm')

  // Render CRM sidebar if in CRM section
  if (isCRMSection) {
    return <CRMSidebar />
  }

  return <MainSidebar />
}

function MainSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  /* ── Store hooks ── */
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const isDark = theme === 'dark'

  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const fullName = useAuthStore((s) => s.fullName)
  const email = useAuthStore((s) => s.email)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const logout = useAuthStore((s) => s.logout)

  const activeOrg = useOrgStore((s) => s.activeOrg)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const { shell, activeProjectId } = useContextStore()

  const current = activeOrg()
  const settingsPath = current ? '/company/settings' : '/settings'
  const orgRole = location.pathname.startsWith('/patient') ? 'patient' : current?.role ?? null
  const currentShell = shell ?? 'company'
  const isExploreDetail = location.pathname.startsWith('/explore/')

  /* ── Navigation ── */
  const rawNav = getNavForShell(currentShell)
  const filteredNav = filterNavByRole(rawNav, orgRole, isSuperAdmin, platformRole)

  const navSections = filteredNav.map((section) => ({
    ...section,
    items: section.items
      .map((item) => {
        if (!item.to.includes(':id')) return item
        if (!activeProjectId) return null
        return {
          ...item,
          to: item.to.replace(':id', activeProjectId),
        }
      })
      .filter((item): item is NavItem => item !== null),
  })).filter((section) => section.items.length > 0)

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const ShellIcon = SHELL_ICONS[currentShell] ?? Building2
  const shellAccent = SHELL_ACCENT[currentShell] ?? 'bg-sidebar-primary'

  const [messengerUnreadChats, setMessengerUnreadChats] = useState(0)
  const messengerInFlightRef = useRef(false)
  const lastMessengerLoadedAtRef = useRef(0)

  useEffect(() => {
    async function loadMessengerUnread(force = false) {
      if (!activeOrgId) {
        setMessengerUnreadChats(0)
        return
      }
      if (!force && document.visibilityState !== 'visible') return
      if (messengerInFlightRef.current) return

      const now = Date.now()
      if (!force && now - lastMessengerLoadedAtRef.current < MESSENGER_BADGE_MIN_GAP_MS) {
        return
      }

      messengerInFlightRef.current = true
      try {
        const response = await listMessengerThreads(activeOrgId)
        const unreadDialogs = response.data.filter((thread) => (Number(thread.unread_count) || 0) > 0).length
        setMessengerUnreadChats(unreadDialogs)
        lastMessengerLoadedAtRef.current = Date.now()
      } catch {
        return
      } finally {
        messengerInFlightRef.current = false
      }
    }

    void loadMessengerUnread(true)

    const intervalId = window.setInterval(() => {
      void loadMessengerUnread()
    }, MESSENGER_BADGE_POLL_INTERVAL_MS)

    function handleRefresh() {
      void loadMessengerUnread(true)
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void loadMessengerUnread(true)
      }
    }

    window.addEventListener('notifications:refresh', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('notifications:refresh', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeOrgId])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'shell-sidebar-surface mis-sidebar group/sidebar relative flex h-screen flex-col transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!collapsed)}
        className="absolute right-2 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/70 text-sidebar-muted shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>

      {/* ═══ Logo & Brand ═══ */}
      <div
        className={cn(
          'flex items-center gap-3 py-4 pl-4 pr-12',
          collapsed && 'justify-center px-2 pt-14',
        )}
      >
        {/* Shell-colored icon */}
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          shellAccent,
        )}>
          <ShellIcon className="h-[18px] w-[18px] text-white" />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold tracking-tight text-sidebar-foreground">
              QorMed M.I.S.
            </span>
            <span className="text-[11px] text-sidebar-muted">
              Медицинская информационная система
            </span>
          </div>
        )}

      </div>

      {/* ═══ Context Switcher ═══ */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <ContextSwitcher onCreateOrg={redirectToClinicCreation} />
        </div>
      )}

      {/* ═══ Divider ═══ */}
      <div className="mx-3 h-px bg-sidebar-border/60" />

      {/* ═══ Navigation ═══ */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 pt-3 pb-2">
        {!isExploreDetail && navSections.map((section, idx) => (
          <div key={section.labelKey}>
            {/* Section label */}
            {!collapsed && (
              <div className={cn('px-3 pb-1', idx === 0 ? 'pt-0' : 'pt-5')}>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted/50">
                  {t(section.labelKey)}
                </span>
              </div>
            )}
            {collapsed && idx > 0 && (
              <div className="mx-2 my-3 h-px bg-sidebar-border/40" />
            )}

            {/* Nav items */}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  shellAccent={shellAccent}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ═══ Bottom Utilities ═══ */}
      <div className="mx-3 h-px bg-sidebar-border/60" />

      <div className="px-2 py-2 space-y-0.5">
        {current && (
          <UtilityLink
            to="/company/my-board"
            icon={FolderKanban}
            label={t('nav.myBoard', 'Моя доска')}
            collapsed={collapsed}
          />
        )}
        {current && (
          <UtilityLink
            to="/messenger"
            icon={MessageSquare}
            label={t('nav.messenger', 'Мессенджер')}
            collapsed={collapsed}
            badgeCount={messengerUnreadChats}
          />
        )}
        <UtilityLink to="/search" icon={Search} label={t('nav.search', 'Поиск')} collapsed={collapsed} />
        <UtilityLink to="/profile" icon={UserCircle} label={t('nav.personalCabinet')} collapsed={collapsed} />
        <UtilityLink to={settingsPath} icon={Settings} label={t('nav.settings')} collapsed={collapsed} />
        {platformRole !== 'moderator' && platformRole !== 'tech_support' && (
          <UtilityLink to="/support" icon={LifeBuoy} label={t('nav.techSupport')} collapsed={collapsed} />
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? (isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')) : undefined}
        >
          {isDark
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />
          }
          {!collapsed && (
            <span>{isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
          )}
        </button>
      </div>

      {/* ═══ User Area ═══ */}
      <div className="mx-3 h-px bg-sidebar-border/60" />

      <div className="px-3 py-3">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-sidebar-accent/70',
            collapsed && 'justify-center p-1.5',
          )}
        >
          {/* Avatar */}
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              name={fullName}
              alt="avatar"
              className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-sidebar-border"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary ring-1 ring-sidebar-border">
              {initials}
            </div>
          )}

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                  {fullName ?? t('common.user')}
                </p>
                <p className="truncate text-[11px] text-sidebar-muted/60">
                  {email ?? ''}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-sidebar-muted/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                title={t('auth.logout')}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

      </div>
    </aside>
  )
}

function splitNavTarget(to: string) {
  const [pathWithSearch, hash = ''] = to.split('#')
  const [path] = pathWithSearch.split('?')
  return { path, hash: hash ? `#${hash}` : '' }
}

function isPathActive(pathname: string, hash: string, to: string, end = false) {
  const target = splitNavTarget(to)
  if (target.hash) return pathname === target.path && hash === target.hash
  if (end) return pathname === target.path
  return pathname === target.path || pathname.startsWith(`${target.path}/`)
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

function SidebarNavItem({
  item,
  collapsed,
  shellAccent,
}: {
  item: NavItem
  collapsed: boolean
  shellAccent: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const active = isPathActive(location.pathname, location.hash, item.to, item.to === '/company' || item.to === '/department' || item.to === '/platform')
  const handleNavigate = () => {
    navigate(item.to)
  }

  return (
    <button
      type="button"
      onClick={handleNavigate}
      title={collapsed ? t(item.labelKey) : undefined}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
          : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >

      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
        active
          ? 'text-sidebar-primary-foreground'
          : 'text-sidebar-muted group-hover:text-sidebar-foreground',
      )}>
        <item.icon className="h-[16px] w-[16px]" />
      </div>

      {!collapsed && (
        <span className="flex-1 truncate text-left">{t(item.labelKey)}</span>
      )}

      {!collapsed && active && (
        <ChevronRight className="h-3.5 w-3.5 text-sidebar-primary-foreground/70" />
      )}
    </button>
  )
}

function UtilityLink({
  to,
  icon: Icon,
  label,
  collapsed,
  badgeCount = 0,
}: {
  to: string
  icon: LucideIcon
  label: string
  collapsed: boolean
  badgeCount?: number
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isSearchRoute = to === '/search' && (location.pathname === '/search' || location.pathname.startsWith('/explore/'))
  const active = isSearchRoute || isPathActive(location.pathname, location.hash, to)
  const handleNavigate = () => {
    navigate(to)
  }

  return (
    <button
      type="button"
      onClick={handleNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
          : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <div className="relative shrink-0">
        <Icon className="h-4 w-4 shrink-0" />
        {collapsed && badgeCount > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow-[0_0_0_2px_rgba(11,18,32,0.95)]">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
      </div>
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badgeCount > 0 ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white shadow-[0_0_0_2px_rgba(11,18,32,0.95)]">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </button>
  )
}
