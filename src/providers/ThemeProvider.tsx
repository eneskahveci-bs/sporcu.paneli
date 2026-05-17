'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'
type ThemeMode = 'auto' | 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  toggleTheme: () => void
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  mode: 'auto',
  toggleTheme: () => {},
  setMode: () => {},
})

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): Theme {
  if (mode === 'auto') return getSystemTheme()
  return mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto')
  const [theme, setTheme] = useState<Theme>('dark')

  const apply = useCallback((t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null
    const savedTheme = localStorage.getItem('theme') as Theme | null

    let initialMode: ThemeMode
    if (savedMode === 'auto' || savedMode === 'dark' || savedMode === 'light') {
      initialMode = savedMode
    } else if (savedTheme === 'dark' || savedTheme === 'light') {
      initialMode = savedTheme
    } else {
      initialMode = 'auto'
    }
    setModeState(initialMode)
    apply(resolveTheme(initialMode))
  }, [apply])

  useEffect(() => {
    if (mode !== 'auto' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode, apply])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem('theme-mode', m)
    const next = resolveTheme(m)
    apply(next)
    localStorage.setItem('theme', next)
  }, [apply])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setMode(next)
  }, [theme, setMode])

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
