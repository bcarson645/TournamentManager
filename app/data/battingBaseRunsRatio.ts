/**
 * **Raw runs ratio** (diagram) — static multiplier by batting position 1–11.
 * Not the squad grid’s **Raw** column; that column does not feed the rating formula.
 *
 * Applied as the final factor in `computeBattingExpectedRunsContribution`.
 * Extend with per-format tables later — `format` is reserved on the getter.
 */

import type { CricketFormat } from './tournaments'

/** Index i = batting position i + 1 (position 1 → index 0). */
export const BATTING_RAW_RUNS_RATIO_BY_POSITION: readonly number[] = [
  0.95, 0.95, 0.91, 0.83, 0.72, 0.6, 0.46, 0.32, 0.21, 0.12, 0.05,
] as const

export function getRawRunsRatioMultiplier(
  battingPosition: number,
  _format?: CricketFormat,
): number {
  const p = Math.max(1, Math.min(11, Math.round(battingPosition)))
  return BATTING_RAW_RUNS_RATIO_BY_POSITION[p - 1] ?? 0
}
