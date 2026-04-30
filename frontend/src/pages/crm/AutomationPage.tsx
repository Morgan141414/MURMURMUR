/**
 * Страница управления правилами автоматизации
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Play, Pause, Trash2, Settings, Zap, Activity } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  listAutomationRules,
  toggleAutomationRule,
  deleteAutomationRule,
} from '../../api/crm'
import type { AutomationRule, AutomationTriggerType } from '../../types/crm'
import AutomationRuleBuilder from '../../components/crm/AutomationRuleBuilder'

const TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string> = {
  deal_created: 'Создание сделки',
  deal_updated: 'Обновление сделки',
  deal_stage_changed: 'Смена этапа',
  deal_won: 'Сделка выиграна',
  deal_lost: 'Сделка проиграна',
}

export default function AutomationPage() {
  const { t } = useTranslation()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)

  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  const loadRules = useCallback(async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      const response = await listAutomationRules(activeOrgId, {
        include_inactive: showInactive,
      })
      const data = (response.data as any)?.data || response.data || []
      setRules(data)
    } catch (err) {
      console.error('Failed to load automation rules:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, showInactive])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleToggleRule = async (ruleId: string, currentlyActive: boolean) => {
    if (!activeOrgId) return

    try {
      await toggleAutomationRule(activeOrgId, ruleId, !currentlyActive)
      await loadRules()
    } catch (err) {
      console.error('Failed to toggle automation rule:', err)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!activeOrgId) return
    if (!confirm('Вы уверены, что хотите удалить это правило?')) return

    try {
      await deleteAutomationRule(activeOrgId, ruleId)
      await loadRules()
    } catch (err) {
      console.error('Failed to delete automation rule:', err)
    }
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setShowBuilder(true)
  }

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule)
    setShowBuilder(true)
  }

  const handleBuilderClose = () => {
    setShowBuilder(false)
    setEditingRule(null)
    loadRules()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка правил автоматизации...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-7 h-7 text-yellow-500" />
              Автоматизация
            </h1>
            <p className="text-muted-foreground mt-1">
              Настройте автоматические действия при изменении сделок
            </p>
          </div>
          <button
            onClick={handleCreateRule}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать правило
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border"
            />
            Показать неактивные
          </label>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
            <Zap className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Нет правил автоматизации
          </h3>
          <p className="text-muted-foreground mb-6">
            Создайте первое правило для автоматизации процессов
          </p>
          <button
            onClick={handleCreateRule}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Создать правило
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-card border rounded-lg p-6 ${
                rule.is_active ? 'border-border' : 'border-border bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {rule.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        rule.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-muted-foreground'
                      }`}
                    >
                      {rule.is_active ? 'Активно' : 'Неактивно'}
                    </span>
                    {rule.execution_mode === 'async' && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        Асинхронно
                      </span>
                    )}
                  </div>

                  {rule.description && (
                    <p className="text-muted-foreground mb-3">{rule.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      <span className="font-medium">Триггер:</span>
                      <span>{TRIGGER_TYPE_LABELS[rule.trigger_type]}</span>
                    </div>
                    <div>
                      <span className="font-medium">Условий:</span>{' '}
                      {rule.conditions.length}
                    </div>
                    <div>
                      <span className="font-medium">Действий:</span>{' '}
                      {rule.actions.length}
                    </div>
                    <div>
                      <span className="font-medium">Приоритет:</span> {rule.priority}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.is_active
                        ? 'text-yellow-600 hover:bg-yellow-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={rule.is_active ? 'Приостановить' : 'Активировать'}
                  >
                    {rule.is_active ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Automation Rule Builder Modal */}
      {showBuilder && (
        <AutomationRuleBuilder
          rule={editingRule}
          onClose={handleBuilderClose}
        />
      )}
    </div>
  )
}
