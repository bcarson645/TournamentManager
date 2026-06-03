import { getAppTournamentLabel } from './appTournaments'
import { listCustomTournaments } from './customTournaments'
import { getCricketDb } from './client'
import { getDatasetPlayerIdForAppName } from './playerProfileBridge'
import { allPlayerIdsForCanonical, resolveCanonicalPlayerId } from './playerMerges'
import { oversTextToBalls } from './parseOvers'

export type StatsScope = 'current' | 'all' | string

export interface TournamentBattingRow {
  groupKey: string
  tournamentId: string | null
  tournamentName: string
  teamsLabel: string
  matches: number
  inns: number
  notOuts: number
  runs: number
  highScore: number
  highScoreNotOut: boolean
  average: number | null
  balls: number
  strikeRate: number | null
  hundreds: number
  fifties: number
  fours: number
  sixes: number
}

export interface TournamentBowlingRow {
  groupKey: string
  tournamentId: string | null
  tournamentName: string
  teamsLabel: string
  matches: number
  inns: number
  balls: number
  runs: number
  wickets: number
  bestInnings: string | null
  average: number | null
  economy: number | null
  strikeRate: number | null
}

export interface SeasonBattingRow {
  season: string
  matches: number
  inns: number
  notOuts: number
  runs: number
  average: number | null
  strikeRate: number | null
  fifties: number
  hundreds: number
}

export interface SeasonBowlingRow {
  season: string
  matches: number
  inns: number
  wickets: number
  average: number | null
  economy: number | null
}

export interface StatsFilterOption {
  scope: StatsScope
  label: string
}

export interface PlayerStatsBreakdown {
  displayName: string
  scope: StatsScope
  contextTournamentId: string | null
  filterOptions: StatsFilterOption[]
  tournamentBatting: TournamentBattingRow[]
  tournamentBowling: TournamentBowlingRow[]
  seasonBatting: SeasonBattingRow[]
  seasonBowling: SeasonBowlingRow[]
}

interface PerfRow {
  source_id: string | null
  match_date: string | null
  team_name: string | null
  dismissal: string | null
  bat_runs: number | null
  bat_balls: number | null
  fours: number | null
  sixes: number | null
  bowl_overs: string | null
  bowl_runs: number | null
  bowl_wickets: number | null
  competition_id: string | null
  team_id: string | null
  tournament_id: string | null
  comp_label: string | null
}

function isDismissed(dismissal: string | null): boolean {
  if (!dismissal || !dismissal.trim()) return false
  const d = dismissal.toLowerCase()
  if (d.includes('not out') || d === 'no' || d === 'retired hurt') return false
  return true
}

function seasonYear(matchDate: string | null): string {
  if (!matchDate) return 'Unknown'
  const m = matchDate.match(/(\d{4})/)
  return m ? m[1]! : 'Unknown'
}

function matchKey(r: PerfRow): string {
  return [r.source_id, r.match_date, r.competition_id, r.team_id].filter(Boolean).join('|')
}

function tournamentLabel(tournamentId: string | null, compLabel: string | null, competitionId: string | null): string {
  if (tournamentId) {
    try {
      return getAppTournamentLabel(tournamentId)
    } catch {
      /* server-only */
    }
  }
  if (compLabel && compLabel.length < 80) return compLabel.split(',')[0]!.trim()
  return competitionId ? `Competition ${competitionId}` : 'Other'
}

function groupKeyForRow(r: PerfRow): string {
  return r.tournament_id ?? r.competition_id ?? 'other'
}

function teamsLabel(names: string[]): string {
  const uniq = [...new Set(names.filter(Boolean))]
  if (uniq.length === 0) return '—'
  if (uniq.length === 1) return abbrevTeam(uniq[0]!)
  if (uniq.length === 2) return `${abbrevTeam(uniq[0]!)} · ${abbrevTeam(uniq[1]!)}`
  return `${uniq.length} teams`
}

function abbrevTeam(name: string): string {
  const t = name.trim()
  if (t.length <= 4) return t.toUpperCase()
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }
  return t.slice(0, 3).toUpperCase()
}

