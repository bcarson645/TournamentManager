import { TOURNAMENTS } from '../../app/data/tournaments'
import { TEAMS } from '../../app/data/teams'
import { getCricketDb } from './client'
import { stringSimilarity } from './nameMatch'
import { setCompetitionTournament } from './queries'

/** Built-in manager tournaments → direct name tokens for competition matching. */
const BUILTIN_TOURNAMENT_IDS = TOURNAMENTS.t20.men.map((t) => ({
  id: t.id,
  name: t.name,
  tokens: [t.name.toLowerCase(), ...(t.country ? [t.country.toLowerCase()] : [])],
}))

const EXTRA_ALIASES: Record<string, string[]> = {
  't20-m-ipl': ['ipl', 'indian premier'],
  't20-m-blast': ['blast', 'vitality', 't20 blast'],
  't20-m-bbl': ['bbl', 'big bash'],
  't20-m-hundred': ['hundred', 'the hundred'],
  't20-m-cpl': ['cpl', 'caribbean premier'],
  't20-m-sa': ['sa20', 'sa 20'],
  't20-m-intl': ['international', 't20i'],
}

export interface TournamentMapResult {
  mapped: number
  unmapped: string[]
}

function teamsForTournament(tournamentId: string): string[] {
  return (TEAMS[tournamentId] ?? []).map((t) => t.name)
}

function topTeamNamesForCompetition(competitionId: string, limit = 14): string[] {
  const db = getCricketDb()
  return (
    db
      .prepare(
        `SELECT team_name AS name FROM performances
         WHERE competition_id = ? AND team_name IS NOT NULL AND team_name != ''
         GROUP BY team_name ORDER BY COUNT(*) DESC LIMIT ?`,
      )
      .all(competitionId, limit) as { name: string }[]
  ).map((r) => r.name)
}

function scoreCompetitionToTournament(
  competitionId: string,
  tournamentId: string,
  teamNames: string[],
): number {
  const meta = BUILTIN_TOURNAMENT_IDS.find((t) => t.id === tournamentId)
  if (!meta) return 0

  let score = 0
  const text = `${competitionId} ${teamNames.join(' ')}`.toLowerCase()
  for (const alias of [...meta.tokens, ...(EXTRA_ALIASES[tournamentId] ?? [])]) {
    if (text.includes(alias)) score += 0.35
  }

  const appTeams = teamsForTournament(tournamentId)
  if (!appTeams.length) return score

  let hits = 0
  for (const tn of teamNames) {
    if (appTeams.some((at) => stringSimilarity(tn, at) >= 0.82)) hits++
  }
  const overlap = hits / Math.max(1, Math.min(teamNames.length, appTeams.length))
  score += overlap * 0.75
  return score
}

/**
 * Map imported CompetitionIDs onto existing manager T20 tournaments.
 * Uses team overlap as primary signal (IPL teams → t20-m-ipl, etc.).
 */
export function mapCompetitionsToBuiltinTournaments(apply: boolean): TournamentMapResult {
  const db = getCricketDb()
  const competitions = db
    .prepare(`SELECT competition_id AS id FROM competition_dim`)
    .all() as { id: string }[]

  let mapped = 0
  const unmapped: string[] = []

  for (const { id: competitionId } of competitions) {
    const existing = db
      .prepare(`SELECT tournament_id AS tid FROM competition_dim WHERE competition_id = ?`)
      .get(competitionId) as { tid: string | null } | undefined
    if (existing?.tid) continue

    const teams = topTeamNamesForCompetition(competitionId)
    let best: { tournamentId: string; score: number } | null = null

    for (const { id: tid } of BUILTIN_TOURNAMENT_IDS) {
      const score = scoreCompetitionToTournament(competitionId, tid, teams)
      if (score >= 0.45 && (!best || score > best.score)) {
        best = { tournamentId: tid, score }
      }
    }

    if (best && best.score >= 0.5) {
      if (apply) {
        setCompetitionTournament(competitionId, best.tournamentId)
        mapped++
      }
    } else {
      unmapped.push(competitionId)
    }
  }

  return { mapped, unmapped }
}
