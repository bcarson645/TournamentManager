'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { FORMATS, GENDERS } from '../data/tournaments'
import {
  evaluateOutrightAlerts,
  getOutrightAlertsStoreVersion,
  subscribeOutrightAlertsStore,
} from '../data/outrightAlertsStore'
import type { TournamentOutright } from '../data/outrightsStore'
import type { OutrightsTournamentEntry } from '../hooks/useOutrightsTournaments'
import OutrightsAlertsPanel from './OutrightsAlertsPanel'
import { summarizeOutrightAlerts } from './OutrightsAllTournamentsOverview'

interface OutrightsTournamentAlertsViewProps {
  entry: OutrightsTournamentEntry
  outrights: TournamentOutright[]
  onBack: () => void
}

/**
 * Dedicated per-tournament alerts page. This is the single place for a
 * tournament's live alerts + alert rule configuration — alerts no longer
 * render inside the Outrights settings menus.
 */
export default function OutrightsTournamentAlertsView({
  entry,
  outrights,
  onBack,
}: OutrightsTournamentAlertsViewProps) {
  useSyncExternalStore(subscribeOutrightAlertsStore, getOutrightAlertsStoreVersion, getOutrightAlertsStoreVersion)

  const summary = useMemo(
    () => summarizeOutrightAlerts(evaluateOutrightAlerts(entry.tournament.id, outrights)),
    [entry.tournament.id, outrights],
  )

  const fmt = FORMATS.find((f) => f.key === entry.format)
  const gen = GENDERS.find((g) => g.key === entry.gender)

  return (
    <div className="outrights-overview outrights-tournament-alerts-view">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <h1 className="dashboard-title">Alerts — {entry.tournament.name}</h1>
            <div className="dashboard-breadcrumb">
              {fmt?.label ?? entry.format} › {gen?.label ?? entry.gender}
              {entry.tournament.country ? ` › ${entry.tournament.country}` : ''}
              {summary.total > 0
                ? ` — ${summary.total} active (${summary.warning} needing attention)`
                : ' — no active alerts'}
            </div>
          </div>
          <div className="outrights-market-header-actions">
            <button type="button" className="outrights-action-btn outrights-action-btn-sm" onClick={onBack}>
              ← Back to {entry.tournament.name}
            </button>
          </div>
        </div>
      </div>

      <section className="tournament-section-panel outrights-tournament-alerts-panel">
        <h2 className="tournament-section-head">Tournament alerts</h2>
        <div className="tournament-section-body">
          <OutrightsAlertsPanel
            tournamentId={entry.tournament.id}
            tournamentName={entry.tournament.name}
            outrights={outrights}
          />
        </div>
      </section>
    </div>
  )
}
