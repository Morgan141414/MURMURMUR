import api from './client'

export interface PatientCreatePayload {
  iin: string
  first_name: string
  last_name: string
  middle_name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

export interface Patient {
  id: number
  person_id: number
  notes?: string | null
  person: {
    id: number
    iin: string
    first_name: string
    last_name: string
    middle_name?: string | null
    phone?: string | null
    email?: string | null
  }
}

export interface AppointmentCreatePayload {
  patient_profile_id: number
  doctor_membership_id?: number | null
  starts_at: string
  ends_at: string
  reason?: string | null
  status?: string
}

export interface AppointmentUpdatePayload {
  starts_at?: string
  ends_at?: string
  status?: string
  reason?: string | null
}

export interface Appointment {
  id: number
  clinic_id: number
  patient_profile_id: number
  doctor_membership_id?: number | null
  starts_at: string
  ends_at: string
  status: string
  reason?: string | null
}

export interface ClinicMembership {
  id: number
  clinic_id: number
  account_id: number
  role_code: string
  department?: string | null
  position?: string | null
  is_active: boolean
}

export interface ScheduleSlotCreatePayload {
  doctor_membership_id: number
  starts_at: string
  ends_at: string
  status?: 'available' | 'booked' | 'blocked' | 'canceled'
  note?: string | null
}

export interface ScheduleSlot {
  id: number
  clinic_id: number
  doctor_membership_id: number
  starts_at: string
  ends_at: string
  status: 'available' | 'booked' | 'blocked' | 'canceled'
  note?: string | null
}

export interface MedicalRecordCreatePayload {
  patient_profile_id: number
  author_membership_id?: number | null
  appointment_id?: number | null
  complaint?: string | null
  anamnesis?: string | null
  diagnosis?: string | null
  prescription?: string | null
  conclusion?: string | null
}

export interface MedicalRecordEntry {
  id: number
  clinic_id: number
  patient_profile_id: number
  author_membership_id?: number | null
  appointment_id?: number | null
  complaint?: string | null
  anamnesis?: string | null
  diagnosis?: string | null
  prescription?: string | null
  conclusion?: string | null
  created_at: string
}

export function createPatient(payload: PatientCreatePayload) {
  return api.post<Patient>('/patients', payload)
}

export function listClinicPatients(clinicId: number) {
  return api.get<Patient[]>(`/clinics/${clinicId}/patients`)
}

export function attachPatientToClinic(clinicId: number, patientProfileId: number) {
  return api.post(`/clinics/${clinicId}/patients/${patientProfileId}`)
}

export function createAppointment(clinicId: number, payload: AppointmentCreatePayload) {
  return api.post<Appointment>(`/clinics/${clinicId}/appointments`, payload)
}

export function updateAppointment(
  clinicId: number,
  appointmentId: number,
  payload: AppointmentUpdatePayload,
) {
  return api.patch<Appointment>(`/clinics/${clinicId}/appointments/${appointmentId}`, payload)
}

export function listAppointments(clinicId: number) {
  return api.get<Appointment[]>(`/clinics/${clinicId}/appointments`)
}

export function listClinicEmployees(clinicId: number) {
  return api.get<ClinicMembership[]>(`/clinics/${clinicId}/employees`)
}

export function createScheduleSlot(clinicId: number, payload: ScheduleSlotCreatePayload) {
  return api.post<ScheduleSlot>(`/clinics/${clinicId}/schedule/slots`, payload)
}

export function listScheduleSlots(clinicId: number) {
  return api.get<ScheduleSlot[]>(`/clinics/${clinicId}/schedule/slots`)
}

export function createMedicalRecord(clinicId: number, payload: MedicalRecordCreatePayload) {
  return api.post<MedicalRecordEntry>(`/clinics/${clinicId}/medical-records`, payload)
}

export function listMedicalRecords(clinicId: number) {
  return api.get<MedicalRecordEntry[]>(`/clinics/${clinicId}/medical-records`)
}
