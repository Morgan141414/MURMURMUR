/**
 * Конструктор условий для автоматизации
 */

import { Trash2 } from 'lucide-react'
import type { AutomationCondition, AutomationOperator } from '../../types/crm'

interface Props {
  condition: AutomationCondition
  onChange: (condition: AutomationCondition) => void
  onRemove: () => void
}

const FIELDS = [
  { value: 'name', label: 'Название', type: 'string' },
  { value: 'annual_revenue', label: 'Сумма сделки', type: 'number' },
  { value: 'probability', label: 'Вероятность', type: 'number' },
  { value: 'status', label: 'Статус', type: 'string' },
  { value: 'organization_name', label: 'Организация', type: 'string' },
  { value: 'contact_name', label: 'Контакт', type: 'string' },
  { value: 'notes', label: 'Заметки', type: 'string' },
]

const OPERATORS: Record<
  string,
  Array<{ value: AutomationOperator; label: string }>
> = {
  string: [
    { value: 'equals', label: 'равно' },
    { value: 'not_equals', label: 'не равно' },
    { value: 'contains', label: 'содержит' },
    { value: 'not_contains', label: 'не содержит' },
    { value: 'is_empty', label: 'пусто' },
    { value: 'is_not_empty', label: 'не пусто' },
  ],
  number: [
    { value: 'equals', label: 'равно' },
    { value: 'not_equals', label: 'не равно' },
    { value: 'greater_than', label: 'больше' },
    { value: 'less_than', label: 'меньше' },
    { value: 'greater_than_or_equal', label: 'больше или равно' },
    { value: 'less_than_or_equal', label: 'меньше или равно' },
  ],
}

export default function ConditionBuilder({
  condition,
  onChange,
  onRemove,
}: Props) {
  const selectedField = FIELDS.find((f) => f.value === condition.field)
  const fieldType = selectedField?.type || 'string'
  const availableOperators = OPERATORS[fieldType] || OPERATORS.string

  const handleFieldChange = (field: string) => {
    const newField = FIELDS.find((f) => f.value === field)
    const newFieldType = newField?.type || 'string'
    const newOperators = OPERATORS[newFieldType] || OPERATORS.string

    onChange({
      field,
      operator: newOperators[0].value,
      value: newFieldType === 'number' ? 0 : '',
    })
  }

  const handleOperatorChange = (operator: AutomationOperator) => {
    onChange({
      ...condition,
      operator,
    })
  }

  const handleValueChange = (value: any) => {
    onChange({
      ...condition,
      value,
    })
  }

  const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator)

  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
      {/* Field */}
      <div className="flex-1">
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background"
        >
          {FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator */}
      <div className="flex-1">
        <select
          value={condition.operator}
          onChange={(e) =>
            handleOperatorChange(e.target.value as AutomationOperator)
          }
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-background"
        >
          {availableOperators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value */}
      {needsValue && (
        <div className="flex-1">
          {fieldType === 'number' ? (
            <input
              type="number"
              value={condition.value || 0}
              onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Значение"
            />
          ) : (
            <input
              type="text"
              value={condition.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Значение"
            />
          )}
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Удалить условие"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  )
}
