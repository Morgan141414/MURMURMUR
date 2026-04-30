import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useUiStore } from '@/stores/uiStore'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  useEffect(() => {
    try {
      if (localStorage.getItem('saphena-medical-theme-v1') !== 'true') {
        localStorage.setItem('saphena-medical-theme-v1', 'true')
        setTheme('light')
      }
    } catch {
      setTheme('light')
    }
  }, [setTheme])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
    }
  }, [theme])

  return <>{children}</>
}
