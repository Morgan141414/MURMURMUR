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
  doctor_membership_id?: number | null
  room_id?: number | null
  service_id?: number | null
}

export interface Appointment {
  id: number
  clinic_id: number
  patient_profile_id: number
  doctor_membership_id?: number | null
  room_id?: number | null
  service_id?: number | null
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

export interface RoleDefinition {
  id: number
  code: string
  scope: string
  title: string
  permissions: string
  is_system: boolean
}

export interface ClinicEmployeeAssignPayload {
  iin: string
  role_code: string
  department?: string | null
  position?: string | null
}

export interface ClinicBranch {
  id: number
  clinic_id: number
  name: string
  address?: string | null
  phone?: string | null
  is_active: boolean
}

export interface ClinicDepartment {
  id: number
  clinic_id: number
  branch_id: number
  name: string
  description?: string | null
  is_active: boolean
}

export interface ClinicRoomCreatePayload {
  branch_id: number
  department_id?: number | null
  number: string
  title?: string | null
}

export interface ClinicRoom {
  id: number
  clinic_id: number
  branch_id: number
  department_id?: number | null
  number: string
  title?: string | null
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

export function listRoleCatalog() {
  return api.get<RoleDefinition[]>('/clinics/roles/catalog')
}

export function assignClinicEmployee(clinicId: number, payload: ClinicEmployeeAssignPayload) {
  return api.post<ClinicMembership>(`/clinics/${clinicId}/employees`, payload)
}

export function listClinicBranches(clinicId: number) {
  return api.get<ClinicBranch[]>(`/clinics/${clinicId}/branches`)
}

export function listClinicDepartments(clinicId: number) {
  return api.get<ClinicDepartment[]>(`/clinics/${clinicId}/departments`)
}

export function listClinicRooms(clinicId: number) {
  return api.get<ClinicRoom[]>(`/clinics/${clinicId}/rooms`)
}

export function createClinicRoom(clinicId: number, payload: ClinicRoomCreatePayload) {
  return api.post<ClinicRoom>(`/clinics/${clinicId}/rooms`, payload)
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
