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

function bowlingFromSeed(
  seed: SquadStatSeed,
  format: CricketFormat,
  gender: Gender,
): Pick<SquadPlayer, 'overs' | 'econ' | 'bowlWpo' | 'wkts' | 'bowlAvg' | 'bowlRating'> {
  const { wkts, bowlAvg } = calcWktsAndBowlAvg(seed.overs, seed.econ, seed.bowlWpo)
  return {
    overs: seed.overs,
    econ: seed.econ,
    bowlWpo: seed.bowlWpo,
    wkts,
    bowlAvg,
    bowlRating: calculateBowlRating(seed.econ, seed.bowlWpo, bowlAvg, seed.overs, format, gender),
  }
}

/** Refresh bowling SR (wkts/over), economy, spell overs, and bowl rating from dataset aggregates. */
export function mergeDbBowlingIntoSquadPlayer(
  player: SquadPlayer,
  seed: SquadStatSeed,
  format: CricketFormat,
  gender: Gender,
): SquadPlayer {
  return { ...player, ...bowlingFromSeed(seed, format, gender) }
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
  const bowling = bowlingFromSeed(seed, format, gender)

  return {
    ...player,
    playerId: seed.datasetPlayerId,
    btCaz: seed.btCaz,
    rawBase: seed.rawBase,
    raw,
    sr: seed.sr,
    fours: seed.fours,
    sixes: seed.sixes,
    ...bowling,
    batRating: calculateBatRating(seed.btCaz, raw, seed.sr, ratingParPosition, format, gender),
  }
}

export function squadPlayerBowlingDiffers(a: SquadPlayer, b: SquadPlayer): boolean {
  return (
    a.overs !== b.overs ||
    a.econ !== b.econ ||
    a.bowlWpo !== b.bowlWpo ||
    a.wkts !== b.wkts ||
    a.bowlAvg !== b.bowlAvg
  )
}

export function squadPlayerDatasetStatsDiffers(a: SquadPlayer, b: SquadPlayer): boolean {
  return (
    squadPlayerBowlingDiffers(a, b) ||
    a.playerId !== b.playerId ||
    a.btCaz !== b.btCaz ||
    a.rawBase !== b.rawBase ||
    a.raw !== b.raw ||
    a.sr !== b.sr ||
    a.fours !== b.fours ||
    a.sixes !== b.sixes
  )
}
