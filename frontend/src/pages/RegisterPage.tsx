import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import { ArrowRight, CheckCircle2, Eye, EyeOff, FileText, HeartPulse, ShieldCheck, Stethoscope, UserRoundPlus } from 'lucide-react'

import { getMe } from '@/api/profile'
import { login, register } from '@/api/auth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/stores/authStore'

function splitName(fullName: string) {
  const chunks = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: chunks[0] ?? '',
    lastName: chunks.slice(1).join(' ') || chunks[0] || '',
  }
}

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

const STEPS = [
  'Создайте аккаунт сотрудника',
  'Подайте заявку на клинику',
  'После модерации начните прием пациентов',
]

export default function RegisterPage() {
  usePageTitle()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [fullName, setFullName] = useState('')
  const [iin, setIin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const name = useMemo(() => splitName(fullName), [fullName])
  const normalizedIin = iin.replace(/\s+/g, '')

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (name.firstName.length < 2) nextErrors.fullName = 'Укажите имя и фамилию'
    if (!/^\d{12}$/.test(normalizedIin)) nextErrors.iin = 'ИИН должен содержать 12 цифр'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Введите корректный email'
    if (password.length < 8) nextErrors.password = 'Пароль должен быть не менее 8 символов'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function extractError(err: unknown) {
    if (!axios.isAxiosError(err)) return 'Не удалось зарегистрироваться'
    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) return detail.map((item: { msg?: string }) => item.msg ?? '').join('; ')
    if (typeof detail === 'string') return detail
    return 'Не удалось зарегистрироваться'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    if (!validate()) return
    setLoading(true)

    try {
      await register(normalizedIin, password, fullName, email.trim() || undefined)
      const { data: tokenData } = await login(normalizedIin, password)
      const token = tokenData.access_token
      const refreshToken = tokenData.refresh_token ?? null
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken }, version: 0 }))
      const { data: user } = await getMe()
      setAuth(token, refreshToken, user, remember ? 'local' : 'session')
      navigate('/dashboard')
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  function clearFieldError(field: string) {
    setErrorMessage('')
    setErrors((current) => {
      const { [field]: _removed, ...rest } = current
      return rest
    })
  }

  return (
    <main className="tetis-auth-page">
      <section className="tetis-auth-hero tetis-auth-hero-register">
        <div className="tetis-auth-orb tetis-auth-orb-a" />
        <div className="tetis-auth-orb tetis-auth-orb-b" />

        <div className="tetis-auth-left">
          <SaphenaLogo />

          <div className="tetis-auth-copy">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
              <UserRoundPlus className="h-4 w-4" />
              Быстрый старт MVP1
            </div>
            <h1>Регистрация для клиники и медицинской команды</h1>
            <p>
              Создайте аккаунт, отправьте заявку на клинику и получите доступ к пациентам, расписанию, медкартам и документам.
            </p>
            <div className="tetis-benefits">
              {STEPS.map((step, index) => (
                <div key={step} className="tetis-benefit-row">
                  <span className="tetis-step-index">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tetis-auth-stats">
            <div>
              <strong>ИИН</strong>
              <span>единый вход</span>
            </div>
            <div>
              <strong>Clinic</strong>
              <span>заявка и модерация</span>
            </div>
            <div>
              <strong>MIS</strong>
              <span>медицинский контур</span>
            </div>
          </div>
        </div>

        <div className="tetis-auth-card-wrap">
          <form onSubmit={handleSubmit} className="tetis-auth-card tetis-register-card">
            <div className="tetis-auth-card-head">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2>Создать аккаунт</h2>
                <p>Заполните данные сотрудника</p>
              </div>
            </div>

            {errorMessage && <div className="tetis-auth-alert tetis-auth-alert-danger">{errorMessage}</div>}

            <label className="tetis-field">
              <span>ФИО</span>
              <input
                type="text"
                placeholder="Аманат Тест"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  clearFieldError('fullName')
                }}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && <small>{errors.fullName}</small>}
            </label>

            <label className="tetis-field">
              <span>ИИН</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="700101000017"
                value={iin}
                onChange={(e) => {
                  setIin(e.target.value)
                  clearFieldError('iin')
                }}
                aria-invalid={Boolean(errors.iin)}
              />
              {errors.iin && <small>{errors.iin}</small>}
            </label>

            <label className="tetis-field">
              <span>Email, необязательно</span>
              <input
                type="email"
                placeholder="doctor@saphena.kz"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearFieldError('email')
                }}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <small>{errors.email}</small>}
            </label>

            <label className="tetis-field">
              <span>Пароль</span>
              <div className="tetis-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearFieldError('password')
                  }}
                  aria-invalid={Boolean(errors.password)}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Показать пароль">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password ? <small>{errors.password}</small> : password && <small className="tetis-help-ok">Пароль подходит для регистрации</small>}
            </label>

            <div className="tetis-auth-options">
              <label>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Запомнить меня</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="tetis-submit-btn">
              <span>{loading ? 'Создаем...' : 'Зарегистрироваться'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="tetis-auth-bottom">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </div>
          </form>

          <div className="tetis-floating-card tetis-floating-card-top">
            <FileText className="h-5 w-5 text-emerald-500" />
            <div>
              <strong>Документолог</strong>
              <span>Шаблоны и меддокументы</span>
            </div>
          </div>
          <div className="tetis-floating-card tetis-floating-card-bottom">
            <HeartPulse className="h-5 w-5 text-sky-500" />
            <div>
              <strong>Медкарта</strong>
              <span>История приемов пациента</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
