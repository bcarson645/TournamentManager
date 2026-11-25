'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Team } from '../data/teams'
import {
  findSquadPlayerOnTeam,
  getSquadForTeam,
  getStoredSquad,
  storeSquad,
  subscribeSquadStore,
  xiSlotMatchesBattingFilter,
  type BattingPositionFilter,
} from '../data/squadStore'
import { calcWktsAndBowlAvg, ratingParPosForBatCalc, type SquadPlayer } from '../data/squad'
import { recomputePlayerPrepRaw } from '../data/prepRawFormula'
import { calculateBatRating, calculateBowlRating } from '../data/ratingBenchmarks'
import { getMatchPrepSettings } from '../data/matchPrepSettings'
import { getTournamentOptions } from '../data/tournamentOptions'
import type { CricketFormat, Gender } from '../data/tournaments'
import {
  recentWindowAggregates,
  squadPlayerBattingDisplay,
  squadPlayerBowlingDisplay,
  profileForSquadPlayer,
} from '../data/squadPlayerDisplayStats'
import type { PlayerProfile, RecentInnings } from '../data/playerProfile'
import type { RankingsPlayerData } from '../api/cricket/rankings-recent/route'
import {
  formatSquadRatingDisplay,
  readSquadRatingDp,
} from '../data/ratingDisplaySettings'

export interface TournamentRankingsFocus {
  teamId: string
  playerId: string
}

interface TournamentRankingsFullViewProps {
  teams: Team[]
  tournamentName: string
  seasonYear: number
  /** App tournament id (e.g. t20-m-ipl) — used to scope collected data. */
  tournamentId?: string
  format: CricketFormat
  gender: Gender
  onBack: () => void
  onOpenPlayerInTeam: (focus: TournamentRankingsFocus) => void
}

interface RankCell {
  text: string
  kind: CellKind
  title?: string
  /** Squad field edited by this cell — set only for trader-input boxes. */
  field?: 'btCaz' | 'sr' | 'overs' | 'econ' | 'bowlSr'
  /** Dodgy-area alert — tooltip text; the marker glyph comes from flagDir. */
  flag?: string
  /** Marker direction: trader value above/below the data, or 'neq' for a categorical mismatch. */
  flagDir?: 'up' | 'down' | 'neq'
  /** Subtle Form-vs-Hist wash: green above, red below. Alpha scales with distance. */
  tintDir?: 'up' | 'down'
  tintAlpha?: number
}

/** A staged trader-input edit — held locally until the save bar commits it. */
interface PendingEdit {
  teamId: string
  playerId: string
  field: NonNullable<RankCell['field']>
  value: string
}

function pendKey(teamId: string, playerId: string, field: NonNullable<RankCell['field']>): string {
  return teamId + '|' + playerId + '|' + field
}

/** Nudge a staged value (used by the external steppers). Keeps up to 2dp. */
function stepText(cur: string, delta: number): string {
  const base = parseFloat(cur)
  const next = (Number.isFinite(base) ? base : 0) + delta
  return String(Math.round(next * 100) / 100)
}

/** Stepper increment per trader field — wickets-per-over needs a fine step. */
const FIELD_STEP: Record<NonNullable<RankCell['field']>, number> = {
  btCaz: 1,
  sr: 1,
  overs: 1,
  econ: 1,
  bowlSr: 0.05,
}

/** Functional stepper — always resolves against the latest staged (or saved) value. */
function stepPending(
  prev: Record<string, PendingEdit>,
  teamId: string,
  playerId: string,
  field: NonNullable<RankCell['field']>,
  committed: string,
  delta: number,
): Record<string, PendingEdit> {
  const k = pendKey(teamId, playerId, field)
  const next = stepText(prev[k]?.value ?? committed, delta)
  if (next === committed) {
    if (!(k in prev)) return prev
    const copy = { ...prev }
    delete copy[k]
    return copy
  }
  if (prev[k]?.value === next) return prev
  return { ...prev, [k]: { teamId, playerId, field, value: next } }
}

interface FullRow {
  playerId: string
  name: string
  teamId: string
  teamName: string
  section: 'starting' | 'reserves' | 'impact'
  idx: number
  rating: string
  ratingNum: number | null
  /** Confidence sample: career innings (batting) or career bowling matches behind the Hist figures. */
  confN: number
  confWhat: string
  /** Batting only: Runs and Strike-rate sections, each [CAZ input, Hist (career), Form (recent)]. */
  batRuns?: [RankCell, RankCell, RankCell]
  batSr?: [RankCell, RankCell, RankCell]
  /** Batting only: historical average position vs the set sheet position. */
  batPosAvg?: RankCell
  batPosSet?: RankCell
  /** Bowling only: wickets per match [derived calc, Hist (career), Form (tournament)]. */
  bowlWkts?: [RankCell, RankCell, RankCell]
  /** Bowling only: strike rate (wickets per over) [prep input, Hist (career), Form (tournament)]. */
  bowlSr?: [RankCell, RankCell, RankCell]
  bowlEcon?: [RankCell, RankCell, RankCell]
  bowlBavg?: RankCell
  recent: string[]
  recentTitle: (string | undefined)[]
  /** Batting only: window Avg/SR tint vs career (same wash as Form-vs-Hist). */
  recentTint?: ({ tintDir: 'up' | 'down'; tintAlpha: number; note: string } | undefined)[]
  /** Batting only: career average anchoring the rolling-form strip. */
  trendAnchor: number | null
}

/**
 * Cell provenance. Shown by style, not colour: trader inputs render as boxes,
 * static fallbacks render italic, everything else is plain text.
 */
type CellKind = 'input' | 'data' | 'calc' | 'static'

function RankCellView({
  cell,
  teamId,
  playerId,
  pending,
  onStage,
  onStepEdit,
  divider,
}: {
  cell: RankCell
  teamId: string
  playerId: string
  /** Staged edits by pendKey — input boxes show the staged value until saved. */
  pending: Record<string, PendingEdit>
  onStage: (
    teamId: string,
    playerId: string,
    field: NonNullable<RankCell['field']>,
    committed: string,
    next: string,
  ) => void
  onStepEdit: (
    teamId: string,
    playerId: string,
    field: NonNullable<RankCell['field']>,
    committed: string,
    dir: 1 | -1,
  ) => void
  /** First cell of a section — draws a vertical divider rule. */
  divider?: boolean
}) {
  const div = divider ? ' tm-rk-div' : ''
  if (cell.field) {
    const key = pendKey(teamId, playerId, cell.field)
    const draft = pending[key]?.value
    return (
      <td className={'td-num tm-rk-cell' + div + (cell.flag ? ' tm-rk-cell--flag' : '')} title={cell.title}>
        <RankEditCell
          value={cell.text}
          draft={draft}
          dirty={draft !== undefined && draft !== cell.text}
          onDraft={(next) => onStage(teamId, playerId, cell.field!, cell.text, next)}
          onStep={(dir) => onStepEdit(teamId, playerId, cell.field!, cell.text, dir)}
        />
        {cell.flag ? <FlagGlyph dir={cell.flagDir} text={cell.flag} /> : null}
      </td>
    )
  }
  return (
    <td
      className={
        'td-num tm-rk-cell' +
        div +
        (cell.kind === 'static' ? ' tm-rk-static' : '') +
        (cell.flag ? ' tm-rk-cell--flag' : '')
      }
      title={cell.title}
      style={
        cell.tintDir
          ? {
              background: `rgba(${cell.tintDir === 'up' ? '74, 222, 128' : '248, 113, 113'}, ${cell.tintAlpha ?? 0.08})`,
            }
          : undefined
      }
    >
      {cell.text}
      {cell.flag ? <FlagGlyph dir={cell.flagDir} text={cell.flag} /> : null}
    </td>
  )
}

/** Arrow shown next to a flagged value: ↑ above the data, ↓ below, ≠ categorical mismatch. */
function FlagGlyph({ dir, text }: { dir: RankCell['flagDir']; text?: string }) {
  const glyph = dir === 'down' ? '↓' : dir === 'neq' ? '≠' : '↑'
  return (
    <span className="tm-rk-flag" title={text}>
      {glyph}
    </span>
  )
}

/** Confidence meter: green 100+ records, yellow 40+, red below. Lives in its own column after Team. */
function confTitle(n: number, what: string): string {
  if (n <= 0) return `Confidence — no collected ${what} data; static record fallback, treat with care.`
  const label = n >= 100 ? 'high' : n >= 40 ? 'medium' : 'low'
  const band = n >= 100 ? '100+' : n >= 40 ? '40–99' : 'under 40'
  return `Confidence — ${n} ${what} in the collected dataset (${label}: ${band} records).`
}
function ConfMeter({ n, what }: { n: number; what: string }) {
  const band = n >= 100 ? 'high' : n >= 40 ? 'med' : 'low'
  return (
    <span className={`tm-rk-conf tm-rk-conf--${band}`} title={confTitle(n, what)} aria-hidden>
      <i style={{ width: `${n > 0 ? Math.max(12, Math.min(100, n)) : 10}%` }} />
    </span>
  )
}

