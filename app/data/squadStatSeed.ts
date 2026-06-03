import type { CricketFormat, Gender } from './tournaments'
import { calculateBatRating, calculateBowlRating } from './ratingBenchmarks'
import {
  SquadPlayer,
  calcWktsAndBowlAvg,
  ratingParPosForBatCalc,
} from './squad'

/** Stats derived from imported T20 dataset (via API). */
export interface SquadStatSeed {
  datasetPlayerId: string
  datasetDisplayName: string
  appearances: number
  btCaz: number
  rawBase: number
  raw: number
  sr: number
  fours: number
  sixes: number
  wkts: number
  overs: number
  econ: number
  bowlWpo: number
  bowlAvg: number
}

export function mergeDbStatsIntoSquadPlayer(
  player: SquadPlayer,
  seed: SquadStatSeed,
  format: CricketFormat,
  gender: Gender,
  section: 'starting' | 'reserves' | 'impact',
  index: number,
): SquadPlayer {
  const rawAdj = player.rawAdj ?? 0
  const raw = Math.round((seed.rawBase + rawAdj) * 10) / 10
  const ratingParPosition = ratingParPosForBatCalc(section, index, player)
  const { wkts, bowlAvg } = calcWktsAndBowlAvg(seed.overs, seed.econ, seed.bowlWpo)

  return {
    ...player,
    playerId: seed.datasetPlayerId,
    btCaz: seed.btCaz,
    rawBase: seed.rawBase,
    raw,
    sr: seed.sr,
    fours: seed.fours,
    sixes: seed.sixes,
    overs: seed.overs,
    econ: seed.econ,
    bowlWpo: seed.bowlWpo,
    wkts,
    bowlAvg,
    batRating: calculateBatRating(seed.btCaz, raw, seed.sr, ratingParPosition, format, gender),
    bowlRating: calculateBowlRating(seed.econ, seed.bowlWpo, bowlAvg, seed.overs, format, gender),
  }
}
