import i18n from '@/i18n'

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return i18n.t('dashboard.greeting.morning')
  if (hour >= 12 && hour < 18) return i18n.t('dashboard.greeting.afternoon')
  if (hour >= 18 && hour < 23) return i18n.t('dashboard.greeting.evening')
  return i18n.t('dashboard.greeting.night')
}