/** Subtle Form-vs-Hist wash: green above, red below (inverted for economy where lower is better). */
function formTint(
  form: number | null,
  hist: number | null,
  invert = false,
): { tintDir: 'up' | 'down'; tintAlpha: number; note: string } | undefined {
  if (form == null || hist == null || !Number.isFinite(form) || !Number.isFinite(hist) || hist === 0) {
    return undefined
  }
  if (form === hist) return undefined
  const above = form > hist
  const rel = Math.abs(form - hist) / Math.abs(hist)
  const pct = Math.round(rel * 100)
  const shown = invert ? !above : above
  return {
    tintDir: shown ? 'up' : 'down',
    tintAlpha: Math.round((0.05 + Math.min(rel, 0.5) * 0.2) * 100) / 100,
    note: `${pct}% ${above ? 'above' : 'below'} Hist (${fmt(hist)})${invert ? ' — lower is better' : ''}.`,
  }
}

/** Inline wash for a tinted recent cell — same greens/reds as the Form-vs-Hist wash. */
function recentTintStyle(
  t: { tintDir: 'up' | 'down'; tintAlpha: number } | undefined,
): CSSProperties | undefined {
  if (!t) return undefined
  return {
    background: `rgba(${t.tintDir === 'up' ? '74, 222, 128' : '248, 113, 113'}, ${t.tintAlpha ?? 0.08})`,
  }
}

/**
 * Subtle dodgy-area check: CAZ ≥10% off BOTH Hist and Form, and outside the Hist–Form range.
 * Sitting between the two is the trader splitting the difference — never flagged.
 * Arrow points at the larger miss.
 */
function cazFlagReasons(
  caz: number | null,
  hist: number | null,
  form: number | null,
  label: string,
): { text: string; dir: 'up' | 'down' } | undefined {
  if (caz == null || !Number.isFinite(caz)) return undefined
  const off = (base: number | null): { p: number; above: boolean } | undefined => {
    if (base == null || !Number.isFinite(base) || base === 0) return undefined
    const p = Math.round((Math.abs(caz - base) / Math.abs(base)) * 100)
    if (p < 10) return undefined
    return { p, above: caz > base }
  }
  const h = off(hist)
  const f = off(form)
  if (!h || !f) return undefined
  // Trader interpolating between the two data points — always defensible, never flagged.
  const lo = Math.min(hist!, form!)
  const hi = Math.max(hist!, form!)
  if (caz > lo && caz < hi) return undefined
  const text =
    `${label} ${fmt(caz)} is ${h.p}% ${h.above ? 'above' : 'below'} Hist ${fmt(hist!)}. ` +
    `${label} ${fmt(caz)} is ${f.p}% ${f.above ? 'above' : 'below'} Form ${fmt(form!)}.`
  const big = h.p >= f.p ? h : f
  return { text, dir: big.above ? 'up' : 'down' }
}

