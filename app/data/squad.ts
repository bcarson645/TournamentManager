import { BLAST_MEN_SQUADS } from './blastMenSquads'
import { IPL_PLAYERS } from './iplPlayers'
import { THE_HUNDRED_MEN_SQUADS } from './theHundredMenPlayers'
import { makeDefaultProfile, getProfileForPlayer } from './playerProfile'
import { calculateBatRating, calculateBowlRating } from './ratingBenchmarks'
import type { CricketFormat, Gender } from './tournaments'

export type BowlAction = 'SEAM' | 'SPIN'

export const MAX_TEAM_OVERS = 20
/** Pre-named impact / substitute pool (e.g. IPL-style bench). */
export const MAX_IMPACT_SUBS = 5

/** `bowlWpo` = wickets per over. Internally uses balls/wicket = 6/bowlWpo for wkts & avg. */
export function calcWktsAndBowlAvg(overs: number, econ: number, bowlWpo: number): { wkts: number; bowlAvg: number } {
  const balls = overs * 6
  const ballsPerWicket = bowlWpo > 0 ? 6 / bowlWpo : 0
  const wkts = ballsPerWicket > 0 ? Math.round((balls / ballsPerWicket) * 10) / 10 : 0
  const bowlAvg = wkts > 0 ? Math.round((econ * ballsPerWicket) / 6 * 100) / 100 : 0
  return { wkts, bowlAvg }
}

export interface SquadPlayer {
  id: string
  playerId: string
  name: string
  btCaz: number
  /** Seeded / profile base raw average; read-only in squad table. */
  rawBase: number
  /** User adjustment; effective `raw` = rawBase + rawAdj for ratings. */
  rawAdj: number
  /**
   * Effective raw average for batting rating (`rawBase + rawAdj`).
   * Recomputed when `rawBase` or `rawAdj` changes; kept in sync in storage.
   */
  raw: number
  /** Batting SR.CAZ — runs per ball (not per 100 balls). */
  sr: number
  fours: number
  sixes: number
  /**
   * Par batting slot 1–11 for `calculateBatRating` when the player is in **reserves** or **impact subs**.
   * Starting XI uses row order instead; this field is still stored and may be edited when they move to the bench.
   */
  ratingParPosition: number
  batRating: number
  action: BowlAction
  wkts: number
  overs: number
  econ: number
  /** Bowling SR — **wickets per over** (decimal), user input; matches par SR column. */
  bowlWpo: number
  bowlAvg: number
  bowlRating: number
  locked: boolean
  /** Starting XI wicket-keeper; at most one starter may be true — cleared when moved off XI. */
  keeper?: boolean
}

/** Migrate in-memory rows from old `bowlSr` (balls/wicket) to `bowlWpo`. */
export function migrateLegacyBowlingFields(p: SquadPlayer & { bowlSr?: number }): SquadPlayer {
  if (typeof p.bowlSr === 'number' && p.bowlSr > 0 && !(p.bowlWpo > 0)) {
    const { bowlSr: _legacy, ...rest } = p
    return { ...rest, bowlWpo: 6 / p.bowlSr }
  }
  return { ...p, bowlWpo: p.bowlWpo ?? 0 }
}

type SquadPlayerRawLoose = SquadPlayer & { rawBase?: number; rawAdj?: number; ratingParPosition?: number }

/**
 * Ensure `rawBase` / `rawAdj` / `raw` (effective) are consistent. Legacy JSON had only `raw` as direct input; that becomes the base.
 */
/** At most one starting XI wicket-keeper; bench lists never carry `keeper`. */
export function sanitizeKeeperFlags(
  startingXI: SquadPlayer[],
  reserves: SquadPlayer[],
  impactSubs: SquadPlayer[],
): [SquadPlayer[], SquadPlayer[], SquadPlayer[]] {
  const kIdx = startingXI.findIndex((p) => p.keeper === true)
  const sx = startingXI.map((p, idx) => ({ ...p, keeper: kIdx !== -1 && idx === kIdx }))
  const rx = reserves.map((p) => ({ ...p, keeper: false }))
  const ix = impactSubs.map((p) => ({ ...p, keeper: false }))
  return [sx, rx, ix]
}

export function normalizeSquadPlayer(p: SquadPlayerRawLoose): SquadPlayer {
  const m = migrateLegacyBowlingFields(p)
  const hasBase = typeof m.rawBase === 'number' && !Number.isNaN(m.rawBase)
  const hasAdj = typeof m.rawAdj === 'number' && !Number.isNaN(m.rawAdj)
  const rawBase = hasBase ? m.rawBase! : m.raw
  const rawAdj = hasAdj ? Math.round(m.rawAdj!) : 0
  const raw = Math.round((rawBase + rawAdj) * 10) / 10
  const rp0 =
    typeof m.ratingParPosition === 'number' && !Number.isNaN(m.ratingParPosition) ? m.ratingParPosition : 11
  const ratingParPosition = Math.max(1, Math.min(11, Math.round(rp0)))
  const keeper = m.keeper === true
  return { ...m, rawBase, rawAdj, raw, ratingParPosition, keeper }
}

/** Par position 1–11 for batting rating on bench rows; starting XI should use `battingPositionForParTable('starting', i)`. */
export function ratingParPosForBatCalc(section: 'starting' | 'reserves' | 'impact', rowIndex: number, p: SquadPlayer): number {
  if (section === 'starting') {
    return Math.max(1, Math.min(11, rowIndex + 1))
  }
  return Math.max(1, Math.min(11, Math.round(p.ratingParPosition)))
}

