import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_DEFAULT_SHELL } from '@/types'
import type { ShellType } from '@/types'

const SHELL_ROUTES: Record<ShellType, string> = {
  platform: '/platform',
  company: '/company',
  department: '/department',
}

/**
 * Redirects the user from /dashboard to their role-appropriate shell dashboard.
 * Called on DashboardPage when an org is selected.
 *
 * All roles redirect to /company.
 * If no org is selected, stays on personal dashboard.
 */
export function useRoleRedirect() {
  const navigate = useNavigate()
  const { activeOrgId, activeOrg } = useOrgStore()
  const { setShell } = useContextStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)

  useEffect(() => {
    if (!activeOrgId) {
      if (isSuperAdmin || platformRole) {
        setShell('platform')
        navigate('/platform', { replace: true })
      }
      return
    }

    const current = activeOrg()
    if (!current) return

    const role = current.role
    const targetShell = ROLE_DEFAULT_SHELL[role]
    const targetRoute = SHELL_ROUTES[targetShell] ?? '/company'

    setShell(targetShell)
    navigate(targetRoute, { replace: true })
  }, [activeOrg, activeOrgId, isSuperAdmin, platformRole, navigate, setShell])
}
