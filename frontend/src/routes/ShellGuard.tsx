import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useContextStore } from '@/stores/contextStore'
import { AccessDenied } from '@/components/shared/AccessDenied'
import type { OrgRole, ShellType } from '@/types'


const clinicalLeadershipRoles: OrgRole[] = ['founder', 'ceo', 'admin', 'superadmin', 'clinic_founder', 'clinic_ceo', 'chief_doctor']
const clinicalCareRoles: OrgRole[] = [...clinicalLeadershipRoles, 'doctor', 'reception_admin', 'call_center']
const clinicalDocumentRoles: OrgRole[] = [...clinicalLeadershipRoles, 'doctor', 'reception_admin', 'call_center']
const clinicalFinanceRoles: OrgRole[] = [...clinicalLeadershipRoles, 'accountant']
const clinicalAnalyticsRoles: OrgRole[] = [...clinicalLeadershipRoles, 'accountant']

const companyRouteAccess: Array<{ match: (path: string) => boolean; roles: OrgRole[] }> = [
  { match: (path) => path === '/patient' || path.startsWith('/patient/'), roles: ['patient'] },
  { match: (path) => path === '/clinic', roles: clinicalCareRoles },
  { match: (path) => path.startsWith('/clinic/calendar'), roles: clinicalCareRoles },
  { match: (path) => path.startsWith('/clinic/appointments'), roles: clinicalCareRoles },
  { match: (path) => path.startsWith('/clinic/patients'), roles: clinicalCareRoles },
  { match: (path) => path.startsWith('/clinic/medical-records'), roles: [...clinicalLeadershipRoles, 'doctor'] },
  { match: (path) => path.startsWith('/clinic/visits'), roles: [...clinicalLeadershipRoles, 'doctor'] },
  { match: (path) => path.startsWith('/clinic/payments'), roles: clinicalFinanceRoles },
  { match: (path) => path.startsWith('/clinic/documents'), roles: clinicalDocumentRoles },
  { match: (path) => path.startsWith('/clinic/analytics'), roles: clinicalAnalyticsRoles },
  { match: (path) => path.startsWith('/clinic/kpi'), roles: [...clinicalAnalyticsRoles, 'doctor'] },
  { match: (path) => path.startsWith('/clinic/settings'), roles: clinicalLeadershipRoles },
  { match: (path) => path === '/company/people', roles: clinicalLeadershipRoles },
  { match: (path) => path.startsWith('/company/crm'), roles: ['founder', 'ceo', 'admin', 'clinic_founder', 'clinic_ceo', 'reception_admin', 'call_center', 'sales_director', 'sales_manager', 'sales_support'] },
  { match: (path) => path === '/company/documents', roles: clinicalDocumentRoles },
  { match: (path) => path === '/company/roles', roles: ['founder', 'ceo', 'admin', 'clinic_founder', 'clinic_ceo'] },
]

function canAccessCompanyRoute(pathname: string, role: OrgRole | null, isSuperAdmin: boolean) {
  if (isSuperAdmin) return true
  const rule = companyRouteAccess.find((item) => item.match(pathname))
  if (!rule) return true
  if (!role) return false
  return rule.roles.includes(role)
}

interface ShellGuardProps {
  /** Which shell this route group belongs to */
  shell: ShellType
}

/**
 * Route guard that checks if the current user can access a given shell.
 * Wraps shell route groups (e.g. /company/*, /department/*)
 */
export function ShellGuard({ shell }: ShellGuardProps) {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const { activeOrgId, activeOrg } = useOrgStore()
  const canAccessShell = useContextStore((s) => s.canAccessShell)
  const navigate = useNavigate()
  const location = useLocation()

  const current = activeOrg()
  const role = current?.role ?? null
  const moderationStatus = current?.moderationStatus ?? 'approved'
  const isOrgActive = current?.isActive ?? true
  const isRevisionFixRoute = location.pathname === '/company/approvals'

  // Platform shell is accessible to any user with a platform role
  const hasPlatformAccess = shell === 'platform' && (isSuperAdmin || !!platformRole)
  const hasAccess = hasPlatformAccess || canAccessShell(role, isSuperAdmin, shell)

  // Company and department shells require an active org
  if ((shell === 'company' || shell === 'department') && !activeOrgId) {
    return <Navigate to="/dashboard" replace />
  }

  if ((shell === 'company' || shell === 'department') && current && !isOrgActive && !isRevisionFixRoute) {
    const reasonMap: Record<string, string> = {
      pending: 'Компания создана, но ещё не прошла модерацию. Рабочее пространство откроется после одобрения платформой.',
      approved: 'Компания прошла модерацию платформы, но рабочее пространство ещё не активировано. Обратитесь к модератору платформы.',
      revision: current.moderationComment || 'Компания отправлена на доработку. Исправьте замечания и дождитесь повторного одобрения.',
      rejected: current.moderationComment || 'Компания отклонена на этапе модерации. Для продолжения потребуется повторная подача.',
    }

    return (
      <AccessDenied
        type={moderationStatus === 'rejected' ? 'denied' : 'limited'}
        title="Компания ещё не активирована"
        reason={reasonMap[moderationStatus] || 'Доступ к рабочему пространству компании пока ограничен.'}
        grantedBy="Платформенная модерация"
      />
    )
  }

  if (shell === 'company' && !canAccessCompanyRoute(location.pathname, role, isSuperAdmin)) {
    return (
      <AccessDenied
        type="denied"
        title="Раздел недоступен"
        reason="Этот экран не входит в рабочий сценарий вашей роли. Используйте доступные пункты меню."
        grantedBy="QorMed RBAC"
      />
    )
  }

  if (!hasAccess) {
    const grantedByMap: Record<ShellType, string> = {
      platform: 'Super Admin',
      company: 'CEO',
      department: 'Team Lead / Project Manager',
    }

    const reasonMap: Record<ShellType, string> = {
      platform: 'Раздел платформы доступен только пользователям с платформенными ролями.',
      company: 'Для доступа к управлению компанией необходима соответствующая роль в организации.',
      department: 'Рабочее пространство отдела доступно только участникам с нужными правами.',
    }

    return (
      <AccessDenied
        type="denied"
        reason={reasonMap[shell]}
        grantedBy={grantedByMap[shell]}
        canRequest
        onRequest={() => navigate(-1)}
      />
    )
  }

  return <Outlet />
}
