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
  room_id?: number | null
  service_id?: number | null
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

export interface CrmAppointment {
  id: string
  source: 'crm'
  doctor_membership_id?: number | null
  doctor_qtrix_id?: string | null
  lead_name?: string | null
  lead_mobile?: string | null
  starts_at: string
  ends_at: string
  status: string
  title: string
  notes?: string | null
}

export interface ClinicMembership {
  id: number
  clinic_id: number
  account_id: number
  role_code: string
  department?: string | null
  position?: string | null
  is_active: boolean
  person?: {
    first_name: string
    last_name: string
    middle_name?: string | null
    phone?: string | null
  } | null
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
  room_id?: number | null
  service_id?: number | null
  starts_at: string
  ends_at: string
  status?: 'available' | 'booked' | 'blocked' | 'canceled'
  note?: string | null
}

export interface ScheduleSlot {
  id: number
  clinic_id: number
  doctor_membership_id: number
  room_id?: number | null
  service_id?: number | null
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

export interface ClinicDocumentTemplate {
  id: number
  clinic_id?: number | null
  code: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

export interface ClinicGeneratedDocument {
  id: number
  clinic_id: number
  template_id?: number | null
  patient_profile_id?: number | null
  appointment_id?: number | null
  medical_record_entry_id?: number | null
  code: string
  title: string
  body: string
  created_at: string
}


export interface ClinicServiceCreatePayload {
  department_id?: number | null
  doctor_membership_id?: number | null
  code: string
  title: string
  duration_minutes?: number
  price?: number | null
}

export interface ClinicService {
  id: number
  clinic_id: number
  department_id?: number | null
  doctor_membership_id?: number | null
  code: string
  title: string
  duration_minutes: number
  price?: number | null
  is_active: boolean
}

export interface UserClinicSummary {
  id: number
  name: string
  legal_name: string
  bin_iin: string
  address: string
  contacts?: string | null
  status: string
}

export interface DocumentTemplatePayload {
  code: string
  title: string
  body: string
}

export interface DocumentRenderPayload {
  template_id?: number
  template_code?: string
  title?: string
  patient_profile_id?: number | null
  appointment_id?: number | null
  medical_record_entry_id?: number | null
  extras?: Record<string, string>
}

export function listUserClinics() {
  return api.get<UserClinicSummary[]>('/clinics')
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

export function listCrmAppointments(clinicId: number) {
  return api.get<CrmAppointment[]>(`/clinics/${clinicId}/appointments/crm`)
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

export function listClinicServices(clinicId: number) {
  return api.get<ClinicService[]>(`/clinics/${clinicId}/services`)
}

export function createClinicService(clinicId: number, payload: ClinicServiceCreatePayload) {
  return api.post<ClinicService>(`/clinics/${clinicId}/services`, payload)
}

export function updateClinicService(
  clinicId: number,
  serviceId: number,
  payload: Partial<ClinicServiceCreatePayload> & { is_active?: boolean },
) {
  return api.patch<ClinicService>(`/clinics/${clinicId}/services/${serviceId}`, payload)
}

export function createScheduleSlot(clinicId: number, payload: ScheduleSlotCreatePayload) {
  return api.post<ScheduleSlot>(`/clinics/${clinicId}/schedule/slots`, payload)
}

export function updateScheduleSlot(clinicId: number, slotId: number, payload: Partial<ScheduleSlotCreatePayload>) {
  return api.patch<ScheduleSlot>(`/clinics/${clinicId}/schedule/slots/${slotId}`, payload)
}

export function deleteScheduleSlot(clinicId: number, slotId: number) {
  return api.delete(`/clinics/${clinicId}/schedule/slots/${slotId}`)
}

export function listScheduleSlots(clinicId: number) {
  return api.get<ScheduleSlot[]>(`/clinics/${clinicId}/schedule/slots`)
}

export interface ScheduleTemplateRule {
  id: number
  weekday: number
  start_time: string
  end_time: string
  room_id: number | null
  service_id: number | null
}

export interface ScheduleTemplate {
  id: number
  clinic_id: number
  doctor_membership_id: number
  name: string
  rules: ScheduleTemplateRule[]
}

export interface ScheduleTemplateRulePayload {
  weekday: number
  start_time: string
  end_time: string
  room_id?: number | null
  service_id?: number | null
}

export interface ScheduleTemplatePayload {
  doctor_membership_id: number
  name: string
  rules: ScheduleTemplateRulePayload[]
}

export function listScheduleTemplates(clinicId: number, doctorMembershipId?: number) {
  const params = doctorMembershipId ? `?doctor_membership_id=${doctorMembershipId}` : ''
  return api.get<ScheduleTemplate[]>(`/clinics/${clinicId}/schedule/templates${params}`)
}

export function createScheduleTemplate(clinicId: number, payload: ScheduleTemplatePayload) {
  return api.post<ScheduleTemplate>(`/clinics/${clinicId}/schedule/templates`, payload)
}

export function updateScheduleTemplate(clinicId: number, templateId: number, payload: Partial<ScheduleTemplatePayload>) {
  return api.put<ScheduleTemplate>(`/clinics/${clinicId}/schedule/templates/${templateId}`, payload)
}

export function deleteScheduleTemplate(clinicId: number, templateId: number) {
  return api.delete(`/clinics/${clinicId}/schedule/templates/${templateId}`)
}

export function createMedicalRecord(clinicId: number, payload: MedicalRecordCreatePayload) {
  return api.post<MedicalRecordEntry>(`/clinics/${clinicId}/medical-records`, payload)
}

export function listMedicalRecords(clinicId: number) {
  return api.get<MedicalRecordEntry[]>(`/clinics/${clinicId}/medical-records`)
}


export function listClinicDocumentTemplates(clinicId: number) {
  return api.get<ClinicDocumentTemplate[]>(`/clinics/${clinicId}/documents/templates`)
}

export function saveClinicDocumentTemplate(clinicId: number, payload: DocumentTemplatePayload) {
  return api.post<ClinicDocumentTemplate>(`/clinics/${clinicId}/documents/templates`, payload)
}

export function listClinicGeneratedDocuments(clinicId: number) {
  return api.get<ClinicGeneratedDocument[]>(`/clinics/${clinicId}/documents/generated`)
}

export function renderClinicDocument(clinicId: number, payload: DocumentRenderPayload) {
  return api.post<ClinicGeneratedDocument>(`/clinics/${clinicId}/documents/render`, payload)
}

export interface CrmService {
  qtrix_id: string
  name: string
  category?: string | null
  price_type: string
  exact_price?: number | null
  min_price?: number | null
  max_price?: number | null
  currency: string
}

export function listCrmServices(clinicId: number) {
  return api.get<CrmService[]>(`/clinics/${clinicId}/services/crm`)
}

export function syncServicesFromCrm(clinicId: number) {
  return api.post<{ created: number; updated: number; total: number }>(
    `/clinics/${clinicId}/services/sync-from-crm`
  )
}