function RankEditCell({
  value,
  draft,
  dirty,
  onDraft,
  onStep,
}: {
  /** Last saved text. */
  value: string
  /** Staged text, if the trader has touched this box since the last save. */
  draft: string | undefined
  dirty: boolean
  onDraft: (next: string) => void
  /** Nudge up/down — resolved against the latest staged value, so rapid clicks stack. */
  onStep: (dir: 1 | -1) => void
}) {
  const shown = draft ?? value
  return (
    <span className="tm-rk-stepwrap">
      <button
        type="button"
        tabIndex={-1}
        className="tm-rk-step"
        aria-label="Step value down"
        title="Step down by 1 (stages an edit — save to apply)"
        onClick={() => onStep(-1)}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        className={'tm-rk-box' + (dirty ? ' tm-rk-box--dirty' : '')}
        value={shown}
        aria-label="Edit prepped value"
        onChange={(e) => onDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          else if (e.key === 'Escape') {
            onDraft(value)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        className="tm-rk-step"
        aria-label="Step value up"
        title="Step up (stages an edit — save to apply)"
        onClick={() => onStep(1)}
      >
        +
      </button>
    </span>
  )
}

type SortKey =
  | 'player'
  | 'team'
  | 'runs-caz'
  | 'runs-hist'
  | 'runs-form'
  | 'sr-caz'
  | 'sr-hist'
  | 'sr-form'
  | 'pos-avg'
  | 'pos-set'
  | 'rating'
  | 'conf'
  | 'wkts'
  | 'wk-hist'
  | 'wk-form'
  | 'bsr-prep'
  | 'bsr-hist'
  | 'bsr-form'
  | 'ec-prep'
  | 'ec-hist'
  | 'ec-form'
  | 'bavg'
  | `rec${number}`

const RECENT_WINDOWS = [5, 10] as const

/** Draggable recent-panel width (px). Null = CSS default. Persisted per browser. */
const RECENT_W_KEY = 'tm-rankings-recent-width'
const RECENT_W_MIN = 200
function readRecentW(): number | null {
  try {
    const n = parseFloat(localStorage.getItem(RECENT_W_KEY) ?? '')
    return Number.isFinite(n) && n >= RECENT_W_MIN ? n : null
  } catch {
    return null
  }
}

export default function TournamentRankingsFullView({
  teams,
  tournamentName,
  seasonYear,
  tournamentId = '',
  format,
  gender,
  onBack,
  onOpenPlayerInTeam,
}: TournamentRankingsFullViewProps) {
  const [mode, setMode] = useState<'batting' | 'bowling'>('batting')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  /** Starting-XI batting slot filter (batting only) — mirrors the dashboard Line-up control. */
  const [posFilter, setPosFilter] = useState<BattingPositionFilter>('all')
  /** Staged trader-input edits, keyed by pendKey — nothing saves until the save bar commits. */
  const [pending, setPending] = useState<Record<string, PendingEdit>>({})
  function stageEdit(
    teamId: string,
    playerId: string,
    field: NonNullable<RankCell['field']>,
    committed: string,
    next: string,
  ) {
    const k = pendKey(teamId, playerId, field)
    setPending((prev) => {
      if (next === committed) {
        if (!(k in prev)) return prev
        const copy = { ...prev }
        delete copy[k]
        return copy
      }
      if (prev[k]?.value === next) return prev
      return { ...prev, [k]: { teamId, playerId, field, value: next } }
    })
  }
  function stepEdit(
    teamId: string,
    playerId: string,
    field: NonNullable<RankCell['field']>,
    committed: string,
    dir: 1 | -1,
  ) {
    setPending((prev) =>
      stepPending(prev, teamId, playerId, field, committed, dir * (FIELD_STEP[field] ?? 1)),
    )
  }
  function savePending() {
    const kept: Record<string, PendingEdit> = {}
    for (const [k, e] of Object.entries(pending)) {
      const n = parseFloat(e.value)
      if (Number.isFinite(n) && n >= 0) commitEdit(e.teamId, e.playerId, e.field, e.value)
      else kept[k] = e
    }
    setPending(kept)
  }
  function discardPending() {
    setPending({})
  }
  const pendingCount = Object.keys(pending).length
  const [sortKey, setSortKey] = useState<SortKey>('rating')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [recentWindow, setRecentWindow] = useState<5 | 10>(5)
  /** Expands the recent strip from Avg/Trend/SR to show every innings score. */
  const [showGames, setShowGames] = useState(false)
  /** Which matches feed Hist, Form, the recent strip, confidence and the trend anchor. */
  type RankingsScope = 'tournament' | 't20' | 'majors'
  const [scope, setScope] = useState<RankingsScope>('tournament')
  /** Human wording for the active stats scope (Hist titles, confidence, tooltips). */
  const scopeBatAvgTitle =
    scope === 'tournament'
      ? `${tournamentName} batting average (runs per dismissal).`
      : scope === 't20'
        ? 'All-T20 batting average — every T20 in the collected dataset (runs per dismissal).'
        : 'Major-league batting average — IPL, BBL, Blast, SA20, PSL, CPL, BPL, ILT20, LPL, MLC (runs per dismissal).'
  const scopeBatSrTitle =
    scope === 'tournament'
      ? `${tournamentName} strike rate (runs per 100 balls).`
      : scope === 't20'
        ? 'All-T20 strike rate — every T20 in the collected dataset (runs per 100 balls).'
        : 'Major-league strike rate — IPL, BBL, Blast, SA20, PSL, CPL, BPL, ILT20, LPL, MLC (runs per 100 balls).'
  const scopeBowlSrTitle =
    scope === 'tournament'
      ? `${tournamentName} strike rate (wickets per over).`
      : scope === 't20'
        ? 'All-T20 strike rate — every T20 in the collected dataset (wickets per over).'
        : 'Major-league strike rate — IPL, BBL, Blast, SA20, PSL, CPL, BPL, ILT20, LPL, MLC (wickets per over).'
  const scopeOrderTitle =
    scope === 'tournament'
      ? `Average batting order across ${tournamentName} competitions in the collected dataset.`
      : scope === 't20'
        ? 'Average batting order across every T20 in the collected dataset.'
        : 'Average batting order across major franchise leagues in the collected dataset.'
  const scopeConfNoun =
    scope === 'tournament'
      ? `${tournamentName} innings`
      : scope === 't20'
        ? 'T20 innings'
        : 'major-league innings'
  const scopeBowlNoun =
    scope === 'tournament'
      ? `${tournamentName} bowling matches`
      : scope === 't20'
        ? 'T20 bowling matches'
        : 'major-league bowling matches'
  const scopeFormNoun =
    scope === 'tournament' ? 'Tournament' : scope === 't20' ? 'All-T20' : 'Major-league'
  const scopeStripWhere =
    scope === 'tournament' ? `${tournamentName} matches` : scope === 't20' ? 'all T20' : 'major leagues'

  /** Bumps whenever squads change (including our own edits) so rows refresh. */
  const [squadVersion, setSquadVersion] = useState(0)
  useEffect(() => subscribeSquadStore(() => setSquadVersion((v) => v + 1)), [])
  /** Draggable width of the recent-scores side panel (null = default). */
  const splitRef = useRef<HTMLDivElement | null>(null)
  const [recentW, setRecentW] = useState<number | null>(readRecentW)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  useEffect(() => {
    try {
      if (recentW == null) localStorage.removeItem(RECENT_W_KEY)
      else localStorage.setItem(RECENT_W_KEY, String(recentW))
    } catch {
      /* storage unavailable — drag still works for the session */
    }
  }, [recentW])
  // (No wheel hijack: sideways scrolling belongs to the shared outer scroller —
  // native shift+wheel / touch / the bottom scrollbar. Stealing vertical wheel
  // over a 195-row strip would trap page scrolling.)
  function recentMaxW(): number {
    const el = splitRef.current
    if (!el) return 640
    return Math.max(RECENT_W_MIN + 40, el.clientWidth * 0.62)
  }
  function clampRecentW(n: number): number {
    return Math.round(Math.min(recentMaxW(), Math.max(RECENT_W_MIN, n)))
  }
  function recentPanelW(): number {
    if (recentW != null) return recentW
    const el = splitRef.current?.querySelector<HTMLElement>('.tm-rk-recent-scroll')
    return el?.getBoundingClientRect().width ?? 480
  }
  function beginRecentDrag(e: React.MouseEvent) {
    // Grip drag: moving left grows the recent panel (it sits on the right).
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startW: recentPanelW() }
    const move = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      setRecentW(clampRecentW(d.startW - (ev.clientX - d.startX)))
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  /** In-place edit of a prepped cell. Mirrors the squad table update pipeline
   * (prep raw recompute + rating) so values stay consistent everywhere. */
  function commitEdit(
    teamId: string,
    playerId: string,
    field: 'btCaz' | 'sr' | 'overs' | 'econ' | 'bowlSr',
    displayValue: string,
  ) {
    const num = parseFloat(displayValue)
    if (!Number.isFinite(num) || num < 0) return
    const squad = getSquadForTeam(teamId)
    const sections = [
      ['starting', squad.startingXI],
      ['reserves', squad.reserves],
      ['impact', squad.impactSubs],
    ] as const
    for (const [section, list] of sections) {
      const index = list.findIndex((p) => p.id === playerId)
      if (index < 0) continue
      const prev = list[index]!
      let updated: SquadPlayer = { ...prev }
      if (field === 'sr') updated.sr = Math.round((num / 100) * 10000) / 10000
      else if (field === 'bowlSr') {
        // Prepped strike rate is wickets per over — stored directly.
        updated.bowlWpo = num
      } else updated[field] = num
      const matchPrep = getMatchPrepSettings(tournamentId)
      if (field === 'btCaz' || field === 'sr') {
        updated = recomputePlayerPrepRaw(updated, section, index, format, matchPrep, true)
        updated.batRating = calculateBatRating(
          updated.btCaz,
          updated.raw,
          updated.sr,
          ratingParPosForBatCalc(section, index, updated),
          format,
          gender,
        )
      } else {
        const { wkts, bowlAvg } = calcWktsAndBowlAvg(updated.overs, updated.econ, updated.bowlWpo)
        updated.wkts = wkts
        updated.bowlAvg = bowlAvg
        updated.bowlRating = calculateBowlRating(
          updated.econ,
          updated.bowlWpo,
          bowlAvg,
          updated.overs,
          format,
          gender,
        )
      }
      storeSquad(
        teamId,
        section === 'starting'
          ? list.map((p, i) => (i === index ? updated : p))
          : [...squad.startingXI],
        section === 'reserves'
          ? list.map((p, i) => (i === index ? updated : p))
          : [...squad.reserves],
        getStoredSquad(teamId)?.groundId ?? null,
        section === 'impact'
          ? list.map((p, i) => (i === index ? updated : p))
          : [...squad.impactSubs],
      )
      return
    }
  }

  /** Collected-data backing (scope-filtered innings + aggregates), keyed by squad name. */
  const [dbMap, setDbMap] = useState<Record<string, RankingsPlayerData>>({})
  const namesKey = useMemo(() => {
    const names: string[] = []
    for (const team of teams) {
      const { startingXI, reserves, impactSubs } = getSquadForTeam(team.id)
      for (const p of [...startingXI, ...reserves, ...impactSubs]) {
        if (p.name) names.push(p.name)
      }
    }
    return [...new Set(names)].join('|')
  }, [teams])
  useEffect(() => {
    let cancelled = false
    if (!tournamentId || !namesKey) {
      setDbMap({})
      return
    }
    fetch('/api/cricket/rankings-recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId, scope, names: namesKey.split('|'), limit: 60 }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { players?: Record<string, RankingsPlayerData> } | null) => {
        if (!cancelled && json?.players) setDbMap(json.players)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [tournamentId, namesKey, scope])

  const ratingDp = readSquadRatingDp()

  /** Recent group: leading window-average column, then one column per innings. */
  const recentCount = mode === 'batting' ? recentWindow + 1 : 5

  const rows = useMemo((): FullRow[] => {
    const out: FullRow[] = []

    for (const team of teams) {
      const { startingXI, reserves, impactSubs } = getSquadForTeam(team.id)
      const all: { p: (typeof startingXI)[0]; section: 'starting' | 'reserves' | 'impact'; idx: number }[] =
        []
      startingXI.forEach((p, i) => all.push({ p, section: 'starting', idx: i }))
      reserves.forEach((p, i) => all.push({ p, section: 'reserves', idx: i }))
      impactSubs.forEach((p, i) => all.push({ p, section: 'impact', idx: i }))

      for (const { p, section, idx } of all) {
        const profile = profileForSquadPlayer(p)
        if (mode === 'batting') {
          // Static fallback doubles as the Hist source for unmapped players.
          const s = squadPlayerBattingDisplay(
            p,
            profile,
            section,
            idx,
            'career',
            tournamentName,
            seasonYear,
          )
          const db = dbMap[p.name]
          const cf = battingCareerForm(profile, db, recentWindow, s)
          const dbInnings = db?.innings
          const recentCells = recentWindowCells(cf.innings, recentWindow, !!dbInnings?.length)
          // Flags only compare against collected data — never static fallbacks.
          const flagHist = cf.mapped ? cf.avg : null
          const flagForm = cf.mapped ? cf.form : null
          const flagHistSr = cf.mapped ? cf.sr : null
          const flagFormSr = cf.mapped ? cf.formSr : null
          const cazRuns = cazFlagReasons(p.btCaz, flagHist, flagForm, 'Runs CAZ')
          const cazSr = cazFlagReasons(p.sr * 100, flagHistSr, flagFormSr, 'SR CAZ')
          const runsFormTint = formTint(flagForm, flagHist)
          const srFormTint = formTint(flagFormSr, flagHistSr)
          // Window Avg/SR tinted vs career (Hist) — same wash as Form-vs-Hist.
          const avgTint = cf.mapped ? formTint(recentCells.avgNum, cf.avg) : undefined
          const srTint = cf.mapped ? formTint(recentCells.srNum, cf.sr) : undefined
          // Position context: career-wide average order vs the set sheet slot.
          const orderDb = db
          const avgPos = orderDb?.careerAvgBatOrder ?? null
          const seenOrders = orderDb?.careerBatOrders ?? []
          const setPos = s.avgPosition
          // Position issues surface on SET only (the adjustable value) — AVG is display-only context.
          let outNote: string | undefined
          let outDir: 'up' | 'down' | undefined
          if (avgPos != null && setPos > 0) {
            const p = Math.round((Math.abs(avgPos - setPos) / setPos) * 100)
            if (p >= 20) {
              outNote = `Avg position ${fmt(avgPos)} is ${p}% out from the set position ${setPos}.`
              // Arrow points at where he actually bats relative to the slot: ↓ = bats lower down.
              outDir = avgPos > setPos ? 'down' : 'up'
            }
          }
          let setPosFlag: string | undefined
          let setPosDir: RankCell['flagDir']
          if (seenOrders.length > 0 && setPos > 0 && !seenOrders.includes(setPos)) {
            setPosFlag =
              `Has not batted at ${setPos} in the collected data (seen at ${seenOrders.join(', ')}).` +
              (outNote ? ` ${outNote}` : '')
            setPosDir = 'neq'
          } else if (outNote) {
            setPosFlag = outNote
            setPosDir = outDir
          }
          out.push({
            playerId: p.id,
            name: p.name,
            teamId: team.id,
            teamName: team.name,
            section,
            idx,
            rating: formatSquadRatingDisplay(p.batRating, ratingDp),
            ratingNum: Number.isFinite(p.batRating) ? p.batRating : null,
            confN: db?.careerInnings ?? 0,
            confWhat: scopeConfNoun,
            batRuns: [
              {
                text: fmt0(p.btCaz),
                kind: 'input',
                field: 'btCaz',
                flag: cazRuns?.text,
                flagDir: cazRuns?.dir,
                title:
                  'Trader input — your prepped batting average. Type or step to edit, then Save to apply.',
              },
              {
                text: cf.avg != null ? fmt(cf.avg) : '—',
                kind: cf.avgKind,
                title:
                  cf.avgKind === 'data'
                    ? scopeBatAvgTitle
                    : 'Built-in static record — career average (this player is not mapped to collected data).',
              },
              {
                text: cf.form != null ? fmt(cf.form) : '—',
                kind: 'calc',
                title: cf.formTitle + (runsFormTint ? ` ${runsFormTint.note}` : ''),
                ...(runsFormTint
                  ? { tintDir: runsFormTint.tintDir, tintAlpha: runsFormTint.tintAlpha }
                  : null),
              },
            ],
            batSr: [
              {
                text: fmt0(p.sr * 100),
                kind: 'input',
                field: 'sr',
                flag: cazSr?.text,
                flagDir: cazSr?.dir,
                title: 'Trader input — your prepped strike rate (runs per 100 balls). Type to edit.',
              },
              {
                text: cf.sr != null ? fmt(cf.sr) : '—',
                kind: cf.srKind,
                title:
                  cf.srKind === 'data'
                    ? scopeBatSrTitle
                    : 'Built-in static record — career strike rate (this player is not mapped to collected data).',
              },
              {
                text: cf.formSr != null ? fmt(cf.formSr) : '—',
                kind: 'calc',
                title: cf.formSrTitle + (srFormTint ? ` ${srFormTint.note}` : ''),
                ...(srFormTint ? { tintDir: srFormTint.tintDir, tintAlpha: srFormTint.tintAlpha } : null),
              },
            ],
            batPosAvg: {
              text: avgPos != null ? avgPos.toFixed(1) : '—',
              kind: avgPos != null ? 'data' : 'static',
              title:
                avgPos != null
                  ? scopeOrderTitle
                  : 'No collected batting-order data — this player is not mapped to the dataset.',
            },
            batPosSet: {
              text: setPos > 0 ? String(setPos) : '—',
              kind: 'calc',
              flag: setPosFlag,
              flagDir: setPosDir,
              title: 'Set position from the squad sheet (par slot used for the rating).',
            },
            recent: [recentCells.avg, recentCells.sr, ...recentCells.cells],
            recentTitle: [
              recentCells.avgTitle + (avgTint ? ` ${avgTint.note}` : ''),
              recentCells.srTitle + (srTint ? ` ${srTint.note}` : ''),
              ...recentCells.titles,
            ],
            recentTint: [avgTint ?? undefined, srTint ?? undefined],
            trendAnchor: cf.avg,
          })
        } else {
          const s = squadPlayerBowlingDisplay(p, profile, 'career', tournamentName, seasonYear)
          const bowlDb = dbMap[p.name]
          const bc = bowlDb?.bowlCareer ?? null
          const bt = bowlDb?.bowlTourn ?? null
          const ecHist = bc?.economy ?? (s.economy > 0 ? s.economy : null)
          const ecHistKind: CellKind = bc?.economy != null ? 'data' : 'static'
          const ecForm = bt?.economy ?? null
          // Flags compare against collected data only — never static fallbacks.
          const ecHistFlag = bc?.economy ?? null
          const wkHist = bc != null && bc.matches > 0 ? bc.wickets / bc.matches : null
          const wkForm = bt != null && bt.matches > 0 ? bt.wickets / bt.matches : null
          const wkFormTint = formTint(wkForm, wkHist)
          const ecFormTint = formTint(ecForm, ecHistFlag, true)
          const cazEcon = cazFlagReasons(p.econ, ecHistFlag, ecForm, 'Econ prep')
          const wpoHist =
            bc?.oversPerMatch != null && bc.wickets > 0 && bc.matches > 0
              ? Math.round((bc.wickets / (bc.oversPerMatch * bc.matches)) * 100) / 100
              : null
          const wpoStatic =
            profile.careerBowling.strikeRate > 0
              ? Math.round((6 / profile.careerBowling.strikeRate) * 100) / 100
              : null
          const wpoForm =
            bt?.oversPerMatch != null && bt.wickets > 0 && bt.matches > 0
              ? Math.round((bt.wickets / (bt.oversPerMatch * bt.matches)) * 100) / 100
              : null
          // Higher wickets-per-over is better — no inversion.
          const wpoFormTint = formTint(wpoForm, wpoHist)
          const cazWpo = cazFlagReasons(p.bowlWpo, wpoHist, wpoForm, 'SR prep')
          out.push({
            playerId: p.id,
            name: p.name,
            teamId: team.id,
            teamName: team.name,
            section,
            idx,
            rating:
              Number.isNaN(p.bowlRating) ? '–' : formatSquadRatingDisplay(p.bowlRating, ratingDp),
            ratingNum:
              Number.isNaN(p.bowlRating) || !Number.isFinite(p.bowlRating) ? null : p.bowlRating,
            confN: bc?.matches ?? 0,
            confWhat: scopeBowlNoun,
            bowlWkts: [
              {
                text: fmt(p.wkts),
                kind: 'calc',
                title: 'Calculated — wickets derived from prepped overs and economy.',
              },
              {
                text: wkHist != null ? fmt(wkHist) : '—',
                kind: bc ? 'data' : 'static',
                title:
                  bc != null
                    ? `${scopeFormNoun} wickets per match across ${bc.matches} collected matches.`
                    : 'No collected bowling data — this player is not mapped to the dataset.',
              },
              {
                text: wkForm != null ? fmt(wkForm) : '—',
                kind: bt ? 'data' : 'static',
                title:
                  (bt != null
                    ? `${scopeFormNoun} wickets per match across ${bt.matches} collected spells.`
                    : 'No bowling figures collected yet in this scope.') +
                  (wkFormTint ? ` ${wkFormTint.note}` : ''),
                ...(wkFormTint ? { tintDir: wkFormTint.tintDir, tintAlpha: wkFormTint.tintAlpha } : null),
              },
            ],
            bowlSr: [
              {
                text: fmt(p.bowlWpo),
                kind: 'input',
                field: 'bowlSr',
                flag: cazWpo?.text,
                flagDir: cazWpo?.dir,
                title:
                  'Prep value — your prepped strike rate (wickets per over). Stage an edit, then Save to apply.',
              },
              {
                text: wpoHist != null ? fmt(wpoHist) : wpoStatic != null ? fmt(wpoStatic) : '—',
                kind: wpoHist != null ? 'data' : 'static',
                title:
                  wpoHist != null
                    ? scopeBowlSrTitle
                    : 'Built-in static record — career strike rate.',
              },
              {
                text: wpoForm != null ? fmt(wpoForm) : '—',
                kind: bt ? 'data' : 'static',
                title:
                  (bt != null
                    ? `${scopeFormNoun} strike rate across ${bt.matches} collected spells.`
                    : 'No bowling figures collected yet in this scope.') +
                  (wpoFormTint ? ` ${wpoFormTint.note}` : ''),
                ...(wpoFormTint ? { tintDir: wpoFormTint.tintDir, tintAlpha: wpoFormTint.tintAlpha } : null),
              },
            ],
            bowlEcon: [
              {
                text: fmt(p.econ),
                kind: 'input',
                field: 'econ',
                flag: cazEcon?.text,
                flagDir: cazEcon?.dir,
                title: 'Prep value — prepped economy. Stage an edit, then Save to apply.',
              },
              {
                text: ecHist != null ? fmt(ecHist) : '—',
                kind: ecHistKind,
                title:
                  ecHistKind === 'data'
                    ? `${scopeFormNoun} economy (runs per over) — collected data.`
                    : 'Built-in static record — career economy (this player is not mapped to collected data).',
              },
              {
                text: ecForm != null ? fmt(ecForm) : '—',
                kind: bt ? 'data' : 'static',
                title:
                  (bt != null
                    ? `${scopeFormNoun} economy across ${bt.matches} collected spells.`
                    : 'No bowling figures collected yet in this scope.') +
                  (ecFormTint ? ` ${ecFormTint.note}` : ''),
                ...(ecFormTint ? { tintDir: ecFormTint.tintDir, tintAlpha: ecFormTint.tintAlpha } : null),
              },
            ],
            bowlBavg: {
              text:
                bc?.average != null
                  ? fmt(bc.average)
                  : s.bowlingAverage > 0
                    ? fmt(s.bowlingAverage)
                    : '—',
              kind: bc?.average != null ? 'data' : 'static',
              title:
                bc?.average != null
                  ? `${scopeFormNoun} bowling average (runs per wicket) — collected data.`
                  : 'Built-in static record — bowling average.',
            },
            recent: ['—', '—', '—', '—', '—'],
            recentTitle: [undefined, undefined, undefined, undefined, undefined],
            trendAnchor: null,
          })
        }
      }
    }

    return out
  }, [teams, mode, tournamentName, seasonYear, ratingDp, dbMap, recentWindow, squadVersion])

/** Display text behind a sort key (same strings the cells show). */
function cellTextForSort(r: FullRow, key: SortKey): string {
  switch (key) {
    case 'player':
      return r.name
    case 'team':
      return r.teamName
    case 'runs-caz':
      return r.batRuns?.[0].text ?? ''
    case 'runs-hist':
      return r.batRuns?.[1].text ?? ''
    case 'runs-form':
      return r.batRuns?.[2].text ?? ''
    case 'sr-caz':
      return r.batSr?.[0].text ?? ''
    case 'sr-hist':
      return r.batSr?.[1].text ?? ''
    case 'sr-form':
      return r.batSr?.[2].text ?? ''
    case 'pos-avg':
      return r.batPosAvg?.text ?? ''
    case 'pos-set':
      return r.batPosSet?.text ?? ''
    case 'rating':
      return r.rating
    case 'conf':
      return String(r.confN)
    case 'wkts':
      return r.bowlWkts?.[0].text ?? ''
    case 'wk-hist':
      return r.bowlWkts?.[1].text ?? ''
    case 'wk-form':
      return r.bowlWkts?.[2].text ?? ''
    case 'bsr-prep':
      return r.bowlSr?.[0].text ?? ''
    case 'bsr-hist':
      return r.bowlSr?.[1].text ?? ''
    case 'bsr-form':
      return r.bowlSr?.[2].text ?? ''
    case 'ec-prep':
      return r.bowlEcon?.[0].text ?? ''
    case 'ec-hist':
      return r.bowlEcon?.[1].text ?? ''
    case 'ec-form':
      return r.bowlEcon?.[2].text ?? ''
    case 'bavg':
      return r.bowlBavg?.text ?? ''
    default:
      if (key.startsWith('rec')) {
        const i = Number(key.slice(3))
        return r.recent[i] ?? ''
      }
      return ''
  }
}

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dirMul = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const av = cellTextForSort(a, sortKey)
      const bv = cellTextForSort(b, sortKey)
      if (sortKey === 'player' || sortKey === 'team') return av.localeCompare(bv) * dirMul
      const an = parseLeading(av)
      const bn = parseLeading(bv)
      if (an != null && bn != null && an !== bn) return (an - bn) * dirMul
      if (an != null && bn == null) return -1
      if (an == null && bn != null) return 1
      return av.localeCompare(bv) * dirMul
    })
    return arr
  }, [rows, sortKey, sortDir])

  const visibleRows = useMemo(() => {
    return sorted.filter(
      (r) =>
        (teamFilter === 'all' || r.teamId === teamFilter) &&
        (mode !== 'batting' ||
          posFilter === 'all' ||
          (r.section === 'starting' && xiSlotMatchesBattingFilter(r.idx + 1, posFilter))),
    )
  }, [sorted, teamFilter, mode, posFilter])

  /** Player note being viewed (null = closed). Notes live on the squad draft. */
  const [noteView, setNoteView] = useState<{
    teamId: string
    playerId: string
    name: string
    teamName: string
    note: string
  } | null>(null)
  /** Trimmed squad note per visible row — refreshes with the squad store. */
  const noteByKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of visibleRows) {
      const note = findSquadPlayerOnTeam(r.teamId, r.playerId, r.name)?.note?.trim()
      if (note) m.set(r.playerId + r.teamId, note)
    }
    return m
  }, [visibleRows, squadVersion])
  useEffect(() => {
    if (!noteView) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNoteView(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [noteView])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'player' || key === 'team' ? 'asc' : 'desc')
    }
  }

  function switchMode(m: 'batting' | 'bowling') {
    setMode(m)
    setSortKey('rating')
    setSortDir('desc')
    setTeamFilter('all')
  }

  /** Column plan for the recent strip: compact Avg/Trend/SR, games only when expanded. */
  const gameOrdinals = [
    'Most recent innings',
    '2nd most recent',
    '3rd most recent',
    '4th most recent',
    '5th most recent',
    '6th most recent',
    '7th most recent',
    '8th most recent',
    '9th most recent',
    '10th most recent',
  ]
  const recentHeads: { label: string; key: SortKey; title: string; divider?: boolean }[] =
    mode === 'batting'
      ? [
          {
            label: 'Avg',
            key: 'rec0',
            title: `Collected data — batting average over the last ${recentWindow} (runs per dismissal)`,
          },
          {
            label: 'SR',
            key: 'rec1',
            title: `Strike rate over the shown recent scores (follows the L${recentWindow} toggle)`,
          },
          ...(showGames
            ? gameOrdinals.slice(0, recentWindow).map((o, k) => ({
                label: `G${k + 1}`,
                key: `rec${k + 2}` as SortKey,
                title: `${o} (* = not out, balls in brackets)`,
                // Rule between the window averages and the individual games.
                divider: k === 0,
              }))
            : []),
        ]
      : ['1st', '2nd', '3rd', '4th', '5th'].map((label, i) => ({
          label,
          key: `rec${i}` as SortKey,
          title: 'No recent bowling figures in dataset (* = not out)',
        }))
  /** Batting strip columns: Avg + Trend + SR, plus one per game when expanded. */
  const recentColCount = mode === 'batting' ? recentHeads.length + 1 : recentCount

  return (
    <div className="tm-rankings-full dashboard-content">
      <div className="tournament-section-panel tm-rankings-full-panel">
        <div className="squad-section-header-row tm-rankings-full-toolbar">
          <button type="button" className="tm-btn tm-btn--ghost tm-rankings-full-back" onClick={onBack}>
            ← Back to tournament
          </button>
          <h2 className="squad-section-title tm-rankings-full-title">Tournament player rankings</h2>
          <div className="squad-section-header-controls tm-rankings-full-controls">
            <label className="squad-hide-raw-control tm-rankings-team-filter">
              <span>Team</span>
              <select
                className="squad-rating-dp-select"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                aria-label="Filter rankings by team"
              >
                <option value="all">All teams ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="squad-hide-raw-control tm-rankings-team-filter"
              title="Stats scope — which matches feed Hist, Form, the recent strip, confidence and the trend anchor"
            >
              <span>Stats</span>
              <select
                className="squad-rating-dp-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as RankingsScope)}
                aria-label="Stats scope"
              >
                <option value="tournament">This tournament ({tournamentName})</option>
                <option value="t20">All T20</option>
                <option value="majors">Major leagues</option>
              </select>
            </label>
            {mode === 'batting' ? (
              <label
                className="squad-hide-raw-control tm-rankings-team-filter"
                title="Line-up — show only batters picked in these starting-XI slots"
              >
                <span>Line-up</span>
                <select
                  className="squad-rating-dp-select"
                  value={posFilter}
                  onChange={(e) => setPosFilter(parsePosFilter(e.target.value))}
                  aria-label="Filter rankings by starting XI position"
                >
                  <option value="all">All positions</option>
                  <option value="openers">Openers (1–2)</option>
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map((n) => (
                    <option key={n} value={String(n)}>
                      Position {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div
              className="rankings-metric-bar squad-perf-metric-bar"
              role="tablist"
              aria-label="Rankings mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'batting'}
                className={
                  'squad-perf-mode-btn squad-perf-mode-btn--bat' +
                  (mode === 'batting' ? ' squad-perf-mode-btn--active' : '')
                }
                onClick={() => switchMode('batting')}
              >
                Batting
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'bowling'}
                className={
                  'squad-perf-mode-btn squad-perf-mode-btn--bowl' +
                  (mode === 'bowling' ? ' squad-perf-mode-btn--active' : '')
                }
                onClick={() => switchMode('bowling')}
              >
                Bowling
              </button>
            </div>
            {mode === 'batting' ? (
              <span className="tm-rk-toggle" role="group" aria-label="Recent games window">
                {RECENT_WINDOWS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={
                      'tm-rk-toggle-btn' + (recentWindow === w ? ' tm-rk-toggle-btn--active' : '')
                    }
                    aria-pressed={recentWindow === w}
                    onClick={() => setRecentWindow(w)}
                  >
                    L{w}
                  </button>
                ))}
              </span>
            ) : null}
            {mode === 'batting' ? (
              <span className="tm-rk-toggle" role="group" aria-label="Recent detail">
                <button
                  type="button"
                  className={
                    'tm-rk-toggle-btn' + (showGames ? ' tm-rk-toggle-btn--active' : '')
                  }
                  aria-pressed={showGames}
                  onClick={() => setShowGames((v) => !v)}
                  title="Show every innings score after the averages — expands the recent panel"
                >
                  Scores
                </button>
              </span>
            ) : null}
          </div>
        </div>

        <div className="teams-table-wrap tm-rankings-full-scroll">
          <div className="tm-rk-split" ref={splitRef}>
          <table className="teams-table tm-rankings-full-table tm-rk-frozen">
            <thead>
              <tr className="teams-table-head-row">
                <th className="teams-th-identity tm-rankings-sticky tm-rankings-sticky-rank">#</th>
                <th
                  className="teams-th-identity teams-sortable tm-rankings-sticky tm-rankings-sticky-player"
                  title="Click to sort"
                  onClick={() => toggleSort('player')}
                >
                  Player
                  {sortKey === 'player' ? (
                    <span className="teams-sort-ind">{sortDir === 'desc' ? ' ▼' : ' ▲'}</span>
                  ) : null}
                </th>
                <th
                  className="teams-th-identity teams-sortable"
                  title="Click to sort"
                  onClick={() => toggleSort('team')}
                >
                  Team
                  {sortKey === 'team' ? (
                    <span className="teams-sort-ind">{sortDir === 'desc' ? ' ▼' : ' ▲'}</span>
                  ) : null}
                </th>
                <th className="tm-rk-grp">
                  <span title="Confidence — records behind the Hist figures: green 100+, yellow 40+, red under 40.">
                    Conf
                  </span>
                </th>
                {mode === 'batting' ? (
                  <>
                    <th colSpan={3} className="tm-rk-grp">
                      <span title="Runs section — your CAZ input beside the whole-career average and recent form.">
                        Runs
                      </span>
                    </th>
                    <th colSpan={3} className="tm-rk-grp">
                      <span title="Strike-rate section — your CAZ input beside the whole-career rate and recent form (runs per 100 balls).">
                        Strike rate
                      </span>
                    </th>
                    <th className="tm-rk-grp">
                      <span title="Calculated rating, styled as in the team setup (green above par, red below).">
                        Rating
                      </span>
                    </th>
                    <th colSpan={2} className="tm-rk-grp">
                      <span title="Position check — historical average order vs the set sheet slot.">Pos</span>
                    </th>
                  </>
                ) : (
                  <>
                    <th colSpan={3} className="tm-rk-grp">
                      <span title="Wickets per match — derived from your prepped overs and economy, beside career and tournament wickets per match.">
                        Wkts
                      </span>
                    </th>
                    <th colSpan={3} className="tm-rk-grp">
                      <span title="Strike-rate section — your prep value beside career and tournament strike rate (wickets per over).">
                        Strike rate
                      </span>
                    </th>
                    <th colSpan={3} className="tm-rk-grp">
                      <span title="Economy section — your prep value beside career and tournament economy.">
                        Econ
                      </span>
                    </th>
                    <th className="tm-rk-grp">
                      <span title="Calculated rating, styled as in the team setup.">Rating</span>
                    </th>
                    <th className="tm-rk-grp">
                      <span title="Career bowling average — collected data or static record.">Career</span>
                    </th>
                  </>
                )}
              </tr>
              <tr className="teams-table-subrow">
                <th />
                <th />
                <th />
                <SortSubHead
                  label="N"
                  sortKey="conf"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  title="Records behind the Hist figures — click to sort (low confidence first/last)"
                />
                {mode === 'batting' ? (
                  <>
                    <SortSubHead
                      label="CAZ"
                      sortKey="runs-caz"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Trader input — your prepped batting average"
                    />
                    <SortSubHead
                      label="Hist"
                      sortKey="runs-hist"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Whole-career batting average (runs per dismissal)"
                    />
                    <SortSubHead
                      label="Form"
                      sortKey="runs-form"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title={`Mean of the shown recent scores (follows the L${recentWindow} toggle)`}
                    />
                    <SortSubHead
                      label="CAZ"
                      sortKey="sr-caz"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Trader input — your prepped strike rate (runs per 100 balls)"
                    />
                    <SortSubHead
                      label="Hist"
                      sortKey="sr-hist"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Whole-career strike rate (runs per 100 balls)"
                    />
                    <SortSubHead
                      label="Form"
                      sortKey="sr-form"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title={`Strike rate over the shown recent scores (follows the L${recentWindow} toggle)`}
                    />
                    <SortSubHead
                      label="Rating"
                      sortKey="rating"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Calculated — batting rating from CAZ, SR and the position par table"
                    />
                    <SortSubHead
                      label="Avg"
                      sortKey="pos-avg"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Historical average batting order across the whole collected dataset"
                    />
                    <SortSubHead
                      label="Set"
                      sortKey="pos-set"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Set position from the squad sheet (par slot used for the rating)"
                    />
                  </>
                ) : (
                  <>
                    <SortSubHead
                      label="Wkts"
                      sortKey="wkts"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Calculated — wickets derived from prepped overs and economy"
                    />
                    <SortSubHead
                      label="Hist"
                      sortKey="wk-hist"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Career wickets per match — collected data"
                    />
                    <SortSubHead
                      label="Form"
                      sortKey="wk-form"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Tournament wickets per match — collected data"
                    />
                    <SortSubHead
                      label="Prep"
                      sortKey="bsr-prep"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Prep value — your prepped strike rate (wickets per over)"
                    />
                    <SortSubHead
                      label="Hist"
                      sortKey="bsr-hist"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Career strike rate (wickets per over) — collected data"
                    />
                    <SortSubHead
                      label="Form"
                      sortKey="bsr-form"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Tournament strike rate — collected data"
                    />
                    <SortSubHead
                      label="Prep"
                      sortKey="ec-prep"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Prep value — prepped economy"
                    />
                    <SortSubHead
                      label="Hist"
                      sortKey="ec-hist"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Career economy — collected data"
                    />
                    <SortSubHead
                      label="Form"
                      sortKey="ec-form"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Tournament economy — collected data"
                    />
                    <SortSubHead
                      label="Rating"
                      sortKey="rating"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Calculated — bowling rating"
                    />
                    <SortSubHead
                      label="B avg"
                      sortKey="bavg"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title="Career bowling average (runs per wicket)"
                    />
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r, i) => {
                return (
                <tr key={r.playerId + r.teamId}>
                  <td className="td-num tm-rankings-full-rank tm-rankings-sticky tm-rankings-sticky-rank">{i + 1}</td>
                  <td className="td-name tm-rk-player tm-rankings-sticky tm-rankings-sticky-player" title={r.name}>
                    {r.name}
                    {noteByKey.get(r.playerId + r.teamId) ? (
                      <button
                        type="button"
                        className="tm-rk-note-dot"
                        title="View player note"
                        aria-label={`View player note for ${r.name}`}
                        onClick={() =>
                          setNoteView({
                            teamId: r.teamId,
                            playerId: r.playerId,
                            name: r.name,
                            teamName: r.teamName,
                            note: noteByKey.get(r.playerId + r.teamId) ?? '',
                          })
                        }
                      >
                        <span className="sq-note-dot" aria-hidden>
                          <span className="sq-note-dot-inner" />
                        </span>
                      </button>
                    ) : null}
                  </td>
                  <td className="tm-rankings-full-team tm-rk-team" title={r.teamName}>
                    {r.teamName}
                  </td>
                  <td className="td-num tm-rk-cell tm-rk-confcell" title={confTitle(r.confN, r.confWhat)}>
                    <ConfMeter n={r.confN} what={r.confWhat} />
                    <span className="tm-rk-confn">{r.confN}</span>
                  </td>
                  {mode === 'batting' ? (
                    <>
                      {r.batRuns?.map((c, j) => (
                        <RankCellView
                          key={'runs' + j}
                          cell={c}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider={j === 0}
                        />
                      ))}
                      {r.batSr?.map((c, j) => (
                        <RankCellView
                          key={'sr' + j}
                          cell={c}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider={j === 0}
                        />
                      ))}
                      <td className="td-num tm-rk-rate tm-rk-div" title={ratingTitle(r.ratingNum, r.rating)}>
                        <span className={'tm-rk-rating tm-rk-rating' + ratingBadgeClass(r.ratingNum, r.rating)}>
                          {r.rating}
                        </span>
                      </td>
                      {r.batPosAvg ? (
                        <RankCellView
                          cell={r.batPosAvg}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider
                        />
                      ) : null}
                      {r.batPosSet ? (
                        <RankCellView
                          cell={r.batPosSet}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      {r.bowlWkts?.map((c, j) => (
                        <RankCellView
                          key={'wk' + j}
                          cell={c}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider={j === 0}
                        />
                      ))}
                      {r.bowlSr?.map((c, j) => (
                        <RankCellView
                          key={'bsr' + j}
                          cell={c}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider={j === 0}
                        />
                      ))}
                      {r.bowlEcon?.map((c, j) => (
                        <RankCellView
                          key={'ec' + j}
                          cell={c}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider={j === 0}
                        />
                      ))}
                      <td className="td-num tm-rk-rate tm-rk-div" title={ratingTitle(r.ratingNum, r.rating)}>
                        <span className={'tm-rk-rating tm-rk-rating' + ratingBadgeClass(r.ratingNum, r.rating)}>
                          {r.rating}
                        </span>
                      </td>
                      {r.bowlBavg ? (
                        <RankCellView
                          cell={r.bowlBavg}
                          teamId={r.teamId}
                          playerId={r.playerId}
                          pending={pending}
                          onStage={stageEdit}
                          onStepEdit={stepEdit}
                          divider
                        />
                      ) : null}
                    </>
                  )}
                </tr>
              )
              })}
            </tbody>
          </table>
          <div
            className="tm-rk-grip"
            role="separator"
            aria-orientation="vertical"
            aria-label="Recent-scores panel width. Drag to resize, double-click to reset."
            title="Drag to resize the recent-scores panel — double-click to reset"
            tabIndex={0}
            onMouseDown={beginRecentDrag}
            onDoubleClick={() => setRecentW(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setRecentW((w) => clampRecentW((w ?? recentPanelW()) + 16))
              else if (e.key === 'ArrowRight')
                setRecentW((w) => clampRecentW((w ?? recentPanelW()) - 16))
              else if (e.key === 'Home' && e.shiftKey) setRecentW(null)
            }}
          />
          <div
            className="tm-rk-recent-scroll"
            style={recentW != null ? { width: recentW } : undefined}
          >
            <table className="teams-table tm-rankings-full-table tm-rk-recent-table">
              <thead>
                <tr className="teams-table-head-row">
                  <th colSpan={recentColCount} className="tm-rk-grp tm-rk-recent-head">
                    <span
                      className="tm-rk-recent-head-label"
                      title={
                        mode === 'batting'
                          ? `Window average, 3-game rolling trend and strike rate within ${scopeStripWhere}. Toggle Scores to show each innings.`
                          : 'Tournament spells, most recent first (no bowling-figures feed yet)'
                      }
                    >
                      {mode === 'batting' ? `Recent ${recentWindow}` : 'Recent 5'}
                    </span>
                  </th>
                  <th className="teams-th-tbd" title="More fields coming soon">
                    TBD
                  </th>
                  <th className="teams-th-identity">
                    <span className="sr-only">Open in squad</span>
                  </th>
                </tr>
                <tr className="teams-table-subrow">
                  {(mode === 'batting' ? recentHeads.slice(0, 1) : recentHeads).map((h) => (
                    <SortSubHead
                      key={'rech' + h.label}
                      label={h.label}
                      sortKey={h.key}
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title={h.title}
                      divider={h.divider}
                    />
                  ))}
                  {mode === 'batting' ? (
                    <th
                      className="th-num tm-rk-trend-head tm-rk-div"
                      title="3-game rolling average vs career — green running hot, red running cold"
                    >
                      Trend
                    </th>
                  ) : null}
                  {mode === 'batting' ? (
                    <SortSubHead
                      key={'rech' + recentHeads[1].label}
                      label={recentHeads[1].label}
                      sortKey={recentHeads[1].key}
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      title={recentHeads[1].title}
                      divider
                    />
                  ) : null}
                  {mode === 'batting'
                    ? recentHeads.slice(2).map((h) => (
                        <SortSubHead
                          key={'rech' + h.label}
                          label={h.label}
                          sortKey={h.key}
                          activeKey={sortKey}
                          dir={sortDir}
                          onSort={toggleSort}
                          title={h.title}
                          divider={h.divider}
                        />
                      ))
                    : null}
                  <th className="th-num teams-th-tbd">—</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={'rc' + r.playerId + r.teamId}>
                  {mode === 'batting' ? (
                    <td
                      key="recavg"
                      className="td-num tm-rk-cell tm-rk-recent tm-rk-div"
                      title={r.recentTitle[0]}
                      style={recentTintStyle(r.recentTint?.[0])}
                    >
                      {r.recent[0]}
                    </td>
                  ) : (
                    r.recent.map((c, j) => (
                      <td
                        key={'rec' + j}
                        className={
                          'td-num tm-rk-cell tm-rk-recent' + (j === 0 ? ' tm-rk-div' : '')
                        }
                      >
                        {c}
                      </td>
                    ))
                  )}
                  {mode === 'batting'
                    ? (() => {
                        const trend = trendStrip(r.recent.slice(2), r.trendAnchor)
                        return (
                          <td className="td-num tm-rk-cell tm-rk-recent tm-rk-div" title={trend?.title}>
                            {trend ? (
                              <span className="tm-rk-trend" aria-hidden>
                                {trend.fills.map((f, i) => (
                                  <i key={i} style={f ? { background: f } : undefined} />
                                ))}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        )
                      })()
                    : null}
                  {mode === 'batting' ? (
                    <td
                      key="recsr"
                      className="td-num tm-rk-cell tm-rk-recent tm-rk-div"
                      title={r.recentTitle[1]}
                      style={recentTintStyle(r.recentTint?.[1])}
                    >
                      {r.recent[1]}
                    </td>
                  ) : null}
                  {mode === 'batting' && showGames
                    ? r.recent.slice(2).map((c, k) => (
                        <td
                          key={'recg' + k}
                          className={
                            'td-num tm-rk-cell tm-rk-recent tm-rk-g' + (k === 0 ? ' tm-rk-div' : '')
                          }
                          title={r.recentTitle[k + 2]}
                        >
                          {c}
                        </td>
                      ))
                    : null}
                  <td className="td-num teams-td-tbd">—</td>
                  <td className="tm-rankings-full-action">
                    <button
                      type="button"
                      className="tm-btn tm-btn-sm tm-btn-icon tm-btn--ghost"
                      title={'Open ' + r.name + ' in squad (' + r.teamName + ')'}
                      aria-label={'Open ' + r.name + ' in squad'}
                      onClick={() => onOpenPlayerInTeam({ teamId: r.teamId, playerId: r.playerId })}
                    >
                      ↗
                    </button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          {pendingCount > 0 && (
            <div className="tm-rk-savebar" role="status" aria-live="polite">
              <span
                className="tm-rk-savebar-count"
                title="Staged edits — not saved yet. Save applies them all at once."
              >
                ● {pendingCount} unsaved
              </span>
              <button
                type="button"
                className="tm-btn tm-btn-sm tm-rk-savebar-save"
                onClick={savePending}
                title="Apply all staged edits at once"
              >
                Save{pendingCount > 1 ? ' all' : ''}
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-sm tm-btn--ghost"
                onClick={discardPending}
                title="Throw away all staged edits"
              >
                Discard
              </button>
            </div>
          )}
          {noteView ? (
            <div className="tm-rk-note-backdrop" onClick={() => setNoteView(null)}>
              <div
                className="tm-rk-note-pop"
                role="dialog"
                aria-label={`Player note — ${noteView.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="tm-rk-note-head">
                  <div>
                    <div className="tm-rk-note-name">{noteView.name}</div>
                    <div className="tm-rk-note-team">{noteView.teamName} · squad note</div>
                  </div>
                  <button
                    type="button"
                    className="tm-btn tm-btn-sm tm-btn--ghost"
                    onClick={() => setNoteView(null)}
                    aria-label="Close player note"
                  >
                    ✕
                  </button>
                </div>
                <p className="tm-rk-note-body">{noteView.note}</p>
                <div className="tm-rk-note-actions">
                  <button
                    type="button"
                    className="tm-btn tm-btn-sm"
                    onClick={() => {
                      onOpenPlayerInTeam({ teamId: noteView.teamId, playerId: noteView.playerId })
                      setNoteView(null)
                    }}
                  >
                    Open in squad
                  </button>
                  <button
                    type="button"
                    className="tm-btn tm-btn-sm tm-btn--ghost"
                    onClick={() => setNoteView(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {sorted.length === 0 && (
            <p className="rankings-empty">No squad players in this tournament yet.</p>
          )}
          {sorted.length > 0 && visibleRows.length === 0 && (
            <p className="rankings-empty">No players match the current filters.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SortSubHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  title,
  divider,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  title?: string
  /** First cell of a section — draws a vertical divider rule. */
  divider?: boolean
}) {
  const active = activeKey === sortKey
  return (
    <th
      className={
        'th-num teams-sortable tm-rk-sub-th' + (active ? ' teams-sorted' : '') + (divider ? ' tm-rk-div' : '')
      }
      title={(title ? title + '. ' : '') + 'Click to sort'}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? <span className="teams-sort-ind">{dir === 'desc' ? ' ▼' : ' ▲'}</span> : null}
    </th>
  )
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

/** Whole-number display for the trader-entered CAZ columns. */
function fmt0(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(0)
}

function parsePosFilter(raw: string): BattingPositionFilter {
  if (raw === 'openers') return 'openers'
  if (/^(10|11|[1-9])$/.test(raw)) return raw as BattingPositionFilter
  return 'all'
}

interface BattingCareerForm {
  /** True when tournament innings were collected (flags only apply to collected data). */
  mapped: boolean
  avg: number | null
  avgKind: 'data' | 'static'
  sr: number | null
  srKind: 'data' | 'static'
  fours: number | null
  sixes: number | null
  boundKind: 'data' | 'static'
  form: number | null
  formTitle: string
  formSr: number | null
  formSrTitle: string
  innings: RankInnings[]
}

type RankInnings = RecentInnings & { opponent?: string | null; date?: string }

/**
 * Runs / Strike-rate Hist (whole-career) + Form (recent window) for the rankings
 * batting view. Mapped players use collected tournament innings plus career
 * aggregates; everyone else falls back to the built-in static records.
 */
function battingCareerForm(
  profile: PlayerProfile,
  db: RankingsPlayerData | undefined,
  window: number,
  fallback: { average: number; strikeRate: number },
): BattingCareerForm {
  const mapped = !!db && db.innings.length > 0
  const dbInnings: RankInnings[] = mapped
    ? db!.innings.map((r) => ({
        score: r.runs,
        notOut: r.notOut,
        balls: r.balls,
        fours: r.fours,
        sixes: r.sixes,
        opponent: r.opponent,
        date: r.date,
      }))
    : []
  const staticInnings: RankInnings[] = profile.recentInnings ?? []
  const innings = mapped ? dbInnings : staticInnings
  const wagg = recentWindowAggregates(innings, window)
  const formTitle =
    wagg.mean != null
      ? `Mean of the last ${wagg.innings.length} shown scores (${mapped ? 'collected data' : 'static record'}).`
      : 'No recent scores available.'
  const formSrTitle =
    wagg.strikeRate100 != null
      ? `Strike rate over the last ${wagg.innings.length} shown scores (${mapped ? 'collected data' : 'static record'}).`
      : 'No recent balls-faced data available.'
  if (mapped) {
    return {
      mapped: true,
      avg: db!.careerAvg,
      avgKind: 'data',
      sr: db!.careerSr,
      srKind: 'data',
      fours: db!.careerFours,
      sixes: db!.careerSixes,
      boundKind: 'data',
      form: wagg.mean,
      formTitle,
      formSr: wagg.strikeRate100,
      formSrTitle,
      innings,
    }
  }
  return {
    mapped: false,
    avg: fallback.average,
    avgKind: 'static',
    sr: fallback.strikeRate,
    srKind: 'static',
    fours: null,
    sixes: null,
    boundKind: 'static',
    form: wagg.mean ?? fallback.average,
    formTitle,
    formSr: wagg.strikeRate100 ?? fallback.strikeRate,
    formSrTitle,
    innings,
  }
}

interface RecentWindowCells {
  avg: string
  avgTitle: string
  /** Numeric window average (null when no recent innings) — for tinting vs career. */
  avgNum: number | null
  sr: string
  srTitle: string
  /** Numeric window strike rate (null when no balls-faced data) — for tinting vs career. */
  srNum: number | null
  cells: string[]
  titles: (string | undefined)[]
}

function recentWindowCells(innings: RankInnings[], window: number, mapped: boolean): RecentWindowCells {
  const agg = recentWindowAggregates(innings, window)
  const cells: string[] = []
  const titles: (string | undefined)[] = []
  for (let i = 0; i < window; i++) {
    const inn = agg.innings[i]
    if (!inn) {
      cells.push('—')
      titles.push(undefined)
      continue
    }
    const balls = inn.balls ?? 0
    cells.push(`${inn.score}${inn.notOut ? '*' : ''}${balls > 0 ? ` (${balls})` : ''}`)
    const bits = [`G${i + 1}: ${inn.score}${inn.notOut ? '*' : ''} off ${balls} balls`]
    bits.push(`${inn.fours ?? 0}×4 ${inn.sixes ?? 0}×6`)
    if (inn.opponent) bits.push(`vs ${inn.opponent}`)
    titles.push(bits.join(' · '))
  }
  return {
    avg: agg.average != null ? agg.average.toFixed(2) : '—',
    avgTitle:
      agg.average != null
        ? `${mapped ? 'Collected data' : 'Static record'} — batting average over the last ${agg.innings.length} (runs per dismissal; * = not out).`
        : 'No recent innings available.',
    avgNum: agg.average,
    sr: agg.strikeRate100 != null ? agg.strikeRate100.toFixed(2) : '—',
    srTitle:
      agg.strikeRate100 != null
        ? `${mapped ? 'Collected data' : 'Static record'} — strike rate over the last ${agg.innings.length} shown scores (runs per 100 balls).`
        : 'No recent balls-faced data available.',
    srNum: agg.strikeRate100,
    cells,
    titles,
  }
}

function parseLeading(s: string): number | null {
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return Number.isFinite(n) ? n : null
}

/** Sign for colour: numeric rating first, then parsed display (same rules as squad table). */
function signedRating(v: number | null, display: string): number | null {
  if (v != null && Number.isFinite(v)) return v
  if (display === '–' || display === '—') return null
  const n = parseLeading(display.replace(/\u2212/g, '-'))
  return n
}

/** Badge sign for the rating value: green above par, red below, neutral otherwise. */
function ratingBadgeClass(v: number | null, display: string): string {
  const n = signedRating(v, display)
  if (n == null || n === 0) return '--flat'
  return n > 0 ? '--pos' : '--neg'
}

function ratingTitle(v: number | null, display: string): string {
  const n = signedRating(v, display)
  if (n == null) return 'No rating'
  if (n > 0) return `Rating ${display} — above par (calculated from your prepped inputs)`
  if (n < 0) return `Rating ${display} — below par (calculated from your prepped inputs)`
  return 'Rating 0 — at par (calculated from your prepped inputs)'
}

/** Rolling-form strip: 3-game rolling average at each shown game vs the career anchor.
 * Green = running hot, red = running cold. Newest game first, tail shortens naturally. */
function trendStrip(
  cells: string[],
  anchor: number | null,
): { fills: (string | undefined)[]; title: string } | undefined {
  if (anchor == null || anchor === 0) return undefined
  const scores = cells.map((c) => parseLeading(c))
  if (!scores.some((n) => n != null)) return undefined
  const avgs: (number | null)[] = scores.map((_, i) => {
    const w = scores.slice(i, i + 3).filter((n): n is number => n != null)
    return w.length > 0 ? w.reduce((a, b) => a + b, 0) / w.length : null
  })
  const fills = avgs.map((a) => {
    if (a == null) return undefined
    const dev = (a - anchor) / Math.abs(anchor)
    if (dev === 0) return undefined
    const alpha = Math.round(Math.min(Math.abs(dev) / 0.5, 1) * 35) / 100
    return dev > 0 ? `rgba(74, 222, 128, ${alpha})` : `rgba(248, 113, 113, ${alpha})`
  })
  const seq = avgs.map((a) => (a == null ? '–' : fmt(a))).join(' → ')
  return {
    fills,
    title: `3-game rolling average, newest first (${seq}) vs career ${fmt(anchor)}. Green = running hot, red = running cold.`,
  }
}
