import { TOURNAMENTS } from '../../app/data/tournaments'
import { TEAMS } from '../../app/data/teams'
import { getCricketDb } from './client'
import { collectAppSquadNames, listBuiltinAppTeams } from './appSquadNames'
import { listCustomTournaments, listCustomTeams } from './customTournaments'
import { playerNameSimilarity, stringSimilarity } from './nameMatch'
import { findCanonicalByAppName, rebuildPlayerMerges, type PlayerMergeRebuildResult } from './playerMerges'
import { mapCompetitionsToBuiltinTournaments } from './tournamentMap'
import { listCompetitions, listExternalTeams, setCompetitionTournament, setExternalTeamMapping, upsertAlias } from './queries'

const COMPETITION_KEYWORDS: { re: RegExp; tournamentId: string }[] = [
  { re: /\bipl\b|indian premier/i, tournamentId: 't20-m-ipl' },
  { re: /vitality blast|\bt20 blast\b|\bblast\b/i, tournamentId: 't20-m-blast' },
  { re: /\bbbl\b|big bash/i, tournamentId: 't20-m-bbl' },
  { re: /\bthe hundred\b|\bhundred\b/i, tournamentId: 't20-m-hundred' },
  { re: /\bcpl\b|caribbean premier/i, tournamentId: 't20-m-cpl' },
  { re: /\bsa20\b|sa 20/i, tournamentId: 't20-m-sa' },
  { re: /\binternational\b/i, tournamentId: 't20-m-intl' },
]

export interface AutoMapSuggestion {
  kind: 'competition' | 'team' | 'player'
  confidence: number
  label: string
  mappedTo: string
  mappedToLabel?: string
  sourceId?: string
}

export interface UnmappedCompetition {
  competitionId: string
  label: string
  rowCount: number
  topTeams: string[]
  suggestedName: string
}

export interface AutoMapResult {
  applied: boolean
  competitionsMapped: number
  teamsMapped: number
  playersMapped: number
  suggestions: AutoMapSuggestion[]
  unmappedCompetitions: UnmappedCompetition[]
  playerMerges?: PlayerMergeRebuildResult
  tournamentMap?: { mapped: number; unmapped: number }
}

function allTournamentOptions(): { id: string; name: string }[] {
  const built = TOURNAMENTS.t20.men.map((t) => ({ id: t.id, name: t.name }))
  const custom = listCustomTournaments().map((t) => ({ id: t.id, name: t.name }))
  return [...built, ...custom]
}

function teamsForTournament(tournamentId: string): { id: string; name: string }[] {
  const builtin = listBuiltinAppTeams(tournamentId)
  if (builtin.length) return builtin
  return listCustomTeams(tournamentId).map((t) => ({ id: t.id, name: t.name }))
}

function topTeamNamesForCompetition(competitionId: string, limit = 12): string[] {
  const db = getCricketDb()
  return (
    db
      .prepare(
        `SELECT team_name AS name, COUNT(*) AS c
         FROM performances
         WHERE competition_id = ? AND team_name IS NOT NULL AND team_name != ''
         GROUP BY team_name
         ORDER BY c DESC
         LIMIT ?`,
      )
      .all(competitionId, limit) as { name: string }[]
  ).map((r) => r.name)
}

function inferTournamentByTeamOverlap(teamNames: string[]): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null
  for (const { id } of allTournamentOptions()) {
    const appTeams = teamsForTournament(id)
    if (!appTeams.length) continue
    let hits = 0
    for (const tn of teamNames) {
      for (const at of appTeams) {
        if (stringSimilarity(tn, at.name) >= 0.85) {
          hits++
          break
        }
      }
    }
    const score = hits / Math.max(1, Math.min(teamNames.length, appTeams.length))
    if (score >= 0.25 && (!best || score > best.score)) {
      best = { id, score }
    }
  }
  return best
}