function passesScope(tournamentId: string | null, scope: StatsScope, contextTournamentId: string | null): boolean {
  if (scope === 'all') return true
  if (scope === 'current') return contextTournamentId != null && tournamentId === contextTournamentId
  return tournamentId === scope
}

function buildFilterOptions(
  tournamentIds: Set<string>,
  contextTournamentId: string | null,
): StatsFilterOption[] {
  const opts: StatsFilterOption[] = []
  if (contextTournamentId) {
    opts.push({
      scope: 'current',
      label: `This tournament (${getAppTournamentLabel(contextTournamentId)})`,
    })
  }
  opts.push({ scope: 'all', label: 'All T20 leagues' })
  const custom = listCustomTournaments()
  const seen = new Set<string>()
  for (const tid of tournamentIds) {
    if (!tid || seen.has(tid) || tid === contextTournamentId) continue
    seen.add(tid)
    opts.push({ scope: tid, label: getAppTournamentLabel(tid) })
  }
  for (const c of custom) {
    if (seen.has(c.id) || c.id === contextTournamentId) continue
    seen.add(c.id)
    opts.push({ scope: c.id, label: c.name })
  }
  return opts
}

function aggregateTournamentBatting(rows: PerfRow[]): TournamentBattingRow[] {
  const groups = new Map<
    string,
    {
      tournamentId: string | null
      tournamentName: string
      teamNames: Set<string>
      matchKeys: Set<string>
      inns: number
      notOuts: number
      runs: number
      balls: number
      fours: number
      sixes: number
      hundreds: number
      fifties: number
      highScore: number
      highScoreNotOut: boolean
      dismissals: number
    }
  >()

  for (const r of rows) {
    const gk = groupKeyForRow(r)
    let g = groups.get(gk)
    if (!g) {
      g = {
        tournamentId: r.tournament_id,
        tournamentName: tournamentLabel(r.tournament_id, r.comp_label, r.competition_id),
        teamNames: new Set(),
        matchKeys: new Set(),
        inns: 0,
        notOuts: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        hundreds: 0,
        fifties: 0,
        highScore: 0,
        highScoreNotOut: false,
        dismissals: 0,
      }
      groups.set(gk, g)
    }
    if (r.team_name) g.teamNames.add(r.team_name)
    g.matchKeys.add(matchKey(r))
    const batted = (r.bat_balls ?? 0) > 0 || (r.bat_runs ?? 0) > 0
    if (!batted) continue
    g.inns++
    const br = r.bat_runs ?? 0
    g.runs += br
    g.balls += r.bat_balls ?? 0
    g.fours += r.fours ?? 0
    g.sixes += r.sixes ?? 0
    if (br >= 100) g.hundreds++
    else if (br >= 50) g.fifties++
    if (br > g.highScore) {
      g.highScore = br
      g.highScoreNotOut = !isDismissed(r.dismissal)
    }
    if (isDismissed(r.dismissal)) g.dismissals++
    else g.notOuts++
  }

  return [...groups.entries()]
    .map(([groupKey, g]) => ({
      groupKey,
      tournamentId: g.tournamentId,
      tournamentName: g.tournamentName,
      teamsLabel: teamsLabel([...g.teamNames]),
      matches: g.matchKeys.size,
      inns: g.inns,
      notOuts: g.notOuts,
      runs: g.runs,
      highScore: g.highScore,
      highScoreNotOut: g.highScoreNotOut,
      average: g.dismissals > 0 ? Math.round((g.runs / g.dismissals) * 100) / 100 : null,
      balls: g.balls,
      strikeRate: g.balls > 0 ? Math.round((g.runs / g.balls) * 10000) / 10000 : null,
      hundreds: g.hundreds,
      fifties: g.fifties,
      fours: g.fours,
      sixes: g.sixes,
    }))
    .sort((a, b) => b.matches - a.matches || b.runs - a.runs)
}

