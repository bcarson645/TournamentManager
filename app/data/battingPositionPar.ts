/**
 * Position par benchmarks for batting (lookup by **batting position** 1–11).
 * SR.CAZ values are runs per ball (same units as squad `sr`).
 *
 * Extend with per-format tables later (e.g. T20 vs Test) — see `getBattingPositionParRow`.
 */

import type { CricketFormat } from './tournaments'

export interface BattingPositionParRow {
  /** Batting order 1–11 */
  bat: number
  /** Inverse slot (11 → 1) — useful for bowling / balance context */
  bowl: number
  parBtCaz: number
  /** Par SR.CAZ — runs per ball */
  parSrCaz: number
  parRating: number
}

/**
 * Default par row used for all formats until format-specific sheets are added.
 */
export const BATTING_POSITION_PAR_ROWS: readonly BattingPositionParRow[] = [
  { bat: 1, bowl: 11, parBtCaz: 28, parSrCaz: 1.33, parRating: 29 },
  { bat: 2, bowl: 10, parBtCaz: 28, parSrCaz: 1.33, parRating: 29 },
  { bat: 3, bowl: 9, parBtCaz: 27, parSrCaz: 1.29, parRating: 27 },
  { bat: 4, bowl: 8, parBtCaz: 27, parSrCaz: 1.29, parRating: 27 },
  { bat: 5, bowl: 7, parBtCaz: 25, parSrCaz: 1.29, parRating: 25 },
  { bat: 6, bowl: 6, parBtCaz: 22, parSrCaz: 1.3, parRating: 22 },
  { bat: 7, bowl: 5, parBtCaz: 19, parSrCaz: 1.3, parRating: 19 },
  { bat: 8, bowl: 4, parBtCaz: 16, parSrCaz: 1.25, parRating: 15 },
  { bat: 9, bowl: 3, parBtCaz: 13, parSrCaz: 1.12, parRating: 11 },
  { bat: 10, bowl: 2, parBtCaz: 11, parSrCaz: 0.95, parRating: 8 },
  { bat: 11, bowl: 1, parBtCaz: 9, parSrCaz: 0.8, parRating: 6 },
] as const

const BY_BAT = new Map<number, BattingPositionParRow>(
  BATTING_POSITION_PAR_ROWS.map((r) => [r.bat, r]),
)

/**
 * Par row for a batting position (1–11). Out-of-range positions clamp to nearest edge.
 */
export function getBattingPositionParRow(
  battingPosition: number,
  _format?: CricketFormat,
): BattingPositionParRow | undefined {
  const p = Math.max(1, Math.min(11, Math.round(battingPosition)))
  return BY_BAT.get(p)
}

/** Par BT CAZ and par SR (per ball) for formula use (`battingExpectedRunsFormula`). */
export function getParBtCazAndSr(
  battingPosition: number,
  format?: CricketFormat,
): { parBatCaz: number; parSr: number } {
  const row = getBattingPositionParRow(battingPosition, format)
  if (!row) return { parBatCaz: 0, parSr: 0 }
  return { parBatCaz: row.parBtCaz, parSr: row.parSrCaz }
}
