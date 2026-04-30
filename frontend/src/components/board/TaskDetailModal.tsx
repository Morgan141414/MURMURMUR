import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertCircle, Archive, ArrowRight, Calendar, CheckSquare, Clock3, MessageSquare, Paperclip, Play, Plus, Save, Send, Square, Trash2, Upload, User as UserIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BoardTask, Team, User } from '@/types'
import {
  useAttachments,
  useChecklist,
  useComments,
  useCreateChecklistItem,
  useCreateComment,
  useDeleteAttachment,
  useDeleteChecklistItem,
  useToggleChecklistItem,
  useUpdateProjectTask,
  useUploadAttachment,
} from '@/hooks/useBoard'
import { useTeams } from '@/hooks/useTeams'
import { FormField } from '@/components/shared/FormField'
import { EntityActivityFeed } from '@/components/shared/EntityActivityFeed'
import { UserMultiSelect } from '@/components/shared/UserMultiSelect'
import { MoveTaskToTeamModal } from '@/components/board/MoveTaskToTeamModal'
import { cn } from '@/lib/utils'
import { buildDueDateValue, formatDueDate, splitDueDate } from '@/lib/dueDate'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import {
  canConfirmTaskCompletion,
  formatTaskDuration,
  formatTaskStatusLabel,
  getTaskActionLabel,
  isTaskDone,
  isTaskInProgress,
  isTaskPendingReview,
} from '@/components/board/taskStatus'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: BoardTask | null
  orgId: string
  projectId: string
  users?: User[]
  onTaskUpdated?: (task: BoardTask) => void
}

export function TaskDetailModal({ open, onOpenChange, task, orgId, projectId, users = [], onTaskUpdated }: Props) {
  const { data: teams = [] } = useTeams(orgId)

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            Управляйте исполнением, подтверждением, комментариями, чек-листом и журналом задачи в одном окне.
          </DialogDescription>
        </DialogHeader>

        <TaskDetailContent
          key={task.id}
          task={task}
          orgId={orgId}
          projectId={projectId}
          users={users}
          teams={teams}
          onTaskUpdated={onTaskUpdated}
        />
      </DialogContent>
    </Dialog>
  )
}

