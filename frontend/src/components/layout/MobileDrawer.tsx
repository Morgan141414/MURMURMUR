import { useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router'
import { X, LogOut, Settings, Moon, Sun, UserCircle, LifeBuoy, Search, MessageSquare, HeartPulse } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { ContextSwitcher } from './ContextSwitcher'
import { redirectToClinicCreation } from '@/config/externalLinks'
import { getNavForShell, filterNavByRole } from '@/config/navigation'
import type { NavItem } from '@/config/navigation'
import { AvatarImage } from '@/components/shared/AvatarImage'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const drawerRef = useRef<HTMLDivElement>(null)

  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const fullName = useAuthStore((s) => s.fullName)
  const email = useAuthStore((s) => s.email)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const logout = useAuthStore((s) => s.logout)
  const { activeOrg } = useOrgStore()
  const { shell, activeProjectId } = useContextStore()

  const current = activeOrg()
  const settingsPath = current ? '/company/settings' : '/settings'
  const orgRole = current?.role ?? null
  const currentShell = shell ?? 'company'

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

  // Close on route change
  useEffect(() => {
    onClose()
  }, [location.pathname])

  // Trap focus and handle Escape
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  function handleLogout() {
    logout()
    navigate('/login')
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className="shell-sidebar-surface fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col border-r border-border drawer-enter"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                QorMed M.I.S.
              </span>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">Клиника, пациенты и приемы</p>
              </div>
            </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          </div>
        </div>

        {/* Context Switcher */}
        <div className="border-b border-border px-3 py-3">
          <ContextSwitcher onCreateOrg={() => { redirectToClinicCreation(); onClose() }} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pt-2" aria-label="Shell navigation">
          {navSections.map((section) => (
            <div key={section.labelKey}>
              <div className="px-2.5 pt-4 pb-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t(section.labelKey)}
                </span>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <MobileNavLink key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-border px-3 py-3 space-y-1">
          <button
            onClick={() => { navigate('/messenger'); onClose() }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            Мессенджер
          </button>
          <button
            onClick={() => { navigate('/search'); onClose() }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            {t('nav.search', 'Поиск')}
          </button>
          <button
            onClick={() => { navigate('/profile'); onClose() }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <UserCircle className="h-4 w-4" />
            {t('nav.personalCabinet')}
          </button>
          <button
            onClick={() => { navigate(settingsPath); onClose() }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            {t('nav.settings')}
          </button>
          <button
            onClick={() => { navigate('/support'); onClose() }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LifeBuoy className="h-4 w-4" />
            {t('nav.techSupport')}
          </button>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          </button>
        </div>

        {/* User area */}
        <div className="border-t border-border px-3 py-3">
          <div className="soft-inset-ring flex items-center gap-2.5 rounded-md border border-border/70 bg-background/80 p-2.5">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} name={fullName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={t('auth.logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function MobileNavLink({ item }: { item: NavItem }) {
  const { t } = useTranslation()

  return (
    <NavLink
      to={item.to}
      end={item.to === '/platform' || item.to === '/company' || item.to === '/department'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors',
          isActive
            ? 'bg-primary/8 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
    </NavLink>
  )
}
