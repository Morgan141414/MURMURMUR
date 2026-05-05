import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BriefcaseMedical, CalendarClock, CalendarCheck2, ClipboardPlus, DoorOpen, FileText, HeartPulse, Loader2, RefreshCw, Stethoscope, UserRoundPlus, UsersRound } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  assignClinicEmployee,
  createClinicRoom,
  attachPatientToClinic,
  createAppointment,
  createMedicalRecord,
  createPatient,
  createScheduleSlot,
  listClinicBranches,
  listClinicDepartments,
  listAppointments,
  listClinicEmployees,
  listClinicPatients,
  listClinicRooms,
  listMedicalRecords,
  listRoleCatalog,
  listScheduleSlots,
  updateAppointment,
  type Appointment,
  type ClinicBranch,
  type ClinicDepartment,
  type ClinicMembership,
  type ClinicRoom,
  type MedicalRecordEntry,
  type Patient,
  type RoleDefinition,
  type ScheduleSlot,
} from '@/api/clinical'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClinicCalendar } from './components/ClinicCalendar'

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  )
}

const inputClass = 'mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100'

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

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
  const [roleCatalog, setRoleCatalog] = useState<RoleDefinition[]>([])
  const [branches, setBranches] = useState<ClinicBranch[]>([])
  const [departments, setDepartments] = useState<ClinicDepartment[]>([])
  const [rooms, setRooms] = useState<ClinicRoom[]>([])
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)

  const [patientIin, setPatientIin] = useState('')
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')

  const [appointmentPatientId, setAppointmentPatientId] = useState('')
  const [appointmentDoctorMembershipId, setAppointmentDoctorMembershipId] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentDuration, setAppointmentDuration] = useState('30')
  const [appointmentReason, setAppointmentReason] = useState('')

  const [slotDoctorMembershipId, setSlotDoctorMembershipId] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [slotDuration, setSlotDuration] = useState('30')
  const [slotNote, setSlotNote] = useState('')

  const [recordPatientId, setRecordPatientId] = useState('')
  const [recordAppointmentId, setRecordAppointmentId] = useState('')
  const [recordDiagnosis, setRecordDiagnosis] = useState('')
  const [recordConclusion, setRecordConclusion] = useState('')

  const [employeeIin, setEmployeeIin] = useState('')
  const [employeeRoleCode, setEmployeeRoleCode] = useState('')
  const [employeeDepartment, setEmployeeDepartment] = useState('')
  const [employeePosition, setEmployeePosition] = useState('')

  const [roomBranchId, setRoomBranchId] = useState('')
  const [roomDepartmentId, setRoomDepartmentId] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomTitle, setRoomTitle] = useState('')

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
        roleCatalogResponse,
        branchesResponse,
        departmentsResponse,
        roomsResponse,
      ] = await Promise.all([
        listClinicPatients(clinicId),
        listAppointments(clinicId),
        listMedicalRecords(clinicId),
        listClinicEmployees(clinicId),
        listScheduleSlots(clinicId),
        listRoleCatalog(),
        listClinicBranches(clinicId),
        listClinicDepartments(clinicId),
        listClinicRooms(clinicId),
      ])
      setPatients(patientsResponse.data)
      setAppointments(appointmentsResponse.data)
      setMedicalRecords(medicalRecordsResponse.data)
      setEmployees(employeesResponse.data)
      setScheduleSlots(scheduleSlotsResponse.data)
      setRoleCatalog(roleCatalogResponse.data)
      setBranches(branchesResponse.data)
      setDepartments(departmentsResponse.data)
      setRooms(roomsResponse.data)
    } catch {
      toast.error('Не удалось загрузить клинические данные')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshClinicalData()
  }, [clinicId])

  useEffect(() => {
    if (patients.length === 0) {
      setSelectedPatientId(null)
      return
    }
    if (!selectedPatientId || !patients.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(patients[0].id)
    }
  }, [patients, selectedPatientId])

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
    const durationMinutes = Number(appointmentDuration) || 30
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000)
    const doctorMembershipId = appointmentDoctorMembershipId
      ? Number(appointmentDoctorMembershipId)
      : null
    try {
      await createAppointment(clinicId, {
        patient_profile_id: patientId,
        doctor_membership_id: doctorMembershipId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: appointmentReason || undefined,
      })
      toast.success('Запись создана')
      setAppointmentDate('')
      setAppointmentReason('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось создать запись. Проверьте врача, слот и пересечения в расписании.')
    }
  }

  function handleCalendarWindowSelect(startsAt: Date, doctorMembershipId?: number | null) {
    setAppointmentDate(toDateTimeLocalValue(startsAt))
    if (doctorMembershipId) {
      setAppointmentDoctorMembershipId(String(doctorMembershipId))
      setSlotDoctorMembershipId(String(doctorMembershipId))
    }
    setSlotDate(toDateTimeLocalValue(startsAt))
    toast.info('Время перенесено в формы записи и рабочего слота')
  }

  function handleScheduleSlotSelect(slot: ScheduleSlot) {
    setAppointmentDate(toDateTimeLocalValue(new Date(slot.starts_at)))
    setAppointmentDoctorMembershipId(String(slot.doctor_membership_id))
    setSlotDoctorMembershipId(String(slot.doctor_membership_id))
    setSlotDate(toDateTimeLocalValue(new Date(slot.starts_at)))
    const durationMinutes = Math.max(
      15,
      Math.round((new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000),
    )
    setAppointmentDuration(String(durationMinutes))
    setSlotDuration(String(durationMinutes))
    toast.success('Слот выбран для новой записи')
  }

  function handleAppointmentSelect(appointment: Appointment) {
    setRecordPatientId(String(appointment.patient_profile_id))
    setRecordAppointmentId(String(appointment.id))
    setAppointmentPatientId(String(appointment.patient_profile_id))
    setSelectedPatientId(appointment.patient_profile_id)
    setAppointmentDate(toDateTimeLocalValue(new Date(appointment.starts_at)))
    if (appointment.doctor_membership_id) {
      setAppointmentDoctorMembershipId(String(appointment.doctor_membership_id))
    }
    toast.info('Приём выбран, можно добавить запись в медкарту')
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

  function handleSelectPatient(patient: Patient) {
    setSelectedPatientId(patient.id)
    setAppointmentPatientId(String(patient.id))
    setRecordPatientId(String(patient.id))
    toast.info('Пациент выбран для записи и медкарты')
  }

  function handlePlanAppointmentForPatient(patient: Patient) {
    setSelectedPatientId(patient.id)
    setAppointmentPatientId(String(patient.id))
    setAppointmentReason('Плановый приём')
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    setAppointmentDate(toDateTimeLocalValue(nextHour))
    toast.success('Пациент перенесён в форму записи')
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

  async function handleAssignEmployee() {
    if (!clinicId) return
    if (!employeeIin || !employeeRoleCode) {
      toast.error('Укажите ИИН сотрудника и роль')
      return
    }
    try {
      await assignClinicEmployee(clinicId, {
        iin: employeeIin.trim(),
        role_code: employeeRoleCode,
        department: employeeDepartment.trim() || undefined,
        position: employeePosition.trim() || undefined,
      })
      toast.success('Сотрудник назначен в клинику')
      setEmployeeIin('')
      setEmployeeDepartment('')
      setEmployeePosition('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось назначить сотрудника. Проверьте ИИН и доступы.')
    }
  }

  async function handleCreateRoom() {
    if (!clinicId) return
    const branchId = Number(roomBranchId)
    if (!branchId || !roomNumber.trim()) {
      toast.error('Выберите филиал и укажите номер кабинета')
      return
    }
    const departmentId = roomDepartmentId ? Number(roomDepartmentId) : null
    try {
      await createClinicRoom(clinicId, {
        branch_id: branchId,
        department_id: departmentId || undefined,
        number: roomNumber.trim(),
        title: roomTitle.trim() || undefined,
      })
      toast.success('Кабинет добавлен')
      setRoomNumber('')
      setRoomTitle('')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось создать кабинет')
    }
  }

  async function handleUpdateAppointmentStatus(appointment: Appointment, status: string) {
    if (!clinicId) return
    try {
      await updateAppointment(clinicId, appointment.id, { status })
      const statusText: Record<string, string> = {
        confirmed: 'Запись подтверждена',
        completed: 'Приём завершён',
        canceled: 'Запись отменена, слот снова доступен',
      }
      toast.success(statusText[status] || 'Статус записи обновлён')
      await refreshClinicalData()
    } catch {
      toast.error('Не удалось обновить статус записи')
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
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null
  const filteredPatients = patients.filter((patient) => {
    const query = patientSearch.trim().toLowerCase()
    if (!query) return true
    const fullName = `${patient.person.last_name} ${patient.person.first_name} ${patient.person.middle_name ?? ''}`.toLowerCase()
    return (
      fullName.includes(query)
      || patient.person.iin.includes(query)
      || (patient.person.phone ?? '').toLowerCase().includes(query)
    )
  })
  const selectedPatientAppointments = selectedPatient
    ? appointments
      .filter((appointment) => appointment.patient_profile_id === selectedPatient.id)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    : []
  const selectedPatientRecords = selectedPatient
    ? medicalRecords
      .filter((record) => record.patient_profile_id === selectedPatient.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []
  const selectedNextAppointment = selectedPatientAppointments.find((appointment) =>
    !['canceled', 'completed', 'no_show'].includes(appointment.status)
    && new Date(appointment.starts_at).getTime() >= Date.now(),
  )
  const clinicRoles = roleCatalog.filter((role) => role.scope === 'clinic')
  const branchDepartmentOptions = departments.filter(
    (department) => !roomBranchId || String(department.branch_id) === roomBranchId,
  )

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

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-cyan-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Реестр пациентов</h3>
              <p className="text-sm text-slate-500">Быстрый выбор пациента для приёма, медкарты и расписания</p>
            </div>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
              {filteredPatients.length} / {patients.length}
            </span>
          </div>
          <input
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
            placeholder="Поиск по ФИО, ИИН или телефону"
            className={inputClass}
          />
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredPatients.slice(0, 20).map((patient) => {
              const isActive = patient.id === selectedPatientId
              const patientAppointments = appointments.filter((item) => item.patient_profile_id === patient.id)
              const patientRecords = medicalRecords.filter((item) => item.patient_profile_id === patient.id)
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleSelectPatient(patient)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                      : 'border-slate-100 bg-slate-50 hover:border-cyan-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        {patient.person.last_name} {patient.person.first_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">ИИН {patient.person.iin}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      #{patient.id}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      Записи: {patientAppointments.length}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                      Медкарта: {patientRecords.length}
                    </span>
                  </div>
                </button>
              )
            })}
            {filteredPatients.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Пациент не найден. Можно создать нового пациента через форму ниже.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-cyan-50 p-5 shadow-sm">
          {selectedPatient ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                    <HeartPulse className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Карточка пациента</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">
                      {selectedPatient.person.last_name} {selectedPatient.person.first_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      ИИН {selectedPatient.person.iin}
                      {selectedPatient.person.phone ? ` · ${selectedPatient.person.phone}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => handlePlanAppointmentForPatient(selectedPatient)}>
                    Запланировать приём
                  </Button>
                  <Button
                    onClick={() => {
                      setRecordPatientId(String(selectedPatient.id))
                      toast.info('Пациент выбран для новой записи в медкарте')
                    }}
                  >
                    Добавить медкарту
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
                  <p className="text-xs font-semibold text-slate-500">Все записи</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{selectedPatientAppointments.length}</p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
                  <p className="text-xs font-semibold text-slate-500">Медкарта</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{selectedPatientRecords.length}</p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
                  <p className="text-xs font-semibold text-slate-500">Ближайший приём</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">
                    {selectedNextAppointment
                      ? new Date(selectedNextAppointment.starts_at).toLocaleString('ru-RU')
                      : 'Не назначен'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/70 bg-white/90 p-4">
                  <h4 className="font-bold text-slate-950">История приёмов</h4>
                  <div className="mt-3 space-y-2">
                    {selectedPatientAppointments.slice(0, 5).map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => handleAppointmentSelect(appointment)}
                        className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm transition hover:bg-blue-50"
                      >
                        <span className="font-semibold text-slate-900">
                          {new Date(appointment.starts_at).toLocaleString('ru-RU')}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {appointment.reason || 'Без причины'} · {appointment.status}
                        </span>
                      </button>
                    ))}
                    {selectedPatientAppointments.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Записей пока нет.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/90 p-4">
                  <h4 className="font-bold text-slate-950">Медицинские записи</h4>
                  <div className="mt-3 space-y-2">
                    {selectedPatientRecords.slice(0, 5).map((record) => (
                      <div key={record.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm">
                        <p className="font-semibold text-slate-900">{record.diagnosis || 'Без диагноза'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(record.created_at).toLocaleString('ru-RU')}
                        </p>
                        {record.conclusion ? (
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">{record.conclusion}</p>
                        ) : null}
                      </div>
                    ))}
                    {selectedPatientRecords.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Медкарта пока пустая.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-200 bg-white/70 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-cyan-600" />
              <h3 className="mt-4 text-xl font-black text-slate-950">Выберите пациента</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                После выбора здесь появятся приёмы, медкарта, контакты и быстрые действия.
              </p>
            </div>
          )}
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
            <FieldLabel label="Врач">
              <select value={appointmentDoctorMembershipId} onChange={(event) => setAppointmentDoctorMembershipId(event.target.value)} className={inputClass}>
                <option value="">Без врача</option>
                {availableDoctors.map((employee) => <option key={employee.id} value={String(employee.id)}>#{employee.id} {employee.position || employee.role_code}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Дата и время"><input type="datetime-local" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} className={inputClass} /></FieldLabel>
            <FieldLabel label="Длительность">
              <select value={appointmentDuration} onChange={(event) => setAppointmentDuration(event.target.value)} className={inputClass}>
                <option value="15">15 минут</option>
                <option value="30">30 минут</option>
                <option value="45">45 минут</option>
                <option value="60">60 минут</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Причина"><input value={appointmentReason} onChange={(event) => setAppointmentReason(event.target.value)} placeholder="Первичный приём" className={inputClass} /></FieldLabel>
          </div>
          <Button className="mt-4" onClick={() => void handleCreateAppointment()} disabled={!clinicId}>Создать запись</Button>
        </section>
      </div>

      <ClinicCalendar
        appointments={appointments}
        employees={employees}
        patients={patients}
        scheduleSlots={scheduleSlots}
        onSelectWindow={handleCalendarWindowSelect}
        onSelectSlot={handleScheduleSlotSelect}
        onSelectAppointment={handleAppointmentSelect}
      />

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

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <BriefcaseMedical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Назначение сотрудника</h3>
              <p className="text-sm text-slate-500">Добавьте врача, администратора или ресепшн по ИИН</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FieldLabel label="ИИН сотрудника">
              <input
                value={employeeIin}
                onChange={(event) => setEmployeeIin(event.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="12 цифр"
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Роль">
              <select value={employeeRoleCode} onChange={(event) => setEmployeeRoleCode(event.target.value)} className={inputClass}>
                <option value="">Выберите роль</option>
                {clinicRoles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.title}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Отдел">
              <input value={employeeDepartment} onChange={(event) => setEmployeeDepartment(event.target.value)} placeholder="Терапия" className={inputClass} />
            </FieldLabel>
            <FieldLabel label="Должность">
              <input value={employeePosition} onChange={(event) => setEmployeePosition(event.target.value)} placeholder="Врач-терапевт" className={inputClass} />
            </FieldLabel>
          </div>
          <Button className="mt-4" onClick={() => void handleAssignEmployee()} disabled={!clinicId}>Назначить сотрудника</Button>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Кабинеты клиники</h3>
              <p className="text-sm text-slate-500">Создание кабинетов для расписания и приёмов</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FieldLabel label="Филиал">
              <select value={roomBranchId} onChange={(event) => setRoomBranchId(event.target.value)} className={inputClass}>
                <option value="">Выберите филиал</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Отдел (опц.)">
              <select value={roomDepartmentId} onChange={(event) => setRoomDepartmentId(event.target.value)} className={inputClass}>
                <option value="">Без отдела</option>
                {branchDepartmentOptions.map((department) => (
                  <option key={department.id} value={String(department.id)}>
                    {department.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Номер кабинета">
              <input value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="101" className={inputClass} />
            </FieldLabel>
            <FieldLabel label="Название (опц.)">
              <input value={roomTitle} onChange={(event) => setRoomTitle(event.target.value)} placeholder="Процедурный" className={inputClass} />
            </FieldLabel>
          </div>
          <Button className="mt-4" onClick={() => void handleCreateRoom()} disabled={!clinicId}>Добавить кабинет</Button>
          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
            {rooms.slice(0, 12).map((room) => (
              <p key={room.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                #{room.id} Каб. {room.number}{room.title ? ` · ${room.title}` : ''}
              </p>
            ))}
            {rooms.length === 0 ? <p className="text-sm text-slate-500">Кабинеты пока не добавлены.</p> : null}
          </div>
        </div>
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
            {appointments.slice(0, 10).map((appointment) => (
              <div key={appointment.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-700">
                <button
                  type="button"
                  onClick={() => handleAppointmentSelect(appointment)}
                  className="block w-full text-left font-semibold text-slate-900"
                >
                  #{appointment.id} {new Date(appointment.starts_at).toLocaleString('ru-RU')}
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  {appointment.reason || 'Без причины'} · {appointment.status}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {appointment.status === 'created' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleUpdateAppointmentStatus(appointment, 'confirmed')}
                    >
                      Подтвердить
                    </Button>
                  ) : null}
                  {['created', 'confirmed', 'arrived', 'started'].includes(appointment.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleUpdateAppointmentStatus(appointment, 'completed')}
                    >
                      Завершить
                    </Button>
                  ) : null}
                  {!['canceled', 'completed', 'no_show'].includes(appointment.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleUpdateAppointmentStatus(appointment, 'canceled')}
                    >
                      Отменить
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
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
