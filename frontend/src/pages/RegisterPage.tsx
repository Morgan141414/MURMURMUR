import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Building2, Eye, EyeOff, ShieldCheck, Stethoscope, UserRoundPlus } from 'lucide-react'
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
    if (Array.isArray(detail)) return detail.map((item: { msg?: string }) => item.msg ?? '').join('; ')
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
      storage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken }, version: 0 }))
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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fdff_0%,#e9fbff_45%,#ecfdf5_100%)]">
      <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-cyan-200/45 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full bg-emerald-200/45 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <section className="flex items-center">
          <div className="w-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 lg:p-8">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <UserRoundPlus className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Saphena M.I.S.</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950 lg:text-4xl">Регистрация сотрудника</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Создайте аккаунт по ИИН и войдите в медицинский рабочий кабинет.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">ФИО</label>
                <input value={fullName} onChange={(e) => { setFullName(e.target.value); setError('') }} placeholder="Иванов Иван Иванович" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">ИИН</label>
                <input value={iin} onChange={(e) => { setIin(e.target.value); setError('') }} inputMode="numeric" placeholder="123456789012" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email (необязательно)</label>
                <input value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} type="email" placeholder="doctor@clinic.kz" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Пароль</label>
                <div className="relative">
                  <input value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} type={showPassword ? 'text' : 'password'} placeholder="Минимум 8 символов" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Запомнить меня
              </label>

              {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-600">
              Уже есть аккаунт?{' '}
              <Link className="font-bold text-emerald-700 hover:text-emerald-800" to="/login">Войти</Link>
            </p>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[32px] border border-white/80 bg-white/75 p-6 shadow-2xl shadow-cyan-100/70 backdrop-blur-xl lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              <Building2 className="h-3.5 w-3.5" />
              Контур клиники
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 lg:text-5xl">Подключайтесь к цифровой медицине</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              После регистрации вы сможете подать заявку на клинику, пройти модерацию, работать с пациентами, вести расписание врачей и формировать документы.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <ShieldCheck className="mb-3 h-6 w-6 text-emerald-700" />
                <p className="text-base font-semibold text-slate-950">Безопасный доступ</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Роли и права сотрудников в нескольких клиниках.</p>
              </div>
              <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
                <Stethoscope className="mb-3 h-6 w-6 text-cyan-700" />
                <p className="text-base font-semibold text-slate-950">Медицинский профиль</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Пациенты, записи, медкарта и документы в одном рабочем месте.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
