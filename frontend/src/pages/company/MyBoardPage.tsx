import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Maximize2, Minimize2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { queryKeys } from '@/lib/queryKeys'
import { createProjectTask, updateProjectTask } from '@/api/board'
import { useMyBoardTasks, useColumns } from '@/hooks/useBoard'
import { useUsers } from '@/hooks/useAdmin'
import { useMyTeams } from '@/hooks/useTeams'
import { useProjects } from '@/hooks/useProjects'
import { buildDueDateValue } from '@/lib/dueDate'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormField } from '@/components/shared/FormField'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BoardView } from '@/components/board/BoardView'
import { ListView } from '@/components/board/ListView'
import { SummaryView } from '@/components/board/SummaryView'
import { CalendarView } from '@/components/board/CalendarView'
import { TimelineView } from '@/components/board/TimelineView'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { RenameColumnModal } from '@/components/board/RenameColumnModal'
import type { BoardTask, ProjectStats, TaskColumn } from '@/types'
import { isTaskDone, nextCompletionStatus } from '@/components/board/taskStatus'

const PERSONAL_COLUMNS: TaskColumn[] = [
  {
    id: 'planned',
    org_id: '',
    project_id: '',
    name: 'Запланировано',
    position: 0,
    created_at: '',
  },
  {
    id: 'todo',
    org_id: '',
    project_id: '',
    name: 'К выполнению',
    position: 1,
    created_at: '',
  },
  {
    id: 'in_progress',
    org_id: '',
    project_id: '',
    name: 'В работе',
    position: 2,
    created_at: '',
  },
  {
    id: 'pending_review',
    org_id: '',
    project_id: '',
    name: 'На подтверждении',
    position: 3,
    created_at: '',
  },
  {
    id: 'done',
    org_id: '',
    project_id: '',
    name: 'Готово',
    position: 4,
    created_at: '',
  },
]

const STATUS_TO_COLUMN: Record<string, string> = {
  planned: 'planned',
  todo: 'todo',
  draft: 'todo',
  open: 'todo',
  in_progress: 'in_progress',
  inprogress: 'in_progress',
  doing: 'in_progress',
  pending_review: 'pending_review',
  done: 'done',
  completed: 'done',
}

const COLUMN_TO_STATUS: Record<string, string> = {
  planned: 'planned',
  todo: 'todo',
  in_progress: 'in_progress',
  pending_review: 'pending_review',
  done: 'done',
}
const PERSONAL_PROJECT_OPTION = '__personal__'

