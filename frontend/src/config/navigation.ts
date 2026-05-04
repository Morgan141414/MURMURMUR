import type { ShellType, OrgRole } from '@/types'
import type { PlatformRole } from '@/stores/authStore'
import {
  Building2,
  Users, FolderKanban, Files,
  KanbanSquare, UsersRound, Briefcase,
  LayoutDashboard,
  UserPlus, UserCircle,
  Shield, ClipboardCheck,
  Megaphone, HeadphonesIcon, Scale, DollarSign,
  ContactRound,
  Calculator,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  roles?: OrgRole[]
  requiresSuperAdmin?: boolean
  platformRoles?: PlatformRole[]
  badge?: 'emergency' | 'governance' | 'count'
  strictRoles?: boolean
}

export interface NavSection {
  labelKey: string
  items: NavItem[]
}

export const companyNav: NavSection[] = [
  {
    labelKey: 'nav.sections.overview',
    items: [
      { to: '/company/people', labelKey: 'nav.companyPeople', icon: Users },
      { to: '/company/crm', labelKey: 'nav.crm', icon: ContactRound, roles: ['founder', 'ceo', 'admin', 'sales_director', 'sales_manager', 'sales_support'] },
      { to: '/company/projects', labelKey: 'nav.departments', icon: FolderKanban, roles: ['founder', 'ceo', 'hr', 'lawyer'] },
      { to: '/company/documents', labelKey: 'nav.documents', icon: Files },
    ],
  },
  {
    labelKey: 'nav.sections.management',
    items: [
      { to: '/company/approvals', labelKey: 'nav.approvals', icon: ClipboardCheck, roles: ['founder', 'ceo', 'hr', 'admin'] },
      { to: '/company/owners', labelKey: 'nav.ownership', icon: Building2, roles: ['founder', 'ceo', 'admin'] },
      { to: '/company/join-requests', labelKey: 'nav.joinRequests', icon: UserPlus, roles: ['founder', 'ceo', 'hr', 'recruiter'] },
    ],
  },
  {
    labelKey: 'nav.sections.finance',
    items: [
      { to: '/company/accounting', labelKey: 'nav.accounting', icon: Calculator, requiresSuperAdmin: true },
    ],
  },
  {
    labelKey: 'nav.sections.hr',
    items: [
      { to: '/company/hr', labelKey: 'nav.hrWorkspace', icon: Users, roles: ['hr', 'recruiter', 'hiring_manager'], strictRoles: true },
    ],
  },
]

export const platformNav: NavSection[] = [
  {
    labelKey: 'nav.sections.overview',
    items: [
      { to: '/platform', labelKey: 'nav.platformOverview', icon: LayoutDashboard },
      { to: '/platform/companies', labelKey: 'nav.companies', icon: Building2, platformRoles: ['superadmin', 'moderator'] },
      { to: '/platform/users', labelKey: 'nav.platformUsers', icon: Users, platformRoles: ['superadmin', 'admin'] },
    ],
  },
  {
    labelKey: 'nav.sections.management',
    items: [
      { to: '/platform/moderation', labelKey: 'nav.moderation', icon: Scale, platformRoles: ['superadmin', 'moderator', 'tech_support'] },
      { to: '/platform/support', labelKey: 'nav.techSupport', icon: HeadphonesIcon, platformRoles: ['superadmin', 'tech_support', 'moderator'] },
      { to: '/platform/billing', labelKey: 'nav.billing', icon: DollarSign, platformRoles: ['superadmin'] },
      { to: '/platform/marketing', labelKey: 'nav.marketing', icon: Megaphone, platformRoles: ['superadmin', 'marketing'] },
    ],
  },
  {
    labelKey: 'nav.sections.finance',
    items: [
      { to: '/company/accounting', labelKey: 'nav.accounting', icon: Calculator, platformRoles: ['superadmin'] },
    ],
  },
  {
    labelKey: 'nav.sections.security',
    items: [
      { to: '/platform/audit-log', labelKey: 'nav.auditLog', icon: Shield, platformRoles: ['superadmin'] },
    ],
  },
]

export const departmentNav: NavSection[] = [
  {
    labelKey: 'nav.sections.workspace',
    items: [
      { to: '/department', labelKey: 'nav.departmentHome', icon: Briefcase },
      { to: '/department/:id/board', labelKey: 'nav.board', icon: KanbanSquare },
      { to: '/department/:id/members', labelKey: 'nav.members', icon: UsersRound },
    ],
  },
]

export const personalCabinetItem: NavItem = {
  to: '/profile',
  labelKey: 'nav.personalCabinet',
  icon: UserCircle,
}

export function getNavForShell(shell: ShellType): NavSection[] {
  switch (shell) {
    case 'platform': return platformNav
    case 'company': return companyNav
    case 'department': return departmentNav
    default: return companyNav
  }
}

export function filterNavByRole(
  sections: NavSection[],
  role: OrgRole | null,
  isSuperAdmin: boolean,
  platformRole?: PlatformRole | null,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requiresSuperAdmin && !isSuperAdmin) return false
        if (item.platformRoles && item.platformRoles.length > 0) {
          if (isSuperAdmin) return true
          if (!platformRole) return false
          return item.platformRoles.includes(platformRole)
        }
        if (!item.roles || item.roles.length === 0) return true
        if (isSuperAdmin && !item.strictRoles) return true
        if (!role) return false
        return item.roles.includes(role)
      }),
    }))
    .filter((section) => section.items.length > 0)
}
