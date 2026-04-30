import { useEffect, useRef } from 'react'
import { getMe } from '@/api/profile'

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Periodically pings the backend to keep the session alive.
 * Also pings when the tab regains focus after being hidden.
 */
export function useSessionKeepAlive() {
  const lastPingRef = useRef(Date.now())

  useEffect(() => {
    async function ping() {
      try {
        await getMe()
        lastPingRef.current = Date.now()
      } catch {
        // token expired or network error — handled by axios interceptor
      }
    }

    const interval = setInterval(() => {
      ping()
    }, KEEP_ALIVE_INTERVAL)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastPingRef.current
        if (elapsed > KEEP_ALIVE_INTERVAL) {
          ping()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
