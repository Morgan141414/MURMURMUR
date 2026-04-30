import type { TFunction } from 'i18next'

export function formatPriorityLabel(t: TFunction, priority?: string | null) {
  const value = String(priority ?? '').trim().toLowerCase()
  if (!value) return ''

  if (value === 'critical') return t('board.priorityCritical', { defaultValue: 'Critical' })
  if (value === 'high') return t('board.priorityHigh', { defaultValue: 'High' })
  if (value === 'medium') return t('board.priorityMedium', { defaultValue: 'Medium' })
  if (value === 'low') return t('board.priorityLow', { defaultValue: 'Low' })
  if (value === 'none') return t('board.priorityNone', { defaultValue: 'None' })

  return String(priority)
}
