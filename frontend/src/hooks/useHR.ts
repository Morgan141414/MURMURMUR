import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEmployeeChangeRequest,
  createHRDocument,
  createLeaveRequest,
  createOffboarding,
  createOnboarding,
  createTerminationOrder,
  createMessageTemplate,
  deleteMessageTemplate,
  executeTerminationOrder,
  fetchHRAnalytics,
  fetchMessageTemplates,
  listEmployeeChangeRequests,
  listHRDocuments,
  listLeaveRequests,
  listOffboarding,
  listOnboarding,
  listTerminationOrders,
  toggleOnboardingChecklist,
  voteTerminationOrder,
  updateEmployeeChangeRequest,
  updateHRDocument,
  updateLeaveRequest,
  updateMessageTemplate,
  updateOffboarding,
  updateOnboarding,
} from '@/api/hr'
import type {
  EmployeeChangeRequest,
  HRAnalytics,
  HRDocument,
  LeaveRequest,
  MessageTemplate,
  OffboardingProcess,
  OnboardingProcess,
  TerminationOrder,
} from '@/types'
import { queryKeys } from '@/lib/queryKeys'

export function useOnboarding(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.onboarding(orgId!),
    queryFn: () => listOnboarding(orgId!).then((r) => r.data as OnboardingProcess[]),
    enabled: !!orgId,
  })
}

export function useCreateOnboarding(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createOnboarding(orgId, body).then((r) => r.data as OnboardingProcess),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.onboarding(orgId) }),
  })
}

export function useUpdateOnboarding(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ processId, body }: { processId: string; body: Record<string, unknown> }) =>
      updateOnboarding(orgId, processId, body).then((r) => r.data as OnboardingProcess),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.onboarding(orgId) }),
  })
}

export function useOffboarding(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.offboarding(orgId!),
    queryFn: () => listOffboarding(orgId!).then((r) => r.data as OffboardingProcess[]),
    enabled: !!orgId,
  })
}

export function useCreateOffboarding(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createOffboarding(orgId, body).then((r) => r.data as OffboardingProcess),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.offboarding(orgId) }),
  })
}

export function useUpdateOffboarding(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ processId, body }: { processId: string; body: Record<string, unknown> }) =>
      updateOffboarding(orgId, processId, body).then((r) => r.data as OffboardingProcess),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.offboarding(orgId) }),
  })
}

export function useTerminationOrders(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.terminationOrders(orgId!),
    queryFn: () => listTerminationOrders(orgId!).then((r) => r.data as TerminationOrder[]),
    enabled: !!orgId,
  })
}

export function useCreateTerminationOrder(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createTerminationOrder(orgId, body).then((r) => r.data as TerminationOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.terminationOrders(orgId) }),
  })
}

export function useVoteTerminationOrder(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: { decision: 'approved' | 'rejected'; comment?: string } }) =>
      voteTerminationOrder(orgId, orderId, body).then((r) => r.data as TerminationOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.terminationOrders(orgId) }),
  })
}

export function useExecuteTerminationOrder(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => executeTerminationOrder(orgId, orderId).then((r) => r.data as TerminationOrder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.terminationOrders(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.users.list(orgId) })
    },
  })
}

export function useLeaveRequests(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.leave(orgId!),
    queryFn: () => listLeaveRequests(orgId!).then((r) => r.data as LeaveRequest[]),
    enabled: !!orgId,
  })
}

export function useCreateLeaveRequest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createLeaveRequest(orgId, body).then((r) => r.data as LeaveRequest),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.leave(orgId) }),
  })
}

export function useUpdateLeaveRequest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, body }: { requestId: string; body: Record<string, unknown> }) =>
      updateLeaveRequest(orgId, requestId, body).then((r) => r.data as LeaveRequest),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.leave(orgId) }),
  })
}

export function useHRDocuments(
  orgId: string | null,
  options?: { enabled?: boolean; refetchOnWindowFocus?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: queryKeys.hr.documents(orgId!),
    queryFn: () => listHRDocuments(orgId!).then((r) => r.data as HRDocument[]),
    enabled: !!orgId && (options?.enabled ?? true),
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    staleTime: options?.staleTime,
  })
}

export function useEmployeeChangeRequests(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.employeeChangeRequests(orgId!),
    queryFn: () => listEmployeeChangeRequests(orgId!).then((r) => r.data as EmployeeChangeRequest[]),
    enabled: !!orgId,
  })
}

export function useCreateEmployeeChangeRequest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createEmployeeChangeRequest(orgId, body).then((r) => r.data as EmployeeChangeRequest),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.employeeChangeRequests(orgId) }),
  })
}

export function useUpdateEmployeeChangeRequest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, body }: { requestId: string; body: Record<string, unknown> }) =>
      updateEmployeeChangeRequest(orgId, requestId, body).then((r) => r.data as EmployeeChangeRequest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.employeeChangeRequests(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.users.list(orgId) })
    },
  })
}

export function useCreateHRDocument(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createHRDocument(orgId, body).then((r) => r.data as HRDocument),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.documents(orgId) }),
  })
}

export function useUpdateHRDocument(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentId, body }: { documentId: string; body: Record<string, unknown> }) =>
      updateHRDocument(orgId, documentId, body).then((r) => r.data as HRDocument),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.documents(orgId) }),
  })
}

export function useToggleOnboardingChecklist(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ processId, body }: { processId: string; body: { index: number; done: boolean } }) =>
      toggleOnboardingChecklist(orgId, processId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.onboarding(orgId) }),
  })
}

export function useHRAnalytics(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.analytics(orgId!),
    queryFn: () => fetchHRAnalytics(orgId!) as Promise<HRAnalytics>,
    enabled: !!orgId,
  })
}

export function useMessageTemplates(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.hr.messageTemplates(orgId!),
    queryFn: () => fetchMessageTemplates(orgId!) as Promise<MessageTemplate[]>,
    enabled: !!orgId,
  })
}

export function useCreateMessageTemplate(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createMessageTemplate(orgId, body) as Promise<MessageTemplate>,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.messageTemplates(orgId) }),
  })
}

export function useUpdateMessageTemplate(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, body }: { templateId: string; body: Record<string, unknown> }) =>
      updateMessageTemplate(orgId, templateId, body) as Promise<MessageTemplate>,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.messageTemplates(orgId) }),
  })
}

export function useDeleteMessageTemplate(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => deleteMessageTemplate(orgId, templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.messageTemplates(orgId) }),
  })
}
