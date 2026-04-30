/**
 * Data masking utilities for emergency/restricted access contexts.
 * Used when superadmin/sysadmin views user data — masks PII by default
 * unless emergency mode is active with a valid reason.
 */

/** Mask an email: "john@example.com" → "j***@e***.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const [domName, ...ext] = domain.split('.')
  return `${local[0]}***@${domName[0]}***.${ext.join('.')}`
}

/** Mask a phone: "+7 999 123 4567" → "+7 *** *** **67" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return phone.slice(0, phone.length > 5 ? 3 : 1) + ' *** *** **' + digits.slice(-2)
}

/** Mask a full name: "Иванов Иван Иванович" → "И*** И*** И***" */
export function maskName(name: string): string {
  return name
    .split(' ')
    .map((part) => (part.length > 0 ? part[0] + '***' : ''))
    .join(' ')
}

/** Mask an arbitrary string, keeping first and last chars */
export function maskString(value: string, visibleStart = 1, visibleEnd = 1): string {
  if (value.length <= visibleStart + visibleEnd + 2) return '***'
  return value.slice(0, visibleStart) + '***' + value.slice(-visibleEnd)
}

/** Mask INN/tax ID: "1234567890" → "12****7890" */
export function maskTaxId(taxId: string): string {
  if (taxId.length < 6) return '***'
  return taxId.slice(0, 2) + '****' + taxId.slice(-4)
}

export interface MaskingContext {
  /** Is the viewer a superadmin or sysadmin? */
  isPrivileged: boolean
}

/**
 * Determines whether data should be masked based on context.
 * Data is masked when a privileged user views it.
 */
export function shouldMask(ctx: MaskingContext): boolean {
  // Only mask for privileged roles (superadmin/sysadmin)
  // Regular users see their own org data unmasked
  return ctx.isPrivileged
}

/** Apply masking to a user record fields */
export function maskUserFields<T extends Record<string, unknown>>(
  user: T,
  ctx: MaskingContext,
): T {
  if (!shouldMask(ctx)) return user

  const masked = { ...user } as T & {
    email?: unknown
    full_name?: unknown
    phone?: unknown
    bio?: unknown
    city?: unknown
  }
  if ('email' in masked && typeof masked.email === 'string') masked.email = maskEmail(masked.email) as unknown
  if ('full_name' in masked && typeof masked.full_name === 'string') masked.full_name = maskName(masked.full_name) as unknown
  if ('phone' in masked && typeof masked.phone === 'string') masked.phone = maskPhone(masked.phone) as unknown
  if ('bio' in masked && typeof masked.bio === 'string') masked.bio = '***' as unknown
  if ('city' in masked && typeof masked.city === 'string') masked.city = '***' as unknown
  return masked as T
}
