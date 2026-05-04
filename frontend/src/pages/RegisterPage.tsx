import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { UserRoundPlus, Eye, EyeOff, ShieldCheck, Building2 } from 'lucide-react'
import axios from 'axios'

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
  const [error, setError] = useState('')

  const name = useMemo(() => splitName(fullName), [fullName])
  const normalizedIin = iin.replace(/\s+/g, '')

  function validate() {
    if (name.firstName.length < 2) {
      setError('Укажите имя и фамилию')
      return false
    }
    if (!/^\d{12}$/.test(normalizedIin)) {
      setError('ИИН должен содержать 12 цифр')
      return false
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Введите корректный email или оставьте поле пустым')
      return false
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return false
    }
    return true
  }

  function extractError(err: unknown) {
    if (!axios.isAxiosError(err)) return 'Не удалось зарегистрироваться'
    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) {
      return detail.map((item: { msg?: string }) => item.msg ?? '').join('; ')
    }
    if (typeof detail === 'string') return detail
    return 'Не удалось зарегистрироваться'
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      await register(normalizedIin, password, fullName, email.trim() || undefined)

      const { data: tokenData } = await login(normalizedIin, password)
      const token = tokenData.access_token
      const refreshToken = tokenData.refresh_token ?? null

      const storage = remember ? localStorage : sessionStorage
      storage.setItem(
        'auth-storage',
        JSON.stringify({ state: { token, refreshToken }, version: 0 }),
      )

      const { data: user } = await getMe()
      setAuth(token, refreshToken, user, remember ? 'local' : 'session')
      navigate('/dashboard')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_75%_8%,rgba(14,165,233,0.14),transparent_38%),radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,#071424_0%,#0b1f31_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <section className="flex items-center">
          <div className="w-full rounded-3xl border border-white/15 bg-slate-950/65 p-6 shadow-2xl backdrop-blur-2xl lg:p-8">
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/40">
              <UserRoundPlus className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-white lg:text-3xl">Регистрация сотрудника</h1>
            <p className="mt-2 text-sm text-slate-300">Создайте аккаунт в медицинской системе и войдите в рабочий кабинет.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">ФИО</label>
                <input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    setError('')
                  }}
                  placeholder="Иванов Иван Иванович"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">ИИН</label>
                <input
                  value={iin}
                  onChange={(e) => {
                    setIin(e.target.value)
                    setError('')
                  }}
                  inputMode="numeric"
                  placeholder="123456789012"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Email (необязательно)</label>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  type="email"
                  placeholder="doctor@clinic.kz"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Пароль</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 pr-11 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                />
                Запомнить меня
              </label>

              {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-300">
              Уже есть аккаунт?{' '}
              <Link className="font-semibold text-emerald-300 hover:text-emerald-200" to="/login">
                Войти
              </Link>
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
            <Building2 className="h-3.5 w-3.5" />
            Контур клиники
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white lg:text-3xl">Подключайтесь к цифровой медицине</h2>
          <p className="mt-3 max-w-xl text-sm text-slate-300">
            После регистрации вы сможете работать с пациентами, вести расписание врачей, формировать документы и проходить модерацию клиники.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-4">
              <ShieldCheck className="mb-2 h-5 w-5 text-emerald-300" />
              <p className="text-sm font-medium text-emerald-100">Безопасный доступ</p>
              <p className="mt-1 text-xs text-emerald-100/70">Роли и права сотрудников по клиникам</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4">
              <UserRoundPlus className="mb-2 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium text-cyan-100">Единый профиль</p>
              <p className="mt-1 text-xs text-cyan-100/70">Быстрый вход в рабочий кабинет после регистрации</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
