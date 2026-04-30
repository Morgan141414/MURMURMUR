import { useCallback, useEffect, useState } from 'react'
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
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { GripVertical, FolderKanban, Plus, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { assignDepartmentHead, createProject, listProjects, reorderProjects } from '@/api/projects'
import { listUsers } from '@/api/users'
import type { Project, User } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/FormField'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [headUserId, setHeadUserId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const canManageProjects = ['founder', 'ceo', 'team_lead', 'project_manager'].includes(activeRole ?? '')
  const canAssignHead = isSuperAdmin || ['founder', 'ceo'].includes(activeRole ?? '')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const response = await listProjects(orgId)
      setProjects(response.data)
    } catch {
      toast.error(t('projects.loadError', 'Не удалось загрузить проекты'))
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const loadUsers = useCallback(async () => {
    if (!orgId) return
    setLoadingUsers(true)
    try {
      const response = await listUsers(orgId)
      setUsers(response.data)
    } catch {
      toast.error(t('projects.usersLoadError', 'Не удалось загрузить список сотрудников'))
    } finally {
      setLoadingUsers(false)
    }
  }, [orgId, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  async function handleCreate() {
    if (!orgId || !name.trim()) return
    setCreating(true)
    try {
      const created = await createProject(orgId, name.trim(), description.trim() || undefined)
      if (headUserId && canAssignHead) {
        try {
          await assignDepartmentHead(orgId, created.data.id, headUserId)
        } catch {
          toast.error(t('projects.assignHeadError', 'Отдел создан, но руководителя назначить не удалось'))
        }
      }
      setName('')
      setDescription('')
      setHeadUserId('')
      setShowCreate(false)
      toast.success(t('projects.createSuccess', 'Отдел создан'))
      await load()
    } catch {
      toast.error(t('projects.createError', 'Не удалось создать отдел'))
    } finally {
      setCreating(false)
    }
  }

  async function persistOrder(nextProjects: Project[]) {
    if (!orgId) return
    setProjects(nextProjects.map((project, index) => ({ ...project, position: index })))
    try {
      const response = await reorderProjects(orgId, nextProjects.map((project) => project.id))
      setProjects(response.data)
    } catch {
      toast.error(t('projects.reorderError', 'Не удалось сохранить порядок отделов'))
      await load()
    }
  }

  function handleDepartmentDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = projects.findIndex((project) => project.id === active.id)
    const newIndex = projects.findIndex((project) => project.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const nextProjects = [...projects]
    const [moved] = nextProjects.splice(oldIndex, 1)
    nextProjects.splice(newIndex, 0, moved)
    void persistOrder(nextProjects)
  }

  if (!orgId) {
    return (
      <div className="page-enter">
        <PageHeader
          title={t('projects.title', 'Отделы')}
          description={t('admin.noOrg')}
          breadcrumbs={[
            { label: t('shell.company'), to: '/company' },
            { label: t('projects.title') },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t('projects.title', 'Отделы')}
        description={t('projects.description', { org: org?.orgName ?? t('shell.company'), defaultValue: `Управляйте отделами компании ${org?.orgName ?? ''}` })}
        eyebrow={t('projects.eyebrow', 'Структура компании')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('projects.title') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {t('projects.activeCount', { count: projects.length })}
          </span>
        }
        actions={
          canManageProjects ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('admin.createProject', 'Создать отдел')}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('projects.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
          </div>

          {projects.length === 0 && !loading ? (
            <EmptyState
              icon={FolderKanban}
              title={t('projects.emptyTitle', 'Отделов пока нет')}
              description={t('projects.emptyDescription', 'Создайте отдел, чтобы распределять участников и рабочие проекты')}
              action={
                canManageProjects ? (
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t('projects.createProject', 'Создать отдел')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDepartmentDragEnd}>
              <SortableContext items={projects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[44px_minmax(0,1fr)_120px_130px_96px] border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span />
                    <span>{t('admin.projectName', 'Название отдела')}</span>
                    <span>{t('projects.status')}</span>
                    <span>{t('projects.workspace', 'ID отдела')}</span>
                    <span />
                  </div>
                  {projects
                    .filter((project) => {
                      const query = search.trim().toLowerCase()
                      return !query || project.name.toLowerCase().includes(query) || (project.description || '').toLowerCase().includes(query)
                    })
                    .map((project) => (
                      <DepartmentRow
                        key={project.id}
                        project={project}
                        onOpen={() => navigate(`/department/${project.id}`)}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('projects.portfolioControl', 'Управление отделами')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('projects.portfolioControlDesc', 'Каждый отдел ведёт своих участников, внутренние проекты и отдельные доски исполнения.')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">{t('projects.whatUsersDo', 'Как использовать')}</h3>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>{t('projects.usersDoLine1', 'Создайте отдел и откройте его обзор, чтобы увидеть руководителя, участников и связанные проекты.')}</p>
              <p>{t('projects.usersDoLine2', 'Внутри отдела проекты команды открываются отдельно и ведутся на своих досках.')}</p>
              <p>{t('projects.usersDoLine3', 'Сама страница отдела теперь не прыгает сразу в доску, а показывает структуру.')}</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.createProject', 'Создать отдел')}</DialogTitle>
            <DialogDescription>
              {t('projects.createProjectDesc', 'Создайте отдел компании, внутри которого будут участники, проекты команды и их доски.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label={t('admin.projectName', 'Название отдела')} required error={!name.trim() ? t('projects.nameRequired', 'Название обязательно') : undefined}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('projects.namePlaceholder', 'Маркетинг, Разработка, Продажи...')}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </FormField>

            <FormField label={t('admin.description', 'Описание')} hint={t('projects.descHint', 'Кратко опишите зону ответственности отдела')}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder={t('projects.descPlaceholder', 'Чем занимается отдел, кто отвечает и какие результаты за ним закреплены?')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </FormField>

            <FormField
              label={t('projects.departmentHead', 'Руководитель отдела')}
              hint={canAssignHead ? t('projects.departmentHeadHint', 'Назначьте руководителя сразу при создании') : t('projects.departmentHeadRestricted', 'Назначить руководителя может только Founder или CEO')}
            >
              <select
                value={headUserId}
                onChange={(event) => setHeadUserId(event.target.value)}
                disabled={!canAssignHead || loadingUsers}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{loadingUsers ? t('common.loading', 'Загрузка...') : t('projects.noHead', 'Не назначен')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                ))}
              </select>
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating || !name.trim()}>
              {creating ? t('common.saving') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DepartmentRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id, data: { type: 'department', project } })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'grid grid-cols-[44px_minmax(0,1fr)_120px_130px_96px] items-center border-b border-border px-3 py-3 last:border-b-0',
        isDragging ? 'relative z-10 bg-accent shadow-lg' : 'bg-card',
      )}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
        aria-label={t('projects.dragDepartment', 'Переместить отдел')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <p className="truncate font-medium text-foreground">{project.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {project.description || t('projects.noSummary', 'Описание отдела пока не заполнено')}
        </p>
      </button>
      <span className="inline-flex w-fit items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
        {t('projects.active')}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{project.id.slice(0, 8)}...</span>
      <Button variant="ghost" size="sm" onClick={onOpen}>
        {t('projects.open', 'Открыть')}
      </Button>
    </div>
  )
}
