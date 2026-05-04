import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { forgotPassword } from '@/api/auth'
import { toast } from 'sonner'

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

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const [resetLink, setResetLink] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await forgotPassword(email)
      setSent(true)
      // In staging: backend returns reset_token for testing
      if (res.data?.reset_token) {
        setResetLink('/reset-password?token=' + res.data.reset_token)
      }
    } catch (error) {
      const detail =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      toast.error(detail || t('auth.forgotPasswordError', 'Не удалось отправить ссылку'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-scene relative flex min-h-screen items-center justify-center overflow-hidden">
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

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
            <LogoMark />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Bloom OS</span>
        </div>

        <div className="auth-form-card animate-fade-in-up">
          {sent ? (
            /* ═══ Success State ═══ */
            <div className="text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 mb-5">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('auth.resetLinkSent', 'Check your email')}</h2>
              <p className="text-[13px] text-white/35 mb-4 max-w-xs mx-auto leading-relaxed">
                Мы отправили ссылку для сброса пароля на <span className="text-white/60 font-medium">{email}</span>
              </p>
              {resetLink && (
                <Link
                  to={resetLink}
                  className="mb-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-[13px] font-semibold text-primary transition-all hover:bg-primary/20"
                >
                  Сбросить пароль
                </Link>
              )}
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.backToLogin', 'Back to login')}
              </Link>
            </div>
          ) : (
            /* ═══ Form State ═══ */
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-white">{t('auth.forgotPassword', 'Forgot password?')}</h2>
                <p className="mt-1.5 text-[13px] text-white/30">
                  {t('auth.forgotPasswordSubtitle', "Enter your email and we'll send a reset link")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                    {t('auth.email', 'Email address')}
                  </label>
                  <input
                    type="email"
                    placeholder={t('auth.emailPlaceholder', 'you@company.com')}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn w-full"
                >
                  {loading ? (
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {loading ? t('common.loading', 'Sending...') : t('auth.sendResetLink', 'Send Reset Link')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/30 transition-colors hover:text-white/60"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {t('auth.backToLogin', 'Back to login')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
