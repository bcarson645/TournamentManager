import type Database from 'better-sqlite3'
import { allPlayerIdsForCanonical, resolveCanonicalPlayerId } from './playerMerges'

export type DismissalCategory =
  | 'Caught'
  | 'Bowled'
  | 'LBW'
  | 'Run out'
  | 'Stumped'
  | 'Hit wicket'
  | 'Other'

export const DISMISSAL_CATEGORY_ORDER: DismissalCategory[] = [
  'Caught',
  'Bowled',
  'LBW',
  'Run out',
  'Stumped',
  'Hit wicket',
  'Other',
]

export interface DismissalMixRow {
  category: DismissalCategory
  playerCount: number
  /** Share of this player's dismissals (0–100). */
  playerPct: number
  /** Share of all dismissals in this filter (0–100). */
  populationPct: number
  /** Player % minus population % (percentage points). */
  deltaPp: number
  /** Standard deviations vs mean player rate for this type (peers in same filter). */
  zScore: number | null
  highlight: 'high' | 'low' | null
}

export interface DismissalMixBreakdown {
  playerDismissals: number
  populationDismissals: number
  rows: DismissalMixRow[]
}

const MIN_PLAYER_DISMISSALS = 5
const MIN_PEERS_FOR_Z = 12
const Z_HIGHLIGHT = 1.5
const PP_HIGHLIGHT = 6

export function isDismissedInnings(dismissal: string | null): boolean {
  if (!dismissal || !dismissal.trim()) return false
  const d = dismissal.toLowerCase()
  if (d.includes('not out') || d === 'no' || d.includes('retired hurt')) return false
  return true
}

export function isBattedInnings(batRuns: number | null, batBalls: number | null): boolean {
  return (batBalls ?? 0) > 0 || (batRuns ?? 0) > 0
}

/** Map raw export text to a display category; null = exclude from dismissal mix. */
export function normalizeDismissalCategory(dismissal: string | null): DismissalCategory | null {
  if (!dismissal || !dismissal.trim()) return null
  const d = dismissal.trim().toLowerCase()
  if (d === 'dnb' || d.includes('did not bat')) return null
  if (!isDismissedInnings(dismissal)) return null
  if (d.includes('fielder catch') || d.includes('keeper catch') || d.includes('caught') || d === 'catch') {
    return 'Caught'
  }
  if (d.includes('bowled')) return 'Bowled'
  if (d.includes('lbw')) return 'LBW'
  if (d.includes('run out')) return 'Run out'
  if (d.includes('stumped')) return 'Stumped'
  if (d.includes('hit wicket')) return 'Hit wicket'
  return 'Other'
}

type DismissalRow = {
  dismissal: string | null
  bat_runs: number | null
  bat_balls: number | null
  player_id?: string
}

function countByCategory(rows: DismissalRow[]): { counts: Map<DismissalCategory, number>; total: number } {
  const counts = new Map<DismissalCategory, number>()
  let total = 0
  for (const r of rows) {
    if (!isBattedInnings(r.bat_runs, r.bat_balls)) continue
    if (!isDismissedInnings(r.dismissal)) continue
    const cat = normalizeDismissalCategory(r.dismissal)
    if (!cat) continue
    counts.set(cat, (counts.get(cat) ?? 0) + 1)
    total++
  }
  return { counts, total }
}

function pct(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 1000) / 10
}

function sampleStdDev(values: number[]): number | null {
  if (values.length < MIN_PEERS_FOR_Z) return null
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  if (variance <= 0) return null
  return Math.sqrt(variance)
}

