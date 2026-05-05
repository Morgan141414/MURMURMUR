import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  MonitorCog,
  Palette,
  Shield,
  SunMedium,
  UserRound,
  XCircle,
  Paperclip,
  FileText,
  Upload,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getNotificationPreferences, updateNotificationPreferences } from '@/api/users'
import { registerPush, unregisterPush } from '@/api/push'
import api from '@/api/client'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { useOrgStore } from '@/stores/orgStore'
import { useUiStore } from '@/stores/uiStore'
import { useOrg } from '@/hooks/useOrg'
import { listSupportThreads, createSupportThread, type SupportThread } from '@/api/support'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { AvatarImage } from '@/components/shared/AvatarImage'

type SettingsSectionId = 'account' | 'appearance' | 'notifications' | 'security' | 'workspace'

const PROFILE_CHANGE_REQUIRED_DOCUMENT = {
  label: 'Документ-основание на изменение данных компании',
  hint: 'Без него тех. поддержка не сможет применить изменения.',
} as const

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const fullName = useAuthStore((s) => s.fullName)
  const email = useAuthStore((s) => s.email)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const clearOrg = useOrgStore((s) => s.clear)
  const isDark = useUiStore((s) => s.theme === 'dark')
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const { data: orgDetail } = useOrg(orgId)

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if ('PushManager' in window) {
      navigator.serviceWorker?.getRegistration('/sw-push.js').then(reg => {
        reg?.pushManager?.getSubscription().then(sub => {
          setPushEnabled(!!sub)
        })
      })
    }
  }, [])

  const handleTogglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await unregisterPush()
        setPushEnabled(false)
        toast.success('Push-уведомления отключены')
      } else {
        const ok = await registerPush()
        setPushEnabled(ok)
        if (ok) toast.success('Push-уведомления включены')
        else toast.error('Не удалось подключить push-уведомления')
      }
    } catch {
      toast.error('Ошибка при настройке push')
    } finally {
      setPushLoading(false)
    }
  }

  const [emailNotifEnabled, setEmailNotifEnabled] = useState(true)
  const [emailNotifLoading, setEmailNotifLoading] = useState(false)

  useEffect(() => {
    getNotificationPreferences()
      .then((r) => setEmailNotifEnabled(r.data.email_notifications_enabled))
      .catch(() => {})
  }, [])

  const handleToggleEmailNotif = async () => {
    setEmailNotifLoading(true)
    try {
      const res = await updateNotificationPreferences(!emailNotifEnabled)
      setEmailNotifEnabled(res.data.email_notifications_enabled)
      toast.success(res.data.email_notifications_enabled ? 'Email-уведомления включены' : 'Email-уведомления отключены')
    } catch {
      toast.error('Не удалось обновить настройки')
    } finally {
      setEmailNotifLoading(false)
    }
  }

  const consent = { accepted: true }
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account')
  const [profileSupportThread, setProfileSupportThread] = useState<SupportThread | null>(null)
  const [profileRequestLoading, setProfileRequestLoading] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null)
  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    logo_url: '',
    theme_color: '',
    welcome_message: '',
  })
  const [userSettings, setUserSettings] = useState({
    timezone: 'UTC',
    default_task_priority: '',
    default_deadline_hours: 24,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)

  const canSubmitOrgChanges = activeRole === 'founder' || activeRole === 'ceo'

  useEffect(() => {
    const stored = localStorage.getItem('user-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUserSettings({
          timezone: parsed.timezone || 'UTC',
          default_task_priority: parsed.default_task_priority || '',
          default_deadline_hours: parsed.default_deadline_hours || 24,
          quiet_hours_enabled: parsed.quiet_hours_enabled || false,
          quiet_hours_start: parsed.quiet_hours_start || '22:00',
          quiet_hours_end: parsed.quiet_hours_end || '08:00',
        })
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!orgDetail) return
    setCompanyForm({
      name: orgDetail.name ?? '',
      description: orgDetail.description ?? '',
      industry: orgDetail.industry ?? '',
      website: orgDetail.website ?? '',
      logo_url: orgDetail.logo_url ?? '',
      theme_color: orgDetail.theme_color ?? '',
      welcome_message: orgDetail.welcome_message ?? '',
    })
  }, [orgDetail])

  useEffect(() => {
    if (!orgId || !canSubmitOrgChanges) {
      setProfileSupportThread(null)
      return
    }
    setProfileRequestLoading(true)
    listSupportThreads(orgId)
      .then((r) => {
        const thread = r.data.find(
          (t) => t.request_type === 'company_profile_change' && t.status !== 'closed',
        ) ?? null
        setProfileSupportThread(thread)
      })
      .catch(() => setProfileSupportThread(null))
      .finally(() => setProfileRequestLoading(false))
  }, [orgId, canSubmitOrgChanges])

  function handleLogout() {
    logout()
    clearOrg()
    navigate('/login')
  }

  function jumpToSection(sectionId: SettingsSectionId) {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function handleSaveUserSettings() {
    setSettingsSaving(true)
    try {
      await api.patch('/users/me', userSettings)
      localStorage.setItem('user-settings', JSON.stringify(userSettings))
      toast.success('Настройки сохранены')
    } catch {
      toast.error('Не удалось сохранить настройки')
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleSubmitOrgProfileChanges() {
    if (!orgId) return
    if (!profileFile) {
      toast.error('Добавьте документ-основание для изменения данных компании')
      return
    }
    setProfileSubmitting(true)
    try {
      const profileChanges = Object.fromEntries(
        Object.entries({
          name: companyForm.name.trim() || undefined,
          description: companyForm.description.trim() || undefined,
          industry: companyForm.industry.trim() || undefined,
          website: companyForm.website.trim() || undefined,
          logo_url: companyForm.logo_url.trim() || undefined,
          theme_color: companyForm.theme_color.trim() || undefined,
          welcome_message: companyForm.welcome_message.trim() || undefined,
        }).filter(([, v]) => v !== undefined),
      )
      const { data } = await createSupportThread(orgId, {
        subject: `Изменение данных компании${org?.orgName ? ` — ${org.orgName}` : ''}`,
        body: 'Запрос на изменение данных компании. Подробности в прикреплённом документе.',
        request_type: 'company_profile_change',
        request_meta: {
          profile_changes: profileChanges,
          logo_file_attached: !!companyLogoFile,
        },
        files: companyLogoFile ? [profileFile, companyLogoFile] : [profileFile],
      })
      setProfileSupportThread(data)
      setProfileFile(null)
      setCompanyLogoFile(null)
      toast.success('Запрос на изменение отправлен в тех. поддержку')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить запрос')
    } finally {
      setProfileSubmitting(false)
    }
  }

  const sections: Array<{
    id: SettingsSectionId
    icon: typeof UserRound
    title: string
    description: string
  }> = [
    {
      id: 'account',
      icon: UserRound,
      title: t('settings.accountTitle', 'Аккаунт'),
      description: t('settings.accountDesc', 'Профиль, организация и язык'),
    },
    {
      id: 'appearance',
      icon: Palette,
      title: t('settings.appearance'),
      description: t('settings.appearanceDesc', 'Тема и визуальный стиль'),
    },
    {
      id: 'notifications',
      icon: Bell,
      title: t('settings.notificationsTitle', 'Уведомления'),
      description: t('settings.notificationsDesc', 'Что и когда получать'),
    },
    {
      id: 'security',
      icon: Shield,
      title: t('settings.security'),
      description: t('settings.securityDesc', 'Доступ и согласие'),
    },
    {
      id: 'workspace',
      icon: MonitorCog,
      title: t('settings.workspaceTitle', 'Рабочее пространство'),
      description: t('settings.workspaceDesc', 'Навигация и поведение'),
    },
  ]

  return (
    <div className="page-enter mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
        eyebrow={t('settings.configuration', 'Конфигурация')}
        breadcrumbs={
          org
            ? [{ label: org.orgName, to: '/company' }, { label: t('settings.title') }]
            : [{ label: t('settings.title') }]
        }
      />

      <section className="relative overflow-hidden rounded-[20px] border border-border bg-card p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.2),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,166,242,0.14),transparent_30%),radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_36%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="flex items-start gap-4">
            <ProfileAvatar fullName={fullName} avatarUrl={avatarUrl} />
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t('settings.personalSpace', 'Личное пространство')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {fullName || t('settings.profileFallback', 'Ваш профиль')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {email || t('settings.emailFallback', 'Электронная почта не указана')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ProfileChip
                  icon={Building2}
                  label={org?.orgName || t('settings.personalMode', 'Личный режим')}
                />
                <ProfileChip
                  icon={Globe}
                  label={t('settings.localeValue', 'Русский • Казахстан')}
                />
                <ProfileChip
                  icon={isDark ? Palette : SunMedium}
                  label={isDark ? t('sidebar.darkMode') : t('sidebar.lightMode')}
                />
              </div>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {t(
                  'settings.heroDescription',
                  'Настройки теперь собраны как живой личный кабинет: быстрее ориентироваться, проще менять ключевые параметры и понятнее видеть, что происходит с аккаунтом и организацией.',
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <CompactMetric
              title={t('settings.themeCard', 'Тема')}
              value={isDark ? t('sidebar.darkMode') : t('sidebar.lightMode')}
              hint={t('settings.themeHint', 'Меняется мгновенно')}
            />
            <CompactMetric
              title={t('settings.organizationCard', 'Организация')}
              value={org ? org.orgName : t('settings.personalMode', 'Личный режим')}
              hint={org ? t('settings.orgConnected', 'Контекст активен') : t('settings.orgMissing', 'Без workspace')}
            />
            <CompactMetric
              title={t('settings.securityCard', 'Согласие')}
              value={
                !orgId
                  ? t('settings.notAvailable', 'Недоступно')
                  : consent?.accepted
                    ? t('settings.active')
                    : t('settings.pending', 'Ожидает')
              }
              hint={t('settings.securityHint', 'Статус для текущей организации')}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[28px] border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">
                {t('settings.menuTitle', 'Настройки аккаунта')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('settings.menuSubtitle', 'Как в хорошем consumer-продукте: быстро и по разделам')}
              </p>
            </div>
            <div className="space-y-1 p-3">
              {sections.map((section) => (
                <SidebarSection
                  key={section.id}
                  icon={section.icon}
                  title={section.title}
                  description={section.description}
                  active={activeSection === section.id}
                  onClick={() => jumpToSection(section.id)}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <SettingsSection
            id="account"
            icon={UserRound}
            title={t('settings.accountTitle', 'Аккаунт')}
            description={t('settings.accountSectionDesc', 'Основная информация о профиле, организации и регионе.')}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <PreferenceCard
                eyebrow={t('settings.profileCard', 'Профиль')}
                title={fullName || t('settings.profileFallback', 'Пользователь')}
                description={email || t('settings.emailFallback', 'Почта пока не указана')}
                action={
                  <Button variant="outline" onClick={() => navigate('/profile/settings')}>
                    {t('settings.openProfile', 'Открыть профиль')}
                  </Button>
                }
              />
              <PreferenceCard
                eyebrow={t('settings.workspaceCard', 'Организация')}
                title={org?.orgName || t('settings.personalMode', 'Личный режим')}
                description={
                  org
                    ? t('settings.workspaceConnected', 'Активное рабочее пространство подключено')
                    : t('settings.workspaceNotConnected', 'Организация не выбрана')
                }
                action={
                  <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {org?.role || t('settings.noRole', 'Без роли')}
                  </span>
                }
              />
              <PreferenceCard
                eyebrow={t('settings.languageCard', 'Язык')}
                title={t('settings.localeValue', 'Русский • Казахстан')}
                description={t('settings.languageDesc', 'Подготовлено для локализации интерфейса и форматов данных')}
                action={<StatusBadge>{t('settings.defaultOption', 'По умолчанию')}</StatusBadge>}
              />
              <PreferenceCard
                eyebrow={t('settings.sessionCard', 'Сессия')}
                title={t('settings.sessionStatus', 'Аккаунт активен')}
                description={t('settings.sessionDesc', 'Текущая сессия сохранена на этом устройстве')}
                action={
                  <button
                    type="button"
                    onClick={() => jumpToSection('security')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    {t('settings.reviewSecurity', 'Проверить безопасность')}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            id="appearance"
            icon={Palette}
            title={t('settings.appearance')}
            description={t('settings.appearanceSectionDesc', 'Визуальный стиль, тема и ощущение интерфейса.')}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_0.85fr]">
              <div className="rounded-[24px] border border-border bg-background p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('settings.currentTheme', 'Текущая тема')}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        'settings.themeSectionMood',
                        'Светлая и тёмная тема переключаются без перезагрузки, чтобы страница ощущалась как персональный social-style кабинет.',
                      )}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {isDark ? t('sidebar.darkMode') : t('sidebar.lightMode')}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ThemePreview
                    active={!isDark}
                    title={t('sidebar.lightMode')}
                    description={t('settings.lightThemeDesc', 'Чистый и воздушный сценарий для дневной работы')}
                    onClick={() => isDark && toggleTheme()}
                  />
                  <ThemePreview
                    active={isDark}
                    title={t('sidebar.darkMode')}
                    description={t('settings.darkThemeDesc', 'Контрастный режим для фокуса и вечерних сессий')}
                    onClick={() => !isDark && toggleTheme()}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <PreferenceCard
                  eyebrow={t('settings.interfaceTone', 'Стиль интерфейса')}
                  title={t('settings.interfaceToneValue', 'Мягкий, карточный, личный')}
                  description={t('settings.interfaceToneDesc', 'Более живой визуальный ритм вместо сухой админской панели')}
                  action={<StatusBadge>{t('settings.applied', 'Применено')}</StatusBadge>}
                />
                <PreferenceCard
                  eyebrow={t('settings.navDensity', 'Плотность навигации')}
                  title={t('settings.standard', 'Стандарт')}
                  description={t('settings.navDensityDesc', 'Комфортная плотность для долгой ежедневной работы')}
                  action={<StatusBadge>{t('settings.recommended', 'Рекомендуется')}</StatusBadge>}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="notifications"
            icon={Bell}
            title={t('settings.notificationsTitle', 'Уведомления')}
            description={t('settings.notificationsSectionDesc', 'Ключевые сигналы без шума и перегрузки.')}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <PreferenceCard
                eyebrow={t('settings.workflowsCard', 'Workflow')}
                title={t('settings.approvalAlerts', 'Оповещения о согласованиях')}
                description={t('settings.approvalAlertsDesc', 'Сообщать о новых запросах на согласование и о критичных изменениях статуса')}
                action={<StatusBadge>{t('settings.enabled', 'Включено')}</StatusBadge>}
              />
              <PreferenceCard
                eyebrow={t('settings.digestCard', 'Сводки')}
                title={t('settings.projectDigest', 'Сводка по проекту')}
                description={t('settings.projectDigestDesc', 'Дневной digest по задачам, рискам и просроченным элементам')}
                action={<StatusBadge>{t('settings.daily', 'Ежедневно')}</StatusBadge>}
              />
              <PreferenceCard
                eyebrow={t('settings.recruitmentCard', 'Recruitment')}
                title={t('settings.recruitmentAlerts', 'Сигналы по вакансиям и откликам')}
                description={t('settings.recruitmentAlertsDesc', 'Ускоряет реакцию на новых кандидатов и узкие места в pipeline')}
                action={<StatusBadge>{t('settings.priorityOnly', 'Только важное')}</StatusBadge>}
              />
              <PreferenceCard
                eyebrow={t('settings.personalCard', 'Личное')}
                title={t('settings.focusMode', 'Спокойный режим')}
                description={t('settings.focusModeDesc', 'Оставляет только события, которые действительно требуют действия')}
                action={<StatusBadge>{t('settings.curated', 'Отобрано')}</StatusBadge>}
              />
            </div>

            <div className="mt-6 rounded-[24px] border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Email-уведомления</p>
                    <p className="text-sm text-muted-foreground">
                      Дублировать важные уведомления на вашу почту
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleEmailNotif}
                  disabled={emailNotifLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    emailNotifEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      emailNotifEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Push-уведомления</p>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления в браузере, даже когда вкладка неактивна
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTogglePush}
                  disabled={pushLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    pushEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      pushEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Moon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Тихие часы</p>
                    <p className="text-sm text-muted-foreground">
                      Отключить все уведомления в указанное время
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUserSettings(s => ({ ...s, quiet_hours_enabled: !s.quiet_hours_enabled }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    userSettings.quiet_hours_enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      userSettings.quiet_hours_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

                {userSettings.quiet_hours_enabled && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <FormField label="Начало">
                      <select
                        value={userSettings.quiet_hours_start}
                        onChange={(e) => setUserSettings(s => ({ ...s, quiet_hours_start: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={`${String(i).padStart(2, '0')}:00`}>
                            {`${String(i).padStart(2, '0')}:00`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Конец">
                      <select
                        value={userSettings.quiet_hours_end}
                        onChange={(e) => setUserSettings(s => ({ ...s, quiet_hours_end: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={`${String(i).padStart(2, '0')}:00`}>
                            {`${String(i).padStart(2, '0')}:00`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                )}
            </div>
          </SettingsSection>

          <SettingsSection
            id="security"
            icon={Shield}
            title={t('settings.security')}
            description={t('settings.consentSectionDesc', 'Доступ, согласие и статус защиты для текущей организации.')}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]">
              <div className="rounded-[24px] border border-border bg-background p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('settings.consent', 'Согласие')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.securityCaption', 'Статус соответствия для активной организации')}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  {!orgId ? (
                    <InlineAlert
                      icon={AlertTriangle}
                      tone="warning"
                      title={t('settings.noOrganization', 'Организация не выбрана')}
                      description={t('settings.joinOrgForConsent')}
                    />
                  ) : (
                    <InlineAlert
                      icon={CheckCircle2}
                      tone="success"
                      title={t('settings.consentActive')}
                      description={t('settings.consentAccepted')}
                      badge={t('settings.active')}
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <PreferenceCard
                  eyebrow={t('settings.accessCard', 'Доступ')}
                  title={org?.role || t('settings.noRole', 'Без роли')}
                  description={t('settings.accessDesc', 'Текущая роль определяет доступ к HR, финансам и recruiting-модулям')}
                  action={<StatusBadge>{t('settings.viewAccess', 'Прозрачно')}</StatusBadge>}
                />
                <PreferenceCard
                  eyebrow={t('settings.integrityCard', 'Статус')}
                  title={t('settings.integrityValue', 'Контрольная точка безопасности')}
                  description={t('settings.integrityDesc', 'Выход, согласие и организационный контекст собраны в одной понятной зоне')}
                  action={<StatusBadge>{t('settings.ok', 'OK')}</StatusBadge>}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="workspace"
            icon={MonitorCog}
            title={t('settings.workspaceTitle', 'Рабочее пространство')}
            description={t('settings.workspaceSectionDesc', 'Как ведёт себя система в ежедневной работе.')}
          >
            <div className="space-y-6">
              <div className="rounded-[16px] border border-border bg-background p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Личные настройки</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Часовой пояс">
                    <select
                      value={userSettings.timezone}
                      onChange={(e) => setUserSettings(s => ({ ...s, timezone: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Europe/Moscow">Москва (UTC+3)</option>
                      <option value="Asia/Almaty">Алматы (UTC+6)</option>
                      <option value="Asia/Tashkent">Ташкент (UTC+5)</option>
                      <option value="Asia/Dubai">Дубай (UTC+4)</option>
                      <option value="Asia/Shanghai">Пекин (UTC+8)</option>
                      <option value="Europe/London">Лондон (UTC+0)</option>
                      <option value="Europe/Berlin">Берлин (UTC+1)</option>
                      <option value="America/New_York">Нью-Йорк (UTC-5)</option>
                    </select>
                  </FormField>
                </div>
              </div>

              <div className="rounded-[16px] border border-border bg-background p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Настройки задач</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Приоритет по умолчанию">
                    <select
                      value={userSettings.default_task_priority}
                      onChange={(e) => setUserSettings(s => ({ ...s, default_task_priority: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    >
                      <option value="">Без приоритета</option>
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                      <option value="critical">Критический</option>
                    </select>
                  </FormField>

                  <FormField label="Дедлайн по умолчанию (часов)">
                    <select
                      value={userSettings.default_deadline_hours}
                      onChange={(e) => setUserSettings(s => ({ ...s, default_deadline_hours: parseInt(e.target.value) }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    >
                      <option value="1">1 час</option>
                      <option value="4">4 часа</option>
                      <option value="8">8 часов (1 день)</option>
                      <option value="24">24 часа</option>
                      <option value="48">48 часов (2 дня)</option>
                      <option value="72">72 часа (3 дня)</option>
                      <option value="168">7 дней</option>
                    </select>
                  </FormField>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveUserSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
              </div>
            </div>

            {canSubmitOrgChanges && orgId && (
              <div className="mt-4 rounded-[24px] border border-border bg-background p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Изменение данных компании</p>
                    <p className="mt-3 text-base font-semibold text-foreground">Запрос в тех. поддержку</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Основатель может отправить изменения названия, описания, сайта и визуальных настроек компании. Запрос уйдёт в тех. поддержку на подтверждение.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {profileRequestLoading ? 'Загрузка...' : profileSupportThread?.status === 'open' ? 'На рассмотрении' : profileSupportThread?.status === 'answered' ? 'Ответ получен' : profileSupportThread?.status === 'closed' ? 'Выполнено' : 'Черновик'}
                  </span>
                </div>

                {profileSupportThread?.status === 'answered' && (
                  <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
                    Тех. поддержка ответила на ваш запрос. Перейдите в раздел «Тех. поддержка», чтобы посмотреть ответ.
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10">
                      <FileText className="h-4 w-4 text-sky-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{PROFILE_CHANGE_REQUIRED_DOCUMENT.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{PROFILE_CHANGE_REQUIRED_DOCUMENT.hint}</p>
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                        <Paperclip className="h-4 w-4 text-primary" />
                        Добавить документ
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setProfileFile(file)
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <div className="mt-3 space-y-2">
                        {profileFile ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{profileFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {PROFILE_CHANGE_REQUIRED_DOCUMENT.label} · {(profileFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProfileFile(null)}
                              className="text-xs font-medium text-red-500 transition-colors hover:text-red-400"
                            >
                              Удалить
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600">Документ ещё не приложен. Без него запрос не отправится.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <SettingsInput label="Название компании" value={companyForm.name} onChange={(value) => setCompanyForm((prev) => ({ ...prev, name: value }))} />
                  <SettingsInput label="Отрасль" value={companyForm.industry} onChange={(value) => setCompanyForm((prev) => ({ ...prev, industry: value }))} />
                  <SettingsInput label="Сайт" value={companyForm.website} onChange={(value) => setCompanyForm((prev) => ({ ...prev, website: value }))} />
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <p className="text-xs font-medium text-muted-foreground">Логотип компании</p>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      {companyLogoFile ? 'Выбрать другой файл' : 'Выбрать фото из галереи'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const next = e.target.files?.[0] ?? null
                          setCompanyLogoFile(next)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {companyLogoFile
                        ? `${companyLogoFile.name} · ${(companyLogoFile.size / 1024 / 1024).toFixed(2)} MB`
                        : 'Если добавите фото, оно уйдёт в тех. поддержку вместе с запросом.'}
                    </div>
                  </div>
                  <SettingsInput label="Цвет темы" value={companyForm.theme_color} onChange={(value) => setCompanyForm((prev) => ({ ...prev, theme_color: value }))} />
                  <div className="lg:col-span-2">
                    <SettingsInput label="Описание" value={companyForm.description} onChange={(value) => setCompanyForm((prev) => ({ ...prev, description: value }))} multiline />
                  </div>
                  <div className="lg:col-span-2">
                    <SettingsInput label="Приветственное сообщение" value={companyForm.welcome_message} onChange={(value) => setCompanyForm((prev) => ({ ...prev, welcome_message: value }))} multiline />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={handleSubmitOrgProfileChanges} disabled={profileSubmitting}>
                    {profileSubmitting ? 'Отправка...' : profileSupportThread ? 'Обновить запрос' : 'Отправить в тех. поддержку'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCompanyLogoFile(null)
                      if (!orgDetail) return
                      setCompanyForm({
                        name: orgDetail.name ?? '',
                        description: orgDetail.description ?? '',
                        industry: orgDetail.industry ?? '',
                        website: orgDetail.website ?? '',
                        logo_url: orgDetail.logo_url ?? '',
                        theme_color: orgDetail.theme_color ?? '',
                        welcome_message: orgDetail.welcome_message ?? '',
                      })
                    }}
                  >
                    Сбросить
                  </Button>
                </div>
              </div>
            )}
          </SettingsSection>

          <SettingsSection
            id="logout"
            icon={LogOut}
            title={t('settings.logoutTitle')}
            description={t('settings.logoutSubtitle')}
          >
            <div className="rounded-[24px] border border-destructive/20 bg-card p-5">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {t('settings.logoutWarning')}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="destructive" onClick={handleLogout}>
                  {t('settings.logoutButton')}
                </Button>
                <Button variant="outline" onClick={() => jumpToSection('account')}>
                  {t('settings.backToTop', 'Вернуться к профилю')}
                </Button>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string
  icon: typeof UserRound
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[28px] border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function SidebarSection({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: typeof UserRound
  title: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-[0_14px_34px_-24px_rgba(37,99,235,0.8)]'
          : 'text-foreground hover:bg-accent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-white/15' : 'bg-primary/10'}`}>
          <Icon className={`h-4 w-4 ${active ? 'text-primary-foreground' : 'text-primary'}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{title}</p>
          <p className={`mt-1 text-xs leading-5 ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}

function PreferenceCard({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-border bg-background p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  )
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function SettingsInput({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      )}
    </label>
  )
}

function ProfileAvatar({
  fullName,
  avatarUrl,
}: {
  fullName: string | null
  avatarUrl: string | null
}) {
  const initials = (fullName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  if (avatarUrl) {
    return (
      <AvatarImage
        src={avatarUrl}
        name={fullName}
        alt={fullName || 'Avatar'}
        className="h-20 w-20 rounded-[28px] object-cover ring-1 ring-border"
        fallbackClassName="rounded-[28px] text-lg"
      />
    )
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,rgba(244,114,182,0.16),rgba(251,191,36,0.18),rgba(59,130,246,0.16))] text-lg font-semibold text-foreground ring-1 ring-border">
      {initials}
    </div>
  )
}

function ProfileChip({
  icon: Icon,
  label,
}: {
  icon: typeof UserRound
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </div>
  )
}

function CompactMetric({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-[24px] border border-border bg-background/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function ThemePreview({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-left transition-all ${
        active
          ? 'border-primary bg-primary/5 shadow-[0_12px_40px_-28px_rgba(37,99,235,0.8)]'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <div className={`mb-4 h-24 rounded-[18px] border ${
        active ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(37,99,235,0.1),rgba(244,114,182,0.08),rgba(251,191,36,0.12))]' : 'border-border bg-background'
      }`} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {active ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Активна
          </span>
        ) : null}
      </div>
    </button>
  )
}

function InlineAlert({
  icon: Icon,
  tone,
  title,
  description,
  badge,
}: {
  icon: typeof AlertTriangle
  tone: 'warning' | 'success' | 'pending'
  title: string
  description: string
  badge?: string
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
      : tone === 'warning'
        ? 'border-amber-500/20 bg-amber-500/[0.05]'
        : 'border-border bg-muted/25'
  const iconClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'warning'
        ? 'text-amber-600'
        : 'text-amber-600'

  return (
    <div className={`flex items-start justify-between gap-4 rounded-[20px] border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {badge ? (
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </div>
  )
}
