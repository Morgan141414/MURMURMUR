import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Stethoscope, UserRound } from 'lucide-react'
import type { Appointment, ClinicMembership, Patient, ScheduleSlot } from '@/api/clinical'
import { Button } from '@/components/ui/button'

const DAY_MS = 24 * 60 * 60 * 1000
const CALENDAR_START_HOUR = 8
const CALENDAR_END_HOUR = 20
const SLOT_MINUTES = 30
const DOCTOR_ROLES = new Set(['clinic_founder', 'clinic_ceo', 'chief_doctor', 'doctor'])

type CalendarMode = 'week' | 'day'

type CalendarCellKind = 'empty' | 'slot' | 'appointment' | 'blocked'

interface CalendarCellEvent {
  id: string
  kind: CalendarCellKind
  title: string
  subtitle: string
  startsAt: Date
  endsAt: Date
  doctorMembershipId?: number | null
  source?: ScheduleSlot | Appointment
}

interface ClinicCalendarProps {
  appointments: Appointment[]
  employees: ClinicMembership[]
  patients: Patient[]
  scheduleSlots: ScheduleSlot[]
  onSelectWindow: (startsAt: Date, doctorMembershipId?: number | null) => void
  onSelectSlot: (slot: ScheduleSlot) => void
  onSelectAppointment: (appointment: Appointment) => void
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'short' }).format(date)
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function overlapsWindow(startsAt: Date, endsAt: Date, windowStart: Date, windowEnd: Date) {
  return startsAt < windowEnd && endsAt > windowStart
}

function patientName(patient: Patient | undefined) {
  if (!patient) return 'Пациент'
  return `${patient.person.last_name} ${patient.person.first_name}`.trim()
}

function doctorLabel(employee: ClinicMembership | undefined) {
  if (!employee) return 'Врач не выбран'
  return employee.position || employee.department || `Сотрудник #${employee.id}`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    available: 'Свободно',
    booked: 'Занято',
    blocked: 'Блок',
    canceled: 'Отменено',
    scheduled: 'Запланировано',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    no_show: 'Неявка',
  }
  return labels[status] || status
}

function eventClassName(kind: CalendarCellKind) {
  if (kind === 'appointment') return 'border-blue-200 bg-blue-50 text-blue-900 shadow-blue-100/70'
  if (kind === 'blocked') return 'border-amber-200 bg-amber-50 text-amber-900 shadow-amber-100/70'
  if (kind === 'slot') return 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-100/70'
  return 'border-slate-100 bg-white text-slate-700'
}

