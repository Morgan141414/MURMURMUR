import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, HeartPulse, KeyRound, MessageSquareText, ShieldCheck } from 'lucide-react'

import { getMe } from '@/api/profile'
import { login, register } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

type PatientStep = 'iin' | 'otp' | 'password' | 'success'

const steps: Array<{ id: PatientStep; label: string }> = [
  { id: 'iin', label: 'ИИН' },
  { id: 'otp', label: 'SMS' },
  { id: 'password', label: 'Пароль' },
]

function maskPhone(iin: string) {
  const tail = iin.slice(-2) || '90'
  return `+7 7•• ••• ${tail.padStart(2, '0')} 90`
}

function getStepIndex(step: PatientStep) {
  if (step === 'success') return steps.length
  return steps.findIndex((item) => item.id === step)
}

export default function PatientRegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState<PatientStep>('iin')
  const [iin, setIin] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const normalizedIin = iin.replace(/\s+/g, '')
  const currentStepIndex = getStepIndex(step)
  const maskedPhone = useMemo(() => maskPhone(normalizedIin), [normalizedIin])

  function clearError() {
    if (errorMessage) setErrorMessage('')
  }

  function extractError(err: unknown) {
    if (!axios.isAxiosError(err)) return 'Не удалось создать пациентский доступ. Попробуйте позже.'
    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) return detail.map((item: { msg?: string }) => item.msg ?? '').join('; ')
    if (typeof detail === 'string') {
      if (detail.includes('already')) return 'Аккаунт с таким ИИН уже существует. Войдите через экран входа или восстановите пароль.'
      if (detail.includes('IIN')) return 'Проверьте ИИН: он должен быть действительным и состоять из 12 цифр.'
      return detail
    }
    return 'Не удалось создать пациентский доступ. Попробуйте позже.'
  }

  async function submitPassword() {
    if (password.length < 8) {
      setErrorMessage('Пароль должен быть не менее 8 символов.')
      return
    }

    setLoading(true)
    try {
      await register(normalizedIin, password, 'Пациент QorMed')
      const { data: tokenData } = await login(normalizedIin, password)
      const token = tokenData.access_token
      const refreshToken = tokenData.refresh_token ?? null
      localStorage.setItem('auth-storage', JSON.stringify({ state: { token, refreshToken }, version: 0 }))
      const { data: user } = await getMe()
      setAuth(token, refreshToken, user, 'local')
      setStep('success')
      window.setTimeout(() => navigate('/patient'), 650)
    } catch (err) {
      setErrorMessage(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMessage('')

    if (step === 'iin') {
      if (!/^\d{12}$/.test(normalizedIin)) {
        setErrorMessage('Введите ИИН из 12 цифр.')
        return
      }
      setStep('otp')
      return
    }

    if (step === 'otp') {
      if (!/^\d{4,6}$/.test(otp.replace(/\s+/g, ''))) {
        setErrorMessage('Введите код из SMS: от 4 до 6 цифр.')
        return
      }
      setStep('password')
      return
    }

    if (step === 'password') {
      await submitPassword()
    }
  }

  return (
    <main className="tetis-auth-page qormed-auth-page">
      <section className="tetis-auth-hero tetis-auth-hero-register qormed-auth-hero qormed-auth-hero-register">
        <div className="qormed-auth-noise" />

        <div className="tetis-auth-left qormed-auth-left">
          <div className="qormed-auth-logo" aria-label="QorMed">
            <div className="qormed-auth-mark" aria-hidden="true"><span /></div>
            <div><p>QorMed</p><small>patient access</small></div>
          </div>

          <div className="tetis-auth-copy qormed-auth-copy">
            <h1>Пациентский доступ без звонка в регистратуру</h1>
            <p>Пациент подтверждает ИИН, номер телефона, задает пароль и сразу попадает в личный кабинет с записями, документами и медкартой.</p>
            <div className="tetis-benefits qormed-benefits">
              <div className="tetis-benefit-row qormed-benefit-row"><HeartPulse className="h-5 w-5" /><span>Медкарта и документы доступны только для чтения</span></div>
              <div className="tetis-benefit-row qormed-benefit-row"><MessageSquareText className="h-5 w-5" /><span>SMS-подтверждение перед созданием доступа</span></div>
              <div className="tetis-benefit-row qormed-benefit-row"><ShieldCheck className="h-5 w-5" /><span>После входа открывается пациентский кабинет</span></div>
            </div>
          </div>
        </div>

        <div className="tetis-auth-card-wrap qormed-auth-card-wrap">
          <form onSubmit={handleSubmit} className="tetis-auth-card tetis-register-card qormed-auth-card">
            <div className="tetis-auth-card-head qormed-auth-card-head">
              <div className="qormed-form-icon"><KeyRound className="h-6 w-6" /></div>
              <div>
                <h2>{step === 'success' ? 'Доступ создан' : 'Регистрация пациента'}</h2>
                <p>{step === 'iin' ? 'Начните с ИИН пациента' : step === 'otp' ? `Код отправлен на ${maskedPhone}` : step === 'password' ? 'Задайте пароль для входа' : 'Открываем личный кабинет'}</p>
              </div>
            </div>

            <div className="tetis-benefits qormed-benefits" aria-label="Шаги регистрации">
              {steps.map((item, index) => (
                <div key={item.id} className="tetis-benefit-row qormed-benefit-row">
                  <span className="tetis-step-index">{index + 1}</span>
                  <span>{item.label}</span>
                  {index < currentStepIndex && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
                </div>
              ))}
            </div>

            {errorMessage && <div className="tetis-auth-alert tetis-auth-alert-danger qormed-auth-alert-danger">{errorMessage}</div>}

            {step === 'iin' && (
              <label className="tetis-field qormed-field">
                <span>ИИН</span>
                <input type="text" inputMode="numeric" placeholder="12 цифр" value={iin} onChange={(event) => { setIin(event.target.value); clearError() }} autoFocus />
                <small>Мы проверим формат ИИН и подготовим SMS-подтверждение.</small>
              </label>
            )}

            {step === 'otp' && (
              <label className="tetis-field qormed-field">
                <span>Код из SMS</span>
                <input type="text" inputMode="numeric" placeholder="Введите код" value={otp} onChange={(event) => { setOtp(event.target.value); clearError() }} autoFocus />
                <small>В MVP код подтверждает владение телефоном перед созданием пароля.</small>
              </label>
            )}

            {step === 'password' && (
              <label className="tetis-field qormed-field">
                <span>Пароль</span>
                <div className="tetis-password-field qormed-password-field">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Минимум 8 символов" value={password} onChange={(event) => { setPassword(event.target.value); clearError() }} autoFocus />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Показать пароль">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <small>Пароль будет использоваться вместе с ИИН на экране входа.</small>
              </label>
            )}

            {step === 'success' ? (
              <div className="tetis-auth-alert qormed-auth-alert">Пациентский доступ готов. Сейчас откроется личный кабинет.</div>
            ) : (
              <button type="submit" disabled={loading} className="tetis-submit-btn qormed-submit-btn">
                <span>{loading ? 'Создаем доступ...' : step === 'password' ? 'Создать доступ' : 'Продолжить'}</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            )}

            <div className="tetis-auth-bottom qormed-auth-bottom">
              <Link to="/login"><ArrowLeft className="mr-1 inline h-4 w-4" /> Войти</Link>
              <span> · </span>
              <Link to="/register">Регистрация клиники</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