function matchCompetitionToTournament(
  competitionId: string,
  label: string,
): { tournamentId: string; confidence: number; reason: string } | null {
  const text = `${competitionId} ${label}`.toLowerCase()
  for (const { re, tournamentId } of COMPETITION_KEYWORDS) {
    if (re.test(text)) {
      return { tournamentId, confidence: 0.95, reason: 'keyword' }
    }
  }
  for (const t of allTournamentOptions()) {
    if (text.includes(t.name.toLowerCase())) {
      return { tournamentId: t.id, confidence: 0.9, reason: 'name' }
    }
  }
  const teams = topTeamNamesForCompetition(competitionId)
  const inferred = inferTournamentByTeamOverlap(teams)
  if (inferred && inferred.score >= 0.35) {
    return { tournamentId: inferred.id, confidence: 0.75 + inferred.score * 0.2, reason: 'teams' }
  }
  return null
}

function matchExternalTeam(
  label: string,
  tournamentId: string | null,
): { appTeamId: string; confidence: number } | null {
  if (!tournamentId) return null
  const candidates = teamsForTournament(tournamentId)
  let best: { id: string; score: number } | null = null
  for (const at of candidates) {
    const score = stringSimilarity(label, at.name)
    if (score >= 0.82 && (!best || score > best.score)) {
      best = { id: at.id, score }
    }
  }
  return best ? { appTeamId: best.id, confidence: best.score } : null
}

function datasetPlayersForTeam(externalTeamId: string, competitionId: string | null): { playerId: string; name: string }[] {
  const db = getCricketDb()
  if (competitionId) {
    return db
      .prepare(
        `SELECT DISTINCT player_id AS playerId, player_name AS name
         FROM performances WHERE team_id = ? AND competition_id = ?
         LIMIT 500`,
      )
      .all(externalTeamId, competitionId) as { playerId: string; name: string }[]
  }
  return db
    .prepare(
      `SELECT DISTINCT player_id AS playerId, player_name AS name
       FROM performances WHERE team_id = ? LIMIT 500`,
    )
    .all(externalTeamId) as { playerId: string; name: string }[]
}

const COMP_THRESHOLD = 0.88
const TEAM_THRESHOLD = 0.85
const PLAYER_THRESHOLD = 0.9

