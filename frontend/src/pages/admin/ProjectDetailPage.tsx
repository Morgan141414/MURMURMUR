import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BoardView } from '@/components/board/BoardView'
import { ListView } from '@/components/board/ListView'
import { SummaryView } from '@/components/board/SummaryView'
import { CalendarView } from '@/components/board/CalendarView'
import { TimelineView } from '@/components/board/TimelineView'
import { CreateColumnModal } from '@/components/board/CreateColumnModal'
import { CreateTaskModal } from '@/components/board/CreateTaskModal'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { RenameColumnModal } from '@/components/board/RenameColumnModal'
import type { BoardTask } from '@/types'
import {
  useProject,
  useColumns,
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useProjectTasks,
  useCreateProjectTask,
  useUpdateProjectTask,
  useReorderColumns,
  useReorderTasks,
  useProjectStats,
} from '@/hooks/useBoard'
import { useUsers } from '@/hooks/useAdmin'
import { useTeams } from '@/hooks/useTeams'
import { queryKeys } from '@/lib/queryKeys'
import { nextCompletionStatus } from '@/components/board/taskStatus'

export default function ProjectDetailPage() {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const currentOrg = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)

  // Validate projectId looks like a UUID; redirect to selector if not
  const isValidProjectId = projectId && /^[0-9a-f-]{36}$|^[0-9a-f]{32}$/i.test(projectId)
  useEffect(() => {
    if (projectId && !isValidProjectId) {
      navigate('/department', { replace: true })
    }
  }, [projectId, isValidProjectId, navigate])

  const [archiveMode, setArchiveMode] = useState(false)
  const { data: project, isLoading: projectLoading } = useProject(orgId, isValidProjectId ? projectId : null)
  const safeProjectId = isValidProjectId ? projectId : null
  const { data: columns = [] } = useColumns(orgId, safeProjectId ?? null)
  const { data: tasks = [] } = useProjectTasks(
    orgId,
    safeProjectId ?? null,
    archiveMode ? 'archived' : 'active',
  )
  const { data: stats, isLoading: statsLoading } = useProjectStats(orgId, safeProjectId ?? null)
  const { data: users = [] } = useUsers(orgId)
  const { data: teams = [] } = useTeams(orgId)

  const createColumn = useCreateColumn(orgId ?? '', safeProjectId ?? '')
  const updateColumn = useUpdateColumn(orgId ?? '', safeProjectId ?? '')
  const deleteColumn = useDeleteColumn(orgId ?? '', safeProjectId ?? '')
  const createTask = useCreateProjectTask(orgId ?? '', safeProjectId ?? '')
  const updateTask = useUpdateProjectTask(orgId ?? '', safeProjectId ?? '')
  const reorderColumns = useReorderColumns(orgId ?? '', safeProjectId ?? '')
  const reorderTasks = useReorderTasks(orgId ?? '', safeProjectId ?? '')
  const queryClient = useQueryClient()

  const [showColumnModal, setShowColumnModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalColumnId, setTaskModalColumnId] = useState<string | undefined>()
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null)
  const renamingColumn = columns.find(c => c.id === renamingColumnId) ?? null
  const selectedTeamId = searchParams.get('team')
  const [taskScope, setTaskScope] = useState<'mine' | 'all'>(() => {
    const role = useOrgStore.getState().activeOrg()?.role
    return role && ['founder', 'ceo', 'admin', 'sysadmin', 'hr', 'project_manager', 'team_lead'].includes(role)
      ? 'all'
      : 'mine'
  })

  useEffect(() => {
    const role = currentOrg?.role
    if (!role) return
    if (!['founder', 'ceo', 'admin', 'sysadmin', 'hr', 'project_manager', 'team_lead'].includes(role)) {
      setTaskScope('mine')
    }
  }, [currentOrg?.role])

  const projectTeams = teams.filter((team) => team.project_id === safeProjectId)
  const scopedTeams = selectedTeamId ? projectTeams.filter((team) => team.id === selectedTeamId) : projectTeams
  const scopedUserIds = Array.from(new Set(scopedTeams.flatMap((team) => (team.members ?? []).map((member) => member.user_id))))
  const isManager = currentOrg?.role && ['founder', 'ceo', 'admin', 'sysadmin', 'hr', 'project_manager', 'team_lead'].includes(currentOrg.role)
  const departmentUsers = useMemo(() => {
    if (!isManager) {
      return users.filter((user) => scopedUserIds.includes(user.id))
    }
    if (selectedTeamId) {
      return users.filter((user) => scopedUserIds.includes(user.id))
    }
    return users
  }, [isManager, scopedUserIds, selectedTeamId, users])
  const scopedTasks = selectedTeamId ? tasks.filter((task) => task.team_id === selectedTeamId) : tasks
  const visibleTasks = currentUserId && taskScope === 'mine'
    ? scopedTasks.filter((task) => task.assignee_id === currentUserId)
    : scopedTasks
  const selectedTeam = selectedTeamId ? projectTeams.find((team) => team.id === selectedTeamId) ?? null : null

  const handleReorder = useCallback(
    (taskId: string, columnId: string, position: number) => {
      reorderTasks.mutate({ task_id: taskId, column_id: columnId, position })
    },
    [reorderTasks],
  )

  const handleAddTask = useCallback((columnId: string) => {
    console.log('[handleAddTask] columnId:', columnId, 'type:', typeof columnId)
    let resolvedColumnId: string | undefined
    if (columnId) {
      resolvedColumnId = columnId
    }
    console.log('[handleAddTask] resolvedColumnId:', resolvedColumnId)
    setTaskModalColumnId(resolvedColumnId)
    setShowTaskModal(true)
  }, [])

  const handleToggleDone = useCallback((task: BoardTask) => {
    if (!orgId || !safeProjectId) return
    const nextStatus = nextCompletionStatus(task, currentOrg?.role, false, currentUserId)
    const tasksKey = queryKeys.board.tasks(orgId, safeProjectId, archiveMode ? 'archived' : 'active')
    const prev = queryClient.getQueryData<BoardTask[]>(tasksKey)
    if (prev) {
      queryClient.setQueryData<BoardTask[]>(tasksKey, (current) =>
        current?.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)),
      )
    }
    if (selectedTask?.id === task.id) {
      setSelectedTask((current) => (current ? { ...current, status: nextStatus } : current))
    }
    updateTask.mutate(
      { taskId: task.id, status: nextStatus },
      {
        onError: (error: any) => {
          if (prev) queryClient.setQueryData(tasksKey, prev)
          const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
          toast.error(String(msg))
        },
      },
    )
  }, [archiveMode, currentOrg?.role, orgId, queryClient, safeProjectId, selectedTask?.id, t, updateTask])

  const handleAssignSelf = useCallback((task: BoardTask) => {
    if (!orgId || !safeProjectId || !currentUserId) return
    const tasksKey = queryKeys.board.tasks(orgId, safeProjectId, archiveMode ? 'archived' : 'active')
    const prev = queryClient.getQueryData<BoardTask[]>(tasksKey)
    if (prev) {
      queryClient.setQueryData<BoardTask[]>(tasksKey, (current) =>
        current?.map((item) => (item.id === task.id ? { ...item, assignee_id: currentUserId } : item)),
      )
    }
    if (selectedTask?.id === task.id) {
      setSelectedTask((current) => (current ? { ...current, assignee_id: currentUserId } : current))
    }
    updateTask.mutate(
      { taskId: task.id, assignee_id: currentUserId },
      {
        onError: (error: any) => {
          if (prev) queryClient.setQueryData(tasksKey, prev)
          const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
          toast.error(String(msg))
        },
      },
    )
  }, [archiveMode, currentUserId, orgId, queryClient, safeProjectId, selectedTask?.id, t, updateTask])

  const [activeTab, setActiveTab] = useState(
    location.pathname.endsWith('/tasks') ? 'list' : 'board',
  )

  if (!orgId || !projectId) {
    return (
      <div className="page-enter">
        <PageHeader title={t('board.project')} />
        <p className="text-sm text-muted-foreground">{t('admin.noOrg')}</p>
      </div>
    )
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-4">
      <PageHeader
        title={selectedTeam ? `${selectedTeam.name} · ${project?.name ?? t('board.project')}` : project?.name ?? t('board.project')}
        description={selectedTeam ? t('project.teamBoardDescription', { defaultValue: `Доска проекта команды "${selectedTeam.name}" внутри отдела.`, team: selectedTeam.name }) : project?.description || t('project.workspaceDescription', 'Планирование, исполнение, контроль и коммуникация в одном рабочем модуле.')}
        eyebrow={t('project.moduleEyebrow', 'Отдел')}
        breadcrumbs={[
          { label: t('shell.company'), to: '/company' },
          { label: t('nav.departments', 'Отделы'), to: '/department' },
          { label: project?.name ?? t('board.project'), to: safeProjectId ? `/department/${safeProjectId}` : undefined },
          ...(selectedTeam ? [{ label: selectedTeam.name }] : []),
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden items-center rounded-lg border border-border bg-card p-1 md:flex">
              <button
                onClick={() => setTaskScope('mine')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  taskScope === 'mine' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('board.myTasks', 'Мои задачи')}
              </button>
              <button
                onClick={() => setTaskScope('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  taskScope === 'all' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('board.allTasks', 'Все задачи')}
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(safeProjectId ? `/department/${safeProjectId}` : '/department')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.back')}
            </Button>
            <Button size="sm" disabled={archiveMode} onClick={() => {
              const plannedCol = columns.find((col) => col.name.toLowerCase() === 'запланировано')
              console.log('[Button] Columns:', columns.map(c => ({ id: c.id, name: c.name })))
              console.log('[Button] plannedCol:', plannedCol)
              setTaskModalColumnId(plannedCol?.id)
              setShowTaskModal(true)
            }}>
              <Plus className="h-4 w-4 mr-1" />
              {t('board.createTask')}
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">{t('board.summary')}</TabsTrigger>
          <TabsTrigger value="list">{t('board.list')}</TabsTrigger>
          <TabsTrigger value="board">{t('board.board')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('board.calendar')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('board.timeline')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummaryView stats={stats} isLoading={statsLoading} />
        </TabsContent>

        <TabsContent value="list">
          <ListView tasks={visibleTasks} users={departmentUsers} onTaskClick={setSelectedTask} onToggleDone={(task) => void handleToggleDone(task)} />
        </TabsContent>

        <TabsContent value="board">
          <BoardView
            columns={columns}
            tasks={visibleTasks}
            users={departmentUsers}
            currentUserId={currentUserId ?? undefined}
            onReorderTask={handleReorder}
            onReorderColumns={(columnIds) => {
              reorderColumns.mutate(columnIds, {
                onError: (error: any) => {
                  const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
                  toast.error(msg)
                },
              })
            }}
            onTaskClick={setSelectedTask}
            onToggleDone={(task) => void handleToggleDone(task)}
            onAssignSelf={(task) => void handleAssignSelf(task)}
            onAddTask={handleAddTask}
            onAddColumn={() => setShowColumnModal(true)}
            onRenameColumn={(column) => {
              setRenamingColumnId(column.id)
            }}
            deletingColumnId={deletingColumnId}
            onMoveColumn={(columnId, direction) => {
              const currentIdx = columns.findIndex(c => c.id === columnId)
              if (currentIdx < 0) return
              const newIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1
              if (newIdx < 0 || newIdx >= columns.length) return
              const newOrder = [...columns.map(c => c.id)]
              const [movedId] = newOrder.splice(currentIdx, 1)
              newOrder.splice(newIdx, 0, movedId)
              reorderColumns.mutate(newOrder, {
                onError: (error: any) => {
                  const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
                  toast.error(msg)
                },
              })
            }}
            archiveMode={archiveMode}
            onToggleArchiveMode={() => setArchiveMode((value) => !value)}
            onDeleteColumn={(column) => {
              const confirmed = window.confirm(
                t('board.deleteColumnConfirm', {
                  defaultValue: `Удалить колонку "${column.name}"?`,
                  name: column.name,
                }),
              )
              if (!confirmed) return
              setDeletingColumnId(column.id)
              deleteColumn.mutate(column.id, {
                onSuccess: () => {
                  setDeletingColumnId(null)
                  toast.success(t('board.columnDeleted', 'Колонка удалена'))
                },
              onError: (error: any) => {
                setDeletingColumnId(null)
                const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
                toast.error(String(msg))
              },
              })
            }}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView tasks={visibleTasks} onTaskClick={setSelectedTask} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView tasks={visibleTasks} onTaskClick={setSelectedTask} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateColumnModal
        open={showColumnModal}
        onOpenChange={setShowColumnModal}
        isLoading={createColumn.isPending}
        onSubmit={(data) => {
          createColumn.mutate(data, {
            onSuccess: () => {
              setShowColumnModal(false)
              toast.success(t('board.columnCreated', 'Колонка создана'))
            },
            onError: (error: any) => {
              const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
              toast.error(msg)
            },
          })
        }}
      />

      <CreateTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        isLoading={createTask.isPending}
        defaultColumnId={taskModalColumnId}
        users={departmentUsers}
       onSubmit={(data) => {
          createTask.mutate({ ...data, team_id: selectedTeamId ?? undefined }, {
            onSuccess: () => {
              setShowTaskModal(false)
              toast.success(t('board.taskCreated', 'Задача создана'))
            },
            onError: (error: any) => {
              const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
              toast.error(msg)
            },
          })
        }}
      />

      <RenameColumnModal
        open={!!renamingColumnId}
        onOpenChange={(open) => { if (!open) setRenamingColumnId(null) }}
        currentName={renamingColumn?.name ?? ''}
        isLoading={updateColumn.isPending}
        onSubmit={(newName) => {
          if (!renamingColumnId) return
          updateColumn.mutate(
            { columnId: renamingColumnId, name: newName },
            {
              onSuccess: () => {
                setRenamingColumnId(null)
                toast.success(t('board.columnRenamed', 'Колонка переименована'))
              },
              onError: (error: any) => {
                const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
                toast.error(msg)
              },
            },
          )
        }}
      />

      <TaskDetailModal
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null) }}
        task={selectedTask}
        orgId={orgId}
        projectId={projectId}
        users={departmentUsers}
      />
    </div>
  )
}
