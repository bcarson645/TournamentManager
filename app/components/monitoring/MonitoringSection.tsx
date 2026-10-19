'use client'

import { useMemo, useState } from 'react'
import {
  MONITORING_ALERTS,
  MONITORING_COMPETITIONS,
  MONITORING_FIXTURES,
  fixtureStatusLabel,
  type MonitoringFixture,
} from '../../data/monitoringDemoData'

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MonitoringSection() {
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [sportOpen, setSportOpen] = useState(true)
  const [selectedCompetitions, setSelectedCompetitions] = useState<Set<string>>(
    () => new Set(MONITORING_COMPETITIONS.map((c) => c.id)),
  )
  const [expandedFixtureId, setExpandedFixtureId] = useState<string | null>(null)
  const [focusedFixtureId, setFocusedFixtureId] = useState<string | null>(null)

  const filteredFixtures = useMemo(() => {
    const q = search.trim().toLowerCase()
    return MONITORING_FIXTURES.filter((f) => {
      if (!selectedCompetitions.has(f.competitionId)) return false
      if (dateFilter && f.date !== dateFilter) return false
      if (!q) return true
      const hay = `${f.homeTeam} ${f.awayTeam} ${f.competitionLabel}`.toLowerCase()
      return hay.includes(q)
    })
  }, [search, dateFilter, selectedCompetitions])

  const visibleAlerts = useMemo(() => {
    const ids = new Set(filteredFixtures.map((f) => f.id))
    return MONITORING_ALERTS.filter((a) => ids.has(a.fixtureId))
  }, [filteredFixtures])

  function toggleCompetition(id: string) {
    setSelectedCompetitions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectFixtureFromTree(fixtureId: string) {
    setFocusedFixtureId(fixtureId)
    setExpandedFixtureId(fixtureId)
  }

  return (
    <div className="monitoring-root">
      <header className="monitoring-topbar">
        <div className="monitoring-topbar-title">
          <span className="monitoring-topbar-product">Trading UI</span>
          <span className="monitoring-topbar-sep">/</span>
          <span className="monitoring-topbar-page">Monitoring</span>
        </div>
        <span className="monitoring-topbar-meta">Cricket · demo data</span>
      </header>

      <div className="monitoring-shell">
        <aside className="monitoring-left" aria-label="Fixture tree">
          <div className="monitoring-left-search">
            <input
              type="search"
              className="monitoring-search-input"
              placeholder="Search fixtures…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search fixtures"
            />
          </div>
          <div className="monitoring-date-filter">
            <label className="monitoring-date-label">
              <span>Date</span>
              <input
                type="date"
                className="monitoring-date-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>
            {dateFilter ? (
              <button
                type="button"
                className="monitoring-date-clear"
                onClick={() => setDateFilter('')}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="monitoring-tree">
            <button
              type="button"
              className="monitoring-tree-sport"
              onClick={() => setSportOpen((o) => !o)}
              aria-expanded={sportOpen}
            >
              <span className="monitoring-cricket-icon" aria-hidden>🏏</span>
              <span className="monitoring-tree-sport-label">Cricket</span>
              <span className="monitoring-tree-chevron">{sportOpen ? '▾' : '▸'}</span>
            </button>
            {sportOpen ? (
              <ul className="monitoring-tree-list">
                {MONITORING_COMPETITIONS.map((comp) => (
                  <li key={comp.id} className="monitoring-tree-comp">
                    <label className="monitoring-tree-comp-row">
                      <input
                        type="checkbox"
                        checked={selectedCompetitions.has(comp.id)}
                        onChange={() => toggleCompetition(comp.id)}
                      />
                      <span className="monitoring-tree-comp-name">{comp.label}</span>
                      <span className="monitoring-tree-count">({comp.fixtureCount})</span>
                    </label>
                    <ul className="monitoring-tree-fixtures">
                      {MONITORING_FIXTURES.filter((f) => f.competitionId === comp.id).map((f) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            className={
                              'monitoring-tree-fixture-btn' +
                              (focusedFixtureId === f.id ? ' monitoring-tree-fixture-btn--active' : '')
                            }
                            onClick={() => selectFixtureFromTree(f.id)}
                          >
                            <span className="monitoring-tree-fixture-teams">
                              {f.homeTeam} v {f.awayTeam}
                            </span>
                            <span className="monitoring-tree-fixture-meta">
                              {formatDisplayDate(f.date)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>

        <section className="monitoring-center" aria-label="Fixtures">
          <div className="monitoring-center-head">
            <h2 className="monitoring-center-title">Fixtures</h2>
            <span className="monitoring-center-count">{filteredFixtures.length} shown</span>
          </div>

          {filteredFixtures.length === 0 ? (
            <p className="monitoring-empty">No fixtures match your filters.</p>
          ) : (
            <div className="monitoring-fixture-list">
              {filteredFixtures.map((f) => (
                <FixtureRow
                  key={f.id}
                  fixture={f}
                  expanded={expandedFixtureId === f.id}
                  highlighted={focusedFixtureId === f.id}
                  onToggle={() =>
                    setExpandedFixtureId((id) => (id === f.id ? null : f.id))
                  }
                  onFocus={() => setFocusedFixtureId(f.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="monitoring-right" aria-label="Alerts and information">
          <h2 className="monitoring-right-title">Alerts &amp; info</h2>
          <div className="monitoring-alerts">
            {visibleAlerts.length === 0 ? (
              <p className="monitoring-empty monitoring-empty--compact">No alerts for visible fixtures.</p>
            ) : (
              visibleAlerts.map((a) => {
                const fx = MONITORING_FIXTURES.find((f) => f.id === a.fixtureId)
                return (
                  <article
                    key={a.id}
                    className={`monitoring-alert monitoring-alert--${a.severity}`}
                  >
                    <div className="monitoring-alert-head">
                      <strong>{a.title}</strong>
                      <span className="monitoring-alert-ago">{a.agoLabel}</span>
                    </div>
                    {fx ? (
                      <p className="monitoring-alert-fixture">
                        {fx.homeTeam} v {fx.awayTeam}
                      </p>
                    ) : null}
                    <p className="monitoring-alert-body">{a.body}</p>
                  </article>
                )
              })
            )}
          </div>
          <div className="monitoring-info-card">
            <h3 className="monitoring-info-title">Session info</h3>
            <p className="monitoring-info-body">
              Demo monitoring view. Markets and alert rules will be wired to live feeds in a later
              iteration.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FixtureRow({
  fixture: f,
  expanded,
  highlighted,
  onToggle,
  onFocus,
}: {
  fixture: MonitoringFixture
  expanded: boolean
  highlighted: boolean
  onToggle: () => void
  onFocus: () => void
}) {
  return (
    <div
      className={
        'monitoring-fixture-card' +
        (highlighted ? ' monitoring-fixture-card--highlight' : '') +
        (expanded ? ' monitoring-fixture-card--expanded' : '')
      }
    >
      <button
        type="button"
        className="monitoring-fixture-summary"
        onClick={() => {
          onFocus()
          onToggle()
        }}
        aria-expanded={expanded}
      >
        <span className="monitoring-fixture-id">{f.id.split('-')[0]}</span>
        <span className="monitoring-fixture-teams">
          <strong>{f.homeTeam}</strong>
          <span className="monitoring-fixture-vs">v</span>
          <strong>{f.awayTeam}</strong>
        </span>
        <span className="monitoring-fixture-score">
          <span>{f.scoreHome}</span>
          <span className="monitoring-fixture-score-sep">|</span>
          <span>{f.scoreAway}</span>
        </span>
        <span className={`monitoring-status monitoring-status--${f.status}`}>
          {fixtureStatusLabel(f.status)}
        </span>
        <span className="monitoring-fixture-detail">{f.statusDetail}</span>
        <span
          className={
            'monitoring-scout-pill' + (f.scouting ? ' monitoring-scout-pill--on' : '')
          }
          title={f.scouting ? 'Scouting active' : 'No scouting'}
        >
          {f.scouting ? 'Scout ON' : 'Scout off'}
        </span>
        <span className="monitoring-fixture-chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded ? (
        <div className="monitoring-fixture-markets">
          <div className="monitoring-markets-head">
            <span>{f.competitionLabel}</span>
            <span>{f.formatLabel}</span>
            <span>{f.startTimeLabel}</span>
          </div>
          <table className="monitoring-markets-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Selection</th>
                <th>Line</th>
                <th className="monitoring-th-price">Price</th>
              </tr>
            </thead>
            <tbody>
              {f.markets.map((m, i) => (
                <tr key={i}>
                  <td>{m.market}</td>
                  <td>{m.selection}</td>
                  <td>{m.line ?? '—'}</td>
                  <td className="monitoring-td-price">{m.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="monitoring-trade-btn" disabled title="Demo only">
            + Trade
          </button>
        </div>
      ) : null}
    </div>
  )
}
