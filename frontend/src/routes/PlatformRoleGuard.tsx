import { Navigate, Outlet } from 'react-router'
import { useAuthStore, type PlatformRole } from '@/stores/authStore'

interface PlatformRoleGuardProps {
  /** Platform roles allowed to access the child routes */
  allowedRoles: PlatformRole[]
}

/**
 * Guards child routes so only users with matching platform roles
 * (or superadmins) can access them.
 */
export function PlatformRoleGuard({ allowedRoles }: PlatformRoleGuardProps) {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)

  if (isSuperAdmin) return <Outlet />
  if (platformRole && allowedRoles.includes(platformRole)) return <Outlet />

  return <Navigate to="/platform" replace />
}
