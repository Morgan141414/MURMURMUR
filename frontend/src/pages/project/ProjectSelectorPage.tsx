import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
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
import { ArrowRight, BriefcaseBusiness, FolderKanban, GripVertical, KanbanSquare, LayoutGrid, List, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgStore } from '@/stores/orgStore'
import { useProjects } from '@/hooks/useProjects'
import { reorderProjects } from '@/api/projects'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

export default function ProjectSelectorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const { data: projects = [], isLoading } = useProjects(activeOrgId ?? '')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [localProjects, setLocalProjects] = useState<Project[]>([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const projectsWithOrder = useMemo(() => {
    if (localProjects.length > 0) return localProjects
    return projects
  }, [projects, localProjects])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projectsWithOrder
    return projectsWithOrder.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.description || '').toLowerCase().includes(query),
    )
  }, [projectsWithOrder, search])

  const persistOrder = useCallback(async (nextProjects: Project[]) => {
    if (!activeOrgId) return
    setLocalProjects(nextProjects.map((project, index) => ({ ...project, position: index })))
    try {
      const response = await reorderProjects(activeOrgId, nextProjects.map((project) => project.id))
      setLocalProjects(response.data)
    } catch {
      toast.error(t('projects.reorderError', 'Не удалось сохранить порядок'))
      setLocalProjects([])
    }
  }, [activeOrgId, t])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = projectsWithOrder.findIndex((project) => project.id === active.id)
    const newIndex = projectsWithOrder.findIndex((project) => project.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const nextProjects = [...projectsWithOrder]
    const [moved] = nextProjects.splice(oldIndex, 1)
    nextProjects.splice(newIndex, 0, moved)
    void persistOrder(nextProjects)
  }

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('nav.departments', 'Отдел'),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.description || t('project.noDescription', 'Описание проекта пока не заполнено')}</p>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('board.status', 'Статус'),
        cell: () => (
          <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
            {t('project.workspaceReady', 'Готов к работе')}
          </span>
        ),
      },
      {
        id: 'board',
        header: t('project.workspace', 'Модуль'),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/department/${row.original.id}`)
            }}
          >
            {t('project.openWorkspace', 'Открыть отдел')}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ),
      },
    ],
    [navigate, t],
  )

  if (!activeOrgId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('nav.departments', 'Отделы')}
          description={t('project.selectProjectNeedsCompany', 'Сначала выберите компанию, чтобы перейти к отделам и их рабочим пространствам.')}
          eyebrow={t('project.moduleEyebrow', 'Структура компании')}
          breadcrumbs={[{ label: t('shell.department') }]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.departments', 'Отделы')}
        description={t('project.workspaceEntryDescription', 'Здесь отображаются отделы компании. Внутри каждого отдела вы увидите участников, руководителя, проекты команды и их доски.')}
        eyebrow={t('project.moduleEyebrow', 'Структура компании')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('shell.department') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {t('project.projectCount', { count: projects.length })}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden items-center rounded-lg border border-border bg-card p-1 sm:flex">
              <button
                onClick={() => setView('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                aria-label={t('project.gridView', 'Режим карточек')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('table')}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                aria-label={t('project.tableView', 'Режим таблицы')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => navigate('/company/projects')}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('project.createProject', 'Создать отдел')}
            </Button>
          </div>
        }
      />

      {projects.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <EmptyState
            icon={BriefcaseBusiness}
            title={t('project.noProjects', 'Отделов пока нет')}
            description={t('project.noProjectsDesc', 'Создайте первый отдел, чтобы распределять участников, проекты и задачи')}
            action={
              <Button onClick={() => navigate('/company/projects')}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('project.createProject', 'Создать отдел')}
              </Button>
            }
          />
        </div>
      ) : view === 'table' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-border bg-card p-4">
            <DataTable
              columns={columns}
              data={filteredProjects}
              loading={isLoading}
              searchable
              globalFilter={search}
              onGlobalFilterChange={setSearch}
              searchPlaceholder={t('project.searchWorkspaces', 'Искать рабочие пространства проектов...')}
              emptyIcon={FolderKanban}
              emptyTitle={t('project.noMatchedProjects', 'Нет проектов по этому запросу')}
              emptyDescription={t('project.refineWorkspaceSearch', 'Уточните поиск, чтобы открыть нужный проектный модуль.')}
              onRowClick={(project) => navigate(`/department/${project.id}`)}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <KanbanSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
              <h3 className="text-sm font-semibold text-foreground">{t('project.workspaceEntry', 'Единый вход в отделы')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('project.workspaceEntryHelp', 'Отсюда вы заходите в конкретный отдел, смотрите его состав и переходите в проекты команды с отдельными досками.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">{t('project.expectedFlow', 'Как это работает')}</h3>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>{t('project.workspaceFlowLine1', 'Компания → список отделов → обзор отдела → проекты команды → доска / задачи / участники.')}</p>
                <p>{t('project.workspaceFlowLine2', 'Используйте этот экран как точку входа в отдел, а не как прямой переход в доску.')}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="relative w-full max-w-md">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('project.searchWorkspaces', 'Искать рабочие пространства проектов...')}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                />
              </div>
              <div className="hidden text-xs text-muted-foreground sm:block">
                {t('project.workspaceCount', { count: filteredProjects.length, defaultValue: `${filteredProjects.length} рабочих пространств` })}
              </div>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredProjects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => (
                  <SortableProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => navigate(`/department/${project.id}`)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}

function SortableProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id, data: { type: 'project', project } })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group rounded-2xl border border-border bg-card p-5 text-left transition-colors',
        isDragging ? 'z-10 opacity-50 ring-2 ring-primary' : 'hover:border-primary/30 hover:bg-accent/20',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
          aria-label={t('projects.dragProject', 'Переместить отдел')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KanbanSquare className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600">
          {t('project.workspaceReady', 'Отдел активен')}
        </span>
      </div>

      <button type="button" onClick={onOpen} className="mt-5 block w-full text-left">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">{project.name}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {project.description || t('project.noDescription', 'Описание проекта пока не заполнено')}
          </p>
        </div>
      </button>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="text-xs text-muted-foreground">
          {t('project.integratedWorkspace', 'Обзор участников, проектов и досок')}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {t('project.openWorkspace', 'Открыть отдел')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  )
}
