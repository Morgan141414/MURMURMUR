import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CompanyAccount, Org, JoinRequest } from '@/types'
import {
  listMyOrgs,
  createOrg,
  getOrg,
  joinOrg,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '@/api/orgs'
import { queryKeys } from '@/lib/queryKeys'
import { useOrgStore } from '@/stores/orgStore'

/** Fetch all orgs the current user belongs to, with roles. */
export function useMyOrgs() {
  const setOrgs = useOrgStore((s) => s.setOrgs)

  return useQuery({
    queryKey: queryKeys.org.myOrgs(),
    queryFn: async () => {
      const { data } = await listMyOrgs()
      // Sync to zustand store
      setOrgs(
        data.map((o) => ({
          orgId: o.id,
          orgName: o.name,
          role: o.role,
          logoUrl: o.logo_url ?? undefined,
          isActive: o.is_active ?? true,
          moderationStatus: o.moderation_status ?? 'pending',
          moderationComment: o.moderation_comment ?? null,
        })),
      )
      return data
    },
  })
}

export function useOrg(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.org.detail(orgId!),
    queryFn: async () => {
      const org = await getOrg(orgId!).then((r) => r.data as Org)
      // Sync updated org name/logo to orgStore so sidebar/header reflect changes
      const { orgs, setOrgs } = useOrgStore.getState()
      const idx = orgs.findIndex((o) => o.orgId === org.id)
      if (idx !== -1) {
        const current = orgs[idx]
        if (current.orgName !== org.name || current.logoUrl !== (org.logo_url ?? undefined)) {
          setOrgs(orgs.map((o) =>
            o.orgId === org.id
              ? { ...o, orgName: org.name, logoUrl: org.logo_url ?? o.logoUrl }
              : o,
          ))
        }
      }
      return org
    },
    enabled: !!orgId,
    refetchOnWindowFocus: true,
  })
}

export function useJoinRequests(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.org.joinRequests(orgId!),
    queryFn: () => listJoinRequests(orgId!).then((r) => r.data as JoinRequest[]),
    enabled: !!orgId,
  })
}

export function useCreateOrg() {
  const qc = useQueryClient()
  const addOrg = useOrgStore((s) => s.addOrg)

  return useMutation({
    mutationFn: (payload: string | {
      name: string
      registration_kind?: string
      organization_form?: string
      description?: string
      industry?: string
      industry_group?: string
      niche_code?: string
      legal_name_kz?: string
      legal_name_ru?: string
      bin?: string
      legal_address?: string
      company_phone?: string
      company_email?: string
      oked?: string
      company_accounts_json?: CompanyAccount[]
      company_size?: string
      plan_id?: string
      moderator_message?: string
      files?: Array<{ file: File; document_type: string }>
    }) => createOrg(payload).then((r) => r.data as Org),
    onSuccess: (org) => {
      addOrg({
        orgId: org.id,
        orgName: org.name,
        role: 'founder',
        isActive: org.is_active ?? false,
        moderationStatus: org.moderation_status ?? 'pending',
        moderationComment: org.moderation_comment ?? null,
      })
      qc.invalidateQueries({ queryKey: queryKeys.org.myOrgs() })
    },
  })
}

export function useJoinOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: string | { code: string; comment?: string }) => {
      if (typeof payload === 'string') return joinOrg(payload)
      return joinOrg(payload.code, payload.comment)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.myOrgs() })
    },
  })
}

export function useApproveJoinRequest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => approveJoinRequest(orgId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.joinRequests(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.users.list(orgId) })
    },
  })
}

export function useRejectJoinRequest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      rejectJoinRequest(orgId, requestId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.joinRequests(orgId) })
    },
  })
}
