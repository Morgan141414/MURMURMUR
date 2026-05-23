import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Download,
  HeartPulse,
  LayoutDashboard,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { exportToExcel } from '@/lib/exportExcel'
import {
  listClinicServices,
  listClinicEmployees,
  listClinicPatients,
  listAppointments,
  updateClinicService,
  syncServicesFromCrm,
  type ClinicService,
  type ClinicMembership,
  type Patient,
  type Appointment,
} from '@/api/clinical'
import { useOrgStore } from '@/stores/orgStore'
import {
  cloneDocumentTemplate,
  listDocumentFields,
  listDocumentTemplateVersions,
  listDocumentTemplates,
  previewDocumentTemplate,
  saveDocumentTemplate,
  updateDocumentTemplate,
  validateDocumentTemplate,
  type DocumentFieldItem,
  type DocumentTemplateItem,
  type DocumentTemplateVersionItem,
} from '@/api/documentTemplates'

type PatientStatus = 'ready' | 'risk' | 'debt' | 'new'
type VisitStatus = 'waiting' | 'confirmed' | 'arrived' | 'in-progress' | 'done' | 'payment' | 'canceled' | 'no-show'

const patients = [
  {
    id: 'p-1042',
    name: 'Айгерим Нурланова',
    iin: '890512450012',
    age: 36,
    phone: '+7 701 245 18 90',
    doctor: 'Терапевт',
    nextVisit: 'Сегодня, 10:30',
    status: 'ready' as PatientStatus,
    balance: '0 ₸',
    note: 'Повторный прием, контроль давления',
    tags: ['ЭКГ', 'Анализы готовы', 'ДМС'],
  },
  {
    id: 'p-1188',
    name: 'Марат Сейдахмет',
    iin: '760301300442',
    age: 49,
    phone: '+7 775 010 44 20',
    doctor: 'Кардиолог',
    nextVisit: 'Сегодня, 11:00',
    status: 'risk' as PatientStatus,
    balance: '18 000 ₸',
    note: 'Аллергия на лидокаин, требуется контроль назначения',
    tags: ['Аллергия', 'Долг', 'Высокий риск'],
  },
  {
    id: 'p-1220',
    name: 'Динара Касымова',
    iin: '920812600333',
    age: 31,
    phone: '+7 700 888 55 11',
    doctor: 'Педиатр',
    nextVisit: 'Завтра, 09:40',
    status: 'new' as PatientStatus,
    balance: '0 ₸',
    note: 'Новый пациент, нужна первичная карта',
    tags: ['Первичный', 'Документы'],
  },
]

const visits = [
  { time: '09:30', patient: 'Ерлан Абдрахманов', service: 'Первичный прием', doctor: 'Терапевт', room: '201', status: 'done' as VisitStatus },
  { time: '10:30', patient: 'Айгерим Нурланова', service: 'Повторный прием', doctor: 'Терапевт', room: '201', status: 'in-progress' as VisitStatus },
  { time: '11:00', patient: 'Марат Сейдахмет', service: 'Кардиология', doctor: 'Кардиолог', room: '304', status: 'waiting' as VisitStatus },
  { time: '11:20', patient: 'Сабина Ахмет', service: 'УЗИ', doctor: 'Диагност', room: '108', status: 'payment' as VisitStatus },
]

const calendarSlots = [
  { id: 'slot-0930-therapy', time: '09:30', doctor: 'Терапевт', room: '201', patient: 'Ерлан Абдрахманов', service: 'Первичный прием', status: 'done' as VisitStatus, phone: '+7 701 111 20 30', warning: 'Документы готовы' },
  { id: 'slot-1030-therapy', time: '10:30', doctor: 'Терапевт', room: '201', patient: 'Айгерим Нурланова', service: 'Повторный прием', status: 'in-progress' as VisitStatus, phone: '+7 701 245 18 90', warning: 'Анализы готовы, давление под контролем' },
  { id: 'slot-1100-cardio', time: '11:00', doctor: 'Кардиолог', room: '304', patient: 'Марат Сейдахмет', service: 'Кардиология', status: 'waiting' as VisitStatus, phone: '+7 775 010 44 20', warning: 'Аллергия на лидокаин, есть долг 18 000 ₸' },
  { id: 'slot-1120-diagnostic', time: '11:20', doctor: 'Диагност', room: '108', patient: 'Сабина Ахмет', service: 'УЗИ', status: 'payment' as VisitStatus, phone: '+7 707 115 42 12', warning: 'Нужно закрыть оплату перед выдачей результата' },
]

const calendarTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:20', '12:00', '13:00']
const calendarDoctors = ['Терапевт', 'Кардиолог', 'Диагност']

const patientChartTabs = ['Обзор', 'Записи', 'Медкарта', 'Документы', 'Коммуникации', 'Платежи', 'Аудит'] as const

const templates = [
  { title: 'Первичный прием терапевта', specialty: 'Терапия', fields: 12, state: 'Готов к выпуску', usage: '48 документов' },
  { title: 'Повторный прием', specialty: 'Общий', fields: 8, state: 'Нужна проверка', usage: '31 документ' },
  { title: 'Справка о состоянии здоровья', specialty: 'Регистратура', fields: 6, state: 'Готов к выпуску', usage: '17 документов' },
]

function ClinicShell({ eyebrow, title, description, children, actions }: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mis-workspace space-y-5">
      <section className="mis-command-panel">
        <div>
          <p className="mis-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="mis-command-actions">{actions}</div>
      </section>
      {children}
    </div>
  )
}

