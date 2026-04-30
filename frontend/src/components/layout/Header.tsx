import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Bell, HelpCircle, Inbox, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AvatarImage } from '@/components/shared/AvatarImage'

const pageKeys: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/profile': 'profile',
  '/profile/settings': 'settings',
  '/reports': 'reports',
  '/settings': 'settings',
  '/support': 'support',
  '/faq': 'faq',
  '/messenger': 'messenger',
  '/vacancies': 'vacancies',
}

export function Header() {
  const { t } = useTranslation()
  const fullName = useAuthStore((s) => s.fullName)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const { activeOrg } = useOrgStore()
  const location = useLocation()
  const navigate = useNavigate()

  const current = activeOrg()

  const adminMatch = location.pathname.match(/^\/admin\/(.+)/)
  const superAdminMatch = location.pathname.match(/^\/superadmin\/(.+)/)

  let breadcrumb: string
  let title: string

  if (adminMatch) {
    const section = current ? current.orgName : t('nav.admin')
    breadcrumb = `${section} / ${adminMatch[1].replace(/-/g, ' ')}`
    title = adminMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  } else if (superAdminMatch) {
    breadcrumb = `${t('sidebar.superAdmin')} / ${superAdminMatch[1]}`
    title = superAdminMatch[1].replace(/\b\w/g, (c) => c.toUpperCase())
  } else {
    const navKey = pageKeys[location.pathname]
    breadcrumb = current
      ? `${current.orgName} / ${navKey ? t(`nav.${navKey}`) : ''}`
      : navKey ? t(`nav.${navKey}`) : ''
    title = navKey ? t(`nav.${navKey}`) : ''
  }

  const [showNotifications, setShowNotifications] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U'

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 h-14">
      {/* Left: title */}
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{breadcrumb}</p>
        <h1 className="text-[15px] font-semibold text-foreground leading-tight">{title}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('common.search')}
            className="h-8 w-48 rounded-lg border border-border bg-background pl-9 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:w-64 transition-all duration-200"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
            Ctrl+K
          </kbd>
        </div>

        <LanguageSwitcher />

        {/* Support */}
        <button
          onClick={() => navigate('/support')}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t('nav.support')}
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate('/messenger')}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={t('nav.messenger')}
        >
          <Inbox className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('nav.notifications')}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {showNotifications && (
            <div
              ref={dropdownRef}
              className="notification-dropdown absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover p-4 shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{t('notifications.title')}</h3>
                <button className="text-xs text-primary hover:underline">{t('notifications.markAllRead')}</button>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('notifications.noNew')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <button
          onClick={() => navigate('/profile')}
          className="ml-2 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 hover:bg-accent transition-colors"
        >
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} name={fullName} alt={fullName || ''} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <span className="text-sm font-medium text-foreground hidden sm:block">{fullName}</span>
        </button>
      </div>
    </header>
  )
}
