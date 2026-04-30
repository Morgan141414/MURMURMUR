import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return 'light'
}

interface UiState {
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
}

function normalizeTheme(value: unknown): 'dark' | 'light' {
  return value === 'dark' ? 'dark' : 'light'
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: getSystemTheme(),
      sidebarCollapsed: true,

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
      setTheme: (theme) => set({ theme }),
      setSidebarCollapsed: (collapsed) => {
        try { localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed)) } catch {}
        set({ sidebarCollapsed: collapsed })
      },
      toggleSidebarCollapsed: () =>
        set((state) => {
          const next = !state.sidebarCollapsed
          try { localStorage.setItem('sidebar-collapsed', JSON.stringify(next)) } catch {}
          return { sidebarCollapsed: next }
        }),
    }),
    {
      name: 'ui-storage',
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<UiState>) }
        merged.theme = normalizeTheme(merged.theme)
        // Also honor the dedicated sidebar-collapsed key if present
        try {
          const raw = localStorage.getItem('sidebar-collapsed')
          if (raw !== null) {
            merged.sidebarCollapsed = JSON.parse(raw)
          }
        } catch {}
        return merged
      },
    },
  ),
)

