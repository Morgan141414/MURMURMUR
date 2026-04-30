import { Outlet, Link, useLocation } from 'react-router'
import { Building2, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/features', labelKey: 'public.features' },
  { to: '/use-cases', labelKey: 'public.useCases' },
  { to: '/pricing', labelKey: 'public.pricing' },
  { to: '/docs', labelKey: 'public.docs' },
]

export function PublicShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-to-content">
        {t('a11y.skipToContent', 'Skip to content')}
      </a>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-nav" role="banner">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5" aria-label="ProjectsControl Home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-[15px] font-semibold text-foreground tracking-tight">
              ProjectsControl
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm transition-colors',
                  location.pathname === link.to
                    ? 'bg-primary/8 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {t(link.labelKey, { defaultValue: link.labelKey.split('.').pop() ?? link.labelKey })}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('auth.loginButton', 'Sign In')}
            </Link>
            <Link
              to="/register"
              className="hidden sm:inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t('public.getStarted', 'Get Started')}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card animate-fade-in" role="navigation" aria-label="Mobile navigation">
            <div className="space-y-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                    location.pathname === link.to
                      ? 'bg-primary/8 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  {t(link.labelKey, { defaultValue: link.labelKey.split('.').pop() ?? link.labelKey })}
                </Link>
              ))}
              <div className="border-t border-border pt-3 mt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  {t('auth.loginButton', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
                >
                  {t('public.getStarted', 'Get Started')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" role="main">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('public.product', 'Product')}</h3>
              <ul className="mt-3 space-y-2">
                <li><Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.features', 'Features')}</Link></li>
                <li><Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.pricing', 'Pricing')}</Link></li>
                <li><Link to="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.changelog', 'Changelog')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('public.resources', 'Resources')}</h3>
              <ul className="mt-3 space-y-2">
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.docs', 'Documentation')}</Link></li>
                <li><Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.useCases', 'Use Cases')}</Link></li>
                <li><Link to="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.status', 'Status')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('public.company', 'Company')}</h3>
              <ul className="mt-3 space-y-2">
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.about', 'About')}</Link></li>
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.contact', 'Contact')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('public.legal', 'Legal')}</h3>
              <ul className="mt-3 space-y-2">
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.privacy', 'Privacy')}</Link></li>
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('public.terms', 'Terms')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">ProjectsControl</span>
            </div>
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} ProjectsControl. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
