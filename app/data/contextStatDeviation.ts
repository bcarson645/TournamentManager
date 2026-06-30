/** Column index for the All baseline in context stats rows. */
export const CONTEXT_STAT_ALL_COL = 3

const LIGHT_DEVIATION_PCT = 6
const DARK_DEVIATION_PCT = 12

function parseStatCell(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number.parseFloat(raw.replace('%', '').trim())
  return Number.isFinite(n) ? n : null
}

function isPercentRow(rowLabel: string, values: (string | null)[]): boolean {
  if (/Prop|Fifty|Hundred/i.test(rowLabel)) return true
  const all = values[CONTEXT_STAT_ALL_COL]
  return all?.includes('%') ?? false
}

/** Deviation magnitude as a percentage; uses pp when baseline is near zero on % rows. */
function deviationMagnitude(cell: number, baseline: number, isPercentRow: boolean): number {
  const diff = cell - baseline
  if (isPercentRow && Math.abs(baseline) < 1) {
    return Math.abs(diff)
  }
  if (Math.abs(baseline) < 1e-9) return 0
  return Math.abs(diff / baseline) * 100
}

export type ContextStatDeviationTone = 'high-light' | 'high-dark' | 'low-light' | 'low-dark' | null

export interface ContextStatCellHighlight {
  tone: ContextStatDeviationTone
  title?: string
}

/** Highlight Venue / Host / Cmptn / rolling cells that deviate from All. */
export function contextStatCellHighlight(
  rowLabel: string,
  colIndex: number,
  value: string | null,
  values: (string | null)[],
): ContextStatCellHighlight {
  if (rowLabel === 'Samples' || colIndex === CONTEXT_STAT_ALL_COL) {
    return { tone: null }
  }
  if (value == null || value === '') return { tone: null }

  const baseline = parseStatCell(values[CONTEXT_STAT_ALL_COL])
  const cell = parseStatCell(value)
  if (baseline == null || cell == null) return { tone: null }

  const percent = isPercentRow(rowLabel, values)
  const diff = cell - baseline
  const magnitude = deviationMagnitude(cell, baseline, percent)

  if (magnitude < LIGHT_DEVIATION_PCT) return { tone: null }

  const usePpTitle = percent && Math.abs(baseline) < 1
  const title = usePpTitle
    ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pp vs All`
    : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} vs All (${magnitude.toFixed(1)}%)`

  const strong = magnitude >= DARK_DEVIATION_PCT
  if (diff > 0) {
    return { tone: strong ? 'high-dark' : 'high-light', title }
  }
  return { tone: strong ? 'low-dark' : 'low-light', title }
}
