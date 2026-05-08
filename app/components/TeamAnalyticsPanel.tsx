'use client'

import type { CSSProperties } from 'react'
import type { Team } from '../data/teams'
import {
  generateTeamAnalyticsMock,
  type ArchetypeBar,
  type PercentileBadge,
  type PhaseBlock,
  type RadarFacet,
  type DismissalSlice,
  type TeamAnalyticsSnapshot,
} from '../data/teamAnalyticsMock'
import { getTeamLogo } from '../data/logoStore'
import { teamAggregateRatingClass } from '../data/ratingDisplaySettings'

interface TeamAnalyticsPanelProps {
  team: Team
  batRating: number
  bowlRating: number
  tournamentName: string
  /** From tournament dashboard: opens squad workspace and can close overlay from parent */
  onGoToSquad?: () => void
  onClose: () => void
  /**
   * `overlay` — full-viewport backdrop (tournament dashboard).
   * `docked` — same column as player stats in team workspace (`panelWidth` + flex shell).
   */
  mode?: 'overlay' | 'docked'
  /** Fixed width when `mode="docked"` (matches PlayerDetailPanel). */
  panelWidth?: number
}

function hexPolygonPoints(values: readonly number[], inset = 26, outer = 88): string {
  const cx = 100
  const cy = 100
  const n = values.length || 6
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const vv = Math.max(0, Math.min(1, values[i] ?? 0))
    const r = inset + vv * (outer - inset)
    pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`)
  }
  return pts.join(' ')
}

function RadarBlock({
  title,
  accent,
  facets,
}: {
  title: string
  accent: 'bat' | 'bowl'
  facets: RadarFacet[]
}) {
  const teamPts = facets.map((f) => f.team)
  const parPts = facets.map((f) => f.par)
  const stroke = accent === 'bat' ? 'rgba(147,197,253,0.95)' : 'rgba(252,165,165,0.95)'
  const fillSoft = accent === 'bat' ? 'rgba(96,165,250,0.18)' : 'rgba(248,113,113,0.14)'
  const parDash = accent === 'bat' ? 'rgba(148,163,184,0.35)' : 'rgba(248,113,113,0.35)'

  return (
    <div className={`tap-radar-wrap tap-radar-wrap--${accent}`}>
      <div className="tap-radar-title">{title}</div>
      <div className="tap-radar-body">
        <svg viewBox="0 0 200 210" className="tap-radar-svg" aria-hidden focusable={false}>
          <polygon points={hexPolygonPoints([1, 1, 1, 1, 1, 1])} className="tap-radar-ring tap-radar-ring--outer" />
          <polygon points={hexPolygonPoints([0.66, 0.66, 0.66, 0.66, 0.66, 0.66])} className="tap-radar-ring tap-radar-ring--mid" />
          <polygon
            points={hexPolygonPoints(parPts)}
            fill="none"
            stroke={parDash}
            strokeWidth="1.75"
            strokeDasharray="4 6"
          />
          <polygon points={hexPolygonPoints(teamPts)} fill={fillSoft} stroke={stroke} strokeWidth="2.2" />
        </svg>
        <div className="tap-radar-axes" aria-hidden>
          {facets.map((f) => (
            <span key={f.label} title={`${f.label}: team facet vs cohort`}>
              {f.label.split(/\s+/).slice(0, 2).join(' ')}
            </span>
          ))}
        </div>
        <div className="tap-radar-legend">
          <span className="tap-radar-legend-sw tap-radar-sw--team">This team</span>
          <span className="tap-radar-legend-sw tap-radar-sw--par">Cohort avg</span>
        </div>
      </div>
    </div>
  )
}

function ConfidenceMeter({ pct, tone, hint }: { pct: number; tone: TeamAnalyticsSnapshot['confidenceTone']; hint: string }) {
  const gradient =
    tone === 'low'
      ? 'linear-gradient(90deg, rgba(239,68,68,0.55), rgba(251,191,36,0.55))'
      : tone === 'mid'
        ? 'linear-gradient(90deg, rgba(251,191,36,0.55), rgba(52,211,153,0.45))'
        : 'linear-gradient(90deg, rgba(52,211,153,0.65), rgba(94,234,212,0.55))'

  return (
    <div className="tap-confidence">
      <div className="tap-confidence-head">
        <span className="tap-confidence-label">Evidence strength</span>
        <span className="tap-confidence-value">{pct}%</span>
      </div>
      <div className="tap-confidence-track" role="img" aria-label={`Evidence strength ${pct} percent`}>
        <div
          className="tap-confidence-fill"
          style={{ width: `${pct}%`, background: gradient } as CSSProperties}
        />
      </div>
      {hint ? <p className="tap-confidence-hint">{hint}</p> : null}
    </div>
  )
}

function PhaseHeat({
  title,
  phases,
  accent,
}: {
  title: string
  phases: PhaseBlock[]
  accent: 'bat' | 'bowl'
}) {
  const warm = accent === 'bat' ? 'var(--tap-bat-warm)' : 'var(--tap-bowl-warm)'
  return (
    <div className={`tap-phase tap-phase--${accent}`}>
      <div className="tap-subhead">{title}</div>
      <div className="tap-phase-grid">
        {phases.map((p) => (
          <div key={p.label} className="tap-phase-card">
            <div className="tap-phase-cap">{p.label}</div>
            {p.sr !== undefined ? (
              <div className="tap-phase-metrics">
                <span className="tap-phase-chip">SR {Math.round(p.sr)}</span>
                <span className="tap-phase-chip">RR {p.rr?.toFixed(2)}</span>
              </div>
            ) : (
              <div className="tap-phase-metrics">
                <span className="tap-phase-chip">Econ RR {p.rr?.toFixed(2)}</span>
              </div>
            )}
            <div className="tap-phase-bar-track">
              <div className="tap-phase-bar-fill" style={{ width: `${p.intensity * 100}%`, background: warm }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchupRails({ accent, bars }: { accent: 'bat' | 'bowl'; bars: ArchetypeBar[] }) {
  const trackBg =
    accent === 'bat'
      ? 'linear-gradient(90deg, rgba(248,113,113,0.22) 0%, rgba(251,191,36,0.12) 45%, rgba(96,165,250,0.28) 100%)'
      : 'linear-gradient(90deg, rgba(96,165,250,0.2) 0%, rgba(253,224,71,0.1) 50%, rgba(248,113,113,0.28) 100%)'

  return (
    <div className={`tap-matchups tap-matchups--${accent}`}>
      {bars.map((b) => {
        const t = Math.max(-1, Math.min(1, b.value))
        const pct = `${50 + t * 40}%`
        return (
          <div key={b.label} className="tap-matchup-row">
            <div className="tap-matchup-label">
              <span>{b.label}</span>
              {b.subtitle && <span className="tap-matchup-sub">{b.subtitle}</span>}
            </div>
            <div
              className="tap-mu-track"
              style={{ background: trackBg } as CSSProperties}
              title={`Tilt ${(t >= 0 ? '+' : '') + t.toFixed(2)} (demo)`}
            >
              <span className="tap-mu-mid" />
              <span className={`tap-mu-dot tap-mu-dot--${accent}`} style={{ left: pct }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PercentileRow({ badges }: { badges: PercentileBadge[] }) {
  return (
    <div className="tap-pct-strip">
      {badges.map((b) => (
        <div key={b.label} className={`tap-pct-slot tap-pct-slot--${b.accent}`}>
          <div className="tap-pct-caption">{b.label}</div>
          <div className="tap-pct-bar">
            <div className={`tap-pct-fill tap-pct-fill--${b.accent}`} style={{ width: `${Math.max(4, Math.min(100, b.slot))}%` }} />
          </div>
          <div className="tap-pct-num">{b.slot}<span className="tap-pct-sfx"> pct</span></div>
        </div>
      ))}
    </div>
  )
}

function DonutSlices({ slices }: { slices: DismissalSlice[] }) {
  let accDeg = 0
  const segs = slices.map((s) => {
    const sweep = (s.pct / 100) * 360
    const a = accDeg
    accDeg += sweep
    return `${s.hue} ${a.toFixed(2)}deg ${accDeg.toFixed(2)}deg`
  })
  const grads = segs.join(', ')

  return (
    <div className="tap-dismissals">
      <div
        className="tap-donut-core"
        style={{ background: `conic-gradient(${grads})` } as CSSProperties}
        role="img"
        aria-label="Dismissal mix"
      />
      <ul className="tap-donut-legend">
        {slices.map((s) => (
          <li key={s.key}>
            <span className="tap-donut-swatch" style={{ background: s.hue }} />
            {s.key} <strong>{s.pct}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function TeamAnalyticsPanel({
  team,
  batRating,
  bowlRating,
  tournamentName,
  onGoToSquad,
  onClose,
  mode = 'overlay',
  panelWidth = 400,
}: TeamAnalyticsPanelProps) {
  const data = generateTeamAnalyticsMock(team.id)

  const logo = getTeamLogo(team.id) || team.logo || null

  const goToSquad = mode === 'docked' ? undefined : onGoToSquad

  const dockedShellStyle =
    mode === 'docked'
      ? ({
          width: panelWidth,
          flex: '0 0 auto',
          minWidth: 260,
          maxWidth: 'min(640px, 70vw)',
        } as CSSProperties)
      : undefined

  const panelInner = (
    <>
        <header className="tap-header">
          <div className="tap-brand">
            <div className="tap-brand-logo">
              {logo ? (
                <img src={logo} alt="" width={52} height={52} />
              ) : (
                <span aria-hidden>{team.name.charAt(0)}</span>
              )}
            </div>
            <div className="tap-brand-text">
              <h2 id="tap-panel-heading" className="tap-title">
                {team.name}
              </h2>
              <p className="tap-meta">{tournamentName}</p>
            </div>
          </div>
          <button type="button" className="tap-close" onClick={onClose} title="Close">
            ×
          </button>
        </header>

        <div className="tap-chip-row">
          <span className="tap-chip tap-chip-bat">
            XI bat Σ{' '}
            <strong className={teamAggregateRatingClass(batRating)}>{batRating.toFixed(1)}</strong>
          </span>
          <span className="tap-chip tap-chip-bowl">
            XI bowl Σ{' '}
            <strong className={teamAggregateRatingClass(bowlRating)}>{bowlRating.toFixed(1)}</strong>
          </span>
          <span className="tap-chip tap-chip-total">
            Blend{' '}
            <strong className={teamAggregateRatingClass((batRating + bowlRating) / 2)}>
              {((batRating + bowlRating) / 2).toFixed(1)}
            </strong>
          </span>
        </div>

        <ConfidenceMeter pct={data.confidencePct} tone={data.confidenceTone} hint={data.confidenceHint} />

        <section className="tap-section tap-section--bat">
          <header className="tap-section-head">
            <span className="tap-ribbon bat">Batting footprint</span>
            <span className="tap-section-blurb">Phase heat · matchups · shape</span>
          </header>
          <div className="tap-section-grid">
            <RadarBlock title="Shape vs cohort" accent="bat" facets={data.batting.radar} />
            <div className="tap-side-stack">
              <PercentileRow badges={data.batting.percentiles} />
              <PhaseHeat title="Run-making by phase" phases={data.batting.phases} accent="bat" />
            </div>
          </div>
          <div className="tap-subhead-line bat">Matchup edge vs bowling types</div>
          <MatchupRails accent="bat" bars={data.batting.vsBowlingArchetypes} />
          <div className="tap-subhead-line bat">Dismissal portrait (demo)</div>
          <DonutSlices slices={data.batting.dismissals} />
        </section>

        <section className="tap-section tap-section--bowl">
          <header className="tap-section-head">
            <span className="tap-ribbon bowl">Bowling footprint</span>
            <span className="tap-section-blurb">Control · wickets · matchup tilt</span>
          </header>
          <div className="tap-section-grid">
            <RadarBlock title="Shape vs cohort" accent="bowl" facets={data.bowling.radar} />
            <div className="tap-side-stack">
              <PercentileRow badges={data.bowling.percentiles} />
              <PhaseHeat title="Economy strain by phase" phases={data.bowling.phases} accent="bowl" />
            </div>
          </div>
          <div className="tap-subhead-line bowl">Bowling vs batting styles</div>
          <MatchupRails accent="bowl" bars={data.bowling.vsBattingHands} />
        </section>

        {goToSquad && (
          <div className="tap-footer">
            <button type="button" className="tap-btn-secondary" onClick={goToSquad}>
              Open squad workspace
            </button>
          </div>
        )}
    </>
  )

  if (mode === 'docked') {
    return (
      <aside
        className="tap-panel tap-panel--docked"
        role="region"
        aria-labelledby="tap-panel-heading"
        style={dockedShellStyle}
      >
        {panelInner}
      </aside>
    )
  }

  return (
    <div className="tap-backdrop" role="presentation">
      <div className="tap-backdrop-hit" aria-hidden="true" onClick={onClose} />
      <aside
        className="tap-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tap-panel-heading"
        onClick={(e) => e.stopPropagation()}
      >
        {panelInner}
      </aside>
    </div>
  )
}
