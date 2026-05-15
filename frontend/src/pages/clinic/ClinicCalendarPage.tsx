import { useState, useMemo, useEffect } from 'react'
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
  type Appointment as ApiAppointment,
  type CrmAppointment,
  type Patient,
  type ClinicMembership,
  type ClinicService,
} from '@/api/clinical'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'

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

const HOUR_HEIGHT = 64
const DAY_START = 8
const DAY_END = 18
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
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
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
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
  purple: 'bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20',
  blue:   'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
  green:  'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20',
  amber:  'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
  gray:   'bg-muted/40 border-border',
}

const EVENT_TEXT: Record<string, string> = {
  purple: 'text-violet-700 dark:text-violet-300',
  blue:   'text-blue-700 dark:text-blue-300',
  green:  'text-emerald-700 dark:text-emerald-300',
  amber:  'text-amber-700 dark:text-amber-300',
  gray:   'text-muted-foreground',
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
  lockedDoctorId,
  onClose,
  onSave,
}: {
  date: string
  prefillHour: number | null
  patients: Patient[]
  employees: ClinicMembership[]
  services: ClinicService[]
  lockedDoctorId?: number | null
  onClose: () => void
  onSave: (f: NewApptForm) => Promise<void>
}) {
  const [patientId, setPatientId] = useState<string>(patients[0] ? String(patients[0].id) : '')
  const [doctorId, setDoctorId] = useState<string>(lockedDoctorId ? String(lockedDoctorId) : '')
  const [serviceId, setServiceId] = useState<string>('')
  const [startH, setStartH] = useState(prefillHour ?? 9)
  const [startM, setStartM] = useState(0)
  const [endH, setEndH] = useState((prefillHour ?? 9) + 1)
  const [endM, setEndM] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Пациент *</span>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
              <option value="">— выберите пациента —</option>
              {patients.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {[p.person.last_name, p.person.first_name, p.person.middle_name].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Врач</span>
            {lockedDoctorId ? (
              <input
                readOnly
                value={employees.find((e) => e.id === lockedDoctorId)?.position || employees.find((e) => e.id === lockedDoctorId)?.role_code || ''}
                className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
              />
            ) : (
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}>
                <option value="">— не выбран —</option>
                {employees.filter((e) => e.is_active).map((e) => (
                  <option key={e.id} value={String(e.id)}>{e.position || e.role_code}</option>
                ))}
              </select>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Услуга</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
              <option value="">— не выбрана —</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.title}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Начало</span>
              <div className="flex gap-1">
                <input type="number" min={0} max={23} value={startH} onChange={(e) => setStartH(+e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-[13px] text-center text-foreground focus:outline-none" />
                <span className="py-2 text-muted-foreground text-[13px]">:</span>
                <input type="number" min={0} max={59} step={15} value={startM} onChange={(e) => setStartM(+e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-[13px] text-center text-foreground focus:outline-none" />
              </div>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Конец</span>
              <div className="flex gap-1">
                <input type="number" min={0} max={23} value={endH} onChange={(e) => setEndH(+e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-[13px] text-center text-foreground focus:outline-none" />
                <span className="py-2 text-muted-foreground text-[13px]">:</span>
                <input type="number" min={0} max={59} step={15} value={endM} onChange={(e) => setEndM(+e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-[13px] text-center text-foreground focus:outline-none" />
              </div>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Заметки / причина</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </label>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground hover:bg-accent">Отмена</button>
          <button onClick={() => void save()} disabled={!patientId || saving} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-40">
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
  onSelect,
  onClickFreeSlot,
}: {
  appointments: Appointment[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClickFreeSlot: (hour: number) => void
}) {
  const totalH = (DAY_END - DAY_START) * HOUR_HEIGHT
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
        {HOURS.map((h) => (
          <div key={h} className="absolute inset-x-0 border-t border-border/40" style={{ top: (h - DAY_START) * HOUR_HEIGHT }} />
        ))}
        {HOURS.map((h) => (
          <div key={`${h}h`} className="absolute inset-x-0 border-t border-border/20 border-dashed" style={{ top: (h - DAY_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
        ))}

        {/* Click to create */}
        {HOURS.map((h) => (
          <div
            key={`slot-${h}`}
            className="absolute inset-x-1 cursor-pointer hover:bg-accent/25 rounded transition-colors z-0"
            style={{ top: (h - DAY_START) * HOUR_HEIGHT + 1, height: HOUR_HEIGHT - 2 }}
            onClick={() => onClickFreeSlot(h)}
          />
        ))}

        {/* Events */}
        {appointments.map((a) => {
          const top = timeToY(a.startHour, a.startMin)
          const height = Math.max(durationPx(a.startHour, a.startMin, a.endHour, a.endMin), 28)
          const isSel = a.id === selectedId
          return (
            <button
              key={a.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(a.id) }}
              className={cn(
                'absolute left-2 right-2 rounded-lg border px-2.5 py-1.5 text-left transition-all overflow-hidden z-10',
                EVENT_BG[a.color],
                isSel && 'ring-2 ring-foreground/20 shadow-md scale-[1.01]',
              )}
              style={{ top, height }}
            >
              <div className="flex items-center gap-1">
                <p className={cn('text-[12px] font-semibold leading-tight truncate', EVENT_TEXT[a.color])}>{a.title}</p>
                {a.source === 'crm' && <span className="shrink-0 rounded px-1 text-[8px] font-bold uppercase bg-violet-500/20 text-violet-600">CRM</span>}
              </div>
              <p className={cn('text-[11px] leading-tight truncate opacity-75', EVENT_TEXT[a.color])}>
                {fmtTime(a.startHour, a.startMin)} · {a.service}
              </p>
              {height > 44 && (
                <span className={cn('mt-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium', STATUS_CLS[a.status])}>
                  {STATUS_LABEL[a.status]}
                </span>
              )}
            </button>
          )
        })}

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
  const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const totalH = (DAY_END - DAY_START) * HOUR_HEIGHT

  return (
    <div className="flex">
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
          const isToday = date === today
          return (
            <div key={date} className="flex-1 min-w-0 border-r border-border/40 flex flex-col">
              <button
                onClick={() => onSelectDate(date)}
                className={cn(
                  'flex flex-col items-center py-2 border-b border-border hover:bg-accent transition-colors',
                  isSel && 'bg-accent/50',
                )}
              >
                <span className="text-[10px] text-muted-foreground">{DAYS[idx]}</span>
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold mt-0.5',
                  isToday && !isSel && 'border border-border text-foreground',
                  isSel && 'bg-foreground text-background',
                  !isToday && !isSel && 'text-foreground',
                )}>{dayNum}</span>
              </button>
              <div className="relative" style={{ height: totalH }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/30" style={{ top: (h - DAY_START) * HOUR_HEIGHT }} />
                ))}
                {dayA.map((a) => {
                  const top = timeToY(a.startHour, a.startMin)
                  const height = Math.max(durationPx(a.startHour, a.startMin, a.endHour, a.endMin), 20)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a.id)}
                      className={cn(
                        'absolute inset-x-0.5 rounded px-1 py-0.5 text-left overflow-hidden border',
                        EVENT_BG[a.color],
                        a.id === selectedId && 'ring-1 ring-foreground/30',
                      )}
                      style={{ top, height }}
                    >
                      <p className={cn('text-[10px] font-semibold truncate leading-tight', EVENT_TEXT[a.color])}>{a.title}</p>
                      <p className={cn('text-[9px] truncate opacity-70', EVENT_TEXT[a.color])}>{fmtTime(a.startHour, a.startMin)}</p>
                    </button>
                  )
                })}
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

  const [selectedDate, setSelectedDate] = useState(today)
  const [activeTab, setActiveTab] = useState<CalendarTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [employees, setEmployees] = useState<ClinicMembership[]>([])
  const [services, setServices] = useState<ClinicService[]>([])
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
    ])
      .then(([appts, pats, emps, svcs, crmAppts]) => {
        setPatients(pats)
        setEmployees(emps)
        setServices(svcs)
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
      return dd.toISOString().slice(0, 10)
    })
  }, [selectedDate])

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
    const starts_at = `${form.date}T${pad(form.startH)}:${pad(form.startM)}:00`
    const ends_at = `${form.date}T${pad(form.endH)}:${pad(form.endM)}:00`
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

  function navigateDay(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().slice(0, 10))
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
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-background/80 backdrop-blur shrink-0 flex-wrap gap-y-2">
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
              <button onClick={() => navigateDay(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setSelectedDate(today)} className="h-8 px-3 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-accent">
                Сегодня
              </button>
              <button onClick={() => navigateDay(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground">
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
              <select
                value={doctorFilterId}
                onChange={(e) => setDoctorFilterId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Все врачи</option>
                {employees.filter((e) => e.is_active).map((e) => (
                  <option key={e.id} value={String(e.id)}>{e.position || e.role_code}</option>
                ))}
              </select>
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
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === 'day' ? (
              <DayTimeline
                appointments={dayAppts}
                selectedId={selectedId}
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
          lockedDoctorId={!isManager ? myMembership?.id : null}
          onClose={() => setShowModal(false)}
          onSave={handleAddAppt}
        />
      )}
    </div>
  )
}

export default ClinicCalendarPage