export default function MyBoardPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const currentUserId = useAuthStore((s) => s.userId)
  const [archiveMode, setArchiveMode] = useState(false)
  const { data: tasks = [], isLoading } = useMyBoardTasks(orgId, archiveMode ? 'archived' : 'active')
  const { data: users = [] } = useUsers(orgId)
  const { data: myTeams = [] } = useMyTeams(orgId)
  const { data: projects = [] } = useProjects(orgId)
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)
  const [activeTab, setActiveTab] = useState('board')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateColumn, setShowCreateColumn] = useState(false)
  const [createColumnId, setCreateColumnId] = useState<string>('planned')
  const [creatingTask, setCreatingTask] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState(() => {
    const stored = localStorage.getItem('user-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.default_task_priority || ''
      } catch {}
    }
    return ''
  })
  const [newDueDate, setNewDueDate] = useState(() => {
    const stored = localStorage.getItem('user-settings')
    let hoursToAdd = 24
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        hoursToAdd = parsed.default_deadline_hours || 24
      } catch {}
    }
    const target = new Date()
    target.setTime(target.getTime() + hoursToAdd * 60 * 60 * 1000)
    target.setMinutes(0, 0, 0)
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
  })
  const [newDueTime, setNewDueTime] = useState(() => {
    const stored = localStorage.getItem('user-settings')
    let hoursToAdd = 24
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        hoursToAdd = parsed.default_deadline_hours || 24
      } catch {}
    }
    const target = new Date()
    target.setTime(target.getTime() + hoursToAdd * 60 * 60 * 1000)
    target.setMinutes(0, 0, 0)
    return `${String(target.getHours()).padStart(2, '0')}:00`
  })
  const [showDescriptionEditor, setShowDescriptionEditor] = useState(false)
  const [descriptionEditorFullscreen, setDescriptionEditorFullscreen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
  const [customColumns, setCustomColumns] = useState<TaskColumn[]>([])
  const [customPlacements, setCustomPlacements] = useState<Record<string, string>>({})
  const [localTasks, setLocalTasks] = useState<BoardTask[]>([])
  const [renamingColumn, setRenamingColumn] = useState<TaskColumn | null>(null)

  const taskDescriptionDraftKey = useMemo(() => {
    if (!orgId || !currentUserId) return ''
    return `my-board-task-description-draft:${orgId}:${currentUserId}`
  }, [currentUserId, orgId])

  const boardColumns = useMemo(
    () => [...PERSONAL_COLUMNS, ...customColumns],
    [customColumns],
  )

  const customColumnIds = useMemo(
    () => new Set(customColumns.map((column) => column.id)),
    [customColumns],
  )

  useEffect(() => {
    if (!orgId || !currentUserId) return
    try {
      const storedColumns = localStorage.getItem(`my-board-columns:${orgId}:${currentUserId}`)
      const storedPlacements = localStorage.getItem(`my-board-placements:${orgId}:${currentUserId}`)
      setCustomColumns(storedColumns ? JSON.parse(storedColumns) : [])
      setCustomPlacements(storedPlacements ? JSON.parse(storedPlacements) : {})
    } catch {
      setCustomColumns([])
      setCustomPlacements({})
    }
  }, [currentUserId, orgId])

  useEffect(() => {
    if (!orgId || !currentUserId) return
    localStorage.setItem(`my-board-columns:${orgId}:${currentUserId}`, JSON.stringify(customColumns))
  }, [currentUserId, customColumns, orgId])

  useEffect(() => {
    if (!orgId || !currentUserId) return
    localStorage.setItem(`my-board-placements:${orgId}:${currentUserId}`, JSON.stringify(customPlacements))
  }, [currentUserId, customPlacements, orgId])

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const normalizedTasks = useMemo(
    () =>
      localTasks.map((task) => ({
        ...task,
        column_id:
          (customPlacements[task.id] && boardColumns.some((column) => column.id === customPlacements[task.id])
            ? customPlacements[task.id]
            : null) || STATUS_TO_COLUMN[task.status] || 'todo',
      })),
    [boardColumns, customPlacements, localTasks],
  )

  const handleToggleDone = useCallback(async (task: BoardTask) => {
    if (!orgId || !task.project_id) return
    const nextStatus = nextCompletionStatus(task, org?.role, false, currentUserId)
    setCustomPlacements((current) => {
      if (!(task.id in current)) return current
      const next = { ...current }
      delete next[task.id]
      return next
    })
    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)),
    )
    if (selectedTask?.id === task.id) {
      setSelectedTask((current) => (current ? { ...current, status: nextStatus } : current))
    }
    try {
      const updatedTask = (await updateProjectTask(orgId, task.project_id, task.id, { status: nextStatus })).data
      setLocalTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...updatedTask } : item)))
      if (selectedTask?.id === task.id) setSelectedTask(updatedTask)
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, task.project_id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.stats(orgId, task.project_id) })
      toast.success(
        isTaskDone(updatedTask.status)
          ? t('board.taskMovedToDone', 'Задача перенесена в колонку "Готово"')
          : updatedTask.status === 'pending_review'
            ? t('board.taskSentToReview', 'Задача отправлена руководителю на подтверждение')
            : t('board.taskReturnedToTodo', 'Задача возвращена в колонку "К выполнению"'),
      )
    } catch (error: any) {
      setLocalTasks(tasks)
      const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
      toast.error(msg)
    }
  }, [org?.role, orgId, queryClient, selectedTask?.id, t, tasks])

  const stats = useMemo<ProjectStats>(() => {
    const by_status: Record<string, number> = {}
    const by_priority: Record<string, number> = {}
    let overdue = 0
    let total_story_points = 0

    for (const task of localTasks) {
      by_status[task.status] = (by_status[task.status] ?? 0) + 1
      if (task.priority) {
        by_priority[task.priority] = (by_priority[task.priority] ?? 0) + 1
      }
      if (typeof task.story_points === 'number') {
        total_story_points += task.story_points
      }
      if (task.due_date && !isTaskDone(task.status)) {
        const due = new Date(task.due_date)
        if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
          overdue += 1
        }
      }
    }

    return {
      total_tasks: localTasks.length,
      by_status,
      by_priority,
      overdue,
      total_story_points,
    }
  }, [localTasks])

  const teamOptions = useMemo(
    () =>
      myTeams
        .filter((team) => !!team.project_id)
        .map((team) => ({
          teamId: team.id,
          projectId: team.project_id!,
          name: team.name,
        })),
    [myTeams],
  )

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        projectId: project.id,
        name: project.name,
      })),
    [projects],
  )
  const fallbackProjectId = useMemo(
    () => teamOptions[0]?.projectId ?? projectOptions[0]?.projectId ?? '',
    [projectOptions, teamOptions],
  )

  const isManager = org?.role && ['founder', 'ceo', 'admin', 'sysadmin', 'hr', 'project_manager', 'team_lead'].includes(org.role)

  useEffect(() => {
    if (selectedProjectId || projectOptions.length === 0) return
    if (teamOptions.length > 0) {
      setSelectedProjectId(teamOptions[0].projectId)
      return
    }
    setSelectedProjectId(PERSONAL_PROJECT_OPTION)
  }, [projectOptions, selectedProjectId, teamOptions])

  const effectiveProjectId = selectedProjectId === PERSONAL_PROJECT_OPTION
    ? fallbackProjectId
    : selectedProjectId

  const { data: projectColumns = [], isLoading: columnsLoading } = useColumns(orgId, effectiveProjectId || null)

  const availableTeams = useMemo(
    () => teamOptions.filter((team) => team.projectId === effectiveProjectId),
    [effectiveProjectId, teamOptions],
  )

  useEffect(() => {
    if (!selectedTeamId) return
    const isTeamAvailable = availableTeams.some((team) => team.teamId === selectedTeamId)
    if (!isTeamAvailable) {
      setSelectedTeamId('')
    }
  }, [availableTeams, selectedTeamId])

  useEffect(() => {
    if (!showCreateTask || !taskDescriptionDraftKey || newDescription.trim()) return
    const savedDraft = localStorage.getItem(taskDescriptionDraftKey)
    if (savedDraft) {
      setNewDescription(savedDraft)
    }
  }, [newDescription, showCreateTask, taskDescriptionDraftKey])

  useEffect(() => {
    if (!showCreateTask || !taskDescriptionDraftKey) return
    if (newDescription.trim()) {
      localStorage.setItem(taskDescriptionDraftKey, newDescription)
      return
    }
    localStorage.removeItem(taskDescriptionDraftKey)
  }, [newDescription, showCreateTask, taskDescriptionDraftKey])

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeamId) return []
    const team = myTeams.find((t) => t.id === selectedTeamId)
    return team?.members?.map((m) => m.user_id) ?? []
  }, [myTeams, selectedTeamId])

  const availableAssignees = useMemo(() => {
    if (!isManager) {
      return users.filter((user) => user.id === currentUserId)
    }
    if (selectedTeamId) {
      return users.filter((user) => selectedTeamMembers.includes(user.id))
    }
    return users
  }, [currentUserId, isManager, selectedTeamMembers, selectedTeamId, users])

  const handleReorderTask = useCallback(
    async (taskId: string, columnId: string) => {
      if (!orgId) return
      const task = localTasks.find((item) => item.id === taskId)
      const nextStatus = COLUMN_TO_STATUS[columnId]
      if (!task || !task.project_id) return

      if (customColumnIds.has(columnId)) {
        setCustomPlacements((current) => ({ ...current, [taskId]: columnId }))
        return
      }

      setCustomPlacements((current) => {
        if (!(taskId in current)) return current
        const next = { ...current }
        delete next[taskId]
        return next
      })

      if (!nextStatus || task.status === nextStatus) return

      setLocalTasks((current) =>
        current.map((item) => (item.id === taskId ? { ...item, status: nextStatus } : item)),
      )
      if (selectedTask?.id === taskId) {
        setSelectedTask((current) => (current ? { ...current, status: nextStatus } : current))
      }

      try {
        const updatedTask = (await updateProjectTask(orgId, task.project_id, task.id, { status: nextStatus })).data
      setLocalTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...updatedTask } : item)))
      if (selectedTask?.id === task.id) setSelectedTask(updatedTask)
        await queryClient.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId) })
        await queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, task.project_id) })
      } catch (error: any) {
        setLocalTasks(tasks)
        const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
        toast.error(msg)
      }
    },
    [customColumnIds, localTasks, orgId, queryClient, selectedTask?.id, t, tasks],
  )

  const handleOpenCreateTask = useCallback((columnId: string = 'todo') => {
    if (archiveMode) return
    if (projectOptions.length === 0) {
      toast.error(t('board.noAvailableProjects', 'У вас пока нет доступных проектов для создания личной задачи'))
      return
    }
    setCreateColumnId(columnId)
    setShowCreateTask(true)
  }, [archiveMode, projectOptions.length, t])

  const handleCreateTask = useCallback(async () => {
    if (!orgId || !currentUserId || !newTitle.trim() || !effectiveProjectId) return
    const selectedTeam = teamOptions.find(
      (team) => team.teamId === selectedTeamId && team.projectId === effectiveProjectId,
    )

    setCreatingTask(true)
    try {
      const assigneeIdToUse = selectedAssigneeId || (isManager ? undefined : currentUserId)
      const targetColumnId = projectColumns.find((col) => col.name.toLowerCase() === 'запланировано')?.id
      const created = (
        await createProjectTask(orgId, effectiveProjectId, {
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          due_date: buildDueDateValue(newDueDate, newDueTime),
          assignee_id: assigneeIdToUse,
          team_id: selectedTeam?.teamId,
          priority: newPriority || undefined,
          is_personal: !isManager && !selectedAssigneeId,
          column_id: targetColumnId,
        })
      ).data

      const desiredStatus = COLUMN_TO_STATUS[createColumnId]
      if (desiredStatus && desiredStatus !== 'todo' && !targetColumnId) {
        await updateProjectTask(orgId, effectiveProjectId, created.id, { status: desiredStatus })
      } else if (customColumnIds.has(createColumnId)) {
        setCustomPlacements((current) => ({ ...current, [created.id]: createColumnId }))
      }

      setShowCreateTask(false)
      setShowDescriptionEditor(false)
      setDescriptionEditorFullscreen(false)
      setNewTitle('')
      setNewDescription('')
      setNewPriority('')
      setSelectedTeamId('')
      setSelectedAssigneeId('')
      setCreateColumnId('todo')
      if (taskDescriptionDraftKey) {
        localStorage.removeItem(taskDescriptionDraftKey)
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.board.myTasks(orgId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(orgId, effectiveProjectId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.board.stats(orgId, effectiveProjectId) })
      toast.success(t('board.taskCreated', 'Задача создана'))
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || t('common.error', 'Ошибка')
      toast.error(msg)
    } finally {
      setCreatingTask(false)
    }
  }, [
    createColumnId,
    customColumnIds,
    currentUserId,
    isManager,
    newDescription,
    newDueDate,
    newDueTime,
    newPriority,
    newTitle,
    orgId,
    projectColumns,
    queryClient,
    effectiveProjectId,
    selectedAssigneeId,
    selectedTeamId,
    t,
    taskDescriptionDraftKey,
    teamOptions,
  ])

  const handleCreateColumn = useCallback(() => {
    const name = newColumnName.trim()
    if (!name) {
      toast.error(t('board.columnNameRequired', 'Введите название колонки'))
      return
    }

    const id = `personal_${Date.now()}`
    setCustomColumns((current) => [
      ...current,
      {
        id,
        org_id: orgId ?? '',
        project_id: 'personal',
        name,
        position: PERSONAL_COLUMNS.length + current.length,
        created_at: new Date().toISOString(),
      },
    ])
    setNewColumnName('')
    setShowCreateColumn(false)
    toast.success(t('board.columnCreated', 'Колонка создана'))
  }, [newColumnName, orgId, t])

  const handleDeleteColumn = useCallback((column: TaskColumn) => {
    if (!customColumnIds.has(column.id)) return
    const confirmed = window.confirm(
      t('board.deleteColumnConfirm', {
        defaultValue: `Удалить колонку "${column.name}"?`,
        name: column.name,
      }),
    )
    if (!confirmed) return

    setCustomColumns((current) => current.filter((item) => item.id !== column.id))
    setCustomPlacements((current) => {
      const next = { ...current }
      for (const [taskId, placement] of Object.entries(next)) {
        if (placement === column.id) {
          delete next[taskId]
        }
      }
      return next
    })
    toast.success(t('board.columnDeleted', 'Колонка удалена'))
  }, [customColumnIds, t])

  const handleRenameColumn = useCallback((column: TaskColumn) => {
    if (!customColumnIds.has(column.id)) return
    setRenamingColumn(column)
  }, [customColumnIds])

  const handleTaskUpdated = useCallback((updatedTask: BoardTask) => {
    setCustomPlacements((current) => {
      if (!(updatedTask.id in current)) return current
      const next = { ...current }
      delete next[updatedTask.id]
      return next
    })
    setLocalTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
    )
    setSelectedTask(updatedTask)
  }, [])

  if (!orgId) {
    return (
      <EmptyState
        icon={() => null}
        title="Личный кабинет"
        description="Выберите компанию, чтобы увидеть свои задачи."
      />
    )
  }

  return (
    <div className="page-enter space-y-4">
      <PageHeader
        title={t('cabinet.memberTitle', 'Личный кабинет')}
        description="Персональная Trello-доска с задачами, назначенными именно вам."
        eyebrow="Личная доска"
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('cabinet.memberTitle', 'Личный кабинет') },
        ]}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {localTasks.length} задач
          </span>
        }
        actions={
          <Button onClick={() => handleOpenCreateTask('planned')} disabled={archiveMode}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('board.createTask', 'Создать задачу')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : localTasks.length === 0 ? (
        <EmptyState
          icon={() => null}
          title={archiveMode ? 'Ваш архив пуст' : 'У вас пока нет задач'}
          description={
            archiveMode
              ? 'Архивированные задачи появятся здесь, когда вы перенесёте их в архив.'
              : 'Когда вам назначат задачи, они появятся на вашей персональной доске.'
          }
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary">{t('board.summary')}</TabsTrigger>
            <TabsTrigger value="list">{t('board.list')}</TabsTrigger>
            <TabsTrigger value="board">{t('board.board')}</TabsTrigger>
            <TabsTrigger value="calendar">{t('board.calendar')}</TabsTrigger>
            <TabsTrigger value="timeline">{t('board.timeline')}</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <SummaryView stats={stats} isLoading={false} />
          </TabsContent>

          <TabsContent value="list">
            <ListView tasks={localTasks} users={users} onTaskClick={setSelectedTask} onToggleDone={(task) => void handleToggleDone(task)} />
          </TabsContent>

          <TabsContent value="board">
            <BoardView
              columns={boardColumns}
              tasks={normalizedTasks}
              users={users}
              onReorderTask={(taskId, columnId) => {
                void handleReorderTask(taskId, columnId)
              }}
              onTaskClick={setSelectedTask}
              onToggleDone={(task) => void handleToggleDone(task)}
              onAddTask={(columnId) => handleOpenCreateTask(columnId)}
              onAddColumn={() => setShowCreateColumn(true)}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              archiveMode={archiveMode}
              onToggleArchiveMode={() => setArchiveMode((value) => !value)}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarView tasks={localTasks} onTaskClick={setSelectedTask} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineView tasks={localTasks} onTaskClick={setSelectedTask} />
          </TabsContent>
        </Tabs>
      )}

      <RenameColumnModal
        open={!!renamingColumn}
        onOpenChange={(open) => { if (!open) setRenamingColumn(null) }}
        currentName={renamingColumn?.name ?? ''}
        onSubmit={(newName) => {
          if (!renamingColumn) return
          setCustomColumns((current) =>
            current.map((item) => (item.id === renamingColumn.id ? { ...item, name: newName } : item)),
          )
          setRenamingColumn(null)
          toast.success(t('board.columnRenamed', 'Колонка переименована'))
        }}
      />

      <TaskDetailModal
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null)
        }}
        task={selectedTask}
        orgId={orgId}
        projectId={selectedTask?.project_id ?? ''}
        users={users}
        onTaskUpdated={handleTaskUpdated}
      />



