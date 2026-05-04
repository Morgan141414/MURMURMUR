import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Activity, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'

import { login } from '@/api/auth'
import { listMyOrgs } from '@/api/orgs'
import { getMe } from '@/api/profile'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'

const BENEFITS = [
  'Единый вход сотрудников по ИИН',
  'Клиники, пациенты, записи и расписание',
  'Медкарта, документы и аудит действий',
]

function SaphenaLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1687d9] text-white shadow-lg shadow-sky-200/70">
        <Stethoscope className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight text-slate-900">Saphena M.I.S.</p>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-sky-600">Medical platform</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const normalizedIin = iin.replace(/\s+/g, '')

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!/^\d{12}$/.test(normalizedIin)) nextErrors.iin = 'Введите ИИН из 12 цифр'
    if (password.length < 8) nextErrors.password = 'Пароль должен быть не менее 8 символов'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    if (!validate()) return
    setLoading(true)

    try {
      const { data: tokenData } = await login(normalizedIin, password)
      const token = tokenData.access_token
      const refreshToken = tokenData.refresh_token ?? null
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken }, version: 0 }))

      const { data: user } = await getMe()
      setAuth(token, refreshToken, user, remember ? 'local' : 'session')

      try {
        const { data: orgs } = await listMyOrgs()
        setOrgs(orgs.map((o) => ({
          orgId: o.id,
          orgName: o.name,
          role: o.role,
          logoUrl: o.logo_url ?? undefined,
          isActive: o.is_active ?? true,
          moderationStatus: o.moderation_status ?? 'pending',
          moderationComment: o.moderation_comment ?? null,
        })))
      } catch {
        // Пользователь может еще не состоять в клинике.
      }

      navigate('/dashboard')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (Array.isArray(detail)) setErrorMessage(detail.map((item: { msg?: string }) => item.msg ?? '').join('; '))
      else if (typeof detail === 'string') setErrorMessage(detail)
      else setErrorMessage('Не удалось войти. Проверьте ИИН и пароль.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="tetis-auth-page">
      <section className="tetis-auth-hero">
        <div className="tetis-auth-orb tetis-auth-orb-a" />
        <div className="tetis-auth-orb tetis-auth-orb-b" />

        <div className="tetis-auth-left">
          <SaphenaLogo />

          <div className="tetis-auth-copy">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
              <HeartPulse className="h-4 w-4" />
              Медицинская информационная система
            </div>
            <h1>Цифровой кабинет клиники для врачей и администраторов</h1>
            <p>
              Управляйте пациентами, записями, расписанием, медкартами и документами в одном защищенном пространстве.
            </p>
            <div className="tetis-benefits">
              {BENEFITS.map((item) => (
                <div key={item} className="tetis-benefit-row">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tetis-auth-stats">
            <div>
              <strong>24/7</strong>
              <span>доступ к кабинету</span>
            </div>
            <div>
              <strong>RBAC</strong>
              <span>роли и права</span>
            </div>
            <div>
              <strong>Audit</strong>
              <span>журнал действий</span>
            </div>
          </div>
        </div>

        <div className="tetis-auth-card-wrap">
          <form onSubmit={handleSubmit} className="tetis-auth-card">
            <div className="tetis-auth-card-head">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2>Вход в систему</h2>
                <p>Введите ИИН и пароль сотрудника</p>
              </div>
            </div>

            {sessionExpired && (
              <div className="tetis-auth-alert">Сессия истекла. Войдите повторно.</div>
            )}
            {errorMessage && <div className="tetis-auth-alert tetis-auth-alert-danger">{errorMessage}</div>}

            <label className="tetis-field">
              <span>ИИН</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="700101000016"
                value={iin}
                onChange={(e) => {
                  setIin(e.target.value)
                  setErrorMessage('')
                  setErrors((current) => {
                    const { iin: _iin, ...rest } = current
                    return rest
                  })
                }}
                aria-invalid={Boolean(errors.iin)}
              />
              {errors.iin && <small>{errors.iin}</small>}
            </label>

            <label className="tetis-field">
              <span>Пароль</span>
              <div className="tetis-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrorMessage('')
                    setErrors((current) => {
                      const { password: _password, ...rest } = current
                      return rest
                    })
                  }}
                  aria-invalid={Boolean(errors.password)}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Показать пароль">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <small>{errors.password}</small>}
            </label>

            <div className="tetis-auth-options">
              <label>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Запомнить меня</span>
              </label>
              <Link to="/forgot-password">Забыли пароль?</Link>
            </div>

            <button type="submit" disabled={loading} className="tetis-submit-btn">
              <span>{loading ? 'Входим...' : 'Войти'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="tetis-auth-bottom">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </div>
          </form>

          <div className="tetis-floating-card tetis-floating-card-top">
            <Activity className="h-5 w-5 text-emerald-500" />
            <div>
              <strong>Приемы сегодня</strong>
              <span>Расписание синхронизировано</span>
            </div>
          </div>
          <div className="tetis-floating-card tetis-floating-card-bottom">
            <Building2 className="h-5 w-5 text-sky-500" />
            <div>
              <strong>Мультиклиничность</strong>
              <span>Несколько клиник в одном аккаунте</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
