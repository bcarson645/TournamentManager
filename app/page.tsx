'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import AppNavSidebar, { type HomeNavId } from './components/AppNavSidebar'
import CoverageScheduleSection from './components/CoverageScheduleSection'
import {
  applyCovThemeToDocument,
  COV_THEME_STORAGE_KEY,
  readStoredCovTheme,
  type CovTheme,
} from './components/coverage/covTheme'

const PLACEHOLDER_LABELS: Partial<Record<HomeNavId, string>> = {
  'tournament-manager': 'Tournament Manager',
  'prep-assignments': 'Prep assignments',
  outrights: 'Outrights',
  settings: 'Settings',
  'player-team': 'Player and Team Management',
  'custom-bet': 'Custom Bet',
  schedule: 'Schedule',
}

export default function Home() {
  const [homeNav, setHomeNav] = useState<HomeNavId>('coverage')
  const [covTheme, setCovTheme] = useState<CovTheme>('light-blue')

  useEffect(() => {
    setCovTheme(readStoredCovTheme())
  }, [])

  useLayoutEffect(() => {
    if (homeNav !== 'coverage') {
      applyCovThemeToDocument(null)
      return
    }
    applyCovThemeToDocument(covTheme)
  }, [covTheme, homeNav])

  const handleCovThemeChange = useCallback((theme: CovTheme) => {
    setCovTheme(theme)
    localStorage.setItem(COV_THEME_STORAGE_KEY, theme)
  }, [])

  if (homeNav === 'coverage') {
    return (
      <div className="app-home-shell">
        <AppNavSidebar activeId={homeNav} onSelect={setHomeNav} />
        <main className="app-home-main">
          <div className="page app-home-page app-home-page--wide">
            <CoverageScheduleSection
              standalone
              covTheme={covTheme}
              onCovThemeChange={handleCovThemeChange}
            />
          </div>
        </main>
      </div>
    )
  }

  const label = PLACEHOLDER_LABELS[homeNav] ?? homeNav

  return (
    <div className="app-home-shell">
      <AppNavSidebar activeId={homeNav} onSelect={setHomeNav} />
      <main className="app-home-main">
        <div className="page app-home-page app-home-page--wide">
          <div className="nav-placeholder-panel">
            <h1 className="page-heading">{label}</h1>
            <p className="page-sub">Prototype stub — open Coverage Rota for the schedule UI.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
