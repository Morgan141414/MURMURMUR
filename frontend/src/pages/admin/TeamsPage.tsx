import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Crown, FolderKanban, Plus, UserPlus, Users } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useAdmin'
import { useAddTeamMember, useAssignTeamLead, useCreateTeam, useTeams } from '@/hooks/useTeams'
import type { Team } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { FormField } from '@/components/shared/FormField'
import { UserSelect } from '@/components/shared/UserSelect'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function TeamsPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const { data: teams = [], isLoading } = useTeams(orgId ?? '')
  const { data: projects = [] } = useProjects(orgId ?? '')
  const { data: users = [] } = useUsers(orgId ?? '')
  const createTeam = useCreateTeam(orgId ?? '')
  const addTeamMember = useAddTeamMember(orgId ?? '')
  const assignTeamLead = useAssignTeamLead(orgId ?? '')

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [memberTeamId, setMemberTeamId] = useState('')
  const [memberUserId, setMemberUserId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [leadUserId, setLeadUserId] = useState('')

  const canAssignLead = org?.role === 'ceo' || org?.role === 'founder'
  const canSeeProjectContext = (team: Team) => {
    const isMember = !!currentUserId && (team.members ?? []).some((member) => member.user_id === currentUserId)
    return isMember || ['founder', 'ceo', 'admin', 'hr', 'project_manager', 'team_lead'].includes(org?.role ?? '')
  }

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  )

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) => {
        const query = search.trim().toLowerCase()
        if (!query) return true

        return (
          team.name.toLowerCase().includes(query) ||
          (team.project_id || '').toLowerCase().includes(query)
        )
      }),
    [search, teams],
  )

  const columns = useMemo<ColumnDef<Team>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('teams.team'),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.id.slice(0, 8)}...</p>
          </div>
        ),
      },
      {
        id: 'project',
        header: t('teams.project'),
        cell: ({ row }) => {
          const project = projects.find((item) => item.id === row.original.project_id)
          return (
            <div className="space-y-0.5">
              <p className="text-sm text-foreground">{project?.name || t('teams.companyWideTeam')}</p>
              <p className="text-xs text-muted-foreground">{row.original.project_id || t('teams.noLinkedProject')}</p>
            </div>
          )
        },
      },
      {
        id: 'members',
        header: t('teams.members'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {(row.original.members ?? []).length} {t('teams.assigned')}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('teams.status'),
        cell: ({ row }) => (
          <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
            {(row.original.members ?? []).length > 0 ? t('teams.active') : t('teams.needsStaffing')}
          </span>
        ),
      },
    ],
    [projects, t],
  )

  async function handleCreate() {
    if (!orgId || !teamName.trim()) return
    try {
      await createTeam.mutateAsync({ name: teamName.trim(), projectId: projectId || undefined })
      setTeamName('')
      setProjectId('')
      setShowCreate(false)
      toast.success(t('teams.teamCreated'))
    } catch {
      toast.error(t('teams.teamCreateError'))
    }
  }

  async function handleAddMember() {
    if (!orgId || !memberTeamId || !memberUserId) return
    try {
      await addTeamMember.mutateAsync({ teamId: memberTeamId, userId: memberUserId })
      setMemberTeamId('')
      setMemberUserId(null)
      setShowAddMember(false)
      toast.success(t('teams.memberAdded'))
    } catch {
      toast.error(t('teams.memberAddError'))
    }
  }

  async function handleAssignLead() {
    if (!selectedTeam || !leadUserId) return
    try {
      await assignTeamLead.mutateAsync({ teamId: selectedTeam.id, userId: leadUserId })
      toast.success('Тимлид назначен')
      setSelectedTeam(null)
      setLeadUserId('')
    } catch {
      toast.error('Не удалось назначить тимлида')
    }
  }

  if (!orgId) {
    return (
      <div className="page-enter">
        <PageHeader
          title={t('teams.title')}
          description={t('teams.noOrg')}
          breadcrumbs={[
            { label: t('shell.company'), to: '/company' },
            { label: t('teams.title') },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t('teams.title')}
        description={t('teams.description')}
        eyebrow={t('teams.eyebrow')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('teams.title') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {t('teams.teamsCount', { count: teams.length })}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAddMember(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              {t('teams.addMember')}
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('teams.createTeam')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border bg-card p-4">
          <DataTable
            columns={columns}
            data={filteredTeams}
            onRowClick={(team) => {
              setSelectedTeam(team)
              setLeadUserId(team.team_lead_user_id || '')
            }}
            loading={isLoading}
            searchable
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            searchPlaceholder={t('teams.searchPlaceholder')}
            emptyIcon={Users}
            emptyTitle={t('teams.emptyTitle')}
            emptyDescription={t('teams.emptyDescription')}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">{t('teams.teamStructure')}</h3>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>{t('teams.teamStructureDesc')}</p>
              <p>{t('teams.teamStructureHint')}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('teams.linkedProjects')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('teams.linkedProjectsCount', { count: projects.length })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('teams.createTeam')}</DialogTitle>
            <DialogDescription>
              {t('teams.createTeamDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label={t('teams.teamName')} required error={!teamName.trim() ? t('teams.teamNameRequired') : undefined}>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder={t('teams.teamNamePlaceholder')}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </FormField>

            <FormField label={t('teams.linkedProject')} hint={t('teams.linkedProjectHint')}>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                <option value="">{t('teams.noLinkedProjectOption')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={createTeam.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={createTeam.isPending || !teamName.trim()}>
              {createTeam.isPending ? t('common.saving') : t('teams.createTeam')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('teams.addMemberTitle')}</DialogTitle>
            <DialogDescription>
              {t('teams.addMemberDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label={t('teams.team')} required error={!memberTeamId ? t('teams.selectTeamRequired') : undefined}>
              <select
                value={memberTeamId}
                onChange={(event) => setMemberTeamId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                <option value="">{t('teams.selectTeam')}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('teams.selectMember')} required error={!memberUserId ? t('teams.selectMemberRequired') : undefined}>
              <UserSelect
                users={users.map((user) => ({
                  id: user.id,
                  name: user.full_name,
                  email: user.email,
                  avatarUrl: user.avatar_url,
                }))}
                value={memberUserId}
                onChange={setMemberUserId}
                placeholder={t('teams.searchEmployee')}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)} disabled={addTeamMember.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleAddMember()} disabled={addTeamMember.isPending || !memberTeamId || !memberUserId}>
              {addTeamMember.isPending ? t('common.saving') : t('teams.addMember')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTeam} onOpenChange={(open) => { if (!open) { setSelectedTeam(null); setLeadUserId('') } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name || 'Проект'}</DialogTitle>
            <DialogDescription>
              Участники проекта, тимлид и связанный отдел.
            </DialogDescription>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Тимлид</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">
                      {selectedTeam.team_lead_user_id
                        ? (userMap.get(selectedTeam.team_lead_user_id)?.full_name || userMap.get(selectedTeam.team_lead_user_id)?.email || selectedTeam.team_lead_user_id)
                        : 'Не назначен'}
                    </span>
                  </div>
                </div>

                {(canSeeProjectContext(selectedTeam) || canAssignLead) && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Проект</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {projects.find((project) => project.id === selectedTeam.project_id)?.name || 'Без привязки к проекту'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedTeam.project_id || 'Общий проект'}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Участники</p>
                <div className="space-y-2">
                  {(selectedTeam.members ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">В этом проекте пока нет участников.</p>
                  ) : (
                    selectedTeam.members?.map((member) => {
                      const user = userMap.get(member.user_id)
                      return (
                        <div key={member.user_id} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{user?.full_name || user?.email || member.user_id}</p>
                            <p className="text-xs text-muted-foreground">{user?.email || member.user_id}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {member.role === 'team_lead' ? 'Тимлид' : 'Участник'}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {canAssignLead && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <FormField label="Назначить тимлида">
                    <select
                      value={leadUserId}
                      onChange={(event) => setLeadUserId(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                    >
                      <option value="">Выберите участника проекта</option>
                      {(selectedTeam.members ?? []).map((member) => {
                        const user = userMap.get(member.user_id)
                        return (
                          <option key={member.user_id} value={member.user_id}>
                            {user?.full_name || user?.email || member.user_id}
                          </option>
                        )
                      })}
                    </select>
                  </FormField>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => { setSelectedTeam(null); setLeadUserId('') }}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={() => void handleAssignLead()} disabled={!leadUserId || assignTeamLead.isPending}>
                      {assignTeamLead.isPending ? t('common.saving') : 'Назначить тимлида'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
