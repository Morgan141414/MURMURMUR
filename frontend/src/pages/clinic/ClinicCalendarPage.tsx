import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Calendar as CalendarIcon,
  Clock,
  Bell,
  Check,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  listAppointments,
  listCrmAppointments,
  createAppointment,
  updateAppointment,
  listClinicPatients,
  listClinicEmployees,
  listClinicServices,
  listScheduleSlots,
  type Appointment as ApiAppointment,
  type CrmAppointment,
  type Patient,
  type ClinicMembership,
  type ClinicService,
  type ScheduleSlot,
} from '@/api/clinical'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { SearchableSelect } from '@/components/shared/SearchableSelect'
import { TimePicker } from '@/components/shared/TimePicker'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus =
  | 'created'
  | 'confirmed'
  | 'waiting_confirmation'
  | 'arrived'
  | 'started'
  | 'completed'
  | 'canceled'
  | 'no_show'
  | 'rescheduled'

type CalendarTab = 'all' | 'archive'

// Roles that can see all appointments (managers/admins)
const MANAGER_ROLES = new Set(['clinic_founder', 'clinic_ceo', 'chief_doctor', 'reception_admin'])
type ViewMode = 'day' | 'week'

interface Appointment {
  id: string
  title: string
  service: string
  doctor: string
  room: string
  phone: string
  date: string
  startHour: number
  startMin: number
  endHour: number
  endMin: number
  status: AppointmentStatus
  notes: string
  reminder: string
  color: 'purple' | 'blue' | 'green' | 'amber' | 'gray'
  doctorMembershipId: number | null
  source: 'clinic' | 'crm'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 72
const DAY_START = 8
const DAY_END = 22
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  return now
}

function computeColumns(events: Appointment[]): Map<string, { col: number; total: number }> {
  const sorted = [...events].sort(
    (a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin),
  )
  const colEnds: number[] = [] // end-time (minutes) of last event in each column
  const assigned = new Map<string, number>()

  for (const ev of sorted) {
    const start = ev.startHour * 60 + ev.startMin
    const end = ev.endHour * 60 + ev.endMin
    let placed = false
    for (let i = 0; i < colEnds.length; i++) {
      if (colEnds[i] <= start) {
        colEnds[i] = end
        assigned.set(ev.id, i)
        placed = true
        break
      }
    }
    if (!placed) {
      assigned.set(ev.id, colEnds.length)
      colEnds.push(end)
    }
  }

  const result = new Map<string, { col: number; total: number }>()
  for (const ev of sorted) {
    const col = assigned.get(ev.id)!
    const evStart = ev.startHour * 60 + ev.startMin
    const evEnd = ev.endHour * 60 + ev.endMin
    let maxCol = col
    for (const other of sorted) {
      const oStart = other.startHour * 60 + other.startMin
      const oEnd = other.endHour * 60 + other.endMin
      if (oStart < evEnd && oEnd > evStart) {
        const oc = assigned.get(other.id)!
        if (oc > maxCol) maxCol = oc
      }
    }
    result.set(ev.id, { col, total: maxCol + 1 })
  }
  return result
}

// ─── Backend → display transform ──────────────────────────────────────────────

const STATUS_COLOR: Record<AppointmentStatus, Appointment['color']> = {
  created: 'amber',
  waiting_confirmation: 'amber',
  confirmed: 'green',
  arrived: 'blue',
  started: 'blue',
  completed: 'green',
  canceled: 'gray',
  no_show: 'gray',
  rescheduled: 'gray',
}

function parseUtcDate(iso: string) {
  // Ensure treated as UTC
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
}

function transformAppt(
  a: ApiAppointment,
  pats: Patient[],
  emps: ClinicMembership[],
  svcs: ClinicService[],
): Appointment {
  const patient = pats.find((p) => p.id === a.patient_profile_id)
  const emp = emps.find((e) => e.id === a.doctor_membership_id)
  const svc = svcs.find((s) => s.id === a.service_id)

  const patientName = patient
    ? [patient.person.last_name, patient.person.first_name, patient.person.middle_name]
        .filter(Boolean).join(' ')
    : `Пациент #${a.patient_profile_id}`

  const doctorStr = emp ? (emp.position || emp.role_code) : ''

  const start = parseUtcDate(a.starts_at)
  const end = parseUtcDate(a.ends_at)
  const frontendStatus = a.status as AppointmentStatus

  return {
    id: String(a.id),
    title: patientName,
    service: svc?.title ?? '',
    doctor: doctorStr,
    room: '',
    phone: patient?.person.phone ?? '',
    date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    startHour: start.getHours(),
    startMin: start.getMinutes(),
    endHour: end.getHours(),
    endMin: end.getMinutes(),
    status: frontendStatus,
    notes: a.reason ?? '',
    reminder: 'За 15 минут',
    color: STATUS_COLOR[frontendStatus] ?? 'purple',
    doctorMembershipId: a.doctor_membership_id ?? null,
    source: 'clinic',
  }
}

