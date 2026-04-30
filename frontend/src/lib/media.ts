function getApiOrigin() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

  try {
    return new URL(baseUrl).origin
  } catch {
    return window.location.origin
  }
}

export function resolveMediaUrl(src?: string | null) {
  if (!src) return null
  if (/^https?:\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }
  if (src.startsWith('/')) {
    return `${getApiOrigin()}${src}`
  }
  return `${getApiOrigin()}/${src}`
}

export function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}
