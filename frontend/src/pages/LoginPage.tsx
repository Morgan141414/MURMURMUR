import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ShieldCheck, Stethoscope, HeartPulse, CalendarCheck2, Eye, EyeOff } from 'lucide-react'

import { login } from '@/api/auth'
import { listMyOrgs } from '@/api/orgs'
import { getMe } from '@/api/profile'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'

const HIGHLIGHTS = [
  'Мультиклиничность и роли доступа',
  'Пациенты, записи и базовая медкарта',
  'Документолог и шаблоны документов',
  'Уведомления, аудит и техподдержка',
]

function MedicalMark() {
  return (
    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
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
      storage.setItem(
        'auth-storage',
        JSON.stringify({ state: { token, refreshToken }, version: 0 }),
      )

      const { data: user } = await getMe()
      setAuth(token, refreshToken, user, remember ? 'local' : 'session')

      try {
        const { data: orgs } = await listMyOrgs()
        setOrgs(
          orgs.map((o) => ({
            orgId: o.id,
            orgName: o.name,
            role: o.role,
            logoUrl: o.logo_url ?? undefined,
            isActive: o.is_active ?? true,
            moderationStatus: o.moderation_status ?? 'pending',
            moderationComment: o.moderation_comment ?? null,
          })),
        )
      } catch {
        // if orgs fail, auth is still valid
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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.15),transparent_30%),linear-gradient(180deg,#05131e_0%,#0a1b2b_100%)]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl lg:p-10">
          <div className="mb-7 flex items-center gap-4">
            <MedicalMark />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Saphena M.I.S.</p>
              <h1 className="text-2xl font-semibold text-white lg:text-3xl">Медицинская информационная система</h1>
            </div>
          </div>

          <p className="max-w-xl text-sm text-slate-300">
            Единая платформа клиники: сотрудники, пациенты, расписание, документы и контроль качества оказания помощи.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15">
                <HeartPulse className="h-4 w-4 text-cyan-200" />
              </div>
              <p className="text-sm font-medium text-cyan-100">Контур пациента</p>
              <p className="mt-1 text-xs text-cyan-100/70">История обращений и базовая медкарта</p>
            </div>
            <div className="rounded-2xl border border-blue-300/20 bg-blue-400/5 p-4">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-300/15">
                <CalendarCheck2 className="h-4 w-4 text-blue-200" />
              </div>
              <p className="text-sm font-medium text-blue-100">Расписание и записи</p>
              <p className="mt-1 text-xs text-blue-100/70">Организация приемов и контроль нагрузки</p>
            </div>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-slate-200/90">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-2xl lg:p-8">
            <h2 className="text-2xl font-semibold text-white">Вход в систему</h2>
            <p className="mt-1 text-sm text-slate-300">Используйте ИИН и пароль сотрудника</p>
            {sessionExpired && (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                Сессия завершена. Войдите повторно.
              </div>
            )}
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 pr-11 text-sm text-white outline-none transition focus:border-cyan-400"
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
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
            <p className="mt-5 text-sm text-slate-300">
              Нет аккаунта?{' '}
              <Link className="font-semibold text-cyan-300 hover:text-cyan-200" to="/register">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
