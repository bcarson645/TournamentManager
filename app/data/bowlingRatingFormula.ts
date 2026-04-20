/**
 * Bowling rating — matches Excel:
 * `=V45*(($W$63-W45)+$Y$63*(X45-$X$63))`
 *
 *   V45 → overs
 *   W45 → econ (rpo)     |  $W$63 → parEcon
 *   X45 → bowlWpo (wkts/over) |  $X$63 → par SR wkts/over
 *   $Y$63 → W (format wicket value)
 *
 *   overs × ( (parEcon − econ) + W × (bowlWpo − parSrWktsPerOver) )
 *
 * Par row: `bowlingParValues.ts`.
 */

import type { CricketFormat, Gender } from './tournaments'
import { getBowlingParRow } from './bowlingParValues'

export interface BowlingRatingInputs {
  format: CricketFormat
  gender?: Gender
  overs: number
  econ: number
  /** Wickets per over — squad `bowlWpo`. */
  bowlWpo: number
}

/** Legacy: balls/wicket → wickets/over (same as par SR scale). */
export function bowlBallsPerWicketToWicketsPerOver(ballsPerWicket: number): number {
  if (!(ballsPerWicket > 0) || !Number.isFinite(ballsPerWicket)) return 0
  return 6 / ballsPerWicket
}

/** Wickets/over → balls/wicket (for legacy profile data). */
export function bowlWicketsPerOverToBallsPerWicket(wpo: number): number {
  if (!(wpo > 0) || !Number.isFinite(wpo)) return 0
  return 6 / wpo
}

export function computeBowlingRatingRaw(input: BowlingRatingInputs): number {
  const { overs, econ, bowlWpo } = input
  const gender = input.gender ?? 'men'
  const row = getBowlingParRow(input.format, gender)
  const W = row.wicketValue
  const inner =
    (row.parEcon - econ) + W * (bowlWpo - row.parSrWicketsPerOver)
  return overs * inner
}
