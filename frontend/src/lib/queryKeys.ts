/** Centralised query-key factory. */

export const queryKeys = {
  // -- Profile
  profile: {
    me: () => ['profile', 'me'] as const,
  },

  // -- Org
  org: {
    myOrgs: () => ['orgs', 'my'] as const,
    detail: (orgId: string) => ['org', orgId] as const,
    joinRequests: (orgId: string) => ['org', orgId, 'join-requests'] as const,
  },

  // -- Projects
  projects: {
    list: (orgId: string) => ['projects', orgId] as const,
    detail: (orgId: string, projectId: string) => ['projects', orgId, projectId] as const,
  },

  // -- Tasks
  tasks: {
    today: (orgId: string) => ['tasks', orgId, 'today'] as const,
  },

  // -- Teams
  teams: {
    list: (orgId: string) => ['teams', orgId] as const,
    my: (orgId: string) => ['teams', orgId, 'me'] as const,
  },

  // -- Users
  users: {
    list: (orgId: string) => ['users', orgId] as const,
  },

  // -- HR
  hr: {
    onboarding: (orgId: string) => ['hr', orgId, 'onboarding'] as const,
    offboarding: (orgId: string) => ['hr', orgId, 'offboarding'] as const,
    terminationOrders: (orgId: string) => ['hr', orgId, 'termination-orders'] as const,
    leave: (orgId: string) => ['hr', orgId, 'leave'] as const,
    documents: (orgId: string) => ['hr', orgId, 'documents'] as const,
    employeeChangeRequests: (orgId: string) => ['hr', orgId, 'employee-change-requests'] as const,
    analytics: (orgId: string) => ['hr', orgId, 'analytics'] as const,
    messageTemplates: (orgId: string) => ['hr', orgId, 'message-templates'] as const,
  },

  // -- Billing
  billing: {
    plans: () => ['billing', 'plans'] as const,
    overview: (orgId: string) => ['billing', orgId, 'overview'] as const,
    invoices: (orgId: string) => ['billing', orgId, 'invoices'] as const,
  },

  // -- Vacancies
  vacancies: {
    list: (orgId: string, status?: string) => ['vacancies', orgId, status ?? 'all'] as const,
    detail: (orgId: string, vacancyId: string) => ['vacancies', orgId, vacancyId] as const,
    applications: (orgId: string, vacancyId: string) => ['vacancies', orgId, vacancyId, 'applications'] as const,
    application: (orgId: string, vacancyId: string, applicationId: string) =>
      ['vacancies', orgId, vacancyId, 'applications', applicationId] as const,
    approvalQueue: (orgId: string) => ['vacancies', orgId, 'approval-queue'] as const,
    analytics: (orgId: string) => ['vacancies', orgId, 'analytics'] as const,
    orgInterviews: (orgId: string, interviewerId?: string, dateFrom?: string, dateTo?: string) =>
      ['vacancies', orgId, 'interviews', interviewerId ?? 'all', dateFrom ?? 'any', dateTo ?? 'any'] as const,
    interviews: (orgId: string, vacancyId: string, applicationId: string) =>
      ['vacancies', orgId, vacancyId, 'applications', applicationId, 'interviews'] as const,
    notes: (orgId: string, vacancyId: string, applicationId: string) =>
      ['vacancies', orgId, vacancyId, 'applications', applicationId, 'notes'] as const,
    offers: (orgId: string, vacancyId: string, applicationId: string) =>
      ['vacancies', orgId, vacancyId, 'applications', applicationId, 'offers'] as const,
  },

  explore: {
    vacancies: (params?: Record<string, unknown>) => ['explore', 'vacancies', params ?? {}] as const,
    vacancy: (vacancyId: string) => ['explore', 'vacancies', vacancyId] as const,
  },

  // -- Reports
  reports: {
    orgKpi: (orgId: string, params?: Record<string, unknown>) =>
      ['reports', orgId, 'org-kpi', params ?? {}] as const,
    projectKpi: (orgId: string, params?: Record<string, unknown>) =>
      ['reports', orgId, 'project-kpi', params ?? {}] as const,
    exports: (orgId: string) => ['reports', orgId, 'exports'] as const,
  },

  // -- AI
  ai: {
    kpi: (orgId: string, params?: Record<string, unknown>) =>
      ['ai', orgId, 'kpi', params ?? {}] as const,
    scorecards: (orgId: string, params?: Record<string, unknown>) =>
      ['ai', orgId, 'scorecards', params ?? {}] as const,
  },


  // -- Roles
  roles: {
    permissions: (orgId: string) => ['role-permissions', orgId] as const,
  },

  // -- Audit
  audit: {
    list: (orgId: string) => ['audit', orgId] as const,
  },

  // -- Privacy
  privacy: {
    rules: (orgId: string) => ['privacy', orgId, 'rules'] as const,
  },

  // -- Consent
  consent: {
    status: (orgId: string) => ['consent', orgId] as const,
  },

  // -- Notifications
  notifications: {
    hooks: (orgId: string) => ['notifications', orgId, 'hooks'] as const,
  },

  // -- Schedules
  schedules: {
    list: (orgId: string) => ['schedules', orgId] as const,
  },

  // -- Board
  board: {
    myTasks: (orgId: string, mode: string = 'active') =>
      ['board', orgId, 'my-tasks', mode] as const,
    columns: (orgId: string, projectId: string) =>
      ['board', orgId, projectId, 'columns'] as const,
    tasks: (orgId: string, projectId: string, mode: string = 'active') =>
      ['board', orgId, projectId, 'tasks', mode] as const,
    task: (orgId: string, projectId: string, taskId: string) =>
      ['board', orgId, projectId, 'tasks', taskId] as const,
    stats: (orgId: string, projectId: string) =>
      ['board', orgId, projectId, 'stats'] as const,
    comments: (orgId: string, taskId: string) =>
      ['board', orgId, 'comments', taskId] as const,
    checklist: (orgId: string, taskId: string) =>
      ['board', orgId, 'checklist', taskId] as const,
    attachments: (orgId: string, taskId: string) =>
      ['board', orgId, 'attachments', taskId] as const,
  },
} as const
