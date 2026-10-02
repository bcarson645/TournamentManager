'use client'

import type { OutrightsTheme } from '../hooks/useOutrightsTheme'

interface OutrightsThemeToggleProps {
  theme: OutrightsTheme
  onToggle: () => void
  className?: string
}

export default function OutrightsThemeToggle({ theme, onToggle, className }: OutrightsThemeToggleProps) {
  const isLight = theme === 'light'
  return (
    <button
      type="button"
      className={'outrights-theme-toggle' + (className ? ` ${className}` : '')}
      onClick={onToggle}
      aria-pressed={isLight}
      aria-label={isLight ? 'Switch Outrights to dark theme' : 'Switch Outrights to light theme'}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      <span className="outrights-theme-toggle-icon" aria-hidden="true">
        {isLight ? '☀' : '☾'}
      </span>
      <span className="outrights-theme-toggle-label">{isLight ? 'Light' : 'Dark'}</span>
    </button>
  )
}