function aggregateTournamentBowling(rows: PerfRow[]): TournamentBowlingRow[] {
  const groups = new Map<
    string,
    {
      tournamentId: string | null
      tournamentName: string
      teamNames: Set<string>
      matchKeys: Set<string>
      inns: number
      balls: number
      runs: number
      wickets: number
      bestWkts: number
      bestRuns: number
    }
  >()

  for (const r of rows) {
    const gk = groupKeyForRow(r)
    let g = groups.get(gk)
    if (!g) {
      g = {
        tournamentId: r.tournament_id,
        tournamentName: tournamentLabel(r.tournament_id, r.comp_label, r.competition_id),
        teamNames: new Set(),
        matchKeys: new Set(),
        inns: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        bestWkts: 0,
        bestRuns: 999,
      }
      groups.set(gk, g)
    }
    if (r.team_name) g.teamNames.add(r.team_name)
    g.matchKeys.add(matchKey(r))
    const bowled =
      (r.bowl_wickets ?? 0) > 0 || (r.bowl_overs != null && r.bowl_overs !== '' && r.bowl_overs !== '0')
    if (!bowled) continue
    g.inns++
    const w = r.bowl_wickets ?? 0
    const br = r.bowl_runs ?? 0
    g.wickets += w
    g.runs += br
    g.balls += oversTextToBalls(r.bowl_overs)
    if (w > g.bestWkts || (w === g.bestWkts && br < g.bestRuns)) {
      g.bestWkts = w
      g.bestRuns = br
    }
  }

  return [...groups.entries()]
    .map(([groupKey, g]) => {
      const overs = g.balls / 6
      return {
        groupKey,
        tournamentId: g.tournamentId,
        tournamentName: g.tournamentName,
        teamsLabel: teamsLabel([...g.teamNames]),
        matches: g.matchKeys.size,
        inns: g.inns,
        balls: g.balls,
        runs: g.runs,
        wickets: g.wickets,
        bestInnings: g.bestWkts > 0 ? `${g.bestWkts}/${g.bestRuns}` : null,
        average: g.wickets > 0 ? Math.round((g.runs / g.wickets) * 100) / 100 : null,
        economy: overs > 0 ? Math.round((g.runs / overs) * 100) / 100 : null,
        strikeRate: g.wickets > 0 ? Math.round((g.balls / g.wickets) * 10) / 10 : null,
      }
    })
    .sort((a, b) => b.matches - a.matches || b.wickets - a.wickets)
}

function aggregateSeasonBatting(rows: PerfRow[]): SeasonBattingRow[] {
  const byYear = new Map<
    string,
    { matchKeys: Set<string>; inns: number; notOuts: number; runs: number; balls: number; dismissals: number; fifties: number; hundreds: number }
  >()
  for (const r of rows) {
    const y = seasonYear(r.match_date)
    let g = byYear.get(y)
    if (!g) {
      g = { matchKeys: new Set(), inns: 0, notOuts: 0, runs: 0, balls: 0, dismissals: 0, fifties: 0, hundreds: 0 }
      byYear.set(y, g)
    }
    g.matchKeys.add(matchKey(r))
    const batted = (r.bat_balls ?? 0) > 0 || (r.bat_runs ?? 0) > 0
    if (!batted) continue
    g.inns++
    const br = r.bat_runs ?? 0
    g.runs += br
    g.balls += r.bat_balls ?? 0
    if (br >= 100) g.hundreds++
    else if (br >= 50) g.fifties++
    if (isDismissed(r.dismissal)) g.dismissals++
    else g.notOuts++
  }
  return [...byYear.entries()]
    .map(([season, g]) => ({
      season,
      matches: g.matchKeys.size,
      inns: g.inns,
      notOuts: g.notOuts,
      runs: g.runs,
      average: g.dismissals > 0 ? Math.round((g.runs / g.dismissals) * 100) / 100 : null,
      strikeRate: g.balls > 0 ? Math.round((g.runs / g.balls) * 10000) / 10000 : null,
      fifties: g.fifties,
      hundreds: g.hundreds,
    }))
    .sort((a, b) => b.season.localeCompare(a.season))
}

