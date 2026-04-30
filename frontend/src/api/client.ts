import axios from 'axios'
import { translateApiErrorDetail } from '@/lib/apiErrorTranslations'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  withCredentials: true, // Send cookies with requests
})

api.interceptors.request.use((config) => {
  try {
    // Read token from auth-store (set at login/refresh time)
    // Tokens are stored in memory in authStore, not persisted to localStorage
    const raw = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      const token: string | undefined = parsed?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch {
    // ignore malformed storage
  }
  return config
})

// Refresh token logic: on 401, try to refresh before logging out
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      // Try refresh token - read from cookies (via auth-store)
      const raw = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage')
      let refreshToken: string | undefined
      try {
        if (raw) {
          const parsed = JSON.parse(raw)
          refreshToken = parsed?.state?.refreshToken
        }
      } catch {
        // ignore
      }

      if (!refreshToken) {
        // No refresh token — full logout
        localStorage.removeItem('auth-storage')
        sessionStorage.removeItem('auth-storage')
        useAuthStore.getState().logout()
        if (!['/login', '/register'].includes(window.location.pathname)) window.location.replace('/login')
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Refresh via API - backend will also set HttpOnly cookies
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true },
        )

        // Update auth-store with new tokens (but don't persist to localStorage/sessionStorage for security)
        // The tokens are also set as HttpOnly cookies by the backend
        const storageKey = 'auth-storage'
        const storage = localStorage.getItem(storageKey) ? localStorage : sessionStorage
        const existing = JSON.parse(storage.getItem(storageKey) || '{}')
        existing.state = {
          ...existing.state,
          token: data.access_token,
          refreshToken: data.refresh_token,
        }
        storage.setItem(storageKey, JSON.stringify(existing))
        useAuthStore.setState((state) => ({
          ...state,
          token: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
        }))

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('auth-storage')
        sessionStorage.removeItem('auth-storage')
        useAuthStore.getState().logout()
        if (!['/login', '/register'].includes(window.location.pathname)) window.location.replace('/login')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    const detail = error?.response?.data?.detail
    if (typeof detail === 'string') {
      const translatedDetail = translateApiErrorDetail(detail)
      if (translatedDetail !== detail) {
        error.response.data.detail = translatedDetail
      }
    }

    // Single-device: if another device logged in, force re-login
    if (error.response?.headers?.['x-session-expired'] === 'true') {
      localStorage.removeItem('auth-storage')
      sessionStorage.removeItem('auth-storage')
      window.location.href = '/login?reason=session_expired'
      return Promise.reject(error)
    }
    return Promise.reject(error)
  },
)

export default api
