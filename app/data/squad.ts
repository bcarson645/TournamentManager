import { IPL_PLAYERS } from './iplPlayers'
import { getProfileForPlayer } from './playerProfile'
import { calculateBatRating, calculateBowlRating } from './ratingBenchmarks'

export type BowlAction = 'SEAM' | 'SPIN'

export const MAX_TEAM_OVERS = 20

export function calcWktsAndBowlAvg(overs: number, econ: number, bowlSr: number): { wkts: number; bowlAvg: number } {
  const balls = overs * 6
  const wkts = bowlSr > 0 ? Math.round((balls / bowlSr) * 10) / 10 : 0
  const bowlAvg = wkts > 0 ? Math.round((econ * bowlSr) / 6 * 100) / 100 : 0
  return { wkts, bowlAvg }
}

export interface SquadPlayer {
  id: string
  playerId: string
  name: string
  btCaz: number
  raw: number
  sr: number
  fours: number
  sixes: number
  batRating: number
  action: BowlAction
  wkts: number
  overs: number
  econ: number
  bowlSr: number
  bowlAvg: number
  bowlRating: number
  locked: boolean
}

export function normalizeBowlStats(p: SquadPlayer): SquadPlayer {
  const { wkts, bowlAvg } = calcWktsAndBowlAvg(p.overs, p.econ, p.bowlSr)
  const bowlRating = calculateBowlRating(p.econ, p.bowlSr, bowlAvg, p.overs)
  return { ...p, wkts, bowlAvg, bowlRating }
}

const KNOWN_PLAYERS: Record<string, string[]> = {
  ...IPL_PLAYERS,
}

function makePlayer(teamId: string, index: number, name: string, position: number): SquadPlayer {
  const profile = getProfileForPlayer(name)
  const bat = profile.careerBatting
  const bowl = profile.careerBowling

  const btCaz = bat.average || 0
  const raw = bat.average ? Math.round(bat.average * 0.85 * 10) / 10 : 0
  const sr = bat.strikeRate || 0

  const batRating = calculateBatRating(btCaz, raw, sr, position)

  const econ = bowl.economy || 0
  const bowlSr = bowl.strikeRate || 0
  const overs = bowl.matches > 0 && bowl.wickets > 0 && bowlSr > 0
    ? Math.min(4, Math.round((bowl.wickets * bowlSr) / (6 * bowl.matches) * 10) / 10)
    : bowl.wickets > 0 ? 4 : 0

  const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, econ, bowlSr)
  const bowlRating = calculateBowlRating(econ, bowlSr, bowlAvg, overs)

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
    bowlSr,
    bowlAvg,
    bowlRating,
    locked: false,
  }
}

export function makePlaceholderSquad(teamId: string, count: number, offset = 0): SquadPlayer[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1 + offset
    const position = i + 1
    return makePlayer(teamId, num - 1, `Player ${num}`, position)
  })
}

export function makeSquadForTeam(teamId: string): { startingXI: SquadPlayer[]; reserves: SquadPlayer[] } {
  const knownNames = KNOWN_PLAYERS[teamId]

  if (!knownNames || knownNames.length === 0) {
    return {
      startingXI: makePlaceholderSquad(teamId, 11, 0),
      reserves: makePlaceholderSquad(teamId, 11, 11),
    }
  }

  const allPlayers: SquadPlayer[] = []

  for (let i = 0; i < Math.max(knownNames.length, 22); i++) {
    const name = i < knownNames.length ? knownNames[i] : `Player ${i + 1}`
    const position = (i % 11) + 1
    allPlayers.push(makePlayer(teamId, i, name, position))
  }

  let startingXI = allPlayers.slice(0, 11)
  const totalOvers = startingXI.reduce((s, p) => s + p.overs, 0)
  if (totalOvers > MAX_TEAM_OVERS && totalOvers > 0) {
    const scale = MAX_TEAM_OVERS / totalOvers
    startingXI = startingXI.map((p) => {
      const overs = Math.round(p.overs * scale * 10) / 10
      const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, p.econ, p.bowlSr)
      const bowlRating = calculateBowlRating(p.econ, p.bowlSr, bowlAvg, overs)
      return { ...p, overs, wkts, bowlAvg, bowlRating }
    })
  }

  return {
    startingXI,
    reserves: allPlayers.slice(11),
  }
}
