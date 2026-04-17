/**
 * “Format value of wicket” (W) in the batting inner term: W × bracket − 1 + …
 * Replace values when your format table is available. Using **1** applies the bracket term;
 * **0** removes it (equivalent to the previous stub).
 */

import type { CricketFormat } from './tournaments'

export const FORMAT_WICKET_VALUE: Record<CricketFormat, number> = {
  t20: 1,
  lista: 1,
  firstclass: 1,
  t10: 1,
  srl: 1,
  other: 1,
}

export function getFormatWicketValue(format: CricketFormat): number {
  const w = FORMAT_WICKET_VALUE[format]
  return typeof w === 'number' && Number.isFinite(w) ? w : 1
}
