import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Deal, PipelineStage } from '@/types/crm'
import type { User } from '@/types'
import { cn } from '@/lib/utils'

interface QuickDealDrawerProps {
  open: boolean
  onClose: () => void
  stageId: string
  pipelineId: string
  stages: PipelineStage[]
  users?: User[]
  currentUserId?: string
  onSave: (deal: Partial<Deal>) => Promise<void>
}

export function QuickDealDrawer({
  open,
  onClose,
  stageId,
  pipelineId,
  stages,
  users = [],
  currentUserId,
  onSave,
}: QuickDealDrawerProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)

  // Форматируем дату для input type="date"
  const todayString = new Date().toISOString().split('T')[0]
  const nextMonthString = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    name: '',
    stage_id: stageId,
    annual_revenue: '',
    currency: 'KZT',
    close_date: nextMonthString,
    contact_name: '',
    organization_name: '',
    deal_owner_id: currentUserId || '',
    notes: '',
    probability: 50,
  })

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        stage_id: stageId,
        deal_owner_id: currentUserId || '',
      }))
    }
  }, [open, stageId, currentUserId, pipelineId, stages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    setLoading(true)
    try {
      await onSave({
        name: formData.name.trim(),
        stage_id: formData.stage_id,
        pipeline_id: pipelineId,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : undefined,
        close_date: formData.close_date ? new Date(formData.close_date).toISOString() : undefined,
        contact_name: formData.contact_name || undefined,
        organization_name: formData.organization_name || undefined,
        deal_owner_id: formData.deal_owner_id || undefined,
        notes: formData.notes || undefined,
        probability: formData.probability,
      })

      // Сброс формы
      setFormData({
        name: '',
        stage_id: stageId,
        annual_revenue: '',
        currency: 'KZT',
        close_date: nextMonthString,
        contact_name: '',
        organization_name: '',
        deal_owner_id: currentUserId || '',
        notes: '',
        probability: 50,
      })
      setShowAdditional(false)
      onClose()
    } catch (error) {
      console.error('Failed to create deal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      stage_id: stageId,
      annual_revenue: '',
      currency: 'KZT',
      close_date: nextMonthString,
      contact_name: '',
      organization_name: '',
      deal_owner_id: currentUserId || '',
      notes: '',
      probability: 50,
    })
    setShowAdditional(false)
    onClose()
  }

  const currentStage = stages.find((s) => s.id === formData.stage_id)
  const currentUser = users.find((u) => u.id === formData.deal_owner_id)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Создание сделки</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          {/* О СДЕЛКЕ */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">О СДЕЛКЕ</h3>

            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="deal-name">Название</Label>
              <Input
                id="deal-name"
                placeholder="Сделка #"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Стадия */}
            <div className="space-y-2">
              <Label htmlFor="deal-stage">Стадия</Label>
              <Select value={formData.stage_id || ''} onValueChange={(value) => value && setFormData({ ...formData, stage_id: value })}>
                <SelectTrigger id="deal-stage">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {currentStage?.color && (
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentStage.color }} />
                      )}
                      <span>{currentStage?.name || 'Выберите стадию'}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        {stage.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />}
                        <span>{stage.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Сумма и валюта */}
            <div className="space-y-2">
              <Label htmlFor="deal-amount">Сумма и валюта</Label>
              <div className="flex gap-2">
                <Input
                  id="deal-amount"
                  type="number"
                  placeholder="0"
                  value={formData.annual_revenue}
                  onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                  className="flex-1"
                />
                <Select value={formData.currency || 'KZT'} onValueChange={(value) => value && setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KZT">Тенге (₸)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="RUB">RUB (₽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Дата завершения */}
            <div className="space-y-2">
              <Label htmlFor="deal-close-date">Дата завершения</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="deal-close-date"
                  type="date"
                  value={formData.close_date}
                  onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Клиент - Контакт */}
            <div className="space-y-2">
              <Label htmlFor="deal-contact">Клиент</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deal-contact"
                  placeholder="Имя контакта, телефон или e-mail"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Компания */}
            <div className="space-y-2">
              <Label htmlFor="deal-company">Компания</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deal-company"
                  placeholder="Название компании, телефон или e-mail"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* ДОПОЛНИТЕЛЬНО */}
          <div className="space-y-4 rounded-lg border bg-muted/30">
            <button
              type="button"
              onClick={() => setShowAdditional(!showAdditional)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="uppercase">ДОПОЛНИТЕЛЬНО</span>
              {showAdditional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdditional && (
              <div className="space-y-4 px-4 pb-4">
                {/* Ответственный */}
                {users.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="deal-owner">Ответственный</Label>
                    <Select value={formData.deal_owner_id || ''} onValueChange={(value) => value && setFormData({ ...formData, deal_owner_id: value })}>
                      <SelectTrigger id="deal-owner">
                        <SelectValue>
                          {currentUser ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {currentUser.full_name?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span>{currentUser.full_name || currentUser.email || 'Пользователь'}</span>
                            </div>
                          ) : (
                            'Выберите ответственного'
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span>{user.full_name || user.email || 'Пользователь'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Вероятность */}
                <div className="space-y-2">
                  <Label htmlFor="deal-probability">Вероятность закрытия (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="deal-probability"
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{formData.probability}%</span>
                  </div>
                </div>

                {/* Комментарий */}
                <div className="space-y-2">
                  <Label htmlFor="deal-notes">Комментарий</Label>
                  <Textarea
                    id="deal-notes"
                    placeholder="Дополнительная информация о сделке..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background pb-4">
            <Button type="submit" disabled={loading || !formData.name.trim()} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold">
              {loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="font-semibold">
              ОТМЕНИТЬ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
