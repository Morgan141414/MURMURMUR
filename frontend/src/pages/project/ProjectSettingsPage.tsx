import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Building2, Crown, Upload } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useProject } from '@/hooks/useBoard'
import { useAssignDepartmentHead, useUpdateProject, useUploadProjectLogo } from '@/hooks/useProjects'
import { useTeams } from '@/hooks/useTeams'
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

export default function ProjectSettingsPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const role = org?.role ?? null

  const { data: project } = useProject(orgId, projectId ?? null)
  const { data: users = [] } = useUsers(orgId)
  const { data: teams = [] } = useTeams(orgId)

  const updateProject = useUpdateProject()
  const assignDepartmentHead = useAssignDepartmentHead()
  const uploadProjectLogo = useUploadProjectLogo()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [headUserId, setHeadUserId] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setLogoUrl(project?.logo_url ?? '')
    setHeadUserId(project?.department_head_user_id ?? '')
  }, [project?.name, project?.description, project?.logo_url, project?.department_head_user_id])

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  const isDepartmentHead = !!project?.department_head_user_id && project.department_head_user_id === currentUserId
  const isDepartmentTeamLead = teams.some((team) => team.project_id === projectId && team.team_lead_user_id === currentUserId)
  const canEditDepartment = role === 'founder' || role === 'ceo' || role === 'admin' || role === 'sysadmin' || role === 'team_lead' || isDepartmentHead || isDepartmentTeamLead
  const canAssignHead = role === 'founder' || role === 'ceo'

  const currentHead = useMemo(
    () => users.find((user) => user.id === project?.department_head_user_id) ?? null,
    [users, project?.department_head_user_id],
  )
  async function handlePickLogo(file: File | null) {
    if (!file || !orgId || !projectId) return

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
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
    }
    setLogoPreview(previewUrl)

    try {
      setIsUploading(true)
      const uploaded = await uploadProjectLogo.mutateAsync({ orgId, projectId, file })
      setLogoUrl(uploaded.logo_url)
      setLogoPreview(null)
      URL.revokeObjectURL(previewUrl)
      toast.success('Department photo updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload department photo'))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSaveDepartmentProfile() {
    if (!orgId || !projectId || !name.trim()) return
    try {
      await updateProject.mutateAsync({
        orgId,
        projectId,
        name: name.trim(),
        description: description.trim() || '',
        logo_url: logoUrl.trim() || null,
      })
      toast.success('Данные отдела обновлены')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить отдел'))
    }
  }

  async function handleAssignHead() {
    if (!orgId || !projectId || !headUserId) return
    try {
      await assignDepartmentHead.mutateAsync({ orgId, projectId, userId: headUserId })
      toast.success('Руководитель отдела назначен')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось назначить руководителя отдела'))
    }
  }

  if (!projectId) {
    return <div className="text-sm text-muted-foreground">Отдел не выбран</div>
  }

  if (!canEditDepartment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Настройки отдела"
          description="У вас нет прав на редактирование этого отдела"
          breadcrumbs={[
            { label: org?.orgName ?? 'Компания', to: '/company' },
            { label: 'Отдел', to: '/department' },
            { label: project?.name ?? 'Отдел', to: `/department/${projectId}` },
            { label: 'Настройки' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки отдела"
        description="Редактирование профиля отдела, фото и руководителя"
        breadcrumbs={[
          { label: org?.orgName ?? 'Компания', to: '/company' },
          { label: 'Отдел', to: '/department' },
          { label: project?.name ?? 'Отдел', to: `/department/${projectId}` },
          { label: 'Настройки' },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/department/${projectId}`)}>
            Назад к отделу
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Профиль отдела</h3>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Название отдела</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                placeholder="Например: IT"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Описание</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring"
                placeholder="Описание отдела"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Фото отдела</span>
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
              {logoPreview || logoUrl ? (
                <img src={logoPreview || logoUrl} alt="Лого отдела" className="h-20 w-20 rounded-xl border border-border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
            </div>

            <Button onClick={() => void handleSaveDepartmentProfile()} disabled={!name.trim() || updateProject.isPending || uploadProjectLogo.isPending}>
              {updateProject.isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">Руководитель отдела</h3>

          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
            {logoPreview || logoUrl || project?.logo_url ? (
              <img src={logoPreview || logoUrl || project?.logo_url || ''} alt={project?.name || 'Department'} className="h-12 w-12 rounded-xl border border-border object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{project?.name ?? 'Отдел'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {currentHead?.full_name || currentHead?.email || 'Не назначен'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Crown className="h-4 w-4 text-amber-500" />
              Текущий руководитель: {currentHead?.full_name || currentHead?.email || 'Не назначен'}
            </p>

            <select
              value={headUserId}
              onChange={(event) => setHeadUserId(event.target.value)}
              disabled={!canAssignHead}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Не назначен</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
              ))}
            </select>

            {canAssignHead ? (
              <Button
                variant="outline"
                onClick={() => void handleAssignHead()}
                disabled={!headUserId || assignDepartmentHead.isPending}
              >
                {assignDepartmentHead.isPending ? 'Сохранение...' : 'Назначить руководителя'}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Назначить руководителя может только Founder или CEO</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
