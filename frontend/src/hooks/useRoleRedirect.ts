import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_DEFAULT_SHELL } from '@/types'
import type { OrgRole, ShellType } from '@/types'

const SHELL_ROUTES: Record<ShellType, string> = {
  platform: '/platform',
  company: '/company',
  department: '/department',
}

const ROLE_HOME_ROUTES: Partial<Record<OrgRole, string>> = {
  founder: '/clinic',
  ceo: '/clinic',
  admin: '/clinic',
  clinic_founder: '/clinic',
  clinic_ceo: '/clinic',
  chief_doctor: '/clinic',
  doctor: '/clinic/visits/visit-1042',
  reception_admin: '/clinic/calendar',
  call_center: '/clinic/calendar',
  accountant: '/clinic/payments',
  patient: '/patient',
  support_agent: '/support',
  sales_director: '/company/crm',
  sales_manager: '/company/crm',
  sales_support: '/company/crm',
}

/**
 * Redirects the user from /dashboard to their role-appropriate shell dashboard.
 * Called on DashboardPage when an org is selected.
 *
 * Clinical roles land on their primary workflow route.
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
    const targetRoute = ROLE_HOME_ROUTES[role] ?? SHELL_ROUTES[targetShell] ?? '/company'

    setShell(targetShell)
    navigate(targetRoute, { replace: true })
  }, [activeOrg, activeOrgId, isSuperAdmin, platformRole, navigate, setShell])
}
