import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { forgotPassword } from '@/api/auth'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetLink, setResetLink] = useState('')

  useEffect(() => {
    document.title = 'Восстановление доступа — QorMed M.I.S.'
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await forgotPassword(email)
      setSent(true)
      if (res.data?.reset_token) {
        setResetLink('/reset-password?token=' + res.data.reset_token)
      }
    } catch (error) {
      const detail =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      toast.error(detail || 'Не удалось отправить ссылку')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="qormed-auth-page qormed-center-auth">
      <div className="qormed-auth-noise" />
      <section className="qormed-center-card">
        <QorMedMiniLogo />

        {sent ? (
          <div className="qormed-center-state">
            <div className="qormed-form-icon">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1>Проверьте почту</h1>
            <p>
              Мы отправили ссылку для восстановления доступа на <strong>{email}</strong>.
            </p>
            {resetLink && (
              <Link to={resetLink} className="qormed-secondary-link">
                Открыть ссылку сброса
              </Link>
            )}
            <Link to="/login" className="tetis-submit-btn qormed-submit-btn">
              <ArrowLeft className="h-4 w-4" />
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <>
            <div className="qormed-center-heading">
              <div className="qormed-form-icon">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1>Восстановить доступ</h1>
              <p>Введите email сотрудника. QorMed отправит ссылку для смены пароля.</p>
            </div>

            <form onSubmit={handleSubmit} className="qormed-center-form">
              <label className="tetis-field qormed-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="doctor@clinic.kz"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <button type="submit" disabled={loading} className="tetis-submit-btn qormed-submit-btn">
                <Mail className="h-4 w-4" />
                {loading ? 'Отправляем...' : 'Отправить ссылку'}
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
