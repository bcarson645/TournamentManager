/**
 * Expected batting contribution — aligned with the Excel batting formula.
 *
 * **Variables (Excel → code)**
 * - `L45` → `btCaz` (BT CAZ)
 * - `N45` → `sr` (SR.CAZ, runs per ball)
 * - `I45` → batting **position** (1–11) for VLOOKUP into par table
 * - `AL66` → `W` — format wicket value (`getFormatWicketValue`)
 * - `VLOOKUP(..., 4)` → `parBatCaz` — par BT CAZ for position
 * - `VLOOKUP(..., 6)` → `parSr` — par SR for position
 * - `CD45` → **raw runs ratio** — `getRawRunsRatioMultiplier` (not the squad Raw column)
 *
 * **Non–First Class / non-Test** (T20, List A, T10, etc.):
 *
 *   playerRatio = btCaz / sr
 *   parRatio    = parBatCaz / parSr
 *
 *   contribution = ( W × ( playerRatio / parRatio − 1 ) + playerRatio × ( sr − parSr ) ) × RawRunsRatio
 *
 * **W** only multiplies the **ratio-vs-par** term, not the SR-difference term (matches Excel).
 *
 * **Test / First Class** (`format === 'firstclass'` — Excel `n_format_a="test"`):
 *
 *   contribution = ( btCaz − parBatCaz ) × RawRunsRatio
 *
 * Optional Excel guard `IF(AND(ImpactActive=1,I45=12),0,...)` is not modelled here.
 */

import type { CricketFormat, Gender } from './tournaments'
import { getRawRunsRatioMultiplier } from './battingBaseRunsRatio'
import { getParBtCazAndSr } from './battingPositionPar'
import { getFormatWicketValue as getFormatWicketValueFromTable } from './formatWicketValue'

/**
 * Starting XI row → batting order 1–11 for par tables.
 * Reserves → use position **11** par (tail) until product defines otherwise.
 */
export function battingPositionForParTable(section: 'starting' | 'reserves', rowIndex: number): number {
  if (section === 'starting') {
    return Math.max(1, Math.min(11, rowIndex + 1))
  }
  return 11
}

export interface BattingExpectedRunsInputs {
  format: CricketFormat
  /** Drives par econ / W from same tables as bowling (`bowlingParValues.ts`). */
  gender?: Gender
  /** Batting order 1–11 (starting XI row). */
  position: number
  /** BT CAZ from squad row — player batting average in the diagram. */
  btCaz: number
  /** SR.CAZ — runs per ball. */
  sr: number
}

/** @returns Par BT CAZ and Par SR (per ball) for this format + batting position (1–11). */
export function getPositionParBatting(
  format: CricketFormat,
  position: number,
): { parBatCaz: number; parSr: number } {
  return getParBtCazAndSr(position, format)
}

/** “Format value of wicket” — same column as bowling par (`formatWicketValue.ts` / `bowlingParValues.ts`). */
export function getFormatWicketValue(format: CricketFormat, gender: Gender = 'men'): number {
  return getFormatWicketValueFromTable(format, gender)
}

/** Raw runs ratio (diagram’s final multiplier) — static table by position 1–11. */
export function getBaseRunsRatio(format: CricketFormat, position: number): number {
  return getRawRunsRatioMultiplier(position, format)
}

export function computeBattingExpectedRunsContribution(
  input: BattingExpectedRunsInputs,
): number {
  const W = getFormatWicketValue(input.format, input.gender ?? 'men')
  const base = getBaseRunsRatio(input.format, input.position)
  const { parBatCaz, parSr } = getPositionParBatting(input.format, input.position)

  const { btCaz, sr } = input

  /** Excel: `(L45 - VLOOKUP(...,4)) * CD45` when format is Test */
  if (input.format === 'firstclass') {
    return (btCaz - parBatCaz) * base
  }

  const playerRatio = sr !== 0 ? btCaz / sr : 0
  const parRatio = parSr !== 0 ? parBatCaz / parSr : 0
  const ratioVsPar = parRatio !== 0 ? playerRatio / parRatio - 1 : 0
  const srAdjust = playerRatio * (sr - parSr)
  /** Excel: `AL66 * (ratio term) + (L45/N45)*(N45-ParSr)` — W does not multiply srAdjust */
  const inner = W * ratioVsPar + srAdjust
  return inner * base
}
