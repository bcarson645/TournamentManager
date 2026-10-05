export type CovTheme = 'default' | 'light-blue'

/** Accepted stored values — 'dark' is an alias for the dark theme ('default'). */
export type StoredCovTheme = CovTheme | 'dark' | 'light'

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

/** True when the dark theme is active (stored id 'default'). */
export function isCovDarkTheme(theme: CovTheme): boolean {
  return theme === 'default'
}

/** Flip between light and dark. Pure helper so toolbar + section stay in sync. */
export function toggleCovTheme(theme: CovTheme): CovTheme {
  return theme === 'default' ? 'light-blue' : 'default'
}

export function normaliseCovTheme(stored: string | null): CovTheme {
  if (stored === 'default' || stored === 'dark' || stored === 'dark-sharp' || stored === 'accent-blue' || stored === 'high-contrast') return 'default'
  return 'light-blue'
}

export function readStoredCovTheme(): CovTheme {
  if (typeof window === 'undefined') return 'light-blue'
  const stored = localStorage.getItem(COV_THEME_STORAGE_KEY)
  if (stored == null) return 'light-blue'
  if (stored === 'accent-blue' || stored === 'high-contrast' || stored === 'dark-sharp' || stored === 'dark' || stored === 'default') {
    const normalised = normaliseCovTheme(stored)
    if (stored !== normalised) localStorage.setItem(COV_THEME_STORAGE_KEY, normalised)
    return normalised
  }
  if (stored === 'soft-light' || stored === 'light' || stored === 'light-blue') {
    if (stored !== 'light-blue') localStorage.setItem(COV_THEME_STORAGE_KEY, 'light-blue')
    return 'light-blue'
  }
  return 'light-blue'
}

export const COV_FILTERS_COLLAPSED_STORAGE_KEY = 'cov-filters-collapsed'

export function readStoredFiltersCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(COV_FILTERS_COLLAPSED_STORAGE_KEY)
  return stored === '1' || stored === 'true'
}
