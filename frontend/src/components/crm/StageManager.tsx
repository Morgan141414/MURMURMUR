import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, GripVertical, Check } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  listStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from '@/api/crm'
import type { PipelineWithStages, PipelineStage, PipelineStageCreate, PipelineStageUpdate } from '@/types/crm'

interface StageManagerProps {
  pipeline: PipelineWithStages
  onClose: () => void
}

export function StageManager({ pipeline, onClose }: StageManagerProps) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [formData, setFormData] = useState<PipelineStageCreate>({
    name: '',
    color: '#6366f1',
    order: 0,
    probability_min: 0,
    probability_max: 0,
    is_closed_won: false,
    is_closed_lost: false,
  })
  const [error, setError] = useState<string | null>(null)

  const loadStages = async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      const response = await listStages(activeOrgId, pipeline.id)
      const data = (response.data as any)?.data || response.data || []
      setStages(data.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order))
    } catch (err) {
      console.error('Failed to load stages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStages()
  }, [])

  const handleCreateStage = async () => {
    if (!activeOrgId) return

    try {
      setError(null)
      const stageData = {
        ...formData,
        order: stages.length + 1,
      }
      await createStage(activeOrgId, pipeline.id, stageData)
      setShowForm(false)
      resetForm()
      loadStages()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Не удалось создать этап'
      setError(errorMsg)
    }
  }

  const handleUpdateStage = async () => {
    if (!activeOrgId || !editingStage) return

    try {
      setError(null)
      const updateData: PipelineStageUpdate = {
        name: formData.name,
        color: formData.color,
        probability_min: formData.probability_min,
        probability_max: formData.probability_max,
        is_closed_won: formData.is_closed_won,
        is_closed_lost: formData.is_closed_lost,
      }
      await updateStage(activeOrgId, editingStage.id, updateData)
      setEditingStage(null)
      setShowForm(false)
      resetForm()
      loadStages()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Не удалось обновить этап'
      setError(errorMsg)
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!activeOrgId || !confirm('Удалить этап? Этап должен быть пустым (без сделок).')) return

    try {
      await deleteStage(activeOrgId, stageId)
      loadStages()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Не удалось удалить этап'
      alert(errorMsg)
    }
  }

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    if (!activeOrgId) return

    const currentIndex = stages.findIndex((s) => s.id === stageId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= stages.length) return

    // Swap stages
    const newStages = [...stages]
    const temp = newStages[currentIndex]
    newStages[currentIndex] = newStages[newIndex]
    newStages[newIndex] = temp

    // Update orders
    const reorderData = newStages.map((stage, index) => ({
      stage_id: stage.id,
      order: index + 1,
    }))

    try {
      await reorderStages(activeOrgId, pipeline.id, reorderData)
      setStages(newStages)
    } catch (err) {
      console.error('Failed to reorder stages:', err)
      loadStages() // Reload on error
    }
  }

  const openEditForm = (stage: PipelineStage) => {
    setEditingStage(stage)
    setFormData({
      name: stage.name,
      color: stage.color,
      order: stage.order,
      probability_min: stage.probability_min || 0,
      probability_max: stage.probability_max || 0,
      is_closed_won: stage.is_closed_won,
      is_closed_lost: stage.is_closed_lost,
    })
    setShowForm(true)
    setError(null)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#6366f1',
      order: 0,
      probability_min: 0,
      probability_max: 0,
      is_closed_won: false,
      is_closed_lost: false,
    })
    setEditingStage(null)
    setError(null)
  }

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-3xl rounded-lg bg-background p-6">
          <div className="text-center text-muted-foreground">Загрузка...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-lg bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Управление этапами</h2>
            <p className="text-sm text-muted-foreground mt-1">{pipeline.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stages List */}
          <div className="space-y-3 mb-6">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                {/* Drag Handle */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveStage(stage.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleMoveStage(stage.id, 'down')}
                    disabled={index === stages.length - 1}
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Color Badge */}
                <div
                  className="w-8 h-8 rounded flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{stage.name}</span>
                    {stage.is_closed_won && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                        Won
                      </span>
                    )}
                    {stage.is_closed_lost && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                        Lost
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Вероятность: {stage.probability_min || 0}% - {stage.probability_max || 0}%
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(stage)}
                    className="p-2 rounded hover:bg-accent"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="p-2 rounded hover:bg-accent"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Stage Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Добавить этап
            </button>
          )}

          {/* Stage Form */}
          {showForm && (
            <div className="rounded-lg border p-4 bg-accent/30">
              <h3 className="font-medium mb-4">
                {editingStage ? 'Редактировать этап' : 'Новый этап'}
              </h3>

              <div className="space-y-4">
                {/* Name and Color */}
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Название <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Например: Квалификация"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Цвет</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 rounded-md border bg-background cursor-pointer"
                    />
                  </div>
                </div>

                {/* Probability Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Мин. вероятность (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability_min}
                      onChange={(e) =>
                        setFormData({ ...formData, probability_min: parseInt(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Макс. вероятность (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability_max}
                      onChange={(e) =>
                        setFormData({ ...formData, probability_max: parseInt(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Closed Flags */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_closed_won}
                      onChange={(e) =>
                        setFormData({ ...formData, is_closed_won: e.target.checked })
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">Закрытая сделка (Won)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_closed_lost}
                      onChange={(e) =>
                        setFormData({ ...formData, is_closed_lost: e.target.checked })
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">Проигранная сделка (Lost)</span>
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={closeForm}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={editingStage ? handleUpdateStage : handleCreateStage}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4 inline mr-1" />
                    {editingStage ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
