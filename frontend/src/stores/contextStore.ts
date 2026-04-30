import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShellType, OrgRole, AppContext } from '@/types'
import { ROLE_DEFAULT_SHELL, ROLE_ALLOWED_SHELLS } from '@/types'

interface ContextState {
  /** Current active shell */
  shell: ShellType | null
  /** Active project/department id within department shell */
  activeProjectId: string | null

  // Actions
  setShell: (shell: ShellType) => void
  setActiveProject: (projectId: string | null) => void

  /** Determine the best shell based on role + isSuperAdmin flag */
  resolveShell: (role: OrgRole | null, isSuperAdmin: boolean) => ShellType
  /** Check if a role can access a given shell */
  canAccessShell: (role: OrgRole | null, isSuperAdmin: boolean, shell: ShellType) => boolean
  /** Get current context snapshot */
  getContext: (orgId: string | null) => AppContext

  clear: () => void
}

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      shell: null,
      activeProjectId: null,

      setShell: (shell) => set({ shell }),

      setActiveProject: (projectId) =>
        set({ activeProjectId: projectId }),

      resolveShell: (role, isSuperAdmin) => {
        if (isSuperAdmin && !role) return 'platform'
        if (!role) return 'company'
        return ROLE_DEFAULT_SHELL[role]
      },

      canAccessShell: (role, isSuperAdmin, shell) => {
        if (isSuperAdmin) return true
        if (!role) return shell === 'company' // no role = basic company access
        return ROLE_ALLOWED_SHELLS[role].includes(shell)
      },

      getContext: (orgId) => {
        const { shell, activeProjectId } = get()
        return {
          shell: shell ?? 'company',
          orgId,
          projectId: activeProjectId,
        }
      },

      clear: () =>
        set({
          shell: null,
          activeProjectId: null,
        }),
    }),
    { name: 'context-storage' },
  ),
)
