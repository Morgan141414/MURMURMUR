import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onSubmit: (newName: string) => void
  isLoading?: boolean
}

export function RenameColumnModal({ open, onOpenChange, currentName, onSubmit, isLoading }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(currentName)

  useEffect(() => {
    if (open) {
      setName(currentName)
    }
  }, [open, currentName])

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) return
    onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('board.renameColumn', 'Переименовать колонку')}</DialogTitle>
        </DialogHeader>

        <div>
          <Label>{t('board.columnName', 'Название колонки')}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('board.columnName', 'Название колонки')}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Отмена')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || name.trim() === currentName || isLoading}>
            {t('common.save', 'Сохранить')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
