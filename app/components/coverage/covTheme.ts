export type CovTheme = 'default' | 'light' | 'dark-sharp'

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
  { id: 'default', label: 'Default' },
  { id: 'light', label: 'Light' },
  { id: 'dark-sharp', label: 'Dark sharp' },
]

export function readStoredCovTheme(): CovTheme {
  if (typeof window === 'undefined') return 'default'
  const stored = localStorage.getItem(COV_THEME_STORAGE_KEY)
  if (stored === 'accent-blue') {
    localStorage.setItem(COV_THEME_STORAGE_KEY, 'default')
    return 'default'
  }
  if (stored === 'high-contrast') {
    localStorage.setItem(COV_THEME_STORAGE_KEY, 'dark-sharp')
    return 'dark-sharp'
  }
  if (stored === 'soft-light') {
    localStorage.setItem(COV_THEME_STORAGE_KEY, 'light')
    return 'light'
  }
  if (stored === 'light' || stored === 'dark-sharp' || stored === 'default') {
    return stored
  }
  return 'default'
}
