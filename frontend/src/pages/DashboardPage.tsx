import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Loader2,
  Send,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react'
import { ROLE_DEFAULT_SHELL } from '@/types'
import type { ShellType } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { useMyOrgs } from '@/hooks/useOrg'
import {
  createClinicApplication,
  listClinicApplications,
  type ClinicApplication,
  type ClinicApplicationStatus,
} from '@/api/clinicApplications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

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
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'rejected':
    case 'blocked':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'needs_changes':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'submitted':
    case 'in_review':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function MedicalActionCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: typeof Stethoscope
  title: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/70"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 min-h-[42px] text-sm leading-6 text-slate-600">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
        {action}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </button>
  )
}

function PersonalDashboard() {
  const navigate = useNavigate()
  const fullName = useAuthStore((s) => s.fullName)
  const email = useAuthStore((s) => s.email)
  const { orgs, setActiveOrg } = useOrgStore()
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
      await createClinicApplication({ ...applicationForm, submit: true })
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
    <div className="page-enter space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 p-6 shadow-xl shadow-cyan-100/60 lg:p-8">
        <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full bg-cyan-200/30 blur-2xl md:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              <HeartPulse className="h-3.5 w-3.5" />
              Saphena M.I.S.
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 lg:text-5xl">
              Медицинский кабинет для клиники, пациентов и приёмов
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Здесь начинается MVP1: подайте заявку на клинику, дождитесь модерации и переходите к пациентам, расписанию, медкартам и документам.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => document.getElementById('clinic-application-form')?.scrollIntoView({ behavior: 'smooth' })}>
                <Send className="mr-2 h-4 w-4" />
                Подать заявку на клинику
              </Button>
              <Button variant="outline" onClick={() => navigate('/company/clinical')}>
                <Stethoscope className="mr-2 h-4 w-4" />
                Открыть клинический контур
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold text-slate-950">Статус подключения</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-cyan-50 px-4 py-3">
                <span className="text-sm text-slate-600">Клиники в профиле</span>
                <span className="text-lg font-bold text-cyan-800">{orgs.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                <span className="text-sm text-slate-600">Заявки на модерации</span>
                <span className="text-lg font-bold text-emerald-800">{applications.length}</span>
              </div>
            </div>
            {latestApplication ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{latestApplication.name}</p>
                  <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', clinicApplicationStatusBadgeClass(latestApplication.status))}>
                    {clinicApplicationStatusLabel(latestApplication.status)}
                  </span>
                </div>
                {latestApplication.moderator_comment ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {latestApplication.moderator_comment}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <MedicalActionCard icon={Building2} title="Подать заявку" description="Создайте карточку клиники и отправьте её на проверку платформы." action="К форме" onClick={() => document.getElementById('clinic-application-form')?.scrollIntoView({ behavior: 'smooth' })} />
        <MedicalActionCard icon={CalendarCheck2} title="Записи и расписание" description="Планируйте приёмы, переносите записи и контролируйте загрузку." action="Открыть" onClick={() => navigate('/company/clinical')} />
        <MedicalActionCard icon={UsersRound} title="Пациенты" description="Ведите прикрепление пациентов к клинике и быстрый поиск по ИИН." action="К пациентам" onClick={() => navigate('/company/clinical')} />
        <MedicalActionCard icon={FileText} title="Медкарта и документы" description="Фиксируйте диагнозы, заключения и готовьте документы по шаблонам." action="Открыть" onClick={() => navigate('/company/clinical')} />
      </section>

      {orgs.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Мои клиники</h2>
              <p className="text-sm text-slate-500">Выберите клинику, чтобы открыть рабочее место врача или администратора.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orgs.map((org) => (
              <button
                key={org.orgId}
                type="button"
                onClick={() => {
                  setActiveOrg(org.orgId)
                  navigate('/company/clinical')
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-white hover:shadow-md"
              >
                <p className="font-semibold text-slate-950">{org.orgName}</p>
                <p className="mt-1 text-sm capitalize text-slate-500">Роль: {org.role}</p>
                {org.isActive === false ? (
                  <span className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    На модерации
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section id="clinic-application-form" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Модерация клиники</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Заявка на создание клиники</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Заполните основные юридические и медицинские данные. После одобрения клиника появится в вашем рабочем контексте.
            </p>
          </div>
          {latestApplication ? (
            <span className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', clinicApplicationStatusBadgeClass(latestApplication.status))}>
              {clinicApplicationStatusLabel(latestApplication.status)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Название клиники
            <Input className="mt-2" value={applicationForm.name} onChange={(e) => setApplicationForm((current) => ({ ...current, name: e.target.value }))} placeholder="Amanat Clinic" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Юридическое название
            <Input className="mt-2" value={applicationForm.legal_name} onChange={(e) => setApplicationForm((current) => ({ ...current, legal_name: e.target.value }))} placeholder="Amanat Clinic LLP" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            БИН / ИИН
            <Input className="mt-2" value={applicationForm.bin_iin} onChange={(e) => setApplicationForm((current) => ({ ...current, bin_iin: e.target.value.replace(/\D/g, '').slice(0, 12) }))} placeholder="12 цифр" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Контакты
            <Input className="mt-2" value={applicationForm.contacts} onChange={(e) => setApplicationForm((current) => ({ ...current, contacts: e.target.value }))} placeholder="+7 700 000 00 00" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
            Адрес
            <Input className="mt-2" value={applicationForm.address} onChange={(e) => setApplicationForm((current) => ({ ...current, address: e.target.value }))} placeholder="Алматы, Абая 1" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Лицензия
            <Input className="mt-2" value={applicationForm.license_info} onChange={(e) => setApplicationForm((current) => ({ ...current, license_info: e.target.value }))} placeholder="№ медицинской лицензии" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            ОКЭД
            <Input className="mt-2" value={applicationForm.oked} onChange={(e) => setApplicationForm((current) => ({ ...current, oked: e.target.value }))} placeholder="86210" disabled={submittingApplication || hasPendingApplication} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
            Описание медицинской деятельности
            <Textarea className="mt-2 min-h-[110px]" value={applicationForm.activity_description} onChange={(e) => setApplicationForm((current) => ({ ...current, activity_description: e.target.value }))} placeholder="Амбулаторный приём, диагностика, лаборатория, дневной стационар..." disabled={submittingApplication || hasPendingApplication} />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleSubmitClinicApplication()} disabled={submittingApplication || hasPendingApplication}>
            {submittingApplication ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Отправить заявку
          </Button>
          {applicationsLoading ? (
            <span className="text-sm text-slate-500">Обновляем статус...</span>
          ) : hasPendingApplication ? (
            <span className="text-sm font-medium text-amber-700">Одна заявка уже находится на модерации.</span>
          ) : (
            <span className="text-sm text-slate-500">Модератор увидит заявку в админ-панели.</span>
          )}
        </div>
      </section>
    </div>
  )
}

function OrgDashboard() {
  const { activeOrg } = useOrgStore()
  const current = activeOrg()
  const navigate = useNavigate()

  return (
    <div className="page-enter space-y-6">
      <section className="rounded-[32px] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 p-6 shadow-xl shadow-cyan-100/60 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Клинический контур</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{current?.orgName ?? 'Клиника'}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Рабочее место клиники: пациенты, записи, расписание, медкарта, документы и контроль действий.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => navigate('/company/clinical')}>
            <Stethoscope className="mr-2 h-4 w-4" />
            Открыть пациентов и записи
          </Button>
          <Button variant="outline" onClick={() => navigate('/company/documents')}>
            <FileText className="mr-2 h-4 w-4" />
            Документы
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <MedicalActionCard icon={UsersRound} title="Пациенты" description="Реестр пациентов, прикрепление к клинике и работа с ИИН." action="Открыть" onClick={() => navigate('/company/clinical')} />
        <MedicalActionCard icon={CalendarCheck2} title="Расписание" description="Приёмы, слоты и статусы визитов в одном клиническом экране." action="Перейти" onClick={() => navigate('/company/clinical')} />
        <MedicalActionCard icon={ClipboardCheck} title="Медкарта" description="Диагнозы, заключения и история осмотров пациента." action="Вести" onClick={() => navigate('/company/clinical')} />
        <MedicalActionCard icon={ShieldCheck} title="Аудит" description="Контроль критичных действий по клинике и сотрудникам." action="Журнал" onClick={() => navigate('/company/audit-log')} />
      </div>
    </div>
  )
}

const SHELL_ROUTES: Record<ShellType, string> = {
  platform: '/platform',
  company: '/company/clinical',
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
    navigate(SHELL_ROUTES[targetShell] || '/company/clinical', { replace: true })
  }, [activeOrg, isSuperAdmin, platformRole, navigate, setShell])

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
}

export default function DashboardPage() {
  const location = useLocation()
  const { activeOrgId, activeOrg } = useOrgStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  useMyOrgs()
  const current = activeOrg()
  const hasInactiveSelectedOrg = !!current && current.isActive === false
  const forceClinicApplication = new URLSearchParams(location.search).get('createOrg') === '1'

  if (!forceClinicApplication && ((activeOrgId && !hasInactiveSelectedOrg) || isSuperAdmin || platformRole)) {
    return activeOrgId && !hasInactiveSelectedOrg ? <OrgDashboard /> : <RoleRedirectDashboard />
  }

  return <PersonalDashboard />
}
