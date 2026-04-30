import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, ArrowRight, Building2, Sparkles, Check, Shield, Zap, Users, ChevronRight } from 'lucide-react'
import { register, login } from '@/api/auth'
import { getMe } from '@/api/profile'
import { useAuthStore } from '@/stores/authStore'
import { usePageTitle } from '@/hooks/usePageTitle'
import { OAuthButtons } from '@/components/OAuthButtons'
import { cn } from '@/lib/utils'
import axios from 'axios'

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

/* ── Password Strength ── */
function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ], [password])

  const score = checks.filter((c) => c.met).length
  if (!password) return null

  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="mt-2.5 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < score ? colors[score - 1] : 'bg-white/8',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-[10px] font-medium',
          score <= 1 ? 'text-red-400' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-amber-400' : 'text-emerald-400',
        )}>
          {labels[score - 1] || ''}
        </span>
        <div className="flex gap-3">
          {checks.map((c) => (
            <span key={c.label} className={cn('text-[10px]', c.met ? 'text-emerald-400/60' : 'text-white/15')}>
              {c.met ? '✓' : '·'} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Setup Steps Preview ── */
const SETUP_STEPS = [
  { num: '1', label: 'Create account', desc: 'Name, email & password', active: true },
  { num: '2', label: 'Set up company', desc: 'Details, industry & plan', active: false },
  { num: '3', label: 'Invite team', desc: 'Add your first colleagues', active: false },
  { num: '4', label: 'Go live', desc: 'Start managing operations', active: false },
]

export default function RegisterPage() {
  const { t } = useTranslation()
  usePageTitle()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [fullName, setFullName] = useState('')
  const [iin, setIin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!fullName.trim()) e.fullName = t('auth.fieldRequired', 'Required')
    else if (fullName.trim().length < 2) e.fullName = t('auth.nameTooShort', 'Min 2 chars')
    if (!iin.trim()) e.iin = t('auth.fieldRequired', 'Required')
    else if (!/^\d{12}$/.test(iin.replace(/\s+/g, ''))) e.iin = t('auth.invalidIin', 'Enter a valid IIN (12 digits)')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t('auth.invalidEmail', 'Invalid email')
    if (!password) e.password = t('auth.fieldRequired', 'Required')
    else if (password.length < 8) e.password = t('auth.passwordTooShort', 'Min 8 chars')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function extractError(err: unknown, fallback: string): string {
    if (!axios.isAxiosError(err)) return fallback
    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) return detail.map((e: { msg?: string }) => (e.msg ?? '').replace(/^Value error,\s*/i, '')).filter(Boolean).join('; ') || fallback
    if (typeof detail === 'string') return detail
    if (err.response?.status === 429) return t('auth.tooManyAttempts')
    return fallback
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrorMessage('')
    try {
      const normalizedIin = iin.replace(/\s+/g, '')
      await register(normalizedIin, password, fullName, email.trim() || undefined)
    } catch (err) {
      setErrorMessage(extractError(err, t('auth.registerError')))
      setLoading(false)
      return
    }
    try {
      const { data: tokenData } = await login(iin.replace(/\s+/g, ''), password)
      const token = tokenData.access_token
      const refreshTkn = tokenData.refresh_token ?? null
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken: refreshTkn }, version: 0 }))
      const { data: user } = await getMe()
      setAuth(token, refreshTkn, user, remember ? 'local' : 'session')
      navigate('/dashboard')
    } catch (err) {
      setErrorMessage(extractError(err, t('auth.loginError')))
    } finally {
      setLoading(false)
    }
  }

  function clearError() { if (errorMessage) setErrorMessage('') }

  return (
    <div className="auth-scene relative flex min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* ═══ Left Panel ═══ */}
      <div className="relative hidden flex-col justify-between p-12 lg:flex lg:w-[44%]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
            <LogoMark />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Bloom OS</span>
        </div>

        <div className="animate-fade-in-up">
          <h2 className="text-[2rem] font-bold text-white leading-tight max-w-sm">
            Start building your{' '}
            <span className="text-gradient-brand">digital workspace</span>
          </h2>
          <p className="mt-4 text-[14px] text-white/35 leading-relaxed max-w-sm">
            {t('auth.trustedBy', 'Join 500+ companies already using Bloom OS to streamline their operations.')}
          </p>

          {/* Setup steps preview */}
          <div className="mt-10 space-y-3 max-w-sm">
            {SETUP_STEPS.map((step, i) => (
              <div
                key={step.num}
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-4 transition-all',
                  step.active
                    ? 'border-primary/20 bg-primary/[0.03]'
                    : 'border-white/[0.04] bg-white/[0.01]',
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold shrink-0',
                  step.active
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/5 text-white/20',
                )}>
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-medium', step.active ? 'text-white' : 'text-white/30')}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-white/20">{step.desc}</p>
                </div>
                {step.active && <ChevronRight className="h-4 w-4 text-primary/50 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-white/15">&copy; {new Date().getFullYear()} Bloom OS</p>
      </div>

      {/* ═══ Right Panel ═══ */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="auth-form-card w-full max-w-[420px] animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LogoMark />
            </div>
            <span className="text-[14px] font-semibold text-white">Bloom OS</span>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Free to start
              </div>
            </div>
            <h1 className="text-[22px] font-bold text-white">{t('auth.welcomeNew', 'Create your account')}</h1>
            <p className="mt-1.5 text-[13px] text-white/30">{t('auth.registerSubtitle', 'Set up your workspace in under 2 minutes')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full name */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">{t('auth.fullName', 'Full Name')}</label>
              <input
                type="text"
                placeholder={t('auth.namePlaceholder', 'John Doe')}
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); clearError(); setErrors((p) => { const { fullName: _, ...r } = p; return r }) }}
                className="auth-input"
                style={errors.fullName ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}
              />
              {errors.fullName && <p className="mt-1 text-[11px] text-red-400">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">{t('auth.email', 'Email')}</label>
              <input
                type="email"
                placeholder={t('auth.emailOptionalPlaceholder', 'you@company.com (optional)')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); setErrors((p) => { const { email: _, ...r } = p; return r }) }}
                className="auth-input"
                style={errors.email ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}
              />
              {errors.email && <p className="mt-1 text-[11px] text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">{t('auth.iin', 'IIN')}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('auth.iinPlaceholder', '123456789012')}
                value={iin}
                onChange={(e) => { setIin(e.target.value); clearError(); setErrors((p) => { const { iin: _, ...r } = p; return r }) }}
                className="auth-input"
                style={errors.iin ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}
              />
              {errors.iin && <p className="mt-1 text-[11px] text-red-400">{errors.iin}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">{t('auth.password', 'Password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordMinLength', 'Min 8 characters')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); setErrors((p) => { const { password: _, ...r } = p; return r }) }}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
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
              {errors.password
                ? <p className="mt-1 text-[11px] text-red-400">{errors.password}</p>
                : <PasswordStrength password={password} />
              }
              {capsLock && <p className="mt-1 text-[11px] text-yellow-400">CapsLock включён</p>}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 text-[12px] text-white/30">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#3B82F6' }}
              />
              {t('auth.rememberMe', 'Remember me')}
            </label>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/15 bg-red-500/8 px-4 py-3 text-[13px] text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="auth-submit-btn w-full mt-1">
              {loading ? (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {loading ? t('auth.registering', 'Creating...') : t('auth.registerButton', 'Create Account')}
            </button>
          </form>

          <OAuthButtons remember={remember} />

          <p className="mt-6 text-center text-[12px] text-white/20">
            {t('auth.hasAccount', 'Already have an account?')}{' '}
            <Link to="/login" className="font-semibold text-primary transition-colors hover:text-primary-hover">
              {t('auth.login', 'Sign In')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
