import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { TaskColumn, BoardTask, TaskChecklistItem, TaskComment, TaskAttachment, ProjectStats } from '@/types'
import * as boardApi from '@/api/board'
import { getProject } from '@/api/projects'
import type { Project } from '@/types'

// --- Project detail ---

export function useProject(orgId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects.detail(orgId!, projectId!),
    queryFn: () => getProject(orgId!, projectId!).then((r) => r.data as Project),
    enabled: !!orgId && !!projectId,
  })
}

// --- Columns ---

export function useColumns(orgId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.board.columns(orgId!, projectId!),
    queryFn: () => boardApi.listColumns(orgId!, projectId!).then((r) => r.data as TaskColumn[]),
    enabled: !!orgId && !!projectId,
  })
}

export function useCreateColumn(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof boardApi.createColumn>[2]) =>
      boardApi.createColumn(orgId, projectId, data).then((r) => r.data as TaskColumn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.columns(orgId, projectId) })
    },
  })
}

export function useUpdateColumn(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, ...data }: { columnId: string } & Parameters<typeof boardApi.updateColumn>[3]) =>
      boardApi.updateColumn(orgId, projectId, columnId, data).then((r) => r.data as TaskColumn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.columns(orgId, projectId) })
    },
  })
}

export function useDeleteColumn(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (columnId: string) => boardApi.deleteColumn(orgId, projectId, columnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.columns(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId) })
    },
  })
}

export function useReorderColumns(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (columnIds: string[]) =>
      boardApi.reorderColumns(orgId, projectId, columnIds).then((r) => r.data as TaskColumn[]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.columns(orgId, projectId) })
    },
  })
}

// --- Project Tasks ---

export function useProjectTasks(
  orgId: string | null,
  projectId: string | null,
  mode: 'active' | 'archived' | 'all' = 'active',
) {
  return useQuery({
    queryKey: queryKeys.board.tasks(orgId!, projectId!, mode),
    queryFn: () => boardApi.listProjectTasks(orgId!, projectId!, mode).then((r) => r.data as BoardTask[]),
    enabled: !!orgId && !!projectId,
  })
}

export function useMyBoardTasks(orgId: string | null, mode: 'active' | 'archived' | 'all' = 'active') {
  return useQuery({
    queryKey: queryKeys.board.myTasks(orgId!, mode),
    queryFn: () => boardApi.listMyBoardTasks(orgId!, mode).then((r) => r.data as BoardTask[]),
    enabled: !!orgId,
  })
}

export function useProjectTask(orgId: string | null, projectId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.board.task(orgId!, projectId!, taskId!),
    queryFn: () => boardApi.getProjectTask(orgId!, projectId!, taskId!).then((r) => r.data as BoardTask),
    enabled: !!orgId && !!projectId && !!taskId,
  })
}

export function useCreateProjectTask(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof boardApi.createProjectTask>[2]) =>
      boardApi.createProjectTask(orgId, projectId, data).then((r) => r.data as BoardTask),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.stats(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId, 'archived') })
      qc.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId, 'archived') })
    },
  })
}

export function useUpdateProjectTask(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, ...data }: { taskId: string } & Parameters<typeof boardApi.updateProjectTask>[3]) =>
      boardApi.updateProjectTask(orgId, projectId, taskId, data).then((r) => r.data as BoardTask),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.stats(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId, 'archived') })
      qc.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId, 'archived') })
    },
  })
}

export function useReorderTasks(orgId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { task_id: string; column_id: string; position: number }) =>
      boardApi.reorderTasks(orgId, projectId, data).then((r) => r.data as BoardTask[]),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: queryKeys.board.tasks(orgId, projectId) })
      const prev = qc.getQueryData<BoardTask[]>(queryKeys.board.tasks(orgId, projectId))
      if (prev) {
        qc.setQueryData<BoardTask[]>(queryKeys.board.tasks(orgId, projectId), (old) =>
          old?.map((t) =>
            t.id === data.task_id ? { ...t, column_id: data.column_id, position: data.position } : t
          )
        )
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.board.tasks(orgId, projectId), ctx.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.stats(orgId, projectId) })
      qc.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, projectId, 'archived') })
    },
  })
}

// --- Stats ---

export function useProjectStats(orgId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.board.stats(orgId!, projectId!),
    queryFn: () => boardApi.getProjectStats(orgId!, projectId!).then((r) => r.data as ProjectStats),
    enabled: !!orgId && !!projectId,
  })
}

// --- Comments ---

export function useComments(orgId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.board.comments(orgId!, taskId!),
    queryFn: () => boardApi.listComments(orgId!, taskId!).then((r) => r.data as TaskComment[]),
    enabled: !!orgId && !!taskId,
  })
}

export function useCreateComment(orgId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => boardApi.createComment(orgId, taskId, text).then((r) => r.data as TaskComment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.comments(orgId, taskId) })
    },
  })
}

// --- Checklist ---

export function useChecklist(orgId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.board.checklist(orgId!, taskId!),
    queryFn: () => boardApi.listChecklist(orgId!, taskId!).then((r) => r.data as TaskChecklistItem[]),
    enabled: !!orgId && !!taskId,
  })
}

export function useToggleChecklistItem(orgId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, is_done }: { itemId: string; is_done: boolean }) =>
      boardApi.updateChecklistItem(orgId, taskId, itemId, { is_done }).then((r) => r.data as TaskChecklistItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.checklist(orgId, taskId) })
    },
  })
}

export function useCreateChecklistItem(orgId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => boardApi.createChecklistItem(orgId, taskId, text).then((r) => r.data as TaskChecklistItem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.checklist(orgId, taskId) })
    },
  })
}

export function useDeleteChecklistItem(orgId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => boardApi.deleteChecklistItem(orgId, taskId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.checklist(orgId, taskId) })
    },
  })
}

// --- Attachments ---

export function useAttachments(orgId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.board.attachments(orgId!, taskId!),
    queryFn: () => boardApi.listAttachments(orgId!, taskId!).then((r) => r.data as TaskAttachment[]),
    enabled: !!orgId && !!taskId,
  })
}

export function useUploadAttachment(orgId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => boardApi.uploadAttachment(orgId, taskId, file).then((r) => r.data as TaskAttachment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.attachments(orgId, taskId) })
      qc.invalidateQueries({ queryKey: ['board', orgId] })
    },
  })
}

export function useDeleteAttachment(orgId: string, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => boardApi.deleteAttachment(orgId, taskId, attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.board.attachments(orgId, taskId) })
      qc.invalidateQueries({ queryKey: ['board', orgId] })
    },
  })
}
