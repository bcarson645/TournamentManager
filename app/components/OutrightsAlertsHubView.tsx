'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { FORMATS, GENDERS } from '../data/tournaments'
import {
  getOutrightsForTournament,
  OUTRIGHTS_CHANGE_EVENT,
} from '../data/outrightsStore'
import {
  evaluateOutrightAlerts,
  getOutrightAlertsStoreVersion,
  subscribeOutrightAlertsStore,
  type OutrightAlert,
} from '../data/outrightAlertsStore'
import type { OutrightsTournamentEntry } from '../hooks/useOutrightsTournaments'
import {
  summarizeOutrightAlerts,
  type OutrightAlertSummary,
} from './OutrightsAllTournamentsOverview'

interface OutrightsAlertsHubViewProps {
  tournaments: OutrightsTournamentEntry[]
  onBack: () => void
  onOpenTournamentAlerts: (entry: OutrightsTournamentEntry) => void
}

interface TournamentAlertRow {
  entry: OutrightsTournamentEntry
  alerts: OutrightAlert[]
  summary: OutrightAlertSummary
}

const PREVIEW_LIMIT = 3

export default function OutrightsAlertsHubView({
  tournaments,
  onBack,
  onOpenTournamentAlerts,
}: OutrightsAlertsHubViewProps) {
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const onChange = () => setRefreshTick((t) => t + 1)
    window.addEventListener(OUTRIGHTS_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(OUTRIGHTS_CHANGE_EVENT, onChange)
  }, [])

  useSyncExternalStore(subscribeOutrightAlertsStore, getOutrightAlertsStoreVersion, getOutrightAlertsStoreVersion)

  const rows = useMemo<TournamentAlertRow[]>(() => {
    void refreshTick
    const built = tournaments.map((entry) => {
      const outrights = getOutrightsForTournament(entry.tournament.id)
      const alerts = evaluateOutrightAlerts(entry.tournament.id, outrights)
      return { entry, alerts, summary: summarizeOutrightAlerts(alerts) }
    })
    return built.sort((a, b) => {
      if ((b.summary.warning - a.summary.warning) !== 0) return b.summary.warning - a.summary.warning
      return b.summary.total - a.summary.total
    })
  }, [tournaments, refreshTick])

  const totals = useMemo(() => {
    return rows.reduce<OutrightAlertSummary>(
      (acc, row) => ({
        total: acc.total + row.summary.total,
        warning: acc.warning + row.summary.warning,
        info: acc.info + row.summary.info,
        missing: acc.missing + row.summary.missing,
        overround: acc.overround + row.summary.overround,
        modelled: acc.modelled + row.summary.modelled,
        bet365: acc.bet365 + row.summary.bet365,
      }),
      { total: 0, warning: 0, info: 0, missing: 0, overround: 0, modelled: 0, bet365: 0 },
    )
  }, [rows])

  return (
    <div className="outrights-overview outrights-alerts-hub">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <h1 className="dashboard-title">Alerts</h1>
            <div className="dashboard-breadcrumb">
              Outrights › Active alerts across all tournaments
              {totals.total > 0 ? ` — ${totals.total} active (${totals.warning} needing attention)` : ' — none active'}
            </div>
          </div>
          <div className="outrights-market-header-actions">
            <button type="button" className="outrights-action-btn outrights-action-btn-sm" onClick={onBack}>
              ← All tournaments
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <section className="tournament-section-panel outrights-alerts-hub-panel">
          <div className="tournament-section-body">
            <p className="outrights-content-empty">No tournaments with outrights enabled.</p>
          </div>
        </section>
      ) : totals.total === 0 ? (
        <section className="tournament-section-panel outrights-alerts-hub-panel">
          <div className="tournament-section-body">
            <p className="outrights-content-empty">
              No active alerts across {rows.length} {rows.length === 1 ? 'tournament' : 'tournaments'} — all markets are within thresholds.
            </p>
          </div>
        </section>
      ) : (
        <section className="tournament-section-panel outrights-alerts-hub-panel">
          <h2 className="tournament-section-head">Alerts by tournament</h2>
          <div className="tournament-section-body">
            <ul className="outrights-alerts-hub-list">
              {rows.map((row) => {
                const fmt = FORMATS.find((f) => f.key === row.entry.format)!
                const gen = GENDERS.find((g) => g.key === row.entry.gender)!
                const preview = row.alerts.slice(0, PREVIEW_LIMIT)
                const remaining = row.alerts.length - preview.length
                const healthy = row.summary.total === 0
                return (
                  <li
                    key={`${row.entry.tournament.id}-${row.entry.format}-${row.entry.gender}`}
                    className={'outrights-alerts-hub-item' + (healthy ? ' outrights-alerts-hub-item--healthy' : '')}
                  >
                    <div className="outrights-alerts-hub-item-main">
                      <div className="outrights-alerts-hub-item-head">
                        <span className="outrights-alerts-hub-tournament">{row.entry.tournament.name}</span>
                        <span className="outrights-alerts-hub-meta">
                          {fmt.label} · {gen.label}
                          {row.entry.tournament.country ? ` · ${row.entry.tournament.country}` : ''}
                        </span>
                      </div>
                      {healthy ? (
                        <p className="outrights-alerts-hub-healthy">No active alerts</p>
                      ) : (
                        <>
                          <div className="outrights-alerts-summary-chips outrights-alerts-hub-chips">
                            {row.summary.missing > 0 ? (
                              <span className="outrights-alert-chip outrights-alert-chip--missing">Missing prices · {row.summary.missing}</span>
                            ) : null}
                            {row.summary.overround > 0 ? (
                              <span className="outrights-alert-chip outrights-alert-chip--overround">Overround · {row.summary.overround}</span>
                            ) : null}
                            {row.summary.modelled > 0 ? (
                              <span className="outrights-alert-chip outrights-alert-chip--modelled">Modelled drift · {row.summary.modelled}</span>
                            ) : null}
                            {row.summary.bet365 > 0 ? (
                              <span className="outrights-alert-chip outrights-alert-chip--bet365">Bet365 drift · {row.summary.bet365}</span>
                            ) : null}
                          </div>
                          <ul className="outrights-alerts-hub-preview">
                            {preview.map((alert) => (
                              <li key={alert.id} className={`outrights-alerts-hub-preview-item outrights-alerts-hub-preview-item--${alert.severity}`}>
                                <span className="outrights-alert-market">{alert.marketLabel}</span>
                                <span className="outrights-alert-message">{alert.message}</span>
                              </li>
                            ))}
                          </ul>
                          {remaining > 0 ? (
                            <p className="outrights-alerts-hub-more">+{remaining} more</p>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="outrights-alerts-hub-item-side">
                      <span
                        className={'outrights-alerts-hub-count' + (healthy ? ' outrights-alerts-hub-count--healthy' : '')}
                        aria-label={`${row.summary.total} active alerts for ${row.entry.tournament.name}`}
                      >
                        {row.summary.total}
                      </span>
                      <button
                        type="button"
                        className="outrights-action-btn outrights-action-btn-sm outrights-action-btn-primary"
                        onClick={() => onOpenTournamentAlerts(row.entry)}
                        aria-label={`Open alerts for ${row.entry.tournament.name} — ${row.summary.total} active alerts`}
                      >
                        Open alerts
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
