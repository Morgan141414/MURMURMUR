import { NavLink, useNavigate } from 'react-router'
import {
  Home, User, Settings, FileBarChart, MessageSquare,
  Moon, Sun, Briefcase, Building2, Users,
  UserPlus, UserSearch,
  LogOut, PanelLeftClose,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { OrgSwitcher } from './OrgSwitcher'
import { useState } from 'react'
import { AvatarImage } from '@/components/shared/AvatarImage'

// Roles that can see the admin/management section
const MANAGEMENT_ROLES = new Set(['founder', 'ceo', 'accountant'])
const HR_ROLES = new Set(['founder', 'ceo', 'hr', 'recruiter', 'hiring_manager'])
const PROJECT_ROLES = new Set(['founder', 'ceo', 'team_lead', 'project_manager'])

export function Sidebar() {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'
  const fullName = useAuthStore((s) => s.fullName)
  const email = useAuthStore((s) => s.email)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const logout = useAuthStore((s) => s.logout)
  const { activeOrgId, activeOrg } = useOrgStore()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)

  const current = activeOrg()
  const settingsPath = activeOrgId ? '/company/settings' : '/settings'
  const orgRole = current?.role ?? null
  const isManagement = orgRole ? MANAGEMENT_ROLES.has(orgRole) : false
  const isHR = orgRole ? HR_ROLES.has(orgRole) : false
  const isProjectLead = orgRole ? PROJECT_ROLES.has(orgRole) : false

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const personalNavItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { to: '/profile', label: t('nav.profile'), icon: User },
    { to: '/vacancies', label: t('nav.vacancies'), icon: Briefcase },
    { to: '/messenger', label: t('nav.messenger'), icon: MessageSquare },
  ]

  const orgNavItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { to: '/reports', label: t('nav.reports'), icon: FileBarChart },
  ]

  // Build admin nav items based on role
  const adminNavItems: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = []

  if (isManagement || isHR) {
    adminNavItems.push({ to: '/admin/join-requests', label: t('nav.joinRequests'), icon: UserPlus })
  }
  if (isProjectLead) {
    adminNavItems.push({ to: '/admin/teams', label: t('nav.teams'), icon: Users })
  }
  if (isManagement || isHR) {
    adminNavItems.push({ to: '/admin/users', label: t('nav.users'), icon: User })
  }
  if (isHR) {
    adminNavItems.push({ to: '/admin/hr', label: t('nav.hr'), icon: UserSearch })
  }
  if (orgRole === 'accountant' || isManagement) {
    adminNavItems.push({ to: '/company/subscription', label: t('tariffs.title'), icon: Briefcase })
  }

  const mainItems = activeOrgId ? orgNavItems : personalNavItems
  const showAdminSection = activeOrgId && adminNavItems.length > 0

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'group/sidebar flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[260px]',
      )}
      onMouseEnter={() => { if (collapsed) setCollapsed(false) }}
      onMouseLeave={() => { if (!collapsed) setCollapsed(true) }}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center w-full')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold text-foreground tracking-tight whitespace-nowrap">
              ProjectsControl
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(true) }}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Org Switcher */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <OrgSwitcher onCreateOrg={() => navigate('/dashboard?createOrg=1')} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1">
        <NavSection items={mainItems} collapsed={collapsed} />

        {showAdminSection && (
          <>
            {!collapsed && <SectionLabel label={t('sidebar.admin')} />}
            {collapsed && <div className="my-2 mx-2 h-px bg-border" />}
            <NavSection items={adminNavItems} collapsed={collapsed} />
          </>
        )}
      </nav>

      {/* Bottom utilities */}
      <div className="border-t border-border px-2 py-2 space-y-0.5">
        {activeOrgId && (
          <SidebarLink to="/profile" icon={User} label={t('nav.profile')} collapsed={collapsed} />
        )}
        <SidebarLink to={settingsPath} icon={Settings} label={t('nav.settings')} collapsed={collapsed} />
        <SidebarLink to="/support" icon={MessageSquare} label={t('nav.support')} collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? (isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')) : undefined}
        >
          {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>{isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>}
        </button>
      </div>

      {/* User area */}
      <div className="border-t border-border px-2 py-3">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} name={fullName} alt="avatar" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{fullName ?? t('common.user')}</p>
                <p className="truncate text-[11px] text-muted-foreground">{email ?? ''}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-2.5 pt-5 pb-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
    </div>
  )
}

function NavSection({ items, collapsed }: {
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[]
  collapsed: boolean
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <SidebarLink key={item.to} {...item} collapsed={collapsed} />
      ))}
    </div>
  )
}

function SidebarLink({ to, icon: Icon, label, collapsed }: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-primary/8 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}
