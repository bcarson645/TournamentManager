'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
import { OutrightsSettingsPopover } from './OutrightsTournamentSettings'

interface OutrightsTournamentAlertsViewProps {
  entry: OutrightsTournamentEntry
  outrights: TournamentOutright[]
  onBack: () => void
}

/**
 * Dedicated per-tournament alerts page: live alerts only.
 * Rule configuration opens from the header settings icon as an overlay.
 */
export default function OutrightsTournamentAlertsView({
  entry,
  outrights,
  onBack,
}: OutrightsTournamentAlertsViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)

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
              {fmt?.label ?? entry.format} · {gen?.label ?? entry.gender}
              {entry.tournament.country ? ` · ${entry.tournament.country}` : ''}
              {summary.total > 0
                ? ` — ${summary.total} active (${summary.warning} needing attention)`
                : ' — no active alerts'}
            </div>
          </div>
          <div className="outrights-market-header-actions">
            <div className="outrights-alerts-settings-anchor">
              <button
                type="button"
                ref={settingsBtnRef}
                className={'outrights-action-btn outrights-action-btn-sm outrights-alerts-settings-btn' + (settingsOpen ? ' outrights-action-btn-primary' : '')}
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="Open alerts settings"
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                title="Alerts settings"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
              {settingsOpen ? (
                <OutrightsSettingsPopover
                  title="Alerts settings"
                  ariaLabel={`Alerts settings for ${entry.tournament.name}`}
                  onClose={() => setSettingsOpen(false)}
                  anchorRef={settingsBtnRef}
                  placement="below"
                >
                  <OutrightsAlertsPanel
                    tournamentId={entry.tournament.id}
                    tournamentName={entry.tournament.name}
                    outrights={outrights}
                    mode="config"
                  />
                </OutrightsSettingsPopover>
              ) : null}
            </div>
            <button type="button" className="outrights-action-btn outrights-action-btn-sm" onClick={onBack}>
              ← Back to {entry.tournament.name}
            </button>
          </div>
        </div>
      </div>

      <section className="tournament-section-panel outrights-tournament-alerts-panel">
        <h2 className="tournament-section-head">Active alerts</h2>
        <div className="tournament-section-body">
          <OutrightsAlertsPanel
            tournamentId={entry.tournament.id}
            tournamentName={entry.tournament.name}
            outrights={outrights}
            mode="live"
          />
        </div>
      </section>
    </div>
  )
}
