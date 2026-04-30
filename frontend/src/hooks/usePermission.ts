import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { getOrgRolePermissions } from '@/api/roles'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Hook to check if current user has a specific permission.
 * Fetches permissions from API and caches them.
 */
export function usePermission(permission: string): boolean {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const { data: rolePermissions } = useQuery({
    queryKey: queryKeys.roles.permissions(activeOrgId!),
    queryFn: () => getOrgRolePermissions(activeOrgId!).then((r) => {
      const map: Record<string, string[]> = {}
      const roles = r.data.roles
      for (const [roleName, roleData] of Object.entries(roles)) {
        map[roleName] = roleData.permissions
      }
      return map
    }),
    enabled: !!activeOrgId,
    staleTime: 5 * 60 * 1000,
  })

  if (isSuperAdmin) return true
  if (!activeRole || !rolePermissions) return false

  const perms = rolePermissions[activeRole] ?? []
  return perms.includes(permission)
}

/**
 * Hook to get all permissions for the current role
 */
export function usePermissions(): string[] {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const { data: rolePermissions } = useQuery({
    queryKey: queryKeys.roles.permissions(activeOrgId!),
    queryFn: () => getOrgRolePermissions(activeOrgId!).then((r) => {
      const map: Record<string, string[]> = {}
      const roles = r.data.roles
      for (const [roleName, roleData] of Object.entries(roles)) {
        map[roleName] = roleData.permissions
      }
      return map
    }),
    enabled: !!activeOrgId,
    staleTime: 5 * 60 * 1000,
  })

  if (isSuperAdmin) return ['*']
  if (!activeRole || !rolePermissions) return []

  return rolePermissions[activeRole] ?? []
}

/**
 * Check multiple permissions at once
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const userPermissions = usePermissions()
  if (userPermissions.includes('*')) return true
  return permissions.some((p) => userPermissions.includes(p))
}
