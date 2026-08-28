'use client'

import { useEffect, useMemo, useState } from 'react'
import { FORMATS, GENDERS } from '../data/tournaments'
import {
  getOutrightsForTournament,
  OUTRIGHTS_CHANGE_EVENT,
  OUTRIGHT_TYPES,
  type TournamentOutright,
} from '../data/outrightsStore'
import type { OutrightsTournamentEntry } from '../hooks/useOutrightsTournaments'

interface OutrightsAllTournamentsOverviewProps {
  tournaments: OutrightsTournamentEntry[]
  onSelectTournament: (entry: OutrightsTournamentEntry) => void
}

function countByStatus(outrights: TournamentOutright[]) {
  let active = 0
  let suspended = 0
  let settled = 0
  let inactive = 0
  for (const o of outrights) {
    const status = o.status ?? 'inactive'
    if (status === 'published') active++
    else if (status === 'suspended') suspended++
    else if (status === 'settled') settled++
    else inactive++
  }
  return { active, suspended, settled, inactive }
}

export default function OutrightsAllTournamentsOverview({
  tournaments,
  onSelectTournament,
}: OutrightsAllTournamentsOverviewProps) {
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const onChange = () => setRefreshTick((t) => t + 1)
    window.addEventListener(OUTRIGHTS_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(OUTRIGHTS_CHANGE_EVENT, onChange)
  }, [])

  const rows = useMemo(() => {
    void refreshTick
    return tournaments.map((entry) => {
      const outrights = getOutrightsForTournament(entry.tournament.id)
      const counts = countByStatus(outrights)
      return { entry, outrights, ...counts, marketCount: outrights.length }
    })
  }, [tournaments, refreshTick])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        markets: acc.markets + row.marketCount,
        active: acc.active + row.active,
        suspended: acc.suspended + row.suspended,
        settled: acc.settled + row.settled,
        inactive: acc.inactive + row.inactive,
      }),
      { markets: 0, active: 0, suspended: 0, settled: 0, inactive: 0 },
    )
  }, [rows])

  return (
    <div className="outrights-overview outrights-all-tournaments">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <h1 className="dashboard-title">Outrights</h1>
            <div className="dashboard-breadcrumb">All tournaments — markets & pricing overview</div>
          </div>
        </div>
      </div>

      <div className="outrights-metric-strip">
        <div className="outrights-metric-pill">
          <span className="outrights-metric-value">{tournaments.length}</span>
          <span className="outrights-metric-label">Tournaments</span>
        </div>
        <div className="outrights-metric-pill">
          <span className="outrights-metric-value">{totals.markets}</span>
          <span className="outrights-metric-label">Markets</span>
        </div>
        <div className="outrights-metric-pill outrights-metric-pill--active">
          <span className="outrights-metric-value">{totals.active}</span>
          <span className="outrights-metric-label">Active</span>
        </div>
        <div className="outrights-metric-pill outrights-metric-pill--suspended">
          <span className="outrights-metric-value">{totals.suspended}</span>
          <span className="outrights-metric-label">Suspended</span>
        </div>
        <div className="outrights-metric-pill outrights-metric-pill--settled">
          <span className="outrights-metric-value">{totals.settled}</span>
          <span className="outrights-metric-label">Settled</span>
        </div>
      </div>

      <section className="tournament-section-panel outrights-all-tournaments-panel">
        <h2 className="tournament-section-head">Tournament overview</h2>
        <div className="tournament-section-body">
          <div className="teams-table-wrap outrights-grid-table-wrap">
            <table className="teams-table outrights-overview-table outrights-all-tournaments-table outrights-grid-table">
              <thead>
                <tr>
                  <th className="outrights-all-th-tournament">Tournament</th>
                  <th className="outrights-all-th-format">Format</th>
                  <th className="outrights-all-th-markets">Markets</th>
                  <th className="outrights-all-th-active">Active</th>
                  <th className="outrights-all-th-suspended">Suspended</th>
                  <th className="outrights-all-th-settled">Settled</th>
                  <th className="outrights-all-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const fmt = FORMATS.find((f) => f.key === row.entry.format)!
                  const gen = GENDERS.find((g) => g.key === row.entry.gender)!
                  const maxMarkets = OUTRIGHT_TYPES.length
                  const marketsLabel =
                    row.marketCount === 0
                      ? 'None yet'
                      : `${row.marketCount}/${maxMarkets}`

                  return (
                    <tr key={`${row.entry.tournament.id}-${row.entry.format}-${row.entry.gender}`}>
                      <td className="outrights-all-tournament-cell">
                        <button
                          type="button"
                          className="outrights-all-tournament-link"
                          onClick={() => onSelectTournament(row.entry)}
                        >
                          <span className="outrights-all-tournament-name">{row.entry.tournament.name}</span>
                          {row.entry.tournament.country ? (
                            <span className="outrights-all-tournament-meta">{row.entry.tournament.country}</span>
                          ) : null}
                        </button>
                      </td>
                      <td className="outrights-all-format-cell">
                        {fmt.label} · {gen.label}
                      </td>
                      <td className="outrights-all-markets-cell">{marketsLabel}</td>
                      <td className="outrights-all-active-cell">
                        {row.active > 0 ? (
                          <span className="outrights-all-count outrights-all-count--active">{row.active}</span>
                        ) : (
                          <span className="outrights-all-count-muted">—</span>
                        )}
                      </td>
                      <td className="outrights-all-suspended-cell">
                        {row.suspended > 0 ? (
                          <span className="outrights-all-count outrights-all-count--suspended">{row.suspended}</span>
                        ) : (
                          <span className="outrights-all-count-muted">—</span>
                        )}
                      </td>
                      <td className="outrights-all-settled-cell">
                        {row.settled > 0 ? (
                          <span className="outrights-all-count outrights-all-count--settled">{row.settled}</span>
                        ) : (
                          <span className="outrights-all-count-muted">—</span>
                        )}
                      </td>
                      <td className="outrights-all-actions-cell">
                        <button
                          type="button"
                          className="outrights-action-btn outrights-action-btn-sm"
                          onClick={() => onSelectTournament(row.entry)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