export function runAutoMap(opts: { apply: boolean; skipPrep?: boolean }): AutoMapResult {
  const suggestions: AutoMapSuggestion[] = []
  let competitionsMapped = 0
  let teamsMapped = 0
  let playersMapped = 0
  const unmappedCompetitions: UnmappedCompetition[] = []

  let playerMerges: PlayerMergeRebuildResult | undefined
  let tournamentMap: { mapped: number; unmapped: number } | undefined
  if (opts.apply && !opts.skipPrep) {
    playerMerges = rebuildPlayerMerges()
    const tm = mapCompetitionsToBuiltinTournaments(true)
    tournamentMap = { mapped: tm.mapped, unmapped: tm.unmapped.length }
    competitionsMapped += tm.mapped
  }

  const competitions = listCompetitions()
  const compTournament = new Map<string, string>()

  for (const c of competitions) {
    if (c.tournamentId) {
      compTournament.set(c.competitionId, c.tournamentId)
      continue
    }
    const hit = matchCompetitionToTournament(c.competitionId, c.label)
    if (hit && hit.confidence >= COMP_THRESHOLD) {
      suggestions.push({
        kind: 'competition',
        confidence: hit.confidence,
        label: c.label || c.competitionId,
        mappedTo: hit.tournamentId,
        mappedToLabel: allTournamentOptions().find((t) => t.id === hit.tournamentId)?.name,
        sourceId: c.competitionId,
      })
      compTournament.set(c.competitionId, hit.tournamentId)
      if (opts.apply) {
        setCompetitionTournament(c.competitionId, hit.tournamentId)
        competitionsMapped++
      }
    } else {
      const topTeams = topTeamNamesForCompetition(c.competitionId, 8)
      unmappedCompetitions.push({
        competitionId: c.competitionId,
        label: c.label || c.competitionId,
        rowCount: c.rowCount,
        topTeams,
        suggestedName: topTeams[0] ? `${topTeams[0]} league` : `Competition ${c.competitionId}`,
      })
      if (hit && hit.confidence >= 0.7) {
        suggestions.push({
          kind: 'competition',
          confidence: hit.confidence,
          label: c.label || c.competitionId,
          mappedTo: hit.tournamentId,
          mappedToLabel: allTournamentOptions().find((t) => t.id === hit.tournamentId)?.name,
          sourceId: c.competitionId,
        })
      }
    }
  }

  const db = getCricketDb()
  const primaryComp = (teamId: string): string | null => {
    const row = db
      .prepare(
        `SELECT competition_id AS id FROM performances
         WHERE team_id = ? AND competition_id IS NOT NULL AND competition_id != ''
         GROUP BY competition_id ORDER BY COUNT(*) DESC LIMIT 1`,
      )
      .get(teamId) as { id: string } | undefined
    return row?.id ?? null
  }

  const externalTeams = listExternalTeams()

  for (const t of externalTeams) {
    if (t.appTeamId) continue

    let tourId = t.tournamentId
    if (!tourId) {
      const cid = primaryComp(t.teamId)
      if (cid) tourId = compTournament.get(cid) ?? null
    }
    if (!tourId) continue

    const hit = matchExternalTeam(t.label, tourId)
    if (hit && hit.confidence >= TEAM_THRESHOLD) {
      suggestions.push({
        kind: 'team',
        confidence: hit.confidence,
        label: t.label,
        mappedTo: hit.appTeamId,
        mappedToLabel: teamsForTournament(tourId)?.find((x) => x.id === hit.appTeamId)?.name,
        sourceId: t.teamId,
      })
      if (opts.apply) {
        setExternalTeamMapping(t.teamId, tourId, hit.appTeamId)
        teamsMapped++
      }
    }
  }

  const squadNames = collectAppSquadNames()
  const existingAliases = new Set(
    (db.prepare(`SELECT app_name FROM player_aliases`).all() as { app_name: string }[]).map(
      (r) => r.app_name.toLowerCase(),
    ),
  )

  for (const entry of squadNames) {
    if (existingAliases.has(entry.appName.toLowerCase())) continue

    const byIdentity = findCanonicalByAppName(entry.appName)
    if (byIdentity) {
      suggestions.push({
        kind: 'player',
        confidence: 0.96,
        label: entry.appName,
        mappedTo: byIdentity.playerId,
        mappedToLabel: byIdentity.displayName,
      })
      if (opts.apply) {
        upsertAlias(entry.appName, byIdentity.playerId, 'identity-key')
        playersMapped++
        existingAliases.add(entry.appName.toLowerCase())
      }
      continue
    }

    let candidates: { playerId: string; name: string }[] = []
    if (entry.appTeamId && entry.tournamentId) {
      const appTeam = TEAMS[entry.tournamentId]?.find((t) => t.id === entry.appTeamId)
      const ext = externalTeams.find((t) => {
        let tour = t.tournamentId
        if (!tour) {
          const cid = primaryComp(t.teamId)
          if (cid) tour = compTournament.get(cid) ?? null
        }
        if (tour !== entry.tournamentId) return false
        if (t.appTeamId === entry.appTeamId) return true
        return appTeam ? stringSimilarity(t.label, appTeam.name) >= 0.85 : false
      })
      if (ext) {
        const compIds = db
          .prepare(
            `SELECT DISTINCT competition_id AS id FROM performances WHERE team_id = ? AND competition_id IS NOT NULL`,
          )
          .all(ext.teamId) as { id: string }[]
        for (const { id } of compIds.slice(0, 2)) {
          candidates.push(...datasetPlayersForTeam(ext.teamId, id))
        }
      }
    }

    if (candidates.length === 0) {
      candidates = db
        .prepare(
          `SELECT player_id AS playerId, display_name AS name FROM players ORDER BY appearances DESC LIMIT 8000`,
        )
        .all() as { playerId: string; name: string }[]
    }

    let best: { playerId: string; name: string; score: number } | null = null
    for (const c of candidates) {
      const score = playerNameSimilarity(entry.appName, c.name)
      if (score >= PLAYER_THRESHOLD && (!best || score > best.score)) {
        best = { ...c, score }
      }
    }

    if (best) {
      suggestions.push({
        kind: 'player',
        confidence: best.score,
        label: entry.appName,
        mappedTo: best.playerId,
        mappedToLabel: best.name,
      })
      if (opts.apply) {
        upsertAlias(entry.appName, best.playerId, 'auto-map')
        playersMapped++
        existingAliases.add(entry.appName.toLowerCase())
      }
    }
  }

  return {
    applied: opts.apply,
    competitionsMapped,
    teamsMapped,
    playersMapped,
    suggestions,
    unmappedCompetitions,
    playerMerges,
    tournamentMap,
  }
}
