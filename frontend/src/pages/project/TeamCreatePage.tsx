import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Crown, Upload, Users } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjects } from '@/hooks/useProjects'
import { useUsers } from '@/hooks/useAdmin'
import { useAddTeamMember, useAssignTeamLead, useCreateTeam, useTeams, useUploadTeamLogo } from '@/hooks/useTeams'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'


export default function TeamCreatePage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const role = org?.role ?? null

  const { data: projects = [] } = useProjects(orgId ?? '')
  const { data: users = [] } = useUsers(orgId ?? '')
  const { data: teams = [] } = useTeams(orgId ?? '')

  const createTeam = useCreateTeam(orgId ?? '')
  const uploadTeamLogo = useUploadTeamLogo(orgId ?? '')
  const addTeamMember = useAddTeamMember(orgId ?? '')
  const assignTeamLead = useAssignTeamLead(orgId ?? '')

  const [name, setName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [leaderUserId, setLeaderUserId] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  const department = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projectId, projects],
  )

  const departmentTeams = useMemo(
    () => teams.filter((team) => team.project_id === projectId),
    [projectId, teams],
  )

  const departmentMemberIds = useMemo(() => {
    const ids = new Set<string>()
    for (const team of departmentTeams) {
      for (const member of team.members ?? []) {
        ids.add(member.user_id)
      }
    }
    return ids
  }, [departmentTeams])

  const departmentUsers = useMemo(
    () => users.filter((user) => departmentMemberIds.has(user.id)),
    [departmentMemberIds, users],
  )

  const isDepartmentHead = !!department?.department_head_user_id && department.department_head_user_id === currentUserId
  const isDepartmentTeamLead = teams.some((team) => team.project_id === projectId && team.team_lead_user_id === currentUserId)

  const canCreateTeam =
    role === 'founder' ||
    role === 'ceo' ||
    role === 'admin' ||
    role === 'sysadmin' ||
    role === 'team_lead' ||
    isDepartmentHead ||
    isDepartmentTeamLead

  function handlePickLogo(file: File | null) {
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes((file.type || '').toLowerCase())) {
      toast.error('Allowed file formats: JPG, PNG, WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5 MB')
      return
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl)
    }
    const previewUrl = URL.createObjectURL(file)
    setLogoFile(file)
    setLogoPreviewUrl(previewUrl)
    toast.success('Team photo selected')
  }

  async function handleCreate() {
    if (!projectId || !name.trim()) return
    if (!canCreateTeam) {
      toast.error('Недостаточно прав для создания проекта')
      return
    }

    try {
      const created = await createTeam.mutateAsync({ name: name.trim(), projectId })

      if (logoFile) {
        setIsUploading(true)
        try {
          await uploadTeamLogo.mutateAsync({ teamId: created.id, file: logoFile })
        } finally {
          setIsUploading(false)
        }
      }

      if (leaderUserId) {
        if (leaderUserId !== currentUserId) {
          await addTeamMember.mutateAsync({ teamId: created.id, userId: leaderUserId })
        }
        await assignTeamLead.mutateAsync({ teamId: created.id, userId: leaderUserId })
      }

      toast.success('Проект создан')
      navigate(`/department/${projectId}/team/${created.id}`)
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Не удалось создать проект')
          : 'Не удалось создать проект'
      toast.error(message)
    }
  }

  if (!projectId || !department) {
    return <div className="text-sm text-muted-foreground">Отдел не найден</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Создать проект"
        description={`Новый проект в отделе ${department.name}`}
        breadcrumbs={[
          { label: org?.orgName ?? 'Компания', to: '/company' },
          { label: 'Отдел', to: '/department' },
          { label: department.name, to: `/department/${department.id}` },
          { label: 'Создать проект' },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/department/${department.id}`)}>
            Назад к отделу
          </Button>
        }
      />

      {!canCreateTeam ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          У вас нет прав для создания проекта в этом отделе.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Параметры проекта</h3>
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Название проекта</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Например: Разработка Todo"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
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
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Лого проекта" className="h-20 w-20 rounded-xl border border-border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                  <Users className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Лидер проекта</h3>
          <div className="space-y-3">
            <select
              value={leaderUserId}
              onChange={(event) => setLeaderUserId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="">Не назначен</option>
              {departmentUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
              ))}
            </select>

            {departmentUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">В отделе пока нет участников, поэтому назначить лидера нельзя.</p>
            ) : null}

            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Crown className="h-4 w-4 text-amber-500" />
              Можно назначить сразу при создании проекта
            </p>

            <Button onClick={() => void handleCreate()} disabled={!canCreateTeam || !name.trim() || createTeam.isPending || uploadTeamLogo.isPending || isUploading}>
              {createTeam.isPending ? 'Создание...' : 'Создать проект'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
