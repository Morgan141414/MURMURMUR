import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  applyToVacancy,
  createHiringOffer,
  createRecruiterNote,
  createVacancy,
  createVacancyInterview,
  getVacancyAnalytics,
  getVacancy,
  getVacancyApplication,
  listOrgInterviews,
  listVacancyApprovalQueue,
  listHiringOffers,
  listRecruiterNotes,
  listVacancies,
  listVacancyApplications,
  listVacancyInterviews,
  updateHiringOffer,
  updateVacancy,
  updateVacancyBudgetApproval,
  updateVacancyApplication,
  updateVacancyInterview,
} from '@/api/vacancies'
import type { HiringOffer, InterviewSession, JobApplication, RecruiterNote, Vacancy, VacancyAnalytics } from '@/types'
import { queryKeys } from '@/lib/queryKeys'

export function useVacancies(orgId: string | null, status?: string) {
  return useQuery({
    queryKey: queryKeys.vacancies.list(orgId!, status),
    queryFn: () => listVacancies(orgId!, status).then((r) => r.data as Vacancy[]),
    enabled: !!orgId,
  })
}

export function useVacancy(orgId: string | null, vacancyId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.detail(orgId!, vacancyId!),
    queryFn: () => getVacancy(orgId!, vacancyId!).then((r) => r.data as Vacancy),
    enabled: !!orgId && !!vacancyId,
  })
}

export function useVacancyApprovalQueue(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.approvalQueue(orgId!),
    queryFn: () => listVacancyApprovalQueue(orgId!).then((r) => r.data as Vacancy[]),
    enabled: !!orgId,
  })
}

export function useVacancyAnalytics(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.analytics(orgId!),
    queryFn: () => getVacancyAnalytics(orgId!).then((r) => r.data as VacancyAnalytics),
    enabled: !!orgId,
  })
}

export function useCreateVacancy(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createVacancy(orgId, body).then((r) => r.data as Vacancy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vacancies.list(orgId) }),
  })
}

export function useUpdateVacancy(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vacancyId, body }: { vacancyId: string; body: Record<string, unknown> }) =>
      updateVacancy(orgId, vacancyId, body).then((r) => r.data as Vacancy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.detail(orgId, vars.vacancyId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.approvalQueue(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.analytics(orgId) })
    },
  })
}

export function useUpdateVacancyBudgetApproval(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vacancyId, body }: { vacancyId: string; body: Record<string, unknown> }) =>
      updateVacancyBudgetApproval(orgId, vacancyId, body).then((r) => r.data as Vacancy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.detail(orgId, vars.vacancyId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.approvalQueue(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.analytics(orgId) })
    },
  })
}

export function useApplyToVacancy(orgId: string, vacancyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => applyToVacancy(orgId, vacancyId, body).then((r) => r.data as JobApplication),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vacancies.applications(orgId, vacancyId) }),
  })
}

export function useVacancyApplications(orgId: string | null, vacancyId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.applications(orgId!, vacancyId!),
    queryFn: () => listVacancyApplications(orgId!, vacancyId!).then((r) => r.data as JobApplication[]),
    enabled: !!orgId && !!vacancyId,
  })
}

export function useVacancyApplication(orgId: string | null, vacancyId: string | null, applicationId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.application(orgId!, vacancyId!, applicationId!),
    queryFn: () => getVacancyApplication(orgId!, vacancyId!, applicationId!).then((r) => r.data as JobApplication),
    enabled: !!orgId && !!vacancyId && !!applicationId,
  })
}

export function useUpdateVacancyApplication(orgId: string, vacancyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, body }: { applicationId: string; body: Record<string, unknown> }) =>
      updateVacancyApplication(orgId, vacancyId, applicationId, body).then((r) => r.data as JobApplication),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.applications(orgId, vacancyId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.application(orgId, vacancyId, vars.applicationId) })
    },
  })
}

export function useVacancyInterviews(orgId: string | null, vacancyId: string | null, applicationId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.interviews(orgId!, vacancyId!, applicationId!),
    queryFn: () => listVacancyInterviews(orgId!, vacancyId!, applicationId!).then((r) => r.data as InterviewSession[]),
    enabled: !!orgId && !!vacancyId && !!applicationId,
  })
}

export function useOrgInterviews(orgId: string | null, interviewerId?: string | null, dateFrom?: string | null, dateTo?: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.orgInterviews(orgId!, interviewerId || undefined, dateFrom || undefined, dateTo || undefined),
    queryFn: () => listOrgInterviews(orgId!, {
      interviewer_id: interviewerId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }).then((r) => r.data as InterviewSession[]),
    enabled: !!orgId && !!interviewerId,
  })
}

export function useCreateVacancyInterview(orgId: string, vacancyId: string, applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createVacancyInterview(orgId, vacancyId, applicationId, body).then((r) => r.data as InterviewSession),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.interviews(orgId, vacancyId, applicationId) })
      qc.invalidateQueries({ queryKey: ['vacancies', orgId, 'interviews'] })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.applications(orgId, vacancyId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.application(orgId, vacancyId, applicationId) })
    },
  })
}

export function useUpdateVacancyInterview(orgId: string, vacancyId: string, applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ interviewId, body }: { interviewId: string; body: Record<string, unknown> }) =>
      updateVacancyInterview(orgId, vacancyId, applicationId, interviewId, body).then((r) => r.data as InterviewSession),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.interviews(orgId, vacancyId, applicationId) })
      qc.invalidateQueries({ queryKey: ['vacancies', orgId, 'interviews'] })
    },
  })
}

export function useRecruiterNotes(orgId: string | null, vacancyId: string | null, applicationId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.notes(orgId!, vacancyId!, applicationId!),
    queryFn: () => listRecruiterNotes(orgId!, vacancyId!, applicationId!).then((r) => r.data as RecruiterNote[]),
    enabled: !!orgId && !!vacancyId && !!applicationId,
  })
}

export function useCreateRecruiterNote(orgId: string, vacancyId: string, applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createRecruiterNote(orgId, vacancyId, applicationId, body).then((r) => r.data as RecruiterNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.vacancies.notes(orgId, vacancyId, applicationId) }),
  })
}

export function useHiringOffers(orgId: string | null, vacancyId: string | null, applicationId: string | null) {
  return useQuery({
    queryKey: queryKeys.vacancies.offers(orgId!, vacancyId!, applicationId!),
    queryFn: () => listHiringOffers(orgId!, vacancyId!, applicationId!).then((r) => r.data as HiringOffer[]),
    enabled: !!orgId && !!vacancyId && !!applicationId,
  })
}

export function useCreateHiringOffer(orgId: string, vacancyId: string, applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createHiringOffer(orgId, vacancyId, applicationId, body).then((r) => r.data as HiringOffer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.offers(orgId, vacancyId, applicationId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.applications(orgId, vacancyId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.application(orgId, vacancyId, applicationId) })
    },
  })
}

export function useUpdateHiringOffer(orgId: string, vacancyId: string, applicationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ offerId, body }: { offerId: string; body: Record<string, unknown> }) =>
      updateHiringOffer(orgId, vacancyId, applicationId, offerId, body).then((r) => r.data as HiringOffer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.offers(orgId, vacancyId, applicationId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.applications(orgId, vacancyId) })
      qc.invalidateQueries({ queryKey: queryKeys.vacancies.application(orgId, vacancyId, applicationId) })
    },
  })
}
