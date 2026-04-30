import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/authStore'

export function SuperAdminRoute() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
