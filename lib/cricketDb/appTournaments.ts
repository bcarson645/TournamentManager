import { listCustomTournaments, listCustomTeams } from './customTournaments'
import {
  listBuiltinT20Tournaments,
  listBuiltinTeamsForTournament,
  getBuiltinTournamentLabel,
  type AppTournamentOption,
  type AppTeamOption,
} from './appTournamentsClient'

export type { AppTournamentOption, AppTeamOption }

/** Server-side: built-in + custom SQLite tournaments. */
export function listAppT20Tournaments(): AppTournamentOption[] {
  const custom = listCustomTournaments().map((t) => ({
    id: t.id,
    name: t.name,
    format: 't20' as const,
    gender: t.gender,
    source: 'custom' as const,
  }))
  return [...listBuiltinT20Tournaments(), ...custom]
}

export function listAppTeamsForTournament(tournamentId: string | null): AppTeamOption[] {
  if (!tournamentId) return []
  const custom = listCustomTeams(tournamentId).map((t) => ({
    id: t.id,
    name: t.name,
    tournamentId,
  }))
  return [...listBuiltinTeamsForTournament(tournamentId), ...custom]
}

export function getAppTournamentLabel(tournamentId: string): string {
  const custom = listCustomTournaments().find((t) => t.id === tournamentId)
  if (custom) return custom.name
  return getBuiltinTournamentLabel(tournamentId)
}
