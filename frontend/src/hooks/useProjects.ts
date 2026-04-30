import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@/types'
import { listProjects, createProject, assignDepartmentHead, updateProject, reorderProjects, uploadProjectLogo } from '@/api/projects'
import { queryKeys } from '@/lib/queryKeys'

export function useProjects(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects.list(orgId!),
    queryFn: () => listProjects(orgId!).then((r) => r.data as Project[]),
    enabled: !!orgId,
  })
}

export function useCreateProject(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createProject(orgId, data.name, data.description).then((r) => r.data as Project),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.list(orgId) })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { orgId: string; projectId: string; name?: string; description?: string; logo_url?: string | null }) =>
      updateProject(data.orgId, data.projectId, {
        name: data.name,
        description: data.description,
        logo_url: data.logo_url,
      }).then((r) => r.data as Project),
    onSuccess: (_project, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.list(variables.orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.orgId, variables.projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(variables.orgId) })
    },
  })
}

export function useAssignDepartmentHead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { orgId: string; projectId: string; userId: string }) =>
      assignDepartmentHead(data.orgId, data.projectId, data.userId).then((r) => r.data as Project),
    onSuccess: (_project, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.list(variables.orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.orgId, variables.projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.users.list(variables.orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.teams.list(variables.orgId) })
    },
  })
}

export function useReorderProjects(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectIds: string[]) =>
      reorderProjects(orgId, projectIds).then((r) => r.data as Project[]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.list(orgId) })
    },
  })
}


export function useUploadProjectLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { orgId: string; projectId: string; file: File }) =>
      uploadProjectLogo(data.orgId, data.projectId, data.file).then((r) => r.data as { logo_url: string }),
    onSuccess: (payload, variables) => {
      qc.setQueryData<Project | undefined>(queryKeys.projects.detail(variables.orgId, variables.projectId), (prev) =>
        prev ? { ...prev, logo_url: payload.logo_url } : prev,
      )
      qc.setQueryData<Project[] | undefined>(queryKeys.projects.list(variables.orgId), (prev) =>
        Array.isArray(prev)
          ? prev.map((project) => (project.id === variables.projectId ? { ...project, logo_url: payload.logo_url } : project))
          : prev,
      )
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.orgId, variables.projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.projects.list(variables.orgId) })
    },
  })
}
