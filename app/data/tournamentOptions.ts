const STORAGE_KEY = 'tm-tournament-opts'

/** Default par score for team rating formulas (T20-style; configurable per tournament). */
export const DEFAULT_RATING_PAR_SCORE = 165

export interface TournamentOptions {
  impactSubEnabled: boolean
  /** Par score used in team batting/bowling totals: bat = (ΣXI bat + par)/par, bowl = (par − ΣXI bowl)/par */
  ratingParScore: number
}

function normalizeRatingParScore(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  if (!Number.isFinite(n) || n < 1) return DEFAULT_RATING_PAR_SCORE
  return Math.min(999, Math.round(n * 100) / 100)
}

function readAll(): Record<string, Partial<TournamentOptions>> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<TournamentOptions>>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getTournamentOptions(tournamentId: string): TournamentOptions {
  const all = readAll()
  const row = all[tournamentId]
  return {
    impactSubEnabled: row?.impactSubEnabled === true,
    ratingParScore: normalizeRatingParScore(row?.ratingParScore),
  }
}

export function setTournamentImpactSubEnabled(tournamentId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  all[tournamentId] = { ...all[tournamentId], impactSubEnabled: enabled }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('tournament-opts-changed', { detail: { tournamentId } }))
}

export function setTournamentRatingParScore(tournamentId: string, parScore: number): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  all[tournamentId] = {
    ...all[tournamentId],
    ratingParScore: normalizeRatingParScore(parScore),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('tournament-opts-changed', { detail: { tournamentId } }))
}

/** Remove persisted options so this tournament uses defaults (e.g. after “reset”). */
export function resetTournamentOptionsToDefaults(tournamentId: string): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  delete all[tournamentId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('tournament-opts-changed', { detail: { tournamentId } }))
}
