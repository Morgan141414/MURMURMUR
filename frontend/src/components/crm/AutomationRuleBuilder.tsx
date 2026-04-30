/**
 * Визуальный конструктор правил автоматизации (IF-THEN)
 */

import { useState, useEffect } from 'react'
import { X, Plus, Zap } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  createAutomationRule,
  updateAutomationRule,
  listPipelines,
} from '../../api/crm'
import type {
  AutomationRule,
  AutomationRuleCreate,
  AutomationTriggerType,
  AutomationCondition,
  AutomationAction,
  PipelineWithStages,
} from '../../types/crm'
import ConditionBuilder from './ConditionBuilder'
import ActionBuilder from './ActionBuilder'

interface Props {
  rule: AutomationRule | null
  onClose: () => void
}

const TRIGGER_TYPES: Array<{ value: AutomationTriggerType; label: string }> = [
  { value: 'deal_created', label: 'Создание сделки' },
  { value: 'deal_updated', label: 'Обновление сделки' },
  { value: 'deal_stage_changed', label: 'Смена этапа' },
  { value: 'deal_won', label: 'Сделка выиграна' },
  { value: 'deal_lost', label: 'Сделка проиграна' },
]

export default function AutomationRuleBuilder({ rule, onClose }: Props) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)

  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(
    rule?.trigger_type || 'deal_created'
  )
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    rule?.trigger_config || {}
  )
  const [conditions, setConditions] = useState<AutomationCondition[]>(
    rule?.conditions || []
  )
  const [actions, setActions] = useState<AutomationAction[]>(
    rule?.actions || []
  )
  const [executionMode, setExecutionMode] = useState<'sync' | 'async'>(
    rule?.execution_mode || 'sync'
  )
  const [priority, setPriority] = useState(rule?.priority || 0)
  const [saving, setSaving] = useState(false)
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([])

  useEffect(() => {
    if (activeOrgId) {
      listPipelines(activeOrgId).then((response) => {
        const data = (response.data as any)?.data || response.data || []
        setPipelines(data)
      })
    }
  }, [activeOrgId])

  const handleSave = async () => {
    if (!activeOrgId || !name.trim() || actions.length === 0) {
      alert('Заполните название и добавьте хотя бы одно действие')
      return
    }

    try {
      setSaving(true)

      const body: AutomationRuleCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        conditions,
        actions,
        execution_mode: executionMode,
        priority,
      }

      if (rule) {
        await updateAutomationRule(activeOrgId, rule.id, body)
      } else {
        await createAutomationRule(activeOrgId, body)
      }

      onClose()
    } catch (err) {
      console.error('Failed to save automation rule:', err)
      alert('Ошибка при сохранении правила')
    } finally {
      setSaving(false)
    }
  }

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'annual_revenue', operator: 'greater_than', value: 0 },
    ])
  }

  const updateCondition = (index: number, condition: AutomationCondition) => {
    const newConditions = [...conditions]
    newConditions[index] = condition
    setConditions(newConditions)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const addAction = () => {
    setActions([
      ...actions,
      { type: 'assign_user', config: { user_id: '' } },
    ])
  }

  const updateAction = (index: number, action: AutomationAction) => {
    const newActions = [...actions]
    newActions[index] = action
    setActions(newActions)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {rule ? 'Редактировать правило' : 'Создать правило автоматизации'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Настройте триггер, условия и действия
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Название правила <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: Назначить менеджера для крупных сделок"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Краткое описание правила"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Режим выполнения
                </label>
                <select
                  value={executionMode}
                  onChange={(e) =>
                    setExecutionMode(e.target.value as 'sync' | 'async')
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sync">Синхронно</option>
                  <option value="async">Асинхронно</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Приоритет
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              🔔 Триггер (Когда)
            </h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Тип триггера <span className="text-red-500">*</span>
              </label>
              <select
                value={triggerType}
                onChange={(e) =>
                  setTriggerType(e.target.value as AutomationTriggerType)
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage-specific trigger config */}
            {triggerType === 'deal_stage_changed' && pipelines.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Из этапа (необязательно)
                  </label>
                  <select
                    value={triggerConfig.from_stage_id || ''}
                    onChange={(e) =>
                      setTriggerConfig({
                        ...triggerConfig,
                        from_stage_id: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Любой этап</option>
                    {pipelines.flatMap((p) =>
                      p.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {p.name} / {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    В этап (необязательно)
                  </label>
                  <select
                    value={triggerConfig.to_stage_id || ''}
                    onChange={(e) =>
                      setTriggerConfig({
                        ...triggerConfig,
                        to_stage_id: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Любой этап</option>
                    {pipelines.flatMap((p) =>
                      p.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {p.name} / {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                ❓ Условия (Если)
              </h3>
              <button
                onClick={addCondition}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить условие
              </button>
            </div>

            {conditions.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                <p className="text-muted-foreground">
                  Условия не заданы - правило будет срабатывать всегда
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <ConditionBuilder
                    key={index}
                    condition={condition}
                    onChange={(c) => updateCondition(index, c)}
                    onRemove={() => removeCondition(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                ⚡ Действия (То) <span className="text-red-500">*</span>
              </h3>
              <button
                onClick={addAction}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить действие
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 bg-red-500/10 rounded-lg border-2 border-dashed border-red-500/30">
                <p className="text-red-600 dark:text-red-400 font-medium">
                  Добавьте хотя бы одно действие
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => (
                  <ActionBuilder
                    key={index}
                    action={action}
                    onChange={(a) => updateAction(index, a)}
                    onRemove={() => removeAction(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-muted/30 border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || actions.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Сохранение...' : rule ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
