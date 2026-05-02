import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, CalendarCheck2, ClipboardPlus, FileText, HeartPulse, Loader2, RefreshCw, Stethoscope, UserRoundPlus, UsersRound } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  attachPatientToClinic,
  createAppointment,
  createMedicalRecord,
  createPatient,
  createScheduleSlot,
  listAppointments,
  listClinicEmployees,
  listClinicPatients,
  listMedicalRecords,
  listScheduleSlots,
  type Appointment,
  type ClinicMembership,
  type MedicalRecordEntry,
  type Patient,
  type ScheduleSlot,
} from '@/api/clinical'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  )
}

const inputClass = 'mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100'

export default function ClinicalWorkspacePage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const clinicId = useMemo(() => {
    if (!activeOrgId) return null
    const parsed = Number(activeOrgId)
    return Number.isFinite(parsed) ? parsed : null
  }, [activeOrgId])

  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordEntry[]>([])
  const [employees, setEmployees] = useState<ClinicMembership[]>([])
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(false)

  const [patientIin, setPatientIin] = useState('')
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')

  const [appointmentPatientId, setAppointmentPatientId] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentReason, setAppointmentReason] = useState('')

  const [slotDoctorMembershipId, setSlotDoctorMembershipId] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [slotDuration, setSlotDuration] = useState('30')
  const [slotNote, setSlotNote] = useState('')

  const [recordPatientId, setRecordPatientId] = useState('')
  const [recordAppointmentId, setRecordAppointmentId] = useState('')
  const [recordDiagnosis, setRecordDiagnosis] = useState('')
  const [recordConclusion, setRecordConclusion] = useState('')

  async function refreshClinicalData() {
    if (!clinicId) return
    setLoading(true)
    try {
      const [
        patientsResponse,
        appointmentsResponse,
        medicalRecordsResponse,
        employeesResponse,
        scheduleSlotsResponse,
      ] = await Promise.all([
        listClinicPatients(clinicId),
        listAppointments(clinicId),
        listMedicalRecords(clinicId),
        listClinicEmployees(clinicId),
        listScheduleSlots(clinicId),
      ])
      setPatients(patientsResponse.data)
      setAppointments(appointmentsResponse.data)
      setMedicalRecords(medicalRecordsResponse.data)
      setEmployees(employeesResponse.data)
      setScheduleSlots(scheduleSlotsResponse.data)
    } catch {
      toast.error('Не удалось загрузить клинические данные')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshClinicalData()
  }, [clinicId])

  async function handleCreatePatient() {
    if (!clinicId) return
    if (!patientIin || !patientFirstName || !patientLastName) {
      toast.error('Заполните ИИН, имя и фамилию пациента')
      return
    }
    try {
      const patientResponse = await createPatient({
        iin: patientIin.trim(),
        first_name: patientFirstName.trim(),
        last_name: patientLastName.trim(),
      })
      await attachPatientToClinic(clinicId, patientResponse.data.id)
      toast.success('Пациент создан и привязан к клинике')
      setPatientIin('')
      setPatientFirstName('')
      setPatientLastName('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось создать пациента')
    }
  }

  async function handleCreateAppointment() {
    if (!clinicId) return
    const patientId = Number(appointmentPatientId)
    if (!patientId || !appointmentDate) {
      toast.error('Выберите пациента и дату записи')
      return
    }
    const startsAt = new Date(appointmentDate)
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000)
    try {
      await createAppointment(clinicId, {
        patient_profile_id: patientId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: appointmentReason || undefined,
      })
      toast.success('Запись создана')
      setAppointmentDate('')
      setAppointmentReason('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось создать запись')
    }
  }

  async function handleCreateScheduleSlot() {
    if (!clinicId) return
    const doctorMembershipId = Number(slotDoctorMembershipId)
    const durationMinutes = Number(slotDuration) || 30
    if (!doctorMembershipId || !slotDate) {
      toast.error('Выберите врача и время слота')
      return
    }
    const startsAt = new Date(slotDate)
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000)
    try {
      await createScheduleSlot(clinicId, {
        doctor_membership_id: doctorMembershipId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        note: slotNote || undefined,
      })
      toast.success('Слот расписания создан')
      setSlotDate('')
      setSlotNote('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось создать слот. Возможно, время пересекается с другим слотом врача.')
    }
  }

  async function handleCreateMedicalRecord() {
    if (!clinicId) return
    const patientId = Number(recordPatientId)
    const appointmentId = recordAppointmentId ? Number(recordAppointmentId) : null
    if (!patientId || !recordDiagnosis) {
      toast.error('Выберите пациента и заполните диагноз')
      return
    }
    try {
      await createMedicalRecord(clinicId, {
        patient_profile_id: patientId,
        appointment_id: appointmentId,
        diagnosis: recordDiagnosis,
        conclusion: recordConclusion || undefined,
      })
      toast.success('Запись в медкарте создана')
      setRecordDiagnosis('')
      setRecordConclusion('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось добавить запись в медкарту')
    }
  }

  const todayAppointments = appointments.filter((appointment) =>
    new Date(appointment.starts_at).toDateString() === new Date().toDateString(),
  ).length
  const availableDoctors = employees.filter((employee) =>
    ['clinic_founder', 'clinic_ceo', 'chief_doctor', 'doctor'].includes(employee.role_code),
  )
  const todaySlots = scheduleSlots.filter((slot) =>
    new Date(slot.starts_at).toDateString() === new Date().toDateString(),
  ).length

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50 to-emerald-50 p-6 shadow-xl shadow-cyan-100/60 lg:p-8">
        <PageHeader
          title="Клинический кабинет"
          description="Пациенты, записи, расписание и базовая медкарта в одном медицинском рабочем месте."
          eyebrow="Saphena M.I.S."
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void refreshClinicalData()} disabled={!clinicId || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {loading ? 'Загрузка...' : 'Обновить данные'}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm">
          <UsersRound className="h-6 w-6 text-cyan-700" />
          <p className="mt-4 text-sm text-slate-500">Пациенты</p>
          <p className="text-3xl font-bold text-slate-950">{patients.length}</p>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <CalendarCheck2 className="h-6 w-6 text-blue-700" />
          <p className="mt-4 text-sm text-slate-500">Записи сегодня</p>
          <p className="text-3xl font-bold text-slate-950">{todayAppointments}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <FileText className="h-6 w-6 text-emerald-700" />
          <p className="mt-4 text-sm text-slate-500">Записи медкарты</p>
          <p className="text-3xl font-bold text-slate-950">{medicalRecords.length}</p>
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
          <CalendarClock className="h-6 w-6 text-indigo-700" />
          <p className="mt-4 text-sm text-slate-500">Слоты расписания</p>
          <p className="text-3xl font-bold text-slate-950">{scheduleSlots.length}</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Новый пациент</h3>
              <p className="text-sm text-slate-500">Создание пациента и прикрепление к клинике</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <FieldLabel label="ИИН пациента"><input value={patientIin} onChange={(event) => setPatientIin(event.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12 цифр" className={inputClass} /></FieldLabel>
            <FieldLabel label="Имя"><input value={patientFirstName} onChange={(event) => setPatientFirstName(event.target.value)} placeholder="Аман" className={inputClass} /></FieldLabel>
            <FieldLabel label="Фамилия"><input value={patientLastName} onChange={(event) => setPatientLastName(event.target.value)} placeholder="Иванов" className={inputClass} /></FieldLabel>
          </div>
          <Button className="mt-4" onClick={() => void handleCreatePatient()} disabled={!clinicId}>Создать пациента</Button>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Новая запись на приём</h3>
              <p className="text-sm text-slate-500">30-минутный слот с причиной обращения</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FieldLabel label="Пациент">
              <select value={appointmentPatientId} onChange={(event) => setAppointmentPatientId(event.target.value)} className={inputClass}>
                <option value="">Выберите пациента</option>
                {patients.map((patient) => <option key={patient.id} value={String(patient.id)}>{patient.person.last_name} {patient.person.first_name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Дата и время"><input type="datetime-local" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} className={inputClass} /></FieldLabel>
            <FieldLabel label="Причина"><input value={appointmentReason} onChange={(event) => setAppointmentReason(event.target.value)} placeholder="Первичный приём" className={inputClass} /></FieldLabel>
          </div>
          <Button className="mt-4" onClick={() => void handleCreateAppointment()} disabled={!clinicId}>Создать запись</Button>
        </section>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Рабочий слот врача</h3>
            <p className="text-sm text-slate-500">Планируйте доступные окна врача без пересечений</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FieldLabel label="Врач">
            <select value={slotDoctorMembershipId} onChange={(event) => setSlotDoctorMembershipId(event.target.value)} className={inputClass}>
              <option value="">Выберите врача</option>
              {availableDoctors.map((employee) => <option key={employee.id} value={String(employee.id)}>#{employee.id} {employee.position || employee.role_code}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Дата и время"><input type="datetime-local" value={slotDate} onChange={(event) => setSlotDate(event.target.value)} className={inputClass} /></FieldLabel>
          <FieldLabel label="Длительность">
            <select value={slotDuration} onChange={(event) => setSlotDuration(event.target.value)} className={inputClass}>
              <option value="15">15 минут</option>
              <option value="30">30 минут</option>
              <option value="45">45 минут</option>
              <option value="60">60 минут</option>
            </select>
          </FieldLabel>
          <FieldLabel label="Комментарий"><input value={slotNote} onChange={(event) => setSlotNote(event.target.value)} placeholder="Приём терапевта" className={inputClass} /></FieldLabel>
        </div>
        <Button className="mt-4" onClick={() => void handleCreateScheduleSlot()} disabled={!clinicId}>Создать слот</Button>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ClipboardPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Запись в базовой медкарте</h3>
            <p className="text-sm text-slate-500">Диагноз, заключение и связь с приёмом</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FieldLabel label="Пациент">
            <select value={recordPatientId} onChange={(event) => setRecordPatientId(event.target.value)} className={inputClass}>
              <option value="">Выберите пациента</option>
              {patients.map((patient) => <option key={patient.id} value={String(patient.id)}>{patient.person.last_name} {patient.person.first_name}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Приём">
            <select value={recordAppointmentId} onChange={(event) => setRecordAppointmentId(event.target.value)} className={inputClass}>
              <option value="">Связать с записью</option>
              {appointments.map((appointment) => <option key={appointment.id} value={String(appointment.id)}>#{appointment.id} · {new Date(appointment.starts_at).toLocaleString('ru-RU')}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Диагноз"><input value={recordDiagnosis} onChange={(event) => setRecordDiagnosis(event.target.value)} placeholder="Диагноз" className={inputClass} /></FieldLabel>
          <FieldLabel label="Заключение"><input value={recordConclusion} onChange={(event) => setRecordConclusion(event.target.value)} placeholder="Рекомендации" className={inputClass} /></FieldLabel>
        </div>
        <Button className="mt-4" onClick={() => void handleCreateMedicalRecord()} disabled={!clinicId}>Добавить в медкарту</Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950"><UsersRound className="h-5 w-5 text-cyan-700" /> Пациенты</h4>
          <div className="space-y-2 text-sm">
            {patients.slice(0, 10).map((patient) => <p key={patient.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">#{patient.id} {patient.person.last_name} {patient.person.first_name}</p>)}
            {patients.length === 0 ? <p className="text-slate-500">Пока нет пациентов.</p> : null}
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950"><CalendarCheck2 className="h-5 w-5 text-blue-700" /> Записи</h4>
          <div className="space-y-2 text-sm">
            {appointments.slice(0, 10).map((appointment) => <p key={appointment.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">#{appointment.id} {new Date(appointment.starts_at).toLocaleString('ru-RU')}</p>)}
            {appointments.length === 0 ? <p className="text-slate-500">Пока нет записей.</p> : null}
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950"><Stethoscope className="h-5 w-5 text-emerald-700" /> Медкарта</h4>
          <div className="space-y-2 text-sm">
            {medicalRecords.slice(0, 10).map((record) => <p key={record.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">#{record.id} {record.diagnosis || 'Без диагноза'}</p>)}
            {medicalRecords.length === 0 ? <p className="text-slate-500">Пока нет записей медкарты.</p> : null}
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950"><CalendarClock className="h-5 w-5 text-indigo-700" /> Расписание</h4>
          <div className="space-y-2 text-sm">
            <p className="rounded-2xl bg-indigo-50 px-3 py-2 font-semibold text-indigo-800">Сегодня: {todaySlots}</p>
            {scheduleSlots.slice(0, 8).map((slot) => <p key={slot.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">#{slot.id} {new Date(slot.starts_at).toLocaleString('ru-RU')} · {slot.status}</p>)}
            {scheduleSlots.length === 0 ? <p className="text-slate-500">Пока нет рабочих слотов.</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
