'use client'

import type { StatzTeamMatch } from '../data/statzTeam'

const CHART_N = 12

function resultLetter(result: StatzTeamMatch['result']): 'W' | 'L' | 'A' | 'U' {
  if (result === 'Won') return 'W'
  if (result === 'Lost') return 'L'
  if (result === 'Abandoned') return 'A'
  return 'U'
}

function shortOpp(name: string | null): string {
  if (!name) return '—'
  const bits = name.trim().split(/\s+/)
  if (bits.length === 1) return bits[0].slice(0, 3).toUpperCase()
  return bits.map((b) => b[0]).join('').slice(0, 3).toUpperCase()
}

/** Newest-first feed → oldest-to-newest for time series. */
function lastNChrono(matches: StatzTeamMatch[], n = CHART_N): StatzTeamMatch[] {
  return [...matches.slice(0, n)].reverse()
}

export function HubTeamCharts({
  matches,
  formatLabel,
}: {
  matches: StatzTeamMatch[]
  formatLabel: string
}) {
  const chrono = lastNChrono(matches)
  const runPairs = chrono.map((m) => ({
    scored: m.teamRuns,
    conceded: m.oppRuns,
    label: shortOpp(m.opponent),
  }))
  const hasRuns = runPairs.some((p) => p.scored != null || p.conceded != null)
  const rr = chrono.map((m) => m.runRate)
  const hasRr = rr.some((v) => v != null)
  const wkts = chrono.map((m) => m.wicketsTaken)
  const hasWkts = wkts.some((v) => v != null)
  const labels = chrono.map((m) => shortOpp(m.opponent))

  return (
    <div className="thp-charts">
      <section className="ph-card thp-chart-card">
        <div className="ph-card-head">
          <h2 className="ph-card-title">Results</h2>
          <span className="ph-source-badge">{formatLabel} · last {chrono.length}</span>
        </div>
        {chrono.length === 0 ? (
          <ChartEmpty label="No results in this format yet" />
        ) : (
          <ThpResultBars matches={chrono} />
        )}
      </section>

      <section className="ph-card thp-chart-card">
        <div className="ph-card-head">
          <h2 className="ph-card-title">Runs scored vs conceded</h2>
          <span className="thp-legend">
            <span className="thp-legend-i thp-legend-i--scored" /> Scored
            <span className="thp-legend-i thp-legend-i--conceded" /> Conceded
          </span>
        </div>
        {hasRuns ? <ThpDualLine series={runPairs} /> : <ChartEmpty label="No innings totals in this feed" />}
      </section>

      <section className="ph-card thp-chart-card">
        <div className="ph-card-head">
          <h2 className="ph-card-title">Run rate</h2>
          <span className="ph-source-badge">Team RR</span>
        </div>
        {hasRr ? (
          <ThpValueBars values={rr} labels={labels} kind="rr" />
        ) : (
          <ChartEmpty label="No run-rate series in this feed" />
        )}
      </section>

      <section className="ph-card thp-chart-card">
        <div className="ph-card-head">
          <h2 className="ph-card-title">Wickets taken</h2>
          <span className="ph-source-badge">Per match</span>
        </div>
        {hasWkts ? (
          <ThpValueBars values={wkts} labels={labels} kind="wkts" />
        ) : (
          <ChartEmpty label="No bowling wickets in this feed" />
        )}
      </section>
    </div>
  )
}

