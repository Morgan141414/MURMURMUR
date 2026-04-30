import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UserMultiSelect } from '@/components/shared/UserMultiSelect'
import type { User } from '@/types'
import { buildDueDateValue } from '@/lib/dueDate'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    title: string
    description?: string
    priority?: string
    due_date?: string
    story_points?: number
    column_id?: string
    assignee_id?: string
    assignee_ids?: string[]
    approval_user_ids?: string[]
  }) => void
  isLoading?: boolean
  defaultColumnId?: string
  users?: User[]
}

export function CreateTaskModal({ open, onOpenChange, onSubmit, isLoading, defaultColumnId, users = [] }: Props) {
  const { t } = useTranslation()
  const draftKey = `create-task-description-draft:${defaultColumnId ?? 'default'}`

  const getDefaultDue = () => {
    const target = new Date()
    target.setDate(target.getDate() + 1)
    target.setHours(18, 0, 0, 0)
    const pad = (num: number) => String(num).padStart(2, '0')
    return {
      date: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`,
      time: '18:00',
    }
  }

  const PRIORITY_OPTIONS = [
    { value: '', label: t('board.priorityNone', '\u0411\u0435\u0437 \u043f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u0430') },
    { value: 'low', label: t('board.priorityLow', '\u041d\u0438\u0437\u043a\u0438\u0439') },
    { value: 'medium', label: t('board.priorityMedium', '\u0421\u0440\u0435\u0434\u043d\u0438\u0439') },
    { value: 'high', label: t('board.priorityHigh', '\u0412\u044b\u0441\u043e\u043a\u0438\u0439') },
    { value: 'critical', label: t('board.priorityCritical', '\u041a\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439') },
  ]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [dueDate, setDueDate] = useState(() => getDefaultDue().date)
  const [dueTime, setDueTime] = useState(() => getDefaultDue().time)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [approvalUserIds, setApprovalUserIds] = useState<string[]>([])
  const [descriptionEditorOpen, setDescriptionEditorOpen] = useState(false)
  const [descriptionEditorFullscreen, setDescriptionEditorFullscreen] = useState(false)

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => (left.full_name || left.email).localeCompare(right.full_name || right.email)),
    [users],
  )

  useEffect(() => {
    if (!open) return
    const defaults = getDefaultDue()
    setDueDate(defaults.date)
    setDueTime(defaults.time)
    setApprovalUserIds([])
    if (!description) {
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) setDescription(savedDraft)
    }
  }, [description, draftKey, open])

  useEffect(() => {
    if (!open) return
    if (description.trim()) {
      localStorage.setItem(draftKey, description)
      return
    }
    localStorage.removeItem(draftKey)
  }, [description, draftKey, open])

  function resetForm() {
    setTitle('')
    setDescription('')
    setPriority('')
    const defaults = getDefaultDue()
    setDueDate(defaults.date)
    setDueTime(defaults.time)
    setAssigneeIds([])
    setApprovalUserIds([])
    setDescriptionEditorOpen(false)
    setDescriptionEditorFullscreen(false)
    localStorage.removeItem(draftKey)
  }

  function handleSubmit() {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority || undefined,
      due_date: buildDueDateValue(dueDate, dueTime),
      column_id: defaultColumnId || undefined,
      assignee_id: assigneeIds[0] || undefined,
      assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
      approval_user_ids: approvalUserIds.length > 0 ? approvalUserIds : undefined,
    })
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="border-b border-border/60 px-6 pb-3 pt-6">
          <DialogTitle>{t('board.createTask', '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            <div>
              <Label>{t('board.title', '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('board.taskTitlePlaceholder', '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438...')} />
            </div>

            <div className="space-y-2">
              <Label>{t('board.description', '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435')}</Label>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setDescriptionEditorOpen(true)}>
                {description.trim() ? t('board.editDescription', '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435') : t('board.addDescription', '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435')}
              </Button>
              {description.trim() ? (
                <p className="line-clamp-3 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('board.descriptionHint', '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0432 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u0439 \u0431\u043e\u043b\u044c\u0448\u043e\u0439 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0435, \u0433\u0434\u0435 \u0443\u0434\u043e\u0431\u043d\u043e \u043f\u0435\u0447\u0430\u0442\u0430\u0442\u044c \u0438 \u0441\u043a\u0440\u043e\u043b\u043b\u0438\u0442\u044c.')}
                </p>
              )}
            </div>

            <div>
              <Label>{t('board.priority', '\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442')}</Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t('board.assignees', '\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u0438')}</Label>
              <UserMultiSelect users={sortedUsers} selectedIds={assigneeIds} onChange={setAssigneeIds} placeholder={t('board.selectAssignees', '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u0435\u0439')} />
            </div>

            <div>
              <Label>{t('board.taskApprovers', '\u041a\u0442\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435')}</Label>
              <UserMultiSelect users={sortedUsers} selectedIds={approvalUserIds} onChange={setApprovalUserIds} placeholder={t('board.selectApprovers', '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e\u0449\u0438\u0445')} />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('board.taskApproversHint', '\u0415\u0441\u043b\u0438 \u043d\u0438\u043a\u043e\u0433\u043e \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u0442\u044c, \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0442\u044c \u0441\u043c\u043e\u0436\u0435\u0442 \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u043e\u0442\u0434\u0435\u043b\u0430 \u0438\u043b\u0438 \u0430\u0432\u0442\u043e\u0440 \u0437\u0430\u0434\u0430\u0447\u0438-\u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c.')}
              </p>
            </div>

            <div>
              <Label>{t('board.dueDate', '\u0421\u0440\u043e\u043a')}</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button className="ml-auto" onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {t('common.create', '\u0421\u043e\u0437\u0434\u0430\u0442\u044c')}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={descriptionEditorOpen} onOpenChange={(nextOpen) => {
        setDescriptionEditorOpen(nextOpen)
        if (!nextOpen) setDescriptionEditorFullscreen(false)
      }}>
        <DialogContent className={descriptionEditorFullscreen ? 'h-screen w-screen max-w-none rounded-none border-0 p-0 flex flex-col' : 'w-[min(96vw,1200px)] max-w-6xl h-[85vh] p-0 flex flex-col'}>
          <DialogHeader className="border-b border-border/60 px-6 pb-3 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle>{t('board.description', '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435')}</DialogTitle>
                <DialogDescription>{t('board.descriptionEditorHint', '\u041f\u0438\u0448\u0438\u0442\u0435 \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0432 \u0431\u043e\u043b\u044c\u0448\u043e\u043c \u043f\u043e\u043b\u0435. \u0421\u043a\u0440\u043e\u043b\u043b \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0432\u043d\u0443\u0442\u0440\u0438 \u044d\u0442\u043e\u0439 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438.')}</DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setDescriptionEditorFullscreen((value) => !value)}
                aria-label={descriptionEditorFullscreen ? t('common.exitFullscreen', '\u0412\u044b\u0439\u0442\u0438 \u0438\u0437 \u043f\u043e\u043b\u043d\u043e\u044d\u043a\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u0440\u0435\u0436\u0438\u043c\u0430') : t('common.fullscreen', '\u041f\u043e\u043b\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d')}
              >
                {descriptionEditorFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-6">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-full min-h-[420px] resize-none" placeholder={t('board.descriptionPlaceholder', '\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u043e...')} />
          </div>
          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <p className="mr-auto text-xs text-muted-foreground">{t('board.descriptionDraftHint', '\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.')}</p>
            <Button type="button" onClick={() => setDescriptionEditorOpen(false)}>{t('common.done', '\u0413\u043e\u0442\u043e\u0432\u043e')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
