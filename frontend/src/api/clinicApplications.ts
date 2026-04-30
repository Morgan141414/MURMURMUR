import api from './client'

export type ClinicApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'needs_changes'
  | 'approved'
  | 'rejected'
  | 'blocked'

export interface ClinicApplication {
  id: number
  name: string
  legal_name: string
  bin_iin: string
  address: string
  contacts?: string | null
  founder_data?: string | null
  requisites?: string | null
  license_info?: string | null
  oked?: string | null
  activity_description?: string | null
  moderator_comment?: string | null
  status: ClinicApplicationStatus
  clinic_id?: number | null
  created_at: string
  updated_at: string
}

export interface ClinicApplicationCreatePayload {
  name: string
  legal_name: string
  bin_iin: string
  address: string
  contacts?: string
  founder_data?: string
  requisites?: string
  license_info?: string
  oked?: string
  activity_description?: string
  submit?: boolean
}

export interface ClinicApplicationModeratePayload {
  status: Extract<ClinicApplicationStatus, 'approved' | 'needs_changes' | 'rejected' | 'blocked' | 'in_review'>
  moderator_comment?: string
}

export function listClinicApplications() {
  return api.get<ClinicApplication[]>('/clinics/applications')
}

export function createClinicApplication(payload: ClinicApplicationCreatePayload) {
  return api.post<ClinicApplication>('/clinics/applications', payload)
}

export function moderateClinicApplication(
  applicationId: number,
  payload: ClinicApplicationModeratePayload,
) {
  return api.patch<ClinicApplication>(`/clinics/applications/${applicationId}`, payload)
}
