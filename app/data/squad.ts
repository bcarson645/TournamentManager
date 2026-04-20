import { IPL_PLAYERS } from './iplPlayers'
import { getProfileForPlayer } from './playerProfile'
import { calculateBatRating, calculateBowlRating } from './ratingBenchmarks'
import type { CricketFormat, Gender } from './tournaments'

export type BowlAction = 'SEAM' | 'SPIN'

export const MAX_TEAM_OVERS = 20

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
  raw: number
  /** Batting SR.CAZ — runs per ball (not per 100 balls). */
  sr: number
  fours: number
  sixes: number
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
}

/** Migrate in-memory rows from old `bowlSr` (balls/wicket) to `bowlWpo`. */
export function migrateLegacyBowlingFields(p: SquadPlayer & { bowlSr?: number }): SquadPlayer {
  if (typeof p.bowlSr === 'number' && p.bowlSr > 0 && !(p.bowlWpo > 0)) {
    const { bowlSr: _legacy, ...rest } = p
    return { ...rest, bowlWpo: 6 / p.bowlSr }
  }
  return { ...p, bowlWpo: p.bowlWpo ?? 0 }
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
  const raw = bat.average ? Math.round(bat.average * 0.85 * 10) / 10 : 0
  const sr = bat.strikeRate ?? 0

  const batRating = calculateBatRating(btCaz, raw, sr, position, format, gender)

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
    raw,
    sr,
    fours: 0,
    sixes: 0,
    batRating,
    action: 'SEAM' as BowlAction,
    wkts,
    overs,
    econ,
    bowlWpo,
    bowlAvg,
    bowlRating,
    locked: false,
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

  for (let i = 0; i < Math.max(knownNames.length, 22); i++) {
    const name = i < knownNames.length ? knownNames[i] : `Player ${i + 1}`
    const position = (i % 11) + 1
    allPlayers.push(makePlayer(teamId, i, name, position, format, gender))
  }

  let startingXI = allPlayers.slice(0, 11)
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
