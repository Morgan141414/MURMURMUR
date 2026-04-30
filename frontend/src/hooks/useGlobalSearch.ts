import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { filterNavByRole, getNavForShell } from '@/config/navigation'

export interface GlobalSearchResult {
  id: string
  label: string
  description?: string
  to?: string
  group: 'pages' | 'companies' | 'actions'
}

export function useGlobalSearch(query: string) {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const orgs = useOrgStore((s) => s.orgs)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeOrg = useOrgStore((s) => s.activeOrg())
  const shell = useContextStore((s) => s.shell ?? 'company')

  return useMemo(() => {
    const navSections = filterNavByRole(
      getNavForShell(shell),
      activeOrg?.role ?? null,
      isSuperAdmin,
    )

    const pages: GlobalSearchResult[] = navSections.flatMap((section) =>
      section.items.map((item) => ({
        id: `page:${item.to}`,
        label: item.labelKey.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() ?? item.to,
        description: section.labelKey.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim(),
        to: item.to,
        group: 'pages' as const,
      })),
    )

    const companies: GlobalSearchResult[] = orgs.map((org) => ({
      id: `company:${org.orgId}`,
      label: org.orgName,
      description: org.role.replace('_', ' '),
      to: org.orgId === activeOrgId ? undefined : '#switch-company',
      group: 'companies' as const,
    }))

    const actions: GlobalSearchResult[] = [
      {
        id: 'action:create-company',
        label: 'Create company',
        description: 'Quick action',
        to: '/companies/new',
        group: 'actions',
      },
      {
        id: 'action:open-profile',
        label: 'Open profile',
        description: 'Account and preferences',
        to: '/profile',
        group: 'actions',
      },
    ]

    const source = [...pages, ...companies, ...actions]
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return {
        results: source.slice(0, 10),
        recent: pages.slice(0, 4),
      }
    }

    const results = source.filter((item) =>
      [item.label, item.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    )

    return {
      results,
      recent: pages.slice(0, 4),
    }
  }, [activeOrg?.role, activeOrgId, isSuperAdmin, orgs, query, shell])
}
