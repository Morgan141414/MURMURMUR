import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Task } from '@/types'
import { listTodayTasks, createTask, updateTask } from '@/api/tasks'
import { queryKeys } from '@/lib/queryKeys'

export function useTodayTasks(orgId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks.today(orgId!),
    queryFn: () => listTodayTasks(orgId!).then((r) => r.data as Task[]),
    enabled: !!orgId,
  })
}

export function useCreateTask(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; description?: string; assignee_id?: string; team_id?: string; due_date?: string }) =>
      createTask(orgId, data).then((r) => r.data as Task),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.today(orgId) })
    },
  })
}

export function useUpdateTask(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      updateTask(orgId, taskId, data).then((r) => r.data as Task),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.today(orgId) })
    },
  })
}
