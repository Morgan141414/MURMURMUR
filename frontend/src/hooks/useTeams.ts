import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Team } from '@/types'
import { listTeams, listMyTeams, createTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember, assignTeamLead, uploadTeamLogo } from '@/api/teams'
import { queryKeys } from '@/lib/queryKeys'

export function useTeams(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.teams.list(orgId!),
    queryFn: () => listTeams(orgId!).then((r) => r.data as Team[]),
    enabled: !!orgId,
  })
}

export function useMyTeams(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.teams.my(orgId!),
    queryFn: () => listMyTeams(orgId!).then((r) => r.data as Team[]),
    enabled: !!orgId,
  })
}

export function useCreateTeam(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; projectId?: string }) =>
      createTeam(orgId, data.name, data.projectId).then((r) => r.data as Team),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.my(orgId) })
    },
  })
}

export function useUpdateTeam(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { 
      teamId: string; 
      name?: string; 
      projectId?: string; 
      logo_url?: string | null;
      timezone?: string;
      working_hours_start?: string;
      working_hours_end?: string;
      working_days?: string;
    }) =>
      updateTeam(orgId, data.teamId, {
        name: data.name,
        projectId: data.projectId,
        logo_url: data.logo_url,
        timezone: data.timezone,
        working_hours_start: data.working_hours_start,
        working_hours_end: data.working_hours_end,
        working_days: data.working_days,
      }).then((r) => r.data as Team),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.my(orgId) })
    },
  })
}

export function useDeleteTeam(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId }: { teamId: string }) => deleteTeam(orgId, teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.my(orgId) })
    },
  })
}

export function useAddTeamMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      addTeamMember(orgId, teamId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
    },
  })
}

export function useRemoveTeamMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeTeamMember(orgId, teamId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
    },
  })
}

export function useAssignTeamLead(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      assignTeamLead(orgId, teamId, userId).then((r) => r.data as Team),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.my(orgId) })
    },
  })
}


export function useUploadTeamLogo(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, file }: { teamId: string; file: File }) =>
      uploadTeamLogo(orgId, teamId, file).then((r) => r.data as { logo_url: string }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.my(orgId) })
    },
  })
}
