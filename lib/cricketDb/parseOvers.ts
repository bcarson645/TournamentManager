/** Parse cricket overs text (e.g. "3.4" = 3 overs + 4 balls) to total balls bowled. */
export function oversTextToBalls(text: string | null | undefined): number {
  if (!text || !String(text).trim()) return 0
  const s = String(text).trim()
  const dot = s.indexOf('.')
  if (dot >= 0) {
    const whole = parseInt(s.slice(0, dot), 10) || 0
    const partial = parseInt(s.slice(dot + 1), 10) || 0
    return whole * 6 + partial
  }
  const whole = parseFloat(s)
  if (!Number.isFinite(whole)) return 0
  const full = Math.floor(whole)
  const partial = Math.round((whole - full) * 10)
  return full * 6 + partial
}

export function ballsToOversDecimal(balls: number): number {
  if (balls <= 0) return 0
  const whole = Math.floor(balls / 6)
  const partial = balls % 6
  return Math.round((whole + partial / 10) * 10) / 10
}

export function enrichAggregateBowlingEconomy(
  rows: { bowl_runs: number | null; bowl_overs: string | null }[],
): { economy: number | null; totalOvers: number } {
  let bowlRuns = 0
  let totalBalls = 0
  for (const r of rows) {
    if ((r.bowl_runs ?? 0) > 0 || r.bowl_overs) {
      bowlRuns += r.bowl_runs ?? 0
      totalBalls += oversTextToBalls(r.bowl_overs)
    }
  }
  if (totalBalls <= 0) return { economy: null, totalOvers: 0 }
  const overs = totalBalls / 6
  return {
    economy: Math.round((bowlRuns / overs) * 100) / 100,
    totalOvers: ballsToOversDecimal(totalBalls),
  }
}
