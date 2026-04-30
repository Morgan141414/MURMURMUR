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

export function listAppointments(clinicId: number) {
  return api.get<Appointment[]>(`/clinics/${clinicId}/appointments`)
}

export function createMedicalRecord(clinicId: number, payload: MedicalRecordCreatePayload) {
  return api.post<MedicalRecordEntry>(`/clinics/${clinicId}/medical-records`, payload)
}

export function listMedicalRecords(clinicId: number) {
  return api.get<MedicalRecordEntry[]>(`/clinics/${clinicId}/medical-records`)
}
