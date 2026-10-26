/**
 * **Raw runs ratio** (`CD` in Prep Work) by batting position 1–11.
 * Used for Prep **Raw** (`prepRawFormula`) and as the final multiplier in bat rating.
 */

import type { CricketFormat } from './tournaments'

/** Default / T20-style table (legacy). */
export const BATTING_RAW_RUNS_RATIO_BY_POSITION: readonly number[] = [
  0.95, 0.95, 0.91, 0.83, 0.72, 0.6, 0.46, 0.32, 0.21, 0.12, 0.05,
] as const

/** ODI Prep Work `CG76` column — matches NZ v SA sheet rows 24–34. */
export const BATTING_RAW_RUNS_RATIO_ODI: readonly number[] = [
  0.95, 0.95, 0.91, 0.83, 0.715, 0.595, 0.46, 0.32, 0.205, 0.115, 0.05,
] as const

const BY_FORMAT: Partial<Record<CricketFormat, readonly number[]>> = {
  lista: BATTING_RAW_RUNS_RATIO_ODI,
  t20: BATTING_RAW_RUNS_RATIO_BY_POSITION,
  t10: BATTING_RAW_RUNS_RATIO_BY_POSITION,
  firstclass: BATTING_RAW_RUNS_RATIO_BY_POSITION,
}

export function getRawRunsRatioTable(format: CricketFormat = 't20'): readonly number[] {
  return BY_FORMAT[format] ?? BATTING_RAW_RUNS_RATIO_BY_POSITION
}

export function getRawRunsRatioMultiplier(
  battingPosition: number,
  format: CricketFormat = 't20',
): number {
  const p = Math.max(1, Math.min(11, Math.round(battingPosition)))
  const table = getRawRunsRatioTable(format)
  return table[p - 1] ?? 0
}
