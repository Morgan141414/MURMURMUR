import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Building2, Mail, Shield, Users } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateUserRole, useUsers } from '@/hooks/useAdmin'
import { useProjects } from '@/hooks/useProjects'
import { createApproval } from '@/api/approvals'
import { ROLE_LABELS, type OrgRole, type User } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { DataMask } from '@/components/shared/DataMask'
import { Button } from '@/components/ui/button'
import { getUserOnlineStatus } from '@/lib/presence'

const ROLE_COLORS: Partial<Record<OrgRole, string>> = {
  founder: 'bg-red-500/10 text-red-600',
  ceo: 'bg-red-500/10 text-red-600',
  superadmin: 'bg-blue-500/10 text-blue-600',
  hr: 'bg-emerald-500/10 text-emerald-600',
  recruiter: 'bg-indigo-500/10 text-indigo-600',
  hiring_manager: 'bg-orange-500/10 text-orange-600',
  accountant: 'bg-sky-500/10 text-sky-600',
  sysadmin: 'bg-blue-500/10 text-blue-600',
  admin: 'bg-blue-500/10 text-blue-600',
  team_lead: 'bg-amber-500/10 text-amber-600',
  project_manager: 'bg-amber-500/10 text-amber-600',
  developer: 'bg-violet-500/10 text-violet-600',
  member: 'bg-gray-500/10 text-gray-600',
}

const BASE_ASSIGNABLE_ROLES: OrgRole[] = [
  'hr',
  'admin',
  'recruiter',
  'hiring_manager',
  'accountant',
  'team_lead',
  'project_manager',
  'developer',
  'member',
]

function countByRole(users: User[]) {
  return users.reduce<Record<string, number>>((acc, user) => {
    const role = user.org_role || 'member'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})
}

function getDepartmentFromUser(user: User): string {
  const raw = user.skills as unknown
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'department' in raw) {
    const department = (raw as { department?: unknown }).department
    if (typeof department === 'string' && department.trim()) {
      return department.trim()
    }
  }
  return ''
}


