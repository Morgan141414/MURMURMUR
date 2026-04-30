import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'

const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/company': 'nav.companyDashboard',
  '/company/profile': 'company.editProfile',
  '/company/people': 'nav.employees',
  '/company/teams': 'nav.teams',
  '/company/my-board': 'cabinet.memberTitle',
  '/company/projects': 'nav.departments',
  '/company/approvals': 'nav.approvals',
  '/company/join-requests': 'nav.joinRequests',
  '/company/documents': 'nav.documents',
  '/company/analytics': 'nav.reports',
  '/company/hr': 'nav.hrWorkspace',
  '/company/subscription': 'tariffs.title',
  '/company/settings': 'nav.settings',
  '/company/notifications': 'nav.notifications',
  '/department': 'nav.departmentHome',
  '/platform': 'nav.platformOverview',
  '/platform/companies': 'nav.companies',
  '/platform/users': 'nav.platformUsers',
  '/dashboard': 'nav.dashboard',
  '/profile': 'nav.profile',
  '/profile/settings': 'profile.profileSettings',
  '/settings': 'settings.title',
  '/reports': 'reports.title',
  '/support': 'support.title',
  '/faq': 'faq.title',
  '/messenger': 'messenger.title',
  '/ratings': 'ratings.title',
  '/tariffs': 'tariffs.title',
  '/vacancies': 'vacancies.title',
  '/login': 'auth.login',
  '/register': 'auth.register',
  '/forgot-password': 'auth.forgotPassword',
}

export function usePageTitle() {
  const { t } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    // Try exact match first, then check parent paths
    let titleKey = ROUTE_TITLE_KEYS[path]
    if (!titleKey) {
      // Check for dynamic routes (e.g., /department/:id/board)
      const segments = path.split('/')
      if (segments[1] === 'department' && segments.length >= 4) {
        const lastSegment = segments[segments.length - 1]
        titleKey = ROUTE_TITLE_KEYS[`/department`] // fallback
        if (lastSegment === 'board') titleKey = 'nav.board'
        else if (lastSegment === 'tasks') titleKey = 'nav.tasks'
        else if (lastSegment === 'members') titleKey = 'nav.members'
      }
    }

    const pageTitle = titleKey ? t(titleKey) : null
    document.title = pageTitle ? `${pageTitle} — ProjectsControl` : 'ProjectsControl'
  }, [location.pathname, t])
}
