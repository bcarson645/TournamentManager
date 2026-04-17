/**
 * Expected batting contribution formula (matches your diagram).
 *
 * Table columns used:
 * - **BT CAZ** → `btCaz` (player)
 * - **SR.CAZ** → `sr` (runs **per ball**, not per 100)
 * - **Position** → row order in the XI: positions **1–11** for starting XI (use `index + 1` in `SquadTable`);
 *   reserves are not position 1–11 for this par table unless you define otherwise later.
 *
 * Static values you will supply (by match format + batting position):
 * - **Format value of wicket** — multiplier `W` (from format table)
 * - **Par BT CAZ** / **Par SR** — benchmarks from a “position par” table (same SR units as the player: per ball)
 * - **Base runs ratio** — multiplier at the end, by format + position
 *
 * Formula (as implemented; adjust if your static tables use different column meanings):
 *
 *   Let playerRatio = (BtCaz / SR)
 *   Let parRatio    = (ParBtCaz / ParSR)
 *   Let bracket     = playerRatio / parRatio   when parRatio ≠ 0
 *
 *   inner = W × bracket − 1  +  playerRatio × (SR − ParSR)
 *
 *   result = inner × BaseRunsRatio
 *
 * Position par (BT CAZ / SR per ball) comes from `battingPositionPar.ts`.
 * Raw runs ratio (base multiplier) comes from `battingBaseRunsRatio.ts`.
 */

import type { CricketFormat } from './tournaments'
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
  /** Batting order 1–11 (starting XI row). */
  position: number
  /** BT CAZ from squad row. */
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

/** “Format value of wicket” — multiplier by match format (`formatWicketValue.ts`). */
export function getFormatWicketValue(format: CricketFormat): number {
  return getFormatWicketValueFromTable(format)
}

/** Base runs ratio (raw runs multiplier) by batting position 1–11. */
export function getBaseRunsRatio(format: CricketFormat, position: number): number {
  return getRawRunsRatioMultiplier(position, format)
}

export function computeBattingExpectedRunsContribution(
  input: BattingExpectedRunsInputs,
): number {
  const W = getFormatWicketValue(input.format)
  const base = getBaseRunsRatio(input.format, input.position)
  const { parBatCaz, parSr } = getPositionParBatting(input.format, input.position)

  const { btCaz, sr } = input
  const playerRatio = sr !== 0 ? btCaz / sr : 0
  const parRatio = parSr !== 0 ? parBatCaz / parSr : 0
  const bracket = parRatio !== 0 ? playerRatio / parRatio : 0

  const inner = W * bracket - 1 + playerRatio * (sr - parSr)
  return inner * base
}