export function ClinicCalendar({
  appointments,
  employees,
  patients,
  scheduleSlots,
  onSelectWindow,
  onSelectSlot,
  onSelectAppointment,
}: ClinicCalendarProps) {
  const [mode, setMode] = useState<CalendarMode>('week')
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()))
  const [doctorFilter, setDoctorFilter] = useState('all')

  const doctors = useMemo(
    () => employees.filter((employee) => employee.is_active && DOCTOR_ROLES.has(employee.role_code)),
    [employees],
  )

  const selectedDoctorId = doctorFilter === 'all' ? null : Number(doctorFilter)
  const visibleDays = useMemo(() => {
    if (mode === 'day') return [startOfDay(anchorDate)]
    const weekStart = startOfWeek(anchorDate)
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  }, [anchorDate, mode])

  const timeRows = useMemo(() => {
    const rows: Date[] = []
    for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour += 1) {
      for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
        const date = startOfDay(anchorDate)
        date.setHours(hour, minute, 0, 0)
        rows.push(date)
      }
    }
    return rows
  }, [anchorDate])

  const calendarEvents = useMemo<CalendarCellEvent[]>(() => {
    const patientById = new Map(patients.map((patient) => [patient.id, patient]))
    const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]))
    const slotEvents = scheduleSlots
      .filter((slot) => !selectedDoctorId || slot.doctor_membership_id === selectedDoctorId)
      .map((slot): CalendarCellEvent => ({
        id: `slot-${slot.id}`,
        kind: slot.status === 'blocked' ? 'blocked' : 'slot',
        title: statusLabel(slot.status),
        subtitle: `${doctorLabel(doctorById.get(slot.doctor_membership_id))}${slot.note ? ` · ${slot.note}` : ''}`,
        startsAt: new Date(slot.starts_at),
        endsAt: new Date(slot.ends_at),
        doctorMembershipId: slot.doctor_membership_id,
        source: slot,
      }))
    const appointmentEvents = appointments
      .filter((appointment) => !selectedDoctorId || appointment.doctor_membership_id === selectedDoctorId)
      .map((appointment): CalendarCellEvent => ({
        id: `appointment-${appointment.id}`,
        kind: 'appointment',
        title: patientName(patientById.get(appointment.patient_profile_id)),
        subtitle: `${statusLabel(appointment.status)}${appointment.reason ? ` · ${appointment.reason}` : ''}`,
        startsAt: new Date(appointment.starts_at),
        endsAt: new Date(appointment.ends_at),
        doctorMembershipId: appointment.doctor_membership_id,
        source: appointment,
      }))
    return [...slotEvents, ...appointmentEvents].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }, [appointments, doctors, patients, scheduleSlots, selectedDoctorId])

  function moveCalendar(direction: -1 | 1) {
    setAnchorDate((current) => addDays(current, direction * (mode === 'week' ? 7 : 1)))
  }

  function handleCellClick(day: Date, row: Date) {
    const startsAt = startOfDay(day)
    startsAt.setHours(row.getHours(), row.getMinutes(), 0, 0)
    onSelectWindow(startsAt, selectedDoctorId)
  }

  function eventsForCell(day: Date, row: Date) {
    const windowStart = startOfDay(day)
    windowStart.setHours(row.getHours(), row.getMinutes(), 0, 0)
    const windowEnd = new Date(windowStart.getTime() + SLOT_MINUTES * 60 * 1000)
    return calendarEvents.filter((event) => isSameDay(event.startsAt, day) && overlapsWindow(event.startsAt, event.endsAt, windowStart, windowEnd))
  }

  return (
    <section className="rounded-[28px] border border-cyan-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Календарь приёмов</h3>
            <p className="text-sm text-slate-500">Недельная сетка, фильтр врача и быстрый выбор окна для записи</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={doctorFilter}
            onChange={(event) => setDoctorFilter(event.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">Все врачи</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={String(doctor.id)}>{doctorLabel(doctor)}</option>
            ))}
          </select>
          <div className="rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('week')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'week' ? 'bg-white text-cyan-800 shadow-sm' : 'text-slate-500'}`}
            >
              Неделя
            </button>
            <button
              type="button"
              onClick={() => setMode('day')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === 'day' ? 'bg-white text-cyan-800 shadow-sm' : 'text-slate-500'}`}
            >
              День
            </button>
          </div>
          <Button variant="outline" onClick={() => moveCalendar(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setAnchorDate(startOfDay(new Date()))}>Сегодня</Button>
          <Button variant="outline" onClick={() => moveCalendar(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          <Stethoscope className="mb-1 h-4 w-4" />
          Врачей в фильтре: <span className="font-bold">{doctors.length}</span>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <Clock3 className="mb-1 h-4 w-4" />
          Свободных слотов: <span className="font-bold">{scheduleSlots.filter((slot) => slot.status === 'available').length}</span>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <UserRound className="mb-1 h-4 w-4" />
          Записей в календаре: <span className="font-bold">{appointments.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200">
        <div className="min-w-[920px]">
          <div className="grid border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns: `90px repeat(${visibleDays.length}, minmax(120px, 1fr))` }}>
            <div className="px-3 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Время</div>
            {visibleDays.map((day) => (
              <div key={day.toISOString()} className={`px-3 py-3 text-sm font-bold ${isSameDay(day, new Date()) ? 'text-cyan-800' : 'text-slate-700'}`}>
                {formatDay(day)}
              </div>
            ))}
          </div>

          {timeRows.map((row) => (
            <div key={`${row.getHours()}-${row.getMinutes()}`} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: `90px repeat(${visibleDays.length}, minmax(120px, 1fr))` }}>
              <div className="bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">{formatTime(row)}</div>
              {visibleDays.map((day) => {
                const events = eventsForCell(day, row)
                return (
                  <button
                    key={`${day.toISOString()}-${row.toISOString()}`}
                    type="button"
                    onClick={() => handleCellClick(day, row)}
                    className="min-h-16 border-l border-slate-100 bg-white p-1.5 text-left transition hover:bg-cyan-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300"
                  >
                    <div className="space-y-1">
                      {events.length === 0 ? <span className="text-[11px] text-slate-300">+</span> : null}
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          role="button"
                          tabIndex={0}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            if (event.kind === 'appointment') onSelectAppointment(event.source as Appointment)
                            if (event.kind === 'slot' || event.kind === 'blocked') onSelectSlot(event.source as ScheduleSlot)
                          }}
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key !== 'Enter') return
                            keyEvent.stopPropagation()
                            if (event.kind === 'appointment') onSelectAppointment(event.source as Appointment)
                            if (event.kind === 'slot' || event.kind === 'blocked') onSelectSlot(event.source as ScheduleSlot)
                          }}
                          className={`rounded-xl border px-2 py-1.5 text-[11px] shadow-sm ${eventClassName(event.kind)}`}
                        >
                          <p className="truncate font-bold">{event.title}</p>
                          <p className="truncate opacity-80">{formatTime(event.startsAt)} · {event.subtitle}</p>
                        </div>
                      ))}
                      {events.length > 2 ? <p className="px-2 text-[11px] font-semibold text-slate-400">+{events.length - 2} ещё</p> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
