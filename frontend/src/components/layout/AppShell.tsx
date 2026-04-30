import { Outlet, useLocation } from 'react-router'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShellSidebar } from './ShellSidebar'
import { ShellHeader } from './ShellHeader'
import { MobileDrawer } from './MobileDrawer'
import { MobileBottomNav } from './MobileBottomNav'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { useShellSync } from '@/hooks/useShellSync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive'

const MessengerPage = lazy(() => import('@/pages/MessengerPage'))

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  useShellSync()
  usePageTitle()
  useSessionKeepAlive()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const isMessengerRoute = location.pathname.startsWith('/messenger')

  return (
    <div className="app-shell-stage relative flex h-screen overflow-hidden">
      <CommandPalette />

      {/* Accessibility: skip link */}
      <a href="#main-content" className="skip-to-content">
        {t('a11y.skipToContent', 'Skip to content')}
      </a>

      {/* Desktop sidebar */}
      <div className="hidden md:flex" role="complementary" aria-label="Sidebar">
        <ShellSidebar />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main content area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <ShellHeader onMobileMenuToggle={() => setMobileDrawerOpen(true)} />

        <main
          id="main-content"
          className={isMessengerRoute ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0'}
          role="main"
        >
          <div className={isMessengerRoute ? 'flex h-full w-full flex-col' : 'mx-auto flex min-h-full w-full max-w-[var(--content-max-width)] flex-col px-4 py-5 md:px-[var(--page-gutter)] md:py-6 lg:px-8'}>
            {isMessengerRoute ? (
              <Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-card/60" />}>
                <MessengerPage />
              </Suspense>
            ) : (
              <Outlet />
            )}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </div>
  )
}
