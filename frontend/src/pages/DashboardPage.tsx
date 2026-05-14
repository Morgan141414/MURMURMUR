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
  CalendarClock,
  ClipboardPlus,
  HeartPulse,
} from 'lucide-react'
import type { Task, Project } from '@/types'
import { ROLE_DEFAULT_SHELL } from '@/types'
import type { OrgRole, ShellType } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { useMyOrgs } from '@/hooks/useOrg'
import { OnboardingFlow } from '@/components/shared/OnboardingFlow'
import { listTodayTasks, updateTask } from '@/api/tasks'
import { listProjects } from '@/api/projects'
import { createDailyReport } from '@/api/dailyReports'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { ActivityItem } from '@/components/shared/ActivityItem'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { redirectToClinicCreation } from '@/config/externalLinks'

/* ═══════════════════════════════════════════════════
   PERSONAL DASHBOARD (no org selected)
   ═══════════════════════════════════════════════════ */

function PersonalDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const fullName = useAuthStore((s) => s.fullName)
  const { orgs, setActiveOrg, activeOrg } = useOrgStore()
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('onboarding-dismissed') === 'true',
  )
  const forceCreateOrg = new URLSearchParams(location.search).get('createOrg') === '1'
  const editOrgId = new URLSearchParams(location.search).get('editOrg')

  useEffect(() => {
    if (forceCreateOrg) {
      redirectToClinicCreation()
    }
  }, [forceCreateOrg])
  const selectedOrg = activeOrg()

  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem('onboarding-dismissed', 'true')
    setOnboardingDismissed(true)
    if (forceCreateOrg) {
      navigate('/dashboard', { replace: true })
    }
  }, [forceCreateOrg, navigate])

  if (forceCreateOrg) {
    return null
  }

  if (orgs.length === 0 && !onboardingDismissed) {
    return (
      <OnboardingFlow
        onDismiss={handleDismissOnboarding}
        mode={editOrgId ? 'edit' : 'create'}
        editOrgId={editOrgId}
      />
    )
  }

  const quickLinks = [
    { label: t('nav.profile'), description: 'Профиль, контакты и настройки доступа', icon: User, to: '/profile', iconClass: 'icon-blue' },
    { label: t('nav.vacancies'), description: 'Вакансии и карьерные возможности', icon: Briefcase, to: '/vacancies', iconClass: 'icon-green' },
    { label: t('nav.messenger'), description: 'Сообщения, каналы и обсуждения', icon: MessageSquare, to: '/messenger', iconClass: 'icon-violet' },
    { label: t('nav.ratings'), description: 'Рейтинги и внутренняя репутация', icon: Star, to: '/ratings', iconClass: 'icon-amber' },
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={t('dashboard.welcomeBack')}
        description="Личный вход в систему: клиники, быстрые действия и переходы в рабочие пространства."
        eyebrow="Личное пространство"
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Личный режим</p>
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{fullName ?? t('dashboard.welcome')}</h2>
              <p className="text-[13px] text-text-secondary">Рабочее пространство до выбора клиники</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-0/60 px-4 py-2.5 text-[13px] backdrop-blur-sm">
            Клиники:{' '}
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
              <p className="text-[12px] text-text-tertiary">Выберите клинику, чтобы перейти в рабочее пространство</p>
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
                    redirectToClinicCreation()
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
            <EmptyState icon={Building2} title="Клиник пока нет" description="Создайте клинику или присоединитесь к существующей, чтобы начать работу." />
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
                        redirectToClinicCreation()
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

      {/* Quick actions */}
      <section className="enterprise-card rounded-xl p-5 animate-fade-in-up stagger-3">
        <div className="mb-4 flex items-center gap-3">
          <div className="icon-container icon-container-sm icon-violet rounded-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.quickActions')}</h3>
            <p className="text-[12px] text-text-tertiary">Дополнительные переходы по рабочему пространству</p>
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

/* ═══════════════════════════════════════════════════
   ORG DASHBOARD (org selected)
   ═══════════════════════════════════════════════════ */

function OrgDashboard() {
  const { t } = useTranslation()
  const { activeOrgId, activeOrg, orgs } = useOrgStore()
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg)
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
    { label: 'Клинический кабинет', description: 'Пациенты, записи, расписание и медкарты', icon: HeartPulse, to: '/company/clinical', iconClass: 'icon-green' },
    { label: 'Календарь приёмов', description: 'Быстрый переход к расписанию на сегодня', icon: CalendarClock, to: '/company/clinical#calendar', iconClass: 'icon-blue' },
    { label: 'Документы', description: 'Шаблоны, выпуск и история документов', icon: ClipboardPlus, to: '/company/clinical#clinical-documents', iconClass: 'icon-violet' },
    { label: t('dashboard.viewProfile'), description: 'Профиль и настройки доступа', icon: User, to: '/profile', iconClass: 'icon-amber' },
  ]

  const activity = useMemo(
    () => [
      { actor: { name: current?.orgName ?? 'Клиника' }, action: 'собрала сводку', target: `${tasks.length} задач`, timestamp: 'Сегодня' },
      { actor: { name: 'Клинический кабинет' }, action: 'ожидает проверки', target: 'Расписание и пациенты', timestamp: 'Сейчас' },
      { actor: { name: 'Документы' }, action: 'готовы к выпуску', target: selectedProject ? 'Контекст выбран' : 'Выберите контекст', timestamp: 'Сейчас' },
    ],
    [current?.orgName, projects.length, selectedProject, tasks.length],
  )

  return (
    <div className="page-enter mis-workspace space-y-5">
      <section className="mis-command-panel">
        <div>
          <p className="mis-kicker">QorMed M.I.S.</p>
          <h1>{current?.orgName ?? t('dashboard.organization')}</h1>
          <p>Операционный центр клиники: задачи, расписание, пациенты, документы и контроль действий в одном рабочем месте.</p>
        </div>
        <div className="mis-command-actions">
          <Button onClick={() => navigate('/company/clinical#calendar')}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Открыть календарь
          </Button>
          <Button variant="outline" onClick={() => navigate('/company/clinical#patients')}>
            <User className="mr-2 h-4 w-4" />
            Пациенты
          </Button>
        </div>
      </section>

      {/* Stats */}
      <div className="mis-metric-grid grid gap-3 sm:grid-cols-3">
        <StatCard icon={ListTodo} label={t('dashboard.totalTasks')} value={tasks.length} color="blue" delay={0.03} />
        <StatCard icon={CheckCircle2} label={t('dashboard.completedToday')} value={completed} color="green" delay={0.06} />
        <StatCard icon={FolderOpen} label={t('dashboard.activeProjects')} value={projects.length} color="violet" delay={0.09} />
      </div>

      {/* Tasks + Daily report */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-blue rounded-md">
              <ListTodo className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.todayTasks')}</h3>
              <p className="text-[12px] text-text-tertiary">Критичные задачи клиники на сегодня</p>
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

        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-amber rounded-md">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.dailyReport')}</h3>
              <p className="text-[12px] text-text-tertiary">Короткий отчёт по смене или отделению</p>
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
        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-violet rounded-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('dashboard.quickActions')}</h3>
              <p className="text-[12px] text-text-tertiary">Быстрые клинические маршруты</p>
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

        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-green rounded-md">
              <FileBarChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Журнал смены</h3>
              <p className="text-[12px] text-text-tertiary">Последние операционные события</p>
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
  const { activeOrgId, activeOrg, orgs } = useOrgStore()
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  useMyOrgs()
  const current = activeOrg()
  const hasInactiveSelectedOrg = !!current && current.isActive === false
  const forceCreateOrg = new URLSearchParams(location.search).get('createOrg') === '1'

  useEffect(() => {
    if (activeOrgId) return
    const firstActive = orgs.find((item) => item.isActive !== false)
    if (firstActive) {
      setActiveOrg(firstActive.orgId)
    }
  }, [activeOrgId, orgs, setActiveOrg])

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

const ROLE_HOME_ROUTES: Partial<Record<OrgRole, string>> = {
  founder: '/clinic',
  ceo: '/clinic',
  admin: '/clinic',
  clinic_founder: '/clinic',
  clinic_ceo: '/clinic',
  chief_doctor: '/clinic',
  doctor: '/clinic/visits/visit-1042',
  reception_admin: '/clinic/calendar',
  call_center: '/clinic/calendar',
  accountant: '/clinic/payments',
  patient: '/patient',
  support_agent: '/support',
  sales_director: '/company/crm',
  sales_manager: '/company/crm',
  sales_support: '/company/crm',
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
    navigate(ROLE_HOME_ROUTES[current.role] ?? SHELL_ROUTES[targetShell] ?? '/company', { replace: true })
  }, [activeOrg, isSuperAdmin, platformRole, navigate, setShell])

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
}
