import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { initIdleLogout } from './lib/idleLogout'
import { recoverFromDynamicImportError } from './lib/chunkRecovery'

function redirectToSecureOrigin() {
  if (typeof window === 'undefined') return
  if (import.meta.env.VITE_FORCE_HTTPS !== 'true') return
  const { protocol, hostname, host, pathname, search, hash } = window.location
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (protocol !== 'http:' || isLocalHost) return
  window.location.replace(`https://${host}${pathname}${search}${hash}`)
}

redirectToSecureOrigin()

window.addEventListener('error', (event) => {
  void recoverFromDynamicImportError(event.error ?? event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  void recoverFromDynamicImportError(event.reason)
})

initIdleLogout()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
