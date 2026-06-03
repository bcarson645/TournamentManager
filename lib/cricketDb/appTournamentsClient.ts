import { TOURNAMENTS, type CricketFormat, type Gender } from '../../app/data/tournaments'
import { TEAMS } from '../../app/data/teams'

export interface AppTournamentOption {
  id: string
  name: string
  format: CricketFormat
  gender: Gender
  source?: 'builtin' | 'custom'
}

export interface AppTeamOption {
  id: string
  name: string
  tournamentId: string
}

/** Built-in T20 tournaments only (safe on client). */
export function listBuiltinT20Tournaments(): AppTournamentOption[] {
  const out: AppTournamentOption[] = []
  for (const gender of ['men', 'women'] as const) {
    for (const t of TOURNAMENTS.t20[gender]) {
      out.push({ id: t.id, name: t.name, format: 't20', gender, source: 'builtin' })
    }
  }
  return out
}

export function listBuiltinTeamsForTournament(tournamentId: string | null): AppTeamOption[] {
  if (!tournamentId) return []
  return (TEAMS[tournamentId] ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    tournamentId,
  }))
}

export function getBuiltinTournamentLabel(tournamentId: string): string {
  for (const gender of ['men', 'women'] as const) {
    const hit = TOURNAMENTS.t20[gender].find((t) => t.id === tournamentId)
    if (hit) return hit.name
  }
  return tournamentId
}
