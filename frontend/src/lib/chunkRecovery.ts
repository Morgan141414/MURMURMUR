const CHUNK_RECOVERY_KEY = 'qtrix_chunk_recovery'
const RECOVERY_COOLDOWN_MS = 30_000

function extractMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || ''
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : String(message ?? '')
  }
  return ''
}

function isAssetChunkPath(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('/assets/') && normalized.includes('.js')
}

export function isDynamicImportError(error: unknown): boolean {
  const message = extractMessage(error)
  if (!message) return false

  const normalized = message.toLowerCase()
  if (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('loading chunk') ||
    normalized.includes('chunkloaderror')
  ) {
    return true
  }

  return isAssetChunkPath(message)
}

function canReloadNow(): boolean {
  try {
    const raw = sessionStorage.getItem(CHUNK_RECOVERY_KEY)
    if (!raw) return true

    const parsed = JSON.parse(raw) as { at?: number }
    const at = Number(parsed?.at || 0)
    if (!Number.isFinite(at) || at <= 0) return true

    return Date.now() - at > RECOVERY_COOLDOWN_MS
  } catch {
    return true
  }
}

function markReloadAttempt(): void {
  try {
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, JSON.stringify({ at: Date.now() }))
  } catch {
    // ignore storage errors
  }
}

export function recoverFromDynamicImportError(error: unknown): boolean {
  if (!isDynamicImportError(error)) return false
  if (!canReloadNow()) return false

  markReloadAttempt()

  const url = new URL(window.location.href)
  url.searchParams.set('__chunk_recovery', String(Date.now()))
  window.location.replace(url.toString())
  return true
}
