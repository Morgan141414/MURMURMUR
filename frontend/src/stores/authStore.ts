import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useContextStore } from '@/stores/contextStore'
import { useOrgStore } from '@/stores/orgStore'

type StorageType = 'local' | 'session'

export type PlatformRole = 'superadmin' | 'admin' | 'tech_support' | 'moderator' | 'accounting' | 'marketing'

interface AuthState {
  token: string | null
  refreshToken: string | null
  userId: string | null
  fullName: string | null
  patronymic: string | null
  email: string | null
  avatarUrl: string | null
  isSuperAdmin: boolean
  platformRole: PlatformRole | null
  isAuthenticated: boolean
  setAuth: (
    token: string,
    refreshToken: string | null,
    user: {
      id: string
      email: string
      full_name: string
      patronymic?: string
      is_superadmin?: boolean
      avatar_url?: string | null
      platform_role?: string | null
    },
    storage?: StorageType,
  ) => void
  setAvatarUrl: (url: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      fullName: null,
      patronymic: null,
      email: null,
      avatarUrl: null,
      isSuperAdmin: false,
      platformRole: null,
      isAuthenticated: false,

      setAuth: (token, refreshToken, user, storage?: StorageType) => {
        if (storage === 'session') {
          sessionStorage.setItem(
            'auth-storage',
            JSON.stringify({ state: { token, refreshToken }, version: 0 }),
          )
        }
        set({
          token,
          refreshToken,
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          patronymic: user.patronymic ?? null,
          avatarUrl: user.avatar_url ?? null,
          isSuperAdmin: user.is_superadmin ?? false,
          platformRole: (user.platform_role as PlatformRole) ?? null,
          isAuthenticated: true,
        })
      },

      setAvatarUrl: (url) => set({ avatarUrl: url }),

      logout: () => {
        localStorage.removeItem('auth-storage')
        sessionStorage.removeItem('auth-storage')
        localStorage.removeItem('org-storage')
        localStorage.removeItem('context-storage')
        sessionStorage.removeItem('org-storage')
        sessionStorage.removeItem('context-storage')
        useOrgStore.getState().clear()
        useContextStore.getState().clear()
        set({
          token: null,
          refreshToken: null,
          userId: null,
          fullName: null,
          patronymic: null,
          email: null,
          avatarUrl: null,
          isSuperAdmin: false,
          platformRole: null,
          isAuthenticated: false,
        })
      },
    }),
    { name: 'auth-storage' },
  ),
)