function Metric({ label, value, tone = 'mint' }: { label: string; value: string; tone?: 'mint' | 'blue' | 'amber' | 'red' }) {
  const toneMap: Record<string, string> = {
    mint: 'icon-green',
    blue: 'icon-blue',
    amber: 'icon-amber',
    red: 'icon-red',
  }
  return (
    <div className="mis-card rounded-xl p-4">
      <p className="text-[12px] text-text-tertiary">{label}</p>
      <p className="mt-2 text-[24px] font-bold text-foreground leading-none">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: PatientStatus | VisitStatus }) {
  const map: Record<string, string> = {
    ready: 'Готов',
    risk: 'Риск',
    debt: 'Долг',
    new: 'Новый',
    waiting: 'Запланирована',
    confirmed: 'Подтверждена',
    arrived: 'Пациент пришел',
    'in-progress': 'На приеме',
    done: 'Завершена',
    payment: 'К оплате',
    canceled: 'Отменена',
    'no-show': 'Не явился',
  }
  const toneClass: Record<string, string> = {
    ready: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    done: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    confirmed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    risk: 'border-red-500/20 bg-red-500/10 text-red-400',
    debt: 'border-red-500/20 bg-red-500/10 text-red-400',
    canceled: 'border-red-500/20 bg-red-500/10 text-red-400',
    'no-show': 'border-red-500/20 bg-red-500/10 text-red-400',
    new: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    waiting: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    payment: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    arrived: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    'in-progress': 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  }
  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
      toneClass[status] ?? 'border-border bg-surface-2 text-text-secondary',
    )}>
      {map[status]}
    </span>
  )
}

type PatientListItem = {
  id: number | string
  name: string
  iin: string
  ageLabel: string
  phone: string
  nextVisit: string
  status: PatientStatus
  note?: string
}

function patientFullName(patient: Patient | null | undefined) {
  if (!patient) return 'Пациент не выбран'
  return [patient.person.last_name, patient.person.first_name, patient.person.middle_name].filter(Boolean).join(' ')
}

function patientInitials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2) || 'П'
}

