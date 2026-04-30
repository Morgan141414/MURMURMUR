import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { Building2, CheckCircle2, GripVertical, LayoutGrid, Settings2, Users, UserPlus } from 'lucide-react'
import { createDepartmentInvite } from '@/api/projects'
import { reorderTeams } from '@/api/teams'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS } from '@/types'
import { useProject } from '@/hooks/useBoard'
import { useTeams } from '@/hooks/useTeams'
import { useUsers } from '@/hooks/useAdmin'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { getUserOnlineStatus } from '@/lib/presence'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { cn } from '@/lib/utils'

export default function ProjectDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId } = useParams()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const role = org?.role ?? null

  const { data: project } = useProject(orgId, projectId ?? null)
  const { data: teams = [] } = useTeams(orgId)
  const { data: users = [] } = useUsers(orgId)

  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteTeamId, setInviteTeamId] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteNote, setInviteNote] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [localTeams, setLocalTeams] = useState<typeof teams>([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const departmentTeams = useMemo(
    () => teams.filter((team) => team.project_id === projectId),
    [projectId, teams],
  )

  const teamsWithOrder = useMemo(() => {
    if (localTeams.length > 0) return localTeams
    return departmentTeams
  }, [departmentTeams, localTeams])

  const persistTeamOrder = useCallback(async (nextTeams: typeof teams) => {
    if (!orgId) return
    const teamsWithPosition = nextTeams.map((team, index) => ({ ...team, position: index } as typeof team))
    setLocalTeams(teamsWithPosition)
    try {
      const response = await reorderTeams(orgId, nextTeams.map((team) => team.id))
      setLocalTeams(response.data)
    } catch {
      toast.error(t('teams.reorderError', 'Не удалось сохранить порядок'))
      setLocalTeams([])
    }
  }, [orgId, t])

  function handleTeamDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = teamsWithOrder.findIndex((team) => team.id === active.id)
    const newIndex = teamsWithOrder.findIndex((team) => team.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const nextTeams = [...teamsWithOrder]
    const [moved] = nextTeams.splice(oldIndex, 1)
    nextTeams.splice(newIndex, 0, moved)
    void persistTeamOrder(nextTeams)
  }

  const isDepartmentHead = !!project?.department_head_user_id && project.department_head_user_id === currentUserId
  const isDepartmentTeamLead = departmentTeams.some((team) => team.team_lead_user_id === currentUserId)

  const canManageDepartment =
    role === 'founder' ||
    role === 'ceo' ||
    role === 'admin' ||
    role === 'sysadmin' ||
    role === 'team_lead' ||
    isDepartmentHead ||
    isDepartmentTeamLead

  const canOpenDepartmentSettings = canManageDepartment

  const participantIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...departmentTeams.flatMap((team) => (team.members ?? []).map((member) => member.user_id)),
          ...(project?.department_head_user_id ? [project.department_head_user_id] : []),
        ]),
      ),
    [departmentTeams, project?.department_head_user_id],
  )

  const departmentMembers = useMemo(
    () => users.filter((user) => participantIds.includes(user.id)),
    [participantIds, users],
  )

  const departmentHead = useMemo(
    () => users.find((u) => u.id === project?.department_head_user_id) ?? null,
    [project?.department_head_user_id, users],
  )

  const inviteCandidates = useMemo(
    () => users.filter((user) => !participantIds.includes(user.id)),
    [participantIds, users],
  )

  if (!projectId) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Отдел не выбран</div>
  }

  async function handleInviteToDepartment() {
    if (!orgId || !projectId || !inviteUserId) return
    try {
      setIsInviting(true)
      const response = await createDepartmentInvite(orgId, projectId, {
        invitee_user_id: inviteUserId,
        team_id: inviteTeamId || undefined,
        role: inviteRole,
        note: inviteNote.trim() || undefined,
      })
      setInviteUserId('')
      setInviteTeamId('')
      setInviteRole('member')
      setInviteNote('')
      setShowInvitePanel(false)
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
      const inviteStatus = String(response.data?.status || '')
      toast.success(inviteStatus === 'approval_pending' ? 'Запрос отправлен руководителю отдела на согласование' : 'Приглашение отправлено')
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Не удалось отправить приглашение')
          : 'Не удалось отправить приглашение'
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project?.name ?? 'Отдел'}
        description={project?.description || 'Рабочее пространство отдела'}
        eyebrow={t('project.moduleEyebrow', 'Отдел')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('shell.department'), to: '/department' },
          { label: project?.name ?? 'Отдел' },
        ]}
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {project?.logo_url ? (
              <img src={project.logo_url} alt={project.name} className="h-16 w-16 rounded-2xl border border-border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-background text-muted-foreground">
                <Building2 className="h-6 w-6" />
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
              <p className="mt-1 text-base font-semibold text-foreground">{project?.name ?? 'Отдел'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{project?.description || 'Описание отдела пока не заполнено'}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Руководитель отдела: {departmentHead?.full_name || departmentHead?.email || 'Не назначен'}
              </p>
            </div>
          </div>
          {canOpenDepartmentSettings ? (
            <Button variant="outline" onClick={() => navigate(`/department/${projectId}/settings`)}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Редактировать
            </Button>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate(`/department/${projectId}/members`)}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <p className="text-sm font-semibold text-foreground">Сотрудники отдела "{project?.name ?? 'Отдел'}"</p>
          <p className="mt-1 text-xs text-muted-foreground">Состав отдела, роли и управление участниками</p>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/department/${projectId}/board`)}
          className="rounded-xl border border-primary/35 bg-primary/10 p-4 text-left shadow-[0_0_0_1px_rgba(59,130,246,0.12)] transition-colors hover:bg-primary/15"
        >
          <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Основной раздел</div>
          <p className="mt-3 text-sm font-semibold text-foreground">Доска отдела</p>
          <p className="mt-1 text-xs text-primary/90">Перейти к задачам и работе отдела</p>
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('department-teams')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
        </button>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section id="department-teams" className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Проекты отдела</h3>
            {canManageDepartment ? (
              <Button variant="outline" size="sm" onClick={() => navigate(`/department/${projectId}/team/new`)}>
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Добавить
              </Button>
            ) : null}
          </div>

          {teamsWithOrder.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Проектов пока нет</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeamDragEnd}>
              <SortableContext items={teamsWithOrder.map((team) => team.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {teamsWithOrder.map((team) => (
                    <SortableTeamCard
                      key={team.id}
                      team={team}
                      onOpen={() => navigate(`/department/${projectId}/team/${team.id}`)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Сотрудники</h3>
            {canManageDepartment ? (
              <Button size="sm" variant="outline" onClick={() => setShowInvitePanel((v) => !v)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Пригласить
              </Button>
            ) : null}
          </div>

          {showInvitePanel && canManageDepartment && (
            <div className="mb-4 space-y-2 rounded-xl border border-border bg-background/40 p-3">
              <select
                value={inviteUserId}
                onChange={(event) => setInviteUserId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                <option value="">Выберите сотрудника</option>
                {inviteCandidates.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                ))}
              </select>

              <select
                value={inviteTeamId}
                onChange={(event) => setInviteTeamId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                <option value="">Любой проект отдела</option>
                {departmentTeams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>

              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                <option value="member">member</option>
                <option value="developer">developer</option>
                <option value="team_lead">team_lead</option>
                <option value="project_manager">project_manager</option>
              </select>

              <input
                value={inviteNote}
                onChange={(event) => setInviteNote(event.target.value)}
                placeholder="Комментарий к приглашению (опционально)"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />

              <Button onClick={() => void handleInviteToDepartment()} disabled={!inviteUserId || isInviting} className="w-full">
                {isInviting ? 'Отправка...' : 'Отправить приглашение'}
              </Button>
            </div>
          )}

          {departmentMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Участники отдела пока не добавлены</div>
          ) : (
            <div className="space-y-2">
              {departmentMembers.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => navigate(`/users/${member.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:bg-accent"
                >
                  <UserAvatar name={member.full_name} src={member.avatar_url} size="md" status={getUserOnlineStatus(member)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{member.full_name || member.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.position || member.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SortableTeamCard({ team, onOpen }: { team: any; onOpen: () => void }) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id, data: { type: 'team', team } })

  const membersCount = (team.members ?? []).length

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-background/40 p-4 text-left transition-colors',
        isDragging ? 'z-10 opacity-50 ring-2 ring-primary' : 'hover:bg-accent',
      )}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
        aria-label={t('teams.dragTeam', 'Переместить команду')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-3"
      >
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="h-10 w-10 rounded-lg border border-border object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <Users className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
          <p className="text-xs text-muted-foreground">{membersCount} участников</p>
        </div>
      </button>
    </div>
  )
}
