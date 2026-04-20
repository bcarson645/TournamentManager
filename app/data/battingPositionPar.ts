/**
 * Position par benchmarks for batting (lookup by **batting order** 1–11).
 * SR.CAZ values are runs per ball (same units as squad `sr`).
 *
 * **Par BT CAZ** matches the reference “bt.caz” column for that slot.
 * **Par SR** is calibrated for T20 men’s W + raw-runs ratio, using the **Excel** grouping:
 * `W * (ratio vs par) + SR adjustment` (W does not multiply the SR adjustment).
 *
 * Extend with per-format tables later — `getBattingPositionParRow` accepts `format`.
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
  /** Legacy display / sorting hint (not used in the rating formula). */
  parRating: number
}

/**
 * Default par rows — **par BT** from reference sheet; **par SR** calibrated (Excel-aligned formula).
 */
export const BATTING_POSITION_PAR_ROWS: readonly BattingPositionParRow[] = [
  { bat: 1, bowl: 11, parBtCaz: 24, parSrCaz: 1.4276, parRating: 24 },
  { bat: 2, bowl: 10, parBtCaz: 24, parSrCaz: 1.4663, parRating: 24 },
  { bat: 3, bowl: 9, parBtCaz: 28, parSrCaz: 1.2597, parRating: 28 },
  { bat: 4, bowl: 8, parBtCaz: 26, parSrCaz: 1.2309, parRating: 26 },
  { bat: 5, bowl: 7, parBtCaz: 26, parSrCaz: 1.2425, parRating: 26 },
  { bat: 6, bowl: 6, parBtCaz: 25, parSrCaz: 1.1205, parRating: 25 },
  { bat: 7, bowl: 5, parBtCaz: 21, parSrCaz: 1.2129, parRating: 21 },
  { bat: 8, bowl: 4, parBtCaz: 12, parSrCaz: 0.4, parRating: 12 },
  { bat: 9, bowl: 3, parBtCaz: 12, parSrCaz: 0.4, parRating: 12 },
  { bat: 10, bowl: 2, parBtCaz: 12, parSrCaz: 0.4, parRating: 12 },
  { bat: 11, bowl: 1, parBtCaz: 7, parSrCaz: 0.4, parRating: 7 },
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
