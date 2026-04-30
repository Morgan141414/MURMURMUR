import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrgStore } from '@/stores/orgStore'
import { Building2, Check, Loader2, RotateCcw, Save, Shield, X } from 'lucide-react'
import { ROLE_COLORS, ROLE_LABELS } from '@/types'
import type { OrgRole } from '@/types'
import {
  listPermissionsByCategory,
  listAllPermissions,
  getOrgRolePermissions,
  updateRolePermissions,
  resetRolePermissions,
  resetAllRolesPermissions,
} from '@/api/roles'

interface PermissionItem {
  codename: string
  name: string
  description?: string
}
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'

const ALL_ROLES: OrgRole[] = [
  'founder', 'ceo', 'hr', 'recruiter', 'hiring_manager', 'accountant', 'sysadmin',
  'admin', 'team_lead', 'project_manager', 'developer', 'member',
]

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  Organization: 'Организация',
  Project: 'Проекты',
  Team: 'Проекты',
  Task: 'Задачи',
  User: 'Пользователи',
  HR: 'Кадры',
  Report: 'Отчёты',
  Audit: 'Аудит',
  Approval: 'Согласования',
  Settings: 'Настройки',
  'Role Management': 'Управление ролями',
}

const PERMISSION_LABELS: Record<string, string> = {
  'org.view': 'Просмотр организации',
  'org.manage': 'Управление настройками',
  'org.manage_members': 'Добавление и удаление участников',
  'org.manage_roles': 'Назначение ролей участникам',
  'org.delete': 'Удаление организации',
  'org.view_join_requests': 'Просмотр заявок на вступление',
  'org.approve_join_requests': 'Одобрение заявок',
  'project.view': 'Просмотр проектов',
  'project.create': 'Создание проектов',
  'project.edit': 'Редактирование проектов',
  'project.delete': 'Удаление проектов',
  'project.manage_members': 'Управление участниками проекта',
  'project.view_kpi': 'Просмотр KPI проекта',
  'team.view': 'Просмотр проектов',
  'team.create': 'Создание проектов',
  'team.edit': 'Редактирование проектов',
  'team.delete': 'Удаление проектов',
  'team.manage_members': 'Управление участниками проекта',
  'task.view': 'Просмотр задач',
  'task.view_all': 'Просмотр всех задач',
  'task.create': 'Создание задач',
  'task.edit': 'Редактирование задач',
  'task.delete': 'Удаление задач',
  'task.assign': 'Назначение задач',
  'task.change_status': 'Изменение статуса задачи',
  'task.view_own': 'Просмотр своих задач',
  'user.view': 'Просмотр профилей',
  'user.view_all': 'Просмотр всех пользователей',
  'user.edit': 'Редактирование профилей',
  'user.view_worktime': 'Просмотр рабочего времени',
  'user.view_activity': 'Просмотр активности',
  'hr.view_onboarding': 'Просмотр адаптации',
  'hr.manage_onboarding': 'Управление адаптацией',
  'hr.view_offboarding': 'Просмотр увольнения',
  'hr.manage_offboarding': 'Управление увольнением',
  'hr.view_documents': 'Просмотр документов',
  'hr.manage_documents': 'Управление документами',
  'hr.view_leave': 'Просмотр отпусков',
  'hr.manage_leave': 'Управление отпусками',
  'hr.view_salary': 'Просмотр зарплат',
  'hr.manage_salary': 'Управление зарплатами',
  'hr.view_performance': 'Просмотр эффективности',
  'report.view_own': 'Просмотр своих отчётов',
  'report.view_team': 'Просмотр отчётов проектовы',
  'report.view_org': 'Просмотр отчётов организации',
  'report.export': 'Экспорт отчётов',
  'report.view_productivity': 'Просмотр продуктивности',
  'audit.view': 'Просмотр журналов',
  'audit.view_sensitive': 'Просмотр конфиденциальных данных',
  'audit.export': 'Экспорт журналов',
  'approval.view': 'Просмотр согласований',
  'approval.approve': 'Одобрение заявок',
  'approval.reject': 'Отклонение заявок',
  'approval.create': 'Создание заявок на согласование',
  'settings.view': 'Просмотр настроек',
  'settings.edit': 'Редактирование настроек',
  'settings.manage_privacy': 'Управление конфиденциальностью',
  'settings.manage_integrations': 'Управление интеграциями',
  'role.view': 'Просмотр ролей',
  'role.edit_permissions': 'Редактирование прав ролей',
  'role.create': 'Создание ролей',
  'role.delete': 'Удаление ролей',
}

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  founder: 'Полный контроль над компанией, политиками и ключевыми решениями.',
  ceo: 'Операционное управление компанией и подтверждение критичных действий.',
  superadmin: 'Платформенная роль. В панели компании отдельно не настраивается.',
  hr: 'Кадровые процессы, документы и маршруты приёма или увольнения.',
  recruiter: 'Подбор кандидатов, вакансии и первичная оценка.',
  hiring_manager: 'Участие в найме и согласовании кандидатов по направлению.',
  accountant: 'Биллинг, финансовые операции и контроль расчётов.',
  sysadmin: 'Техническое сопровождение системных и инфраструктурных настроек.',
  admin: 'Роли, доступы, организационные настройки и сопровождение структуры.',
  team_lead: 'Управление проектовой, задачами и ежедневной координацией.',
  project_manager: 'Проекты, сроки, состав участников и контроль выполнения.',
  developer: 'Рабочие задачи, проекты и операционная деятельность сотрудника.',
  lawyer: 'Юридическое сопровождение, документы и комплаенс.',
  sales_director: 'Полный доступ к CRM, управление продажами и командой.',
  sales_manager: 'Работа с лидами, сделками и клиентами в CRM.',
  sales_support: 'Базовый доступ к CRM для поддержки продаж.',
  member: 'Базовый доступ сотрудника к компании и назначенным ему модулям.',
}

