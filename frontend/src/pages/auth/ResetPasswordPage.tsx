import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { resetPassword } from '@/api/auth'
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

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return }
    if (password.length < 6) { setError(t('auth.passwordTooShort')); return }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch {
      setError(t('auth.resetPasswordError'))
      toast.error(t('auth.resetPasswordError'))
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
          {done ? (
            /* ═══ Success ═══ */
            <div className="text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 mb-5">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {t('auth.passwordResetSuccess', 'Password updated')}
              </h2>
              <p className="text-[13px] text-white/35 mb-6 max-w-xs mx-auto leading-relaxed">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-primary-hover"
              >
                {t('auth.goToLogin', 'Go to Sign In')}
              </Link>
            </div>
          ) : (
            /* ═══ Form ═══ */
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-white">{t('auth.resetPassword', 'Set new password')}</h2>
                <p className="mt-1.5 text-[13px] text-white/30">
                  {t('auth.enterNewPassword', 'Choose a strong password for your account')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                    {t('auth.newPassword', 'New password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.newPasswordPlaceholder', 'Enter new password')}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      className="auth-input"
                      style={{ paddingRight: '2.5rem' }}
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
                </div>

                {/* Confirm password */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                    {t('auth.confirmPassword', 'Confirm password')}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.confirmPasswordPlaceholder', 'Repeat password')}
                    required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    className="auth-input"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-red-500/15 bg-red-500/8 px-4 py-3 text-[13px] text-red-300">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading} className="auth-submit-btn w-full">
                  {loading ? (
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {loading ? t('common.loading', 'Updating...') : t('auth.resetPasswordButton', 'Update Password')}
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
