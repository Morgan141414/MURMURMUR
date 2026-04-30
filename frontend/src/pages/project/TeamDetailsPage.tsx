import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CheckCircle2, LayoutGrid, Plus, Settings2, UserPlus, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS } from '@/types'
import { useProjects } from '@/hooks/useProjects'
import { createDepartmentInvite } from '@/api/projects'
import { useTeams, useCreateTeam } from '@/hooks/useTeams'
import { useUsers } from '@/hooks/useAdmin'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { getUserOnlineStatus } from '@/lib/presence'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { UserSelect } from '@/components/shared/UserSelect'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'

export default function TeamDetailsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, teamId } = useParams<{ projectId: string; teamId: string }>()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const role = org?.role ?? null

  const { data: projects = [] } = useProjects(orgId ?? '')
  const { data: teams = [] } = useTeams(orgId ?? '')
  const { data: users = [] } = useUsers(orgId ?? '')
  const createTeam = useCreateTeam(orgId ?? '')

  const [showAddMember, setShowAddMember] = useState(false)
  const [showJoinRequest, setShowJoinRequest] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [memberUserId, setMemberUserId] = useState<string | null>(null)
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  const department = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projectId, projects],
  )

  const team = useMemo(
    () => teams.find((item) => item.id === teamId && item.project_id === projectId) ?? null,
    [projectId, teamId, teams],
  )

  const members = useMemo(
    () => (team?.members ?? []).map((member) => ({
      ...member,
      user: users.find((user) => user.id === member.user_id) ?? null,
    })),
    [team?.members, users],
  )

  const isDepartmentHead = !!department?.department_head_user_id && department.department_head_user_id === currentUserId
  const isTeamLead = !!team?.team_lead_user_id && team.team_lead_user_id === currentUserId
  const isMember = members.some((m) => m.user_id === currentUserId)
  const canInviteDirectly =
    role === 'founder' ||
    role === 'ceo' ||
    role === 'admin' ||
    role === 'sysadmin' ||
    isDepartmentHead ||
    isTeamLead ||
    isMember
  const canOpenTeamSettings =
    role === 'founder' ||
    role === 'ceo' ||
    role === 'admin' ||
    role === 'sysadmin' ||
    role === 'team_lead' ||
    isDepartmentHead ||
    isTeamLead

  const teamLead = useMemo(
    () => users.find((user) => user.id === team?.team_lead_user_id) ?? null,
    [team?.team_lead_user_id, users],
  )

  if (!team || !department) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Проект не найден"
          description="Проверьте, что проект относится к выбранному отделу"
          breadcrumbs={[
            { label: org?.orgName ?? 'Компания', to: '/company' },
            { label: 'Отдел', to: '/department' },
            { label: 'Проект' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={team.name}
        description={`Проект отдела ${department.name}`}
        eyebrow="Проект"
        breadcrumbs={[
          { label: org?.orgName ?? 'Компания', to: '/company' },
          { label: 'Отдел', to: '/department' },
          { label: department.name, to: `/department/${department.id}` },
          { label: team.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateTeam(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Создать проект
            </Button>
            {canInviteDirectly ? (
              <Button variant="outline" onClick={() => setShowAddMember(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Пригласить в проект
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowJoinRequest(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Запрос на вступление
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/department/${department.id}/board?team=${team.id}`)}>
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              Доска
            </Button>
            {canOpenTeamSettings ? (
              <Button variant="outline" onClick={() => navigate(`/department/${department.id}/team/${team.id}/settings`)}>
                <Settings2 className="mr-1.5 h-4 w-4" />
                Редактировать
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => navigate(`/department/${department.id}`)}>
              Назад к отделу
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="h-16 w-16 rounded-2xl border border-border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-background text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{org?.orgName ?? 'QORMED'}</h2>
                {role ? (
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{ROLE_LABELS[role]}</span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approved
                </span>
              </div>
              <p className="mt-1 text-base font-semibold text-foreground">{team.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Рабочий проект внутри отдела {department.name}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Лидер проекта: {teamLead?.full_name || teamLead?.email || 'Не назначен'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 text-base font-semibold text-foreground">Сотрудники проекта</h3>
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">В проекте пока нет участников</div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => navigate(`/users/${member.user_id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:bg-accent"
              >
                <UserAvatar
                  name={member.user?.full_name ?? member.user?.email ?? member.user_id}
                  src={member.user?.avatar_url}
                  size="md"
                  status={getUserOnlineStatus(member.user ?? { last_seen_at: null })}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.user?.full_name || member.user?.email || member.user_id}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.user?.position || member.role || 'Участник проекта'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Пригласить в проект</DialogTitle>
            <DialogDescription>Выберите сотрудника для приглашения в проект {team.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Сотрудник" required error={!memberUserId ? 'Выберите сотрудника' : undefined}>
              <UserSelect
                users={users.map((user) => ({
                  id: user.id,
                  name: user.full_name || user.email,
                  email: user.email,
                  avatarUrl: user.avatar_url,
                }))}
                value={memberUserId}
                onChange={setMemberUserId}
                placeholder="Выберите сотрудника"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddMember(false); setMemberUserId(null) }}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                if (!memberUserId) return
                try {
                  setIsSendingInvite(true)
                  if (!orgId || !department?.id) throw new Error('missing_context')
                  const response = await createDepartmentInvite(orgId, department.id, {
                    invitee_user_id: memberUserId,
                    team_id: team.id,
                    role: 'member',
                  })
                  const status = String(response.data?.status || '')
                  toast.success(status === 'approval_pending' ? 'Запрос отправлен руководителю отдела на согласование' : 'Приглашение отправлено')
                  setShowAddMember(false)
                  setMemberUserId(null)
                  window.dispatchEvent(new CustomEvent('notifications:refresh'))
                } catch {
                  toast.error('Не удалось отправить приглашение')
                } finally {
                  setIsSendingInvite(false)
                }
              }}
              disabled={!memberUserId || isSendingInvite}
            >
              {isSendingInvite ? 'Отправка...' : 'Отправить приглашение'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoinRequest} onOpenChange={setShowJoinRequest}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Запрос на вступление</DialogTitle>
            <DialogDescription>Отправить запрос на вступление в проект {team.name}? Лидер проекта получит уведомление для одобрения.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinRequest(false)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                try {
                  setIsSendingInvite(true)
                  if (!orgId || !department?.id || !currentUserId) throw new Error('missing_context')
                  await createDepartmentInvite(orgId, department.id, {
                    invitee_user_id: currentUserId,
                    team_id: team.id,
                    role: 'member',
                  })
                  toast.success('Запрос на вступление отправлен лидеру проекта')
                  setShowJoinRequest(false)
                  window.dispatchEvent(new CustomEvent('notifications:refresh'))
                } catch {
                  toast.error('Не удалось отправить запрос')
                } finally {
                  setIsSendingInvite(false)
                }
              }}
              disabled={isSendingInvite}
            >
              {isSendingInvite ? 'Отправка...' : 'Отправить запрос'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать проект</DialogTitle>
            <DialogDescription>Создайте новую проект в отделе {department.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Название проекта" required error={!newTeamName.trim() ? 'Введите название' : undefined}>
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Например: Frontend проект"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateTeam(false); setNewTeamName('') }}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                if (!newTeamName.trim()) return
                try {
                  const newTeam = await createTeam.mutateAsync({ name: newTeamName.trim(), projectId: department.id })
                  toast.success('Проект создан')
                  setShowCreateTeam(false)
                  setNewTeamName('')
                  navigate(`/department/${department.id}/team/${newTeam.id}`)
                } catch {
                  toast.error('Не удалось создать проект')
                }
              }}
              disabled={!newTeamName.trim() || createTeam.isPending}
            >
              {createTeam.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
