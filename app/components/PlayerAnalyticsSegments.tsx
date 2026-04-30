'use client'

import type { CSSProperties } from 'react'
import type {
  PctlStat,
  PlayerDeepBattingMock,
  PlayerDeepBowlingMock,
  PlayerFingerprint,
  RecentBatInningsRow,
  RecentBowlingSpellRow,
} from '../data/playerAnalyticsMock'

function polygonPts(values: readonly number[], inset = 18, outer = 54, cx = 60, cy = 60): string {
  const n = values.length || 5
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const vv = Math.max(0, Math.min(1, values[i] ?? 0))
    const r = inset + vv * (outer - inset)
    pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`)
  }
  return pts.join(' ')
}

function percentileTier(pct: number): 'hi' | 'mid' | 'lo' {
  if (pct >= 70) return 'hi'
  if (pct >= 38) return 'mid'
  return 'lo'
}

const HERO_ABBR_BAT: Record<string, string> = {
  'Strike rate': 'SR',
  Average: 'Avg',
  'Runs / innings': 'RPI',
  '% 30+ scores': '30%+',
  '6s / 100 balls': '6%/100',
}

const HERO_ABBR_BOWL: Record<string, string> = {
  Economy: 'Econ',
  'Bowling average': 'Bow.A',
  'Balls / wicket': 'B/Wkt',
  'Wickets / inning': 'W/Inn',
  'Dot%': 'Dot%',
}

function heroAbbr(kind: 'bat' | 'bowl', stat: PctlStat): string {
  const table = kind === 'bat' ? HERO_ABBR_BAT : HERO_ABBR_BOWL
  return table[stat.label] ?? stat.label.slice(0, 6)
}

function PentagonMini({
  accent,
  facets,
}: {
  accent: 'bat' | 'bowl'
  facets: PlayerFingerprint[]
}) {
  const vals = facets.map((f) => f.value)
  const stroke = accent === 'bat' ? 'rgba(147,197,253,0.88)' : 'rgba(252,165,165,0.88)'
  const fillSoft = accent === 'bat' ? 'rgba(96,165,250,0.18)' : 'rgba(248,113,113,0.13)'
  const band = facets.map(() => 0.5)

  return (
    <div className={`pp-penta-mini pp-penta-mini--${accent}`}>
      <div className="pp-penta-mini-head">
        <span>Fingerprint pentagon · cohort norm</span>
        <span className="pp-penta-mini-muted">facet length ≃ percentile spine</span>
      </div>
      <div className="pp-penta-mini-body">
        <svg viewBox="0 0 120 132" className="pp-penta-mini-svg" aria-hidden>
          <polygon
            points={polygonPts([1, 1, 1, 1, 1], 18, 54, 60, 60)}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="1"
          />
          <polygon
            points={polygonPts(band, 18, 54, 60, 60)}
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeDasharray="3 6"
          />
          <polygon points={polygonPts(vals, 18, 54, 60, 60)} fill={fillSoft} stroke={stroke} strokeWidth="1.5" />
        </svg>
        <div className="pp-penta-legend">
          {facets.map((f) => (
            <div key={f.label} className="pp-penta-legend-item">
              <span className="pp-penta-abbrev">{f.label}</span>
              <span className="pp-penta-frac">{Math.round(f.value * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CareerHeroStrip({ accent, stats }: { accent: 'bat' | 'bowl'; stats: PctlStat[] }) {
  const kind = accent
  return (
    <div className={`pp-hero-strip pp-hero-strip--${accent}`}>
      {stats.map((s) => (
        <div key={s.label} className="pp-hero-chip">
          <span className="pp-hero-abbr">{heroAbbr(kind, s)}</span>
          <span className="pp-hero-val">{s.valueDisplay}</span>
          <span className={`pp-hero-tier pp-tier-${percentileTier(s.percentile)}`}>{s.percentile}ᵗʰ</span>
          <span className="pp-hero-micro">
            <span
              className="pp-hero-micro-fill"
              style={{ width: `${Math.max(4, Math.min(100, s.percentile))}%` } as CSSProperties}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

function RecentBattingMicro({ rows }: { rows: RecentBatInningsRow[] }) {
  return (
    <section className="pp-recent-block pp-recent-block--bat">
      <header className="pp-recent-h">
        <span>Recent outings · innings CAZ delta vs anchor</span>
        <span className="pp-recent-muted">RNG preview · Prev = rolling benchmark</span>
      </header>
      <div className="pp-recent-micro-wrap">
        <table className="pp-recent-micro">
          <thead>
            <tr>
              <th>#</th>
              <th>R</th>
              <th>Bls</th>
              <th>Prev CAZ</th>
              <th>Inn CAZ*</th>
              <th>Δ</th>
              <th>vs prior</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ix}>
                <td>{r.ix}</td>
                <td>{r.runs}</td>
                <td>{r.balls}</td>
                <td>{r.priorBtCaz.toFixed(1)}</td>
                <td>{r.innBtCaz.toFixed(1)}</td>
                <td className={r.deltaVsPrior >= 0 ? 'pp-rc-pos' : 'pp-rc-neg'}>
                  {r.deltaVsPrior >= 0 ? '+' : ''}
                  {r.deltaVsPrior.toFixed(1)}
                </td>
                <td className="pp-rc-tag">{r.deltaVsPrior >= 0 ? 'above' : 'below'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pp-recent-foot">*Synthetic innings fingerprint — swaps with ball-by-ball model later.</p>
    </section>
  )
}

function RecentBowlingMicro({ rows }: { rows: RecentBowlingSpellRow[] }) {
  return (
    <section className="pp-recent-block pp-recent-block--bowl">
      <header className="pp-recent-h">
        <span>Recent spells · econ Δ vs baseline</span>
        <span className="pp-recent-muted">Lower econ vs prior ⇒ lean “above curve” defence</span>
      </header>
      <div className="pp-recent-micro-wrap">
        <table className="pp-recent-micro">
          <thead>
            <tr>
              <th>#</th>
              <th>Ovr</th>
              <th>R</th>
              <th>W</th>
              <th>Prior</th>
              <th>Econ*</th>
              <th>Δ</th>
              <th>vs prior</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ix}>
                <td>{r.ix}</td>
                <td>{r.overs.toFixed(1)}</td>
                <td>{r.runsConc}</td>
                <td>{r.wickets}</td>
                <td>{r.priorIndex.toFixed(2)}</td>
                <td>{r.innEcon.toFixed(2)}</td>
                <td className={r.deltaVsPrior <= 0 ? 'pp-rc-pos' : 'pp-rc-neg'}>
                  {r.deltaVsPrior >= 0 ? '+' : ''}
                  {r.deltaVsPrior.toFixed(2)}
                </td>
                <td className="pp-rc-tag">{r.deltaVsPrior <= 0 ? 'better' : 'hurt'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pp-recent-foot">*Spell economy vs entering prior — illustrative sample.</p>
    </section>
  )
}

function CertaintyRibbon({
  pct,
  battingInningsEst,
  ballsEst,
  compact,
}: {
  pct: number
  battingInningsEst?: number
  ballsEst?: number
  compact?: boolean
}) {
  const grad =
    pct < 40
      ? 'linear-gradient(90deg,rgba(248,113,113,0.45),rgba(251,191,36,0.35))'
      : pct < 72
        ? 'linear-gradient(90deg,rgba(251,191,36,0.45),rgba(52,211,153,0.35))'
        : 'linear-gradient(90deg,rgba(52,211,153,0.5),rgba(94,234,212,0.4))'

  return (
    <section className={`pp-segment pp-segment-certainty${compact ? ' pp-segment-certainty--compact' : ''}`}>
      <div className="pp-certainty-heading">
        <span className="pp-certainty-title">Certainty • sample-derived</span>
        <strong className="pp-certainty-pct">{pct}%</strong>
      </div>
      <div className="pp-certainty-meter">
        <div className="pp-certainty-fill-bg">
          <div className="pp-certainty-fill" style={{ width: `${pct}%`, background: grad } as CSSProperties} />
        </div>
        {!compact && (
          <p className="pp-certainty-copy">
            Confidence scales with repeatable volume — ~
            <strong>{battingInningsEst ?? '–'}</strong> batting innings (~<strong>{ballsEst ?? '–'}</strong> balls sampled).
          </p>
        )}
        {compact && (
          <p className="pp-certainty-copy pp-certainty-copy--dense">
            ~{battingInningsEst ?? '–'} inns • ~{ballsEst ?? '–'} balls contextualised • higher volume tightens ladders.
          </p>
        )}
      </div>
    </section>
  )
}

function BowlingCertaintyRibbon({
  pct,
  inningsEst,
  ballsEst,
  compact,
}: {
  pct: number
  inningsEst: number
  ballsEst: number
  compact?: boolean
}) {
  const grad =
    pct < 40
      ? 'linear-gradient(90deg,rgba(248,113,113,0.45),rgba(251,191,36,0.35))'
      : pct < 72
        ? 'linear-gradient(90deg,rgba(251,191,36,0.45),rgba(52,211,153,0.35))'
        : 'linear-gradient(90deg,rgba(52,211,153,0.5),rgba(94,234,212,0.4))'

  return (
    <section className={`pp-segment pp-segment-certainty pp-segment-certainty--bowl${compact ? ' pp-segment-certainty--compact' : ''}`}>
      <div className="pp-certainty-heading">
        <span className="pp-certainty-title">Certainty • sample-derived</span>
        <strong className="pp-certainty-pct">{pct}%</strong>
      </div>
      <div className="pp-certainty-meter">
        <div className="pp-certainty-fill-bg">
          <div className="pp-certainty-fill" style={{ width: `${pct}%`, background: grad } as CSSProperties} />
        </div>
        {!compact && (
          <p className="pp-certainty-copy">
            Reliable with spell depth — <strong>{inningsEst}</strong> bowling innings • <strong>{ballsEst}</strong> deliveries.
          </p>
        )}
        {compact && (
          <p className="pp-certainty-copy pp-certainty-copy--dense">
            {inningsEst} bowling inns • {ballsEst} balls • repeatability lowers variance.
          </p>
        )}
      </div>
    </section>
  )
}

function PctlTiny({ pct }: { pct: number }) {
  return (
    <div className="pp-pctl-micro">
      <span className="pp-pctl-micro-bar">
        <span style={{ width: `${pct}%` } as CSSProperties} />
      </span>
      <span className="pp-pctl-micro-num">{pct}</span>
    </div>
  )
}

function PhaseBatCard({ title, block }: { title: string; block: PlayerDeepBattingMock['powerplay'] }) {
  return (
    <div className="pp-phase-card pp-phase-card--bat">
      <div className="pp-phase-cap">{title}</div>
      <p className="pp-phase-micro">{block.label}</p>
      <div className="pp-phase-triples">
        <div>
          <span className="pp-phase-tag">SR</span>
          <span className="pp-phase-num">{block.sr}</span>
          <PctlTiny pct={block.srPct} />
        </div>
        <div>
          <span className="pp-phase-tag">Avg</span>
          <span className="pp-phase-num">{block.avg}</span>
          <PctlTiny pct={block.avgPct} />
        </div>
        <div>
          <span className="pp-phase-tag">RPI</span>
          <span className="pp-phase-num">{block.rpi}</span>
          <PctlTiny pct={block.rpiPct} />
        </div>
      </div>
    </div>
  )
}

function PhaseBowlCards({ ppBlock, dkBlock }: { ppBlock: PlayerDeepBowlingMock['powerplay']; dkBlock: PlayerDeepBowlingMock['death'] }) {
  return (
    <div className="pp-phase-row pp-phase-row--bowl">
      {[
        { title: 'Powerplay bowling', block: ppBlock },
        { title: 'Death overs', block: dkBlock },
      ].map(({ title, block }) => (
        <div key={title} className="pp-phase-card pp-phase-card--bowl">
          <div className="pp-phase-cap">{title}</div>
          <p className="pp-phase-micro">{block.label}</p>
          <div className="pp-phase-triples">
            <div>
              <span className="pp-phase-tag">Econ</span>
              <span className="pp-phase-num">{block.econ}</span>
              <PctlTiny pct={block.econPct} />
            </div>
            <div>
              <span className="pp-phase-tag">Avg</span>
              <span className="pp-phase-num">{block.avg}</span>
              <PctlTiny pct={block.avgPct} />
            </div>
            <div>
              <span className="pp-phase-tag">B/SR</span>
              <span className="pp-phase-num">{block.sr}</span>
              <PctlTiny pct={block.srPct} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BattingDeepPanels({
  deep,
  squadBtCaz,
  squadRaw,
}: {
  deep: PlayerDeepBattingMock
  squadBtCaz?: number
  squadRaw?: number
}) {
  return (
    <>
      <section className="pp-lead-shell pp-lead-shell--bat">
        <header className="pp-lead-kicker">Career ladders · percentile vs format cohort</header>
        {squadBtCaz != null && (
          <p className="pp-squad-chip">
            Squad BT CAZ&nbsp;
            <strong>{squadBtCaz.toFixed(1)}</strong>
            {squadRaw != null && <> · Effective raw&nbsp;<strong>{squadRaw.toFixed(1)}</strong></>}
          </p>
        )}
        <CareerHeroStrip accent="bat" stats={deep.overall} />
      </section>

      <RecentBattingMicro rows={deep.recentVsPriorBtCaz} />

      <PentagonMini accent="bat" facets={deep.fingerprint} />

      <CertaintyRibbon
        pct={deep.certaintyPct}
        battingInningsEst={deep.samples.battingInningsEst}
        ballsEst={deep.samples.ballsFacedEst}
        compact
      />

      <div className="pp-ext-anchor">
        <span className="pp-ext-anchor-bar" aria-hidden />
        <span className="pp-ext-anchor-text">Detailed breakdown · phases & matchup DNA</span>
      </div>

      <section className="pp-segment">
        <h4 className="pp-seg-title">Phase overlays</h4>
        <div className="pp-phase-row">
          <PhaseBatCard title="Powerplay template" block={deep.powerplay} />
          <PhaseBatCard title="Death overs" block={deep.death} />
        </div>
      </section>

      <section className="pp-segment">
        <div className="pp-seg-title-row">
          <h4 className="pp-seg-title">Dismissals × opposition bowling DNA</h4>
          <span className="pp-seg-legend-chip">O = out share · B = opp ball recipe</span>
        </div>
        <div className="pp-mix-matrix">
          {deep.dismissalArchetypes.map((row) => (
            <div key={row.archetype} className="pp-mix-row pp-mix-row--bat">
              <div className="pp-mix-name">{row.archetype}</div>
              <div className="pp-mix-bars">
                <div className="pp-mix-slot">
                  <span className="pp-mix-hint">O</span>
                  <div className="pp-mix-track pp-mix-track--bat">
                    <div className="pp-mix-bar" style={{ width: `${row.outSharePct}%` } as CSSProperties} />
                  </div>
                  <span className="pp-mix-num">{row.outSharePct}%</span>
                </div>
                <div className="pp-mix-slot">
                  <span className="pp-mix-hint">B</span>
                  <div className="pp-mix-track pp-mix-track--bat-soft">
                    <div className="pp-mix-bar pp-mix-bar--muted" style={{ width: `${row.oppoBallSharePct}%` } as CSSProperties} />
                  </div>
                  <span className="pp-mix-num">{row.oppoBallSharePct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export function BowlingDeepPanels({
  deep,
  squadEcon,
}: {
  deep: PlayerDeepBowlingMock
  squadEcon?: number
}) {
  return (
    <>
      <section className="pp-lead-shell pp-lead-shell--bowl">
        <header className="pp-lead-kicker">Bowling ladders • percentile cohort</header>
        {squadEcon != null && (
          <p className="pp-squad-chip pp-squad-chip--bowl">
            Squad econ input&nbsp;<strong>{squadEcon.toFixed(1)}</strong>
          </p>
        )}
        <CareerHeroStrip accent="bowl" stats={deep.overall} />
      </section>

      <RecentBowlingMicro rows={deep.recentSpells} />

      <PentagonMini accent="bowl" facets={deep.fingerprint} />

      <BowlingCertaintyRibbon
        pct={deep.certaintyPct}
        inningsEst={deep.samples.bowlingInningsEst}
        ballsEst={deep.samples.ballsBowledEst}
        compact
      />

      <div className="pp-ext-anchor pp-ext-anchor--bowl">
        <span className="pp-ext-anchor-bar" aria-hidden />
        <span className="pp-ext-anchor-text">Extended breakdown • phases & matchups</span>
      </div>

      <section className="pp-segment">
        <h4 className="pp-seg-title">Phase overlays</h4>
        <PhaseBowlCards ppBlock={deep.powerplay} dkBlock={deep.death} />
      </section>

      <section className="pp-segment">
        <div className="pp-seg-title-row">
          <h4 className="pp-seg-title">Wickets × batting pool exposure</h4>
          <span className="pp-seg-legend-chip">W = wicket split · Ω = batter archetype%</span>
        </div>
        <div className="pp-mix-matrix">
          {deep.wicketsVsBatting.map((row) => (
            <div key={row.battingStyle} className="pp-mix-row pp-mix-row--bowl">
              <div className="pp-mix-name">{row.battingStyle}</div>
              <div className="pp-mix-bars">
                <div className="pp-mix-slot">
                  <span className="pp-mix-hint">W</span>
                  <div className="pp-mix-track pp-mix-track--bowl">
                    <div className="pp-mix-bar pp-mix-bar--bowl-fill" style={{ width: `${row.wicketsSharePct}%` } as CSSProperties} />
                  </div>
                  <span className="pp-mix-num">{row.wicketsSharePct}%</span>
                </div>
                <div className="pp-mix-slot">
                  <span className="pp-mix-hint">Ω</span>
                  <div className="pp-mix-track pp-mix-track--bowl-soft">
                    <div className="pp-mix-bar pp-mix-bar--bowl-muted" style={{ width: `${row.oppoBattingBattersPct}%` } as CSSProperties} />
                  </div>
                  <span className="pp-mix-num">{row.oppoBattingBattersPct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export function H2hPlaceholder() {
  return (
    <div className="pp-h2h-shell">
      <div className="pp-h2h-icon" aria-hidden>
        <svg viewBox="0 0 56 56" fill="none" width={44} height={44}>
          <circle cx="18" cy="28" r="12" stroke="rgba(148,163,184,0.45)" strokeWidth="3" />
          <circle cx="38" cy="28" r="12" stroke="rgba(96,165,250,0.45)" strokeWidth="3" />
          <path d="M24 28h12" stroke="rgba(226,232,240,0.25)" strokeWidth="2.5" />
        </svg>
      </div>
      <h3 className="pp-h2h-title">Head-to-head dossier</h3>
      <p className="pp-h2h-body">
        Player vs named bowlers • archetype ladders • tournament filters.<br />
        <strong>Provisioning next</strong> — connect ball-by-ball lineage to hydrate this lane.
      </p>
      <div className="pp-h2h-chips">
        <span>H2H soon</span>
        <span>Matchup cards</span>
        <span>Pressure logs</span>
      </div>
    </div>
  )
}