export default function RoleManagementPage() {
  const { t } = useTranslation()
  const { activeOrgId, activeOrg } = useOrgStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, PermissionItem[]>>({})
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [selectedRole, setSelectedRole] = useState<OrgRole>('hr')
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showResetAllDialog, setShowResetAllDialog] = useState(false)
  const [permissionSearch, setPermissionSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'core' | 'hr' | 'security'>('all')

  useEffect(() => {
    if (!activeOrgId) return
    void loadData()
  }, [activeOrgId])

  async function loadData() {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const [permsRes, byCatRes, rolePermsRes] = await Promise.all([
        listAllPermissions(),
        listPermissionsByCategory(),
        getOrgRolePermissions(activeOrgId),
      ])

      // permsRes.data = { permissions: string[] }
      setPermissions(permsRes.data.permissions ?? permsRes.data)

      // byCatRes.data = { categories: Record<string, PermissionItem[]> }
      const cats = byCatRes.data.categories ?? byCatRes.data
      setPermissionsByCategory(cats)

      // rolePermsRes.data = { roles: Record<string, { permissions: string[] }>, all_permissions: string[] }
      const rolesData = rolePermsRes.data.roles ?? rolePermsRes.data
      const rolePermMap: Record<string, string[]> = {}
      if (rolesData && typeof rolesData === 'object') {
        for (const [roleName, roleData] of Object.entries(rolesData)) {
          const rd = roleData as { permissions?: string[] }
          rolePermMap[roleName] = rd.permissions ?? []
        }
      }
      setRolePermissions(rolePermMap)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(role: string, codename: string) {
    setRolePermissions((prev) => {
      const current = prev[role] || []
      const updated = current.includes(codename)
        ? current.filter((permission) => permission !== codename)
        : [...current, codename]
      return { ...prev, [role]: updated }
    })
    setHasChanges(true)
  }

  function selectAllInCategory(role: string, category: string) {
    const categoryPerms = permissionsByCategory[category]?.map((permission) => permission.codename) || []
    setRolePermissions((prev) => ({
      ...prev,
      [role]: [...new Set([...(prev[role] || []), ...categoryPerms])],
    }))
    setHasChanges(true)
  }

  function deselectAllInCategory(role: string, category: string) {
    const categoryPerms = permissionsByCategory[category]?.map((permission) => permission.codename) || []
    setRolePermissions((prev) => ({
      ...prev,
      [role]: (prev[role] || []).filter((permission) => !categoryPerms.includes(permission)),
    }))
    setHasChanges(true)
  }

  async function handleSave() {
    if (!activeOrgId) return
    setSaving(true)
    try {
      await updateRolePermissions(activeOrgId, selectedRole, rolePermissions[selectedRole] || [])
      setHasChanges(false)
      setNotification({ type: 'success', message: t('roles.saved', 'Permissions saved successfully!') })
      setTimeout(() => setNotification(null), 3000)
    } catch {
      setNotification({ type: 'error', message: t('roles.saveError', 'Failed to save permissions') })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleResetRole() {
    if (!activeOrgId) return
    setSaving(true)
    try {
      const response = await resetRolePermissions(activeOrgId, selectedRole)
      setRolePermissions((prev) => ({ ...prev, [selectedRole]: response.data.permissions }))
      setHasChanges(false)
      setNotification({ type: 'success', message: t('roles.resetSuccess', 'Role permissions reset to defaults!') })
      setTimeout(() => setNotification(null), 3000)
    } catch {
      setNotification({ type: 'error', message: t('roles.resetError', 'Failed to reset permissions') })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleResetAll() {
    if (!activeOrgId) return
    setSaving(true)
    try {
      await resetAllRolesPermissions(activeOrgId)
      await loadData()
      setHasChanges(false)
      setNotification({ type: 'success', message: t('roles.resetAllSuccess', 'All roles reset to defaults!') })
      setTimeout(() => setNotification(null), 3000)
    } catch {
      setNotification({ type: 'error', message: t('roles.resetAllError', 'Failed to reset all roles') })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const currentPerms = rolePermissions[selectedRole] || []
  const categories = useMemo(() => Object.keys(permissionsByCategory).sort(), [permissionsByCategory])
  const filteredCategories = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase()
    const allowedByFilter = (category: string) => {
      if (categoryFilter === 'all') return true
      const normalized = category.toLowerCase()
      if (categoryFilter === 'core') return ['organization', 'team', 'project', 'task'].some((token) => normalized.includes(token))
      if (categoryFilter === 'hr') return normalized.includes('hr') || normalized.includes('approval')
      return ['audit', 'settings', 'role', 'user'].some((token) => normalized.includes(token))
    }
    return categories
      .filter((category) => allowedByFilter(category))
      .filter((category) => {
        const perms = permissionsByCategory[category] || []
        if (!q) return true
        return perms.some((permission) => {
          const label = (PERMISSION_LABELS[permission.codename] || permission.description || permission.name || permission.codename).toLowerCase()
          return label.includes(q) || permission.codename.toLowerCase().includes(q)
        })
      })
  }, [categories, categoryFilter, permissionSearch, permissionsByCategory])
  const totalPermissionCount = typeof permissions === 'object' && Array.isArray(permissions) ? permissions.length : 0
  const selectedRolePermissionCount = currentPerms.length

  if (!activeOrgId) {
    return (
      <EmptyState
        icon={Building2}
        title={t('company.noOrgSelected')}
        description={t('company.selectOrgHint')}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('roles.title', 'Role Permissions')}
        description={t('roles.subtitle', 'Управляйте тем, какие разделы и действия доступны каждой роли компании.')}
        eyebrow="Безопасность компании"
        breadcrumbs={[
          { label: activeOrg()?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('roles.title', 'Role Permissions') },
        ]}
        badge={
          <StatusBadge variant="info">
            {ROLE_LABELS[selectedRole]}
          </StatusBadge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setShowResetAllDialog(true)} disabled={saving}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t('roles.resetAll', 'Сбросить всё')}
            </Button>
            <Button variant="outline" onClick={handleResetRole} disabled={saving}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t('roles.resetRole', 'Сбросить')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {t('common.save', 'Сохранить')}
            </Button>
          </>
        }
      />

      {notification ? (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          notification.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
            : 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400'
        }`}>
          {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {notification.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Shield} label="Roles in policy" value={ALL_ROLES.length} />
        <StatCard icon={Check} label="Selected role permissions" value={selectedRolePermissionCount} />
        <StatCard icon={Save} label="Policy categories" value={filteredCategories.length} />
        <StatCard icon={RotateCcw} label="Unsaved changes" value={hasChanges ? 'Yes' : 'No'} />
      </div>

      <ConfirmDialog
        open={showResetAllDialog}
        onOpenChange={setShowResetAllDialog}
        title={t('roles.confirmResetAll', 'Reset all roles to default permissions?')}
        description="Это действие перезапишет текущую policy matrix для всех ролей компании."
        confirmLabel={t('roles.resetAll', 'Сбросить всё')}
        cancelLabel={t('common.cancel', 'Отмена')}
        variant="destructive"
        loading={saving}
        onConfirm={() => {
          setShowResetAllDialog(false)
          void handleResetAll()
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">{t('roles.selectRole', 'Выберите роль')}</h2>
            <p className="text-xs text-muted-foreground">Роль определяет доступ к данным, действиям и модулям.</p>
          </div>
          <div className="space-y-2">
            {ALL_ROLES.map((role) => {
              const permCount = (rolePermissions[role] || []).length
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    selectedRole === role
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                    <span className="text-xs text-muted-foreground">{permCount}/{totalPermissionCount}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Поиск разрешения</span>
                <input
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Например: одобрение, аудит, роль, hr.manage_leave"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  ['all', 'Все'],
                  ['core', 'Core'],
                  ['hr', 'HR'],
                  ['security', 'Security'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategoryFilter(value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${categoryFilter === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <HierarchyPill label="Top" value="Owner / Founder / CEO" tone="red" />
              <HierarchyPill label="Control" value="Admin / Moderator / HR" tone="blue" />
              <HierarchyPill label="Execution" value="Team Lead / Employee" tone="neutral" />
            </div>
          </div>

          {filteredCategories.map((category) => {
            const categoryPerms = permissionsByCategory[category] || []
            const visiblePerms = categoryPerms.filter((permission) => {
              const q = permissionSearch.trim().toLowerCase()
              if (!q) return true
              const label = (PERMISSION_LABELS[permission.codename] || permission.description || permission.name || permission.codename).toLowerCase()
              return label.includes(q) || permission.codename.toLowerCase().includes(q)
            })
            const categoryPermCount = categoryPerms.filter((permission) => currentPerms.includes(permission.codename)).length

            return (
              <div key={category} className="rounded-2xl border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">{CATEGORY_TRANSLATIONS[category] || category}</h3>
                    <span className="text-xs text-muted-foreground">
                      {categoryPermCount}/{categoryPerms.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button onClick={() => selectAllInCategory(selectedRole, category)} className="font-medium text-primary hover:underline">
                      {t('roles.selectAll', 'Выбрать всё')}
                    </button>
                    <button onClick={() => deselectAllInCategory(selectedRole, category)} className="text-muted-foreground hover:text-foreground">
                      {t('roles.deselectAll', 'Снять всё')}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 p-5 md:grid-cols-2">
                  {visiblePerms.map((permission) => {
                    const isEnabled = currentPerms.includes(permission.codename)
                    const friendlyLabel = PERMISSION_LABELS[permission.codename] || permission.description

                    return (
                      <label
                        key={permission.codename}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                          isEnabled ? 'border-primary/20 bg-primary/5' : 'border-border hover:bg-accent/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => togglePermission(selectedRole, permission.codename)}
                          className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{friendlyLabel}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{permission.codename}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {filteredCategories.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="Разрешения не найдены"
              description="Измените поиск или фильтр категории, чтобы увидеть policy matrix."
            />
          ) : null}
        </section>
      </div>
    </div>
  )
}

function HierarchyPill({ label, value, tone }: { label: string; value: string; tone: 'red' | 'blue' | 'neutral' }) {
  const classes = tone === 'red'
    ? 'border-red-500/20 bg-red-500/5 text-red-300'
    : tone === 'blue'
      ? 'border-blue-500/20 bg-blue-500/5 text-blue-300'
      : 'border-border bg-background text-muted-foreground'

  return (
    <div className={`rounded-xl border px-3 py-2 ${classes}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xs">{value}</p>
    </div>
  )
}
