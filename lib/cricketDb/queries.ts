import { getCricketDb, getCricketDbMode } from './client'
import { countUniquePerformanceMatches, performanceMatchKey } from './matchKey'
import { assertCricketDbWritable } from './writeGuard'
import { allPlayerIdsForCanonical, resolveCanonicalPlayerId } from './playerMerges'
import { ballsToOversDecimal, enrichAggregateBowlingEconomy, oversTextToBalls } from './parseOvers'

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
  /** Raw row count on `players` table (legacy; prefer matchAppearances). */
  appearances: number
  /** Unique matches in dataset (includes DNB / squad games without batting). */
  matchAppearances: number
  /** Unique matches where the player bowled. */
  bowlMatchAppearances: number
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
  /** Career average batting order (1–11 rows where the player batted). */
  avgBatOrder: number | null
  /** Distinct batting orders observed across the whole dataset. */
  batOrders: number[]
  recentInnings: { date: string; runs: number; notOut: boolean; balls: number; fours: number; sixes: number }[]
}

export function isDismissed(dismissal: string | null): boolean {
  if (!dismissal || !dismissal.trim()) return false
  const d = dismissal.toLowerCase()
  if (d.includes('not out') || d === 'no' || d === 'retired hurt') return false
  return true
}

export function getPlayerT20Aggregate(playerId: string, competitionIds?: string[]): PlayerT20Aggregate | null {
  const db = getCricketDb()
  const canonicalId = resolveCanonicalPlayerId(playerId)
  const meta = db
    .prepare(`SELECT player_id AS playerId, display_name AS displayName, appearances FROM players WHERE player_id = ?`)
    .get(canonicalId) as { playerId: string; displayName: string; appearances: number } | undefined
  if (!meta) return null

  const ids = allPlayerIdsForCanonical(canonicalId)
  const placeholders = ids.map(() => '?').join(', ')
  const scopeClause =
    competitionIds && competitionIds.length > 0
      ? `AND competition_id IN (${competitionIds.map(() => '?').join(', ')})`
      : ''
  const scopeParams = competitionIds && competitionIds.length > 0 ? competitionIds : []
  const rows = db
    .prepare(
      `SELECT source_id, match_date, competition_id, team_id, dismissal,
              bat_runs, bat_balls, bat_order, fours, sixes, bowl_runs, bowl_wickets, bowl_overs
       FROM performances WHERE player_id IN (${placeholders}) ${scopeClause} ORDER BY match_date DESC`,
    )
    .all(...ids, ...scopeParams) as {
    source_id: string | null
    match_date: string | null
    competition_id: string | null
    team_id: string | null
    dismissal: string | null
    bat_runs: number | null
    bat_balls: number | null
    bat_order: string | null
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
  let orderTotal = 0
  let orderCount = 0
  const orderSet = new Set<number>()
  const bowlRows: { bowl_runs: number | null; bowl_overs: string | null }[] = []
  const recentInnings: { date: string; runs: number; notOut: boolean; balls: number; fours: number; sixes: number }[] = []
  const bowlMatchKeys = new Set<string>()

  for (const r of rows) {
    const batted = (r.bat_balls ?? 0) > 0 || (r.bat_runs ?? 0) > 0
    if (batted) {
      batInnings++
      const br = r.bat_runs ?? 0
      runs += br
      balls += r.bat_balls ?? 0
      fours += r.fours ?? 0
      sixes += r.sixes ?? 0
      const ord = parseInt(String(r.bat_order ?? '').trim(), 10)
      if (Number.isFinite(ord) && ord >= 1 && ord <= 11) {
        orderTotal += ord
        orderCount++
        orderSet.add(ord)
      }
      if (br >= 100) hundreds++
      else if (br >= 50) fifties++
      if (br > highScore) highScore = br
      if (isDismissed(r.dismissal)) dismissals++
      if (recentInnings.length < 10 && r.match_date) {
        recentInnings.push({
          date: r.match_date,
          runs: br,
          notOut: !isDismissed(r.dismissal),
          balls: r.bat_balls ?? 0,
          fours: r.fours ?? 0,
          sixes: r.sixes ?? 0,
        })
      }
    }
    const bowled = (r.bowl_wickets ?? 0) > 0 || (r.bowl_overs != null && r.bowl_overs !== '' && r.bowl_overs !== '0')
    if (bowled) {
      bowlInnings++
      wickets += r.bowl_wickets ?? 0
      bowlRuns += r.bowl_runs ?? 0
      bowlRows.push({ bowl_runs: r.bowl_runs, bowl_overs: r.bowl_overs })
      const mk = performanceMatchKey(r)
      if (mk) bowlMatchKeys.add(mk)
    }
  }

  const matchAppearances = countUniquePerformanceMatches(rows)
  const bowlMatchAppearances = bowlMatchKeys.size

  const average = dismissals > 0 ? runs / dismissals : null
  const strikeRatePerBall = balls > 0 ? runs / balls : null
  const { economy, totalOvers } = enrichAggregateBowlingEconomy(bowlRows)

  return {
    playerId: meta.playerId,
    displayName: meta.displayName,
    appearances: meta.appearances,
    matchAppearances,
    bowlMatchAppearances,
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
    avgBatOrder: orderCount > 0 ? Math.round((orderTotal / orderCount) * 100) / 100 : null,
    batOrders: [...orderSet].sort((a, b) => a - b),
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

/** Competition ids mapped to an app tournament (e.g. t20-m-ipl). */
export function getTournamentCompetitionIds(tournamentId: string): string[] {
  const db = getCricketDb()
  return (
    db
      .prepare(`SELECT competition_id AS id FROM competition_dim WHERE tournament_id = ?`)
      .all(tournamentId) as { id: string }[]
  ).map((r) => r.id)
}

/**
 * Format names counted as major franchise T20 leagues ("major leagues" stats scope).
 * New leagues using one of these format names are picked up automatically.
 */
export const MAJOR_T20_FORMATS = [
  'Indian Premier League',
  'Big Bash League',
  'T20 Blast',
  'SA20',
  'Pakistan Super League',
  'Caribbean Premier League',
  'Bangladesh Premier League',
  'International League T20',
  'Lanka Premier League',
  'Major League Cricket',
  'The Hundred',
]

function distinctCompetitionIds(where: string, params: string[]): string[] {
  const db = getCricketDb()
  return (
    db
      .prepare(
        `SELECT DISTINCT competition_id AS id FROM performances
         WHERE ${where} AND competition_id IS NOT NULL AND competition_id <> 'CompetitionID'`,
      )
      .all(...params) as { id: string }[]
  ).map((r) => r.id)
}

/** Competition ids holding T20 cricket (the dataset's T20 marker is format_id 6). */
export function getT20CompetitionIds(): string[] {
  return distinctCompetitionIds(`format_id = '6'`, [])
}

/** Competition ids holding major franchise-league T20 (see MAJOR_T20_FORMATS). */
export function getMajorT20CompetitionIds(): string[] {
  return distinctCompetitionIds(`format IN (${MAJOR_T20_FORMATS.map(() => '?').join(', ')})`, [
    ...MAJOR_T20_FORMATS,
  ])
}

export interface RecentBattingInnings {
  date: string
  runs: number
  balls: number
  fours: number
  sixes: number
  dismissal: string | null
  notOut: boolean
  opponent: string | null
  venue: string | null
  competitionId: string | null
  playerId: string
}

function parsePerfDate(s: string | null): number {
  if (!s) return Number.NaN
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])).getTime()
  const t = Date.parse(s)
  return Number.isNaN(t) ? Number.NaN : t
}

