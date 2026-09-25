'use client'

import { useState } from 'react'
import AppNavSidebar, { type HomeNavId } from './components/AppNavSidebar'
import CoverageScheduleSection from './components/CoverageScheduleSection'

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

  if (homeNav === 'coverage') {
    return (
      <div className="app-home-shell">
        <AppNavSidebar activeId={homeNav} onSelect={setHomeNav} />
        <main className="app-home-main">
          <div className="page app-home-page app-home-page--wide">
            <CoverageScheduleSection standalone />
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
