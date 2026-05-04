import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLocation, useNavigate } from 'react-router'
import {
  ArrowRight,
  Wrench,
  Briefcase,
  CheckCircle2,
  Circle,
  FileBarChart,
  FolderOpen,
  ListTodo,
  Loader2,
  MessageSquare,
  Send,
  Star,
  User,
  Sparkles,
  Building2,
  ChevronRight,
} from 'lucide-react'
import type { Task, Project } from '@/types'
import { ROLE_DEFAULT_SHELL } from '@/types'
import type { ShellType } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { useMyOrgs } from '@/hooks/useOrg'
import { OnboardingFlow } from '@/components/shared/OnboardingFlow'
import { listTodayTasks, updateTask } from '@/api/tasks'
import { listProjects } from '@/api/projects'
import { createDailyReport } from '@/api/dailyReports'
import {
  createClinicApplication,
  listClinicApplications,
  type ClinicApplication,
  type ClinicApplicationStatus,
} from '@/api/clinicApplications'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { ActivityItem } from '@/components/shared/ActivityItem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════
   PERSONAL DASHBOARD (no org selected)
   ═══════════════════════════════════════════════════ */

function PersonalDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const fullName = useAuthStore((s) => s.fullName)
  const email = useAuthStore((s) => s.email)
  const { orgs, setActiveOrg, activeOrg } = useOrgStore()
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [submittingApplication, setSubmittingApplication] = useState(false)
  const [applications, setApplications] = useState<ClinicApplication[]>([])
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    legal_name: '',
    bin_iin: '',
    address: '',
    contacts: '',
    founder_data: fullName ? `${fullName}${email ? ` · ${email}` : ''}` : '',
    requisites: '',
    license_info: '',
    oked: '',
    activity_description: '',
  })
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('onboarding-dismissed') === 'true',
  )
  const forceCreateOrg = new URLSearchParams(location.search).get('createOrg') === '1'
  const editOrgId = new URLSearchParams(location.search).get('editOrg')
  const selectedOrg = activeOrg()

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true)
    try {
      const { data } = await listClinicApplications()
      setApplications(data)
    } catch {
      setApplications([])
    } finally {
      setApplicationsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadApplications()
  }, [loadApplications])

  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem('onboarding-dismissed', 'true')
    setOnboardingDismissed(true)
    if (forceCreateOrg) {
      navigate('/dashboard', { replace: true })
    }
  }, [forceCreateOrg, navigate])

  if (forceCreateOrg || (orgs.length === 0 && !onboardingDismissed)) {
    return (
      <OnboardingFlow
        onDismiss={handleDismissOnboarding}
        mode={editOrgId ? 'edit' : 'create'}
        editOrgId={editOrgId}
      />
    )
  }

  const quickLinks = [
    { label: t('nav.profile'), description: 'Personal profile & settings', icon: User, to: '/profile', iconClass: 'icon-blue' },
    { label: t('nav.vacancies'), description: 'Job search & career opportunities', icon: Briefcase, to: '/vacancies', iconClass: 'icon-green' },
    { label: t('nav.messenger'), description: 'Messages, channels & discussions', icon: MessageSquare, to: '/messenger', iconClass: 'icon-violet' },
    { label: t('nav.ratings'), description: 'Ratings & internal reputation', icon: Star, to: '/ratings', iconClass: 'icon-amber' },
  ]

  const latestApplication = applications[0] ?? null
  const hasPendingApplication = applications.some((item) =>
    ['submitted', 'in_review', 'needs_changes'].includes(item.status),
  )

  async function handleSubmitClinicApplication() {
    if (
      !applicationForm.name.trim()
      || !applicationForm.legal_name.trim()
      || !applicationForm.bin_iin.trim()
      || !applicationForm.address.trim()
    ) {
      toast.error('Заполните название клиники, юр. лицо, БИН/ИИН и адрес')
      return
    }

    setSubmittingApplication(true)
    try {
      await createClinicApplication({
        ...applicationForm,
        submit: true,
      })
      toast.success('Заявка клиники отправлена на модерацию')
      setApplicationForm((current) => ({
        ...current,
        requisites: '',
        license_info: '',
        oked: '',
        activity_description: '',
      }))
      await loadApplications()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось отправить заявку')
    } finally {
      setSubmittingApplication(false)
    }
  }

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={t('dashboard.welcomeBack')}
        description="Your personal entry point: companies, quick actions, and workspace navigation."
        eyebrow="Personal workspace"
      />

      {/* Welcome banner */}
      <section className="welcome-banner relative overflow-hidden rounded-xl p-6 animate-fade-in-up">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 opacity-30" style={{ background: 'radial-gradient(circle at top right, rgba(59,130,246,0.25), transparent 70%)' }} />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="icon-container icon-container-lg icon-blue rounded-xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Personal mode</p>
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{fullName ?? t('dashboard.welcome')}</h2>
              <p className="text-[13px] text-text-secondary">Workspace before selecting a company</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-0/60 px-4 py-2.5 text-[13px] backdrop-blur-sm">
            Companies:{' '}
            <span className="font-bold text-foreground">{orgs.length}</span>
          </div>
        </div>
      </section>

      {/* My Companies */}
      <section className="enterprise-card rounded-xl p-5 animate-fade-in-up stagger-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-blue rounded-md">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.myCompanies')}</h3>
              <p className="text-[12px] text-text-tertiary">Select a company to enter its workspace</p>
            </div>
          </div>
        </div>

        {selectedOrg && selectedOrg.isActive === false && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-[12px] font-medium text-amber-300">Компания ожидает модерацию</p>
            <p className="mt-1 text-[12px] text-text-secondary">
              {selectedOrg.moderationStatus === 'revision'
                ? (selectedOrg.moderationComment || 'Компания отправлена на доработку. Исправьте замечания и дождитесь повторного одобрения.')
                : selectedOrg.moderationStatus === 'rejected'
                  ? (selectedOrg.moderationComment || 'Компания отклонена на этапе модерации.')
                  : 'Новая компания создана и ждёт одобрения платформой. Рабочее пространство откроется после модерации.'}
            </p>
            {selectedOrg.moderationStatus === 'revision' && (
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!selectedOrg?.orgId) return
                    setActiveOrg(selectedOrg.orgId)
                    navigate(`/dashboard?createOrg=1&editOrg=${selectedOrg.orgId}`)
                  }}
                >
                  <Wrench className="mr-1.5 h-4 w-4" />
                  Исправить заявку
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {orgs.length === 0 ? (
            <EmptyState icon={Building2} title="No companies" description="Create or join a company to get started." />
          ) : (
            orgs.map((org) => (
              <button
                key={org.orgId}
                onClick={() => setActiveOrg(org.orgId)}
                className="group flex w-full items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-left transition-all hover:border-border-hover hover:bg-surface-hover hover:-translate-y-px hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-[13px] font-bold text-primary">
                    {org.orgName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{org.orgName}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-[11px] capitalize text-text-tertiary">{org.role}</p>
                      {org.isActive === false && (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          {org.moderationStatus === 'revision'
                            ? 'Доработка'
                            : org.moderationStatus === 'rejected'
                              ? 'Отклонена'
                              : 'На модерации'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {org.isActive === false && org.moderationStatus === 'revision' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveOrg(org.orgId)
                        navigate(`/dashboard?createOrg=1&editOrg=${org.orgId}`)
                      }}
                    >
                      <Wrench className="mr-1.5 h-3.5 w-3.5" />
                      Исправить
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-text-quaternary transition-transform group-hover:translate-x-0.5 group-hover:text-text-tertiary" />
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="enterprise-card rounded-xl p-5 animate-fade-in-up stagger-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-green rounded-md">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Заявка на создание клиники</h3>
              <p className="text-[12px] text-text-tertiary">Founder-поток для MVP1: отправка, доработка и ожидание модерации</p>
            </div>
          </div>
          {latestApplication ? (
            <span className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium',
              clinicApplicationStatusBadgeClass(latestApplication.status),
            )}>
              {clinicApplicationStatusLabel(latestApplication.status)}
            </span>
          ) : null}
        </div>

        {latestApplication ? (
          <div className="mb-4 rounded-lg border border-border/60 bg-background/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">{latestApplication.name}</p>
                <p className="mt-1 text-[12px] text-text-tertiary">
                  {latestApplication.legal_name} · {latestApplication.bin_iin}
                </p>
              </div>
              <div className="text-right text-[12px] text-text-tertiary">
                <div>Подана {new Date(latestApplication.created_at).toLocaleDateString('ru-RU')}</div>
                {latestApplication.clinic_id ? <div>Clinic ID: {latestApplication.clinic_id}</div> : null}
              </div>
            </div>
            {latestApplication.moderator_comment ? (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-200">
                {latestApplication.moderator_comment}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-foreground">
              Название клиники
              <Input
                className="mt-1 h-10"
                value={applicationForm.name}
                onChange={(e) => setApplicationForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Amanat Clinic"
                disabled={submittingApplication || hasPendingApplication}
              />
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-foreground">
              Юридическое название
              <Input
                className="mt-1 h-10"
                value={applicationForm.legal_name}
                onChange={(e) => setApplicationForm((current) => ({ ...current, legal_name: e.target.value }))}
                placeholder="Amanat Clinic LLP"
                disabled={submittingApplication || hasPendingApplication}
              />
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-foreground">
              БИН / ИИН
              <Input
                className="mt-1 h-10"
                value={applicationForm.bin_iin}
                onChange={(e) => setApplicationForm((current) => ({ ...current, bin_iin: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                placeholder="12 цифр"
                disabled={submittingApplication || hasPendingApplication}
              />
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-foreground">
              Контакты
              <Input
                className="mt-1 h-10"
                value={applicationForm.contacts}
                onChange={(e) => setApplicationForm((current) => ({ ...current, contacts: e.target.value }))}
                placeholder="+7 700 000 00 00"
                disabled={submittingApplication || hasPendingApplication}
              />
            </label>
          </div>
        </div>

        <label className="mt-3 block text-[12px] font-medium text-foreground">
          Адрес
          <Input
            className="mt-1 h-10"
            value={applicationForm.address}
            onChange={(e) => setApplicationForm((current) => ({ ...current, address: e.target.value }))}
            placeholder="Алматы, Абая 1"
            disabled={submittingApplication || hasPendingApplication}
          />
        </label>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-[12px] font-medium text-foreground">
            Founder / контакты заявителя
            <Textarea
              className="mt-1 min-h-[96px]"
              value={applicationForm.founder_data}
              onChange={(e) => setApplicationForm((current) => ({ ...current, founder_data: e.target.value }))}
              placeholder="ФИО, доля, контакты"
              disabled={submittingApplication || hasPendingApplication}
            />
          </label>
          <label className="block text-[12px] font-medium text-foreground">
            Описание деятельности
            <Textarea
              className="mt-1 min-h-[96px]"
              value={applicationForm.activity_description}
              onChange={(e) => setApplicationForm((current) => ({ ...current, activity_description: e.target.value }))}
              placeholder="Амбулаторный прием, диагностика, дневной стационар..."
              disabled={submittingApplication || hasPendingApplication}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block text-[12px] font-medium text-foreground">
            Реквизиты
            <Input
              className="mt-1 h-10"
              value={applicationForm.requisites}
              onChange={(e) => setApplicationForm((current) => ({ ...current, requisites: e.target.value }))}
              placeholder="KZ..."
              disabled={submittingApplication || hasPendingApplication}
            />
          </label>
          <label className="block text-[12px] font-medium text-foreground">
            Лицензия
            <Input
              className="mt-1 h-10"
              value={applicationForm.license_info}
              onChange={(e) => setApplicationForm((current) => ({ ...current, license_info: e.target.value }))}
              placeholder="№ лицензии"
              disabled={submittingApplication || hasPendingApplication}
            />
          </label>
          <label className="block text-[12px] font-medium text-foreground">
            ОКЭД
            <Input
              className="mt-1 h-10"
              value={applicationForm.oked}
              onChange={(e) => setApplicationForm((current) => ({ ...current, oked: e.target.value }))}
              placeholder="86210"
              disabled={submittingApplication || hasPendingApplication}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleSubmitClinicApplication()} disabled={submittingApplication || hasPendingApplication}>
            {submittingApplication ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Отправить заявку
          </Button>
          {applicationsLoading ? (
            <span className="text-[12px] text-text-tertiary">Обновляем статус...</span>
          ) : hasPendingApplication ? (
            <span className="text-[12px] text-amber-300">Пока одна заявка находится на модерации, новую отправлять не нужно.</span>
          ) : (
            <span className="text-[12px] text-text-tertiary">После одобрения клиника появится в рабочем контексте founder.</span>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="enterprise-card rounded-xl p-5 animate-fade-in-up stagger-3">
        <div className="mb-4 flex items-center gap-3">
          <div className="icon-container icon-container-sm icon-violet rounded-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.quickActions')}</h3>
            <p className="text-[12px] text-text-tertiary">Additional workspace links</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className="enterprise-card-interactive rounded-lg p-4 text-left"
            >
              <div className={cn('icon-container icon-container-sm rounded-md', link.iconClass)}>
                <link.icon className="h-4 w-4" />
              </div>
              <div className="mt-3">
                <p className="text-[13px] font-medium text-foreground">{link.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-tertiary">{link.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function clinicApplicationStatusLabel(status: ClinicApplicationStatus) {
  switch (status) {
    case 'submitted':
      return 'Отправлена'
    case 'in_review':
      return 'На проверке'
    case 'needs_changes':
      return 'Нужны правки'
    case 'approved':
      return 'Одобрена'
    case 'rejected':
      return 'Отклонена'
    case 'blocked':
      return 'Заблокирована'
    default:
      return 'Черновик'
  }
}

function clinicApplicationStatusBadgeClass(status: ClinicApplicationStatus) {
  switch (status) {
    case 'approved':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    case 'rejected':
    case 'blocked':
      return 'border-red-500/20 bg-red-500/10 text-red-300'
    case 'needs_changes':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-300'
    case 'submitted':
    case 'in_review':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
    default:
      return 'border-border bg-card text-muted-foreground'
  }
}

/* ═══════════════════════════════════════════════════
   ORG DASHBOARD (org selected)
   ═══════════════════════════════════════════════════ */

function OrgDashboard() {
  const { t } = useTranslation()
  const { activeOrgId, activeOrg } = useOrgStore()
  const orgId = activeOrgId!
  const current = activeOrg()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [sendingReport, setSendingReport] = useState(false)

  useEffect(() => {
    setLoadingTasks(true)
    listTodayTasks(orgId)
      .then(({ data }) => setTasks(data))
      .catch(() => toast.error(t('dashboard.failedLoadTasks')))
      .finally(() => setLoadingTasks(false))

    listProjects(orgId)
      .then(({ data }) => setProjects(data))
      .catch(() => {})
  }, [orgId, t])

  const completed = tasks.filter((task) => task.status === 'done' || task.status === 'completed').length

  async function handleToggleTask(taskId: string) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    const nextStatus = task.status === 'done' || task.status === 'completed' ? 'todo' : 'done'

    setTasks((currentTasks) => currentTasks.map((item) => (
      item.id === taskId ? { ...item, status: nextStatus } : item
    )))

    try {
      await updateTask(orgId, taskId, { status: nextStatus })
    } catch {
      setTasks((currentTasks) => currentTasks.map((item) => (
        item.id === taskId ? { ...item, status: task.status } : item
      )))
      toast.error('Не удалось обновить статус задачи')
    }
  }

  async function handleSendReport() {
    if (!selectedProject || !reportContent.trim()) return
    setSendingReport(true)
    try {
      await createDailyReport(orgId, { project_id: selectedProject, content: reportContent.trim() })
      toast.success(t('dashboard.reportSent'))
      setReportContent('')
    } catch {
      toast.error(t('dashboard.failedSendReport'))
    } finally {
      setSendingReport(false)
    }
  }

  const quickActions = [
    { label: t('dashboard.viewReports'), description: 'Reports, analytics & exports', icon: FileBarChart, to: '/reports', iconClass: 'icon-blue' },
    { label: t('dashboard.viewProfile'), description: 'Personal profile & settings', icon: User, to: '/profile', iconClass: 'icon-violet' },
  ]

  const activity = useMemo(
    () => [
      { actor: { name: current?.orgName ?? 'Org workspace' }, action: 'compiled summary', target: `${tasks.length} tasks`, timestamp: 'Today' },
      { actor: { name: 'Project workspace' }, action: 'updated project pool', target: `${projects.length} projects`, timestamp: 'Today' },
      { actor: { name: 'Daily reports' }, action: 'awaiting report', target: selectedProject ? 'Project selected' : 'No project selected', timestamp: 'Now' },
    ],
    [current?.orgName, projects.length, selectedProject, tasks.length],
  )

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={current?.orgName ?? t('dashboard.organization')}
        description="Task summary, projects, and daily reporting."
        eyebrow="Organization"
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={ListTodo} label={t('dashboard.totalTasks')} value={tasks.length} color="blue" delay={0.03} />
        <StatCard icon={CheckCircle2} label={t('dashboard.completedToday')} value={completed} color="green" delay={0.06} />
        <StatCard icon={FolderOpen} label={t('dashboard.activeProjects')} value={projects.length} color="violet" delay={0.09} />
      </div>

      {/* Tasks + Daily report */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-blue rounded-md">
              <ListTodo className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.todayTasks')}</h3>
              <p className="text-[12px] text-text-tertiary">Daily operational tasks</p>
            </div>
          </div>

          {loadingTasks ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState icon={ListTodo} title={t('dashboard.noTasks')} description="Today's tasks will appear here." />
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <div key={task.id} className="group flex items-start gap-3 rounded-lg border border-border/50 px-4 py-3 transition-all hover:bg-surface-hover hover:border-border-hover">
                  <button
                    type="button"
                    onClick={() => void handleToggleTask(task.id)}
                    className="mt-0.5 flex-shrink-0 rounded-md transition-opacity hover:opacity-80"
                    aria-label={task.status === 'done' || task.status === 'completed' ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
                    title={task.status === 'done' || task.status === 'completed' ? 'Снять отметку выполнения' : 'Отметить выполненной'}
                  >
                    {task.status === 'done' || task.status === 'completed'
                      ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[13px] font-medium text-foreground', (task.status === 'done' || task.status === 'completed') && 'line-through text-muted-foreground')}>
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-tertiary line-clamp-1">{task.description || 'No description'}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-amber rounded-md">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.dailyReport')}</h3>
              <p className="text-[12px] text-text-tertiary">Submit daily project report</p>
            </div>
          </div>

          <div className="space-y-3">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-0 px-3 text-[13px] text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            >
              <option value="">{t('dashboard.selectProject')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <textarea
              rows={4}
              placeholder={t('dashboard.whatWasDoneToday')}
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-0 px-3 py-2.5 text-[13px] text-foreground placeholder:text-text-tertiary focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none transition-all"
            />
            <Button onClick={handleSendReport} disabled={sendingReport || !selectedProject} className="w-full">
              {sendingReport ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              {sendingReport ? t('dashboard.sending') : t('dashboard.sendReport')}
            </Button>
          </div>
        </section>
      </div>

      {/* Quick actions + Activity */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-violet rounded-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.quickActions')}</h3>
              <p className="text-[12px] text-text-tertiary">Supplementary sections</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="enterprise-card-interactive rounded-lg p-4 text-left"
              >
                <div className={cn('icon-container icon-container-sm rounded-md', action.iconClass)}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <p className="text-[13px] font-medium text-foreground">{action.label}</p>
                  <p className="mt-1 text-[11px] text-text-tertiary">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-green rounded-md">
              <FileBarChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Recent activity</h3>
              <p className="text-[12px] text-text-tertiary">Latest events</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {activity.map((item, index) => (
              <ActivityItem
                key={`${item.target}-${index}`}
                actor={item.actor}
                action={item.action}
                target={item.target}
                timestamp={item.timestamp}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════ */

export default function DashboardPage() {
  const location = useLocation()
  const { activeOrgId, activeOrg } = useOrgStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  useMyOrgs()
  const current = activeOrg()
  const hasInactiveSelectedOrg = !!current && current.isActive === false
  const forceCreateOrg = new URLSearchParams(location.search).get('createOrg') === '1'

  if (!forceCreateOrg && ((activeOrgId && !hasInactiveSelectedOrg) || isSuperAdmin || platformRole)) {
    return <RoleRedirectDashboard />
  }

  return <PersonalDashboard />
}

/* ═══════════════════════════════════════════════════
   ROLE REDIRECT
   ═══════════════════════════════════════════════════ */

const SHELL_ROUTES: Record<ShellType, string> = {
  platform: '/platform',
  company: '/company',
  department: '/department',
}

function RoleRedirectDashboard() {
  const { activeOrg } = useOrgStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const navigate = useNavigate()
  const { setShell } = useContextStore()

  useEffect(() => {
    const current = activeOrg()

    if (!current) {
      if (isSuperAdmin || platformRole) {
        setShell('platform')
        navigate('/platform', { replace: true })
      }
      return
    }

    if (current.isActive === false) {
      navigate('/dashboard', { replace: true })
      return
    }

    const targetShell = ROLE_DEFAULT_SHELL[current.role]
    setShell(targetShell)
    navigate(SHELL_ROUTES[targetShell] || '/company', { replace: true })
  }, [activeOrg, isSuperAdmin, platformRole, navigate, setShell])

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
}
