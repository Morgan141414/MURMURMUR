import axios from 'axios'
import { translateApiErrorDetail } from '@/lib/apiErrorTranslations'
import { useAuthStore } from '@/stores/authStore'

const messengerApi = axios.create({
  baseURL: import.meta.env.VITE_MESSENGER_API_BASE_URL || '/messenger-api/api/v1',
  timeout: 15000,
  withCredentials: true,
})

messengerApi.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

messengerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (axios.isAxiosError(error) && error.response?.status === 401 && !originalRequest._retry) {
      const raw = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage')
      let refreshToken
      try {
        if (raw) refreshToken = JSON.parse(raw)?.state?.refreshToken
      } catch {}
      if (!refreshToken) {
        localStorage.removeItem('auth-storage')
        sessionStorage.removeItem('auth-storage')
        useAuthStore.getState().logout()
        if (!['/login', '/register'].includes(window.location.pathname)) window.location.replace('/login')
        return Promise.reject(error)
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(messengerApi(originalRequest))
            },
            reject,
          })
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true },
        )
        const storageKey = 'auth-storage'
        const storage = localStorage.getItem(storageKey) ? localStorage : sessionStorage
        const existing = JSON.parse(storage.getItem(storageKey) || '{}')
        existing.state = { ...existing.state, token: data.access_token, refreshToken: data.refresh_token }
        storage.setItem(storageKey, JSON.stringify(existing))
        useAuthStore.setState((state) => ({ ...state, token: data.access_token, refreshToken: data.refresh_token, isAuthenticated: true }))
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        return messengerApi(originalRequest)
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
      if (translatedDetail !== detail) error.response.data.detail = translatedDetail
    }
    if (error.response?.headers?.['x-session-expired'] === 'true') {
      localStorage.removeItem('auth-storage')
      sessionStorage.removeItem('auth-storage')
      window.location.href = '/login?reason=session_expired'
      return Promise.reject(error)
    }
    return Promise.reject(error)
  },
)

export default messengerApi
