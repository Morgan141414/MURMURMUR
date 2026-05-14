import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  ShieldCheck,
} from 'lucide-react'

import { exchangeQtrixTransitionToken, getAuthHealth, login } from '@/api/auth'
import { listMyOrgs } from '@/api/orgs'
import { getMe } from '@/api/profile'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { translateApiErrorDetail } from '@/lib/apiErrorTranslations'

const BENEFITS = [
  'Пациенты, расписание и приемы в одном окне',
  'Медкарта, документы, оплаты и счета',
  'Отчеты, KPI и контроль действий команды',
]

const PREVIEW_FLOW = [
  { label: 'Запись', value: '09:30', icon: CalendarDays },
  { label: 'Карта', value: 'готова', icon: HeartPulse },
  { label: 'Оплата', value: 'закрыта', icon: CreditCard },
  { label: 'KPI', value: '+18%', icon: BarChart3 },
]


const SPLASH_DURATION_MS = 2600

function playQorMedIntroSound() {
  if (typeof window === 'undefined') return () => {}
  const AudioContextCtor = window.AudioContext ?? (window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext

  if (!AudioContextCtor) return () => {}

  let disposed = false
  let started = false
  let audioContext: AudioContext | null = null
  let closeTimer: number | null = null

  const removeListeners = () => {
    window.removeEventListener('pointerdown', attemptPlayback)
    window.removeEventListener('keydown', attemptPlayback)
    window.removeEventListener('touchstart', attemptPlayback)
  }

  const scheduleTone = (
    context: AudioContext,
    destination: AudioNode,
    frequency: number,
    startOffset: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ) => {
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const now = context.currentTime + startOffset

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.018, now + duration)

    gainNode.gain.setValueAtTime(0.0001, now)
    gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.03)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gainNode)
    gainNode.connect(destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.05)
  }

  const attemptPlayback = async () => {
    if (disposed || started) return

    try {
      const context = audioContext ?? new AudioContextCtor()
      audioContext = context

      if (context.state === 'suspended') {
        await context.resume()
      }

      if (context.state !== 'running') return

      started = true
      removeListeners()

      const masterGain = context.createGain()
      const filter = context.createBiquadFilter()
      const widthGain = context.createGain()

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(3400, context.currentTime)
      filter.Q.setValueAtTime(0.55, context.currentTime)

      widthGain.gain.setValueAtTime(0.56, context.currentTime)
      masterGain.gain.setValueAtTime(0.0001, context.currentTime)
      masterGain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.11)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.46)

      widthGain.connect(filter)
      filter.connect(masterGain)
      masterGain.connect(context.destination)

      scheduleTone(context, widthGain, 261.63, 0.0, 0.42, 0.026, 'sine')
      scheduleTone(context, widthGain, 329.63, 0.04, 0.48, 0.022, 'sine')
      scheduleTone(context, widthGain, 392.0, 0.08, 0.58, 0.019, 'triangle')
      scheduleTone(context, widthGain, 523.25, 0.16, 0.72, 0.013, 'sine')
      scheduleTone(context, widthGain, 659.25, 0.24, 0.64, 0.009, 'sine')

      closeTimer = window.setTimeout(() => {
        if (audioContext && audioContext.state !== 'closed') {
          void audioContext.close().catch(() => {})
        }
      }, 1400)
    } catch {
      // Ignore autoplay-related errors and retry on first interaction.
    }
  }

  window.addEventListener('pointerdown', attemptPlayback, { passive: true })
  window.addEventListener('keydown', attemptPlayback)
  window.addEventListener('touchstart', attemptPlayback, { passive: true })
  void attemptPlayback()

  return () => {
    disposed = true
    removeListeners()
    if (closeTimer) window.clearTimeout(closeTimer)
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close().catch(() => {})
    }
  }
}

function QorMedLogo() {
  return (
    <div className="qormed-auth-logo" aria-label="QorMed">
      <div className="qormed-auth-mark" aria-hidden="true">
        <span />
      </div>
      <div>
        <p>QorMed</p>
        <small>medical information system</small>
      </div>
    </div>
  )
}