/**
 * Most recent batting innings per player, restricted to the given competitions.
 * Sorted newest-first (dates parsed properly, not lexicographically).
 */
export function getRecentBattingInnings(
  playerIds: string[],
  competitionIds: string[],
  perPlayerLimit = 15,
): RecentBattingInnings[] {
  const db = getCricketDb()
  if (playerIds.length === 0 || competitionIds.length === 0) return []
  const rows = db
    .prepare(
      `SELECT match_date AS date, player_id AS playerId, bat_runs AS runs, bat_balls AS balls,
              fours, sixes, dismissal, opponent, venue, competition_id AS competitionId
       FROM performances
       WHERE player_id IN (${playerIds.map(() => '?').join(', ')})
         AND competition_id IN (${competitionIds.map(() => '?').join(', ')})
         AND (bat_balls > 0 OR bat_runs > 0)`,
    )
    .all(...playerIds, ...competitionIds) as {
    date: string | null
    playerId: string
    runs: number | null
    balls: number | null
    fours: number | null
    sixes: number | null
    dismissal: string | null
    opponent: string | null
    venue: string | null
    competitionId: string | null
  }[]
  const seen = new Map<string, number>()
  const out: RecentBattingInnings[] = []
  const sorted = [...rows].sort((a, b) => {
    const ta = parsePerfDate(a.date)
    const tb = parsePerfDate(b.date)
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
    if (Number.isNaN(ta)) return 1
    if (Number.isNaN(tb)) return -1
    return tb - ta
  })
  for (const r of sorted) {
    const count = seen.get(r.playerId) ?? 0
    if (count >= perPlayerLimit) continue
    seen.set(r.playerId, count + 1)
    out.push({
      date: r.date ?? '',
      runs: r.runs ?? 0,
      balls: r.balls ?? 0,
      fours: r.fours ?? 0,
      sixes: r.sixes ?? 0,
      dismissal: r.dismissal,
      notOut: !isDismissed(r.dismissal),
      opponent: r.opponent,
      venue: r.venue,
      competitionId: r.competitionId,
      playerId: r.playerId,
    })
  }
  return out
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

export interface RecentBowlingInnings {
  date: string
  oversText: string
  balls: number
  runs: number
  wickets: number
  opponent: string | null
  venue: string | null
  competitionId: string | null
  playerId: string
}

/**
 * Most recent bowling spells per player, restricted to the given competitions.
 * A spell counts when the player bowled (overs recorded) or took wickets.
 */
export function getRecentBowlingInnings(
  playerIds: string[],
  competitionIds: string[],
  perPlayerLimit = 15,
): RecentBowlingInnings[] {
  const db = getCricketDb()
  if (playerIds.length === 0 || competitionIds.length === 0) return []
  const rows = db
    .prepare(
      `SELECT match_date AS date, player_id AS playerId, bowl_overs AS overs,
              bowl_runs AS runs, bowl_wickets AS wickets, opponent, venue,
              competition_id AS competitionId
       FROM performances
       WHERE player_id IN (${playerIds.map(() => '?').join(', ')})
         AND competition_id IN (${competitionIds.map(() => '?').join(', ')})
         AND ((bowl_overs IS NOT NULL AND bowl_overs != '' AND bowl_overs != '0') OR bowl_wickets > 0)`,
    )
    .all(...playerIds, ...competitionIds) as {
    date: string | null
    playerId: string
    overs: string | null
    runs: number | null
    wickets: number | null
    opponent: string | null
    venue: string | null
    competitionId: string | null
  }[]
  const seen = new Map<string, number>()
  const out: RecentBowlingInnings[] = []
  const sorted = [...rows].sort((a, b) => {
    const ta = parsePerfDate(a.date)
    const tb = parsePerfDate(b.date)
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
    if (Number.isNaN(ta)) return 1
    if (Number.isNaN(tb)) return -1
    return tb - ta
  })
  for (const r of sorted) {
    const count = seen.get(r.playerId) ?? 0
    if (count >= perPlayerLimit) continue
    seen.set(r.playerId, count + 1)
    out.push({
      date: r.date ?? '',
      oversText: r.overs ?? '',
      balls: oversTextToBalls(r.overs),
      runs: r.runs ?? 0,
      wickets: r.wickets ?? 0,
      opponent: r.opponent,
      venue: r.venue,
      competitionId: r.competitionId,
      playerId: r.playerId,
    })
  }
  return out
}

export interface DbTeamInnings {
  date: string
  opponent: string | null
  venue: string | null
  inningsNo: 1 | 2
  total: number
  wickets: number
  fours: number
  sixes: number
  competitionId: string | null
}

interface TeamInningsGroupRow {
  matchDate: string | null
  inningsLabel: string | null
  teamTotal: string | number | null
  teamWkts: string | number | null
  opponent: string | null
  venue: string | null
  competitionId: string | null
  fours: number | null
  sixes: number | null
  sourceId: string | null
}

function toTeamInnings(r: TeamInningsGroupRow): DbTeamInnings | null {
  if (Number.isNaN(parsePerfDate(r.matchDate))) return null
  const total = Number(r.teamTotal)
  if (!Number.isFinite(total)) return null
  const inningsNo = r.inningsLabel === '2' ? 2 : 1
  return {
    date: r.matchDate ?? '',
    opponent: r.opponent,
    venue: r.venue,
    inningsNo,
    total,
    wickets: Number(r.teamWkts) || 0,
    fours: r.fours ?? 0,
    sixes: r.sixes ?? 0,
    competitionId: r.competitionId,
  }
}

/**
 * Most recent completed team innings (newest first), restricted to competitions.
 * Groups the per-player rows into innings via source + innings label, summing
 * boundaries from the player rows (the DB stores 4s/6s per player, not per team).
 */
export function getTeamRecentInnings(
  externalTeamIds: string[],
  competitionIds: string[],
  perTeamLimit = 15,
): DbTeamInnings[] {
  const db = getCricketDb()
  if (externalTeamIds.length === 0 || competitionIds.length === 0) return []
  const rows = db
    .prepare(
      `SELECT match_date AS matchDate, innings_label AS inningsLabel,
              MAX(team_total) AS teamTotal, MAX(team_wkts) AS teamWkts,
              MAX(opponent) AS opponent, MAX(venue) AS venue,
              MAX(competition_id) AS competitionId,
              SUM(COALESCE(fours, 0)) AS fours, SUM(COALESCE(sixes, 0)) AS sixes,
              source_id AS sourceId
       FROM performances
       WHERE team_id IN (${externalTeamIds.map(() => '?').join(', ')})
         AND competition_id IN (${competitionIds.map(() => '?').join(', ')})
       GROUP BY source_id, innings_label, match_date`,
    )
    .all(...externalTeamIds, ...competitionIds) as TeamInningsGroupRow[]
  const parsed = rows
    .map(toTeamInnings)
    .filter((r): r is DbTeamInnings => r != null)
    .sort((a, b) => parsePerfDate(b.date) - parsePerfDate(a.date))
  return parsed.slice(0, perTeamLimit)
}

export interface DbH2HInningsSide {
  teamName: string | null
  inningsNo: 1 | 2
  total: number
  wickets: number
}

export interface DbH2HMeeting {
  date: string
  venue: string | null
  first: DbH2HInningsSide
  second: DbH2HInningsSide
  /** Team name of the winner, or null for ties / undecidable. */
  winnerName: string | null
}

/**
 * Recent completed meetings between two sides (both innings present in the data).
 * Winner is derived from the totals: the chaser wins by passing the first-innings
 * total, otherwise the side batting first defended it. Equal totals = tie.
 */
export function getHeadToHeadMeetings(
  externalTeamIdsA: string[],
  externalTeamIdsB: string[],
  competitionIds: string[],
  limit = 10,
): DbH2HMeeting[] {
  const db = getCricketDb()
  if (externalTeamIdsA.length === 0 || externalTeamIdsB.length === 0 || competitionIds.length === 0) {
    return []
  }
  const compPlace = competitionIds.map(() => '?').join(', ')
  const aPlace = externalTeamIdsA.map(() => '?').join(', ')
  const bPlace = externalTeamIdsB.map(() => '?').join(', ')
  const matchRows = db
    .prepare(
      `SELECT source_id AS sourceId, MAX(match_date) AS matchDate, MAX(venue) AS venue
       FROM performances
       WHERE competition_id IN (${compPlace})
         AND (team_id IN (${aPlace}) OR team_id IN (${bPlace}))
       GROUP BY source_id
       HAVING COUNT(DISTINCT CASE WHEN team_id IN (${aPlace}) THEN 'A' WHEN team_id IN (${bPlace}) THEN 'B' END) = 2`,
    )
    .all(...competitionIds, ...externalTeamIdsA, ...externalTeamIdsB, ...externalTeamIdsA, ...externalTeamIdsB) as {
    sourceId: string | null
    matchDate: string | null
    venue: string | null
  }[]
  const dated = matchRows
    .filter((m) => m.sourceId && !Number.isNaN(parsePerfDate(m.matchDate)))
    .sort((a, b) => parsePerfDate(b.matchDate) - parsePerfDate(a.matchDate))
    .slice(0, limit)
  const out: DbH2HMeeting[] = []
  const innStmt = db.prepare(
    `SELECT MAX(team_name) AS teamName, innings_label AS inningsLabel,
            MAX(team_total) AS teamTotal, MAX(team_wkts) AS teamWkts
     FROM performances WHERE source_id = ? GROUP BY innings_label`,
  )
  for (const m of dated) {
    const sides = innStmt.all(m.sourceId!) as {
      teamName: string | null
      inningsLabel: string | null
      teamTotal: string | number | null
      teamWkts: string | number | null
    }[]
    if (sides.length !== 2) continue
    const norm = sides
      .map((s) => ({
        teamName: s.teamName,
        inningsNo: (s.inningsLabel === '2' ? 2 : 1) as 1 | 2,
        total: Number(s.teamTotal),
        wickets: Number(s.teamWkts) || 0,
      }))
      .filter((s) => Number.isFinite(s.total))
    if (norm.length !== 2) continue
    const first = norm.find((s) => s.inningsNo === 1)!
    const second = norm.find((s) => s.inningsNo === 2)!
    const winnerName =
      second.total > first.total ? second.teamName : first.total > second.total ? first.teamName : null
    out.push({ date: m.matchDate!, venue: m.venue, first, second, winnerName })
  }
  return out
}

export interface DbVenueRecord {
  /** DB venue name actually matched (or 'Tournament average' for the fallback). */
  venue: string
  innings: number
  avgFirstInnings: number | null
  avgSixes: number | null
  winBatFirstPct: number | null
  /** 'venue' = ground-specific, 'competition' = tournament-wide fallback. */
  source: 'venue' | 'competition'
  /** Designated home team at this venue (primary tenant), if one is clear. */
  homeTeamId: string | null
  homeTeamName: string | null
  /** % of decided home games won by the home side (null when no clear tenant). */
  homeWinsPct: number | null
  homeWinsGames: number
}

export interface DbHomePar {
  /** Average 1st-innings score in the side's home games. */
  avg: number | null
  /** Home games counted. */
  games: number
  /** Dataset venue names treated as home (handles ground renames across eras). */
  venues: string[]
}

/**
 * Par score for a side at home: average 1st-innings total across matches where
 * they were the home team. Home venues are detected empirically — venues where
 * the side is the primary tenant (row share >= minShare). This handles ground
 * renames (e.g. Feroz Shah Kotla / Arun Jaitley Stadium) with no name mapping.
 */
export function getTeamHomeVenues(
  externalTeamIds: string[],
  competitionIds: string[],
  minShare = 0.25,
  minTeamRows = 44,
): string[] {
  const db = getCricketDb()
  if (externalTeamIds.length === 0 || competitionIds.length === 0) return []
  const compPlace = competitionIds.map(() => '?').join(', ')
  const teamPlace = externalTeamIds.map(() => '?').join(', ')
  const venues = db
    .prepare(
      `SELECT venue, COUNT(*) AS total,
              SUM(CASE WHEN team_id IN (${teamPlace}) THEN 1 ELSE 0 END) AS teamRows
       FROM performances
       WHERE competition_id IN (${compPlace}) AND venue IS NOT NULL AND venue != ''
       GROUP BY venue`,
    )
    .all(...externalTeamIds, ...competitionIds) as {
    venue: string
    total: number
    teamRows: number
  }[]
  return venues
    .filter((v) => v.teamRows >= minTeamRows && v.teamRows / Math.max(1, v.total) >= minShare)
    .map((v) => v.venue)
}

export function getTeamHomePar(
  externalTeamIds: string[],
  competitionIds: string[],
  minShare = 0.25,
  minTeamRows = 44,
): DbHomePar | null {
  const homeVenues = getTeamHomeVenues(externalTeamIds, competitionIds, minShare, minTeamRows)
  if (homeVenues.length === 0) return null
  const db = getCricketDb()
  const compPlace = competitionIds.map(() => '?').join(', ')
  const teamPlace = externalTeamIds.map(() => '?').join(', ')
  const venuePlace = homeVenues.map(() => '?').join(', ')
  const matches = db
    .prepare(
      `SELECT source_id AS sourceId FROM performances
       WHERE competition_id IN (${compPlace}) AND venue IN (${venuePlace}) AND team_id IN (${teamPlace})
       GROUP BY source_id`,
    )
    .all(...competitionIds, ...homeVenues, ...externalTeamIds) as {
    sourceId: string | null
  }[]
  const firstTotals: number[] = []
  const innStmt = db.prepare(
    `SELECT MAX(team_total) AS teamTotal FROM performances
     WHERE source_id = ? AND innings_label = '1' AND competition_id IN (${compPlace})`,
  )
  for (const m of matches) {
    if (!m.sourceId) continue
    const row = innStmt.get(m.sourceId, ...competitionIds) as
      | { teamTotal: string | number | null }
      | undefined
    const t = Number(row?.teamTotal)
    if (Number.isFinite(t)) firstTotals.push(t)
  }
  if (firstTotals.length === 0) return null
  return {
    avg: Math.round((firstTotals.reduce((s, v) => s + v, 0) / firstTotals.length) * 10) / 10,
    games: firstTotals.length,
    venues: homeVenues,
  }
}

function venueRecordFromInnings(
  venue: string,
  source: 'venue' | 'competition',
  firstTotals: number[],
  sixesPerInnings: number[],
  batFirstWins: number,
  decidedMatches: number,
  home: { teamId: string | null; teamName: string | null; wins: number; games: number },
): DbVenueRecord {
  const avgFirstInnings =
    firstTotals.length > 0
      ? Math.round((firstTotals.reduce((s, v) => s + v, 0) / firstTotals.length) * 10) / 10
      : null
  const avgSixes =
    sixesPerInnings.length > 0
      ? Math.round((sixesPerInnings.reduce((s, v) => s + v, 0) / sixesPerInnings.length) * 10) / 10
      : null
  return {
    venue,
    innings: sixesPerInnings.length,
    avgFirstInnings,
    avgSixes,
    winBatFirstPct:
      decidedMatches > 0 ? Math.round((batFirstWins / decidedMatches) * 1000) / 10 : null,
    source,
    homeTeamId: home.teamId,
    homeTeamName: home.teamName,
    homeWinsPct: home.games > 0 ? Math.round((home.wins / home.games) * 1000) / 10 : null,
    homeWinsGames: home.games,
  }
}

/**
 * Primary tenant of a venue (the side that plays its home games there), by row
 * share. Null when no team dominates (neutral venues).
 */
function getVenueTenant(
  venue: string,
  competitionIds: string[],
  minShare = 0.25,
  minTeamRows = 44,
): { teamId: string; teamName: string } | null {
  const db = getCricketDb()
  const compPlace = competitionIds.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT team_id AS teamId, MAX(team_name) AS teamName, COUNT(*) AS rows
       FROM performances
       WHERE competition_id IN (${compPlace}) AND venue = ?
       GROUP BY team_id ORDER BY rows DESC`,
    )
    .all(...competitionIds, venue) as { teamId: string; teamName: string; rows: number }[]
  const total = rows.reduce((s, r) => s + r.rows, 0)
  const top = rows[0]
  if (!top || top.rows < minTeamRows || top.rows / Math.max(1, total) < minShare) return null
  return { teamId: top.teamId, teamName: top.teamName }
}

/**
 * Ground record from real results: average first-innings score, average sixes per
 * innings and % of matches won batting first. Falls back to the tournament-wide
 * record when the venue has too few matches in the data.
 */
export function getVenueRecord(
  venue: string | null,
  competitionIds: string[],
  minInnings = 6,
): DbVenueRecord | null {
  const db = getCricketDb()
  if (competitionIds.length === 0) return null
  const compPlace = competitionIds.map(() => '?').join(', ')
  const buildFor = (
    label: string,
    source: 'venue' | 'competition',
    venueFilter: string | null,
  ): DbVenueRecord | null => {
    const params: string[] = [...competitionIds]
    if (venueFilter) params.push(venueFilter)
    const matches = db
      .prepare(
        `SELECT source_id AS sourceId
         FROM performances
         WHERE competition_id IN (${compPlace})${venueFilter ? ' AND venue = ?' : ''}
         GROUP BY source_id HAVING COUNT(DISTINCT innings_label) >= 1`,
      )
      .all(...params) as { sourceId: string | null }[]
    const firstTotals: number[] = []
    const sixesPerInnings: number[] = []
    let batFirstWins = 0
    let decided = 0
    let homeWins = 0
    let homeDecided = 0
    const tenant = venueFilter ? getVenueTenant(venueFilter, competitionIds) : null
    const innStmt = db.prepare(
      `SELECT innings_label AS inningsLabel, MAX(team_total) AS teamTotal, SUM(COALESCE(sixes, 0)) AS sixes,
              MAX(team_id) AS teamId, MAX(team_name) AS teamName
       FROM performances WHERE source_id = ? AND competition_id IN (${compPlace}) GROUP BY innings_label`,
    )
    for (const m of matches) {
      if (!m.sourceId) continue
      const sides = innStmt.all(m.sourceId, ...competitionIds) as {
        inningsLabel: string | null
        teamTotal: string | number | null
        sixes: number | null
        teamId: string | null
        teamName: string | null
      }[]
      for (const s of sides) {
        const total = Number(s.teamTotal)
        if (!Number.isFinite(total)) continue
        if (s.inningsLabel === '1') firstTotals.push(total)
        sixesPerInnings.push(s.sixes ?? 0)
      }
      const first = sides.find((s) => s.inningsLabel === '1')
      const second = sides.find((s) => s.inningsLabel === '2')
      const t1 = Number(first?.teamTotal)
      const t2 = Number(second?.teamTotal)
      if (Number.isFinite(t1) && Number.isFinite(t2)) {
        decided++
        if (t1 >= t2) batFirstWins++
        if (tenant && t1 !== t2) {
          const winnerId = t2 > t1 ? second?.teamId : first?.teamId
          const involved = sides.some((s) => s.teamId === tenant.teamId)
          if (involved) {
            homeDecided++
            if (winnerId === tenant.teamId) homeWins++
          }
        }
      }
    }
    if (sixesPerInnings.length === 0) return null
    return venueRecordFromInnings(label, source, firstTotals, sixesPerInnings, batFirstWins, decided, {
      teamId: tenant?.teamId ?? null,
      teamName: tenant?.teamName ?? null,
      wins: homeWins,
      games: homeDecided,
    })
  }
  if (venue) {
    const rec = buildFor(venue, 'venue', venue)
    if (rec && rec.innings >= minInnings) return rec
  }
  return buildFor('Tournament average', 'competition', null)
}

/** Distinct venue names seen in the given competitions (for fuzzy venue matching). */
export function listCompetitionVenues(competitionIds: string[]): string[] {
  const db = getCricketDb()
  if (competitionIds.length === 0) return []
  return (
    db
      .prepare(
        `SELECT DISTINCT venue AS name FROM performances
         WHERE competition_id IN (${competitionIds.map(() => '?').join(', ')})
           AND venue IS NOT NULL AND venue != ''`,
      )
      .all(...competitionIds) as { name: string }[]
  ).map((r) => r.name)
}

/** External dataset team ids mapped to an app team in a tournament. */
export function getExternalTeamIdsForAppTeam(tournamentId: string, appTeamId: string): string[] {
  const db = getCricketDb()
  return (
    db
      .prepare(
        `SELECT team_id AS id FROM team_dim WHERE tournament_id = ? AND app_team_id = ?`,
      )
      .all(tournamentId, appTeamId) as { id: string }[]
  ).map((r) => r.id)
}

function groupRowsToInnings(
  rows: TeamInningsGroupRow[],
  limit: number,
): DbTeamInnings[] {
  return rows
    .map(toTeamInnings)
    .filter((r): r is DbTeamInnings => r != null)
    .sort((a, b) => parsePerfDate(b.date) - parsePerfDate(a.date))
    .slice(0, limit)
}

/** Recent innings across a whole tournament (any team) — newest first. */
export function getCompetitionRecentInnings(
  competitionIds: string[],
  limit = 30,
): DbTeamInnings[] {
  const db = getCricketDb()
  if (competitionIds.length === 0) return []
  const rows = db
    .prepare(
      `SELECT match_date AS matchDate, innings_label AS inningsLabel,
              MAX(team_total) AS teamTotal, MAX(team_wkts) AS teamWkts,
              MAX(opponent) AS opponent, MAX(venue) AS venue,
              MAX(competition_id) AS competitionId,
              SUM(COALESCE(fours, 0)) AS fours, SUM(COALESCE(sixes, 0)) AS sixes,
              source_id AS sourceId
       FROM performances
       WHERE competition_id IN (${competitionIds.map(() => '?').join(', ')})
       GROUP BY source_id, innings_label, match_date`,
    )
    .all(...competitionIds) as TeamInningsGroupRow[]
  return groupRowsToInnings(rows, limit)
}

/** Recent innings at one venue — newest first. */
export function getVenueRecentInnings(
  venue: string,
  competitionIds: string[],
  limit = 30,
): DbTeamInnings[] {
  const db = getCricketDb()
  if (!venue || competitionIds.length === 0) return []
  const rows = db
    .prepare(
      `SELECT match_date AS matchDate, innings_label AS inningsLabel,
              MAX(team_total) AS teamTotal, MAX(team_wkts) AS teamWkts,
              MAX(opponent) AS opponent, MAX(venue) AS venue,
              MAX(competition_id) AS competitionId,
              SUM(COALESCE(fours, 0)) AS fours, SUM(COALESCE(sixes, 0)) AS sixes,
              source_id AS sourceId
       FROM performances
       WHERE venue = ? AND competition_id IN (${competitionIds.map(() => '?').join(', ')})
       GROUP BY source_id, innings_label, match_date`,
    )
    .all(venue, ...competitionIds) as TeamInningsGroupRow[]
  return groupRowsToInnings(rows, limit)
}

/**
 * Recent innings from matches where the team played at its home venues (both
 * sides' innings) — newest first. Ground-chain source when the fixture venue
 * itself can't be matched to the dataset.
 */
export function getTeamHomeRecentInnings(
  externalTeamIds: string[],
  competitionIds: string[],
  limit = 30,
): DbTeamInnings[] {
  const db = getCricketDb()
  const homeVenues = getTeamHomeVenues(externalTeamIds, competitionIds)
  if (homeVenues.length === 0) return []
  const compPlace = competitionIds.map(() => '?').join(', ')
  const teamPlace = externalTeamIds.map(() => '?').join(', ')
  const venuePlace = homeVenues.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT match_date AS matchDate, innings_label AS inningsLabel,
              MAX(team_total) AS teamTotal, MAX(team_wkts) AS teamWkts,
              MAX(opponent) AS opponent, MAX(venue) AS venue,
              MAX(competition_id) AS competitionId,
              SUM(COALESCE(fours, 0)) AS fours, SUM(COALESCE(sixes, 0)) AS sixes,
              source_id AS sourceId
       FROM performances
       WHERE competition_id IN (${compPlace}) AND venue IN (${venuePlace})
         AND source_id IN (SELECT source_id FROM performances WHERE team_id IN (${teamPlace}) AND venue IN (${venuePlace}))
       GROUP BY source_id, innings_label, match_date`,
    )
    .all(...competitionIds, ...homeVenues, ...externalTeamIds, ...homeVenues) as TeamInningsGroupRow[]
  return groupRowsToInnings(rows, limit)
}

