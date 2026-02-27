'use client'

import { useState } from 'react'

const OPTIONS = [
  { key: 'market', label: 'Market Configuration' },
  { key: 'adjusts', label: 'Tournament Adjusts' },
  { key: 'settings', label: 'Tournament Settings' },
  { key: 'integrity', label: 'Integrity Settings' },
] as const

type OptionKey = typeof OPTIONS[number]['key']

export default function TournamentSettings() {
  const [activePage, setActivePage] = useState<OptionKey | null>(null)

  if (activePage) {
    const opt = OPTIONS.find((o) => o.key === activePage)!
    return (
      <div className="settings-panel">
        <div className="settings-page-header">
          <button className="settings-back" onClick={() => setActivePage(null)}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
            Back
          </button>
          <h3 className="settings-page-title">{opt.label}</h3>
        </div>
        <div className="settings-page-body">
          <p className="settings-placeholder-text">Content for {opt.label} will be configured here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-panel">
      <h3 className="settings-heading">Tournament Settings</h3>
      <div className="settings-btn-grid">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className="settings-btn"
            onClick={() => setActivePage(opt.key)}
          >
            <span className="settings-btn-label">{opt.label}</span>
            <svg className="settings-btn-arrow" viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" /></svg>
          </button>
        ))}
      </div>
    </div>
  )
}
