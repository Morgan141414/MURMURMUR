import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Pipeline, PipelineCreate } from '@/types/crm'

interface PipelineFormProps {
  pipeline?: Pipeline
  onSubmit: (data: PipelineCreate) => Promise<void>
  onClose: () => void
}

export function PipelineForm({ pipeline, onSubmit, onClose }: PipelineFormProps) {
  const [formData, setFormData] = useState<PipelineCreate>({
    name: '',
    description: '',
    is_default: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pipeline) {
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        is_default: pipeline.is_default,
      })
    }
  }, [pipeline])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Название обязательно')
      return
    }

    try {
      setLoading(true)
      await onSubmit(formData)
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Не удалось сохранить пайплайн'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {pipeline ? 'Редактировать воронку' : 'Создать воронку'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Название <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Например: B2B продажи"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="Краткое описание воронки продаж"
              disabled={loading}
            />
          </div>

          {/* Is Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              disabled={loading}
            />
            <label htmlFor="is_default" className="text-sm">
              Сделать воронкой по умолчанию
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : pipeline ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