<Dialog open={showCreateTask} onOpenChange={(nextOpen) => {
  setShowCreateTask(nextOpen)
  if (!nextOpen) {
    setShowDescriptionEditor(false)
    setDescriptionEditorFullscreen(false)
  }
}}>
  <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col">
    <DialogHeader className="border-b border-border/60 px-6 pb-3 pt-6">
      <DialogTitle>{t('board.createTask', 'Создать задачу')}</DialogTitle>
      <DialogDescription>
        {isManager
          ? 'Задача будет создана в выбранном проекте. Выберите исполнителя или оставьте пустым.'
          : 'Задача будет создана в выбранном отделе и сразу назначена на вас.'}
      </DialogDescription>
    </DialogHeader>

    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="space-y-4">
        <FormField
          label={t('board.title', 'Название')}
          required
          error={!newTitle.trim() ? t('projects.nameRequired', 'Название обязательно') : undefined}
        >
          <Input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder={t('board.taskTitlePlaceholder', 'Название задачи')}
          />
        </FormField>

        <FormField
          label="Отдел"
          required
          hint="Выберите отдел, где должна появиться задача. Для личной задачи без проекта выберите «Личное»."
        >
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
          >
            <option value={PERSONAL_PROJECT_OPTION}>Личное</option>
            {projectOptions.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Проект"
          hint="Можно не выбирать — задача останется личной без привязки к проекту"
        >
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
          >
            <option value="">{t('common.notSpecified', 'Не выбрано')}</option>
            {availableTeams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.name}
              </option>
            ))}
          </select>
        </FormField>

        {isManager && (
          <FormField
            label="Исполнитель"
            hint="Выберите исполнителя для задачи"
          >
            <select
              value={selectedAssigneeId}
              onChange={(event) => setSelectedAssigneeId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="">{t('common.notSpecified', 'Не выбрано')}</option>
              {availableAssignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label={t('board.description', 'Описание')}>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowDescriptionEditor(true)}
            >
              {newDescription.trim()
                ? 'Редактировать описание'
                : 'Добавить описание'}
            </Button>
            {newDescription.trim() ? (
              <p className="line-clamp-3 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {newDescription}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Описание откроется в отдельной большой карточке, где удобно печатать и скроллить.
              </p>
            )}
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('board.priority', 'Приоритет')}>
            <select
              value={newPriority}
              onChange={(event) => setNewPriority(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            >
              <option value="">{t('board.priorityNone', 'Без приоритета')}</option>
              <option value="low">{t('board.priorityLow', 'Низкий')}</option>
              <option value="medium">{t('board.priorityMedium', 'Средний')}</option>
              <option value="high">{t('board.priorityHigh', 'Высокий')}</option>
              <option value="critical">{t('board.priorityCritical', 'Критический')}</option>
            </select>
          </FormField>

          <FormField label={t('board.dueDate', 'Срок')}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} />
              <Input type="time" value={newDueTime} onChange={(event) => setNewDueTime(event.target.value)} />
            </div>
          </FormField>
        </div>
      </div>
    </div>

    <DialogFooter className="border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button variant="outline" onClick={() => setShowCreateTask(false)} disabled={creatingTask}>
        {t('common.cancel', 'Отмена')}
      </Button>
      <Button onClick={() => void handleCreateTask()} disabled={creatingTask || !newTitle.trim() || !effectiveProjectId}>
        {creatingTask ? t('common.saving', 'Сохранение...') : t('common.create', 'Создать')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog open={showDescriptionEditor} onOpenChange={(nextOpen) => {
  setShowDescriptionEditor(nextOpen)
  if (!nextOpen) {
    setDescriptionEditorFullscreen(false)
  }
}}>
  <DialogContent
    className={descriptionEditorFullscreen
      ? 'h-screen w-screen max-w-none rounded-none border-0 p-0 flex flex-col'
      : 'w-[min(96vw,1200px)] max-w-6xl h-[85vh] p-0 flex flex-col'}
  >
    <DialogHeader className="border-b border-border/60 px-6 pb-3 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <DialogTitle>{t('board.description', 'Описание')}</DialogTitle>
          <DialogDescription>Пишите подробное описание задачи в большом поле. Скролл работает внутри этой карточки.</DialogDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDescriptionEditorFullscreen((value) => !value)}
          aria-label={descriptionEditorFullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран'}
        >
          {descriptionEditorFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </DialogHeader>
    <div className="flex-1 min-h-0 p-6">
      <Textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} className="h-full min-h-[420px] resize-none" placeholder="Опишите задачу подробно..." />
    </div>
    <DialogFooter className="border-t border-border/60 px-6 py-4">
      <p className="mr-auto text-xs text-muted-foreground">Черновик описания сохраняется автоматически.</p>
      <Button type="button" onClick={() => setShowDescriptionEditor(false)}>{t('common.done', 'Готово')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog open={showCreateColumn} onOpenChange={setShowCreateColumn}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('board.addColumn', 'Добавить колонку')}</DialogTitle>
            <DialogDescription>
              {t('board.personalColumnDescription', 'Новая колонка появится только в вашей личной доске и не затронет доски отдела и проекта.')}
            </DialogDescription>
          </DialogHeader>

          <FormField label={t('board.columnName', 'Название колонки')} required>
            <Input
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
              placeholder={t('board.columnNamePlaceholder', 'Например: На согласовании')}
            />
          </FormField>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateColumn(false)}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button onClick={handleCreateColumn} disabled={!newColumnName.trim()}>
              {t('common.create', 'Создать')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
