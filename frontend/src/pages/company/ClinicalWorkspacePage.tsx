import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useOrgStore } from '@/stores/orgStore'
import {
  attachPatientToClinic,
  createAppointment,
  createMedicalRecord,
  createPatient,
  listAppointments,
  listClinicPatients,
  listMedicalRecords,
  type Appointment,
  type MedicalRecordEntry,
  type Patient,
} from '@/api/clinical'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'

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
  const [loading, setLoading] = useState(false)

  const [patientIin, setPatientIin] = useState('')
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')

  const [appointmentPatientId, setAppointmentPatientId] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentReason, setAppointmentReason] = useState('')

  const [recordPatientId, setRecordPatientId] = useState('')
  const [recordAppointmentId, setRecordAppointmentId] = useState('')
  const [recordDiagnosis, setRecordDiagnosis] = useState('')
  const [recordConclusion, setRecordConclusion] = useState('')

  async function refreshClinicalData() {
    if (!clinicId) return
    setLoading(true)
    try {
      const [patientsResponse, appointmentsResponse, medicalRecordsResponse] =
        await Promise.all([
          listClinicPatients(clinicId),
          listAppointments(clinicId),
          listMedicalRecords(clinicId),
        ])
      setPatients(patientsResponse.data)
      setAppointments(appointmentsResponse.data)
      setMedicalRecords(medicalRecordsResponse.data)
    } catch {
      toast.error('Не удалось загрузить клинические данные')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Клинический Workspace"
        description="Пациенты, записи и базовая медкарта в одном рабочем контуре."
        eyebrow="MVP1 Clinical"
      />

      <div className="flex items-center gap-2">
        <Button onClick={() => void refreshClinicalData()} disabled={!clinicId || loading}>
          {loading ? 'Загрузка...' : 'Обновить данные'}
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Новый пациент</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            value={patientIin}
            onChange={(event) => setPatientIin(event.target.value)}
            placeholder="ИИН"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={patientFirstName}
            onChange={(event) => setPatientFirstName(event.target.value)}
            placeholder="Имя"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={patientLastName}
            onChange={(event) => setPatientLastName(event.target.value)}
            placeholder="Фамилия"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <Button onClick={() => void handleCreatePatient()} disabled={!clinicId}>
          Создать пациента
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Новая запись</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            value={appointmentPatientId}
            onChange={(event) => setAppointmentPatientId(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Выберите пациента</option>
            {patients.map((patient) => (
              <option key={patient.id} value={String(patient.id)}>
                {patient.person.last_name} {patient.person.first_name} ({patient.person.iin})
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={appointmentReason}
            onChange={(event) => setAppointmentReason(event.target.value)}
            placeholder="Причина"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <Button onClick={() => void handleCreateAppointment()} disabled={!clinicId}>
          Создать запись
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Запись в медкарте</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            value={recordPatientId}
            onChange={(event) => setRecordPatientId(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Выберите пациента</option>
            {patients.map((patient) => (
              <option key={patient.id} value={String(patient.id)}>
                {patient.person.last_name} {patient.person.first_name}
              </option>
            ))}
          </select>
          <select
            value={recordAppointmentId}
            onChange={(event) => setRecordAppointmentId(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Связать с записью (опционально)</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={String(appointment.id)}>
                #{appointment.id} · {new Date(appointment.starts_at).toLocaleString('ru-RU')}
              </option>
            ))}
          </select>
          <input
            value={recordDiagnosis}
            onChange={(event) => setRecordDiagnosis(event.target.value)}
            placeholder="Диагноз"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={recordConclusion}
            onChange={(event) => setRecordConclusion(event.target.value)}
            placeholder="Заключение"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <Button onClick={() => void handleCreateMedicalRecord()} disabled={!clinicId}>
          Добавить в медкарту
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-sm font-semibold">Пациенты ({patients.length})</h4>
          <div className="space-y-1 text-sm">
            {patients.slice(0, 10).map((patient) => (
              <p key={patient.id}>
                #{patient.id} {patient.person.last_name} {patient.person.first_name}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-sm font-semibold">Записи ({appointments.length})</h4>
          <div className="space-y-1 text-sm">
            {appointments.slice(0, 10).map((appointment) => (
              <p key={appointment.id}>
                #{appointment.id} {new Date(appointment.starts_at).toLocaleString('ru-RU')}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-sm font-semibold">Медкарта ({medicalRecords.length})</h4>
          <div className="space-y-1 text-sm">
            {medicalRecords.slice(0, 10).map((record) => (
              <p key={record.id}>
                #{record.id} {record.diagnosis || 'Без диагноза'}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
