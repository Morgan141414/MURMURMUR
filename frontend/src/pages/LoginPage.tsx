import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, ArrowRight, Users, BarChart3, Zap, CheckCircle, Shield, Layers } from 'lucide-react'
import { login } from '@/api/auth'
import { getMe } from '@/api/profile'
import { listMyOrgs } from '@/api/orgs'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { usePageTitle } from '@/hooks/usePageTitle'

const FEATURES = [
  { icon: Users, text: 'Real-time team & role management' },
  { icon: BarChart3, text: 'Analytics, reports & KPI dashboards' },
  { icon: Zap, text: 'Automated HR & recruitment workflows' },
  { icon: CheckCircle, text: 'Task tracking & approval chains' },
  { icon: Shield, text: 'Enterprise-grade security & RBAC' },
  { icon: Layers, text: 'Multi-shell architecture per role' },
]

const AVATARS = ['A', 'M', 'S', 'D', 'K']

/* ── Logo Mark ── */
function LogoMark() {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
      <path
        d="M1.04356 6.35771L13.6437 0.666504L13.2006 3.16498L3.01927 7.80327L13.2006 12.4416L13.6437 14.94L1.04356 9.24883L0.333374 7.80327L1.04356 6.35771ZM14.3994 3.16498L14.8425 0.666504L27.4426 6.35771L28.1528 7.80327L27.4426 9.24883L14.8425 14.94L14.3994 12.4416L24.5807 7.80327L14.3994 3.16498Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
  usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'
  const setAuth = useAuthStore((s) => s.setAuth)
  const setOrgs = useOrgStore((s) => s.setOrgs)

  const [iin, setIin] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    const compactIin = iin.replace(/\s+/g, '')
    if (!compactIin) e.email = t('auth.fieldRequired', 'Required')
    else if (!/^\d{12}$/.test(compactIin)) e.email = t('auth.invalidIin', 'Enter a valid IIN (12 digits)')
    if (!password) e.password = t('auth.fieldRequired', 'Required')
    else if (password.length < 8) e.password = t('auth.passwordTooShort', 'Min 8 characters')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrorMessage('')
    try {
      const { data: tokenData } = await login(iin.replace(/\s+/g, ''), password)
      const token = tokenData.access_token
      const refreshTkn = tokenData.refresh_token ?? null
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken: refreshTkn }, version: 0 }))
      const { data: user } = await getMe()
      setAuth(token, refreshTkn, user, remember ? 'local' : 'session')
      try {
        const { data: orgs } = await listMyOrgs()
        setOrgs(
          orgs.map((o) => ({
            orgId: o.id,
            orgName: o.name,
            role: o.role,
            logoUrl: o.logo_url ?? undefined,
            isActive: o.is_active ?? true,
            moderationStatus: o.moderation_status ?? 'pending',
            moderationComment: o.moderation_comment ?? null,
          })),
        )
      } catch { /* ok */ }
      navigate('/dashboard')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      let msg: string
      if (Array.isArray(detail)) msg = detail.map((e: { msg?: string }) => e.msg ?? '').join('; ')
      else if (typeof detail === 'string') msg = detail
      else msg = t('auth.loginError')
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-scene relative flex min-h-screen overflow-hidden">
      {/* Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* ═══ Left Hero Panel ═══ */}
      <div className="relative hidden flex-col justify-between p-12 lg:flex lg:w-[52%]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
            <LogoMark />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Bloom OS</span>
        </div>

        {/* Main content */}
        <div className="max-w-lg animate-fade-in-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" />
            Enterprise Platform
          </div>

          <h1 className="text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white">
            Manage your{' '}
            <span className="text-gradient-brand">company</span>
            {' '}operations
          </h1>

          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-white/35">
            A unified platform for HR, recruitment, project management,
            analytics, and enterprise automation.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-2.5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 50}ms` }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] border border-white/[0.06]">
                  <f.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[13px] text-white/45">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-12 border-t border-white/[0.06] pt-7">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {AVATARS.map((l, i) => (
                  <div
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#060C1A] text-[11px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${210 + i * 25}, 70%, 50%), hsl(${230 + i * 25}, 70%, 45%))` }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">1,000+ professionals</p>
                <p className="text-[11px] text-white/30">use the platform daily</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-white/15">&copy; {new Date().getFullYear()} Bloom OS. All rights reserved.</p>
      </div>

      {/* ═══ Right Auth Panel ═══ */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="auth-form-card w-full max-w-[400px] animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LogoMark />
            </div>
            <span className="text-[14px] font-semibold text-white">Bloom OS</span>
          </div>

          <div className="mb-7">
            <h2 className="text-[22px] font-bold text-white">{t('auth.welcomeBack', 'Welcome back')}</h2>
            <p className="mt-1.5 text-[13px] text-white/30">
              {t('auth.loginSubtitle', 'Enter your credentials to sign in')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                {t('auth.emailOrIin', 'Email / IIN')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('auth.iinPlaceholder', '123456789012')}
                value={iin}
                onChange={(e) => { setIin(e.target.value); setErrorMessage(''); setErrors((p) => { const { email: _, ...r } = p; return r }) }}
                className="auth-input"
                style={errors.email ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}
              />
              {errors.email && <p className="mt-1 text-[11px] text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                {t('auth.password', 'Password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); setErrors((p) => { const { password: _, ...r } = p; return r }) }}
                  onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  className="auth-input"
                  style={{ paddingRight: '2.5rem', ...(errors.password ? { borderColor: 'rgba(239,68,68,0.4)' } : {}) }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] text-red-400">{errors.password}</p>}
              {capsLock && <p className="mt-1 text-[11px] text-yellow-400">CapsLock включён</p>}
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white/30">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: '#3B82F6' }}
                />
                {t('auth.rememberMe', 'Remember me')}
              </label>
              <Link to="/forgot-password" className="text-[12px] font-medium text-primary transition-colors hover:text-primary-hover">
                {t('auth.forgotPassword', 'Forgot password?')}
              </Link>
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/15 bg-red-500/8 px-4 py-3 text-[13px] text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="auth-submit-btn mt-1">
              {loading ? (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {loading ? t('auth.loggingIn', 'Signing in...') : t('auth.loginButton', 'Sign In')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[rgba(17,24,39,0.9)] px-3 text-[11px] text-white/20">or continue with</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <button className="auth-oauth-btn">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button className="auth-oauth-btn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple
            </button>
          </div>

          <p className="mt-6 text-center text-[12px] text-white/20">
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <Link to="/register" className="font-semibold text-primary transition-colors hover:text-primary-hover">
              {t('auth.register', 'Sign Up')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
