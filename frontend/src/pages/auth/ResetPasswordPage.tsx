import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { resetPassword } from '@/api/auth'
import { toast } from 'sonner'

function QorMedMiniLogo() {
  return (
    <div className="qormed-mini-logo">
      <div className="qormed-auth-mark" aria-hidden="true">
        <span />
      </div>
      <strong>QorMed</strong>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Новый пароль — QorMed M.I.S.'
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch {
      setError('Не удалось обновить пароль')
      toast.error('Не удалось обновить пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="qormed-auth-page qormed-center-auth">
      <div className="qormed-auth-noise" />
      <section className="qormed-center-card">
        <QorMedMiniLogo />

        {done ? (
          <div className="qormed-center-state">
            <div className="qormed-form-icon">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1>Пароль обновлен</h1>
            <p>Теперь можно войти в QorMed с новым паролем.</p>
            <Link to="/login" className="tetis-submit-btn qormed-submit-btn">
              Войти в систему
            </Link>
          </div>
        ) : (
          <>
            <div className="qormed-center-heading">
              <div className="qormed-form-icon">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1>Создайте новый пароль</h1>
              <p>Пароль защищает доступ к пациентам, документам и финансовым данным клиники.</p>
            </div>

            <form onSubmit={handleSubmit} className="qormed-center-form">
              <label className="tetis-field qormed-field">
                <span>Новый пароль</span>
                <div className="tetis-password-field qormed-password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Показать пароль">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <label className="tetis-field qormed-field">
                <span>Повторите пароль</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Повторите пароль"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError('')
                  }}
                />
              </label>

              {error && <div className="tetis-auth-alert tetis-auth-alert-danger qormed-auth-alert-danger">{error}</div>}

              <button type="submit" disabled={loading} className="tetis-submit-btn qormed-submit-btn">
                <Lock className="h-4 w-4" />
                {loading ? 'Обновляем...' : 'Обновить пароль'}
              </button>
            </form>

            <Link to="/login" className="qormed-back-link">
              <ArrowLeft className="h-4 w-4" />
              Назад ко входу
            </Link>
          </>
        )}
      </section>
    </main>
  )
}
