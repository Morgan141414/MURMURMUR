function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function formatLocalTime(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function toLocalDateKey(value: string) {
  if (isDateOnly(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10)
  return formatLocalDate(parsed)
}

export function formatDueDate(value?: string | null) {
  if (!value) return ''
  if (isDateOnly(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return `${formatLocalDate(parsed)} ${formatLocalTime(parsed)}`
}

export function splitDueDate(value?: string | null): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  if (isDateOnly(value)) return { date: value, time: '' }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: value.slice(0, 10),
      time: value.includes('T') ? value.slice(11, 16) : '',
    }
  }
  return { date: formatLocalDate(parsed), time: formatLocalTime(parsed) }
}

export function buildDueDateValue(date: string, time: string) {
  if (!date) return undefined
  if (!time) return date
  const parsed = new Date(`${date}T${time}`)
  if (Number.isNaN(parsed.getTime())) return `${date}T${time}`
  return parsed.toISOString()
}

