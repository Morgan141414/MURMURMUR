import { useMemo, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Building2, Link2, Mail, Shield, UserPlus, Users } from 'lucide-react'
import { createOrgInvitation } from '@/api/orgs'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useAddTeamMember, useCreateTeam, useRemoveTeamMember, useTeams } from '@/hooks/useTeams'
import { useUsers } from '@/hooks/useAdmin'
import { useProjects } from '@/hooks/useProjects'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { DataMask } from '@/components/shared/DataMask'
import { Button } from '@/components/ui/button'
import { getUserOnlineStatus } from '@/lib/presence'

type MemberRow = {
  id: string
  userId: string
  userName: string
  userEmail: string
  avatarUrl?: string
  lastSeenAt?: string | null
  position?: string
  departmentName: string
  teamNames: string[]
  role: string
}

export default function ProjectMembersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId } = useParams()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeOrgRole = useOrgStore((s) => s.activeOrgRole())
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const { data: teams, isLoading } = useTeams(activeOrgId ?? '')
  const { data: projects = [] } = useProjects(activeOrgId ?? '')
  const addTeamMember = useAddTeamMember(activeOrgId ?? '')
  const removeTeamMember = useRemoveTeamMember(activeOrgId ?? '')
  const createTeam = useCreateTeam(activeOrgId ?? '')
  const { data: users = [] } = useUsers(activeOrgId ?? '')

  const [search, setSearch] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLink, setInviteLink] = useState('')
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)

  const department = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  )
  const departmentTeams = useMemo(
    () => (teams ?? []).filter((team: any) => team.project_id === projectId),
    [projectId, teams],
  )
  const defaultTeamId = departmentTeams[0]?.id || ''

  const isDepartmentHead = projects.some(
    (project) => project.id === projectId && project.department_head_user_id === currentUserId,
  )
  const canManageMembers = isSuperAdmin || ['founder', 'ceo', 'admin', 'sysadmin'].includes(activeOrgRole ?? '') || isDepartmentHead

  const rows = useMemo<MemberRow[]>(() => {
    const byUser = new Map<string, MemberRow>()

    for (const team of departmentTeams) {
      for (const member of team.members ?? []) {
        const user = users.find((item) => item.id === member.user_id)
        const displayName = user?.full_name || user?.email || member.user_id
        const displayEmail = user?.email || ''
        const roleLabel = member.role || 'member'

        const existing = byUser.get(member.user_id)
        if (existing) {
          if (!existing.teamNames.includes(team.name)) {
            existing.teamNames.push(team.name)
          }
          if (roleLabel === 'team_lead') {
            existing.role = 'team_lead'
          }
          continue
        }

        byUser.set(member.user_id, {
          id: member.user_id,
          userId: member.user_id,
          userName: displayName,
          userEmail: displayEmail,
          avatarUrl: user?.avatar_url,
          lastSeenAt: user?.last_seen_at ?? null,
          position: user?.position || undefined,
          departmentName: department?.name || 'Отдел',
          teamNames: [team.name],
          role: roleLabel,
        })
      }
    }

    return Array.from(byUser.values())
  }, [department?.name, departmentTeams, users])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => {
      const teamsText = row.teamNames.join(' ').toLowerCase()
      return (
        row.userName.toLowerCase().includes(query) ||
        row.userEmail.toLowerCase().includes(query) ||
        teamsText.includes(query) ||
        row.departmentName.toLowerCase().includes(query)
      )
    })
  }, [rows, search])

  const columns = useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        id: 'person',
        header: t('companyPeople.employee', 'Сотрудник'),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => navigate(`/users/${row.original.userId}`)}
            className="group flex items-center gap-3 text-left"
          >
            <UserAvatar
              name={row.original.userName}
              src={row.original.avatarUrl}
              size="md"
              status={getUserOnlineStatus({ last_seen_at: row.original.lastSeenAt })}
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">{row.original.userName}</p>
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
              <DataMask maskedValue="••••@••••.••">{row.original.userEmail || 'Не указан'}</DataMask>
            </div>
            <p className="text-xs text-muted-foreground">{row.original.departmentName}</p>
          </div>
        ),
      },
      {
        id: 'role',
        header: t('project.role', 'Роль'),
        cell: ({ row }) => {
          const role = row.original.role
          return (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-600">
              <Shield className="h-3 w-3" />
              {role === 'team_lead' ? 'Team Lead' : 'Member'}
            </span>
          )
        },
      },
      {
        id: 'teams',
        header: 'Проекты',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.teamNames.map((teamName) => (
              <span key={teamName} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                {teamName}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Действия',
        cell: ({ row }) => {
          const user = row.original
          const isRemoving = removeTeamMember.isPending
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={!canManageMembers || isRemoving}
              onClick={() => {
                const confirmed = window.confirm(`Убрать сотрудника "${user.userName}" из отдела?`)
                if (!confirmed) return
                void handleRemoveMember(user.userId)
              }}
              className="h-8 px-2 text-xs"
            >
              Убрать
            </Button>
          )
        },
      },
    ],
    [canManageMembers, navigate, removeTeamMember.isPending, t],
  )

  async function handleRemoveMember(userId: string) {
    if (!activeOrgId || !canManageMembers) return
    const memberships = departmentTeams.filter((team) => (team.members ?? []).some((member) => member.user_id === userId))
    try {
      for (const team of memberships) {
        await removeTeamMember.mutateAsync({ teamId: team.id, userId })
      }
      toast.success('Сотрудник удалён из отдела')
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Не удалось убрать сотрудника')
          : 'Не удалось убрать сотрудника'
      toast.error(message)
    }
  }

  async function handleAddMember() {
    if (!activeOrgId || !selectedUserId) return
    if (!canManageMembers) {
      toast.error('Недостаточно прав для добавления сотрудников в отдел')
      return
    }
    try {
      let resolvedTeamId = defaultTeamId

      if (!resolvedTeamId) {
        if (!projectId) {
          toast.error('Не удалось определить отдел для добавления сотрудника')
          return
        }
        const createdTeam = await createTeam.mutateAsync({
          name: 'Основной проект',
          projectId,
        })
        resolvedTeamId = createdTeam.id
      }

      await addTeamMember.mutateAsync({ teamId: resolvedTeamId, userId: selectedUserId })
      setSelectedUserId('')
      setShowAddPanel(false)
      toast.success('Сотрудник добавлен в отдел')
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Не удалось добавить сотрудника')
          : 'Не удалось добавить сотрудника'
      toast.error(message)
    }
  }

  async function handleCreateInvite() {
    if (!activeOrgId || !canManageMembers) return
    try {
      setIsCreatingInvite(true)
      const response = await createOrgInvitation(activeOrgId, {
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
        expires_in_hours: 72,
      })
      const absoluteUrl = `${window.location.origin}${response.data.invite_url}`
      setInviteLink(absoluteUrl)
      toast.success('Ссылка-приглашение создана')
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Не удалось создать приглашение')
          : 'Не удалось создать приглашение'
      toast.error(message)
    } finally {
      setIsCreatingInvite(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('project.members', 'Участники')}
        description={t('project.membersDescription', 'Проекты и участники отдела в едином формате профилей.')}
        eyebrow={t('project.moduleEyebrow', 'Отдел')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('shell.department'), to: '/department' },
          { label: department?.name ?? t('project.members', 'Участники') },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowInvitePanel((value) => !value)} disabled={!canManageMembers}>
              <Link2 className="mr-1.5 h-4 w-4" />
              Invite
            </Button>
            <Button onClick={() => setShowAddPanel((value) => !value)} disabled={!canManageMembers}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Добавить участника
            </Button>
          </div>
        }
      />

      {!canManageMembers && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Управлять составом могут Founder/CEO/Admin/Sysadmin или руководитель этого отдела.
        </div>
      )}

      {showInvitePanel && canManageMembers && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Пригласить сотрудника</h3>
          <p className="mt-1 text-sm text-muted-foreground">Приглашение добавляет человека в компанию. После принятия вы сможете добавить его в отдел.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="email@company.com (необязательно)"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="member">member</option>
              <option value="developer">developer</option>
              <option value="team_lead">team_lead</option>
              <option value="project_manager">project_manager</option>
            </select>
            <Button onClick={() => void handleCreateInvite()} disabled={isCreatingInvite}>
              {isCreatingInvite ? 'Создание...' : 'Создать invite'}
            </Button>
          </div>
          {inviteLink && (
            <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
              <p className="truncate text-xs text-muted-foreground">{inviteLink}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void navigator.clipboard.writeText(inviteLink)}
              >
                Скопировать ссылку
              </Button>
            </div>
          )}
        </div>
      )}

      {showAddPanel && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Добавить сотрудника в отдел</h3>
          <p className="mt-1 text-sm text-muted-foreground">Можно выбрать только сотрудников текущей компании.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="">Выберите сотрудника</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
              ))}
            </select>
            <Button onClick={() => void handleAddMember()} disabled={!selectedUserId || addTeamMember.isPending || createTeam.isPending}>
              {addTeamMember.isPending || createTeam.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoStat icon={Users} label="Участников" value={rows.length} />
        <InfoStat icon={Building2} label="Проектов" value={departmentTeams.length} />
      </div>

      {rows.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title={t('project.noMembers', 'Нет участников')}
          description={t('project.noMembersDesc', 'Добавьте участников в отдел для совместной работы')}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <DataTable
            columns={columns}
            data={filteredRows}
            loading={isLoading}
            searchable
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            searchPlaceholder={t('project.searchMembersAndTeams', 'Искать участников и проекты...')}
          />
        </div>
      )}
    </div>
  )
}

function InfoStat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
