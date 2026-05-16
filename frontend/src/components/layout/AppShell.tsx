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
  const isFullHeightRoute = isMessengerRoute || location.pathname.startsWith('/clinic/calendar')

  return (
    <div className="app-shell-stage relative flex h-screen overflow-hidden bg-background text-foreground">
      <CommandPalette />

      <a href="#main-content" className="skip-to-content">
        {t('a11y.skipToContent', 'Skip to content')}
      </a>

      <div className="hidden md:flex" role="complementary" aria-label="Sidebar">
        <ShellSidebar />
      </div>

      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <ShellHeader onMobileMenuToggle={() => setMobileDrawerOpen(true)} />

        <main
          id="main-content"
          className={isFullHeightRoute ? 'flex-1 overflow-hidden bg-background' : 'flex-1 overflow-y-auto overflow-x-hidden bg-background pb-16 md:pb-0'}
          role="main"
        >
          <div
            className={
              isFullHeightRoute
                ? 'flex h-full w-full flex-col'
                : 'flex min-h-full w-full flex-col px-4 py-4 md:px-6 md:py-6'
            }
          >
            {isFullHeightRoute && !isMessengerRoute ? (
              <Outlet />
            ) : isMessengerRoute ? (
              <Suspense fallback={<div className="h-full rounded-lg border border-border bg-card" />}>
                <MessengerPage />
              </Suspense>
            ) : (
              <Outlet />
            )}
          </div>
        </main>

        <MobileBottomNav />
      </div>
    </div>
  )
}
