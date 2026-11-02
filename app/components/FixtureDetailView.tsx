'use client'

import { Fragment, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { CricketFormat, Gender, Tournament } from '../data/tournaments'
import {
  buildFixtureDetail,
  type FixtureBatterRow,
  type FixtureBowlerRow,
  type MatchMarketRow,
  type TeamBatterMatchups,
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

type BatMetric = 'runs' | 'fours' | 'sixes' | 'sr'
type BatWindow = 5 | 10 | 15
type BatStat = 'avg' | 'med'

const BAT_METRICS: { key: BatMetric; label: string }[] = [
  { key: 'runs', label: 'Runs' },
  { key: 'fours', label: '4s' },
  { key: 'sixes', label: '6s' },
  { key: 'sr', label: 'Strike rate' },
]

const BAT_WINDOWS: BatWindow[] = [5, 10, 15]

/** Warn tint when our line sits well off the reference (recent avg / career). */
function lineWarnClass(line: number, ref: number | null, threshold = 0.2): string {
  if (ref === null || !(ref > 0)) return ''
  return Math.abs(line - ref) / ref > threshold ? ' fxd-cell--warn' : ''
}

function diffLabel(line: number, ref: number | null): string {
  if (ref === null || !(ref > 0)) return 'no reference'
  const pct = Math.round(((line - ref) / ref) * 100)
  return `${pct > 0 ? '+' : ''}${pct}% vs ${ref.toFixed(1)}`
}

function medianOf(scores: number[]): number | null {
  if (scores.length === 0) return null
  const s = [...scores].sort((a, b) => a - b)
  const m = s.length >> 1
  if (s.length % 2 === 1) return s[m]!
  return Math.round(((s[m - 1]! + s[m]!) / 2) * 10) / 10
}

/** Full-cell form tint — the further past/m short of the line, the deeper the green/red. */
function formCellStyle(actual: number, line: number): CSSProperties | undefined {
  if (!(line > 0)) return undefined
  const t = Math.min(Math.abs(actual - line) / line, 1)
  const alpha = 0.14 + t * 0.42
  const rgb = actual >= line ? '34, 197, 94' : '239, 68, 68'
  return {
    background: `linear-gradient(180deg, rgba(${rgb}, ${(alpha * 0.75).toFixed(2)}), rgba(${rgb}, ${alpha.toFixed(2)}))`,
  }
}

function teamChipClass(teamId: string, homeTeamId: string): string {
  return 'fxd-team-chip ' + (teamId === homeTeamId ? 'fxd-team-chip--home' : 'fxd-team-chip--away')
}

function meanOf(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
}

function BoundaryGamesTable({
  rows,
  window,
  stat,
  metric,
  homeTeamId,
}: {
  rows: FixtureBatterRow[]
  window: BatWindow
  stat: BatStat
  metric: 'fours' | 'sixes'
  homeTeamId: string
}) {
  const isFours = metric === 'fours'
  const unit = isFours ? '×4' : '×6'
  return (
    <table className="fxd-table">
      <thead>
        <tr>
          <th>Batter</th>
          <th title={`Over/under ${unit} line ending in .5`}>Line</th>
          {Array.from({ length: window }, (_, i) => (
            <th key={i} title={i === 0 ? `Most recent game: boundaries over sent line` : `${i + 1} games ago`}>G{i + 1}</th>
          ))}
          <th title={`${stat === 'avg' ? 'Average' : 'Median'} boundaries, last ${window}`}>{stat === 'avg' ? `Avg L${window}` : `Med L${window}`}</th>
          <th title={`Games in last ${window} clearing the sent line`}>Hit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const actuals = (isFours ? r.recentFours : r.recentSixes).slice(0, window)
          const sent = (isFours ? r.sentFoursLines : r.sentSixesLines).slice(0, window)
          const runs = r.recentScores.slice(0, window)
          const line = isFours ? r.lineFours : r.lineSixes
          const ref = stat === 'avg' ? meanOf(actuals) : medianOf(actuals)
          const hits = actuals.filter((a, i) => a >= (sent[i] ?? line)).length
          return (
            <tr key={r.id}>
              <td>
                {r.name}{' '}
                <span className={teamChipClass(r.teamId, homeTeamId)} title={`${r.teamName} · batting #${r.position}`}>
                  {r.teamName.slice(0, 3).toUpperCase()} #{r.position}
                </span>
              </td>
              <td
                className={'fxd-num fxd-num--hi' + lineWarnClass(line, ref)}
                title={`Prep ${isFours ? r.expFours.toFixed(1) : r.expSixes.toFixed(1)} — ${diffLabel(line, ref)} L${window} ${stat === 'avg' ? 'avg' : 'med'}`}
              >
                {line.toFixed(1)}
              </td>
              {Array.from({ length: window }, (_, i) => {
                const a = actuals[i]
                const s = sent[i] ?? line
                if (a === undefined) return <td key={i} className="fxd-muted">—</td>
                const over = a >= s
                return (
                  <td
                    key={i}
                    className={'fxd-num ' + (over ? 'fxd-cell--over' : 'fxd-cell--under')}
                    style={formCellStyle(a, s)}
                    title={`${a} ${unit} in a ${runs[i] ?? '?'}‑run knock vs sent ${s.toFixed(1)}`}
                  >
                    <span className="fxd-cell-line">{s.toFixed(1)}</span>
                    {a}
                  </td>
                )
              })}
              <td className="fxd-num">{ref != null ? ref.toFixed(2) : '—'}</td>
              <td className="fxd-num" title={`${hits} of last ${window} cleared the sent line`}>
                {hits}/{actuals.length}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CombinedBattingTable({ rows, homeTeamId }: { rows: FixtureBatterRow[]; homeTeamId: string }) {
  const [metric, setMetric] = useState<BatMetric>('runs')
  const [window, setWindow] = useState<BatWindow>(5)
  const [stat, setStat] = useState<BatStat>('avg')
  const ordered = useMemo(() => [...rows].sort((a, b) => b.batCaz - a.batCaz), [rows])
  if (ordered.length === 0) return <p className="fxd-empty">No squad data.</p>

  return (
    <>
      <div className="fxd-table-controls">
        <div className="fxd-seg" role="tablist" aria-label="Batting metric">
          {BAT_METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={metric === m.key}
              className={'fxd-seg-btn' + (metric === m.key ? ' fxd-seg-btn--active' : '')}
              onClick={() => setMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {metric !== 'sr' ? (
          <>
            <div className="fxd-seg" role="tablist" aria-label="Recent window">
              {BAT_WINDOWS.map((w) => (
                <button
                  key={w}
                  type="button"
                  role="tab"
                  aria-selected={window === w}
                  className={'fxd-seg-btn' + (window === w ? ' fxd-seg-btn--active' : '')}
                  onClick={() => setWindow(w)}
                >
                  L{w}
                </button>
              ))}
            </div>
            <div className="fxd-seg" role="tablist" aria-label="Average or median">
              {(
                [
                  { key: 'avg', label: 'Avg' },
                  { key: 'med', label: 'Med' },
                ] as const
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="tab"
                  aria-selected={stat === o.key}
                  className={'fxd-seg-btn' + (stat === o.key ? ' fxd-seg-btn--active' : '')}
                  onClick={() => setStat(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
      {metric === 'runs' ? (
        <table className="fxd-table">
          <thead>
            <tr>
              <th>Batter</th>
              <th title="Batting CAZ input">bat.caz</th>
              <th title="Prep expected × order deduction, over/under .5">Line</th>
              {Array.from({ length: window }, (_, i) => (
                <th key={i} title={i === 0 ? 'Most recent innings' : `${i + 1} games ago`}>G{i + 1}</th>
              ))}
              <th title={`Average or median of last ${window}`}>{stat === 'avg' ? `Avg L${window}` : `Med L${window}`}</th>
              <th title={`Games in last ${window} clearing the sent line`}>Hit</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => {
              const scores = r.recentScores.slice(0, window)
              const lines = r.histLines.slice(0, window)
              const mean = window === 5 ? r.avgLast5 : window === 10 ? r.avgLast10 : r.avgLast15
              const ref = stat === 'avg' ? mean : medianOf(scores)
              const hits = scores.filter((s, i) => s >= (lines[i] ?? r.lineRuns)).length
              return (
                <tr key={r.id}>
                  <td>
                    {r.name}{' '}
                    <span className={teamChipClass(r.teamId, homeTeamId)} title={`${r.teamName} · batting #${r.position}`}>
                      {r.teamName.slice(0, 3).toUpperCase()} #{r.position}
                    </span>
                  </td>
                  <td className="fxd-num">{r.batCaz.toFixed(1)}</td>
                  <td
                    className={'fxd-num fxd-num--hi' + lineWarnClass(r.lineRuns, ref)}
                    title={`Prep ${r.expectedRuns.toFixed(1)} × order ${(r.orderFactor * 100).toFixed(0)}% — ${diffLabel(r.lineRuns, ref)} ${stat === 'avg' ? 'avg' : 'median'}`}
                  >
                    {r.lineRuns.toFixed(1)}
                  </td>
                  {Array.from({ length: window }, (_, i) => {
                    const s = scores[i]
                    const sent = lines[i] ?? r.lineRuns
                    if (s === undefined) return <td key={i} className="fxd-muted">—</td>
                    const over = s >= sent
                    return (
                      <td
                        key={i}
                        className={'fxd-num ' + (over ? 'fxd-cell--over' : 'fxd-cell--under')}
                        style={formCellStyle(s, sent)}
                        title={`${s} vs sent line ${sent.toFixed(1)}`}
                      >
                        <span className="fxd-cell-line">{sent.toFixed(1)}</span>
                        {s}
                      </td>
                    )
                  })}
                  <td className="fxd-num">{ref != null ? ref.toFixed(1) : '—'}</td>
                  <td className="fxd-num" title={`${hits} of last ${window} cleared the sent line`}>
                    {hits}/{scores.length}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : metric === 'sr' ? (
        <table className="fxd-table">
          <thead>
            <tr>
              <th>Batter</th>
              <th title="Batting CAZ input">bat.caz</th>
              <th title="Prep expectation">Prep</th>
              <th title="Over/under line ending in .5">Line</th>
              <th title="Career average — no per-innings history for this metric">Career</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}{' '}
                  <span className={teamChipClass(r.teamId, homeTeamId)} title={`${r.teamName} · batting #${r.position}`}>
                    {r.teamName.slice(0, 3).toUpperCase()} #{r.position}
                  </span>
                </td>
                <td className="fxd-num">{r.batCaz.toFixed(1)}</td>
                <td className="fxd-num">{r.expSr100.toFixed(1)}</td>
                <td
                  className={'fxd-num fxd-num--hi' + lineWarnClass(r.lineSr100, r.careerSr100)}
                  title={diffLabel(r.lineSr100, r.careerSr100)}
                >
                  {r.lineSr100.toFixed(1)}
                </td>
                <td className="fxd-num">{r.careerSr100 != null ? r.careerSr100.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <BoundaryGamesTable rows={ordered} window={window} stat={stat} metric={metric} homeTeamId={homeTeamId} />
      )}
      {metric === 'runs' ? (
        <p className="fxd-card-hint">Line = prep expected × order deduction (openers face more balls) → nearest .5. Red line = 20%+ off the L{window} {stat === 'avg' ? 'average' : 'median'}.</p>
      ) : metric === 'sr' ? (
        <p className="fxd-card-hint">No per-innings balls history for strike rate — prep expectation vs career average.</p>
      ) : (
        <p className="fxd-card-hint">Boundaries always fit inside the scored runs — hover a cell for the knock total. Red line = 20%+ off the L{window} {stat === 'avg' ? 'average' : 'median'}.</p>
      )}
    </>
  )
}

function CombinedBowlingTable({ rows, homeTeamId }: { rows: FixtureBowlerRow[]; homeTeamId: string }) {
  const [window, setWindow] = useState<BatWindow>(5)
  const [stat, setStat] = useState<BatStat>('avg')
  const ordered = useMemo(() => [...rows].sort((a, b) => b.expectedWkts - a.expectedWkts), [rows])
  if (ordered.length === 0) return <p className="fxd-empty">No squad data.</p>
  return (
    <>
      <div className="fxd-table-controls">
        <div className="fxd-seg" role="tablist" aria-label="Recent window">
          {BAT_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={window === w}
              className={'fxd-seg-btn' + (window === w ? ' fxd-seg-btn--active' : '')}
              onClick={() => setWindow(w)}
            >
              L{w}
            </button>
          ))}
        </div>
        <div className="fxd-seg" role="tablist" aria-label="Average or median">
          {(
            [
              { key: 'avg', label: 'Avg' },
              { key: 'med', label: 'Med' },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={stat === o.key}
              className={'fxd-seg-btn' + (stat === o.key ? ' fxd-seg-btn--active' : '')}
              onClick={() => setStat(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <table className="fxd-table">
        <thead>
          <tr>
            <th>Bowler</th>
            <th title="Over/under wickets line ending in .5">Line</th>
            {Array.from({ length: window }, (_, i) => (
              <th key={i} title={i === 0 ? 'Most recent game: wickets over sent line' : `${i + 1} games ago`}>G{i + 1}</th>
            ))}
            <th title={`${stat === 'avg' ? 'Average' : 'Median'} wickets, last ${window}`}>{stat === 'avg' ? `Avg L${window}` : `Med L${window}`}</th>
            <th title={`Games in last ${window} clearing the sent line`}>Hit</th>
            <th title="Potential overs">Overs</th>
            <th title="Potential runs conceded = overs × economy">R conc.</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => {
            const games = r.recentBowling.slice(0, window)
            const lines = r.sentWktsLines.slice(0, window)
            const wkts = games.map((g) => g.wickets)
            const mean = window === 5 ? r.avgWktsLast5 : window === 10 ? r.avgWktsLast10 : r.avgWktsLast15
            const ref = stat === 'avg' ? mean : medianOf(wkts)
            const hits = games.filter((g, i) => g.wickets >= (lines[i] ?? r.wktsLine)).length
            return (
              <tr key={r.id}>
                <td>
                  {r.name}{' '}
                  <span className={teamChipClass(r.teamId, homeTeamId)} title={r.teamName}>
                    {r.teamName.slice(0, 3).toUpperCase()}
                  </span>
                </td>
                <td
                  className={'fxd-num fxd-num--hi' + lineWarnClass(r.wktsLine, ref, 0.25)}
                  title={`Exp ${r.expectedWkts.toFixed(1)} · career ${r.careerWktsPerInn != null ? r.careerWktsPerInn.toFixed(2) + '/inn' : 'n/a'} — ${diffLabel(r.wktsLine, ref)} L${window} ${stat === 'avg' ? 'avg' : 'med'}`}
                >
                  {r.wktsLine.toFixed(1)}
                </td>
                {Array.from({ length: window }, (_, i) => {
                  const g = games[i]
                  const sent = lines[i] ?? r.wktsLine
                  if (!g) return <td key={i} className="fxd-muted">—</td>
                  const over = g.wickets >= sent
                  return (
                    <td
                      key={i}
                      className={'fxd-num ' + (over ? 'fxd-cell--over' : 'fxd-cell--under')}
                      style={formCellStyle(g.wickets, sent)}
                      title={`${g.wickets}/${g.runsConceded} off ${g.oversBowled} ov vs sent line ${sent.toFixed(1)}`}
                    >
                      <span className="fxd-cell-line">{sent.toFixed(1)}</span>
                      {g.wickets}
                    </td>
                  )
                })}
                <td className="fxd-num">{ref != null ? ref.toFixed(2) : '—'}</td>
                <td className="fxd-num" title={`${hits} of last ${window} cleared the sent line`}>
                  {hits}/{games.length}
                </td>
                <td className="fxd-num">{r.overs.toFixed(1)}</td>
                <td className="fxd-num" title={`${r.overs.toFixed(1)} ov × ${r.econ.toFixed(1)} econ`}>
                  {r.runsConceded.toFixed(1)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="fxd-card-hint">Per-game figures are stand-ins (no bowling history feed yet) — wickets/runs/overs shaped by expectation. Red line = 25%+ off the L{window} {stat === 'avg' ? 'average' : 'median'}.</p>
    </>
  )
}

const TEAM_MARKET_KEYS = ['innings', 'r6', 'r12', '4s', '6s', '1st'] as const

function refOf(values: number[], stat: BatStat): number | null {
  const v = values
  if (v.length === 0) return null
  return stat === 'avg' ? meanOf(v) : medianOf(v)
}

function MarketGraphsCard({
  rows,
  window,
  stat,
}: {
  rows: MatchMarketRow[]
  window: BatWindow
  stat: BatStat
}) {
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])
  const refName = stat === 'avg' ? 'average' : 'median'
  return (
    <div className="fxd-mkt-graphs">
      <div className="fxd-mkt-legend" aria-hidden>
        <span className="fxd-mkt-legend-item"><i className="fxd-mkt-swatch fxd-mkt-bar--home" /> Home line</span>
        <span className="fxd-mkt-legend-item"><i className="fxd-mkt-swatch fxd-mkt-bar--away" /> Away line</span>
        <span className="fxd-mkt-legend-item"><i className="fxd-mkt-swatch fxd-mkt-swatch--ground" /> Ground {refName}</span>
        <span className="fxd-mkt-legend-item"><i className="fxd-mkt-swatch fxd-mkt-swatch--comp" /> Tournament {refName}</span>
      </div>
      {TEAM_MARKET_KEYS.map((key) => {
        const h = byId.get(`home-${key}`)
        const a = byId.get(`away-${key}`)
        if (!h || !a) return null
        const hRef = refOf(h.actuals.slice(0, window), stat)
        const aRef = refOf(a.actuals.slice(0, window), stat)
        const cRef = refOf(h.compActuals.slice(0, window), stat)
        const gRef = refOf(h.groundActuals.slice(0, window), stat)
        const max = Math.max(h.line, a.line, cRef ?? 0, gRef ?? 0, 1e-9)
        const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`
        return (
          <div key={key} className="fxd-mkt-graph">
            <div className="fxd-mkt-graph-head">
              <span className="fxd-mkt-graph-label">{h.label}</span>
              <span className="fxd-mkt-graph-vals">
                H {h.line.toFixed(1)} · A {a.line.toFixed(1)} · Comp {cRef != null ? cRef.toFixed(1) : '—'} · Grd {gRef != null ? gRef.toFixed(1) : '—'}
              </span>
            </div>
            <div
              className="fxd-mkt-garea"
              title={`${h.teamName} line ${h.line.toFixed(1)} (L${window} ${refName} ${hRef != null ? hRef.toFixed(1) : '—'}) · ${a.teamName} line ${a.line.toFixed(1)} (L${window} ${refName} ${aRef != null ? aRef.toFixed(1) : '—'}) · ground ${gRef != null ? gRef.toFixed(1) : '—'} · tournament ${cRef != null ? cRef.toFixed(1) : '—'}`}
            >
              <div className="fxd-mkt-grow">
                <i className="fxd-mkt-bar fxd-mkt-bar--home" style={{ width: pct(h.line) }} />
              </div>
              <div className="fxd-mkt-grow">
                <i className="fxd-mkt-bar fxd-mkt-bar--away" style={{ width: pct(a.line) }} />
              </div>
              {gRef != null ? <span className="fxd-mkt-marker fxd-mkt-marker--ground" style={{ left: pct(gRef) }} /> : null}
              {cRef != null ? <span className="fxd-mkt-marker fxd-mkt-marker--comp" style={{ left: pct(cRef) }} /> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MatchMarketsTable({
  rows,
  homeTeamId,
  window,
  stat,
  onWindow,
  onStat,
}: {
  rows: MatchMarketRow[]
  homeTeamId: string
  window: BatWindow
  stat: BatStat
  onWindow: (w: BatWindow) => void
  onStat: (s: BatStat) => void
}) {
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])
  const matchRows = useMemo(() => rows.filter((r) => r.scope === 'match'), [rows])
  if (rows.length === 0) return <p className="fxd-empty">No market data.</p>
  const refLabel = stat === 'avg' ? 'Avg' : 'Med'
  const windowSeg = (
    <div className="fxd-seg" role="tablist" aria-label="Recent window">
      {BAT_WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          role="tab"
          aria-selected={window === w}
          className={'fxd-seg-btn' + (window === w ? ' fxd-seg-btn--active' : '')}
          onClick={() => onWindow(w)}
        >
          L{w}
        </button>
      ))}
    </div>
  )
  const statSeg = (
    <div className="fxd-seg" role="tablist" aria-label="Average or median">
      {(
        [
          { key: 'avg', label: 'Avg' },
          { key: 'med', label: 'Med' },
        ] as const
      ).map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={stat === o.key}
          className={'fxd-seg-btn' + (stat === o.key ? ' fxd-seg-btn--active' : '')}
          onClick={() => onStat(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
  return (
    <>
      <div className="fxd-table-controls">
        {windowSeg}
        {statSeg}
      </div>
      <table className="fxd-table fxd-table--markets-merged">
        <thead>
          <tr>
            <th>Team</th>
            <th title="Over/under line ending in .5">Line</th>
            {Array.from({ length: window }, (_, i) => (
              <th key={i} title={i === 0 ? 'Most recent game: result over sent line' : `${i + 1} games ago`}>G{i + 1}</th>
            ))}
            <th title={`${refLabel} over last ${window}`}>{refLabel} L{window}</th>
            <th title={`Games in last ${window} clearing the sent line`}>Hit</th>
            <th title={`Competition ${refLabel} over last ${window}`}>Comp</th>
            <th title={`Ground ${refLabel} over last ${window}`}>Ground</th>
          </tr>
        </thead>
        <tbody>
          {TEAM_MARKET_KEYS.map((key) => {
            const h = byId.get(`home-${key}`)
            const a = byId.get(`away-${key}`)
            if (!h || !a) return null
            const cRef = refOf(h.compActuals.slice(0, window), stat)
            const gRef = refOf(h.groundActuals.slice(0, window), stat)
            const subRow = (
              side: MatchMarketRow,
              tone: 'home' | 'away',
            ) => {
              const actuals = side.actuals.slice(0, window)
              const sent = side.sentLines.slice(0, window)
              const ref = refOf(actuals, stat)
              const hits = actuals.filter((v, i) => v >= (sent[i] ?? side.line)).length
              return (
                <tr key={side.id} className="fxd-mkt-subrow">
                  <td>
                    <span className={teamChipClass(tone === 'home' ? homeTeamId : 'away', homeTeamId)} title={side.teamName}>
                      {side.teamName.slice(0, 3).toUpperCase()}
                    </span>
                  </td>
                  <td
                    className={'fxd-num fxd-num--hi' + lineWarnClass(side.line, ref)}
                    title={diffLabel(side.line, ref) + ` L${window} ${stat === 'avg' ? 'avg' : 'med'}`}
                  >
                    {side.line.toFixed(1)}
                  </td>
                  {Array.from({ length: window }, (_, i) => {
                    const v = actuals[i]
                    const s = sent[i] ?? side.line
                    if (v === undefined) return <td key={i} className="fxd-muted">—</td>
                    const over = v >= s
                    return (
                      <td
                        key={i}
                        className={'fxd-num ' + (over ? 'fxd-cell--over' : 'fxd-cell--under')}
                        style={formCellStyle(v, s)}
                        title={`${v} vs sent ${s.toFixed(1)}`}
                      >
                        <span className="fxd-cell-line">{s.toFixed(1)}</span>
                        {v}
                      </td>
                    )
                  })}
                  <td className="fxd-num">{ref != null ? ref.toFixed(1) : '—'}</td>
                  <td className="fxd-num" title={`${hits} of last ${window} cleared the sent line`}>
                    {hits}/{actuals.length}
                  </td>
                  <td className="fxd-num fxd-muted">{cRef != null ? cRef.toFixed(1) : '—'}</td>
                  <td className="fxd-num fxd-muted">{gRef != null ? gRef.toFixed(1) : '—'}</td>
                </tr>
              )
            }
            return (
              <Fragment key={key}>
                <tr className="fxd-mkt-grouprow">
                  <td colSpan={6 + window}>{h.label}</td>
                </tr>
                {subRow(h, 'home')}
                {subRow(a, 'away')}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {matchRows.length > 0 ? (
        <>
          <h3 className="fxd-subhead">Whole-match markets</h3>
          <table className="fxd-table">
            <thead>
              <tr>
                <th>Market</th>
                <th title="Over/under line ending in .5">Line</th>
                {Array.from({ length: window }, (_, i) => (
                  <th key={i} title={i === 0 ? 'Most recent game: result over sent line' : `${i + 1} games ago`}>G{i + 1}</th>
                ))}
                <th title={`${refLabel}, last ${window}`}>{refLabel} L{window}</th>
                <th title={`Games in last ${window} clearing the sent line`}>Hit</th>
              </tr>
            </thead>
            <tbody>
              {matchRows.map((r) => {
                const actuals = r.actuals.slice(0, window)
                const sent = r.sentLines.slice(0, window)
                const ref = refOf(actuals, stat)
                const hits = actuals.filter((a, i) => a >= (sent[i] ?? r.line)).length
                return (
                  <tr key={r.id}>
                    <td>
                      {r.label}{' '}
                      <span className="fxd-team-chip fxd-team-chip--match" title="Whole-match market">MATCH</span>
                    </td>
                    <td
                      className={'fxd-num fxd-num--hi' + lineWarnClass(r.line, ref)}
                      title={diffLabel(r.line, ref) + ` L${window} ${stat === 'avg' ? 'avg' : 'med'}`}
                    >
                      {r.line.toFixed(1)}
                    </td>
                    {Array.from({ length: window }, (_, i) => {
                      const a = actuals[i]
                      const s = sent[i] ?? r.line
                      if (a === undefined) return <td key={i} className="fxd-muted">—</td>
                      const over = a >= s
                      return (
                        <td
                          key={i}
                          className={'fxd-num ' + (over ? 'fxd-cell--over' : 'fxd-cell--under')}
                          style={formCellStyle(a, s)}
                          title={`${a} vs sent ${s.toFixed(1)}`}
                        >
                          <span className="fxd-cell-line">{s.toFixed(1)}</span>
                          {a}
                        </td>
                      )
                    })}
                    <td className="fxd-num">{ref != null ? ref.toFixed(1) : '—'}</td>
                    <td className="fxd-num" title={`${hits} of last ${window} cleared the sent line`}>
                      {hits}/{actuals.length}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      ) : null}
      <p className="fxd-card-hint">Stand-in histories shaped by model numbers until real results feed in. Red line = 20%+ off the L{window} {stat === 'avg' ? 'average' : 'median'}.</p>
    </>
  )
}

function BatterMatchupsCard({ matchups, homeTeamId }: { matchups: TeamBatterMatchups[]; homeTeamId: string }) {
  const [idx, setIdx] = useState(0)
  const m = matchups[Math.min(idx, Math.max(0, matchups.length - 1))]
  if (!m) return <p className="fxd-empty">No matchup data.</p>
  return (
    <>
      <div className="fxd-table-controls">
        <div className="fxd-seg" role="tablist" aria-label="Batting team">
          {matchups.map((t, i) => (
            <button
              key={t.teamId}
              type="button"
              role="tab"
              aria-selected={i === idx}
              className={'fxd-seg-btn' + (i === idx ? ' fxd-seg-btn--active' : '')}
              onClick={() => setIdx(i)}
            >
              {t.teamName} batters
            </button>
          ))}
        </div>
      </div>
      <table className="fxd-table">
        <thead>
          <tr>
            <th>Batter</th>
            <th title="Expected strike rate (prep)">Exp SR</th>
            {m.bowlers.map((b) => (
              <th key={b.id} title={`vs ${b.name}`}>{b.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.batterId}>
              <td>
                {r.batterName}{' '}
                <span className={teamChipClass(m.teamId, homeTeamId)} title={`${m.teamName} · batting #${r.position}`}>
                  #{r.position}
                </span>
              </td>
              <td className="fxd-num">{r.expSr100.toFixed(0)}</td>
              {r.cells.map((c, ci) => {
                const small = c.balls < 12
                const expected = r.expSr100 > 0 ? r.expSr100 : 130
                const dev = Math.abs(c.strikeRate - expected) / expected
                const flagged = !small && dev > 0.25
                const over = c.strikeRate >= expected
                return (
                  <td
                    key={m.bowlers[ci]?.id ?? ci}
                    className={
                      'fxd-num ' +
                      (small ? 'fxd-cell--small' : flagged ? (over ? 'fxd-cell--over' : 'fxd-cell--under') : '')
                    }
                    style={flagged ? formCellStyle(c.strikeRate, expected) : undefined}
                    title={`${r.batterName} vs ${m.bowlers[ci]?.name ?? ''}: ${c.runs} runs off ${c.balls} balls, ${c.dismissals} dismissal${c.dismissals === 1 ? '' : 's'} · SR ${c.strikeRate.toFixed(1)} · Avg ${c.average != null ? c.average.toFixed(1) : '—'} (expected SR ${expected.toFixed(0)}${small ? ' — small sample' : ''})`}
                  >
                    <span className="fxd-cell-line">{c.balls} balls</span>
                    {c.runs}
                    <span className="fxd-cell-sub">SR {c.strikeRate.toFixed(0)}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fxd-card-hint">Stand-in matchup histories until ball-by-ball feeds in. Green/red = SR 25%+ off expected (min 12 balls, faded below). Hover a cell for dismissals and average.</p>
    </>
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
  const [mktWindow, setMktWindow] = useState<BatWindow>(5)
  const [mktStat, setMktStat] = useState<BatStat>('avg')

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
              <span className="fxd-cond-stepper" title="Base conditions for this game — applies to both teams">
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

          {/* Right: condensed win-prob track (click to expand) */}
          <div className="fxd-tpanel-track">
            <div className="fxd-card-headrow">
              <h2 className="fxd-card-title">
                <span className="fxd-card-icon" aria-hidden>↗</span>
                Win probability
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
          </div>

          {/* Middle: match market (prob + price + avg) */}
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

      {/* Modelled totals + ground record strip, full width */}
      <section className="fxd-card fxd-headline-card" aria-label="Modelled totals and ground record">
        <div className="fxd-headline-strip">
          <div className="fxd-headline">
            <span className="fxd-headline-cap">{home.flag} {home.name}</span>
            <span className="fxd-headline-val fxd-headline-val--home">{detail.homeBattingFirst.avgScoreBattingFirst}</span>
            <span className="fxd-headline-sub">Modelled batting first</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">🏟 {detail.ground?.name ?? detail.venue}</span>
            <span className="fxd-headline-val">{detail.homeBattingFirst.parScoreAtGround}</span>
            <span className="fxd-headline-sub">Par score at ground</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">{away.flag} {away.name}</span>
            <span className="fxd-headline-val fxd-headline-val--away">{detail.awayBattingFirst.avgScoreBattingFirst}</span>
            <span className="fxd-headline-sub">Modelled batting first</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">Innings (sample)</span>
            <span className="fxd-headline-val">{detail.groundRecord.inningsPlayed}</span>
            <span className="fxd-headline-sub">Record at ground</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">Avg 1st innings</span>
            <span className="fxd-headline-val">{detail.groundRecord.avgFirstInnings}</span>
            <span className="fxd-headline-sub">Record at ground</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">Avg sixes</span>
            <span className="fxd-headline-val">{detail.groundRecord.avgSixes}</span>
            <span className="fxd-headline-sub">Record at ground</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">Win batting first</span>
            <span className="fxd-headline-val">{detail.groundRecord.winBatFirstPct}%</span>
            <span className="fxd-headline-sub">Record at ground</span>
          </div>
          <div className="fxd-headline">
            <span className="fxd-headline-cap">Home side wins</span>
            <span className="fxd-headline-val">{detail.groundRecord.homeTeamWinsPct}%</span>
            <span className="fxd-headline-sub">Record at ground</span>
          </div>
        </div>
      </section>

      {/* Match markets + modelled totals side by side */}
      <div className="fxd-duo">
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>▤</span>
            Match markets · {home.name} & {away.name}
          </h2>
          <div className="fxd-table-wrap">
            <MatchMarketsTable
              rows={detail.matchMarkets}
              homeTeamId={detail.home.teamId}
              window={mktWindow}
              stat={mktStat}
              onWindow={setMktWindow}
              onStat={setMktStat}
            />
          </div>
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

      {/* Modelled totals + head-to-head phase scoring */}
      <section className="fxd-card">
        <h2 className="fxd-card-title">
          <span className="fxd-card-icon" aria-hidden>⚔</span>
          Head-to-head · runs by phase
        </h2>
        <p className="fxd-h2h-names"><span className="fxd-h2h-home">{home.name}</span> vs <span className="fxd-h2h-away">{away.name}</span></p>
        <h3 className="fxd-subhead">Market lines vs competition & ground</h3>
        <MarketGraphsCard rows={detail.matchMarkets} window={mktWindow} stat={mktStat} />
        <h3 className="fxd-subhead">Phase scoring</h3>
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

      {/* Players: batting + bowling side by side */}
      <div className="fxd-duo fxd-duo--players">
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>★</span>
            Batting · {home.name} & {away.name}
          </h2>
          <div className="fxd-table-wrap">
            <CombinedBattingTable rows={[...detail.homeBatters, ...detail.awayBatters]} homeTeamId={detail.home.teamId} />
          </div>
        </section>
        <section className="fxd-card">
          <h2 className="fxd-card-title">
            <span className="fxd-card-icon" aria-hidden>●</span>
            Bowling · {home.name} & {away.name}
          </h2>
          <div className="fxd-table-wrap">
            <CombinedBowlingTable rows={[...detail.homeBowlers, ...detail.awayBowlers]} homeTeamId={detail.home.teamId} />
          </div>
        </section>
      </div>

      {/* Batter v bowler head-to-head matrix */}
      <section className="fxd-card">
        <h2 className="fxd-card-title">
          <span className="fxd-card-icon" aria-hidden>✕</span>
          Batter v bowler · head-to-head
        </h2>
        <div className="fxd-table-wrap">
          <BatterMatchupsCard matchups={detail.batterMatchups} homeTeamId={detail.home.teamId} />
        </div>
      </section>

      {/* Markets */}
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
      </div>
    </div>
  )
}
