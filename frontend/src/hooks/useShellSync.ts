import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useContextStore } from '@/stores/contextStore'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import type { ShellType } from '@/types'

/**
 * Syncs the active shell based on the current route.
 * This ensures the sidebar navigation matches the current page context.
 */
export function useShellSync() {
  const location = useLocation()
  const { shell, setShell, resolveShell, setActiveProject } = useContextStore()
  const { activeOrg } = useOrgStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  useEffect(() => {
    const path = location.pathname

    let targetShell: ShellType | null = null

    const departmentMatch = path.match(/^\/department\/([0-9a-f-]{36}|[0-9a-f]{32})/)
    setActiveProject(departmentMatch?.[1] ?? null)

    if (path.startsWith('/company')) {
      targetShell = 'company'
    } else if (path.startsWith('/platform')) {
      targetShell = 'platform'
    } else if (path.startsWith('/department')) {
      targetShell = 'company'
    } else if (path.startsWith('/search') || path.startsWith('/explore/')) {
      targetShell = 'company'
    } else if (path === '/dashboard' || path === '/') {
      const current = activeOrg()
      const role = current?.role ?? null
      targetShell = resolveShell(role, isSuperAdmin)
    }

    if (targetShell && targetShell !== shell) {
      setShell(targetShell)
    }
  }, [activeOrg, isSuperAdmin, location.pathname, resolveShell, setActiveProject, setShell, shell])
}