export interface DbMatchWickets {
  date: string
  wickets: number
}

/**
 * Total wickets fallen per completed match (both innings summed) — newest first.
 * Optionally restricted to matches involving given teams and/or one venue.
 */
export function getRecentMatchWickets(opts: {
  competitionIds: string[]
  teamIds?: string[]
  venue?: string | null
  venues?: string[]
  limit?: number
}): DbMatchWickets[] {
  const { competitionIds, teamIds, venue } = opts
  const limit = opts.limit ?? 30
  const db = getCricketDb()
  if (competitionIds.length === 0) return []
  const compPlace = competitionIds.map(() => '?').join(', ')
  const filters: string[] = [`competition_id IN (${compPlace})`]
  const params: string[] = [...competitionIds]
  const venueList = [...(venue ? [venue] : []), ...(opts.venues ?? [])]
  if (venueList.length > 0) {
    filters.push(`venue IN (${venueList.map(() => '?').join(', ')})`)
    params.push(...venueList)
  }
  if (teamIds && teamIds.length > 0) {
    const teamPlace = teamIds.map(() => '?').join(', ')
    filters.push(`source_id IN (SELECT source_id FROM performances WHERE team_id IN (${teamPlace}))`)
    params.push(...teamIds)
  }
  const rows = db
    .prepare(
      `SELECT source_id AS sourceId, MAX(match_date) AS date, SUM(wkts) AS wickets FROM (
         SELECT source_id, match_date, innings_label, MAX(CAST(team_wkts AS INTEGER)) AS wkts
         FROM performances
         WHERE ${filters.join(' AND ')}
         GROUP BY source_id, innings_label
       ) GROUP BY source_id`,
    )
    .all(...params) as { sourceId: string | null; date: string | null; wickets: number | null }[]
  return rows
    .filter((r) => r.wickets != null && !Number.isNaN(parsePerfDate(r.date)))
    .map((r) => ({ date: r.date!, wickets: r.wickets! }))
    .sort((a, b) => parsePerfDate(b.date) - parsePerfDate(a.date))
    .slice(0, limit)
}
