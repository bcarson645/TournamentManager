export type CovTheme = 'default' | 'light-blue'

export const COV_THEME_STORAGE_KEY = 'cov-theme'

/** Apply or clear coverage theme on document root (required for html[data-cov-theme] CSS). */
export function applyCovThemeToDocument(theme: CovTheme | null): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme == null) {
    root.removeAttribute('data-cov-theme')
    document.body.removeAttribute('data-cov-theme')
    return
  }
  root.setAttribute('data-cov-theme', theme)
  document.body.setAttribute('data-cov-theme', theme)
}

export const COV_THEME_OPTIONS: { id: CovTheme; label: string }[] = [
  { id: 'light-blue', label: 'Light blue' },
  { id: 'default', label: 'Dark mode' },
]

export function readStoredCovTheme(): CovTheme {
  if (typeof window === 'undefined') return 'light-blue'
  const stored = localStorage.getItem(COV_THEME_STORAGE_KEY)
  if (stored === 'accent-blue' || stored === 'high-contrast' || stored === 'dark-sharp') {
    localStorage.setItem(COV_THEME_STORAGE_KEY, 'default')
    return 'default'
  }
  if (stored === 'soft-light' || stored === 'light') {
    localStorage.setItem(COV_THEME_STORAGE_KEY, 'light-blue')
    return 'light-blue'
  }
  if (stored === 'light-blue' || stored === 'default') {
    return stored
  }
  return 'light-blue'
}
