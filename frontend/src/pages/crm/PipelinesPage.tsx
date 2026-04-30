import { useEffect, useState, useCallback } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, Settings, Star } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  listPipelines,
  createPipeline,
  updatePipeline,
  deactivatePipeline,
} from '@/api/crm'
import type { Pipeline, PipelineCreate, PipelineWithStages } from '@/types/crm'
import { PipelineForm } from '@/components/crm/PipelineForm'
import { StageManager } from '@/components/crm/StageManager'

export default function PipelinesPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineWithStages | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const loadPipelines = useCallback(async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      const response = await listPipelines(activeOrgId)
      const data = (response.data as any)?.data || response.data || []
      setPipelines(data)
    } catch (err) {
      console.error('Failed to load pipelines:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  const handleCreate = async (data: PipelineCreate) => {
    if (!activeOrgId) return

    try {
      await createPipeline(activeOrgId, data)
      setShowCreateModal(false)
      loadPipelines()
    } catch (err) {
      console.error('Failed to create pipeline:', err)
      throw err
    }
  }

  const handleUpdate = async (data: PipelineCreate) => {
    if (!activeOrgId || !selectedPipeline) return

    try {
      await updatePipeline(activeOrgId, selectedPipeline.id, data)
      setShowEditModal(false)
      setSelectedPipeline(null)
      loadPipelines()
    } catch (err) {
      console.error('Failed to update pipeline:', err)
      throw err
    }
  }

  const handleDelete = async (pipelineId: string) => {
    if (!activeOrgId || !confirm('Деактивировать пайплайн? Сделки останутся без изменений.')) return

    try {
      await deactivatePipeline(activeOrgId, pipelineId)
      loadPipelines()
      setDropdownOpen(null)
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Не удалось деактивировать пайплайн'
      alert(errorMsg)
      console.error('Failed to deactivate pipeline:', err)
    }
  }

  const openEditModal = (pipeline: PipelineWithStages) => {
    setSelectedPipeline(pipeline)
    setShowEditModal(true)
    setDropdownOpen(null)
  }

  const openStageManager = (pipeline: PipelineWithStages) => {
    setSelectedPipeline(pipeline)
    setShowStageModal(true)
    setDropdownOpen(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Воронки продаж</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Управление пайплайнами и этапами сделок
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Создать воронку
          </button>
        </div>

        {/* Pipelines Grid */}
        {pipelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Нет воронок</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первую воронку продаж для вашей организации
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Создать воронку
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Pipeline Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {pipeline.name}
                    </h3>
                    {pipeline.is_default && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setDropdownOpen(dropdownOpen === pipeline.id ? null : pipeline.id)
                      }
                      className="p-1 rounded hover:bg-accent"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {dropdownOpen === pipeline.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setDropdownOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 rounded-md border bg-popover shadow-lg z-20">
                          <button
                            onClick={() => openEditModal(pipeline)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          >
                            <Pencil className="h-4 w-4" />
                            Редактировать
                          </button>
                          <button
                            onClick={() => openStageManager(pipeline)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          >
                            <Settings className="h-4 w-4" />
                            Управление этапами
                          </button>
                          <button
                            onClick={() => handleDelete(pipeline.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                          >
                            <Trash2 className="h-4 w-4" />
                            Деактивировать
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                {pipeline.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {pipeline.description}
                  </p>
                )}

                {/* Stages */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Этапы ({pipeline.stages.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pipeline.stages.slice(0, 5).map((stage) => (
                      <div
                        key={stage.id}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${stage.color}20`,
                          color: stage.color,
                        }}
                      >
                        {stage.name}
                      </div>
                    ))}
                    {pipeline.stages.length > 5 && (
                      <div className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground">
                        +{pipeline.stages.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
                  <span>Создано {formatDate(pipeline.created_at)}</span>
                  <button
                    onClick={() => openStageManager(pipeline)}
                    className="text-primary hover:underline"
                  >
                    Настроить этапы
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <PipelineForm
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPipeline && (
        <PipelineForm
          pipeline={selectedPipeline}
          onSubmit={handleUpdate}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPipeline(null)
          }}
        />
      )}

      {/* Stage Manager Modal */}
      {showStageModal && selectedPipeline && (
        <StageManager
          pipeline={selectedPipeline}
          onClose={() => {
            setShowStageModal(false)
            setSelectedPipeline(null)
            loadPipelines() // Reload to get updated stages
          }}
        />
      )}
    </div>
  )
}
