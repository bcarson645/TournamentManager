import { getCricketDb, getCricketDbMode } from './client'
import { assertCricketDbWritable } from './writeGuard'
import { allPlayerIdsForCanonical, resolveCanonicalPlayerId } from './playerMerges'
import { enrichAggregateBowlingEconomy } from './parseOvers'

export interface DbStats {
  performances: number
  players: number
  competitions: number
  teams: number
  aliases: number
  mergedPlayerIds: number
  lastImport: { at: string; filename: string; rows: number } | null
  readonly: boolean
  bundled: boolean
}


export function getDbStats(): DbStats {
  const db = getCricketDb()
  const performances = (db.prepare('SELECT COUNT(*) AS c FROM performances').get() as { c: number }).c
  const players = (db.prepare('SELECT COUNT(*) AS c FROM players').get() as { c: number }).c
  const competitions = (db.prepare('SELECT COUNT(*) AS c FROM competition_dim').get() as { c: number }).c
  const teams = (db.prepare('SELECT COUNT(*) AS c FROM team_dim').get() as { c: number }).c
  const aliases = (db.prepare('SELECT COUNT(*) AS c FROM player_aliases').get() as { c: number }).c
  const mergedPlayerIds = (
    db.prepare('SELECT COUNT(*) AS c FROM player_id_merges').get() as { c: number }
  ).c
  const last = db
    .prepare(
      `SELECT imported_at AS at, filename, rows_imported AS rows FROM import_log ORDER BY id DESC LIMIT 1`,
    )
    .get() as { at: string; filename: string; rows: number } | undefined
  const mode = getCricketDbMode()
  return {
    performances,
    players,
    competitions,
    teams,
    aliases,
    mergedPlayerIds,
    lastImport: last ?? null,
    readonly: mode.readonly,
    bundled: mode.bundled,
  }
}

export interface PlayerSearchHit {
  playerId: string
  displayName: string
  appearances: number
}

export function searchPlayers(q: string, limit = 25): PlayerSearchHit[] {
  const db = getCricketDb()
  const term = `%${q.trim()}%`
  return db
    .prepare(
      `SELECT player_id AS playerId, display_name AS displayName, appearances
       FROM players
       WHERE display_name LIKE ? OR player_id LIKE ? OR identity_key LIKE ?
       ORDER BY appearances DESC, display_name ASC
       LIMIT ?`,
    )
    .all(term, term, term, limit) as PlayerSearchHit[]
}

export interface PlayerT20Aggregate {
  playerId: string
  displayName: string
  appearances: number
  batInnings: number
  runs: number
  balls: number
  average: number | null
  strikeRatePerBall: number | null
  fours: number
  sixes: number
  fifties: number
  hundreds: number
  highScore: number
  bowlInnings: number
  wickets: number
  bowlRuns: number
  oversText: string | null
  economy: number | null
  bowlAverage: number | null
  recentInnings: { date: string; runs: number; notOut: boolean }[]
}

function isDismissed(dismissal: string | null): boolean {
  if (!dismissal || !dismissal.trim()) return false
  const d = dismissal.toLowerCase()
  if (d.includes('not out') || d === 'no' || d === 'retired hurt') return false
  return true
}

