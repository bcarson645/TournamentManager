'use client'

import { useCallback, useEffect, useState } from 'react'

export type OutrightsTheme = 'dark' | 'light'

const STORAGE_KEY = 'tm-outrights-theme'

function resolveInitialTheme(): OutrightsTheme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light'
    }
  } catch {
    /* ignore storage / matchMedia errors and fall back to dark */
  }
  return 'dark'
}

export function useOutrightsTheme() {
  const [theme, setTheme] = useState<OutrightsTheme>('dark')

  useEffect(() => {
    setTheme(resolveInitialTheme())
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore write errors (private mode, blocked storage) */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggle }
}