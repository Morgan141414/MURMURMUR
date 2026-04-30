import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Deal } from '@/types/crm'

interface QuickDealModalProps {
  open: boolean
  onClose: () => void
  stageId: string
  pipelineId: string
  onSave: (deal: Partial<Deal>) => Promise<void>
}

export function QuickDealModal({ open, onClose, stageId, pipelineId, onSave }: QuickDealModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    annual_revenue: '',
    currency: 'KZT',
    contact_name: '',
    organization_name: '',
  })

  useEffect(() => {
    if (!open) {
      // Сброс формы при закрытии
      setFormData({
        name: '',
        annual_revenue: '',
        currency: 'KZT',
        contact_name: '',
        organization_name: '',
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    setLoading(true)
    try {
      // Проверяем что stageId это UUID, а не строка статуса
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId)

      await onSave({
        name: formData.name.trim(),
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : undefined,
        contact_name: formData.contact_name || undefined,
        organization_name: formData.organization_name || undefined,
        ...(isValidUUID && { stage_id: stageId }),
        ...(pipelineId && { pipeline_id: pipelineId }),
        probability: 50,
      })

      onClose()
    } catch (error) {
      console.error('Failed to create deal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0">
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between -mt-2 mb-4">
            <h3 className="text-base font-semibold">Быстрая сделка</h3>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Название */}
          <div className="space-y-1.5">
            <Label htmlFor="quick-deal-name" className="text-xs text-muted-foreground">
              Название
            </Label>
            <Input
              id="quick-deal-name"
              placeholder="Сделка #"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
              className="h-9"
            />
          </div>

          {/* Сумма и валюта */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Сумма и валюта</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0"
                value={formData.annual_revenue}
                onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                className="flex-1 h-9"
              />
              <Select value={formData.currency || 'KZT'} onValueChange={(value) => value && setFormData({ ...formData, currency: value })}>
                <SelectTrigger className="w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KZT">₸</SelectItem>
                  <SelectItem value="USD">$</SelectItem>
                  <SelectItem value="EUR">€</SelectItem>
                  <SelectItem value="RUB">₽</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Клиент */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Клиент</Label>
            <div className="relative">
              <Input
                placeholder="Контакт"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="h-9 pr-8"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Компания */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Компания</Label>
            <div className="relative">
              <Input
                placeholder="Название компа"
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                className="h-9 pr-8"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm font-medium"
            >
              {loading ? 'Сохранение...' : 'СОХРАНИТЬ'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm font-medium">
              ОТМЕНИТЬ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
