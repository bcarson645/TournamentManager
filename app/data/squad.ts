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

export function makePlaceholderSquad(teamId: string, count: number, offset = 0): SquadPlayer[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1 + offset
    return {
      id: `${teamId}-p${num}`,
      playerId: String(11000000 + num).padStart(8, '0'),
      name: `Player ${num}`,
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
  })
}
