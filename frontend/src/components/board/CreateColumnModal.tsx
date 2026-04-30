import { useState } from 'react'
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
  onSubmit: (data: { name: string; color?: string; mapped_status?: string }) => void
  isLoading?: boolean
}

const COLOR_OPTIONS = ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899']

export function CreateColumnModal({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  function handleSubmit() {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      color: color || undefined,
    })
    setName('')
    setColor('#3b82f6')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('board.addColumn')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>{t('board.columnName')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('board.columnName')} />
          </div>
          <div>
            <Label>{t('board.color')}</Label>
            <div className="flex gap-2 mt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!name.trim() || isLoading}>
            {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
