import api from './client'

export interface GoogleCalendarStatus {
  connected: boolean
  google_email: string | null
}

export interface SyncResult {
  google_event_id: string
  google_event_url: string
  created: boolean
}

export function getGoogleCalendarStatus() {
  return api.get<GoogleCalendarStatus>('/google-calendar/status')
}

export function getGoogleAuthUrl() {
  return api.get<{ auth_url: string }>('/google-calendar/auth-url')
}

export function disconnectGoogleCalendar() {
  return api.delete<{ disconnected: boolean }>('/google-calendar/disconnect')
}

export function syncAppointmentToGoogle(appointmentId: number) {
  return api.post<SyncResult>(`/google-calendar/sync/${appointmentId}`)
}

export interface DirectSyncPayload {
  title: string
  service: string
  doctor: string
  notes: string
  starts_at: string
  ends_at: string
  existing_google_event_id?: string | null
}

export function syncAppointmentDirect(payload: DirectSyncPayload) {
  return api.post<SyncResult>('/google-calendar/sync-direct', payload)
}
