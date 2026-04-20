/**
 * Batting rating from `computeBattingExpectedRunsContribution` (see `battingExpectedRunsFormula.ts`).
 * Bowling rating from `computeBowlingRatingRaw` (see `bowlingRatingFormula.ts`).
 * The squad **Raw** column is display-only for batting rating. The diagram’s **raw runs ratio** is `getRawRunsRatioMultiplier` in `battingBaseRunsRatio.ts`.
 */

import type { CricketFormat, Gender } from './tournaments'
import { computeBowlingRatingRaw } from './bowlingRatingFormula'
import { computeBattingExpectedRunsContribution } from './battingExpectedRunsFormula'

/** Stored rating precision (display can show fewer dp via squad settings). */
export const RATING_STORED_DECIMAL_PLACES = 2

/** Round any rating-like value to the same precision stored on players (for totals, etc.). */
export function roundRatingToStoredDecimals(v: number): number {
  const p = 10 ** RATING_STORED_DECIMAL_PLACES
  return Math.round(v * p) / p
}

export function calculateBatRating(
  btCaz: number,
  _raw: number,
  sr: number,
  position: number,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): number {
  const v = computeBattingExpectedRunsContribution({
    format,
    gender,
    position,
    btCaz,
    sr,
  })
  if (!Number.isFinite(v)) return 0
  return roundRatingToStoredDecimals(v)
}

/** Bowling SR is wickets per over (`bowlWpo`). No rating until overs, econ & SR are all set. */
export function calculateBowlRating(
  econ: number,
  bowlWpo: number,
  _bowlAvg: number,
  overs: number,
  format: CricketFormat = 't20',
  gender: Gender = 'men',
): number {
  if (!(overs > 0 && econ > 0 && bowlWpo > 0)) return Number.NaN
  const v = computeBowlingRatingRaw({
    format,
    gender,
    overs,
    econ,
    bowlWpo,
  })
  if (!Number.isFinite(v)) return Number.NaN
  return roundRatingToStoredDecimals(v)
}
