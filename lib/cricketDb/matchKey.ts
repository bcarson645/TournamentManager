/** Fields used to dedupe one player appearance in a match (same logic as T20 breakdown tables). */
export interface PerformanceMatchKeyFields {
  source_id?: string | null
  match_date?: string | null
  competition_id?: string | null
  team_id?: string | null
}

export function performanceMatchKey(r: PerformanceMatchKeyFields): string {
  return [r.source_id, r.match_date, r.competition_id, r.team_id].filter(Boolean).join('|')
}

export function countUniquePerformanceMatches(rows: PerformanceMatchKeyFields[]): number {
  const keys = new Set<string>()
  for (const r of rows) {
    const k = performanceMatchKey(r)
    if (k) keys.add(k)
  }
  return keys.size
}
