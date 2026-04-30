import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@/types'
import { getMe, updateMe } from '@/api/profile'
import { queryKeys } from '@/lib/queryKeys'

export function useMe() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => getMe().then((r) => r.data as User),
  })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Omit<User, 'id' | 'email'>>) =>
      updateMe(data).then((r) => r.data as User),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.profile.me(), updated)
    },
  })
}
