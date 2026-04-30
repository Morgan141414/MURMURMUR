import { Outlet, Link } from 'react-router'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AuthShell() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen">
      <a href="#main-content" className="skip-to-content">
        {t('a11y.skipToContent', 'Skip to content')}
      </a>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between bg-primary p-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">ProjectsControl</span>
        </Link>

        <div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            {t('auth.loginSubtitle', 'Control projects with confidence')}
          </h2>
          <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
            {t('auth.brandDesc', 'Project management, team coordination, document flow, and corporate governance in one secure platform.')}
          </p>
          <div className="mt-8 flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">1000+</p>
              <p className="text-xs text-white/50">{t('auth.professionals', 'Professionals')}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">50+</p>
              <p className="text-xs text-white/50">{t('auth.companies', 'Companies')}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-xs text-white/50">{t('auth.uptime', 'Uptime')}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} ProjectsControl</p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 sm:px-16" id="main-content" role="main">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">ProjectsControl</span>
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