function QorMedSplash() {
  return (
    <div className="qormed-splash" aria-hidden="true">
      <div className="qormed-splash__backdrop" />
      <div className="qormed-splash__beam qormed-splash__beam--left" />
      <div className="qormed-splash__beam qormed-splash__beam--center" />
      <div className="qormed-splash__beam qormed-splash__beam--right" />
      <div className="qormed-splash__halo" />
      <div className="qormed-splash__content">
        <div className="qormed-splash__brand">
          <div className="qormed-auth-mark qormed-splash__mark">
            <span />
          </div>
          <h1>QorMed</h1>
        </div>
        <div className="qormed-splash__line" />
        <p>ЦИФРОВОЕ УПРАВЛЕНИЕ КЛИНИКОЙ</p>
      </div>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="qormed-product-preview" aria-hidden="true">
      <div className="qormed-preview-grid" />
      <div className="qormed-preview-panel qormed-preview-panel-main">
        <div className="qormed-preview-topline">
          <span>QorMed Control</span>
          <strong>online</strong>
        </div>
        <div className="qormed-preview-patient">
          <div>
            <small>Пациент</small>
            <strong>Карта #2471</strong>
          </div>
          <span>12 мин</span>
        </div>
        <div className="qormed-preview-chart">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="qormed-preview-panel qormed-preview-panel-side">
        <FileText className="h-5 w-5" />
        <span>Протокол приема</span>
      </div>
      <div className="qormed-preview-panel qormed-preview-panel-bottom">
        {PREVIEW_FLOW.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <Icon className="h-4 w-4" />
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    document.title = 'Войти — QorMed M.I.S.'
    const cleanupSound = playQorMedIntroSound()
    const timeoutId = window.setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS)

    return () => {
      window.clearTimeout(timeoutId)
      cleanupSound()
    }
  }, [])

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'
  const setAuth = useAuthStore((s) => s.setAuth)
  const setOrgs = useOrgStore((s) => s.setOrgs)

  const [iin, setIin] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [authAvailable, setAuthAvailable] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const normalizedIin = iin.replace(/\s+/g, '')
  const transitionToken = searchParams.get('transition_token')

  useEffect(() => {
    if (!transitionToken) return
    const transitionTokenValue = transitionToken

    let cancelled = false
    async function completeTransitionLogin() {
      setLoading(true)
      setErrorMessage('')
      try {
        const { data: tokenData } = await exchangeQtrixTransitionToken(transitionTokenValue)
        if (cancelled) return
        const token = tokenData.access_token
        const refreshToken = tokenData.refresh_token ?? null
        localStorage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken }, version: 0 }))

        const { data: user } = await getMe()
        if (cancelled) return
        setAuth(token, refreshToken, user, 'local')

        try {
          const { data: orgs } = await listMyOrgs()
          if (!cancelled) {
            setOrgs(orgs.map((o) => ({
              orgId: o.id,
              orgName: o.name,
              role: o.role,
              logoUrl: o.logo_url ?? undefined,
              isActive: o.is_active ?? true,
              moderationStatus: o.moderation_status ?? 'pending',
              moderationComment: o.moderation_comment ?? null,
            })))
          }
        } catch {
          // Доступ в QorMed может быть выдан без локального выбора клиники.
        }

        navigate('/dashboard', { replace: true })
      } catch {
        if (!cancelled) setErrorMessage('Не удалось открыть QorMed из Qtrix. Проверьте, что клиника синхронизирована и доступ активен.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void completeTransitionLogin()
    return () => {
      cancelled = true
    }
  }, [navigate, setAuth, setOrgs, transitionToken])

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        const { data } = await getAuthHealth()
        if (!mounted) return
        setAuthAvailable(data.status === 'ok')
      } catch {
        if (!mounted) return
        setAuthAvailable(false)
      } finally {
        if (mounted) setAuthChecking(false)
      }
    }

    void checkAuth()
    return () => {
      mounted = false
    }
  }, [])

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
    if (!authAvailable) {
      setErrorMessage('Сервис авторизации временно недоступен. Попробуйте позже или обратитесь в поддержку.')
      return
    }
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
      else if (typeof detail === 'string') setErrorMessage(translateApiErrorDetail(detail))
      else setErrorMessage('Не удалось войти. Проверьте ИИН и пароль.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="tetis-auth-page qormed-auth-page">
      {showSplash && <QorMedSplash />}
      <section className="tetis-auth-hero qormed-auth-hero">
        <div className="qormed-auth-noise" />
        <div className="qormed-auth-left">
          <QorMedLogo />

          <div className="tetis-auth-copy qormed-auth-copy">
            <h1>QorMed управляет клиникой в одном окне</h1>
            <p>
              Единый кабинет для врачей и администраторов: запись пациентов, электронная карта,
              оплаты, документы, отчеты и KPI команды.
            </p>
            <div className="tetis-benefits qormed-benefits">
              {BENEFITS.map((item) => (
                <div key={item} className="tetis-benefit-row qormed-benefit-row">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>

        <div className="tetis-auth-card-wrap qormed-auth-card-wrap">
          <form onSubmit={handleSubmit} className="tetis-auth-card qormed-auth-card">
            <div className="tetis-auth-card-head qormed-auth-card-head">
              <div className="qormed-form-icon">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2>Вход в систему</h2>
                <p>Для сотрудников клиники и руководителей</p>
              </div>
            </div>

            {sessionExpired && (
              <div className="tetis-auth-alert qormed-auth-alert">Сессия истекла. Войдите повторно.</div>
            )}
            {!authChecking && !authAvailable && (
              <div className="tetis-auth-alert tetis-auth-alert-danger qormed-auth-alert-danger">
                Сервис авторизации временно недоступен. Мы уже показываем это до отправки формы, чтобы не терять ваше время.
              </div>
            )}
            {errorMessage && <div className="tetis-auth-alert tetis-auth-alert-danger qormed-auth-alert-danger">{errorMessage}</div>}

            <label className="tetis-field qormed-field">
              <span>ИИН</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Введите 12 цифр ИИН"
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

            <label className="tetis-field qormed-field">
              <span>Пароль</span>
              <div className="tetis-password-field qormed-password-field">
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

            <div className="tetis-auth-options qormed-auth-options">
              <label>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Запомнить меня</span>
              </label>
              <Link to="/forgot-password">Забыли пароль?</Link>
            </div>

            <button type="submit" disabled={loading || authChecking || !authAvailable} className="tetis-submit-btn qormed-submit-btn">
              <span>{authChecking ? 'Проверяем доступ...' : loading ? 'Входим...' : 'Войти в QorMed'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="tetis-auth-bottom qormed-auth-bottom">
              Нет аккаунта? <Link to="/register">Зарегистрировать клинику</Link><span> · </span><Link to="/patient/register">Я пациент</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
