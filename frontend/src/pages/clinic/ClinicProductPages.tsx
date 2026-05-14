import { useMemo, useState } from 'react'
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

function PatientRow({ patient }: { patient: (typeof patients)[number] }) {
  return (
    <Link
      to={`/clinic/patients/${patient.id}`}
      className="group flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 transition-all hover:bg-surface-hover hover:border-border-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">
        {patient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{patient.name}</p>
        <p className="text-[11px] text-text-tertiary">{patient.iin} · {patient.age} лет · {patient.phone}</p>
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

export function ClinicCalendarPage() {
  type CalendarSelection =
    | { type: 'appointment'; appointment: (typeof calendarSlots)[number] }
    | { type: 'free'; time: string; doctor: string; room: string }

  const [selected, setSelected] = useState<CalendarSelection>({ type: 'appointment', appointment: calendarSlots[1] })
  const [viewMode, setViewMode] = useState('День')
  const [doctorFilter, setDoctorFilter] = useState('Все врачи')
  const [statusFilter, setStatusFilter] = useState<'Все статусы' | VisitStatus>('Все статусы')
  const [draftPatient, setDraftPatient] = useState('')
  const [draftService, setDraftService] = useState('Повторный прием')
  const [draftSaved, setDraftSaved] = useState(false)
  const [appointmentStatuses, setAppointmentStatuses] = useState<Record<string, VisitStatus>>({})
  const [notificationHistory, setNotificationHistory] = useState<Record<string, string[]>>({
    'slot-1030-therapy': ['SMS напоминание доставлено · 09:10', 'WhatsApp подтверждение получено · вчера'],
    'slot-1100-cardio': ['SMS напоминание отправлено · 09:30', 'Предупреждение о долге добавлено · вчера'],
  })

  const visibleDoctors = doctorFilter === 'Все врачи' ? calendarDoctors : calendarDoctors.filter((doctor) => doctor === doctorFilter)

  function withCurrentStatus(slot: (typeof calendarSlots)[number]) {
    return { ...slot, status: appointmentStatuses[slot.id] ?? slot.status }
  }

  function getSlot(time: string, doctor: string) {
    const slot = calendarSlots.find((item) => item.time === time && item.doctor === doctor)
    if (!slot) return undefined
    const currentSlot = withCurrentStatus(slot)
    if (statusFilter !== 'Все статусы' && currentSlot.status !== statusFilter) return undefined
    return currentSlot
  }

  function updateAppointmentStatus(slotId: string, status: VisitStatus, event: string) {
    setAppointmentStatuses((current) => ({ ...current, [slotId]: status }))
    setNotificationHistory((current) => ({
      ...current,
      [slotId]: [`${event} · сейчас`, ...(current[slotId] ?? [])],
    }))
  }

  function sendReminder(slotId: string) {
    setNotificationHistory((current) => ({
      ...current,
      [slotId]: ['SMS напоминание отправлено · сейчас', ...(current[slotId] ?? [])],
    }))
  }

  function selectFreeSlot(time: string, doctor: string) {
    setSelected({ type: 'free', time, doctor, room: doctor === 'Кардиолог' ? '304' : doctor === 'Диагност' ? '108' : '201' })
    setDraftPatient('')
    setDraftService('Повторный прием')
    setDraftSaved(false)
  }

  function saveDraftAppointment() {
    if (!draftPatient.trim()) return
    setDraftSaved(true)
  }

  const selectedAppointment = selected.type === 'appointment' ? withCurrentStatus(selected.appointment) : null

  return (
    <ClinicShell
      eyebrow="Расписание"
      title="Календарь, который сразу показывает узкие места"
      description="День клиники виден по врачам, кабинетам и статусам. Администратор быстро переносит прием, врач видит следующий визит, руководитель видит загрузку."
      actions={<Button onClick={() => selectFreeSlot('12:00', 'Терапевт')}><Plus className="mr-2 h-4 w-4" />Новая запись</Button>}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Свободных окон" value="9" />
        <Metric label="Опоздания" value="2" tone="amber" />
        <Metric label="Кабинеты заняты" value="7/9" tone="blue" />
        <Metric label="Неявки" value="1" tone="red" />
      </section>

      <section className="clinic-os-calendar-workspace">
        <div className="clinic-os-calendar-main">
          <div className="clinic-os-calendar-controls">
            <div>
              <span>Сегодня</span>
              <strong>{viewMode === 'Лист' ? 'Agenda по записям' : 'День по врачам'}</strong>
            </div>
            <div className="clinic-os-segmented">
              {['День', 'Неделя', 'Лист'].map((mode) => (
                <button type="button" className={viewMode === mode ? 'is-active' : undefined} key={mode} onClick={() => setViewMode(mode)}>{mode}</button>
              ))}
            </div>
          </div>

          <div className="clinic-os-toolbar">
            <Search className="h-4 w-4" />
            <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)} aria-label="Фильтр врача">
              {['Все врачи', ...calendarDoctors].map((doctor) => <option key={doctor}>{doctor}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Фильтр статуса">
              {[
                ['Все статусы', 'Все статусы'],
                ['waiting', 'Запланирована'],
                ['confirmed', 'Подтверждена'],
                ['arrived', 'Пациент пришел'],
                ['in-progress', 'На приеме'],
                ['done', 'Завершена'],
                ['payment', 'К оплате'],
                ['canceled', 'Отменена'],
                ['no-show', 'Не явился'],
              ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {viewMode === 'Лист' ? (
            <section className="clinic-os-visit-list">
              {calendarSlots
                .map(withCurrentStatus)
                .filter((slot) => doctorFilter === 'Все врачи' || slot.doctor === doctorFilter)
                .filter((slot) => statusFilter === 'Все статусы' || slot.status === statusFilter)
                .map((slot) => (
                  <button type="button" className="clinic-os-visit-card" key={slot.id} onClick={() => setSelected({ type: 'appointment', appointment: slot })}>
                    <div className="clinic-os-visit-time">{slot.time}</div>
                    <div><strong>{slot.patient}</strong><span>{slot.service} · {slot.doctor} · каб. {slot.room}</span></div>
                    <StatusPill status={slot.status} />
                  </button>
                ))}
            </section>
          ) : (
            <section className="clinic-os-calendar">
              <div className="clinic-os-calendar-row clinic-os-calendar-row--head">
                <span>Время</span>
                {visibleDoctors.map((doctor) => <strong key={doctor}>{doctor}</strong>)}
              </div>
              {calendarTimes.map((time) => (
                <div className="clinic-os-calendar-row" key={time}>
                  <span>{time}</span>
                  {visibleDoctors.map((doctor) => {
                    const slot = getSlot(time, doctor)
                    return (
                      <button
                        type="button"
                        key={`${time}-${doctor}`}
                        className={cn('clinic-os-calendar-slot', slot && 'is-active', selectedAppointment?.id === slot?.id && 'is-selected', selected.type === 'free' && selected.time === time && selected.doctor === doctor && 'is-selected')}
                        onClick={() => {
                          if (slot) setSelected({ type: 'appointment', appointment: slot })
                          else selectFreeSlot(time, doctor)
                        }}
                      >
                        {slot ? (
                          <>
                            <strong>{slot.patient}</strong>
                            <small>{slot.service} · каб. {slot.room}</small>
                            <StatusPill status={slot.status} />
                          </>
                        ) : (
                          <>
                            <strong>Окно доступно</strong>
                            <small>{doctor} · создать запись</small>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </section>
          )}
        </div>

        {selected.type === 'free' ? (
          <aside className="clinic-os-side-panel" aria-label="Создание записи">
            <div className="clinic-os-side-panel-head">
              <div><span>Свободный слот {selected.time}</span><h2>Новая запись</h2></div>
              <button type="button" onClick={() => setSelected({ type: 'appointment', appointment: calendarSlots[1] })} aria-label="Закрыть"><X className="h-4 w-4" /></button>
            </div>
            <div className="clinic-os-detail-list">
              <div><span>Врач</span><strong>{selected.doctor}</strong></div>
              <div><span>Кабинет</span><strong>{selected.room}</strong></div>
              <div><span>Время</span><strong>{selected.time}</strong></div>
            </div>
            <div className="clinic-os-form-grid">
              <label><span>Пациент *</span><input value={draftPatient} onChange={(event) => { setDraftPatient(event.target.value); setDraftSaved(false) }} placeholder="ФИО, ИИН или телефон" /></label>
              <label><span>Услуга</span><input value={draftService} onChange={(event) => { setDraftService(event.target.value); setDraftSaved(false) }} /></label>
            </div>
            <div className="clinic-os-warning">
              <ShieldCheck className="h-4 w-4" />
              <span>{draftPatient.trim() ? 'Конфликтов по врачу и кабинету не найдено.' : 'Укажите пациента, чтобы проверить дубли и конфликты записи.'}</span>
            </div>
            {draftSaved ? <div className="clinic-os-ready-data"><CheckCircle2 className="h-4 w-4" /><span>Черновик записи готов. В реальном API он будет создан из этого слота.</span></div> : null}
            <div className="clinic-os-panel-actions">
              <button className="clinic-os-button" type="button" onClick={saveDraftAppointment} disabled={!draftPatient.trim()}>Создать запись</button>
              <button className="clinic-os-action-row" type="button">Найти пациента <ArrowRight className="h-4 w-4" /></button>
            </div>
          </aside>
        ) : selectedAppointment ? (
          <aside className="clinic-os-side-panel" aria-label="Детали записи">
            <div className="clinic-os-side-panel-head">
              <div>
                <span>Запись {selectedAppointment.time}</span>
                <h2>{selectedAppointment.patient}</h2>
              </div>
              <button type="button" onClick={() => setSelected({ type: 'appointment', appointment: calendarSlots[1] })} aria-label="Сбросить выбор">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="clinic-os-mini-card">
              <UserRound className="h-5 w-5" />
              <div>
                <strong>{selectedAppointment.patient}</strong>
                <span>{selectedAppointment.phone}</span>
              </div>
            </div>

            <div className="clinic-os-detail-list">
              <div><span>Врач</span><strong>{selectedAppointment.doctor}</strong></div>
              <div><span>Услуга</span><strong>{selectedAppointment.service}</strong></div>
              <div><span>Кабинет</span><strong>{selectedAppointment.room}</strong></div>
              <div><span>Статус</span><StatusPill status={selectedAppointment.status} /></div>
            </div>

            <div className="clinic-os-warning">
              <ShieldCheck className="h-4 w-4" />
              <span>{selectedAppointment.warning}</span>
            </div>

            <div className="clinic-os-lifecycle" aria-label="Lifecycle записи">
              <button type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed', 'Запись подтверждена')}>Подтвердить</button>
              <button type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'arrived', 'Пациент отмечен на ресепшн')}>Пришел</button>
              <button type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in-progress', 'Прием начат')}>Начать прием</button>
              <button type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'done', 'Прием завершен')}>Завершить</button>
              <button type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'no-show', 'Отмечена неявка')}>Не явился</button>
              <button type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'canceled', 'Запись отменена')}>Отменить</button>
            </div>

            <div className="clinic-os-notification-history">
              <strong>История уведомлений</strong>
              {(notificationHistory[selectedAppointment.id] ?? ['Уведомлений еще нет']).map((event) => <span key={event}>{event}</span>)}
            </div>

            <div className="clinic-os-panel-actions">
              <Link className="clinic-os-button" to="/clinic/visits/visit-1042">Открыть прием</Link>
              <Link className="clinic-os-button clinic-os-button--ghost" to="/clinic/patients/p-1042">Карта пациента</Link>
              <button className="clinic-os-action-row" type="button" onClick={() => sendReminder(selectedAppointment.id)}>Отправить напоминание <ArrowRight className="h-4 w-4" /></button>
              <button className="clinic-os-action-row" type="button" onClick={() => updateAppointmentStatus(selectedAppointment.id, 'waiting', 'Запись перенесена, требуется подтверждение')}>Перенести запись <ArrowRight className="h-4 w-4" /></button>
            </div>
          </aside>
        ) : null}
      </section>
    </ClinicShell>
  )
}

export function ClinicAppointmentsPage() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VisitStatus>('all')
  const [doctorFilter, setDoctorFilter] = useState('Все врачи')
  const [savedView, setSavedView] = useState('Сегодня')
  const [followUpCreatedFor, setFollowUpCreatedFor] = useState<string | null>(null)

  const journalRows = calendarSlots.map((slot, index) => ({
    ...slot,
    patientId: ['p-1042', 'p-1042', 'p-1188', 'p-1220'][index] ?? 'p-1042',
    appointmentNo: ['APT-0930', 'APT-1030', 'APT-1100', 'APT-1120'][index] ?? `APT-${index + 1}`,
    iin: ['870101300011', '890512450012', '760301300442', '910405401225'][index] ?? '900101300000',
    source: ['Ресепшн', 'Повторный визит', 'CRM', 'Пациентский кабинет'][index] ?? 'Ресепшн',
    payment: slot.status === 'payment' ? 'Ожидает оплату' : 'Оплата OK',
    documents: slot.status === 'done' ? 'Документы готовы' : slot.status === 'in-progress' ? 'Черновик протокола' : 'Нужны документы',
  }))

  const filteredRows = journalRows.filter((row) => {
    if (savedView === 'Не закрыты' && row.status === 'done') return false
    if (savedView === 'К оплате' && row.status !== 'payment') return false
    if (savedView === 'CRM источники' && row.source !== 'CRM') return false
    if (statusFilter !== 'all' && row.status !== statusFilter) return false
    if (doctorFilter !== 'Все врачи' && row.doctor !== doctorFilter) return false
    if (!query.trim()) return true
    const needle = query.trim().toLowerCase()
    return `${row.patient} ${row.appointmentNo} ${row.iin} ${row.phone} ${row.service} ${row.source}`.toLowerCase().includes(needle)
  })

  return (
    <ClinicShell
      eyebrow="Журнал записей"
      title="Операционный журнал записей"
      description="Audit-friendly список приемов: фильтры, статусы, источники, оплата, документы и действия без ухода в календарь. На мобильном это читается как карточки."
      actions={<Button><Download className="mr-2 h-4 w-4" />Экспорт</Button>}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Записей в выборке" value={String(filteredRows.length)} />
        <Metric label="Подтверждены" value={String(journalRows.filter((row) => row.status !== 'waiting').length)} tone="blue" />
        <Metric label="К оплате" value={String(journalRows.filter((row) => row.status === 'payment').length)} tone="amber" />
        <Metric label="Повторный контакт" value={followUpCreatedFor ? '1' : '0'} tone={followUpCreatedFor ? 'mint' : 'blue'} />
      </section>

      <section className="clinic-os-toolbar">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пациент, ИИН, телефон, услуга или источник" />
        <select value={savedView} onChange={(event) => setSavedView(event.target.value)} aria-label="Сохраненное представление">
          {['Сегодня', 'Не закрыты', 'К оплате', 'CRM источники'].map((view) => <option key={view}>{view}</option>)}
        </select>
        <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)} aria-label="Фильтр врача">
          {['Все врачи', ...calendarDoctors].map((doctor) => <option key={doctor}>{doctor}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Фильтр статуса">
          <option value="all">Все статусы</option>
          <option value="waiting">Запланирована</option>
          <option value="confirmed">Подтверждена</option>
          <option value="arrived">Пациент пришел</option>
          <option value="in-progress">На приеме</option>
          <option value="done">Завершена</option>
          <option value="payment">К оплате</option>
          <option value="canceled">Отменена</option>
          <option value="no-show">Не явился</option>
        </select>
      </section>

      <section className="mis-card rounded-xl p-5">
        <div className="clinic-os-patient-list">
          {filteredRows.map((row) => (
            <article className="clinic-os-patient-row" key={row.id}>
              <div className="clinic-os-avatar"><CalendarDays className="h-4 w-4" /></div>
              <div>
                <strong>{row.appointmentNo} · {row.time} · {row.patient}</strong>
                <span>{row.iin} · {row.phone} · {row.service} · {row.source}</span>
              </div>
              <div className="clinic-os-row-note">{row.doctor} · каб. {row.room}</div>
              <StatusPill status={row.status} />
              <div className="clinic-os-row-note">{row.payment} · {row.documents}</div>
              <div className="clinic-os-panel-actions">
                <Link className="clinic-os-button clinic-os-button--ghost" to={`/clinic/patients/${row.patientId}`}>Карта</Link>
                <Link className="clinic-os-button clinic-os-button--ghost" to="/clinic/calendar">Запись</Link>
                <button className="clinic-os-action-row" type="button" onClick={() => setFollowUpCreatedFor(row.id)}>Повторный контакт <ArrowRight className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
          {filteredRows.length === 0 ? (
            <div className="clinic-os-empty-state">
              <Search className="h-8 w-8" />
              <strong>Записей не найдено</strong>
              <p>Измените фильтры или откройте сохраненное представление “Сегодня”.</p>
            </div>
          ) : null}
        </div>
      </section>
    </ClinicShell>
  )
}


export function ClinicPatientsPage() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return patients
    return patients.filter((patient) => `${patient.name} ${patient.iin} ${patient.phone}`.toLowerCase().includes(normalized))
  }, [query])

  return (
    <ClinicShell
      eyebrow="Пациенты"
      title="Пациентская база как рабочий cockpit"
      description="Поиск, риски, долги, ближайшие приемы и быстрый переход в карту пациента. Без потерянных карточек и ручного Excel."
      actions={<Button><Plus className="mr-2 h-4 w-4" />Новый пациент</Button>}
    >
      <section className="clinic-os-toolbar">
        <Search className="h-4 w-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по ФИО, ИИН или телефону" />
      </section>
      <section className="mis-card rounded-xl p-5">
        <div className="clinic-os-patient-list">
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
      actions={<Button><ReceiptText className="mr-2 h-4 w-4" />Новый счет</Button>}
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

export function ClinicDocumentsPage() {
  const [activeTemplate, setActiveTemplate] = useState(templates[0])
  const variables = ['{{patient.fullName}}', '{{doctor.name}}', '{{visit.date}}', '{{diagnosis}}', '{{recommendations}}']
  const missingData = activeTemplate.state === 'Нужна проверка'
    ? ['Не указан диагноз', 'Нет рекомендаций после приема']
    : []

  return (
    <ClinicShell
      eyebrow="Документы"
      title="Шаблонизатор медицинских документов"
      description="Не textarea с кодом, а библиотека шаблонов с переменными, preview, ролями и выпуском документа из приема."
      actions={<Button><FileText className="mr-2 h-4 w-4" />Создать шаблон</Button>}
    >
      <section className="clinic-os-template-builder">
        <aside className="mis-card rounded-xl p-5">
          <div className="clinic-os-panel-head"><div><span>Библиотека</span><h2>Шаблоны</h2></div></div>
          {templates.map((template) => (
            <button
              key={template.title}
              className={cn('clinic-os-template-item', activeTemplate.title === template.title && 'is-active')}
              onClick={() => setActiveTemplate(template)}
            >
              <strong>{template.title}</strong>
              <span>{template.specialty} · {template.usage}</span>
            </button>
          ))}
        </aside>
        <section className="mis-card rounded-xl p-5 min-w-0">
          <div className="clinic-os-panel-head">
            <div><span>{activeTemplate.specialty}</span><h2>{activeTemplate.title}</h2></div>
            <StatusPill status={activeTemplate.state === 'Готов к выпуску' ? 'ready' : 'risk'} />
          </div>
          <div className="clinic-os-template-workbench">
            <div>
              <label><span>Структура документа</span><textarea defaultValue={'Жалобы: {{complaint}}\nОсмотр: {{examination}}\nДиагноз: {{diagnosis}}\nРекомендации: {{recommendations}}'} /></label>
              <div className="clinic-os-variable-list">{variables.map((variable) => <button key={variable}>{variable}</button>)}</div>
              {missingData.length > 0 ? (
                <div className="clinic-os-missing-data">
                  <strong>Недостающие данные</strong>
                  {missingData.map((item) => <span key={item}>{item}</span>)}
                </div>
              ) : (
                <div className="clinic-os-ready-data">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Все обязательные данные доступны для выпуска документа.</span>
                </div>
              )}
            </div>
            <div className="clinic-os-document-preview">
              <div className="clinic-os-preview-toolbar"><Printer className="h-4 w-4" /> Предпросмотр</div>
              <h3>{activeTemplate.title}</h3>
              <p>Пациент: Айгерим Нурланова</p>
              <p>Врач: А. Искадиров</p>
              <p>Диагноз: I10 Эссенциальная гипертензия</p>
              <p>Рекомендации: контроль давления, повторный прием через 14 дней.</p>
            </div>
          </div>
          <div className="clinic-os-document-footer">
            <div>
              <span>Версия 3 · обновлена сегодня</span>
              <strong>Доступ: врач, администратор, руководитель</strong>
            </div>
            <button type="button">Выпустить из приема</button>
          </div>
        </section>
      </section>
    </ClinicShell>
  )
}

export function ClinicAnalyticsPage() {
  return (
    <ClinicShell
      eyebrow="Аналитика"
      title="KPI клиники в языке управленческих решений"
      description="Не просто отчеты, а сигналы: где теряются пациенты, какие врачи перегружены, где проседает касса и что влияет на выручку."
      actions={<Button><ChartNoAxesCombined className="mr-2 h-4 w-4" />Собрать отчет</Button>}
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

export function ClinicSettingsPage() {
  return (
    <ClinicShell
      eyebrow="Справочники"
      title="Настройки клиники, которые держат систему в порядке"
      description="Филиалы, врачи, услуги, кабинеты, цены, роли и печатные формы должны жить здесь, а не расползаться по разным меню."
      actions={<Button><Settings2 className="mr-2 h-4 w-4" />Добавить справочник</Button>}
    >
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
            <article className="clinic-os-setting-card" key={String(label)}>
              <TypedIcon className="h-5 w-5" />
              <strong>{String(label)}</strong>
              <span>Настроить</span>
            </article>
          )
        })}
      </section>
    </ClinicShell>
  )
}
