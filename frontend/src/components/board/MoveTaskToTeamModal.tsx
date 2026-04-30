import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { BoardTask, Team } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: BoardTask | null
  teams: Team[]
  currentTeamId?: string | null
  onSubmit: (taskId: string, teamId: string) => Promise<void>
}

export function MoveTaskToTeamModal({ open, onOpenChange, task, teams, currentTeamId, onSubmit }: Props) {
  const { t } = useTranslation()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedTeamId(currentTeamId ?? null)
    }
  }, [open, currentTeamId])

  const availableTeams = teams.filter(team => team.id !== currentTeamId)

  async function handleSubmit() {
    if (!task || !selectedTeamId) return
    setLoading(true)
    try {
      await onSubmit(task.id, selectedTeamId)
      toast.success('Задача перенесена в другую команду')
      onOpenChange(false)
    } catch {
      toast.error('Не удалось перенести задачу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Перенести задачу в команду</DialogTitle>
          <DialogDescription>
            Выберите команду для переноса задачи "{task?.title}"
          </DialogDescription>
        </DialogHeader>

        {availableTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет других команд для переноса</p>
        ) : (
          <div className="space-y-2">
            {availableTeams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  selectedTeamId === team.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                <div className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border-2',
                  selectedTeamId === team.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                )}>
                  {selectedTeamId === team.id && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <p className="font-medium">{team.name}</p>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedTeamId || loading}>
            {loading ? 'Перенос...' : 'Перенести'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