function TaskDetailContent({
  task,
  orgId,
  projectId,
  users,
  teams,
  onTaskUpdated,
}: {
  task: BoardTask
  orgId: string
  projectId: string
  users: User[]
  teams: Team[]
  onTaskUpdated?: (task: BoardTask) => void
}) {
  const { t } = useTranslation()
  const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024
  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalDue = useMemo(() => splitDueDate(task.due_date), [task.due_date])
  const currentUserId = useAuthStore((s) => s.userId)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const activeRole = useOrgStore((s) => s.activeOrgRole())

  const taskAssigneeIds = useMemo(() => (
    task.assignee_ids?.length ? task.assignee_ids : task.assignee_id ? [task.assignee_id] : []
  ), [task.assignee_id, task.assignee_ids])
  const isCurrentUserAssignee = !!currentUserId && taskAssigneeIds.includes(currentUserId)
  const canApproveTask = canConfirmTaskCompletion(activeRole, isSuperAdmin, task, currentUserId)
  const canManageApprovers = isSuperAdmin || activeRole === 'founder' || activeRole === 'ceo'

  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description ?? '')
  const [editPriority, setEditPriority] = useState(task.priority ?? '')
  const [editDueDate, setEditDueDate] = useState(originalDue.date)
  const [editDueTime, setEditDueTime] = useState(originalDue.time)
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>(task.assignee_ids?.length ? task.assignee_ids : task.assignee_id ? [task.assignee_id] : [])
  const [editApprovalUserIds, setEditApprovalUserIds] = useState<string[]>(task.approval_user_ids ?? [])
  const [editStatus, setEditStatus] = useState(task.status ?? 'planned')
  const [workStartedAt, setWorkStartedAt] = useState(task.work_started_at ?? null)
  const [workFinishedAt, setWorkFinishedAt] = useState(task.work_finished_at ?? null)
  const [approvedAt, setApprovedAt] = useState(task.approved_at ?? null)
  const [approvedById, setApprovedById] = useState(task.approved_by_id ?? null)
  const [timerNow, setTimerNow] = useState(Date.now())
  const [showMoveToTeam, setShowMoveToTeam] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [quickComment, setQuickComment] = useState('')
  const [newItemText, setNewItemText] = useState('')

  const updateTask = useUpdateProjectTask(orgId, projectId)
  const { data: comments = [] } = useComments(orgId, task.id)
  const createComment = useCreateComment(orgId, task.id)
  const { data: checklist = [] } = useChecklist(orgId, task.id)
  const toggleItem = useToggleChecklistItem(orgId, task.id)
  const addItem = useCreateChecklistItem(orgId, task.id)
  const deleteItem = useDeleteChecklistItem(orgId, task.id)
  const { data: attachments = [] } = useAttachments(orgId, task.id)
  const uploadAtt = useUploadAttachment(orgId, task.id)
  const deleteAtt = useDeleteAttachment(orgId, task.id)

  useEffect(() => {
    if (!workStartedAt || !isTaskInProgress(editStatus)) return undefined
    const timerId = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [editStatus, workStartedAt])

  const hasUnsavedChanges = useMemo(() => {
    const initialAssigneeIds = task.assignee_ids?.length ? task.assignee_ids : task.assignee_id ? [task.assignee_id] : []
    const initialApproverIds = task.approval_user_ids ?? []
    return (
      editTitle !== task.title
      || editDesc !== (task.description ?? '')
      || editPriority !== (task.priority ?? '')
      || editDueDate !== originalDue.date
      || editDueTime !== originalDue.time
      || editAssigneeIds.join('|') !== initialAssigneeIds.join('|')
      || editApprovalUserIds.join('|') !== initialApproverIds.join('|')
      || editStatus !== task.status
    )
  }, [editApprovalUserIds, editAssigneeIds, editDesc, editDueDate, editDueTime, editPriority, editStatus, editTitle, originalDue.date, originalDue.time, task.approval_user_ids, task.assignee_id, task.assignee_ids, task.description, task.priority, task.status, task.title])

  const isOverdue = !!task.due_date && new Date(task.due_date).getTime() < Date.now() && !isTaskDone(editStatus)
  const workflowDuration = formatTaskDuration(workStartedAt, workFinishedAt, timerNow)
  const approverNames = (editApprovalUserIds.length ? editApprovalUserIds : task.approval_user_ids ?? [])
    .map((userId) => users.find((user) => user.id === userId)?.full_name || users.find((user) => user.id === userId)?.email || userId.slice(0, 8))
    .join(', ') || t('board.defaultApproverFallback', 'Руководитель отдела или автор-руководитель')
  const assigneeSummary = editAssigneeIds.length
    ? editAssigneeIds
        .map((id) => users.find((user) => user.id === id)?.full_name || users.find((user) => user.id === id)?.email || id.slice(0, 8))
        .join(', ')
    : t('board.unassignedLabel', 'Не назначен')
  const approvedByName = approvedById
    ? users.find((user) => user.id === approvedById)?.full_name || users.find((user) => user.id === approvedById)?.email || approvedById.slice(0, 8)
    : task.approved_by?.full_name || task.approved_by?.first_name || '—'

  function applyUpdatedTask(updatedTask: BoardTask) {
    setEditStatus(updatedTask.status ?? 'planned')
    setWorkStartedAt(updatedTask.work_started_at ?? null)
    setWorkFinishedAt(updatedTask.work_finished_at ?? null)
    setApprovedAt(updatedTask.approved_at ?? null)
    setApprovedById(updatedTask.approved_by_id ?? null)
    setEditApprovalUserIds(updatedTask.approval_user_ids ?? [])
    setEditAssigneeIds(updatedTask.assignee_ids?.length ? updatedTask.assignee_ids : updatedTask.assignee_id ? [updatedTask.assignee_id] : [])
    onTaskUpdated?.(updatedTask)
  }

  async function handleWorkflowUpdate(nextStatus: string, successMessage: string) {
    const updatedTask = await updateTask.mutateAsync({ taskId: task.id, status: nextStatus })
    applyUpdatedTask(updatedTask)
    toast.success(successMessage)
  }

  async function handleWorkflowPrimaryAction() {
    if (isTaskDone(editStatus)) {
      await handleWorkflowUpdate('todo', t('board.taskReturnedToTodo', 'Задача возвращена в работу'))
      return
    }
    if (isTaskPendingReview(editStatus)) {
      if (canApproveTask) {
        await handleWorkflowUpdate('done', t('board.taskApproved', 'Задача подтверждена руководителем'))
      } else {
        await handleWorkflowUpdate('in_progress', t('board.taskReturnedToInProgress', 'Задача возвращена в работу'))
      }
      return
    }
    if (isTaskInProgress(editStatus)) {
      await handleWorkflowUpdate('pending_review', t('board.taskSentToReview', 'Задача отправлена на подтверждение'))
      return
    }
    await handleWorkflowUpdate('in_progress', t('board.taskStarted', 'Работа по задаче началась'))
  }

  function handleSave() {
    const payload: Parameters<typeof updateTask.mutate>[0] = {
      taskId: task.id,
      priority: editPriority || undefined,
      assignee_ids: editAssigneeIds,
      status: editStatus || undefined,
    }

    payload.title = editTitle
    payload.description = editDesc || undefined
    payload.due_date = buildDueDateValue(editDueDate, editDueTime)
    if (canManageApprovers) {
      payload.approval_user_ids = editApprovalUserIds
    }

    updateTask.mutate(payload, {
      onSuccess: (updatedTask) => {
        applyUpdatedTask(updatedTask)
        toast.success(t('common.saveChanges', 'Изменения сохранены'))
      },
    })
  }

  function handleArchive() {
    updateTask.mutate(
      { taskId: task.id, status: 'archived', column_id: undefined },
      { onSuccess: (updatedTask) => { applyUpdatedTask(updatedTask); toast.success(t('board.taskArchived', 'Задача перенесена в архив')) } },
    )
  }

  function handleRestore() {
    updateTask.mutate(
      { taskId: task.id, status: 'todo' },
      { onSuccess: (updatedTask) => { applyUpdatedTask(updatedTask); toast.success(t('board.taskRestored', 'Задача восстановлена из архива')) } },
    )
  }

  function handleAddComment() {
    const text = commentText.trim()
    if (!text) return
    createComment.mutate(text, { onSuccess: () => setCommentText('') })
  }

  function handleQuickComment() {
    const text = quickComment.trim()
    if (!text) return
    createComment.mutate(text, { onSuccess: () => setQuickComment('') })
  }

  function handleAddChecklistItem() {
    if (!newItemText.trim()) return
    addItem.mutate(newItemText.trim(), { onSuccess: () => setNewItemText('') })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    files.forEach((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(t('board.attachmentTooLarge', 'Файл слишком большой. Максимум 100 MB'))
        return
      }
      uploadAtt.mutate(file)
    })
    e.target.value = ''
  }

  const sortedUsers = [...users].sort((left, right) => (left.full_name || left.email).localeCompare(right.full_name || right.email))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
        <MetaPill icon={AlertCircle} label={t('board.status', 'Статус')} value={formatTaskStatusLabel(t, editStatus)} />
        <MetaPill icon={Calendar} label={t('board.dueDate', 'Срок')} value={task.due_date ? formatDueDate(task.due_date) : t('board.noDueDate', 'Без срока')} tone={isOverdue ? 'danger' : 'neutral'} />
        <MetaPill icon={UserIcon} label={t('board.assignee', 'Исполнитель')} value={assigneeSummary} />
        <MetaPill icon={Clock3} label={t('board.taskTimer', 'Таймер')} value={workflowDuration} />
      </div>

      <Tabs defaultValue="details">
        <TabsList variant="line">
          <TabsTrigger value="details">{t('board.details', 'Детали')}</TabsTrigger>
          <TabsTrigger value="checklist">
            <CheckSquare className="mr-1 h-3.5 w-3.5" />
            {checklist.length}
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="mr-1 h-3.5 w-3.5" />
            {comments.length}
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            {attachments.length}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <AlertCircle className="mr-1 h-3.5 w-3.5" />
            Журнал
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <FormField label={t('board.title', 'Название')} required>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </FormField>
              <FormField label={t('board.description', 'Описание')} hint="Коротко и по делу.">
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={5} />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label={t('board.status', 'Статус')}>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  >
                    <option value="planned">{t('board.statusPlanned', 'Запланировано')}</option>
                    <option value="todo">{t('board.statusTodo', 'К выполнению')}</option>
                    <option value="in_progress">{t('board.statusInProgress', 'В работе')}</option>
                    <option value="pending_review">{t('board.statusPendingReview', 'На подтверждении')}</option>
                    <option value="done">{t('board.statusDone', 'Выполнено')}</option>
                    <option value="archived">{t('board.statusArchived', 'В архиве')}</option>
                  </select>
                </FormField>
                <FormField label={t('board.priority', 'Приоритет')}>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                  >
                    <option value="">—</option>
                    <option value="low">{t('board.priorityLow', 'Низкий')}</option>
                    <option value="medium">{t('board.priorityMedium', 'Средний')}</option>
                    <option value="high">{t('board.priorityHigh', 'Высокий')}</option>
                    <option value="critical">{t('board.priorityCritical', 'Критический')}</option>
                  </select>
                </FormField>
                <FormField label={t('board.assignees', 'Исполнители')}>
                  <UserMultiSelect
                    users={sortedUsers}
                    selectedIds={editAssigneeIds}
                    onChange={setEditAssigneeIds}
                    placeholder={t('board.selectAssignees', 'Выберите исполнителей')}
                  />
                </FormField>
                <FormField label={t('board.dueDate', 'Срок')}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                    <Input type="time" value={editDueTime} onChange={(e) => setEditDueTime(e.target.value)} />
                  </div>
                </FormField>
              </div>

              <FormField label={t('board.taskApprovers', 'Кто подтверждает выполнение')}>
                <UserMultiSelect
                  users={sortedUsers}
                  selectedIds={editApprovalUserIds}
                  onChange={setEditApprovalUserIds}
                  placeholder={t('board.selectApprovers', 'Выберите подтверждающих')}
                  disabled={!canManageApprovers}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {canManageApprovers
                    ? t('board.taskApproversHint', 'Подтверждение доступно только Founder, CEO или руководителю этого отдела.')
                    : t('board.taskApproversReadOnly', 'Подтверждать выполнение может только Founder, CEO или руководитель этого отдела.') }
                </p>
              </FormField>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{t('board.created', 'Создано')}: <span className="text-foreground">{task.created_at?.slice(0, 16).replace('T', ' ')}</span></p>
                <p>{t('board.startedAt', 'Начало работы')}: <span className="text-foreground">{workStartedAt ? new Date(workStartedAt).toLocaleString() : '—'}</span></p>
                <p>{t('board.finishedAt', 'Завершена')}: <span className="text-foreground">{workFinishedAt ? new Date(workFinishedAt).toLocaleString() : '—'}</span></p>
                <p>{t('board.approvedAt', 'Подтверждена')}: <span className="text-foreground">{approvedAt ? new Date(approvedAt).toLocaleString() : '—'}</span></p>
                <p>{t('board.approvedBy', 'Подтвердил')}: <span className="text-foreground">{approvedByName}</span></p>
                <p>{t('board.taskApprovers', 'Подтверждающие')}: <span className="text-foreground">{approverNames}</span></p>
                <p>{t('board.storyPoints', 'Баллы')}: <span className="text-foreground">{task.story_points ?? '—'}</span></p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                {hasUnsavedChanges ? t('board.unsavedTaskChanges', 'В задаче есть несохранённые изменения.') : t('board.allChangesSaved', 'Все изменения по задаче сохранены.')}
              </div>

              {isCurrentUserAssignee && !isTaskDone(editStatus) ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                  <div className="flex items-center gap-2 font-medium">
                    <Play className="h-4 w-4 text-primary" />
                    {getTaskActionLabel(t, { status: editStatus, approval_user_ids: editApprovalUserIds, created_by_id: task.created_by_id }, activeRole, isSuperAdmin, currentUserId)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isTaskInProgress(editStatus)
                      ? t('board.taskInProgressHint', 'Таймер уже идёт. После завершения задача уйдёт руководителю на проверку.')
                      : isTaskPendingReview(editStatus)
                        ? t('board.taskPendingReviewHint', 'Задача ждёт подтверждения. Руководитель увидит её в статусе «На подтверждении».')
                        : t('board.taskTodoHint', 'Нажмите, когда действительно начали работу — с этого момента пойдёт учёт времени.')}
                  </p>
                </div>
              ) : null}

              <Button onClick={() => void handleWorkflowPrimaryAction()} disabled={updateTask.isPending || (!isCurrentUserAssignee && !canApproveTask && task.created_by_id !== currentUserId)} className="w-full">
                <CheckSquare className="mr-1.5 h-4 w-4" />
                {getTaskActionLabel(t, { status: editStatus, approval_user_ids: editApprovalUserIds, created_by_id: task.created_by_id }, activeRole, isSuperAdmin, currentUserId)}
              </Button>

              {isTaskPendingReview(editStatus) && canApproveTask ? (
                <Button variant="outline" onClick={() => void handleWorkflowUpdate('in_progress', t('board.taskReturnedToInProgress', 'Задача возвращена в работу'))} disabled={updateTask.isPending} className="w-full">
                  {t('board.returnTaskToInProgress', 'Вернуть в работу')}
                </Button>
              ) : null}

              <Button onClick={handleSave} disabled={updateTask.isPending || !hasUnsavedChanges} className="w-full">
                <Save className="mr-1.5 h-4 w-4" />
                {updateTask.isPending ? t('common.saving', 'Сохраняем...') : t('common.saveChanges', 'Сохранить изменения')}
              </Button>

              {task.status === 'archived' ? (
                <Button variant="outline" onClick={handleRestore} disabled={updateTask.isPending} className="w-full">
                  <Archive className="mr-1.5 h-4 w-4" />
                  {t('board.restoreTask', 'Восстановить из архива')}
                </Button>
              ) : (
                <Button variant="outline" onClick={handleArchive} disabled={updateTask.isPending} className="w-full">
                  <Archive className="mr-1.5 h-4 w-4" />
                  {t('board.archiveTask', 'Перенести в архив')}
                </Button>
              )}

              <Button variant="outline" onClick={() => setShowMoveToTeam(true)} className="w-full">
                <ArrowRight className="mr-1.5 h-4 w-4" />
                Перенести в команду
              </Button>

              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
                  {t('board.quickComment', 'Комментарий')}
                </p>
                <Textarea
                  value={quickComment}
                  onChange={(e) => setQuickComment(e.target.value)}
                  rows={3}
                  placeholder={t('board.addComment', 'Добавить комментарий')}
                />
                <Button size="sm" onClick={handleQuickComment} disabled={createComment.isPending || !quickComment.trim()} className="w-full">
                  <Send className="mr-1.5 h-4 w-4" />
                  {t('board.sendComment', 'Отправить')}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklist">
          <div className="space-y-2 pt-4">
            {checklist.map((item) => (
              <div key={item.id} className="group flex items-center gap-2">
                <button onClick={() => toggleItem.mutate({ itemId: item.id, is_done: !item.is_done })}>
                  {item.is_done ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
                <span className={cn('flex-1 text-sm', item.is_done ? 'line-through text-muted-foreground' : '')}>{item.text}</span>
                <button onClick={() => deleteItem.mutate(item.id)} className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder={t('board.addChecklistItem', 'Добавить пункт')} onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()} className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleAddChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div className="space-y-3 pt-4">
            {comments.map((comment) => {
              const author = users.find((user) => user.id === comment.user_id)
              return (
                <div key={comment.id} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{author?.full_name || author?.email || comment.user_id.slice(0, 8)}</span>
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              )
            })}
            <div className="flex gap-2">
              <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={t('board.addComment', 'Добавить комментарий')} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} className="flex-1" />
              <Button size="sm" onClick={handleAddComment} disabled={createComment.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attachments">
          <div className="space-y-2 pt-4">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <a href={attachment.path} target="_blank" rel="noreferrer" download={attachment.filename} className="text-sm text-primary hover:underline">
                    {attachment.filename}
                  </a>
                  <span className="text-xs text-muted-foreground">({(attachment.size_bytes / 1024).toFixed(1)} KB)</span>
                </div>
                <button onClick={() => deleteAtt.mutate(attachment.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAtt.isPending}>
              <Upload className="mr-1 h-4 w-4" />
              {t('board.uploadAttachment', 'Загрузить вложение')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('board.attachmentSizeHint', 'Можно загружать несколько файлов. Лимит одного файла: 100 MB.')}</p>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="pt-4">
            <EntityActivityFeed orgId={orgId} entityType="task" entityId={task.id} title="Журнал событий" limit={30} />
          </div>
        </TabsContent>
      </Tabs>

      <MoveTaskToTeamModal
        open={showMoveToTeam}
        onOpenChange={setShowMoveToTeam}
        task={task}
        teams={teams}
        currentTeamId={task.team_id}
        onSubmit={async (taskId, teamId) => {
          const updatedTask = await updateTask.mutateAsync({ taskId, team_id: teamId })
          applyUpdatedTask(updatedTask)
        }}
      />
    </div>
  )
}

function MetaPill({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: typeof AlertCircle
  label: string
  value: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <div className={cn('rounded-lg border px-3 py-3', tone === 'danger' ? 'border-red-500/20 bg-red-500/[0.04]' : 'border-border bg-muted/20')}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-text-tertiary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
