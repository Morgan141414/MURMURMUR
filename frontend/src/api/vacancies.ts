import api from './client'
import type { HiringOffer, InterviewSession, JobApplication, RecruiterNote, Vacancy, VacancyAnalytics } from '@/types'

export function listVacancies(orgId: string, status?: string) {
  return api.get<Vacancy[]>(`/orgs/${orgId}/vacancies`, { params: status ? { status_filter: status } : undefined })
}

export function getVacancy(orgId: string, vacancyId: string) {
  return api.get<Vacancy>(`/orgs/${orgId}/vacancies/${vacancyId}`)
}

export function listVacancyApprovalQueue(orgId: string) {
  return api.get<Vacancy[]>(`/orgs/${orgId}/vacancies/approval-queue`)
}

export function getVacancyAnalytics(orgId: string) {
  return api.get<VacancyAnalytics>(`/orgs/${orgId}/vacancies/analytics`)
}

export function listOrgInterviews(orgId: string, params?: Record<string, unknown>) {
  return api.get<InterviewSession[]>(`/orgs/${orgId}/vacancies/interviews`, { params })
}

export function createVacancy(orgId: string, body: Record<string, unknown>) {
  return api.post<Vacancy>(`/orgs/${orgId}/vacancies`, body)
}

export function updateVacancy(orgId: string, vacancyId: string, body: Record<string, unknown>) {
  return api.patch<Vacancy>(`/orgs/${orgId}/vacancies/${vacancyId}`, body)
}

export function updateVacancyBudgetApproval(orgId: string, vacancyId: string, body: Record<string, unknown>) {
  return api.patch<Vacancy>(`/orgs/${orgId}/vacancies/${vacancyId}/budget-approval`, body)
}

export function applyToVacancy(orgId: string, vacancyId: string, body: Record<string, unknown>) {
  return api.post<JobApplication>(`/orgs/${orgId}/vacancies/${vacancyId}/apply`, body)
}

export function listVacancyApplications(orgId: string, vacancyId: string) {
  return api.get<JobApplication[]>(`/orgs/${orgId}/vacancies/${vacancyId}/applications`)
}

export function getVacancyApplication(orgId: string, vacancyId: string, applicationId: string) {
  return api.get<JobApplication>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}`)
}

export function updateVacancyApplication(orgId: string, vacancyId: string, applicationId: string, body: Record<string, unknown>) {
  return api.patch<JobApplication>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}`, body)
}

export function accessVacancyApplicationAttachment(orgId: string, vacancyId: string, applicationId: string, attachmentId: string, action: 'view' | 'download') {
  return api.get<{
    id: string
    file_name: string
    content_type?: string | null
    size?: number
    data_url: string
  }>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/attachments/${attachmentId}`, {
    params: { action },
  })
}

export function listVacancyInterviews(orgId: string, vacancyId: string, applicationId: string) {
  return api.get<InterviewSession[]>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/interviews`)
}

export function createVacancyInterview(orgId: string, vacancyId: string, applicationId: string, body: Record<string, unknown>) {
  return api.post<InterviewSession>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/interviews`, body)
}

export function updateVacancyInterview(orgId: string, vacancyId: string, applicationId: string, interviewId: string, body: Record<string, unknown>) {
  return api.patch<InterviewSession>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/interviews/${interviewId}`, body)
}

export function listRecruiterNotes(orgId: string, vacancyId: string, applicationId: string) {
  return api.get<RecruiterNote[]>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/notes`)
}

export function createRecruiterNote(orgId: string, vacancyId: string, applicationId: string, body: Record<string, unknown>) {
  return api.post<RecruiterNote>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/notes`, body)
}

export function listHiringOffers(orgId: string, vacancyId: string, applicationId: string) {
  return api.get<HiringOffer[]>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/offers`)
}

export function createHiringOffer(orgId: string, vacancyId: string, applicationId: string, body: Record<string, unknown>) {
  return api.post<HiringOffer>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/offers`, body)
}

export function updateHiringOffer(orgId: string, vacancyId: string, applicationId: string, offerId: string, body: Record<string, unknown>) {
  return api.patch<HiringOffer>(`/orgs/${orgId}/vacancies/${vacancyId}/applications/${applicationId}/offers/${offerId}`, body)
}
