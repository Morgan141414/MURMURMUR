import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Crown, Trash2, Upload, Users } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useTeams, useAssignTeamLead, useDeleteTeam, useUpdateTeam, useUploadTeamLogo } from '@/hooks/useTeams'
import { useUsers } from '@/hooks/useAdmin'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const message = detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String((item as { msg?: unknown }).msg || '') : ''))
      .filter(Boolean)
      .join('; ')
    if (message) return message
  }
  return fallback
}


export default function TeamSettingsPage() {
  const navigate = useNavigate()
  const { projectId, teamId } = useParams<{ projectId: string; teamId: string }>()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const role = org?.role ?? null

  const { data: projects = [] } = useProjects(orgId ?? '')
  const { data: teams = [] } = useTeams(orgId ?? '')
  const { data: users = [] } = useUsers(orgId ?? '')

  const updateTeam = useUpdateTeam(orgId ?? '')
  const uploadTeamLogo = useUploadTeamLogo(orgId ?? '')
  const assignTeamLead = useAssignTeamLead(orgId ?? '')
  const deleteTeam = useDeleteTeam(orgId ?? '')

  const department = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projectId, projects],
  )
  const team = useMemo(
    () => teams.find((item) => item.id === teamId && item.project_id === projectId) ?? null,
    [projectId, teamId, teams],
  )

  const [teamName, setTeamName] = useState('')
  const [teamLogo, setTeamLogo] = useState('')
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null)
  const [leadUserId, setLeadUserId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [timezone, setTimezone] = useState('UTC')
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00')
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00')
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5')

  useEffect(() => {
    setTeamName(team?.name ?? '')
    setTeamLogo(team?.logo_url ?? '')
    setLeadUserId(team?.team_lead_user_id ?? '')
    setTimezone(team?.timezone ?? 'UTC')
    setWorkingHoursStart(team?.working_hours_start ?? '09:00')
    setWorkingHoursEnd(team?.working_hours_end ?? '18:00')
    setWorkingDays(team?.working_days ?? '1,2,3,4,5')
  }, [team?.name, team?.logo_url, team?.team_lead_user_id, team?.timezone, team?.working_hours_start, team?.working_hours_end, team?.working_days])

  useEffect(() => {
    return () => {
      if (teamLogoPreview) {
        URL.revokeObjectURL(teamLogoPreview)
      }
    }
  }, [teamLogoPreview])

  const isDepartmentHead = !!department?.department_head_user_id && department.department_head_user_id === currentUserId
  const isTeamLead = !!team?.team_lead_user_id && team.team_lead_user_id === currentUserId

  const canManageTeam =
    role === 'founder' ||
    role === 'ceo' ||
    role === 'admin' ||
    role === 'sysadmin' ||
    role === 'team_lead' ||
    isDepartmentHead ||
    isTeamLead

  const teamMembers = useMemo(
    () => (team?.members ?? []).map((member) => ({
      ...member,
      user: users.find((user) => user.id === member.user_id) ?? null,
    })),
    [team?.members, users],
  )

  const teamLead = useMemo(
    () => users.find((user) => user.id === team?.team_lead_user_id) ?? null,
    [team?.team_lead_user_id, users],
  )

  async function handlePickLogo(file: File | null) {
    if (!file || !teamId) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes((file.type || '').toLowerCase())) {
      toast.error('Allowed file formats: JPG, PNG, WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5 MB')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (teamLogoPreview) {
      URL.revokeObjectURL(teamLogoPreview)
    }
    setTeamLogoPreview(previewUrl)

    try {
      setIsUploading(true)
      const uploaded = await uploadTeamLogo.mutateAsync({ teamId, file })
      setTeamLogo(uploaded.logo_url)
      setTeamLogoPreview(null)
      URL.revokeObjectURL(previewUrl)
      toast.success('Team photo updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload team photo'))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSaveProfile() {
    if (!teamId || !canManageTeam) return
    try {
      await updateTeam.mutateAsync({
        teamId,
        name: teamName.trim(),
        logo_url: teamLogo.trim() || null,
        timezone,
        working_hours_start: workingHoursStart,
        working_hours_end: workingHoursEnd,
        working_days: workingDays,
      })
      toast.success('Данные проекта обновлены')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить проект'))
    }
  }

  async function handleAssignLead() {
    if (!teamId || !leadUserId || !canManageTeam) return
    try {
      await assignTeamLead.mutateAsync({ teamId, userId: leadUserId })
      toast.success('Лидер проекта назначен')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось назначить лидера проекта'))
    }
  }

  async function handleDeleteTeam() {
    if (!teamId || !department?.id || !canManageTeam) return
    const confirmed = window.confirm(`Удалить проект "${team?.name}"?`)
    if (!confirmed) return
    try {
      await deleteTeam.mutateAsync({ teamId })
      toast.success('Проект удалён')
      navigate(`/department/${department.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить проект'))
    }
  }

  if (!projectId || !teamId || !team || !department) {
    return <div className="text-sm text-muted-foreground">Проект не найден</div>
  }

  if (!canManageTeam) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Настройки проекта"
          description="У вас нет прав на редактирование этого проекта"
          breadcrumbs={[
            { label: org?.orgName ?? 'Компания', to: '/company' },
            { label: 'Отдел', to: '/department' },
            { label: department.name, to: `/department/${department.id}` },
            { label: team.name, to: `/department/${department.id}/team/${team.id}` },
            { label: 'Настройки' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки проекта"
        description="Редактирование профиля проекта и лидера"
        breadcrumbs={[
          { label: org?.orgName ?? 'Компания', to: '/company' },
          { label: 'Отдел', to: '/department' },
          { label: department.name, to: `/department/${department.id}` },
          { label: team.name, to: `/department/${department.id}/team/${team.id}` },
          { label: 'Настройки' },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/department/${department.id}/team/${team.id}`)}>
            Назад к проекту
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Профиль проекта</h3>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Название проекта</span>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                placeholder="Название проекта"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Фото проекта</span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                {isUploading ? 'Загрузка...' : 'Выбрать фото'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handlePickLogo(event.target.files?.[0] ?? null)}
                />
              </label>
              {teamLogoPreview || teamLogo ? (
                <img src={teamLogoPreview || teamLogo} alt="Лого проекта" className="h-20 w-20 rounded-xl border border-border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                  <Users className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSaveProfile()} disabled={!teamName.trim() || updateTeam.isPending || uploadTeamLogo.isPending}>
                {updateTeam.isPending ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
              {canManageTeam ? (
                <Button variant="destructive" onClick={() => void handleDeleteTeam()} disabled={deleteTeam.isPending}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {deleteTeam.isPending ? 'Удаление...' : 'Удалить проект'}
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Рабочие настройки</h3>

          <div className="space-y-4">
            <div>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Часовой пояс</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                >
                  <option value="UTC">UTC</option>
                  <option value="Europe/Moscow">Москва (UTC+3)</option>
                  <option value="Asia/Almaty">Алматы (UTC+6)</option>
                  <option value="Asia/Tashkent">Ташкент (UTC+5)</option>
                  <option value="Asia/Dubai">Дубай (UTC+4)</option>
                  <option value="Asia/Shanghai">Пекин (UTC+8)</option>
                  <option value="Europe/London">Лондон (UTC+0)</option>
                  <option value="Europe/Berlin">Берлин (UTC+1)</option>
                  <option value="America/New_York">Нью-Йорк (UTC-5)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Начало рабочего дня</span>
                  <select
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={`${String(i).padStart(2, '0')}:00`}>
                        {`${String(i).padStart(2, '0')}:00`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Конец рабочего дня</span>
                  <select
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={`${String(i).padStart(2, '0')}:00`}>
                        {`${String(i).padStart(2, '0')}:00`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Рабочие дни</span>
                <select
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                >
                  <option value="1,2,3,4,5">Пн-Пт (Понедельник - Пятница)</option>
                  <option value="1,2,3,4,5,6">Пн-Сб (Понедельник - Суббота)</option>
                  <option value="1,2,3,4,5,6,7">Все дни</option>
                  <option value="5,6">Сб-Вс (Суббота - Воскресенье)</option>
                  <option value="1,3,5">Нечётные дни (Пн, Ср, Пт)</option>
                  <option value="2,4">Чётные дни (Вт, Чт)</option>
                </select>
              </label>
            </div>

            <Button onClick={() => void handleSaveProfile()} disabled={updateTeam.isPending}>
              {updateTeam.isPending ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Лидер проекта</h3>

          <div className="mb-4 rounded-xl border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Текущий лидер</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-foreground">
              <Crown className="h-4 w-4 text-amber-500" />
              {teamLead?.full_name || teamLead?.email || 'Не назначен'}
            </p>
          </div>

          <div className="space-y-3">
            <select
              value={leadUserId}
              onChange={(event) => setLeadUserId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="">Не назначен</option>
              {teamMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user?.full_name || member.user?.email || member.user_id}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => void handleAssignLead()}
              disabled={!leadUserId || assignTeamLead.isPending}
            >
              {assignTeamLead.isPending ? 'Сохранение...' : 'Назначить лидера'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
