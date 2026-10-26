'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import type { CricketFormat, Gender, Tournament } from '../data/tournaments'
import {
  buildFixtureDetail,
  type FixtureBatterRow,
  type FixtureBowlerRow,
} from '../data/fixtureDetail'
import {
  getSimulatorConfig,
  getSimulatorStoreVersion,
  saveSimulatorConfig,
  subscribeSimulatorStore,
} from '../data/outrightSimulatorStore'
import { getSquadStoreVersion, subscribeSquadStore } from '../data/squadStore'

const THEME_KEY = 'tm-fixture-detail-theme'

function formatPct(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

function formatPrice(p: number | undefined): string {
  return p !== undefined && p > 0 ? p.toFixed(2) : '—'
}

const TRACK_COLORS = ['#f59e0b', '#a78bfa', '#34d399']

function WinProbChart({
  history,
  tracks = [],
  homeName,
  awayName,
  large = false,
}: {
  history: { at: number; homeWinProb: number }[]
  tracks?: { book: string; points: { at: number; homeWinProb: number }[] }[]
  homeName: string
  awayName: string
  large?: boolean
}) {
  const w = 640
  const h = large ? 260 : 96
  const pad = { t: 20, r: 12, b: 20, l: 40 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const pts = history.length > 0 ? history : [{ at: Date.now(), homeWinProb: 0.5 }]
  const minT = pts[0]!.at
  const maxT = pts[pts.length - 1]!.at
  const span = Math.max(maxT - minT, 1)

  const toXY = (list: { at: number; homeWinProb: number }[]) =>
    list.map((p) => {
      const x = pad.l + ((p.at - minT) / span) * innerW
      const y = pad.t + (1 - p.homeWinProb) * innerH
      return `${x},${y}`
    })

  const xy = toXY(pts)

  return (
    <div className="fxd-chart-wrap">
      <div className="fxd-chart-labels">
        <span className="fxd-chart-label fxd-chart-label--home">{homeName} ▲ 100</span>
        <span className="fxd-chart-label fxd-chart-label--mid">50</span>
        <span className="fxd-chart-label fxd-chart-label--away">{awayName} ▼ 0</span>
      </div>
      <svg className="fxd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Home win probability over time">
        <defs>
          <linearGradient id="fxdChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fxd-chart-home)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--fxd-chart-away)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <line
          x1={pad.l}
          y1={pad.t + innerH / 2}
          x2={w - pad.r}
          y2={pad.t + innerH / 2}
          className="fxd-chart-midline"
        />
        <polygon
          points={`${pad.l},${pad.t + innerH} ${xy.join(' ')} ${w - pad.r},${pad.t + innerH}`}
          fill="url(#fxdChartFill)"
        />
        {tracks.map((t, i) => (
          <polyline
            key={t.book}
            points={toXY(t.points).join(' ')}
            fill="none"
            stroke={TRACK_COLORS[i % TRACK_COLORS.length]}
            strokeWidth={large ? 2 : 1.5}
            strokeDasharray="5 3"
            opacity={0.9}
          />
        ))}
        <polyline points={xy.join(' ')} className="fxd-chart-line" fill="none" />
        {[0, 0.5, 1].map((t) => (
          <text
            key={t}
            x={pad.l - 8}
            y={pad.t + (1 - t) * innerH + 4}
            className="fxd-chart-tick"
            textAnchor="end"
          >
            {Math.round(t * 100)}
          </text>
        ))}
      </svg>
      {tracks.length > 0 ? (
        <div className="fxd-chart-legend">
          <span className="fxd-legend-chip fxd-legend-chip--model">Model</span>
          {tracks.map((t, i) => (
            <span key={t.book} className="fxd-legend-chip">
              <i style={{ background: TRACK_COLORS[i % TRACK_COLORS.length] }} />
              {t.book}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PhaseBars({
  label,
  home,
  away,
  max,
}: {
  label: string
  home: number
  away: number
  /** Shared axis max across all phases — every bar starts at 0 on the same scale. */
  max: number
}) {
  const scale = Math.max(max, 1)
  const avg = Math.round(((home + away) / 2) * 10) / 10
  const avgPct = (avg / scale) * 100
  return (
    <div className="fxd-phase-row">
      <div className="fxd-phase-side fxd-phase-side--home">
        <span className="fxd-phase-val">{home}</span>
        <span className="fxd-phase-bar">
          <span className="fxd-phase-fill" style={{ width: `${(home / scale) * 100}%` }} />
          <span className="fxd-phase-avg" style={{ right: `${avgPct}%` }} title={`Average ${avg}`} />
        </span>
        <span className="fxd-phase-tick">{scale}</span>
      </div>
      <span className="fxd-phase-mid">
        <span className="fxd-phase-label">{label}</span>
        <span className="fxd-phase-avgcap" title="Average of both teams">avg {avg}</span>
      </span>
      <div className="fxd-phase-side fxd-phase-side--away">
        <span className="fxd-phase-tick">{scale}</span>
        <span className="fxd-phase-bar">
          <span className="fxd-phase-fill" style={{ width: `${(away / scale) * 100}%` }} />
          <span className="fxd-phase-avg" style={{ left: `${avgPct}%` }} title={`Average ${avg}`} />
        </span>
        <span className="fxd-phase-val">{away}</span>
      </div>
    </div>
  )
}

function BattersTable({ rows, teamName }: { rows: FixtureBatterRow[]; teamName: string }) {
  if (rows.length === 0) return <p className="fxd-empty">No squad data for {teamName}.</p>
  return (
    <table className="fxd-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Batter</th>
          <th title="Batting CAZ input">bat.caz</th>
          <th title="Strike-rate CAZ (runs per ball)">sr.caz</th>
          <th title="Model expected runs this game">Exp. runs</th>
          <th>Last 5</th>
          <th>Avg L5</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="fxd-muted">{r.position}</td>
            <td>{r.name}</td>
            <td className="fxd-num">{r.batCaz.toFixed(1)}</td>
            <td className="fxd-num">{r.srCaz.toFixed(2)}</td>
            <td className="fxd-num fxd-num--hi">{r.expectedRuns.toFixed(1)}</td>
            <td className="fxd-muted">{r.recentScores.length > 0 ? r.recentScores.join(', ') : '—'}</td>
            <td className="fxd-num">{r.avgLast5 != null ? r.avgLast5.toFixed(1) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BowlersTable({ rows, teamName }: { rows: FixtureBowlerRow[]; teamName: string }) {
  if (rows.length === 0) return <p className="fxd-empty">No squad data for {teamName}.</p>
  return (
    <table className="fxd-table">
      <thead>
        <tr>
          <th>Bowler</th>
          <th>Overs</th>
          <th>Econ</th>
          <th title="Model expected wickets this game">Exp. wkts</th>
          <th>Avg</th>
          <th>Career wkts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td className="fxd-num">{r.overs.toFixed(1)}</td>
            <td className="fxd-num">{r.econ.toFixed(1)}</td>
            <td className="fxd-num fxd-num--hi">{r.expectedWkts.toFixed(1)}</td>
            <td className="fxd-num">{r.bowlAvg > 0 ? r.bowlAvg.toFixed(2) : '—'}</td>
            <td className="fxd-num">{r.careerWkts > 0 ? r.careerWkts : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface FixtureDetailViewProps {
  tournamentId: string
  fixtureId: string
  format: CricketFormat
  gender: Gender
  tournament: Tournament | undefined
  onBack: () => void
  onSelectFixture?: (fixtureId: string) => void
}

export default function FixtureDetailView({
  tournamentId,
  fixtureId,
  format,
  gender,
  tournament,
  onBack,
  onSelectFixture,
}: FixtureDetailViewProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  })
  const [showBooks, setShowBooks] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const simulatorVersion = useSyncExternalStore(
    subscribeSimulatorStore,
    getSimulatorStoreVersion,
    getSimulatorStoreVersion,
  )
  const squadVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, getSquadStoreVersion)

  const detail = useMemo(
    () => buildFixtureDetail(tournamentId, fixtureId, format, gender, tournament),
    [tournamentId, fixtureId, format, gender, tournament, simulatorVersion, squadVersion],
  )

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }

  if (!detail) {
    return (
      <div className="fixture-detail-shell" data-theme={theme}>
        <button type="button" className="fxd-back-btn" onClick={onBack}>← Back to tournament</button>
        <p className="fxd-empty">Fixture not found.</p>
      </div>
    )
  }

  const { fixture, home, away } = detail

  return (
    <div className="fixture-detail-shell" data-theme={theme}>
      <header className="fxd-topbar">
        <button type="button" className="fxd-back-btn" onClick={onBack}>
          ← Tournament
        </button>
        <div className="fxd-topbar-meta">
          <span className="fxd-pill">{detail.formatLabel}</span>
          <span className="fxd-pill">{detail.genderLabel}</span>
          {fixture.matchNumber ? <span className="fxd-pill">Match {fixture.matchNumber}</span> : null}
        </div>
        <div className="fxd-nav-btns">
          <button
            type="button"
            className="fxd-back-btn"
            disabled={!detail.prevFixtureId}
            onClick={() => detail.prevFixtureId && onSelectFixture?.(detail.prevFixtureId)}
          >
            ‹ Prev
          </button>
          <button
            type="button"
            className="fxd-back-btn"
            disabled={!detail.nextFixtureId}
            onClick={() => detail.nextFixtureId && onSelectFixture?.(detail.nextFixtureId)}
          >
            Next ›
          </button>
        </div>
        <button type="button" className="fxd-theme-btn" onClick={toggleTheme} aria-label="Toggle light or dark theme">
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
      </header>

      {/* Trading-desk top panel: info | factors | market */}
      <section className="fxd-matchhead fxd-tpanel">
        <div className="fxd-tpanel-grid">
          {/* Left: match info */}
          <div className="fxd-tpanel-info">
            <h1 className="fxd-tpanel-title">{home.name} vs {away.name}</h1>
            <p className="fxd-info-row">
              <svg className="fxd-info-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z" />
              </svg>
              <span><strong>{detail.formatLabel}</strong> · {detail.matchLabel}
              {'stage' in fixture && fixture.stage && fixture.stage !== 'group' ? ` (${fixture.stage})` : ''}</span>
            </p>
            <p className="fxd-info-row">
              <svg className="fxd-info-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
                <path d="M7 6H4a1 1 0 0 0-1 1c0 2 1.5 3.5 4 3.5M17 6h3a1 1 0 0 1 1 1c0 2-1.5 3.5-4 3.5" />
              </svg>
              <span>{detail.tournamentName}</span>
            </p>
            <p className="fxd-info-row">
              <svg className="fxd-info-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
              <span>{fixture.dateLabel}, {fixture.time} <em>({detail.relativeDayLabel})</em></span>
            </p>
            <p className="fxd-info-row">
              <svg className="fxd-info-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>{detail.ground?.name ?? detail.venue}{detail.ground ? `, ${detail.ground.city}` : ''}</span>
            </p>
            <p className="fxd-info-row fxd-info-row--dim">
              <svg className="fxd-info-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>{detail.isCompleted ? 'Match completed' : 'Match yet to begin'}</span>
            </p>
            <button
              type="button"
              className="fxd-matchid"
              title="Click to copy fixture ID"
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText(fixture.id)
                  setCopiedId(true)
                  window.setTimeout(() => setCopiedId(false), 1200)
                } catch {
                  /* clipboard unavailable */
                }
              }}
            >
              <span className="fxd-matchid-key">Match ID</span>
              <span className="fxd-matchid-val">{fixture.id}</span>
              <span className="fxd-matchid-copy">{copiedId ? 'Copied ✓' : '⧉'}</span>
            </button>
          </div>

          {/* Middle: conditions + factor ladder */}
          <div className="fxd-tpanel-factors">
            <div className="fxd-tpanel-cond fxd-tpanel-cond--single">
              <span className="fxd-tpanel-condlabel">Conditions</span>
              <span className="fxd-cond-stepper">
                <button
                  type="button"
                  className="fxd-cond-btn"
                  aria-label="Decrease conditions"
                  onClick={() => {
                    const cur = getSimulatorConfig(tournamentId).conditions ?? 1
                    saveSimulatorConfig(tournamentId, {
                      conditions: Math.round(Math.max(0.5, cur - 0.01) * 100) / 100,
                    })
                  }}
                >
                  −
                </button>
                <span
                  className={`fxd-factor-box ${(getSimulatorConfig(tournamentId).conditions ?? 1) >= 1 ? 'fxd-factor-box--up' : 'fxd-factor-box--down'}`}
                  title="Base conditions for this game — applies to both teams"
                >
                  {(getSimulatorConfig(tournamentId).conditions ?? 1).toFixed(2)}
                </span>
                <button
                  type="button"
                  className="fxd-cond-btn"
                  aria-label="Increase conditions"
                  onClick={() => {
                    const cur = getSimulatorConfig(tournamentId).conditions ?? 1
                    saveSimulatorConfig(tournamentId, {
                      conditions: Math.round(Math.min(1.5, cur + 0.01) * 100) / 100,
                    })
                  }}
                >
                  +
                </button>
              </span>
            </div>
            {(
              [
                { label: 'Batting', h: home.battingRating, a: away.battingRating, invert: false },
                { label: 'Bowling', h: home.bowlingRating, a: away.bowlingRating, invert: true },
                { label: 'Total factor', h: home.matchFactor, a: away.matchFactor, invert: false },
              ] as const
            ).map((row) => {
              // Bowling above 1 is bad (concedes more) — inverted vs batting.
              const tone = (v: number) => {
                const good = row.invert ? v <= 1 : v >= 1
                return good ? 'fxd-factor-box--up' : 'fxd-factor-box--down'
              }
              return (
                <div key={row.label} className="fxd-tpanel-factorrow">
                  <span className={`fxd-factor-box ${tone(row.h)}`} title={row.invert && row.h > 1 ? 'Above 1 — expensive bowling' : undefined}>
                    {row.h.toFixed(2)}
                  </span>
                  <span className="fxd-tpanel-factorlabel">{row.label}</span>
                  <span className={`fxd-factor-box ${tone(row.a)}`} title={row.invert && row.a > 1 ? 'Above 1 — expensive bowling' : undefined}>
                    {row.a.toFixed(2)}
                  </span>
                </div>
              )
            })}
            <p className="fxd-card-hint">Tournament Manager trader inputs · ≥1.00 green, &lt;1.00 red.</p>
          </div>

          {/* Right: match market */}
          <div className="fxd-tpanel-market">
            <div className="fxd-tpanel-markethead">
              <h2 className="fxd-tpanel-markettitle">MATCH MARKET</h2>
              <button
                type="button"
                className={'fxd-eye-btn' + (showBooks ? ' fxd-eye-btn--on' : '')}
                aria-pressed={showBooks}
                title="Show crawled book prices"
                onClick={() => setShowBooks((s) => !s)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Crawled</span>
              </button>
            </div>
            <div className="fxd-splitbar" role="img" aria-label={`${home.name} ${formatPct(detail.homeWinProb)}, ${away.name} ${formatPct(detail.awayWinProb)}`}>
              <span className="fxd-splitbar-home" style={{ width: `${detail.homeWinProb * 100}%` }}>
                {formatPct(detail.homeWinProb)}
              </span>
              <span className="fxd-splitbar-away" style={{ width: `${detail.awayWinProb * 100}%` }}>
                {formatPct(detail.awayWinProb)}
              </span>
            </div>
            <div className="fxd-market-cols" aria-hidden>
              <span className="fxd-market-cols-team" />
              <span className="fxd-market-collabel">Prob</span>
              <span className="fxd-market-collabel">Price</span>
              <span className="fxd-market-collabel">Avg</span>
            </div>
            {(
              [
                { team: home.name, prob: detail.homeWinProb, fair: detail.homeFairPrice, books: detail.competitorPrices.map((b) => ({ book: b.book, price: b.homePrice })), tone: 'home' },
                { team: away.name, prob: detail.awayWinProb, fair: detail.awayFairPrice, books: detail.competitorPrices.map((b) => ({ book: b.book, price: b.awayPrice })), tone: 'away' },
              ] as const
            ).map((row) => {
              const avg = row.books.length > 0
                ? row.books.reduce((s, b) => s + b.price, 0) / row.books.length
                : null
              const avgOffModel =
                avg != null && row.fair != null && row.fair > 0
                  ? Math.abs(avg - row.fair) / row.fair > 0.1
                  : false
              const avgDiffPct =
                avg != null && row.fair != null && row.fair > 0
                  ? Math.round((Math.abs(avg - row.fair) / row.fair) * 100)
                  : 0
              return (
                <div key={row.team} className={`fxd-market-row fxd-market-row--${row.tone}`}>
                  <span className="fxd-market-team">{row.team}</span>
                  <span className="fxd-market-box fxd-market-box--prob" title="Model win probability">
                    <small>Prob</small>
                    {formatPct(row.prob)}
                  </span>
                  <span className="fxd-market-box fxd-market-box--model" title="Model fair price">
                    <small>Model</small>
                    {formatPrice(row.fair)}
                  </span>
                  {avg != null ? (
                    <span
                      className={'fxd-market-box fxd-market-box--avg' + (avgOffModel ? ' fxd-market-box--avg-off' : '')}
                      title={`Average crawled price — ${avgDiffPct}% vs model${avgOffModel ? ' (differs >10%)' : ''}`}
                    >
                      <small>Avg{avgOffModel ? ` ±${avgDiffPct}%` : ''}</small>
                      {avg.toFixed(2)}
                    </span>
                  ) : null}
                </div>
              )
            })}
            {showBooks ? (
              <>
                <button
                  type="button"
                  className="fxd-books-backdrop"
                  aria-label="Close crawled prices"
                  onClick={() => setShowBooks(false)}
                />
                <div className="fxd-books-pop" role="dialog" aria-label="Crawled book prices">
                  <div className="fxd-books-pop-head">
                    <span>Crawled prices</span>
                    <button type="button" className="fxd-books-close" onClick={() => setShowBooks(false)} aria-label="Close">
                      ✕
                    </button>
                  </div>
                  <table className="fxd-books-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>{home.name}</th>
                        <th>{away.name}</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.competitorPrices.map((b) => (
                        <tr key={b.book}>
                          <td>{b.book}</td>
                          <td className="fxd-num">{b.homePrice.toFixed(2)}</td>
                          <td className="fxd-num">{b.awayPrice.toFixed(2)}</td>
                          <td className="fxd-muted">{new Date(b.updatedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            <p className="fxd-card-hint">Model from simulator ratings & conditions.</p>
          </div>
        </div>
      </section>

      {/* Win track + head-to-head side by side, both compact */}
      <div className="fxd-duo">
      <section className="fxd-card fxd-card--track">
        <div className="fxd-card-headrow">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>↗</span>
            Win probability track
          </h2>
          <span className="fxd-muted">click to expand</span>
        </div>
        <button type="button" className="fxd-track-btn" onClick={() => setChartOpen(true)} aria-label="Expand win probability chart">
          <WinProbChart
            history={detail.priceHistory}
            tracks={detail.competitorTracks}
            homeName={home.name}
            awayName={away.name}
          />
        </button>
      </section>

      {chartOpen ? (
        <div className="fxd-modal" role="dialog" aria-label="Win probability track" onClick={() => setChartOpen(false)}>
          <div className="fxd-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fxd-card-headrow">
              <h2 className="fxd-card-title">Win probability — {home.name} vs {away.name}</h2>
              <button type="button" className="fxd-back-btn" onClick={() => setChartOpen(false)}>Close ✕</button>
            </div>
            <WinProbChart
              history={detail.priceHistory}
              tracks={detail.competitorTracks}
              homeName={home.name}
              awayName={away.name}
              large
            />
          </div>
        </div>
      ) : null}

      {/* Head-to-head phase scoring — direct comparison bars */}
      <section className="fxd-card">
        <h2 className="fxd-card-title">
          <span className="fxd-card-icon" aria-hidden>⚔</span>
          Head-to-head · runs by phase
        </h2>
        <p className="fxd-h2h-names"><span className="fxd-h2h-home">{home.name}</span> vs <span className="fxd-h2h-away">{away.name}</span></p>
        <div className="fxd-phase-legend">
          {(() => {
            const h2hMax = Math.max(
              detail.homePhases.powerplay,
              detail.homePhases.middle,
              detail.homePhases.death,
              detail.awayPhases.powerplay,
              detail.awayPhases.middle,
              detail.awayPhases.death,
              1,
            )
            return (
              <>
                <PhaseBars label="Powerplay" home={detail.homePhases.powerplay} away={detail.awayPhases.powerplay} max={h2hMax} />
                <PhaseBars label="Middle" home={detail.homePhases.middle} away={detail.awayPhases.middle} max={h2hMax} />
                <PhaseBars label="Death" home={detail.homePhases.death} away={detail.awayPhases.death} max={h2hMax} />
              </>
            )
          })()}
        </div>
        <p className="fxd-card-hint">Model estimates from squad Raw totals × conditions.</p>
      </section>
      </div>

      {/* Batting first + par */}
      <section className="fxd-card">
        <h2 className="fxd-card-title">
          <span className="fxd-card-icon" aria-hidden>🏏</span>
          Batting first & par at ground
        </h2>
        <div className="fxd-first-boxes">
          <div className="fxd-first-box">
            <span className="fxd-first-team">{home.flag} {home.name}</span>
            <span className="fxd-first-score">{detail.homeBattingFirst.avgScoreBattingFirst}</span>
            <span className="fxd-first-cap">Avg batting first</span>
          </div>
          <div className="fxd-first-box fxd-first-box--par">
            <span className="fxd-first-team">🏟 {detail.ground?.name ?? detail.venue}</span>
            <span className="fxd-first-score">{detail.homeBattingFirst.parScoreAtGround}</span>
            <span className="fxd-first-cap">Par score at ground</span>
          </div>
          <div className="fxd-first-box">
            <span className="fxd-first-team">{away.flag} {away.name}</span>
            <span className="fxd-first-score">{detail.awayBattingFirst.avgScoreBattingFirst}</span>
            <span className="fxd-first-cap">Avg batting first</span>
          </div>
        </div>
      </section>

      {/* Players: batting + bowling side by side per team */}
      <div className="fxd-duo fxd-duo--players">
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>★</span>
            {home.name} · Batting
          </h2>
          <div className="fxd-table-wrap"><BattersTable rows={detail.homeBatters} teamName={home.name} /></div>
        </section>
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>●</span>
            {home.name} · Bowling
          </h2>
          <div className="fxd-table-wrap"><BowlersTable rows={detail.homeBowlers} teamName={home.name} /></div>
        </section>
      </div>
      <div className="fxd-duo fxd-duo--players">
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>★</span>
            {away.name} · Batting
          </h2>
          <div className="fxd-table-wrap"><BattersTable rows={detail.awayBatters} teamName={away.name} /></div>
        </section>
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>●</span>
            {away.name} · Bowling
          </h2>
          <div className="fxd-table-wrap"><BowlersTable rows={detail.awayBowlers} teamName={away.name} /></div>
        </section>
      </div>

      {/* Markets + ground record */}
      <div className="fxd-grid">
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>▦</span>
            Group & key markets
          </h2>
          <table className="fxd-table fxd-table--markets">
            <thead>
              <tr>
                <th>Market</th>
                <th>Selection</th>
                <th>Model %</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {detail.groupMarkets.map((m) => (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  <td>{m.selection}</td>
                  <td>{formatPct(m.prob)}</td>
                  <td>{m.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>🏟</span>
            Record at ground
          </h2>
          <dl className="fxd-ground-stats">
            <div><dt>Innings (sample)</dt><dd>{detail.groundRecord.inningsPlayed}</dd></div>
            <div><dt>Avg 1st innings</dt><dd>{detail.groundRecord.avgFirstInnings}</dd></div>
            <div><dt>Avg sixes</dt><dd>{detail.groundRecord.avgSixes}</dd></div>
            <div><dt>Win batting first</dt><dd>{detail.groundRecord.winBatFirstPct}%</dd></div>
            <div><dt>Home side wins</dt><dd>{detail.groundRecord.homeTeamWinsPct}%</dd></div>
          </dl>
        </section>
      </div>
    </div>
  )
}