export function ThpFormStrip({ matches }: { matches: StatzTeamMatch[] }) {
  const row = matches.slice(0, 20)
  if (row.length === 0) {
    return (
      <section className="ph-card">
        <h2 className="ph-card-title">Form</h2>
        <ChartEmpty label="Form appears when match results are available" />
      </section>
    )
  }
  return (
    <section className="ph-card">
      <div className="ph-card-head">
        <h2 className="ph-card-title">Form</h2>
        <span className="ph-muted">Most recent first · {row.length} matches</span>
      </div>
      <div className="thp-form-strip" role="list" aria-label="Recent match form">
        {row.map((m, i) => {
          const letter = resultLetter(m.result)
          return (
            <div key={`${m.isoDate}-${m.opponent}-${i}`} className="thp-form-cell" role="listitem" title={`${letter} v ${m.opponent ?? '—'}`}>
              <span className={`thp-form-sq thp-form-sq--lg thp-form-sq--${letter.toLowerCase()}`}>{letter}</span>
              <span className="thp-form-opp">{shortOpp(m.opponent)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="ph-empty thp-chart-empty">
      <div className="ph-empty-title">{label}</div>
    </div>
  )
}

function ThpResultBars({ matches }: { matches: StatzTeamMatch[] }) {
  return (
    <div className="thp-bars" aria-hidden={false}>
      {matches.map((m, i) => {
        const letter = resultLetter(m.result)
        const h = letter === 'W' ? 100 : letter === 'L' ? 42 : 18
        return (
          <div key={`${m.isoDate}-res-${i}`} className="thp-bar" title={`${letter} v ${m.opponent ?? '—'}`}>
            <span className="thp-bar-val">{letter}</span>
            <span className={`thp-bar-col thp-bar-col--${letter.toLowerCase()}`} style={{ height: `${h}%` }} />
            <span className="thp-bar-lab">{shortOpp(m.opponent)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ThpValueBars({
  values,
  labels,
  kind,
}: {
  values: Array<number | null>
  labels: string[]
  kind: 'rr' | 'wkts'
}) {
  const nums = values.filter((v): v is number => v != null)
  const max = Math.max(...nums, kind === 'wkts' ? 10 : 1)
  return (
    <div className="thp-bars">
      {values.map((v, i) => {
        const pct = v == null ? 0 : Math.max(6, (v / max) * 100)
        return (
          <div key={`${kind}-${i}`} className="thp-bar" title={v == null ? '—' : String(v)}>
            <span className="thp-bar-val">{v == null ? '—' : kind === 'rr' ? v.toFixed(1) : String(v)}</span>
            <span
              className={`thp-bar-col ${kind === 'wkts' ? 'thp-bar-col--wkts' : 'thp-bar-col--rr'}`}
              style={{ height: v == null ? '4%' : `${pct}%` }}
            />
            <span className="thp-bar-lab">{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function ThpDualLine({
  series,
}: {
  series: Array<{ scored: number | null; conceded: number | null; label: string }>
}) {
  const w = 560
  const h = 140
  const padL = 28
  const padR = 8
  const padT = 10
  const padB = 22
  const nums = series.flatMap((s) => [s.scored, s.conceded]).filter((n): n is number => n != null)
  const max = Math.max(...nums, 1)
  const n = Math.max(series.length - 1, 1)
  const xAt = (i: number) => padL + (i / n) * (w - padL - padR)
  const yAt = (v: number) => padT + (1 - v / max) * (h - padT - padB)

  function pathFor(key: 'scored' | 'conceded'): string {
    const parts: string[] = []
    let drawing = false
    series.forEach((s, i) => {
      const v = s[key]
      if (v == null) {
        drawing = false
        return
      }
      const cmd = drawing ? 'L' : 'M'
      parts.push(`${cmd}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
      drawing = true
    })
    return parts.join(' ')
  }

  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t))

  return (
    <div className="thp-svg-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="thp-svg" role="img" aria-label="Runs scored versus conceded">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="thp-svg-grid"
              x1={padL}
              x2={w - padR}
              y1={yAt(tick)}
              y2={yAt(tick)}
            />
            <text className="thp-svg-tick" x={2} y={yAt(tick) + 3}>
              {tick}
            </text>
          </g>
        ))}
        <path d={pathFor('conceded')} className="thp-svg-line thp-svg-line--conceded" />
        <path d={pathFor('scored')} className="thp-svg-line thp-svg-line--scored" />
        {series.map((s, i) =>
          s.scored != null ? (
            <circle key={`s-${i}`} className="thp-svg-dot thp-svg-dot--scored" cx={xAt(i)} cy={yAt(s.scored)} r={2.4} />
          ) : null,
        )}
        {series.map((s, i) => (
          <text key={`l-${i}`} className="thp-svg-x" x={xAt(i)} y={h - 4} textAnchor="middle">
            {s.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