function transformCrmAppt(a: CrmAppointment, emps: ClinicMembership[]): Appointment {
  const emp = emps.find((e) => e.id === a.doctor_membership_id)
  const doctorStr = emp ? (emp.position || emp.role_code) : ''
  const start = parseUtcDate(a.starts_at)
  const end = parseUtcDate(a.ends_at)
  return {
    id: `crm-${a.id}`,
    title: a.lead_name || a.title,
    service: a.title,
    doctor: doctorStr,
    room: '',
    phone: a.lead_mobile ?? '',
    date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    startHour: start.getHours(),
    startMin: start.getMinutes(),
    endHour: end.getHours(),
    endMin: end.getMinutes(),
    status: (a.status as AppointmentStatus) ?? 'created',
    notes: a.notes ?? '',
    reminder: 'За 15 минут',
    color: 'purple',
    doctorMembershipId: a.doctor_membership_id ?? null,
    source: 'crm',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToY(h: number, m: number) {
  return (h - DAY_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
}

function durationPx(sh: number, sm: number, eh: number, em: number) {
  return (eh - sh) * HOUR_HEIGHT + ((em - sm) / 60) * HOUR_HEIGHT
}

function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function dateToStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getMonthCells(year: number, month: number) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevTotal = new Date(year, month, 0).getDate()
  const cells: { day: number; current: boolean }[] = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: prevTotal - firstDow + 1 + i, current: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true })
  while (cells.length < 42) cells.push({ day: cells.length - firstDow - daysInMonth + 1, current: false })
  return cells
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  created: 'Создана',
  waiting_confirmation: 'Ожидает',
  confirmed: 'Подтверждена',
  arrived: 'Пришел',
  started: 'На приеме',
  completed: 'Завершена',
  canceled: 'Отменена',
  no_show: 'Не явился',
  rescheduled: 'Перенесена',
}

const STATUS_CLS: Record<AppointmentStatus, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  created: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  waiting_confirmation: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  arrived: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  started: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  canceled: 'bg-red-500/10 text-red-600 border-red-500/20',
  no_show: 'bg-red-500/10 text-red-600 border-red-500/20',
  rescheduled: 'bg-muted/40 text-muted-foreground border-border',
}

const EVENT_BG: Record<string, string> = {
  purple: 'bg-violet-500/10 border-violet-400/30 dark:border-violet-500/20 border-l-violet-500',
  blue:   'bg-blue-500/10 border-blue-400/30 dark:border-blue-500/20 border-l-blue-500',
  green:  'bg-emerald-500/10 border-emerald-400/30 dark:border-emerald-500/20 border-l-emerald-500',
  amber:  'bg-amber-500/10 border-amber-400/30 dark:border-amber-500/20 border-l-amber-400',
  gray:   'bg-muted/20 border-border/50 border-l-muted-foreground/30',
}

const EVENT_TEXT: Record<string, string> = {
  purple: 'text-violet-700 dark:text-violet-300',
  blue:   'text-blue-700 dark:text-blue-300',
  green:  'text-emerald-700 dark:text-emerald-300',
  amber:  'text-amber-700 dark:text-amber-300',
  gray:   'text-muted-foreground',
}