export default function CompanyPeoplePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeOrgRole = useOrgStore((s) => s.activeOrgRole())
  const org = useOrgStore((s) => s.activeOrg())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const currentUserId = useAuthStore((s) => s.userId)

  const { data: users = [], isLoading } = useUsers(activeOrgId ?? '')
  const { data: projects = [] } = useProjects(activeOrgId ?? '')
  const updateUserRole = useUpdateUserRole(activeOrgId ?? '')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, OrgRole>>({})
  const [departmentByUser, setDepartmentByUser] = useState<Record<string, string>>({})
  const [positionByUser, setPositionByUser] = useState<Record<string, string>>({})
  const [secondaryRoleByUser, setSecondaryRoleByUser] = useState<Record<string, OrgRole>>({})
  const [processingActionKey, setProcessingActionKey] = useState<string | null>(null)

  const roleCounts = useMemo(() => countByRole(users), [users])
  const departmentHeadByUserId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const project of projects) {
      if (!project.department_head_user_id) continue
      const names = map.get(project.department_head_user_id) ?? []
      names.push(project.name)
      map.set(project.department_head_user_id, names)
    }
    return map
  }, [projects])

  const canManageRoles = ['founder', 'ceo', 'hr', 'admin'].includes(activeOrgRole ?? '')
  const canFireDirectly = ['founder', 'ceo', 'hr'].includes(activeOrgRole ?? '')
  const canSetPositionDirectly = ['founder', 'ceo', 'hr'].includes(activeOrgRole ?? '')
  const requiresApprovalFlow = activeOrgRole === 'hr' || activeOrgRole === 'admin'

  const assignableRoles = useMemo<OrgRole[]>(() => {
    if (isSuperAdmin || activeOrgRole === 'founder') {
      return BASE_ASSIGNABLE_ROLES
    }
    if (activeOrgRole === 'ceo') {
      return ['hr', 'admin']
    }
    if (activeOrgRole === 'hr' || activeOrgRole === 'admin') {
      return BASE_ASSIGNABLE_ROLES
    }
    return []
  }, [activeOrgRole, isSuperAdmin])

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesRole = roleFilter === 'all' || user.org_role === roleFilter
        const query = search.trim().toLowerCase()
        const matchesSearch =
          !query ||
          user.full_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.position?.toLowerCase().includes(query) ||
          getDepartmentFromUser(user).toLowerCase().includes(query)

        return matchesRole && matchesSearch
      }),
    [roleFilter, search, users],
  )

  function selectedRoleForUser(user: User): OrgRole {
    return selectedRoleByUser[user.id] ?? ((user.org_role as OrgRole) ?? 'member')
  }

  function selectedDepartmentForUser(user: User): string {
    return departmentByUser[user.id] ?? getDepartmentFromUser(user)
  }

  function selectedSecondaryRoleForUser(user: User): OrgRole | '' {
    return secondaryRoleByUser[user.id] ?? ''
  }

  function selectedPositionForUser(user: User): string {
    return positionByUser[user.id] ?? (user.position ?? '')
  }

  function isActionProcessing(userId: string, action: 'change_role' | 'move_department' | 'change_position' | 'fire') {
    return processingActionKey === `${userId}:${action}`
  }

  async function handleRoleAction(user: User) {
    if (!activeOrgId || !canManageRoles) return
    if (user.org_role === 'founder' && !isSuperAdmin) {
      toast.error(t('companyPeople.founderRoleLocked', 'Роль основателя нельзя изменить из этого интерфейса'))
      return
    }

    const targetRole = selectedRoleForUser(user)
    const currentRole = (user.org_role as OrgRole) ?? 'member'

    if (targetRole === currentRole) {
      toast.info(t('companyPeople.roleUnchanged', 'Роль уже установлена'))
      return
    }

    const actionKey = `${user.id}:change_role`
    setProcessingActionKey(actionKey)
    try {
      if (requiresApprovalFlow) {
        await createApproval(activeOrgId, {
          action_type: 'change_role',
          target_user_id: user.id,
          payload: { role: targetRole },
        })
        toast.success(t('companyPeople.approvalRequested', 'Запрос на смену роли отправлен на согласование'))
      } else {
        await updateUserRole.mutateAsync({ userId: user.id, role: targetRole })
        toast.success(t('companyPeople.roleUpdated', 'Роль обновлена'))
      }
    } catch {
      toast.error(t('companyPeople.roleUpdateError', 'Не удалось обработать смену роли'))
    } finally {
      setProcessingActionKey(null)
    }
  }

  async function handleMoveDepartment(user: User) {
    if (!activeOrgId || !requiresApprovalFlow) return
    if (user.org_role === 'founder') {
      toast.error(t('companyPeople.founderActionLocked', 'Действия над основателем через этот интерфейс запрещены'))
      return
    }

    const department = selectedDepartmentForUser(user).trim()
    if (!department) {
      toast.error(t('companyPeople.departmentRequired', 'Укажите отдел для перемещения'))
      return
    }

    const actionKey = `${user.id}:move_department`
    setProcessingActionKey(actionKey)
    try {
      await createApproval(activeOrgId, {
        action_type: 'move_department',
        target_user_id: user.id,
        payload: { department },
      })
      toast.success(t('companyPeople.moveDepartmentRequested', 'Запрос на перевод по отделу отправлен'))
    } catch {
      toast.error(t('companyPeople.moveDepartmentError', 'Не удалось отправить запрос на перевод'))
    } finally {
      setProcessingActionKey(null)
    }
  }

  async function handleChangePosition(user: User) {
    if (!activeOrgId) return
    if (user.org_role === 'founder') {
      toast.error(t('companyPeople.founderActionLocked', 'Действия над основателем через этот интерфейс запрещены'))
      return
    }

    const position = selectedPositionForUser(user).trim()
    if (!position) {
      toast.error(t('companyPeople.positionRequired', 'Укажите новую должность'))
      return
    }

    const actionKey = `${user.id}:change_position`
    setProcessingActionKey(actionKey)
    try {
      if (canSetPositionDirectly) {
        const { updateUserHrProfile } = await import('@/api/users')
        await updateUserHrProfile(activeOrgId, user.id, { position })
        toast.success(t('companyPeople.positionUpdated', 'Должность обновлена'))
      } else {
        await createApproval(activeOrgId, {
          action_type: 'change_position',
          target_user_id: user.id,
          payload: { position },
        })
        toast.success(t('companyPeople.changePositionRequested', 'Запрос на смену должности отправлен'))
      }
    } catch {
      toast.error(t('companyPeople.changePositionError', 'Не удалось отправить запрос на смену должности'))
    } finally {
      setProcessingActionKey(null)
    }
  }

  async function handleFireUser(user: User) {
    if (!activeOrgId) return
    if (user.id === currentUserId) {
      toast.error(t('companyPeople.selfFireBlocked', 'Нельзя отправить заявку на собственное увольнение'))
      return
    }
    if (user.org_role === 'founder') {
      toast.error(t('companyPeople.founderActionLocked', 'Действия над основателем через этот интерфейс запрещены'))
      return
    }

    const confirmed = window.confirm(
      t('companyPeople.fireConfirm', {
        name: user.full_name,
        defaultValue: `Отправить заявку на увольнение сотрудника ${user.full_name}?`,
      }),
    )
    if (!confirmed) return

    const actionKey = `${user.id}:fire`
    setProcessingActionKey(actionKey)
    try {
      if (canFireDirectly) {
        const { removeOrgUser } = await import('@/api/users')
        await removeOrgUser(activeOrgId, user.id)
        toast.success(t('companyPeople.userFired', 'Сотрудник исключён из компании'))
      } else {
        await createApproval(activeOrgId, {
          action_type: 'fire',
          target_user_id: user.id,
        })
        toast.success(t('companyPeople.fireRequested', 'Заявка на увольнение отправлена'))
      }
    } catch {
      toast.error(t('companyPeople.fireError', 'Не удалось отправить заявку на увольнение'))
    } finally {
      setProcessingActionKey(null)
    }
  }

  const columns = useMemo<ColumnDef<User>[]>(
    () => {
      const base: ColumnDef<User>[] = [
        {
          id: 'person',
          header: t('companyPeople.employee', 'Сотрудник'),
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() => navigate(`/users/${row.original.id}`)}
              className="group flex items-center gap-3 text-left"
            >
              <UserAvatar
                name={row.original.full_name}
                src={row.original.avatar_url}
                size="md"
                status={getUserOnlineStatus(row.original)}
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">{row.original.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.original.position || t('companyPeople.noTitle', 'Title not specified')}</p>
              </div>
            </button>
          ),
        },
        {
          id: 'contact',
          header: t('companyPeople.contact', 'Контакты'),
          cell: ({ row }) => (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <DataMask maskedValue="••••@••••.••">{row.original.email}</DataMask>
              </div>
              <p className="text-xs text-muted-foreground">{row.original.phone || t('companyPeople.noPhone', 'Телефон не указан')}</p>
            </div>
          ),
        },
        {
          id: 'role',
          header: t('companyPeople.role', 'Роль'),
          cell: ({ row }) => {
            const role = (row.original.org_role || 'member') as OrgRole
            const colorClass = ROLE_COLORS[role] || ROLE_COLORS.member!
            const managedDepartments = departmentHeadByUserId.get(row.original.id) ?? []
            const departmentHeadTitle = managedDepartments.length > 0
              ? `Руководитель отдела "${managedDepartments[0]}"`
              : null

            return (
              <div className="flex flex-wrap items-center gap-1">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${colorClass}`}>
                  <Shield className="h-3 w-3" />
                  {ROLE_LABELS[role] || role}
                </span>
                {departmentHeadTitle && (
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {departmentHeadTitle}
                  </span>
                )}
              </div>
            )
          },
        },
        {
          id: 'department',
          header: t('companyPeople.department', 'Отдел'),
          cell: ({ row }) => {
            const department = getDepartmentFromUser(row.original)
            return <span className="text-sm text-muted-foreground">{department || t('companyPeople.unassigned', 'Не назначен')}</span>
          },
        },
      ]

      if (!canManageRoles) return base

      base.push({
        id: 'roleActions',
        header: t('companyPeople.roleActions', 'Управление ролью'),
        cell: ({ row }) => {
          const user = row.original
          const selectedRole = selectedRoleForUser(user)
          const isProcessing = isActionProcessing(user.id, 'change_role')
          const isSelf = user.id === currentUserId
          const founderLocked = user.org_role === 'founder' && !isSuperAdmin

          return (
            <div className="flex min-w-[250px] items-center gap-2">
              <select
                value={selectedRole}
                disabled={isProcessing || founderLocked}
                onChange={(e) =>
                  setSelectedRoleByUser((prev) => ({
                    ...prev,
                    [user.id]: e.target.value as OrgRole,
                  }))
                }
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-ring focus:outline-none"
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                ))}
              </select>

              <Button
                size="sm"
                variant="outline"
                disabled={isProcessing || isSelf || founderLocked}
                onClick={() => void handleRoleAction(user)}
                className="h-8 px-2 text-xs"
              >
                {requiresApprovalFlow
                  ? t('companyPeople.requestRoleChange', 'Запросить')
                  : t('companyPeople.applyRoleChange', 'Применить')}
              </Button>
            </div>
          )
        },
      })

      if (canManageRoles) {
        base.push({
          id: 'hrActions',
          header: t('companyPeople.hrActions', 'HR/Admin действия'),
          cell: ({ row }) => {
            const user = row.original
            const founderLocked = user.org_role === 'founder'
            const isSelf = user.id === currentUserId

            const moveProcessing = isActionProcessing(user.id, 'move_department')
            const positionProcessing = isActionProcessing(user.id, 'change_position')
            const fireProcessing = isActionProcessing(user.id, 'fire')

            return (
              <div className="min-w-[360px] space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={selectedDepartmentForUser(user)}
                    onChange={(e) =>
                      setDepartmentByUser((prev) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                    placeholder={t('companyPeople.departmentPlaceholder', 'Новый отдел')}
                    disabled={moveProcessing || founderLocked}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={moveProcessing || founderLocked}
                    onClick={() => void handleMoveDepartment(user)}
                    className="h-8 px-2 text-xs"
                  >
                    {t('companyPeople.requestMove', 'Перевести')}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={selectedPositionForUser(user)}
                    onChange={(e) =>
                      setPositionByUser((prev) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                    placeholder={t('companyPeople.positionPlaceholder', 'Новая должность')}
                    disabled={positionProcessing || founderLocked}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-ring focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={positionProcessing || founderLocked}
                    onClick={() => void handleChangePosition(user)}
                    className="h-8 px-2 text-xs"
                  >
                    {t('companyPeople.requestPositionChange', 'Сменить')}
                  </Button>
                </div>

                {/* Secondary role */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSecondaryRoleForUser(user)}
                    onChange={(e) =>
                      setSecondaryRoleByUser((prev) => ({
                        ...prev,
                        [user.id]: e.target.value as OrgRole,
                      }))
                    }
                    disabled={founderLocked}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-ring focus:outline-none"
                  >
                    <option value="">Вторая роль (опц.)</option>
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                    ))}
                  </select>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  disabled={fireProcessing || founderLocked || isSelf}
                  onClick={() => void handleFireUser(user)}
                  className="h-8 px-2 text-xs"
                >
                  {canFireDirectly
                    ? t('companyPeople.fireDirectly', 'Уволить')
                    : t('companyPeople.requestFire', 'Уволить (заявка)')}
                </Button>
              </div>
            )
          },
        })
      }

      return base
    },
    [
      t,
      canManageRoles,
      selectedRoleByUser,
      processingActionKey,
      assignableRoles,
      requiresApprovalFlow,
      currentUserId,
      isSuperAdmin,
      departmentByUser,
      positionByUser,
      secondaryRoleByUser,
      departmentHeadByUserId,
      navigate,
    ],
  )

  if (!activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t('company.noOrgSelected')}</h2>
        <p className="text-sm text-muted-foreground">{t('company.selectOrgHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.employees', 'Сотрудники')}
        description={t('companyPeople.description', 'Список сотрудников вашей компании, их ролей и контактная информация.')}
        eyebrow={t('companyPeople.eyebrow', 'Коллеги в компании')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('nav.employees', 'Сотрудники') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {t('companyPeople.employeeCount', { count: users.length })}
          </span>
        }
      />

      <div className="flex flex-wrap gap-2">
        <RoleChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
          {t('companyPeople.all', 'Все')} ({users.length})
        </RoleChip>
        {Object.entries(roleCounts).map(([role, count]) => (
          <RoleChip key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
            {(ROLE_LABELS[role as OrgRole] || role)} ({count})
          </RoleChip>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={isLoading}
          searchable
          globalFilter={search}
          onGlobalFilterChange={setSearch}
          searchPlaceholder={t('companyPeople.searchPlaceholder', 'Поиск по сотрудникам, ролям, отделам и должностям...')}
          emptyIcon={Users}
          emptyTitle={t('companyPeople.emptyTitle', 'Нет сотрудников')}
          emptyDescription={t('companyPeople.emptyDescription', 'Измените поиск или фильтры.')}
        />
      </div>
    </div>
  )
}

function RoleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
