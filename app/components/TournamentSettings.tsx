'use client'

import { useState, useEffect } from 'react'
import {
  getTournamentOptions,
  setTournamentImpactSubEnabled,
  resetTournamentOptionsToDefaults,
} from '../data/tournamentOptions'
import { TEAMS } from '../data/teams'
import { clearPersistedSquadsForTournament } from '../data/squadStore'
import { clearTeamLogos } from '../data/logoStore'

const OPTIONS = [
  { key: 'market', label: 'Market Configuration' },
  { key: 'adjusts', label: 'Tournament Adjusts' },
  { key: 'settings', label: 'Tournament Settings' },
  { key: 'integrity', label: 'Integrity Settings' },
] as const

type OptionKey = (typeof OPTIONS)[number]['key']

interface TournamentSettingsProps {
  tournamentId: string
  tournamentName: string
}

export default function TournamentSettings({ tournamentId, tournamentName }: TournamentSettingsProps) {
  const [activePage, setActivePage] = useState<OptionKey | null>(null)
  const [impactSubEnabled, setImpactSubEnabled] = useState(false)

  useEffect(() => {
    setImpactSubEnabled(getTournamentOptions(tournamentId).impactSubEnabled)
  }, [tournamentId])

  function handleResetTournamentToPredefined() {
    const n = TEAMS[tournamentId]?.length ?? 0
    const ok = window.confirm(
      `Reset "${tournamentName}" to predefined?\n\n` +
        `This removes saved data for all ${n} team${n === 1 ? '' : 's'} in this tournament: squads (XI, bench, impact), home ground picks, and uploaded logos. Tournament options (e.g. Impact sub) go back to defaults. This cannot be undone.`,
    )
    if (!ok) return
    const ids = (TEAMS[tournamentId] ?? []).map((t) => t.id)
    clearTeamLogos(ids)
    resetTournamentOptionsToDefaults(tournamentId)
    clearPersistedSquadsForTournament(tournamentId)
    setImpactSubEnabled(false)
  }

  if (activePage) {
    const opt = OPTIONS.find((o) => o.key === activePage)!

    return (
      <div className="settings-panel">
        <div className="settings-page-header">
          <button className="settings-back" onClick={() => setActivePage(null)}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
            Back
          </button>
          <h3 className="settings-page-title">{opt.label}</h3>
        </div>
        <div className="settings-page-body">
          {activePage === 'settings' ? (
            <div className="settings-tournament-form">
              <p className="settings-lead">Options for {tournamentName}</p>
              <label className="settings-toggle-row">
                <input
                  type="checkbox"
                  checked={impactSubEnabled}
                  onChange={(e) => {
                    const v = e.target.checked
                    setImpactSubEnabled(v)
                    setTournamentImpactSubEnabled(tournamentId, v)
                  }}
                />
                <span>
                  <strong>Impact sub / Impact player</strong>
                </span>
              </label>

              <div className="settings-reset-section">
                <h4 className="settings-reset-title">Reset tournament</h4>
                <p className="settings-reset-hint">
                  Restore predefined squads from the app data, clear saved grounds and custom logos for every
                  team here, and reset options above to defaults.
                </p>
                <button
                  type="button"
                  className="settings-reset-btn"
                  onClick={handleResetTournamentToPredefined}
                >
                  Hard reset to predefined
                </button>
              </div>
            </div>
          ) : (
            <p className="settings-placeholder-text">Content for {opt.label} will be configured here.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="settings-panel">
      <h3 className="settings-heading">Tournament Settings</h3>
      <div className="settings-btn-grid">
        {OPTIONS.map((opt) => (
          <button key={opt.key} className="settings-btn" onClick={() => setActivePage(opt.key)}>
            <span className="settings-btn-label">{opt.label}</span>
            <svg className="settings-btn-arrow" viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