const STATUS_DOT: Record<AppointmentStatus, string> = {
  created:              'bg-amber-400',
  waiting_confirmation: 'bg-amber-400',
  confirmed:            'bg-emerald-500',
  arrived:              'bg-blue-500',
  started:              'bg-blue-400',
  completed:            'bg-emerald-600',
  canceled:             'bg-red-500',
  no_show:              'bg-red-400',
  rescheduled:          'bg-slate-400',
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDate,
  onSelect,
  datesWithEvents,
}: {
  selectedDate: string
  onSelect: (d: string) => void
  datesWithEvents: Set<string>
}) {
  const today = todayStr()
  const initDate = new Date(selectedDate + 'T00:00:00')
  const [year, setYear] = useState(initDate.getFullYear())
  const [month, setMonth] = useState(initDate.getMonth())

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const cells = getMonthCells(year, month)

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-foreground">{MONTHS[month]} {year}</span>
        <button onClick={next} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const ds = cell.current ? dateToStr(year, month, cell.day) : ''
          const isSel = ds === selectedDate
          const isToday = ds === today
          const hasEv = cell.current && datesWithEvents.has(ds)
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <button
                onClick={() => cell.current && onSelect(ds)}
                disabled={!cell.current}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors',
                  !cell.current && 'text-muted-foreground/30 cursor-default',
                  cell.current && !isSel && !isToday && 'hover:bg-accent text-foreground',
                  isToday && !isSel && 'border border-border font-semibold text-foreground',
                  isSel && 'bg-foreground text-background font-semibold',
                )}
              >
                {cell.day}
              </button>
              {hasEv && (
                <div className={cn('h-1 w-1 rounded-full mt-0.5', isSel ? 'bg-background/60' : 'bg-primary')} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Event Detail ─────────────────────────────────────────────────────────────

function EventDetail({
  appt,
  onClose,
  onStatusChange,
}: {
  appt: Appointment
  onClose: () => void
  onStatusChange: (id: string, status: AppointmentStatus) => void
}) {
  const d = new Date(appt.date + 'T00:00:00')
  const dateLabel = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const LIFECYCLE: { status: AppointmentStatus; label: string }[] = [
    { status: 'confirmed',   label: 'Подтвердить' },
    { status: 'arrived',     label: 'Пришел' },
    { status: 'started',     label: 'Начать прием' },
    { status: 'completed',   label: 'Завершить' },
    { status: 'no_show',     label: 'Не явился' },
    { status: 'canceled',    label: 'Отменить' },
  ]

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug truncate">{appt.title}</h3>
          {appt.source === 'crm' && (
            <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-violet-500/10 text-violet-600 border border-violet-500/20">CRM</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground"><Copy className="h-3 w-3" /></button>
          <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
          <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground"><Pencil className="h-3 w-3" /></button>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground ml-1"><X className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3 w-3 shrink-0" />
          <span className="capitalize">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{fmtTime(appt.startHour, appt.startMin)} — {fmtTime(appt.endHour, appt.endMin)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-3 w-3 shrink-0" />
          <span>{appt.reminder}</span>
        </div>
      </div>

      {/* Patient */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
          {appt.title.split(' ').map((p) => p[0]).join('').slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground truncate">{appt.title}</p>
          <p className="text-[11px] text-muted-foreground">{appt.phone}</p>
        </div>
        <span className={cn(
          'ml-auto inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium shrink-0',
          STATUS_CLS[appt.status],
        )}>
          {STATUS_LABEL[appt.status]}
        </span>
      </div>

      {/* Doctor */}
      <p className="text-[11px] text-muted-foreground">{appt.doctor}</p>

      {/* Notes */}
      <div className="space-y-1 border-t border-border pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">О записи</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{appt.notes}</p>
      </div>

      {/* Lifecycle */}
      {appt.source === 'crm' ? (
        <p className="text-[11px] text-muted-foreground/60 text-center py-1">
          Запись из CRM — управляйте статусом в Qtrix
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {LIFECYCLE.map(({ status, label }) => (
            <button
              key={status}
              onClick={() => onStatusChange(appt.id, status)}
              className={cn(
                'rounded border px-2 py-1.5 text-[10px] font-medium transition-colors',
                appt.status === status
                  ? 'border-foreground/20 bg-foreground/8 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {appt.status === status && <Check className="inline h-2.5 w-2.5 mr-0.5" />}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Links */}
      <div className="flex flex-col gap-1 pt-2 border-t border-border">
        <Link to="/clinic/visits/visit-1042" className="text-[11px] font-medium text-primary hover:underline">
          Открыть прием →
        </Link>
        <Link to="/clinic/patients/p-1042" className="text-[11px] text-muted-foreground hover:text-foreground">
          Карта пациента
        </Link>
      </div>

      {/* Google Calendar — auto-synced, no manual button needed */}
    </div>
  )
}

// ─── New Appointment Modal ────────────────────────────────────────────────────

interface NewApptForm {
  patientProfileId: number
  doctorMembershipId: number | null
  serviceId: number | null
  date: string
  startH: number
  startM: number
  endH: number
  endM: number
  notes: string
}

function NewApptModal({
  date,
  prefillHour,
  patients,
  employees,
  services,
  scheduleSlots,
  lockedDoctorId,
  onClose,
  onSave,
}: {
  date: string
  prefillHour: number | null
  patients: Patient[]
  employees: ClinicMembership[]
  services: ClinicService[]
  scheduleSlots: ScheduleSlot[]
  lockedDoctorId?: number | null
  onClose: () => void
  onSave: (f: NewApptForm) => Promise<void>
}) {
  const [patientId, setPatientId] = useState<string>(patients[0] ? String(patients[0].id) : '')
  const [doctorId, setDoctorId] = useState<string>(lockedDoctorId ? String(lockedDoctorId) : '')
  const [serviceId, setServiceId] = useState<string>('')
  const [durationMin, setDurationMin] = useState(30)
  const [startH, setStartH] = useState(prefillHour ?? 9)
  const [startM, setStartM] = useState(0)
  const [endH, setEndH] = useState(prefillHour ?? 9)
  const [endM, setEndM] = useState(30)

  function applyStartH(h: number) {
    setStartH(h)
    const total = h * 60 + startM + durationMin
    setEndH(Math.floor(total / 60) % 24)
    setEndM(total % 60)
  }
  function applyStartM(m: number) {
    setStartM(m)
    const total = startH * 60 + m + durationMin
    setEndH(Math.floor(total / 60) % 24)
    setEndM(total % 60)
  }
  function applyStart(h: number, m: number) {
    setStartH(h); setStartM(m)
    const total = h * 60 + m + durationMin
    setEndH(Math.floor(total / 60) % 24)
    setEndM(total % 60)
  }
  function applyEnd(h: number, m: number) {
    setEndH(h); setEndM(m)
    setDurationMin(Math.max(0, h * 60 + m - (startH * 60 + startM)))
  }
  function applyEndH(h: number) {
    setEndH(h)
    setDurationMin(Math.max(0, h * 60 + endM - (startH * 60 + startM)))
  }
  function applyEndM(m: number) {
    setEndM(m)
    setDurationMin(Math.max(0, endH * 60 + m - (startH * 60 + startM)))
  }
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Schedule availability check
  const docMid = doctorId ? parseInt(doctorId) : null
  const availability = useMemo(() => {
    if (!docMid) return null
    if (!scheduleSlots.length) return null
    // Local time input → UTC timestamp (getTime() always returns ms-since-epoch in UTC)
    const apptStart = new Date(`${date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`).getTime()
    const apptEnd = new Date(`${date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`).getTime()
    return scheduleSlots.some((s) => {
      if (s.doctor_membership_id !== docMid || s.status !== 'available') return false
      // Slot times are stored as UTC without Z — add Z so browser parses as UTC
      const slotStart = new Date(s.starts_at.endsWith('Z') ? s.starts_at : s.starts_at + 'Z').getTime()
      const slotEnd = new Date(s.ends_at.endsWith('Z') ? s.ends_at : s.ends_at + 'Z').getTime()
      return slotStart <= apptStart && slotEnd >= apptEnd
    })
  }, [docMid, scheduleSlots, date, startH, startM, endH, endM])

  async function save() {
    if (!patientId) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        patientProfileId: parseInt(patientId),
        doctorMembershipId: doctorId ? parseInt(doctorId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        date,
        startH,
        startM,
        endH,
        endM,
        notes,
      })
      onClose()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? (detail as { msg: string }[]).map((d) => d.msg).join('; ')
        : typeof detail === 'string' ? detail : 'Не удалось создать запись'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">Новая запись</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <SearchableSelect
            label="Пациент"
            placeholder="— выберите пациента —"
            value={patientId}
            onChange={setPatientId}
            required
            options={patients.map((p) => ({
              value: String(p.id),
              label: [p.person.last_name, p.person.first_name, p.person.middle_name].filter(Boolean).join(' '),
              sub: p.person.phone ?? undefined,
            }))}
          />
          {lockedDoctorId ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Врач</span>
              <input
                readOnly
                value={employees.find((e) => e.id === lockedDoctorId)?.position || employees.find((e) => e.id === lockedDoctorId)?.role_code || ''}
                className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
              />
            </label>
          ) : (
            <SearchableSelect
              label="Врач"
              placeholder="— не выбран —"
              value={doctorId}
              onChange={setDoctorId}
              options={employees.filter((e) => e.is_active).map((e) => ({
                value: String(e.id),
                label: [e.position, e.role_code].filter(Boolean)[0] ?? '',
                sub: e.department ?? undefined,
              }))}
            />
          )}
          <SearchableSelect
            label="Услуга"
            placeholder="— не выбрана —"
            value={serviceId}
            onChange={setServiceId}
            options={services.map((s) => ({
              value: String(s.id),
              label: s.title,
              sub: s.price ? `${s.price} ₸` : undefined,
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Начало" h={startH} m={startM} onChange={applyStart} />
            <TimePicker label="Конец" h={endH} m={endM} onChange={applyEnd} />
          </div>
          {/* Schedule availability */}
          {docMid !== null && scheduleSlots.length > 0 && (
            <div className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]',
              availability === null
                ? 'bg-muted/50 text-muted-foreground'
                : availability
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-red-500/10 text-red-700 dark:text-red-400',
            )}>
              {availability === null ? (
                <Clock className="h-3.5 w-3.5 shrink-0" />
              ) : availability ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              )}
              {availability === null
                ? 'Расписание не загружено'
                : availability
                ? 'Врач доступен в это время'
                : 'Нет доступного слота в расписании врача'}
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Заметки / причина</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </label>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground hover:bg-accent">Отмена</button>
          <button onClick={() => void save()} disabled={!patientId || saving || availability === false} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-40">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Создать запись
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Timeline ─────────────────────────────────────────────────────────────

function DayTimeline({
  appointments,
  selectedId,
  isToday,
  onSelect,
  onClickFreeSlot,
}: {
  appointments: Appointment[]
  selectedId: string | null
  isToday: boolean
  onSelect: (id: string) => void
  onClickFreeSlot: (hour: number) => void
}) {
  const totalH = (DAY_END - DAY_START) * HOUR_HEIGHT
  const now = useNow()
  const nowY = timeToY(now.getHours(), now.getMinutes())
  const showNow = isToday && nowY >= 0 && nowY <= totalH

  return (
    <div className="flex">
      {/* Time labels */}
      <div className="w-16 shrink-0 relative" style={{ height: totalH }}>
        {HOURS.map((h) => (
          <div key={h} className="absolute w-full flex justify-end pr-3" style={{ top: (h - DAY_START) * HOUR_HEIGHT - 8 }}>
            <span className="text-[11px] text-muted-foreground/50">{h}:00</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 relative border-l border-border" style={{ height: totalH }}>
        {/* Hour lines */}
        {HOURS.map((h) => (
          <div key={h} className="absolute inset-x-0 border-t border-border/40" style={{ top: (h - DAY_START) * HOUR_HEIGHT }} />
        ))}
        {/* Half-hour dashed lines */}
        {HOURS.map((h) => (
          <div key={`${h}h`} className="absolute inset-x-0 border-t border-border/20 border-dashed" style={{ top: (h - DAY_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
        ))}

        {/* Click-to-create slots */}
        {HOURS.map((h) => (
          <div
            key={`slot-${h}`}
            className="group absolute inset-x-1 cursor-pointer hover:bg-accent/20 rounded transition-colors z-0 flex items-center justify-center"
            style={{ top: (h - DAY_START) * HOUR_HEIGHT + 1, height: HOUR_HEIGHT - 2 }}
            onClick={() => onClickFreeSlot(h)}
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors" />
          </div>
        ))}

        {/* Current-time indicator */}
        {showNow && (
          <div className="absolute inset-x-0 flex items-center z-20 pointer-events-none" style={{ top: nowY }}>
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0 shadow-sm" />
            <div className="flex-1 border-t-2 border-red-500/70" />
          </div>
        )}

        {/* Events */}
        {(() => {
          const colMap = computeColumns(appointments)
          return appointments.map((a) => {
            const top = timeToY(a.startHour, a.startMin)
            const height = Math.max(durationPx(a.startHour, a.startMin, a.endHour, a.endMin), 36)
            const isSel = a.id === selectedId
            const { col, total } = colMap.get(a.id) ?? { col: 0, total: 1 }
            const GAP = 4
            const colLeft = `calc(8px + ${col} * ((100% - 16px - ${GAP * (total - 1)}px) / ${total} + ${GAP}px))`
            const colWidth = `calc((100% - 16px - ${GAP * (total - 1)}px) / ${total})`
            return (
              <button
                key={a.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelect(a.id) }}
                className={cn(
                  'absolute rounded-lg border border-l-[3px] text-left transition-all overflow-hidden z-10 backdrop-blur-sm',
                  height < 50 ? 'px-2 py-0 flex items-center' : 'px-2.5 py-1.5',
                  EVENT_BG[a.color],
                  isSel ? 'ring-2 ring-white/20 shadow-lg brightness-110' : 'hover:brightness-110',
                )}
                style={{ top, height, left: colLeft, width: colWidth }}
              >
                {height < 50 ? (
                  /* Compact single-line layout */
                  <div className="flex items-center gap-1.5 min-w-0 w-full">
                    <p className={cn('text-[11px] font-semibold truncate flex-1 leading-none', EVENT_TEXT[a.color])}>{a.title}</p>
                    <p className={cn('text-[10px] opacity-60 shrink-0 whitespace-nowrap leading-none', EVENT_TEXT[a.color])}>
                      {fmtTime(a.startHour, a.startMin)}–{fmtTime(a.endHour, a.endMin)}
                    </p>
                    {a.source === 'crm' && <span className="rounded px-1 text-[8px] font-bold uppercase bg-violet-500/20 text-violet-400 shrink-0">CRM</span>}
                    <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[a.status])} />
                  </div>
                ) : (
                  /* Normal two-line layout */
                  <>
                    <div className="flex items-center gap-1 min-w-0">
                      <p className={cn('text-[12px] font-semibold leading-tight truncate flex-1', EVENT_TEXT[a.color])}>{a.title}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {a.source === 'crm' && <span className="rounded px-1 text-[8px] font-bold uppercase bg-violet-500/20 text-violet-400">CRM</span>}
                        <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[a.status])} />
                      </div>
                    </div>
                    <p className={cn('text-[11px] leading-tight truncate opacity-70 mt-0.5', EVENT_TEXT[a.color])}>
                      {fmtTime(a.startHour, a.startMin)}–{fmtTime(a.endHour, a.endMin)}
                      {a.service ? ` · ${a.service}` : ''}
                    </p>
                  </>
                )}
              </button>
            )
          })
        })()}

        {appointments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground/40">Нет записей на этот день</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Week Timeline ────────────────────────────────────────────────────────────

function WeekTimeline({
  weekDates,
  appointments,
  selectedId,
  selectedDate,
  onSelectDate,
  onSelect,
}: {
  weekDates: string[]
  appointments: Appointment[]
  selectedId: string | null
  selectedDate: string
  onSelectDate: (d: string) => void
  onSelect: (id: string) => void
}) {
  const today = todayStr()
  const now = useNow()
  const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const totalH = (DAY_END - DAY_START) * HOUR_HEIGHT
  const nowY = timeToY(now.getHours(), now.getMinutes())

  return (
    <div className="flex">
      {/* Time axis */}
      <div className="w-14 shrink-0 relative pt-10" style={{ height: totalH + 40 }}>
        {HOURS.map((h) => (
          <div key={h} className="absolute w-full flex justify-end pr-2" style={{ top: 40 + (h - DAY_START) * HOUR_HEIGHT - 8 }}>
            <span className="text-[10px] text-muted-foreground/50">{h}:00</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 border-l border-border">
        {weekDates.map((date, idx) => {
          const dayA = appointments.filter((a) => a.date === date)
          const dayNum = new Date(date + 'T00:00:00').getDate()
          const isSel = date === selectedDate
          const isDayToday = date === today
          const showNow = isDayToday && nowY >= 0 && nowY <= totalH
          return (
            <div key={date} className={cn('flex-1 min-w-0 border-r border-border/40 flex flex-col', isDayToday && 'bg-primary/[0.02]')}>
              {/* Day header */}
              <button
                onClick={() => onSelectDate(date)}
                className={cn(
                  'flex flex-col items-center py-2 border-b border-border hover:bg-accent transition-colors',
                  isSel && 'bg-accent/50',
                )}
              >
                <span className={cn('text-[10px]', isDayToday ? 'text-primary font-semibold' : 'text-muted-foreground')}>{DAYS[idx]}</span>
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold mt-0.5',
                  isDayToday && !isSel && 'bg-primary/10 text-primary',
                  isSel && 'bg-foreground text-background',
                  !isDayToday && !isSel && 'text-foreground',
                )}>{dayNum}</span>
              </button>

              {/* Day grid */}
              <div className="relative" style={{ height: totalH }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/30" style={{ top: (h - DAY_START) * HOUR_HEIGHT }} />
                ))}
                {HOURS.map((h) => (
                  <div key={`${h}h`} className="absolute inset-x-0 border-t border-border/10 border-dashed" style={{ top: (h - DAY_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                ))}

                {/* Now line */}
                {showNow && (
                  <div className="absolute inset-x-0 flex items-center z-20 pointer-events-none" style={{ top: nowY }}>
                    <div className="h-2 w-2 rounded-full bg-red-500 -ml-[4px] shrink-0" />
                    <div className="flex-1 border-t-2 border-red-500/60" />
                  </div>
                )}

                {(() => {
                  const colMap = computeColumns(dayA)
                  return dayA.map((a) => {
                    const top = timeToY(a.startHour, a.startMin)
                    const height = Math.max(durationPx(a.startHour, a.startMin, a.endHour, a.endMin), 24)
                    const { col, total } = colMap.get(a.id) ?? { col: 0, total: 1 }
                    const GAP = 2
                    const colLeft = `calc(2px + ${col} * ((100% - 4px - ${GAP * (total - 1)}px) / ${total} + ${GAP}px))`
                    const colWidth = `calc((100% - 4px - ${GAP * (total - 1)}px) / ${total})`
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a.id)}
                        className={cn(
                          'absolute rounded border border-l-[2px] px-1 py-0.5 text-left overflow-hidden transition-all',
                          EVENT_BG[a.color],
                          a.id === selectedId ? 'ring-1 ring-white/20 brightness-110' : 'hover:brightness-110',
                        )}
                        style={{ top, height, left: colLeft, width: colWidth }}
                      >
                        <div className="flex items-center gap-0.5 min-w-0">
                          <p className={cn('text-[10px] font-semibold truncate flex-1 leading-tight', EVENT_TEXT[a.color])}>{a.title}</p>
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[a.status])} />
                        </div>
                        {height >= 32 && (
                          <p className={cn('text-[9px] truncate opacity-60 leading-tight', EVENT_TEXT[a.color])}>
                            {fmtTime(a.startHour, a.startMin)}–{fmtTime(a.endHour, a.endMin)}
                          </p>
                        )}
                      </button>
                    )
                  })
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClinicCalendarPage() {
  const today = todayStr()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const userId = useAuthStore((s) => s.userId)
  const clinicId = useMemo(() => (activeOrgId ? Number(activeOrgId) : null), [activeOrgId])

  const isManager = activeRole ? MANAGER_ROLES.has(activeRole) : false

  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeTab, setActiveTab] = useState<CalendarTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [employees, setEmployees] = useState<ClinicMembership[]>([])
  const [services, setServices] = useState<ClinicService[]>([])
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [prefillHour, setPrefillHour] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [doctorFilterId, setDoctorFilterId] = useState<string>('')

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)
    Promise.all([
      listAppointments(clinicId).then((r) => r.data),
      listClinicPatients(clinicId).then((r) => r.data),
      listClinicEmployees(clinicId).then((r) => r.data),
      listClinicServices(clinicId).then((r) => r.data),
      listCrmAppointments(clinicId).then((r) => r.data).catch(() => [] as CrmAppointment[]),
      listScheduleSlots(clinicId).then((r) => r.data).catch(() => [] as ScheduleSlot[]),
    ])
      .then(([appts, pats, emps, svcs, crmAppts, slots]) => {
        setPatients(pats)
        setEmployees(emps)
        setServices(svcs)
        setScheduleSlots(slots)
        const clinic = appts.map((a) => transformAppt(a, pats, emps, svcs))
        const crm = crmAppts.map((a) => transformCrmAppt(a, emps))
        setAppointments([...clinic, ...crm])
      })
      .catch(() => {/* silently ignore load errors */})
      .finally(() => setLoading(false))
  }, [clinicId])

  const myMembership = useMemo(
    () => employees.find((e) => e.account_id === Number(userId)) ?? null,
    [employees, userId],
  )

  const roleFiltered = useMemo(() => {
    // Doctor: only see own appointments
    if (!isManager && myMembership) {
      return appointments.filter((a) => a.doctorMembershipId === myMembership.id)
    }
    // Manager with doctor filter applied
    if (isManager && doctorFilterId) {
      return appointments.filter((a) => a.doctorMembershipId === Number(doctorFilterId))
    }
    return appointments
  }, [appointments, isManager, myMembership, doctorFilterId])

  const tabFiltered = useMemo(() => {
    if (activeTab === 'archive') return roleFiltered.filter((a) => ['completed','canceled','no_show','rescheduled'].includes(a.status))
    // 'all' tab: exclude archived statuses
    return roleFiltered.filter((a) => !['completed','canceled','no_show','rescheduled'].includes(a.status))
  }, [roleFiltered, activeTab])

  const filtered = useMemo(() => {
    if (!search.trim()) return tabFiltered
    const q = search.toLowerCase()
    return tabFiltered.filter((a) => `${a.title} ${a.service} ${a.doctor} ${a.phone}`.toLowerCase().includes(q))
  }, [tabFiltered, search])

  const dayAppts = useMemo(() => filtered.filter((a) => a.date === selectedDate), [filtered, selectedDate])

  const weekDates = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    const dow = (d.getDay() + 6) % 7
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d)
      dd.setDate(d.getDate() - dow + i)
      return dateToStr(dd.getFullYear(), dd.getMonth(), dd.getDate())
    })
  }, [selectedDate])

  // Auto-scroll: on day change scroll to current time (today) or first appointment
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    let targetY: number
    if (selectedDate === today) {
      targetY = timeToY(now.getHours(), now.getMinutes()) - 120
    } else {
      const first = [...dayAppts].sort((a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin))[0]
      targetY = first ? timeToY(first.startHour, first.startMin) - 80 : 0
    }
    el.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
  }, [selectedDate, today])

  const selectedAppt = appointments.find((a) => a.id === selectedId) ?? null
  const datesWithEvents = useMemo(() => new Set(appointments.map((a) => a.date)), [appointments])

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    // Optimistic update
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    if (clinicId) {
      try {
        await updateAppointment(clinicId, parseInt(id), { status })
      } catch {
        // Revert on failure
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: a.status } : a))
      }
    }
  }

  async function handleAddAppt(form: NewApptForm) {
    if (!clinicId) throw new Error('No clinic selected')
    const pad = (n: number) => String(n).padStart(2, '0')
    // Parse as local time then convert to UTC (backend stores naive UTC strings)
    const toUtcStr = (date: string, h: number, m: number) =>
      new Date(`${date}T${pad(h)}:${pad(m)}:00`).toISOString().slice(0, 19)
    const starts_at = toUtcStr(form.date, form.startH, form.startM)
    const ends_at = toUtcStr(form.date, form.endH, form.endM)
    const { data } = await createAppointment(clinicId, {
      patient_profile_id: form.patientProfileId,
      doctor_membership_id: form.doctorMembershipId,
      service_id: form.serviceId,
      starts_at,
      ends_at,
      reason: form.notes || undefined,
      status: 'created',
    })
    setAppointments((prev) => [...prev, transformAppt(data, patients, employees, services)])
  }

  function navigate(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta * (viewMode === 'week' ? 7 : 1))
    setSelectedDate(dateToStr(d.getFullYear(), d.getMonth(), d.getDate()))
  }

  const dd = new Date(selectedDate + 'T00:00:00')
  const monthShort = dd.toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase().replace('.', '')
  const dayNum = dd.getDate()
  const fullDate = dd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const weekday = dd.toLocaleDateString('ru-RU', { weekday: 'long' })

  const TABS: { key: CalendarTab; label: string }[] = [
    { key: 'all',     label: isManager ? 'Активные' : 'Мои записи' },
    { key: 'archive', label: 'Архив' },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 pt-5 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-[22px] font-bold text-foreground">Календарь</h1>
          <div className="relative hidden sm:flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="h-9 w-56 rounded-lg border border-border bg-background pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="absolute right-2.5 text-[10px] text-muted-foreground/50 font-mono">⌘K</span>
          </div>
        </div>
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
                activeTab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Timeline area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Controls */}
          <div className="relative z-20 flex items-center gap-2 px-6 py-3 border-b border-border bg-background/80 backdrop-blur shrink-0 flex-wrap gap-y-2">
            {/* Date badge */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border border-border bg-card shrink-0">
                <span className="text-[9px] font-bold text-primary uppercase leading-none">{monthShort}</span>
                <span className="text-[20px] font-bold text-foreground leading-tight">{dayNum}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[14px] font-semibold text-foreground leading-tight">{fullDate}</p>
                <p className="text-[12px] text-muted-foreground capitalize">{weekday}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setSelectedDate(today)} className="h-8 px-3 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-accent">
                Сегодня
              </button>
              <button onClick={() => navigate(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {(['day', 'week'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 h-8 text-[12px] font-medium transition-colors',
                    viewMode === mode ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {mode === 'day' ? 'День' : 'Неделя'}
                </button>
              ))}
            </div>

            {isManager && (
              <SearchableSelect
                compact
                label="Врач"
                placeholder="Все врачи"
                value={doctorFilterId}
                onChange={setDoctorFilterId}
                options={employees.filter((e) => e.is_active).map((e) => ({
                  value: String(e.id),
                  label: e.position || e.role_code,
                  sub: e.department || undefined,
                }))}
              />
            )}

            <button
              onClick={() => { setPrefillHour(null); setShowModal(true) }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-foreground text-background text-[12px] font-medium hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Новая запись</span>
              <span className="sm:hidden">Добавить</span>
            </button>
          </div>

          {/* Timeline scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === 'day' ? (
              <DayTimeline
                appointments={dayAppts}
                selectedId={selectedId}
                isToday={selectedDate === today}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                onClickFreeSlot={(h) => { setPrefillHour(h); setShowModal(true) }}
              />
            ) : (
              <WeekTimeline
                weekDates={weekDates}
                appointments={filtered}
                selectedId={selectedId}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              />
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-border flex flex-col overflow-y-auto bg-background">
          <div className="p-4 border-b border-border">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              datesWithEvents={datesWithEvents}
            />
          </div>
          <div className="p-4 flex-1">
            {selectedAppt ? (
              <EventDetail
                appt={selectedAppt}
                onClose={() => setSelectedId(null)}
                onStatusChange={(id, s) => void handleStatusChange(id, s)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-28 text-center gap-2">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground/60">Выберите запись для деталей</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <NewApptModal
          date={selectedDate}
          prefillHour={prefillHour}
          patients={patients}
          employees={employees}
          services={services}
          scheduleSlots={scheduleSlots}
          lockedDoctorId={!isManager ? myMembership?.id : null}
          onClose={() => setShowModal(false)}
          onSave={handleAddAppt}
        />
      )}
    </div>
  )
}

export default ClinicCalendarPage