function peerPctDistribution(
  rows: DismissalRow[],
  canonicalPlayerId: string,
): Map<DismissalCategory, { mean: number; std: number | null }> {
  const byPlayer = new Map<string, DismissalRow[]>()
  for (const r of rows) {
    if (!r.player_id) continue
    const pid = resolveCanonicalPlayerId(r.player_id)
    const list = byPlayer.get(pid) ?? []
    list.push(r)
    byPlayer.set(pid, list)
  }

  const peerPcts = new Map<DismissalCategory, number[]>()
  for (const cat of DISMISSAL_CATEGORY_ORDER) {
    peerPcts.set(cat, [])
  }

  for (const [pid, list] of byPlayer) {
    const { counts, total } = countByCategory(list)
    if (total < MIN_PLAYER_DISMISSALS) continue
    for (const cat of DISMISSAL_CATEGORY_ORDER) {
      peerPcts.get(cat)!.push(pct(counts.get(cat) ?? 0, total))
    }
    void pid
  }

  const out = new Map<DismissalCategory, { mean: number; std: number | null }>()
  for (const cat of DISMISSAL_CATEGORY_ORDER) {
    const vals = peerPcts.get(cat)!
    if (vals.length === 0) {
      out.set(cat, { mean: 0, std: null })
      continue
    }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    out.set(cat, { mean, std: sampleStdDev(vals) })
  }
  return out
}

export function buildDismissalMixBreakdown(
  playerRows: DismissalRow[],
  populationRows: DismissalRow[],
  canonicalPlayerId: string,
): DismissalMixBreakdown | null {
  const player = countByCategory(playerRows)
  if (player.total < 1) return null

  const population = countByCategory(populationRows)
  const peers = peerPctDistribution(populationRows, canonicalPlayerId)

  const rows: DismissalMixRow[] = []

  for (const category of DISMISSAL_CATEGORY_ORDER) {
    const playerCount = player.counts.get(category) ?? 0
    const popCount = population.counts.get(category) ?? 0
    if (playerCount === 0 && popCount === 0) continue

    const playerPct = pct(playerCount, player.total)
    const populationPct = pct(popCount, population.total)
    const deltaPp = Math.round((playerPct - populationPct) * 10) / 10

    const peer = peers.get(category)
    let zScore: number | null = null
    if (peer?.std != null && peer.std > 0) {
      zScore = Math.round(((playerPct - peer.mean) / peer.std) * 100) / 100
    }

    let highlight: 'high' | 'low' | null = null
    if (zScore != null && zScore >= Z_HIGHLIGHT) highlight = 'high'
    else if (zScore != null && zScore <= -Z_HIGHLIGHT) highlight = 'low'
    else if (deltaPp >= PP_HIGHLIGHT) highlight = 'high'
    else if (deltaPp <= -PP_HIGHLIGHT) highlight = 'low'

    rows.push({
      category,
      playerCount,
      playerPct,
      populationPct,
      deltaPp,
      zScore,
      highlight,
    })
  }

  rows.sort((a, b) => b.playerPct - a.playerPct)

  return {
    playerDismissals: player.total,
    populationDismissals: population.total,
    rows,
  }
}

export interface ScopedDismissalRow {
  dismissal: string | null
  bat_runs: number | null
  bat_balls: number | null
  player_id: string
  tournament_id: string | null
}

type StatsScope = 'current' | 'all' | string

/** Batting rows with dismissal text for population / peer baselines (scoped in SQL when possible). */
export function loadDismissalRowsInScope(
  db: Database.Database,
  effectiveScope: StatsScope,
  contextTournamentId: string | null,
): ScopedDismissalRow[] {
  const base = `SELECT p.dismissal, p.bat_runs, p.bat_balls, p.player_id, cd.tournament_id
       FROM performances p
       LEFT JOIN competition_dim cd ON cd.competition_id = p.competition_id
       WHERE (p.bat_balls > 0 OR p.bat_runs > 0)`
  if (effectiveScope === 'all') {
    return db.prepare(base).all() as ScopedDismissalRow[]
  }
  const tid = effectiveScope === 'current' ? contextTournamentId : effectiveScope
  if (!tid) {
    return db.prepare(base).all() as ScopedDismissalRow[]
  }
  return db
    .prepare(`${base} AND cd.tournament_id = ?`)
    .all(tid) as ScopedDismissalRow[]
}

export function filterRowsForCanonicalPlayer(
  rows: ScopedDismissalRow[],
  canonicalPlayerId: string,
): DismissalRow[] {
  const ids = new Set(allPlayerIdsForCanonical(canonicalPlayerId))
  return rows.filter((r) => ids.has(r.player_id))
}