function aggregateSeasonBowling(rows: PerfRow[]): SeasonBowlingRow[] {
  const byYear = new Map<
    string,
    { matchKeys: Set<string>; inns: number; balls: number; runs: number; wickets: number }
  >()
  for (const r of rows) {
    const y = seasonYear(r.match_date)
    let g = byYear.get(y)
    if (!g) {
      g = { matchKeys: new Set(), inns: 0, balls: 0, runs: 0, wickets: 0 }
      byYear.set(y, g)
    }
    g.matchKeys.add(matchKey(r))
    const bowled =
      (r.bowl_wickets ?? 0) > 0 || (r.bowl_overs != null && r.bowl_overs !== '' && r.bowl_overs !== '0')
    if (!bowled) continue
    g.inns++
    g.wickets += r.bowl_wickets ?? 0
    g.runs += r.bowl_runs ?? 0
    g.balls += oversTextToBalls(r.bowl_overs)
  }
  return [...byYear.entries()]
    .map(([season, g]) => {
      const overs = g.balls / 6
      return {
        season,
        matches: g.matchKeys.size,
        inns: g.inns,
        wickets: g.wickets,
        average: g.wickets > 0 ? Math.round((g.runs / g.wickets) * 100) / 100 : null,
        economy: overs > 0 ? Math.round((g.runs / overs) * 100) / 100 : null,
      }
    })
    .sort((a, b) => b.season.localeCompare(a.season))
}

export function getPlayerStatsBreakdown(
  appName: string,
  contextTournamentId: string | null,
  scope: StatsScope = 'current',
): PlayerStatsBreakdown | null {
  const playerId = getDatasetPlayerIdForAppName(appName, false)
  if (!playerId) return null

  const canonicalId = resolveCanonicalPlayerId(playerId)
  const ids = allPlayerIdsForCanonical(canonicalId)
  const placeholders = ids.map(() => '?').join(', ')

  const db = getCricketDb()
  const meta = db
    .prepare(`SELECT display_name AS displayName FROM players WHERE player_id = ?`)
    .get(canonicalId) as { displayName: string } | undefined

  const rows = db
    .prepare(
      `SELECT p.source_id, p.match_date, p.team_name, p.dismissal,
              p.bat_runs, p.bat_balls, p.fours, p.sixes,
              p.bowl_overs, p.bowl_runs, p.bowl_wickets,
              p.competition_id, p.team_id,
              cd.tournament_id, cd.label AS comp_label
       FROM performances p
       LEFT JOIN competition_dim cd ON cd.competition_id = p.competition_id
       WHERE p.player_id IN (${placeholders})`,
    )
    .all(...ids) as PerfRow[]

  const tournamentIds = new Set<string>()
  for (const r of rows) {
    if (r.tournament_id) tournamentIds.add(r.tournament_id)
  }

  const effectiveScope: StatsScope =
    scope === 'current' && !contextTournamentId ? 'all' : scope

  const filtered = rows.filter((r) => passesScope(r.tournament_id, effectiveScope, contextTournamentId))

  const tournamentBatting = aggregateTournamentBatting(filtered)
  const tournamentBowling = aggregateTournamentBowling(filtered)
  const seasonBatting = aggregateSeasonBatting(filtered)
  const seasonBowling = aggregateSeasonBowling(filtered)

  const filterOptions = buildFilterOptions(tournamentIds, contextTournamentId)

  let sortedBat = tournamentBatting
  let sortedBowl = tournamentBowling
  if (contextTournamentId && effectiveScope === 'all') {
    const cur = contextTournamentId
    sortedBat = [...tournamentBatting].sort((a, b) => {
      if (a.tournamentId === cur) return -1
      if (b.tournamentId === cur) return 1
      return b.matches - a.matches
    })
    sortedBowl = [...tournamentBowling].sort((a, b) => {
      if (a.tournamentId === cur) return -1
      if (b.tournamentId === cur) return 1
      return b.matches - a.matches
    })
  }

  return {
    displayName: meta?.displayName ?? appName,
    scope: effectiveScope,
    contextTournamentId,
    filterOptions,
    tournamentBatting: sortedBat,
    tournamentBowling: sortedBowl,
    seasonBatting,
    seasonBowling,
  }
}
