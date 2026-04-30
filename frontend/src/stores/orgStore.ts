import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrgRole } from '@/types'

export interface OrgMembership {
  orgId: string
  orgName: string
  role: OrgRole
  logoUrl?: string
  isActive?: boolean
  moderationStatus?: string
  moderationComment?: string | null
}

interface OrgState {
  /** All orgs the user belongs to */
  orgs: OrgMembership[]
  /** Currently active org id, or null for personal dashboard */
  activeOrgId: string | null

  // Computed-like helpers
  activeOrg: () => OrgMembership | null
  activeOrgRole: () => OrgRole | null

  // Actions
  setOrgs: (orgs: OrgMembership[]) => void
  addOrg: (org: OrgMembership) => void
  setActiveOrg: (orgId: string | null) => void
  clear: () => void
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      orgs: [],
      activeOrgId: null,

      activeOrg: () => {
        const { orgs, activeOrgId } = get()
        return orgs.find((o) => o.orgId === activeOrgId) ?? null
      },

      activeOrgRole: () => {
        const org = get().activeOrg()
        return org?.role ?? null
      },

      setOrgs: (orgs) => {
        const { activeOrgId } = get()
        // If active org no longer in list, reset to null
        const stillExists = orgs.some((o) => o.orgId === activeOrgId)
        set({ orgs, activeOrgId: stillExists ? activeOrgId : (orgs.length > 0 ? orgs[0].orgId : null) })
      },

      addOrg: (org) => {
        const { orgs } = get()
        set({ orgs: [...orgs, org], activeOrgId: org.orgId })
      },

      setActiveOrg: (orgId) => set({ activeOrgId: orgId }),

      clear: () => set({ orgs: [], activeOrgId: null }),
    }),
    { name: 'org-storage' },
  ),
)
