import { useAuthStore } from '@/stores/authStore'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000

const activityEvents: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
]

let idleTimer: number | null = null
let active = false

function clearIdleTimer() {
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer)
    idleTimer = null
  }
}

function handleIdle() {
  if (!useAuthStore.getState().isAuthenticated) return
  useAuthStore.getState().logout()
  if (!['/login', '/register'].includes(window.location.pathname)) {
    window.location.replace('/login')
  }
}

function resetIdleTimer() {
  if (!active) return
  clearIdleTimer()
  idleTimer = window.setTimeout(handleIdle, IDLE_TIMEOUT_MS)
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    resetIdleTimer()
  }
}

function start() {
  if (active) return
  active = true
  for (const event of activityEvents) {
    window.addEventListener(event, resetIdleTimer, { passive: true })
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  resetIdleTimer()
}

function stop() {
  if (!active) return
  active = false
  for (const event of activityEvents) {
    window.removeEventListener(event, resetIdleTimer)
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
  clearIdleTimer()
}

export function initIdleLogout() {
  const { isAuthenticated } = useAuthStore.getState()
  if (isAuthenticated) start()

  useAuthStore.subscribe((state) => {
    if (state.isAuthenticated) start()
    else stop()
  })
}
