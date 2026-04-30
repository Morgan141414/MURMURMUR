import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AuditLog, PrivacyRule, NotificationHook, ReportSchedule, OrgRole } from '@/types'
import { listAudit } from '@/api/audit'
import { listPrivacyRules, createPrivacyRule, deletePrivacyRule } from '@/api/privacy'
import { listNotificationHooks, createNotificationHook, deleteNotificationHook } from '@/api/notifications'
import { listSchedules, createSchedule, runSchedule } from '@/api/schedules'
import { listUsers, updateUserHRProfile, updateUserRole } from '@/api/users'
import { getConsentStatus, acceptConsent } from '@/api/consent'
import type { User, ConsentStatus } from '@/types'
import { queryKeys } from '@/lib/queryKeys'

// ── Users ──────────────────────────────────────────────────────
export function useUsers(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.users.list(orgId!),
    queryFn: () => listUsers(orgId!).then((r) => r.data as User[]),
    enabled: !!orgId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useUpdateUserRole(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrgRole }) =>
      updateUserRole(orgId, userId, role).then((r) => r.data as User),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list(orgId) })
    },
  })
}

export function useUpdateUserHRProfile(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: Record<string, unknown> }) =>
      updateUserHRProfile(orgId, userId, body).then((r) => r.data as User),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list(orgId) })
    },
  })
}

// ── Audit ──────────────────────────────────────────────────────
export function useAudit(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.audit.list(orgId!),
    queryFn: () => listAudit(orgId!).then((r) => r.data as AuditLog[]),
    enabled: !!orgId,
  })
}

// ── Privacy Rules ──────────────────────────────────────────────
export function usePrivacyRules(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.privacy.rules(orgId!),
    queryFn: () => listPrivacyRules(orgId!).then((r) => r.data as PrivacyRule[]),
    enabled: !!orgId,
  })
}

export function useCreatePrivacyRule(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { target: string; match_type: string; pattern: string; action: string }) =>
      createPrivacyRule(orgId, data).then((r) => r.data as PrivacyRule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.privacy.rules(orgId) })
    },
  })
}

export function useDeletePrivacyRule(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => deletePrivacyRule(orgId, ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.privacy.rules(orgId) })
    },
  })
}

// ── Notification Hooks ─────────────────────────────────────────
export function useNotificationHooks(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.notifications.hooks(orgId!),
    queryFn: () => listNotificationHooks(orgId!).then((r) => r.data as NotificationHook[]),
    enabled: !!orgId,
  })
}

export function useCreateNotificationHook(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { event_type: string; url: string }) =>
      createNotificationHook(orgId, data).then((r) => r.data as NotificationHook),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.hooks(orgId) })
    },
  })
}

export function useDeleteNotificationHook(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hookId: string) => deleteNotificationHook(orgId, hookId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.hooks(orgId) })
    },
  })
}

// ── Consent ────────────────────────────────────────────────────
export function useConsentStatus(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.consent.status(orgId!),
    queryFn: () => getConsentStatus(orgId!).then((r) => r.data as ConsentStatus),
    enabled: !!orgId,
  })
}

export function useAcceptConsent(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (policyVersion: string) => acceptConsent(orgId, policyVersion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.consent.status(orgId) })
    },
  })
}

// ── Schedules ──────────────────────────────────────────────────
export function useSchedules(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.schedules.list(orgId!),
    queryFn: () => listSchedules(orgId!).then((r) => r.data as ReportSchedule[]),
    enabled: !!orgId,
  })
}

export function useCreateSchedule(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createSchedule(orgId, data).then((r) => r.data as ReportSchedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId) })
    },
  })
}

export function useRunSchedule(orgId: string) {
  return useMutation({
    mutationFn: ({ scheduleId, exportFormat }: { scheduleId: string; exportFormat: string }) =>
      runSchedule(orgId, scheduleId, exportFormat),
  })
}