export function normalizeBowlStats(
  p: SquadPlayer,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): SquadPlayer {
  const pl = migrateLegacyBowlingFields(p)
  const { wkts, bowlAvg } = calcWktsAndBowlAvg(pl.overs, pl.econ, pl.bowlWpo)
  const bowlRating = calculateBowlRating(pl.econ, pl.bowlWpo, bowlAvg, pl.overs, format, gender)
  return { ...pl, wkts, bowlAvg, bowlRating }
}

const KNOWN_PLAYERS: Record<string, string[]> = {
  ...IPL_PLAYERS,
  ...THE_HUNDRED_MEN_SQUADS,
  ...BLAST_MEN_SQUADS,
}

function makePlayer(
  teamId: string,
  index: number,
  name: string,
  position: number,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): SquadPlayer {
  const profile = getProfileForPlayer(name)
  const bat = profile.careerBatting
  const bowl = profile.careerBowling

  const btCaz = bat.average || 0
  const rawBase = bat.average ? Math.round(bat.average * 0.85 * 10) / 10 : 0
  const rawAdj = 0
  const raw = Math.round((rawBase + rawAdj) * 10) / 10
  const sr = bat.strikeRate ?? 0

  const ratingParPosition = Math.max(1, Math.min(11, position))
  const batRating = calculateBatRating(btCaz, raw, sr, ratingParPosition, format, gender)

  const econ = bowl.economy || 0
  const ballsPerWicket = bowl.strikeRate || 0
  const bowlWpo = ballsPerWicket > 0 ? 6 / ballsPerWicket : 0
  const overs = bowl.matches > 0 && bowl.wickets > 0 && ballsPerWicket > 0
    ? Math.min(4, Math.round((bowl.wickets * ballsPerWicket) / (6 * bowl.matches) * 10) / 10)
    : bowl.wickets > 0 ? 4 : 0

  const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, econ, bowlWpo)
  const bowlRating = calculateBowlRating(econ, bowlWpo, bowlAvg, overs, format, gender)

  return {
    id: `${teamId}-p${index + 1}`,
    playerId: String(11000000 + index + 1).padStart(8, '0'),
    name,
    btCaz,
    rawBase,
    rawAdj,
    raw,
    sr,
    fours: 0,
    sixes: 0,
    ratingParPosition,
    batRating,
    action: 'SEAM' as BowlAction,
    wkts,
    overs,
    econ,
    bowlWpo,
    bowlAvg,
    bowlRating,
    locked: false,
    keeper: false,
  }
}

/** New bench/impact player with default (zero) stats for manual editing — not seeded from KNOWN_STATS. */
export function createCustomSquadBlank(
  teamId: string,
  displayName: string,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): SquadPlayer {
  const name = displayName.trim() || 'Custom player'
  const rid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const id = `${teamId}-custom-${rid}`
  const playerId = String(Math.floor(10000000 + Math.random() * 89999999)).padStart(8, '0')

  const profile = makeDefaultProfile()
  const bat = profile.careerBatting
  const bowl = profile.careerBowling
  const btCaz = bat.average || 0
  const rawBase = bat.average ? Math.round(bat.average * 0.85 * 10) / 10 : 0
  const rawAdj = 0
  const raw = Math.round((rawBase + rawAdj) * 10) / 10
  const sr = bat.strikeRate ?? 0
  const ratingParPosition = 11
  const batRating = calculateBatRating(btCaz, raw, sr, ratingParPosition, format, gender)

  const econ = bowl.economy || 0
  const ballsPerWicket = bowl.strikeRate || 0
  const bowlWpo = ballsPerWicket > 0 ? 6 / ballsPerWicket : 0
  const overs = 0

  const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, econ, bowlWpo)
  const bowlRating = calculateBowlRating(econ, bowlWpo, bowlAvg, overs, format, gender)

  return {
    id,
    playerId,
    name,
    btCaz,
    rawBase,
    rawAdj,
    raw,
    sr,
    fours: 0,
    sixes: 0,
    ratingParPosition,
    batRating,
    action: 'SEAM',
    wkts,
    overs,
    econ,
    bowlWpo,
    bowlAvg,
    bowlRating,
    locked: false,
    keeper: false,
  }
}

export function makePlaceholderSquad(
  teamId: string,
  count: number,
  offset = 0,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): SquadPlayer[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1 + offset
    const position = i + 1
    return makePlayer(teamId, num - 1, `Player ${num}`, position, format, gender)
  })
}

export function makeSquadForTeam(
  teamId: string,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): { startingXI: SquadPlayer[]; reserves: SquadPlayer[] } {
  const knownNames = KNOWN_PLAYERS[teamId]

  if (!knownNames || knownNames.length === 0) {
    return {
      startingXI: makePlaceholderSquad(teamId, 11, 0, format, gender),
      reserves: makePlaceholderSquad(teamId, 11, 11, format, gender),
    }
  }

  const allPlayers: SquadPlayer[] = []

  for (let i = 0; i < knownNames.length; i++) {
    const name = knownNames[i]
    const position = (i % 11) + 1
    allPlayers.push(makePlayer(teamId, i, name, position, format, gender))
  }

  let startingXI = allPlayers.slice(0, Math.min(11, allPlayers.length))
  const totalOvers = startingXI.reduce((s, p) => s + p.overs, 0)
  if (totalOvers > MAX_TEAM_OVERS && totalOvers > 0) {
    const scale = MAX_TEAM_OVERS / totalOvers
    startingXI = startingXI.map((p) => {
      const overs = Math.round(p.overs * scale * 10) / 10
      const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, p.econ, p.bowlWpo)
      const bowlRating = calculateBowlRating(p.econ, p.bowlWpo, bowlAvg, overs, format, gender)
      return { ...p, overs, wkts, bowlAvg, bowlRating }
    })
  }

  return {
    startingXI,
    reserves: allPlayers.slice(11),
  }
}
