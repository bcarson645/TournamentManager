/**
 * Batting rating from `computeBattingExpectedRunsContribution` (see `battingExpectedRunsFormula.ts`).
 * `raw` is retained for squad editing / display — it is not part of that formula.
 */

import type { CricketFormat } from './tournaments'
import { computeBattingExpectedRunsContribution } from './battingExpectedRunsFormula'

export function calculateBatRating(
  btCaz: number,
  _raw: number,
  sr: number,
  position: number,
  format: CricketFormat = 't20',
): number {
  const v = computeBattingExpectedRunsContribution({
    format,
    position,
    btCaz,
    sr,
  })
  if (!Number.isFinite(v)) return 0
  return Math.round(v * 10) / 10
}

export function calculateBowlRating(
  _econ: number,
  _bowlSr: number,
  _bowlAvg: number,
  _overs: number,
): number {
  return 0
}
