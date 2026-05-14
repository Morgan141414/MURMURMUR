import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { User } from '@/types'
import { getMe, updateMe, uploadAvatar } from '@/api/profile'
import { changePassword } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate, useSearchParams } from 'react-router'
import {
  Save, Phone, Briefcase, GraduationCap, MapPin, Globe,
  Clock, Heart, ArrowLeft, Camera, Lock, CalendarDays, CheckCircle2, Loader2, Unlink,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { AvatarImage } from '@/components/shared/AvatarImage'
import {
  getGoogleCalendarStatus,
  getGoogleAuthUrl,
  disconnectGoogleCalendar,
  type GoogleCalendarStatus,
} from '@/api/googleCalendar'

const inputClass = 'w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none transition-colors'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'
const salaryCurrencies = ['USD', 'KZT', 'RUB'] as const
type SalaryCurrency = (typeof salaryCurrencies)[number]

export default function ProfileSettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setAvatarUrl = useAuthStore((s) => s.setAvatarUrl)
  const token = useAuthStore((s) => s.token)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const email = useAuthStore((s) => s.email)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [phone, setPhone] = useState('')
  const [iin, setIin] = useState('')
  const [bio, setBio] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')
  const [education, setEducation] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [experienceYears, setExperienceYears] = useState<number | ''>('')
  const [skills, setSkills] = useState('')
  const [isLookingForJob, setIsLookingForJob] = useState(false)
  const [desiredSalary, setDesiredSalary] = useState<number | ''>('')
  const [desiredSalaryCurrency, setDesiredSalaryCurrency] = useState<SalaryCurrency>('USD')
  const [isPrivateProfile, setIsPrivateProfile] = useState(false)
  const [position, setPosition] = useState('')
  const [avatarUrl, setAvatarUrlLocal] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Google Calendar integration state
  const [googleCalStatus, setGoogleCalStatus] = useState<GoogleCalendarStatus | null>(null)
  const [googleCalLoading, setGoogleCalLoading] = useState(false)
  const [googleCalConnecting, setGoogleCalConnecting] = useState(false)

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPatronymic(data.patronymic ?? '')
        setPhone(data.phone ?? '')
        setIin(data.iin ?? '')
        setBio(data.bio ?? '')
        setSpecialty(data.specialty ?? '')
        setCity(data.city ?? '')
        setEducation(data.education ?? '')
        setPortfolioUrl(data.portfolio_url ?? '')
        setExperienceYears(data.experience_years ?? '')
        setSkills(data.skills?.join(', ') ?? '')
        setIsLookingForJob(data.is_looking_for_job ?? false)
        setDesiredSalary(data.desired_salary != null ? Number(data.desired_salary) : '')
        setDesiredSalaryCurrency(
          salaryCurrencies.includes(data.desired_salary_currency as SalaryCurrency)
            ? (data.desired_salary_currency as SalaryCurrency)
            : 'USD',
        )
        setIsPrivateProfile(data.is_private_profile ?? false)
        setPosition(data.position ?? '')
        setAvatarUrlLocal(data.avatar_url ?? null)
        setLinkedinUrl(data.linkedin_url ?? '')
        setGithubUrl(data.github_url ?? '')
        setTelegramUsername(data.telegram_username ?? '')
        setInstagramUsername(data.instagram_username ?? '')
        // Sync avatar to global store
        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url)
        }
      })
      .catch(() => toast.error(t('profile.loadError')))
      .finally(() => setLoading(false))
  }, [t, setAvatarUrl])

  // Load Google Calendar status on mount + handle redirect-back from OAuth
  useEffect(() => {
    getGoogleCalendarStatus()
      .then(({ data }) => setGoogleCalStatus(data))
      .catch(() => {})

    const gcResult = searchParams.get('google_calendar')
    if (gcResult === 'connected') {
      toast.success('Google Calendar подключен')
      getGoogleCalendarStatus().then(({ data }) => setGoogleCalStatus(data)).catch(() => {})
    } else if (gcResult === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown'
      toast.error(`Не удалось подключить Google Calendar: ${reason}`)
    }
  }, [searchParams])

  async function handleConnectGoogle() {
    setGoogleCalConnecting(true)
    try {
      const { data } = await getGoogleAuthUrl()
      window.location.href = data.auth_url
    } catch {
      toast.error('Не удалось получить URL авторизации Google')
      setGoogleCalConnecting(false)
    }
  }

  async function handleDisconnectGoogle() {
    setGoogleCalLoading(true)
    try {
      await disconnectGoogleCalendar()
      setGoogleCalStatus({ connected: false, google_email: null })
      toast.success('Google Calendar отключен')
    } catch {
      toast.error('Не удалось отключить Google Calendar')
    } finally {
      setGoogleCalLoading(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const { data } = await uploadAvatar(file)
      setAvatarUrlLocal(data.avatar_url)
      // Update global authStore so Header and Sidebar show new avatar
      setAvatarUrl(data.avatar_url)
      toast.success(t('profile.avatarUpdated'))
    } catch {
      toast.error(t('profile.avatarError'))
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase() || 'U'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const computedFullName = [lastName, firstName, patronymic].filter(Boolean).join(' ')
      const payload: Partial<Omit<User, 'id' | 'email'>> = {
        full_name: computedFullName || firstName || 'User',
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        patronymic: patronymic || undefined,
        phone: phone || undefined,
        iin: iin.trim() || undefined,
        bio: bio || undefined,
        specialty: specialty || undefined,
        city: city || undefined,
        education: education || undefined,
        portfolio_url: portfolioUrl || undefined,
        experience_years: experienceYears !== '' ? Number(experienceYears) : undefined,
        skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        is_looking_for_job: isLookingForJob,
        desired_salary: desiredSalary !== '' ? Number(desiredSalary) : undefined,
        desired_salary_currency: desiredSalaryCurrency,
        is_private_profile: isPrivateProfile,
        position: position || undefined,
        linkedin_url: linkedinUrl || undefined,
        github_url: githubUrl || undefined,
        telegram_username: telegramUsername || undefined,
        instagram_username: instagramUsername || undefined,
      }
      const { data: updated } = await updateMe(payload)
      if (token) {
        setAuth(token, refreshToken, {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
          patronymic: updated.patronymic,
          avatar_url: avatarUrl,
        })
      }
      toast.success(t('profile.saveSuccess'))
    } catch {
      toast.error(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordUpdate() {
    if (!currentPassword.trim()) {
      toast.error(t('profile.passwordCurrentRequired'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'))
      return
    }
    if (currentPassword === newPassword) {
      toast.error(t('profile.passwordSameAsCurrent'))
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success(t('profile.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('profile.passwordUpdateFailed'))
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t('profile.profileSettings')}
        description={t('profile.profileSettingsDesc')}
        eyebrow={t('profile.accountSettings')}
        backLink={{ to: '/profile', label: t('common.back') }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('profile.openProfile', 'Открыть профиль')}
            </Button>
            <Button type="submit" form="profile-settings-form" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form id="profile-settings-form" onSubmit={handleSave} className="space-y-5">
          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t('profile.avatar', 'Фото профиля')}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {t('profile.profileIdentity', 'Личность и первый экран')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('profile.avatarHintShort')}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                <Camera className="mr-2 h-4 w-4" />
                {uploadingAvatar ? t('common.loading', 'Загрузка') : t('profile.changePhoto', 'Изменить фото')}
              </Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[120px_minmax(0,1fr)]">
              <div className="relative">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    name={[firstName, lastName].filter(Boolean).join(' ') || initials}
                    alt="avatar"
                    className="h-24 w-24 rounded-[28px] object-cover ring-1 ring-border"
                    fallbackClassName="rounded-[28px] text-2xl font-bold"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-primary/10 text-2xl font-bold text-primary ring-1 ring-border">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <ProfileMiniStat
                  label={t('profile.profileReadiness', 'Профиль')}
                  value={lastName && firstName ? t('common.ready', 'Готов') : t('common.partial', 'Частично')}
                  hint={t('profile.identityHint', 'Имя и фото для узнаваемости')}
                />
                <ProfileMiniStat
                  label={t('profile.contacts', 'Контакты')}
                  value={phone || portfolioUrl ? t('common.filled', 'Заполнены') : t('common.pending', 'Пусто')}
                  hint={t('profile.contactsHint', 'Телефон и портфолио')}
                />
                <ProfileMiniStat
                  label={t('profile.careerState', 'Карьера')}
                  value={isLookingForJob ? t('profile.openToWork') : t('profile.closedToOffers', 'Скрыто')}
                  hint={t('profile.careerHint', 'Видимость для вакансий')}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title={t('profile.personalInfo')}
              description={t('profile.personalSectionHint', 'Основные данные, которые видят коллеги и система')}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{t('profile.lastName')}</label>
                <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('profile.firstName')}</label>
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('profile.patronymic')}</label>
                <input value={patronymic} onChange={(e) => setPatronymic(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('profile.iin', 'ИИН')}</label>
                <input inputMode="numeric" maxLength={12} placeholder="12 цифр" value={iin} onChange={(e) => setIin(e.target.value.replace(/\D/g, '').slice(0, 12))} className={inputClass} />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>{t('profile.bio')}</label>
              <textarea rows={4} placeholder={t('profile.bioPlaceholder')} value={bio} onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none" />
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title={t('profile.contactInfo')}
              description={t('profile.contactSectionHint', 'Как с вами связаться и где посмотреть ваши материалы')}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{t('profile.phone')}</span>
                </label>
                <input type="tel" placeholder={t('profile.phonePlaceholder')} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('profile.email')}</label>
                <input disabled value={email ?? ''} className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed" />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{t('profile.portfolio')}</span>
              </label>
              <input type="url" placeholder="https://..." value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className={inputClass} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input type="url" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>GitHub</label>
                <input type="url" placeholder="https://github.com/..." value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Telegram</label>
                <input type="text" placeholder="@username" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input type="text" placeholder="@username" value={instagramUsername} onChange={(e) => setInstagramUsername(e.target.value)} className={inputClass} />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title={t('profile.professionalInfo')}
              description={t('profile.professionalSectionHint', 'Позиционирование, стек и профессиональный контекст')}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{t('profile.position')}</span>
                </label>
                <input placeholder={t('profile.positionPlaceholder')} value={position} onChange={(e) => setPosition(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('profile.specialty')}</label>
                <input placeholder={t('profile.specialtyPlaceholder')} value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t('profile.city')}</span>
                </label>
                <input placeholder={t('profile.cityPlaceholder')} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{t('profile.education')}</span>
                </label>
                <input placeholder={t('profile.educationPlaceholder')} value={education} onChange={(e) => setEducation(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t('profile.experienceYearsLabel', 'Опыт работы (годы)')}</span>
                </label>
                <input type="number" min={0} max={50} placeholder="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value ? Number(e.target.value) : '')} className={inputClass} />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>{t('profile.skills')}</label>
              <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputClass} />
              <p className="mt-1 text-[11px] text-muted-foreground">{t('profile.skillsHint')}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title={t('profile.jobSearch')}
              description={t('profile.jobSearchHint', 'Контролируйте, показывать ли вашу готовность к новым предложениям')}
            />

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Heart className="h-4 w-4 text-primary" />
                {t('profile.lookingForJob')}
              </span>
              <input
                type="checkbox"
                checked={isLookingForJob}
                onChange={(e) => setIsLookingForJob(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            {isLookingForJob && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <div>
                  <label className={labelClass}>{t('profile.desiredSalary')}</label>
                  <input type="number" min={0} placeholder="0" value={desiredSalary} onChange={(e) => setDesiredSalary(e.target.value ? Number(e.target.value) : '')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('profile.salaryCurrency', 'Валюта')}</label>
                  <select
                    value={desiredSalaryCurrency}
                    onChange={(e) => setDesiredSalaryCurrency(e.target.value as SalaryCurrency)}
                    className={inputClass}
                  >
                    {salaryCurrencies.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title="Сменить пароль"
              description="Введите текущий пароль, новый пароль и подтверждение."
            />

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Текущий пароль</label>
                <div className="flex gap-2">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="current-password"
                  />
                  <Button type="button" variant="outline" onClick={() => setShowCurrentPassword((v) => !v)}>
                    {showCurrentPassword ? 'Скрыть' : 'Показать'}
                  </Button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Новый пароль</label>
                <div className="flex gap-2">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                  <Button type="button" variant="outline" onClick={() => setShowNewPassword((v) => !v)}>
                    {showNewPassword ? 'Скрыть' : 'Показать'}
                  </Button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Подтвердите новый пароль</label>
                <div className="flex gap-2">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                  <Button type="button" variant="outline" onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? 'Скрыть' : 'Показать'}
                  </Button>
                </div>
              </div>

              <div className="pt-1">
                <Button type="button" onClick={() => void handlePasswordUpdate()} disabled={passwordSaving}>
                  {passwordSaving ? 'Сохранение...' : 'Обновить пароль'}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title={t('profile.privacyTitle', 'Приватность')}
              description={t('profile.privacyHint', 'Управляйте видимостью вашего аккаунта для других пользователей')}
            />

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lock className="h-4 w-4 text-primary" />
                {t('profile.privateProfile', 'Сделать аккаунт приватным')}
              </span>
              <input
                type="checkbox"
                checked={isPrivateProfile}
                onChange={(e) => setIsPrivateProfile(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('profile.privateProfileHint', 'Когда включено, ваш публичный профиль скрыт для других пользователей.')}
            </p>
          </section>

          {/* ── Google Calendar integration ─────────────────────── */}
          <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
            <SectionHeading
              title="Google Calendar"
              description="Подключите Google-аккаунт врача, чтобы записи пациентов автоматически появлялись в его календаре."
            />

            {googleCalStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Подключено</p>
                    {googleCalStatus.google_email && (
                      <p className="text-xs text-muted-foreground truncate">{googleCalStatus.google_email}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDisconnectGoogle()}
                    disabled={googleCalLoading}
                    className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {googleCalLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><Unlink className="mr-1.5 h-3.5 w-3.5" />Отключить</>
                    }
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Новые записи из расписания клиники будут синхронизированы в основной календарь Google этого аккаунта.
                  Синхронизировать отдельную запись можно прямо из интерфейса календаря.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Google Calendar не подключен</p>
                    <p className="text-xs text-muted-foreground">Нажмите кнопку ниже для авторизации через Google</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => void handleConnectGoogle()}
                  disabled={googleCalConnecting}
                  className="w-full sm:w-auto"
                >
                  {googleCalConnecting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Переход к Google...</>
                    : <><CalendarDays className="mr-2 h-4 w-4" />Подключить Google Calendar</>
                  }
                </Button>
                <p className="text-xs text-muted-foreground">
                  Требуется аккаунт Google. Будет запрошен доступ только к событиям календаря.
                </p>
              </div>
            )}
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/profile')}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </form>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="space-y-4">
            <section className="rounded-[28px] border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    name={[firstName, lastName].filter(Boolean).join(' ') || initials}
                    alt="avatar"
                    className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border"
                    fallbackClassName="rounded-2xl text-xl font-bold"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-1 ring-border">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {[lastName, firstName].filter(Boolean).join(' ') || t('common.user', 'Пользователь')}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{email ?? ''}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t('profile.actionCenter', 'Панель действий')}
                </p>
                <div className="mt-3 space-y-2">
                  <Button type="submit" form="profile-settings-form" className="w-full" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? t('common.saving') : t('common.saveChanges')}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/profile')}>
                    {t('profile.previewProfile', 'Посмотреть профиль')}
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('profile.logicTitle', 'Логика страницы')}
              </p>
              <div className="mt-4 space-y-3">
                <LogicItem
                  title={t('profile.logicIdentity', '1. Сначала личность')}
                  description={t('profile.logicIdentityDesc', 'Фото и имя собраны наверху, чтобы было понятно, чей профиль редактируется')}
                />
                <LogicItem
                  title={t('profile.logicContacts', '2. Потом контакты')}
                  description={t('profile.logicContactsDesc', 'Коммуникационные поля вынесены в отдельный блок без смешения с карьерой')}
                />
                <LogicItem
                  title={t('profile.logicCareer', '3. Затем карьера')}
                  description={t('profile.logicCareerDesc', 'Профессиональная часть и job search сценарий теперь читаются как один контур')}
                />
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function ProfileMiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  )
}

function LogicItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
