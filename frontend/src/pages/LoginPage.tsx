import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CalendarCheck2, Eye, EyeOff, HeartPulse, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react'

import { login } from '@/api/auth'
import { listMyOrgs } from '@/api/orgs'
import { getMe } from '@/api/profile'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'

const HIGHLIGHTS = [
  'Вход сотрудников по ИИН и паролю',
  'Клиники, роли и права доступа',
  'Пациенты, записи, расписание и медкарта',
  'Документы, уведомления, аудит и поддержка',
]

function MedicalMark() {
  return (
    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-200">
      <Stethoscope className="h-6 w-6" />
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
  const [error, setError] = useState('')

  const normalizedIin = iin.replace(/\s+/g, '')

  function validate() {
    if (!/^\d{12}$/.test(normalizedIin)) {
      setError('Введите корректный ИИН: 12 цифр')
      return false
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return false
    }
    return true
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
        // Auth remains valid even if clinic list cannot be loaded immediately.
      }

      navigate('/dashboard')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: { msg?: string }) => e.msg ?? '').join('; '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Ошибка входа. Проверьте ИИН и пароль.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fdff_0%,#e9fbff_44%,#f0fdf4_100%)]">
      <div className="absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full bg-emerald-200/45 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="flex items-center">
          <div className="w-full rounded-[32px] border border-white/80 bg-white/75 p-6 shadow-2xl shadow-cyan-100/70 backdrop-blur-xl lg:p-10">
            <div className="mb-8 flex items-center gap-4">
              <MedicalMark />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Saphena M.I.S.</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 lg:text-5xl">Медицинская информационная система</h1>
              </div>
            </div>

            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Рабочий контур клиники: сотрудники, пациенты, расписание, медкарты, документы и контроль доступа в одной системе.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
                <HeartPulse className="mb-3 h-5 w-5 text-cyan-700" />
                <p className="text-sm font-semibold text-slate-950">Пациенты</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Прикрепление, поиск и история обращений</p>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <CalendarCheck2 className="mb-3 h-5 w-5 text-blue-700" />
                <p className="text-sm font-semibold text-slate-950">Расписание</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Записи, слоты и статусы визитов</p>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                <UsersRound className="mb-3 h-5 w-5 text-emerald-700" />
                <p className="text-sm font-semibold text-slate-950">Роли</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Доступ по клиникам и сотрудникам</p>
              </div>
            </div>

            <ul className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-slate-100">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Защищённый доступ</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Вход в систему</h2>
            <p className="mt-2 text-sm text-slate-500">Используйте ИИН и пароль сотрудника клиники</p>
            {sessionExpired && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Сессия завершена. Войдите повторно.
              </div>
            )}
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">ИИН</label>
                <input
                  value={iin}
                  onChange={(e) => { setIin(e.target.value); setError('') }}
                  inputMode="numeric"
                  placeholder="123456789012"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Пароль</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
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
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
            <p className="mt-5 text-sm text-slate-600">
              Нет аккаунта?{' '}
              <Link className="font-bold text-cyan-700 hover:text-cyan-800" to="/register">Зарегистрироваться</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
