import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, useParams } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'
import { ShellGuard } from './ShellGuard'
import { PlatformRoleGuard } from './PlatformRoleGuard'
import { SuperAdminRoute } from './SuperAdminRoute'
import { RouteErrorElement } from './RouteErrorElement'
import { recoverFromDynamicImportError } from '@/lib/chunkRecovery'

function lazyRoute<T extends ComponentType<unknown>>(loader: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await loader()
    } catch (error) {
      void recoverFromDynamicImportError(error)
      throw error
    }
  })
}

// ── Auth pages ──
const LoginPage = lazyRoute(() => import('@/pages/LoginPage'))
const RegisterPage = lazyRoute(() => import('@/pages/RegisterPage'))
const PatientRegisterPage = lazyRoute(() => import('@/pages/patient/PatientRegisterPage'))
const ForgotPasswordPage = lazyRoute(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazyRoute(() => import('@/pages/auth/ResetPasswordPage'))
const InvitationAcceptPage = lazyRoute(() => import('@/pages/auth/InvitationAcceptPage'))
const BloomLandingPage = lazyRoute(() => import('@/pages/BloomLandingPage'))

// ── Personal / shared pages ──
const DashboardPage = lazyRoute(() => import('@/pages/DashboardPage'))
const ProfilePage = lazyRoute(() => import('@/pages/ProfilePage'))
const ProfileSettingsPage = lazyRoute(() => import('@/pages/ProfileSettingsPage'))
const SettingsPage = lazyRoute(() => import('@/pages/SettingsPage'))
const ReportsPage = lazyRoute(() => import('@/pages/ReportsPage'))
const SupportPage = lazyRoute(() => import('@/pages/SupportPage'))
const FaqPage = lazyRoute(() => import('@/pages/FaqPage'))
const NotFoundPage = lazyRoute(() => import('@/pages/NotFoundPage'))
const RatingsPage = lazyRoute(() => import('@/pages/RatingsPage'))
const TariffPlansPage = lazyRoute(() => import('@/pages/TariffPlansPage'))
const VacancyCatalogPage = lazyRoute(() => import('@/pages/vacancies/VacancyCatalogPage'))
const VacancyDetailPage = lazyRoute(() => import('@/pages/vacancies/VacancyDetailPage'))
const SearchExplorePage = lazyRoute(() => import('@/pages/SearchExplorePage'))
const PublicCompanyPage = lazyRoute(() => import('@/pages/PublicCompanyPage'))
const PublicUserPage = lazyRoute(() => import('@/pages/PublicUserPage'))

// ── Company shell pages ──
const CompanyDashboard = lazyRoute(() => import('@/pages/company/CompanyDashboard'))
const CompanyPeoplePage = lazyRoute(() => import('@/pages/company/CompanyPeoplePage'))
const CompanyOwnersPage = lazyRoute(() => import('@/pages/company/CompanyOwnersPage'))
const CompanyProfileEditorPage = lazyRoute(() => import('@/pages/company/CompanyProfileEditorPage'))
const CompanyApprovalsPage = lazyRoute(() => import('@/pages/company/CompanyApprovalsPage'))
const CompanyDocumentsPage = lazyRoute(() => import('@/pages/company/CompanyDocumentsPage'))
const ClinicalWorkspacePage = lazyRoute(() => import('@/pages/company/ClinicalWorkspacePage'))
const HRWorkspacePage = lazyRoute(() => import('@/pages/company/HRWorkspacePage'))
const ProjectsPage = lazyRoute(() => import('@/pages/admin/ProjectsPage'))
const JoinRequestsPage = lazyRoute(() => import('@/pages/admin/JoinRequestsPage'))
const TeamsPage = lazyRoute(() => import('@/pages/admin/TeamsPage'))
const NotificationsPage = lazyRoute(() => import('@/pages/admin/NotificationsPage'))
const SubscriptionPage = lazyRoute(() => import('@/pages/admin/SubscriptionPage'))
const AuditPage = lazyRoute(() => import('@/pages/admin/AuditPage'))
const RoleManagementPage = lazyRoute(() => import('@/pages/company/RoleManagementPage'))
const MyBoardPage = lazyRoute(() => import('@/pages/company/MyBoardPage'))
const AccountingPage = lazyRoute(() => import('@/pages/company/accounting/AccountingPage'))

// ── QorMed Clinical OS pages ──
const ClinicDashboardPage = lazyRoute(() => import('@/pages/clinic/ClinicDashboardPage'))
const ClinicCalendarPage = lazyRoute(() => import('@/pages/clinic/ClinicCalendarPage'))
const ClinicSchedulePage = lazyRoute(() => import('@/pages/clinic/ClinicSchedulePage'))
const ClinicAppointmentsPage = lazyRoute(() => import('@/pages/clinic/ClinicAppointmentsPage'))
const ClinicPatientsPage = lazyRoute(() => import('@/pages/clinic/ClinicPatientsPage'))
const ClinicPatientCardPage = lazyRoute(() => import('@/pages/clinic/ClinicPatientCardPage'))
const ClinicVisitPage = lazyRoute(() => import('@/pages/clinic/ClinicVisitPage'))
const ClinicPaymentsPage = lazyRoute(() => import('@/pages/clinic/ClinicPaymentsPage'))
const ClinicDocumentsPage = lazyRoute(() => import('@/pages/clinic/ClinicDocumentsPage'))
const ClinicAnalyticsPage = lazyRoute(() => import('@/pages/clinic/ClinicAnalyticsPage'))
const ClinicSettingsPage = lazyRoute(() => import('@/pages/clinic/ClinicSettingsPage'))
const PatientPortalPage = lazyRoute(() => import('@/pages/patient/PatientPortalPage'))

// ── CRM pages ──
const CRMDashboardPage = lazy(() => import('@/pages/crm/CRMDashboardPage'))
const LeadsPage = lazy(() => import('@/pages/crm/LeadsPage'))
const ContactsPage = lazy(() => import('@/pages/crm/ContactsPage'))
const DealsPage = lazy(() => import('@/pages/crm/DealsPage'))
const DealDetailPage = lazy(() => import('@/pages/crm/DealDetailPage'))
const OrganizationsPage = lazy(() => import('@/pages/crm/OrganizationsPage'))
const NotesPage = lazy(() => import('@/pages/crm/NotesPage'))
const TasksPage = lazy(() => import('@/pages/crm/TasksPage'))
const CallLogsPage = lazy(() => import('@/pages/crm/CallLogsPage'))
const PipelinesPage = lazy(() => import('@/pages/crm/PipelinesPage'))
const AutomationPage = lazy(() => import('@/pages/crm/AutomationPage'))

// ── Department (formerly Project) shell pages ──
const ProjectSelectorPage = lazyRoute(() => import('@/pages/project/ProjectSelectorPage'))
const ProjectDashboard = lazyRoute(() => import('@/pages/project/ProjectDashboard'))
const ProjectSettingsPage = lazyRoute(() => import('@/pages/project/ProjectSettingsPage'))
const ProjectDetailPage = lazyRoute(() => import('@/pages/admin/ProjectDetailPage'))
const ProjectMembersPage = lazyRoute(() => import('@/pages/project/ProjectMembersPage'))
const TeamDetailsPage = lazyRoute(() => import('@/pages/project/TeamDetailsPage'))
const TeamSettingsPage = lazyRoute(() => import('@/pages/project/TeamSettingsPage'))
const TeamCreatePage = lazyRoute(() => import('@/pages/project/TeamCreatePage'))

// ── Platform shell pages ──
const PlatformDashboard = lazyRoute(() => import('@/pages/platform/PlatformDashboard'))
const PlatformCompaniesPage = lazyRoute(() => import('@/pages/superadmin/CompaniesPage'))
const PlatformUsersPage = lazyRoute(() => import('@/pages/platform/PlatformUsersPage'))
const PlatformModerationPage = lazyRoute(() => import('@/pages/platform/PlatformModerationPage'))
const PlatformSupportPage = lazyRoute(() => import('@/pages/platform/PlatformSupportPage'))
const PlatformBillingPage = lazyRoute(() => import('@/pages/platform/PlatformBillingPage'))
const PlatformMarketingPage = lazyRoute(() => import('@/pages/platform/PlatformMarketingPage'))
const PlatformAuditLogPage = lazyRoute(() => import('@/pages/platform/PlatformAuditLogPage'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6 animate-in fade-in duration-300">
          {/* Header skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted/70 animate-pulse" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <div className="h-5 w-12 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Content skeleton */}
          <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="h-8 w-8 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-2.5 w-1/2 rounded bg-muted/60" />
                  </div>
                  <div className="h-5 w-16 rounded-md bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function W({ children }: { children: React.ReactNode }) {
  return <SuspenseWrapper>{children}</SuspenseWrapper>
}

function EmptyRoute() {
  return null
}

function LegacyProjectRedirect() {
  const { projectId } = useParams()
  return <Navigate to={projectId ? `/department/${projectId}/board` : '/department'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <RouteErrorElement />,
  },

  // ── Public routes ──
  { path: '/login', element: <W><LoginPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/auth', element: <W><LoginPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/register', element: <W><RegisterPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/patient/register', element: <W><PatientRegisterPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/forgot-password', element: <W><ForgotPasswordPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/reset-password', element: <W><ResetPasswordPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/invitation/:token', element: <W><InvitationAcceptPage /></W>, errorElement: <RouteErrorElement /> },
  { path: '/bloom', element: <W><BloomLandingPage /></W>, errorElement: <RouteErrorElement /> },

  // ── Protected routes ──
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorElement />,
    children: [
      // Personal / shared
      { path: '/dashboard', element: <W><DashboardPage /></W> },
      { path: '/profile', element: <W><ProfilePage /></W> },
      { path: '/profile/settings', element: <W><ProfileSettingsPage /></W> },
      { path: '/settings', element: <W><SettingsPage /></W> },
      { path: '/reports', element: <Navigate to="/dashboard" replace /> },
      { path: '/support', element: <W><SupportPage /></W> },
      { path: '/faq', element: <W><FaqPage /></W> },
      { path: '/messenger', element: <EmptyRoute /> },
      { path: '/ratings', element: <W><RatingsPage /></W> },
      { path: '/tariffs', element: <W><TariffPlansPage /></W> },
      { path: '/search', element: <W><SearchExplorePage /></W> },
      { path: '/explore/companies/:orgId', element: <W><PublicCompanyPage /></W> },
      { path: '/explore/users/:userId', element: <W><PublicUserPage /></W> },
      { path: '/users/:userId', element: <W><PublicUserPage /></W> },
      { path: '/vacancies', element: <W><VacancyCatalogPage /></W> },
      { path: '/vacancies/:id', element: <W><VacancyDetailPage /></W> },

      { path: '/patient', element: <W><PatientPortalPage /></W> },
      { path: '/patient/records', element: <W><PatientPortalPage /></W> },
      { path: '/patient/documents', element: <W><PatientPortalPage /></W> },
      { path: '/patient/support', element: <W><PatientPortalPage /></W> },

      // ── Company Shell (guarded) ──
      {
        element: <ShellGuard shell="company" />,
        children: [
          { path: '/company', element: <W><CompanyDashboard /></W> },
          { path: '/company/people', element: <W><CompanyPeoplePage /></W> },
          { path: '/company/profile', element: <W><CompanyProfileEditorPage /></W> },
          { path: '/company/owners', element: <W><CompanyOwnersPage /></W> },
          { path: '/company/teams', element: <W><TeamsPage /></W> },
          { path: '/company/my-board', element: <W><MyBoardPage /></W> },
          { path: '/company/projects', element: <W><ProjectsPage /></W> },
          { path: '/company/approvals', element: <W><CompanyApprovalsPage /></W> },
          { path: '/company/roles', element: <W><RoleManagementPage /></W> },
          { path: '/company/join-requests', element: <W><JoinRequestsPage /></W> },
          { path: '/company/documents', element: <W><CompanyDocumentsPage /></W> },
          { path: '/company/clinical', element: <W><ClinicalWorkspacePage /></W> },
          { path: '/clinic', element: <W><ClinicDashboardPage /></W> },
          { path: '/clinic/calendar', element: <W><ClinicCalendarPage /></W> },
          { path: '/clinic/schedule', element: <W><ClinicSchedulePage /></W> },
          { path: '/clinic/appointments', element: <W><ClinicAppointmentsPage /></W> },
          { path: '/clinic/patients', element: <W><ClinicPatientsPage /></W> },
          { path: '/clinic/medical-records', element: <Navigate to="/clinic/patients" replace /> },
          { path: '/clinic/patients/:patientId', element: <W><ClinicPatientCardPage /></W> },
          { path: '/clinic/visits/:visitId', element: <W><ClinicVisitPage /></W> },
          { path: '/clinic/payments', element: <W><ClinicPaymentsPage /></W> },
          { path: '/clinic/documents', element: <W><ClinicDocumentsPage /></W> },
          { path: '/clinic/analytics', element: <W><ClinicAnalyticsPage /></W> },
          { path: '/clinic/kpi', element: <W><ClinicAnalyticsPage /></W> },
          { path: '/clinic/settings', element: <W><ClinicSettingsPage /></W> },
          {
            element: <SuperAdminRoute />,
            children: [
              { path: '/company/accounting', element: <W><AccountingPage /></W> },
            ],
          },
          { path: '/company/analytics', element: <Navigate to="/clinic/analytics" replace /> },
          { path: '/company/hr', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/vacancies', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/candidates', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/interviews', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/offers', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/analytics', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/onboarding', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/offboarding', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/documents', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/employees', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/tasks', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/settings', element: <W><HRWorkspacePage /></W> },
          { path: '/company/hr/signatures', element: <Navigate to="/company/hr/documents" replace /> },
          { path: '/company/hr/leave', element: <W><HRWorkspacePage /></W> },
          { path: '/company/notifications', element: <W><NotificationsPage /></W> },
          { path: '/company/audit-log', element: <W><AuditPage /></W> },
          { path: '/company/settings', element: <W><SettingsPage /></W> },
          { path: '/company/subscription', element: <W><SubscriptionPage /></W> },

          // ── CRM routes ──
          { path: '/company/crm', element: <W><CRMDashboardPage /></W> },
          { path: '/company/crm/dashboard', element: <W><CRMDashboardPage /></W> },
          { path: '/company/crm/leads', element: <W><LeadsPage /></W> },
          { path: '/company/crm/contacts', element: <W><ContactsPage /></W> },
          { path: '/company/crm/deals', element: <W><DealsPage /></W> },
          { path: '/company/crm/deals/:dealId', element: <W><DealDetailPage /></W> },
          { path: '/company/crm/organizations', element: <W><OrganizationsPage /></W> },
          { path: '/company/crm/notes', element: <W><NotesPage /></W> },
          { path: '/company/crm/tasks', element: <W><TasksPage /></W> },
          { path: '/company/crm/calls', element: <W><CallLogsPage /></W> },
          { path: '/company/crm/pipelines', element: <W><PipelinesPage /></W> },
          { path: '/company/crm/automation', element: <W><AutomationPage /></W> },
        ],
      },

      // ── Platform Shell (guarded) ──
      {
        element: <ShellGuard shell="platform" />,
        children: [
          { path: '/platform', element: <W><PlatformDashboard /></W> },
          // Role-guarded platform pages
          {
            element: <PlatformRoleGuard allowedRoles={['superadmin', 'moderator', 'tech_support']} />,
            children: [
              { path: '/platform/companies', element: <W><PlatformCompaniesPage /></W> },
              { path: '/platform/moderation', element: <W><PlatformModerationPage /></W> },
            ],
          },
          {
            element: <PlatformRoleGuard allowedRoles={['superadmin', 'admin']} />,
            children: [
              { path: '/platform/users', element: <W><PlatformUsersPage /></W> },
            ],
          },
          {
            element: <PlatformRoleGuard allowedRoles={['superadmin', 'tech_support', 'moderator']} />,
            children: [
              { path: '/platform/support', element: <W><PlatformSupportPage /></W> },
            ],
          },
          {
            element: <PlatformRoleGuard allowedRoles={['superadmin']} />,
            children: [
              { path: '/platform/billing', element: <W><PlatformBillingPage /></W> },
            ],
          },
          {
            element: <PlatformRoleGuard allowedRoles={['superadmin', 'marketing']} />,
            children: [
              { path: '/platform/marketing', element: <W><PlatformMarketingPage /></W> },
            ],
          },
          {
            element: <PlatformRoleGuard allowedRoles={['superadmin']} />,
            children: [
              { path: '/platform/audit-log', element: <W><PlatformAuditLogPage /></W> },
            ],
          },
        ],
      },

      // ── Department Shell (formerly Project, guarded) ──
      {
        element: <ShellGuard shell="company" />,
        children: [
          { path: '/department', element: <W><ProjectSelectorPage /></W> },
          { path: '/department/:projectId', element: <W><ProjectDashboard /></W> },
          { path: '/department/:projectId/settings', element: <W><ProjectSettingsPage /></W> },
          { path: '/department/:projectId/board', element: <W><ProjectDetailPage /></W> },
          { path: '/department/:projectId/tasks', element: <W><ProjectDetailPage /></W> },
          { path: '/department/:projectId/members', element: <W><ProjectMembersPage /></W> },
          { path: '/department/:projectId/team/new', element: <W><TeamCreatePage /></W> },
          { path: '/department/:projectId/team/:teamId', element: <W><TeamDetailsPage /></W> },
          { path: '/department/:projectId/team/:teamId/settings', element: <W><TeamSettingsPage /></W> },
        ],
      },

      // ── Legacy redirects ──
      { path: '/admin', element: <Navigate to="/company" replace /> },
      { path: '/admin/join-requests', element: <Navigate to="/company/join-requests" replace /> },
      { path: '/admin/projects', element: <Navigate to="/company/projects" replace /> },
      { path: '/admin/projects/:projectId', element: <LegacyProjectRedirect /> },
      { path: '/admin/teams', element: <Navigate to="/company/teams" replace /> },
      { path: '/admin/users', element: <Navigate to="/company/people" replace /> },
      { path: '/admin/privacy', element: <Navigate to="/company" replace /> },
      { path: '/admin/notifications', element: <Navigate to="/company/notifications" replace /> },
      { path: '/admin/audit', element: <Navigate to="/company/audit-log" replace /> },
      { path: '/admin/schedules', element: <Navigate to="/company" replace /> },
      { path: '/admin/subscription', element: <Navigate to="/company" replace /> },
      { path: '/admin/hr', element: <Navigate to="/company/hr" replace /> },
      { path: '/superadmin/companies', element: <Navigate to="/platform/companies" replace /> },
      { path: '/superadmin/certificates', element: <Navigate to="/company" replace /> },
      { path: '/company/reports', element: <Navigate to="/company/analytics" replace /> },
      { path: '/company/policies', element: <Navigate to="/company/documents" replace /> },
      { path: '/company/hr/schedules', element: <Navigate to="/company/hr" replace /> },
      { path: '/company/support', element: <Navigate to="/support" replace /> },
      { path: '/company/integrations', element: <Navigate to="/company" replace /> },
      { path: '/company/system-logs', element: <Navigate to="/company" replace /> },
      { path: '/company/role-permissions', element: <Navigate to="/company/roles" replace /> },
      { path: '/company/audit', element: <Navigate to="/company/audit-log" replace /> },
      // Legacy project → department redirects
      { path: '/project', element: <Navigate to="/department" replace /> },
      { path: '/project/:projectId', element: <LegacyProjectRedirect /> },
      { path: '/project/:projectId/board', element: <LegacyProjectRedirect /> },
      { path: '/project/:projectId/tasks', element: <LegacyProjectRedirect /> },
      { path: '/project/:projectId/members', element: <LegacyProjectRedirect /> },
      // Legacy governance/emergency → company
      { path: '/governance', element: <Navigate to="/company" replace /> },
      { path: '/governance/*', element: <Navigate to="/company" replace /> },
      { path: '/emergency', element: <Navigate to="/company" replace /> },
      { path: '/emergency/*', element: <Navigate to="/company" replace /> },
      { path: '/platform/incidents', element: <Navigate to="/platform" replace /> },
      { path: '/platform/health', element: <Navigate to="/platform" replace /> },
      { path: '/platform/access-requests', element: <Navigate to="/platform" replace /> },
    ],
  },

  // ── 404 ──
  { path: '*', element: <W><NotFoundPage /></W>, errorElement: <RouteErrorElement /> },
])
