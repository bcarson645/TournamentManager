/**
 * Format value of wicket (W) — **same column** as bowling par tables (`bowlingParValues.ts`).
 */

import { getBowlingParRow } from './bowlingParValues'
import type { CricketFormat, Gender } from './tournaments'

export function getFormatWicketValue(format: CricketFormat, gender: Gender = 'men'): number {
  return getBowlingParRow(format, gender).wicketValue
}
