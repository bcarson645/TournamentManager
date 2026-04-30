const STORAGE_KEY = 'tm-tournament-opts'

export interface TournamentOptions {
  impactSubEnabled: boolean
}

const defaultOptions: TournamentOptions = { impactSubEnabled: false }

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
  }
}

export function setTournamentImpactSubEnabled(tournamentId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  all[tournamentId] = { ...all[tournamentId], impactSubEnabled: enabled }
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
