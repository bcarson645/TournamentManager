import { IPL_PLAYERS } from './iplPlayers'

export type BowlAction = 'SEAM' | 'SPIN'

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

const KNOWN_PLAYERS: Record<string, string[]> = {
  ...IPL_PLAYERS,
}

function makePlayer(teamId: string, index: number, name: string): SquadPlayer {
  return {
    id: `${teamId}-p${index + 1}`,
    playerId: String(11000000 + index + 1).padStart(8, '0'),
    name,
    btCaz: 0,
    raw: 0,
    sr: 0,
    fours: 0,
    sixes: 0,
    batRating: 0,
    action: 'SEAM' as BowlAction,
    wkts: 0,
    overs: 0,
    econ: 0,
    bowlSr: 0,
    bowlAvg: 0,
    bowlRating: 0,
    locked: false,
  }
}

export function makePlaceholderSquad(teamId: string, count: number, offset = 0): SquadPlayer[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1 + offset
    return makePlayer(teamId, num - 1, `Player ${num}`)
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
    allPlayers.push(makePlayer(teamId, i, name))
  }

  return {
    startingXI: allPlayers.slice(0, 11),
    reserves: allPlayers.slice(11),
  }
}
