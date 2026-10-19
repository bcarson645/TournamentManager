'use client'

import { useEffect, useMemo, useState } from 'react'
import { MONITORING_ALERTS, fixtureStatusLabel, type MonitoringFixture } from '../../data/monitoringDemoData'
import { clientMarketMatchesFilter, clientMarketsForFixture } from '../../data/monitoringClientMarkets'
import { monitoringScorecardFor } from '../../data/monitoringScorecards'
import MonitoringClientMarketsPanel from './MonitoringClientMarketsPanel'
import MonitoringScorecardView from './MonitoringScorecard'

type PriceFilter = 'all' | 'match' | 'innings' | 'session'

function teamInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MonitoringFixtureFullscreen({
  fixture,
  onClose,
}: {
  fixture: MonitoringFixture
  onClose: () => void
}) {
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const live = fixture.status === 'live'

  const fixtureAlerts = useMemo(
    () => MONITORING_ALERTS.filter((a) => a.fixtureId === fixture.id),
    [fixture.id],
  )

  const scorecard = useMemo(() => monitoringScorecardFor(fixture.id), [fixture.id])

  const clientMarketCount = useMemo(() => {
    const all = clientMarketsForFixture(fixture)
    return all.filter((m) => clientMarketMatchesFilter(m, priceFilter)).length
  }, [fixture, priceFilter])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const filters: { id: PriceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'match', label: 'Match' },
    { id: 'innings', label: 'Innings' },
    { id: 'session', label: 'Session' },
  ]

  return (
    <div
      className="monitoring-fs-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monitoring-fs-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="monitoring-fs-panel">
        <header className="monitoring-fs-header">
          <div className="monitoring-fs-header-main">
            <h1 id="monitoring-fs-title" className="monitoring-fs-title">
              Live prices
            </h1>
            <span className="monitoring-fs-header-ref">{fixture.refId}</span>
            <span className="monitoring-fs-header-comp">{fixture.competitionLabel}</span>
            <span className="monitoring-fs-header-format">{fixture.formatLabel}</span>
            {live ? <span className="monitoring-fs-live-pill">Live</span> : null}
          </div>
          <button type="button" className="monitoring-fs-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="monitoring-fs-body">
          <section className="monitoring-fs-prices" aria-label="Market prices">
            <div className="monitoring-fs-prices-toolbar">
              <span className="monitoring-fs-prices-heading">
                Markets <span className="monitoring-fs-prices-count">({clientMarketCount})</span>
              </span>
              <div className="monitoring-fs-filters" role="tablist" aria-label="Market filter">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={priceFilter === f.id}
                    className={
                      'monitoring-fs-filter' +
                      (priceFilter === f.id ? ' monitoring-fs-filter--active' : '')
                    }
                    onClick={() => setPriceFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="monitoring-fs-prices-scroll">
              <MonitoringClientMarketsPanel fixture={fixture} priceFilter={priceFilter} />
            </div>
          </section>

          <section className="monitoring-fs-match" aria-label="Match information">
            <div className="monitoring-fs-match-card">
              <div className="monitoring-fs-match-status">
                <span className={`monitoring-status monitoring-status--${fixture.status}`}>
                  {fixtureStatusLabel(fixture.status)}
                </span>
                <span className="monitoring-fs-match-detail">{fixture.statusDetail}</span>
                <span className="monitoring-fs-match-time">{fixture.startTimeLabel}</span>
              </div>

              <div className="monitoring-fs-scoreboard">
                <div className="monitoring-fs-score-team">
                  <span className="monitoring-team-badge monitoring-team-badge--a" aria-hidden>
                    {teamInitials(fixture.homeTeam)}
                  </span>
                  <div className="monitoring-fs-score-team-text">
                    <span className="monitoring-fs-score-name">{fixture.homeTeam}</span>
                    <span className="monitoring-fs-score-value">{fixture.scoreHome}</span>
                  </div>
                </div>
                <span className="monitoring-fs-vs">v</span>
                <div className="monitoring-fs-score-team">
                  <span className="monitoring-team-badge monitoring-team-badge--b" aria-hidden>
                    {teamInitials(fixture.awayTeam)}
                  </span>
                  <div className="monitoring-fs-score-team-text">
                    <span className="monitoring-fs-score-name">{fixture.awayTeam}</span>
                    <span className="monitoring-fs-score-value">{fixture.scoreAway}</span>
                  </div>
                </div>
              </div>

              <dl className="monitoring-fs-meta">
                <div>
                  <dt>Date</dt>
                  <dd>{formatDisplayDate(fixture.date)}</dd>
                </div>
                <div>
                  <dt>Scouting</dt>
                  <dd>{fixture.scouting ? 'On' : 'Off'}</dd>
                </div>
                <div>
                  <dt>Reference</dt>
                  <dd>{fixture.refId}</dd>
                </div>
              </dl>

              <div className="monitoring-fs-commentary">
                <h3 className="monitoring-fs-commentary-title">Commentary</h3>
                <p>{fixture.commentary}</p>
              </div>
            </div>

            {scorecard ? <MonitoringScorecardView scorecard={scorecard} /> : null}

            {fixtureAlerts.length > 0 ? (
              <div className="monitoring-fs-alerts">
                <h3 className="monitoring-fs-alerts-title">Fixture alerts</h3>
                {fixtureAlerts.map((a) => (
                  <article
                    key={a.id}
                    className={`monitoring-alert monitoring-alert--${a.severity} monitoring-fs-alert`}
                  >
                    <div className="monitoring-alert-head">
                      <strong>{a.title}</strong>
                      <span className="monitoring-alert-ago">{a.agoLabel}</span>
                    </div>
                    <p className="monitoring-alert-body">{a.body}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
