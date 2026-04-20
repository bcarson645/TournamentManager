/**
 * Bowling par rows by format (reference sheet): **Econ** (rpo), **SR** as **wickets per over**,
 * **Format value** (wicket multiplier W in batting & bowling formulas).
 *
 * Squad bowling SR is **wickets per over** (`bowlWpo`), same scale as the par SR column.
 */

import type { CricketFormat, Gender } from './tournaments'

export interface BowlingParRow {
  parEcon: number
  /** Par bowling SR — wickets per over (reference column “SR”). */
  parSrWicketsPerOver: number
  /** Format value of wicket — same W used in batting formula. */
  wicketValue: number
}

/** Men’s reference rows (maps `CricketFormat` to sheet categories). */
const BOWLING_PAR_MEN: Record<CricketFormat, BowlingParRow> = {
  t20: { parEcon: 8.1, parSrWicketsPerOver: 0.305, wicketValue: 10.3 },
  lista: { parEcon: 5.3, parSrWicketsPerOver: 0.155, wicketValue: 18 },
  /** Sheet “First Class” (Test row differs: 3.22 / 0.095 / 34 — use FC if you split formats). */
  firstclass: { parEcon: 3.2, parSrWicketsPerOver: 0.105, wicketValue: 27 },
  /** “T10 Major” row. */
  t10: { parEcon: 10.9, parSrWicketsPerOver: 0.45, wicketValue: 7 },
  /** “S6” row. */
  srl: { parEcon: 19, parSrWicketsPerOver: 0.45, wicketValue: 8 },
  other: { parEcon: 8.1, parSrWicketsPerOver: 0.305, wicketValue: 10.3 },
}

/** Women’s — only T20 & ODI (List A) provided; other formats fall back to men’s. */
const BOWLING_PAR_WOMEN: Partial<Record<CricketFormat, BowlingParRow>> = {
  t20: { parEcon: 6.6, parSrWicketsPerOver: 0.28, wicketValue: 12.5 },
  lista: { parEcon: 4.35, parSrWicketsPerOver: 0.15, wicketValue: 18 },
}

export function getBowlingParRow(format: CricketFormat, gender: Gender): BowlingParRow {
  if (gender === 'women') {
    const w = BOWLING_PAR_WOMEN[format]
    if (w) return w
  }
  return BOWLING_PAR_MEN[format] ?? BOWLING_PAR_MEN.t20
}

export function getParEcon(format: CricketFormat, gender: Gender = 'men'): number {
  return getBowlingParRow(format, gender).parEcon
}

/** Par SR in **wickets per over** (reference sheet). */
export function getParBowlingSrWicketsPerOver(format: CricketFormat, gender: Gender = 'men'): number {
  return getBowlingParRow(format, gender).parSrWicketsPerOver
}