export function getPlayerT20Aggregate(playerId: string): PlayerT20Aggregate | null {
  const db = getCricketDb()
  const canonicalId = resolveCanonicalPlayerId(playerId)
  const meta = db
    .prepare(`SELECT player_id AS playerId, display_name AS displayName, appearances FROM players WHERE player_id = ?`)
    .get(canonicalId) as { playerId: string; displayName: string; appearances: number } | undefined
  if (!meta) return null

  const ids = allPlayerIdsForCanonical(canonicalId)
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT match_date, dismissal, bat_runs, bat_balls, fours, sixes, bowl_runs, bowl_wickets, bowl_overs
       FROM performances WHERE player_id IN (${placeholders}) ORDER BY match_date DESC`,
    )
    .all(...ids) as {
    match_date: string | null
    dismissal: string | null
    bat_runs: number | null
    bat_balls: number | null
    fours: number | null
    sixes: number | null
    bowl_runs: number | null
    bowl_wickets: number | null
    bowl_overs: string | null
  }[]

  let runs = 0
  let balls = 0
  let dismissals = 0
  let batInnings = 0
  let fours = 0
  let sixes = 0
  let fifties = 0
  let hundreds = 0
  let highScore = 0
  let wickets = 0
  let bowlRuns = 0
  let bowlInnings = 0
  const bowlRows: { bowl_runs: number | null; bowl_overs: string | null }[] = []
  const recentInnings: { date: string; runs: number; notOut: boolean }[] = []

  for (const r of rows) {
    const batted = (r.bat_balls ?? 0) > 0 || (r.bat_runs ?? 0) > 0
    if (batted) {
      batInnings++
      const br = r.bat_runs ?? 0
      runs += br
      balls += r.bat_balls ?? 0
      fours += r.fours ?? 0
      sixes += r.sixes ?? 0
      if (br >= 100) hundreds++
      else if (br >= 50) fifties++
      if (br > highScore) highScore = br
      if (isDismissed(r.dismissal)) dismissals++
      if (recentInnings.length < 10 && r.match_date) {
        recentInnings.push({
          date: r.match_date,
          runs: br,
          notOut: !isDismissed(r.dismissal),
        })
      }
    }
    const bowled = (r.bowl_wickets ?? 0) > 0 || (r.bowl_overs != null && r.bowl_overs !== '' && r.bowl_overs !== '0')
    if (bowled) {
      bowlInnings++
      wickets += r.bowl_wickets ?? 0
      bowlRuns += r.bowl_runs ?? 0
      bowlRows.push({ bowl_runs: r.bowl_runs, bowl_overs: r.bowl_overs })
    }
  }

  const average = dismissals > 0 ? runs / dismissals : null
  const strikeRatePerBall = balls > 0 ? runs / balls : null
  const { economy, totalOvers } = enrichAggregateBowlingEconomy(bowlRows)

  return {
    playerId: meta.playerId,
    displayName: meta.displayName,
    appearances: meta.appearances,
    batInnings,
    runs,
    balls,
    average: average != null ? Math.round(average * 100) / 100 : null,
    strikeRatePerBall: strikeRatePerBall != null ? Math.round(strikeRatePerBall * 10000) / 10000 : null,
    fours,
    sixes,
    fifties,
    hundreds,
    highScore,
    bowlInnings,
    wickets,
    bowlRuns,
    oversText: totalOvers > 0 ? String(totalOvers) : null,
    economy,
    bowlAverage: wickets > 0 ? Math.round((bowlRuns / wickets) * 100) / 100 : null,
    recentInnings,
  }
}

export interface PerformanceListRow {
  id: number
  matchDate: string | null
  playerName: string
  playerId: string
  teamName: string | null
  opponent: string | null
  batRuns: number | null
  batBalls: number | null
  bowlWickets: number | null
  competitionId: string | null
}

export function listPerformances(opts: {
  page: number
  pageSize: number
  playerId?: string
  competitionId?: string
}): { rows: PerformanceListRow[]; total: number } {
  const db = getCricketDb()
  const page = Math.max(1, opts.page)
  const pageSize = Math.min(100, Math.max(10, opts.pageSize))
  const offset = (page - 1) * pageSize

  const clauses: string[] = []
  const params: (string | number)[] = []
  if (opts.playerId) {
    const ids = allPlayerIdsForCanonical(resolveCanonicalPlayerId(opts.playerId))
    clauses.push(`player_id IN (${ids.map(() => '?').join(', ')})`)
    params.push(...ids)
  }
  if (opts.competitionId) {
    clauses.push('competition_id = ?')
    params.push(opts.competitionId)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM performances ${where}`).get(...params) as { c: number }
  ).c

  const rows = db
    .prepare(
      `SELECT id, match_date AS matchDate, player_name AS playerName, player_id AS playerId,
              team_name AS teamName, opponent, bat_runs AS batRuns, bat_balls AS batBalls,
              bowl_wickets AS bowlWickets, competition_id AS competitionId
       FROM performances ${where}
       ORDER BY match_date DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as PerformanceListRow[]

  return { rows, total }
}

export interface CompetitionDimRow {
  competitionId: string
  label: string
  rowCount: number
  tournamentId: string | null
  notes: string | null
}

export function listCompetitions(): CompetitionDimRow[] {
  const db = getCricketDb()
  return db
    .prepare(
      `SELECT competition_id AS competitionId, label, row_count AS rowCount,
              tournament_id AS tournamentId, notes
       FROM competition_dim ORDER BY row_count DESC`,
    )
    .all() as CompetitionDimRow[]
}

export function setCompetitionTournament(competitionId: string, tournamentId: string | null): void {
  const db = getCricketDb()
  db.prepare(`UPDATE competition_dim SET tournament_id = ? WHERE competition_id = ?`).run(
    tournamentId,
    competitionId,
  )
}

export interface TeamDimRow {
  teamId: string
  label: string
  rowCount: number
  tournamentId: string | null
  appTeamId: string | null
  notes: string | null
}

export function listExternalTeams(): TeamDimRow[] {
  const db = getCricketDb()
  return db
    .prepare(
      `SELECT team_id AS teamId, label, row_count AS rowCount,
              tournament_id AS tournamentId, app_team_id AS appTeamId, notes
       FROM team_dim ORDER BY row_count DESC`,
    )
    .all() as TeamDimRow[]
}

export function setExternalTeamMapping(
  teamId: string,
  tournamentId: string | null,
  appTeamId: string | null,
): void {
  assertCricketDbWritable()
  const db = getCricketDb()
  db.prepare(
    `UPDATE team_dim SET tournament_id = ?, app_team_id = ? WHERE team_id = ?`,
  ).run(tournamentId, appTeamId, teamId)
}

export interface AliasRow {
  appName: string
  playerId: string
  notes: string | null
}

export function listAliases(): AliasRow[] {
  const db = getCricketDb()
  return db
    .prepare(`SELECT app_name AS appName, player_id AS playerId, notes FROM player_aliases ORDER BY app_name`)
    .all() as AliasRow[]
}

export function upsertAlias(appName: string, playerId: string, notes: string | null): void {
  assertCricketDbWritable()
  const db = getCricketDb()
  db.prepare(
    `INSERT INTO player_aliases (app_name, player_id, notes, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(app_name) DO UPDATE SET player_id = excluded.player_id, notes = excluded.notes, updated_at = excluded.updated_at`,
  ).run(appName.trim(), playerId.trim(), notes)
}

export function deleteAlias(appName: string): void {
  assertCricketDbWritable()
  getCricketDb().prepare(`DELETE FROM player_aliases WHERE app_name = ?`).run(appName)
}
