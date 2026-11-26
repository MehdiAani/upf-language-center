'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'upf-theme'
const THEME_EVENT = 'upf-theme-change'

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(THEME_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function getSnapshot(): 'light' | 'dark' {
  return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light'
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function handleToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}