function ageFromIin(iin?: string | null) {
  if (!iin || iin.length < 6) return null
  const year = Number(iin.slice(0, 2))
  const month = Number(iin.slice(2, 4))
  const day = Number(iin.slice(4, 6))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const century = year > 26 ? 1900 : 2000
  const birth = new Date(century + year, month - 1, day)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 && age < 130 ? age : null
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Дата не указана'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата не указана'
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function appointmentStatusToVisitStatus(status?: string | null): VisitStatus {
  const map: Record<string, VisitStatus> = {
    scheduled: 'waiting',
    started: 'in-progress',
    in_progress: 'in-progress',
    completed: 'done',
    done: 'done',
    canceled: 'canceled',
    no_show: 'no-show',
  }
  return map[String(status ?? '').toLowerCase()] ?? 'waiting'
}

function PatientRow({ patient }: { patient: PatientListItem }) {
  return (
    <Link
      to={`/clinic/patients/${patient.id}`}
      className="group flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 transition-all hover:bg-surface-hover hover:border-border-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">
        {patientInitials(patient.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{patient.name}</p>
        <p className="text-[11px] text-text-tertiary">{patient.iin} · {patient.ageLabel} · {patient.phone || 'телефон не указан'}</p>
        {patient.note ? <p className="mt-1 truncate text-[11px] text-text-secondary">{patient.note}</p> : null}
      </div>
      <span className="hidden text-[12px] text-text-secondary sm:block">{patient.nextVisit}</span>
      <StatusPill status={patient.status} />
      <ChevronRight className="h-4 w-4 text-text-quaternary transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function VisitCard({ visit }: { visit: (typeof visits)[number] }) {
  return (
    <article className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-surface-hover">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">
        {visit.time}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{visit.patient}</p>
        <p className="text-[11px] text-text-tertiary">{visit.service} · {visit.doctor} · кабинет {visit.room}</p>
      </div>
      <StatusPill status={visit.status} />
    </article>
  )
}

export function ClinicDashboardPage() {
  return (
    <ClinicShell
      eyebrow="QorMed Clinical OS"
      title="Рабочий день клиники без хаоса"
      description="Один центр управления для расписания, пациентов, врачей, оплат, документов и KPI."
      actions={<Link className="clinic-os-button" to="/clinic/calendar">Открыть расписание</Link>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Пациенты сегодня" value="42" />
        <Metric label="Загрузка врачей" value="78%" tone="blue" />
        <Metric label="К оплате" value="326 000 ₸" tone="amber" />
        <Metric label="Риски приема" value="3" tone="red" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-sm icon-blue rounded-md">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">Живая лента приемов</h3>
                <p className="text-[12px] text-text-tertiary">Сегодня</p>
              </div>
            </div>
            <Link to="/clinic/calendar" className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover">
              Все записи <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">{visits.map((visit) => <VisitCard key={`${visit.time}-${visit.patient}`} visit={visit} />)}</div>
        </section>

        <section className="mis-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-amber rounded-md">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Что требует внимания</h3>
              <p className="text-[12px] text-text-tertiary">Фокус</p>
            </div>
          </div>
          <div className="space-y-2">
            {['2 пациента с долгом перед приемом', '1 шаблон документа ждет проверки', 'Кардиолог перегружен на 112%', 'Закрытие дня готово на 68%'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-[13px] text-text-secondary">
                <Activity className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ClinicShell>
  )
}

export function ClinicPatientsPage() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const clinicId = useMemo(() => {
    const parsed = Number(activeOrgId)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }, [activeOrgId])
  const [query, setQuery] = useState('')
  const [realPatients, setRealPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadPatients() {
      setLoading(true)
      setError('')
      try {
        const [patientsResponse, appointmentsResponse] = await Promise.all([
          listClinicPatients(clinicId),
          listAppointments(clinicId),
        ])
        if (cancelled) return
        setRealPatients(patientsResponse.data)
        setAppointments(appointmentsResponse.data)
      } catch {
        if (!cancelled) setError('Не удалось загрузить пациентов')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadPatients()
    return () => { cancelled = true }
  }, [clinicId])

  const patientRows = useMemo<PatientListItem[]>(() => realPatients.map((patient) => {
    const name = patientFullName(patient)
    const age = ageFromIin(patient.person.iin)
    const patientAppointments = appointments
      .filter((appointment) => appointment.patient_profile_id === patient.id)
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())
    const upcoming = patientAppointments.find((appointment) => new Date(appointment.starts_at).getTime() >= Date.now())
    const last = patientAppointments.at(-1)
    const status: PatientStatus = patient.notes?.toLowerCase().includes('аллерг') ? 'risk' : patientAppointments.length ? 'ready' : 'new'
    return {
      id: patient.id,
      name,
      iin: patient.person.iin || 'ИИН не указан',
      ageLabel: age ? `${age} лет` : 'возраст не указан',
      phone: patient.person.phone ?? '',
      nextVisit: upcoming ? formatDateTime(upcoming.starts_at) : last ? `Последний: ${formatDateTime(last.starts_at)}` : 'Нет записей',
      status,
      note: patient.notes ?? undefined,
    }
  }), [realPatients, appointments])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return patientRows
    return patientRows.filter((patient) => `${patient.name} ${patient.iin} ${patient.phone} ${patient.note ?? ''}`.toLowerCase().includes(normalized))
  }, [query, patientRows])

  return (
    <ClinicShell
      eyebrow=""
      title="Пациенты"
      description=""
      actions={<Button><Plus className="mr-2 h-4 w-4" />Новый пациент</Button>}
    >
      <section className="clinic-os-toolbar">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по ФИО, ИИН или телефону" />
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Всего пациентов" value={String(patientRows.length)} />
        <Metric label="С записью" value={String(patientRows.filter((patient) => patient.nextVisit !== 'Нет записей').length)} tone="blue" />
        <Metric label="Требуют внимания" value={String(patientRows.filter((patient) => patient.status === 'risk').length)} tone="amber" />
      </section>
      <section className="mis-card rounded-xl p-5">
        {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
        <div className="clinic-os-patient-list">
          {loading ? <p className="text-sm text-text-secondary">Загрузка пациентов...</p> : null}
          {!loading && filtered.length === 0 ? <p className="text-sm text-text-secondary">Пациенты не найдены.</p> : null}
          {filtered.map((patient) => <PatientRow key={patient.id} patient={patient} />)}
        </div>
      </section>
    </ClinicShell>
  )
}

export function ClinicPatientCardPage() {
  const { patientId } = useParams()
  const patient = patients.find((item) => item.id === patientId) ?? patients[0]
  const [activeTab, setActiveTab] = useState<(typeof patientChartTabs)[number]>('Обзор')

  return (
    <ClinicShell
      eyebrow="Электронная карта"
      title={patient.name}
      description={`${patient.age} лет · ИИН ${patient.iin} · ${patient.phone}. Карта собирает историю приемов, назначения, документы и оплаты вокруг пациента.`}
      actions={(
        <>
          <Link className="clinic-os-button clinic-os-button--ghost" to="/clinic/calendar">Записать</Link>
          <Link className="clinic-os-button clinic-os-button--ghost" to="/support">Написать</Link>
          <Link className="clinic-os-button clinic-os-button--ghost" to="/clinic/documents">Создать документ</Link>
          <Link className="clinic-os-button" to="/clinic/visits/visit-1042">Открыть медкарту</Link>
        </>
      )}
    >
      <section className="clinic-os-patient-summary">
        <div className="clinic-os-patient-identity">
          <div className="clinic-os-avatar clinic-os-avatar--large">{patient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
          <div>
            <h2>{patient.name}</h2>
            <p>ИИН {patient.iin} · {patient.age} лет · {patient.phone}</p>
            <div className="clinic-os-tag-list">{patient.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </div>
        <div className="clinic-os-patient-alerts">
          <div className={cn('clinic-os-alert', patient.status === 'risk' && 'clinic-os-alert--danger')}>
            <ShieldCheck className="h-4 w-4" />
            <span>{patient.note}</span>
          </div>
          <div className="clinic-os-alert">
            <FileText className="h-4 w-4" />
            <span>После приема нужно сформировать протокол и рекомендации</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Баланс" value={patient.balance} tone={patient.balance === '0 ₸' ? 'mint' : 'amber'} />
        <Metric label="Следующий визит" value={patient.nextVisit} tone="blue" />
        <Metric label="Документы" value="14" />
        <Metric label="Риски" value={patient.status === 'risk' ? 'Аллергия' : 'Нет'} tone={patient.status === 'risk' ? 'red' : 'mint'} />
      </section>

      <nav className="clinic-os-tabs" aria-label="Разделы карты пациента">
        {patientChartTabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? 'is-active' : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="mis-card rounded-xl p-5 min-w-0">
          <div className="clinic-os-panel-head"><div><span>{activeTab}</span><h2>{activeTab === 'Обзор' ? 'Что важно сейчас' : `Раздел: ${activeTab}`}</h2></div></div>
          {activeTab === 'Обзор' && (
            <>
              {['Повторный прием: давление стабилизировано', 'ЭКГ: результат прикреплен', 'Счет #1842 закрыт', 'Первичная карта создана'].map((event) => (
                <div className="clinic-os-timeline-item" key={event}><CheckCircle2 className="h-4 w-4" /><span>{event}</span></div>
              ))}
            </>
          )}
          {activeTab === 'Записи' && (
            <div className="clinic-os-visit-list">{visits.map((visit) => <VisitCard key={`${visit.time}-${visit.patient}`} visit={visit} />)}</div>
          )}
          {activeTab === 'Медкарта' && (
            <>
              {['Диагноз: I10 Эссенциальная гипертензия', 'Назначения: контроль АД 2 раза в день', 'Рекомендации: повторный прием через 14 дней'].map((event) => (
                <div className="clinic-os-timeline-item" key={event}><Stethoscope className="h-4 w-4" /><span>{event}</span></div>
              ))}
            </>
          )}
          {activeTab === 'Документы' && (
            <>
              {['Протокол приема · готов к подписанию', 'ЭКГ · прикреплен файл', 'Справка о состоянии здоровья · черновик'].map((event) => (
                <div className="clinic-os-timeline-item" key={event}><FileText className="h-4 w-4" /><span>{event}</span></div>
              ))}
            </>
          )}
          {activeTab === 'Коммуникации' && (
            <>
              {['SMS-напоминание доставлено', 'WhatsApp: пациент подтвердил визит', 'Звонок ресепшн: перенос не требуется'].map((event) => (
                <div className="clinic-os-timeline-item" key={event}><Activity className="h-4 w-4" /><span>{event}</span></div>
              ))}
            </>
          )}
          {activeTab === 'Платежи' && (
            <>
              {['Счет #1842 · закрыт · 18 000 ₸', 'ДМС покрытие · подтверждено', patient.balance === '0 ₸' ? 'Задолженности нет' : `Текущий долг: ${patient.balance}`].map((event) => (
                <div className="clinic-os-timeline-item" key={event}><ReceiptText className="h-4 w-4" /><span>{event}</span></div>
              ))}
            </>
          )}
          {activeTab === 'Аудит' && (
            <>
              {['Врач открыл медкарту · 10:12', 'Ресепшн изменил статус записи · 09:58', 'Документ сформирован · вчера'].map((event) => (
                <div className="clinic-os-timeline-item" key={event}><ShieldCheck className="h-4 w-4" /><span>{event}</span></div>
              ))}
            </>
          )}
        </div>
        <div className="mis-card rounded-xl p-5">
          <div className="clinic-os-panel-head"><div><span>Быстрые действия</span><h2>Следующий шаг</h2></div></div>
          {[
            ['Записать на прием', '/clinic/calendar'],
            ['Создать документ', '/clinic/documents'],
            ['Выставить счет', '/clinic/payments'],
            ['Отправить напоминание', '/support'],
          ].map(([action, to]) => (
            <Link className="clinic-os-action-row" to={to} key={action}>{action}<ArrowRight className="h-4 w-4" /></Link>
          ))}
        </div>
      </section>
    </ClinicShell>
  )
}

export function ClinicVisitPage() {
  const visitSteps = ['Жалобы', 'Анамнез', 'Осмотр', 'Диагноз', 'Назначения', 'Документы']
  const requiredFields = ['Жалобы', 'Диагноз', 'Рекомендации']
  const visitFields = ['Жалобы', 'Анамнез', 'Объективный осмотр', 'Диагноз', 'Назначения', 'Рекомендации']
  const [draft, setDraft] = useState<Record<string, string>>({
    Жалобы: 'Периодические головные боли, контроль давления после терапии.',
    Анамнез: 'Повторный прием, пациент соблюдает рекомендации.',
  })
  const [completed, setCompleted] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState('20 секунд назад')

  const missingRequiredFields = requiredFields.filter((field) => !draft[field]?.trim())
  const canCompleteVisit = missingRequiredFields.length === 0
  const currentStepIndex = visitFields.reduce((lastDone, field, index) => draft[field]?.trim() ? index : lastDone, -1)

  function updateDraft(field: string, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setCompleted(false)
    setLastSavedAt('только что')
  }

  function completeVisit() {
    if (!canCompleteVisit) return
    setCompleted(true)
    setLastSavedAt('сейчас')
  }

  return (
    <ClinicShell
      eyebrow="Прием врача"
      title="Протокол приема без лишних кликов"
      description="Врач ведет прием в одном окне: жалобы, осмотр, диагноз, назначения, документы и завершение визита."
      actions={<Button onClick={completeVisit} disabled={!canCompleteVisit}><BadgeCheck className="mr-2 h-4 w-4" />{completed ? 'Прием завершен' : 'Завершить прием'}</Button>}
    >
      <section className="clinic-os-visit-status">
        <div>
          <span>Черновик сохранен {lastSavedAt}</span>
          <strong>{completed ? 'Прием завершен · документы готовы к выпуску' : canCompleteVisit ? 'Можно завершить прием' : `Не заполнено: ${missingRequiredFields.join(', ')}`}</strong>
        </div>
        <div className="clinic-os-stepper">
          {visitSteps.map((step, index) => (
            <span className={index <= currentStepIndex ? 'is-done' : undefined} key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="clinic-os-visit-workspace">
        <aside className="mis-card rounded-xl p-5">
          <div className="clinic-os-panel-head"><div><span>Пациент</span><h2>Айгерим Нурланова</h2></div></div>
          {['Повторный прием', 'Анализы готовы', 'Долгов нет', 'Документ после приема'].map((item) => (
            <div className="clinic-os-signal" key={item}><ShieldCheck className="h-4 w-4" /><span>{item}</span></div>
          ))}
          <div className={cn('clinic-os-warning', canCompleteVisit && 'clinic-os-ready-data')}>
            <ShieldCheck className="h-4 w-4" />
            <span>{canCompleteVisit ? 'Обязательные поля заполнены. После завершения будут сформированы протокол и рекомендации.' : 'Нельзя завершить прием без жалоб, диагноза и рекомендаций.'}</span>
          </div>
          {completed ? (
            <div className="clinic-os-missing-data">
              <strong>Созданные документы</strong>
              <span>Протокол приема привязан к визиту visit-1042</span>
              <span>Рекомендации добавлены в карту пациента</span>
            </div>
          ) : null}
        </aside>
        <section className="mis-card rounded-xl p-5 min-w-0">
          <div className="clinic-os-form-grid">
            {visitFields.map((field) => (
              <label className={requiredFields.includes(field) ? 'is-required' : undefined} key={field}>
                <span>{field}{requiredFields.includes(field) ? ' *' : ''}</span>
                <textarea
                  placeholder={`${field}: начните вводить данные приема`}
                  value={draft[field] ?? ''}
                  onChange={(event) => updateDraft(field, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="clinic-os-document-footer">
            <div>
              <span>Autosave draft · audit event queued</span>
              <strong>{canCompleteVisit ? 'Required validation passed' : `Required: ${missingRequiredFields.join(', ')}`}</strong>
            </div>
            <button type="button" disabled={!canCompleteVisit} onClick={completeVisit}>{completed ? 'Документы сформированы' : 'Завершить и сформировать документы'}</button>
          </div>
        </section>
      </section>
    </ClinicShell>
  )
}

export function ClinicPaymentsPage() {
  return (
    <ClinicShell
      eyebrow="Касса"
      title="Оплаты и закрытие дня без ручной сверки"
      description="Администратор видит счета, долги, способы оплаты и готовность к закрытию дня по филиалу."
      actions={(
        <>
          <Button variant="outline" onClick={() => exportToExcel(visits.map((v, i) => ({
            'Пациент': v.patient,
            'Услуга': v.service,
            'Врач': v.doctor,
            'Сумма (₸)': [18000, 24000, 32000, 15000][i],
            'Статус': v.status,
          })), 'платежи')}>
            <Download className="mr-2 h-4 w-4" />Excel
          </Button>
          <Button><ReceiptText className="mr-2 h-4 w-4" />Новый счет</Button>
        </>
      )}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Оплачено сегодня" value="684 000 ₸" />
        <Metric label="Ожидает оплаты" value="126 000 ₸" tone="amber" />
        <Metric label="Долги" value="44 000 ₸" tone="red" />
        <Metric label="Закрытие дня" value="68%" tone="blue" />
      </section>
      <section className="mis-card rounded-xl p-5">
        {visits.map((visit, index) => (
          <div className="clinic-os-payment-row" key={visit.patient}>
            <div><strong>{visit.patient}</strong><span>{visit.service}</span></div>
            <span>{[18000, 24000, 32000, 15000][index].toLocaleString('ru-RU')} ₸</span>
            <StatusPill status={visit.status === 'done' ? 'done' : 'payment'} />
          </div>
        ))}
      </section>
    </ClinicShell>
  )
}

function fieldGroups(fields: DocumentFieldItem[]) {
  return fields.reduce<Record<string, DocumentFieldItem[]>>((acc, field) => {
    const key = field.category || 'Другое'
    acc[key] = acc[key] ?? []
    acc[key].push(field)
    return acc
  }, {})
}

function templateCode(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 44)
  return `${base || 'medical_template'}_${Date.now().toString(36)}`.slice(0, 80)
}

const templateStarter = `Пациент: «Фамилия пациента» «Имя пациента»
Дата приема: «Дата приема»
Врач: «Врач»
Диагноз: «Диагноз»
Жалобы: «Жалобы»
Рекомендации: «Рекомендации»`

const templateBlocks = [
  { title: 'Паспорт приема', description: 'Пациент, дата и врач', body: `Пациент: «Фамилия пациента» «Имя пациента» «Отчество пациента»
ИИН: «ИИН пациента»
Дата приема: «Дата приема»
Врач: «Врач»` },
  { title: 'Клинический блок', description: 'Жалобы, анамнез, осмотр', body: `Жалобы:
«Жалобы»

Анамнез:
«Анамнез»

Объективный осмотр:
«Объективный осмотр»` },
  { title: 'Диагноз и план', description: 'Итог приема и назначения', body: `Диагноз:
«Диагноз»

Назначения:
«Назначения»

Рекомендации:
«Рекомендации»` },
  { title: 'Контроль', description: 'Заключение и повторный прием', body: `Заключение:
«Заключение»

Контрольный прием:
«Дата контроля»` },
]

export function ClinicDocumentsPage() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const clinicId = useMemo(() => {
    const parsed = Number(activeOrgId)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }, [activeOrgId])
  const [templatesList, setTemplatesList] = useState<DocumentTemplateItem[]>([])
  const [fields, setFields] = useState<DocumentFieldItem[]>([])
  const [versions, setVersions] = useState<DocumentTemplateVersionItem[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [title, setTitle] = useState('Новый медицинский шаблон')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('protocol')
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('active')
  const [body, setBody] = useState(templateStarter)
  const [preview, setPreview] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [unknownFields, setUnknownFields] = useState<string[]>([])
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groupedFields = useMemo(() => fieldGroups(fields), [fields])
  const usedFieldLabels = useMemo(() => Array.from(new Set(Array.from(body.matchAll(/«([^»]+)»/g)).map((match) => match[1].trim()).filter(Boolean))), [body])
  const documentSections = useMemo(() => body.split(/\n(?=[А-ЯЁA-Z][^\n]{2,60}:)/).map((section) => section.trim()).filter(Boolean), [body])
  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return templatesList
    return templatesList.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(needle))
  }, [templatesList, query])
  const activeTemplate = templatesList.find((item) => item.id === activeId) ?? null
  const statusStats = useMemo(() => ({
    active: templatesList.filter((item) => item.status === 'active').length,
    draft: templatesList.filter((item) => item.status === 'draft').length,
    archived: templatesList.filter((item) => item.status === 'archived').length,
  }), [templatesList])
  const readyToSave = title.trim().length > 0 && body.trim().length > 0

  async function loadTemplateData(nextActiveId?: number | null) {
    setLoading(true)
    setError('')
    try {
      const [templatesResponse, fieldsResponse] = await Promise.all([
        listDocumentTemplates(clinicId, true),
        listDocumentFields(clinicId),
      ])
      setTemplatesList(templatesResponse.data)
      setFields(fieldsResponse.data)
      const selected = nextActiveId
        ? templatesResponse.data.find((item) => item.id === nextActiveId)
        : templatesResponse.data[0]
      if (selected) {
        selectTemplate(selected, false)
        void loadVersions(selected.id)
      } else {
        setVersions([])
      }
    } catch {
      setError('Не удалось загрузить шаблоны документов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplateData()
  }, [clinicId])

  async function loadVersions(templateId: number) {
    try {
      const response = await listDocumentTemplateVersions(clinicId, templateId)
      setVersions(response.data)
    } catch {
      setVersions([])
    }
  }

  function selectTemplate(template: DocumentTemplateItem, clearPreview = true) {
    setActiveId(template.id)
    void loadVersions(template.id)
    setTitle(template.title)
    setDescription(template.description ?? '')
    setCategory(template.category || 'protocol')
    setStatus(template.status || 'active')
    setBody(template.body)
    setUnknownFields([])
    setWarnings([])
    setMissingFields([])
    if (clearPreview) setPreview('')
  }

  function createBlankTemplate() {
    setActiveId(null)
    setTitle('Новый медицинский шаблон')
    setDescription('')
    setCategory('protocol')
    setStatus('active')
    setBody(templateStarter)
    setPreview('')
    setWarnings([])
    setUnknownFields([])
    setMissingFields([])
    setVersions([])
  }

  function insertField(field: DocumentFieldItem) {
    const marker = `«${field.label}»`
    setBody((current) => `${current}${current.endsWith(' ') || current.endsWith('\n') ? '' : ' '}${marker}`)
  }

  function insertTemplateBlock(blockBody: string) {
    setBody((current) => `${current.trim()}${current.trim() ? '\n\n' : ''}${blockBody}`)
  }

  function replaceWithClinicalStructure() {
    setBody(templateBlocks.map((block) => block.body).join('\n\n'))
  }

  async function checkTemplate() {
    setError('')
    try {
      const response = await validateDocumentTemplate(clinicId, body)
      setWarnings(response.data.warnings)
      setUnknownFields(response.data.unknown_fields)
      setMissingFields([])
    } catch {
      setError('Не удалось проверить шаблон')
    }
  }

  async function buildPreview() {
    setError('')
    try {
      const response = await previewDocumentTemplate(clinicId, { body })
      setPreview(response.data.body)
      setWarnings(response.data.warnings)
      setMissingFields(response.data.missing_fields)
    } catch {
      setError('Не удалось построить предпросмотр')
    }
  }

  async function saveTemplate() {
    if (!readyToSave) return
    setSaving(true)
    setError('')
    try {
      const validation = await validateDocumentTemplate(clinicId, body)
      if (!validation.data.is_valid) {
        setUnknownFields(validation.data.unknown_fields)
        setWarnings(validation.data.warnings)
        setError(`Неизвестные поля: ${validation.data.unknown_fields.join(', ')}`)
        return
      }
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        language: 'ru',
        status,
        body: body.trim(),
      }
      const response = activeId
        ? await updateDocumentTemplate(clinicId, activeId, payload)
        : await saveDocumentTemplate(clinicId, { ...payload, code: templateCode(title) })
      await loadTemplateData(response.data.id)
      setPreview('')
    } catch {
      setError('Не удалось сохранить шаблон')
    } finally {
      setSaving(false)
    }
  }

  async function copyTemplate() {
    if (!activeId) return
    setSaving(true)
    setError('')
    try {
      const response = await cloneDocumentTemplate(clinicId, activeId)
      await loadTemplateData(response.data.id)
    } catch {
      setError('Не удалось создать копию шаблона')
    } finally {
      setSaving(false)
    }
  }

  async function archiveTemplate() {
    if (!activeId) return
    setSaving(true)
    setError('')
    try {
      await updateDocumentTemplate(clinicId, activeId, { status: 'archived' })
      await loadTemplateData(null)
    } catch {
      setError('Не удалось архивировать шаблон')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mis-workspace space-y-5">
      <div className="flex justify-end">
        <Button type="button" onClick={createBlankTemplate}>
          <Plus className="mr-2 h-4 w-4" />Новый шаблон
        </Button>
      </div>
      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="mis-card rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase text-text-tertiary">Библиотека</p>
              <h2 className="text-base font-semibold text-foreground">{templatesList.length} шаблонов</h2>
              <p className="mt-1 text-[11px] text-text-tertiary">{statusStats.active} активных · {statusStats.draft} черновиков · {statusStats.archived} в архиве</p>
            </div>
            <button type="button" onClick={() => void loadTemplateData(activeId)} className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover">
              Обновить
            </button>
          </div>
          <label className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-4 w-4 text-text-tertiary" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти шаблон" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
            {loading ? <p className="text-sm text-text-secondary">Загрузка...</p> : null}
            {!loading && filteredTemplates.length === 0 ? <p className="text-sm text-text-secondary">Шаблонов пока нет.</p> : null}
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition',
                  activeId === template.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-surface-hover',
                )}
              >
                <span className="block text-sm font-semibold text-foreground">{template.title}</span>
                <span className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
                  {template.category || 'protocol'} · {template.status === 'archived' ? 'архив' : template.status === 'draft' ? 'черновик' : 'активен'} · v{template.version || 1}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="mis-card rounded-xl p-5 min-w-0">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase text-text-tertiary">Редактор</p>
              <h2 className="text-lg font-semibold text-foreground">{activeTemplate ? 'Редактирование шаблона' : 'Новый шаблон'}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTemplate ? <span className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-text-secondary">Версия {activeTemplate.version || 1}</span> : null}
              <button type="button" onClick={checkTemplate} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">Проверить</button>
              <button type="button" onClick={buildPreview} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">Предпросмотр</button>
              <button type="button" onClick={copyTemplate} disabled={!activeId || saving} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-40">Копия</button>
              <button type="button" onClick={archiveTemplate} disabled={!activeId || saving} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-40">Архив</button>
              <button type="button" onClick={saveTemplate} disabled={!readyToSave || saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>

          {error ? <div className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px]">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold text-text-secondary">Название</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold text-text-secondary">Тип</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="protocol">Протокол</option>
                <option value="recommendation">Рекомендации</option>
                <option value="certificate">Справка</option>
                <option value="consent">Согласие</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] font-semibold text-text-secondary">Статус</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as 'draft' | 'active' | 'archived')} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="active">Активен</option>
                <option value="draft">Черновик</option>
                <option value="archived">Архив</option>
              </select>
            </label>
          </div>

          <label className="mt-3 grid gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Описание</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Для каких приемов используется шаблон" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          </label>

          <section className="mt-4 rounded-xl border border-border bg-background/60 p-3">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold text-text-secondary">Конструктор структуры</p>
                <p className="text-[11px] text-text-tertiary">Соберите медицинский документ из блоков, затем уточните печатную форму ниже.</p>
              </div>
              <button type="button" onClick={replaceWithClinicalStructure} className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover">Собрать полный протокол</button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {templateBlocks.map((block) => (
                <button key={block.title} type="button" onClick={() => insertTemplateBlock(block.body)} className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-left hover:bg-surface-hover">
                  <span className="block text-sm font-semibold text-foreground">{block.title}</span>
                  <span className="mt-1 block text-[11px] text-text-tertiary">{block.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border px-3 py-2"><span className="text-[11px] text-text-tertiary">Блоков</span><strong className="mt-1 block text-foreground">{documentSections.length}</strong></div>
              <div className="rounded-lg border border-border px-3 py-2"><span className="text-[11px] text-text-tertiary">Переменных</span><strong className="mt-1 block text-foreground">{usedFieldLabels.length}</strong></div>
              <div className="rounded-lg border border-border px-3 py-2"><span className="text-[11px] text-text-tertiary">Статус</span><strong className="mt-1 block text-foreground">{unknownFields.length ? 'Есть ошибки' : 'Готов к проверке'}</strong></div>
            </div>
          </section>

          <label className="mt-3 grid gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Печатная форма</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-[300px] rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary" />
          </label>

          {(warnings.length > 0 || unknownFields.length > 0 || missingFields.length > 0) ? (
            <div className="mt-3 grid gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-secondary">
              {unknownFields.length > 0 ? <p>Неизвестные поля: {unknownFields.join(', ')}</p> : null}
              {missingFields.length > 0 ? <p>Нет данных для предпросмотра: {missingFields.join(', ')}</p> : null}
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}
        </section>

        <aside className="mis-card rounded-xl p-4">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase text-text-tertiary">Поля</p>
            <h2 className="text-base font-semibold text-foreground">Вставка данных</h2>
          </div>
          <div className="max-h-[360px] space-y-4 overflow-auto pr-1">
            {Object.entries(groupedFields).map(([group, groupFields]) => (
              <div key={group}>
                <p className="mb-2 text-[12px] font-semibold text-text-secondary">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      title={field.description ?? field.key}
                      onClick={() => insertField(field)}
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground hover:bg-surface-hover"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase text-text-tertiary">История</p>
            <div className="mt-3 max-h-[220px] space-y-2 overflow-auto pr-1">
              {versions.length === 0 ? <p className="text-sm text-text-secondary">Версий пока нет.</p> : null}
              {versions.map((version) => (
                <div key={version.id} className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <strong className="text-foreground">v{version.version}</strong>
                    <span className="text-[11px] text-text-tertiary">{version.status === 'active' ? 'активна' : version.status === 'draft' ? 'черновик' : 'архив'}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-text-tertiary">{new Date(version.created_at).toLocaleString('ru-RU')}</p>
                  {version.change_note ? <p className="mt-1 text-xs text-text-secondary">{version.change_note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="mis-card rounded-xl p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-text-tertiary">Предпросмотр</p>
              <h2 className="text-base font-semibold text-foreground">Документ на данных приема</h2>
            </div>
            <button type="button" onClick={buildPreview} className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">Обновить</button>
          </div>
          <div className="min-h-[180px] whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-6 text-foreground">
            {preview || 'Нажмите «Предпросмотр», чтобы увидеть документ с подставленными данными пациента и приема.'}
          </div>
        </div>

        <div className="mis-card rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase text-text-tertiary">Поток врача</p>
          <div className="mt-3 space-y-3 text-sm text-text-secondary">
            <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /><span>Администратор создает шаблон и активирует его.</span></div>
            <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /><span>Врач выбирает документ внутри приема пациента.</span></div>
            <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /><span>Система подставляет данные и отдает документ в печать/PDF.</span></div>
          </div>
          <Link to="/clinic/visits/visit-1042" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Проверить в приеме
          </Link>
        </div>
      </section>
    </div>
  )
}

export function ClinicAnalyticsPage() {
  return (
    <ClinicShell
      eyebrow="Аналитика"
      title="KPI клиники в языке управленческих решений"
      description="Не просто отчеты, а сигналы: где теряются пациенты, какие врачи перегружены, где проседает касса и что влияет на выручку."
      actions={(
        <>
          <Button variant="outline" onClick={() => exportToExcel([
            { 'Показатель': 'Выручка месяца', 'Значение': '18 400 000 ₸' },
            { 'Показатель': 'Повторные визиты', 'Значение': '42%' },
            { 'Показатель': 'Конверсия записи', 'Значение': '86%' },
            { 'Показатель': 'Потери от неявок', 'Значение': '214 000 ₸' },
          ], 'аналитика_клиники')}>
            <Download className="mr-2 h-4 w-4" />Excel
          </Button>
          <Button><ChartNoAxesCombined className="mr-2 h-4 w-4" />Собрать отчет</Button>
        </>
      )}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Выручка месяца" value="18.4 млн ₸" />
        <Metric label="Повторные визиты" value="42%" tone="blue" />
        <Metric label="Конверсия записи" value="86%" />
        <Metric label="Потери от неявок" value="214 000 ₸" tone="red" />
      </section>
      <section className="clinic-os-analytics-grid">
        {['Выручка по врачам', 'Загрузка кабинетов', 'Неявки по дням', 'KPI сотрудников'].map((chart, index) => (
          <article className="clinic-os-chart-card" key={chart}>
            <div className="clinic-os-panel-head"><div><span>Q{index + 1}</span><h2>{chart}</h2></div></div>
            <div className="clinic-os-bars">
              {[58, 76, 44, 88, 63].map((height, barIndex) => <i key={barIndex} style={{ height: `${height}%` }} />)}
            </div>
          </article>
        ))}
      </section>
    </ClinicShell>
  )
}

function doctorDisplayName(emp: ClinicMembership): string {
  if (emp.person) {
    const { last_name, first_name, middle_name } = emp.person
    return [last_name, first_name, middle_name].filter(Boolean).join(' ')
  }
  return `Сотрудник #${emp.id}`
}

export function ClinicSettingsPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const clinicId = activeOrgId ? Number(activeOrgId) : null

  const [services, setServices] = useState<ClinicService[]>([])
  const [employees, setEmployees] = useState<ClinicMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'services' | 'overview'>('services')
  const [syncing, setSyncing] = useState(false)

  const handleSyncFromCrm = useCallback(async () => {
    if (!clinicId || syncing) return
    setSyncing(true)
    try {
      const { data } = await syncServicesFromCrm(clinicId)
      const { data: svcs } = await listClinicServices(clinicId)
      setServices(svcs)
      alert(`Синхронизировано: добавлено ${data.created}, обновлено ${data.updated} из ${data.total}`)
    } catch {
      alert('Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }, [clinicId, syncing])

  useEffect(() => {
    if (!clinicId) return
    Promise.all([
      listClinicServices(clinicId).then((r) => r.data),
      listClinicEmployees(clinicId).then((r) => r.data),
    ])
      .then(([svcs, emps]) => {
        setServices(svcs)
        setEmployees(emps.filter((e) => e.is_active && e.role_code === 'doctor'))
      })
      .finally(() => setLoading(false))
  }, [clinicId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter((s) => !q || s.title.toLowerCase().includes(q) || s.code.includes(q))
  }, [services, query])

  const handleAssign = useCallback(
    async (service: ClinicService, doctorMembershipId: number | null) => {
      if (!clinicId) return
      setSaving(service.id)
      try {
        const { data } = await updateClinicService(clinicId, service.id, {
          doctor_membership_id: doctorMembershipId,
        })
        setServices((prev) => prev.map((s) => (s.id === data.id ? data : s)))
      } finally {
        setSaving(null)
      }
    },
    [clinicId],
  )

  const handleToggleActive = useCallback(
    async (service: ClinicService) => {
      if (!clinicId) return
      setSaving(service.id)
      try {
        const { data } = await updateClinicService(clinicId, service.id, {
          is_active: !service.is_active,
        })
        setServices((prev) => prev.map((s) => (s.id === data.id ? data : s)))
      } finally {
        setSaving(null)
      }
    },
    [clinicId],
  )

  const assignedCount = services.filter((s) => s.doctor_membership_id != null).length
  const sharedCount = services.filter((s) => s.doctor_membership_id == null && s.is_active).length

  return (
    <ClinicShell
      eyebrow="Справочники"
      title="Настройки клиники"
      description="Управляйте услугами: назначайте их конкретным врачам или оставляйте общими для всех."
    >
      <nav className="clinic-os-tabs" aria-label="Разделы настроек">
        <button
          type="button"
          className={tab === 'overview' ? 'is-active' : undefined}
          onClick={() => setTab('overview')}
        >
          Обзор
        </button>
        <button
          type="button"
          className={tab === 'services' ? 'is-active' : undefined}
          onClick={() => setTab('services')}
        >
          Услуги и врачи
        </button>
      </nav>

      {tab === 'overview' && (
        <section className="clinic-os-settings-grid">
          {[
            ['Врачи и смены', UsersRound],
            ['Услуги и цены', Banknote],
            ['Кабинеты', LayoutDashboard],
            ['Роли доступа', ShieldCheck],
            ['Печатные формы', FileText],
            ['Интеграции', Sparkles],
          ].map(([label, Icon]) => {
            const TypedIcon = Icon as typeof UsersRound
            return (
              <article
                className={cn('clinic-os-setting-card', label === 'Услуги и цены' && 'cursor-pointer')}
                key={String(label)}
                onClick={label === 'Услуги и цены' ? () => setTab('services') : undefined}
              >
                <TypedIcon className="h-5 w-5" />
                <strong>{String(label)}</strong>
                <span>Настроить</span>
              </article>
            )
          })}
        </section>
      )}

      {tab === 'services' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="mis-card rounded-xl p-4">
              <p className="text-[12px] text-text-tertiary">Всего услуг</p>
              <p className="mt-2 text-[24px] font-bold text-foreground leading-none">{services.length}</p>
            </div>
            <div className="mis-card rounded-xl p-4">
              <p className="text-[12px] text-text-tertiary">Общие (для всех врачей)</p>
              <p className="mt-2 text-[24px] font-bold text-foreground leading-none">{sharedCount}</p>
            </div>
            <div className="mis-card rounded-xl p-4">
              <p className="text-[12px] text-text-tertiary">Привязаны к врачу</p>
              <p className="mt-2 text-[24px] font-bold text-foreground leading-none">{assignedCount}</p>
            </div>
          </div>

          <section className="mis-card rounded-xl p-5">
            <div className="mb-4 flex items-center gap-3">
              <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
              <input
                className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-text-quaternary"
                placeholder="Поиск по названию или коду"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="button"
                disabled={syncing || !clinicId}
                onClick={handleSyncFromCrm}
                className="ml-auto shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                {syncing ? 'Синхронизация...' : 'Синхр. из CRM'}
              </button>
            </div>

            {loading ? (
              <p className="py-6 text-center text-[14px] text-text-tertiary">Загрузка...</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((svc) => {
                  const isSaving = saving === svc.id
                  const assignedDoc = employees.find((e) => e.id === svc.doctor_membership_id)
                  return (
                    <div
                      key={svc.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 transition-colors',
                        !svc.is_active && 'opacity-50',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground">{svc.title}</p>
                        <p className="text-[11px] text-text-tertiary">
                          {svc.duration_minutes} мин
                          {svc.price != null
                            ? ` · ${svc.price === 0 ? 'Бесплатно' : `${svc.price.toLocaleString('ru-RU')} ₸`}`
                            : ''}
                          {' · '}
                          <span className="font-mono">{svc.code}</span>
                        </p>
                      </div>

                      <select
                        disabled={isSaving || !svc.is_active}
                        className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-primary disabled:opacity-50"
                        value={svc.doctor_membership_id ?? ''}
                        onChange={(e) =>
                          handleAssign(svc, e.target.value ? parseInt(e.target.value) : null)
                        }
                      >
                        <option value="">Общая (все врачи)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {doctorDisplayName(emp)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleToggleActive(svc)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                          svc.is_active
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                            : 'border-border bg-surface-2 text-text-tertiary hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20',
                        )}
                      >
                        {isSaving ? '...' : svc.is_active ? 'Активна' : 'Скрыта'}
                      </button>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-[14px] text-text-tertiary">Ничего не найдено</p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </ClinicShell>
  )
}
