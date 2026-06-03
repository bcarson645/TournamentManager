import type Database from 'better-sqlite3'
import type { ParsedPerformanceRow } from './csvParse'
import { runAutoMap } from './autoMap'
import { rebuildPlayerMerges } from './playerMerges'
import { mapCompetitionsToBuiltinTournaments } from './tournamentMap'
import { getCricketDb } from './client'
import { assertCricketDbWritable } from './writeGuard'

const INSERT_PERF = `
  INSERT INTO performances (
    source_id, match_date, format, max_overs, venue, host, team_name, opponent,
    innings_label, team_total, team_wkts, bat_order, player_name, dismissal,
    bat_runs, bat_balls, fours, sixes, bowl_overs, bowl_maidens, bowl_runs, bowl_wickets,
    player_id, competition_id, format_id, venue_id, host_id, team_id
  ) VALUES (
    @sourceId, @matchDate, @format, @maxOvers, @venue, @host, @teamName, @opponent,
    @inningsLabel, @teamTotal, @teamWkts, @batOrder, @playerName, @dismissal,
    @batRuns, @batBalls, @fours, @sixes, @bowlOvers, @bowlMaidens, @bowlRuns, @bowlWickets,
    @playerId, @competitionId, @formatId, @venueId, @hostId, @teamId
  )
`

export interface ImportAutoMapSummary {
  competitionsMapped: number
  teamsMapped: number
  playersMapped: number
  unmappedCompetitions: number
  playerMerges?: { identityGroups: number; mergedPlayerIds: number; canonicalPlayers: number }
  tournamentMap?: { mapped: number; unmapped: number }
}

export interface ImportResult {
  rowsImported: number
  skipped: number
  autoMap?: ImportAutoMapSummary
}

function refreshDimensions(db: Database.Database): void {
  db.exec(`DELETE FROM players`)
  db.exec(`
    INSERT INTO players (player_id, display_name, identity_key, appearances, updated_at)
    SELECT player_id, MAX(player_name), NULL, COUNT(*), datetime('now')
    FROM performances
    GROUP BY player_id
  `)

  db.exec(`DELETE FROM competition_dim`)
  db.exec(`
    INSERT INTO competition_dim (competition_id, label, row_count, tournament_id, notes)
    SELECT p.competition_id,
           COALESCE(
             (SELECT GROUP_CONCAT(sub.name, ', ')
              FROM (
                SELECT team_name AS name FROM performances p2
                WHERE p2.competition_id = p.competition_id AND team_name IS NOT NULL AND team_name != ''
                GROUP BY team_name ORDER BY COUNT(*) DESC LIMIT 4
              ) sub),
             p.competition_id
           ),
           COUNT(*),
           NULL,
           NULL
    FROM performances p
    WHERE p.competition_id IS NOT NULL AND p.competition_id != ''
    GROUP BY p.competition_id
  `)

  db.exec(`DELETE FROM team_dim`)
  db.exec(`
    INSERT INTO team_dim (team_id, label, row_count, tournament_id, app_team_id, notes)
    SELECT team_id,
           MAX(COALESCE(team_name, team_id)),
           COUNT(*),
           NULL,
           NULL,
           NULL
    FROM performances
    WHERE team_id IS NOT NULL AND team_id != ''
    GROUP BY team_id
  `)
}

function insertRows(db: Database.Database, rows: ParsedPerformanceRow[]): { imported: number; skipped: number } {
  const insert = db.prepare(INSERT_PERF)
  let imported = 0
  let skipped = 0
  const run = db.transaction(() => {
    for (const parsed of rows) {
      insert.run({
        sourceId: parsed.sourceId,
        matchDate: parsed.matchDate,
        format: parsed.format,
        maxOvers: parsed.maxOvers,
        venue: parsed.venue,
        host: parsed.host,
        teamName: parsed.teamName,
        opponent: parsed.opponent,
        inningsLabel: parsed.inningsLabel,
        teamTotal: parsed.teamTotal,
        teamWkts: parsed.teamWkts,
        batOrder: parsed.batOrder,
        playerName: parsed.playerName,
        dismissal: parsed.dismissal,
        batRuns: parsed.batRuns,
        batBalls: parsed.batBalls,
        fours: parsed.fours,
        sixes: parsed.sixes,
        bowlOvers: parsed.bowlOvers,
        bowlMaidens: parsed.bowlMaidens,
        bowlRuns: parsed.bowlRuns,
        bowlWickets: parsed.bowlWickets,
        playerId: parsed.playerId,
        competitionId: parsed.competitionId,
        formatId: parsed.formatId,
        venueId: parsed.venueId,
        hostId: parsed.hostId,
        teamId: parsed.teamId,
      })
      imported++
    }
  })
  run()
  return { imported, skipped }
}

/** Clear table when starting a full replace import. */
export function clearPerformancesForImport(): void {
  assertCricketDbWritable()
  getCricketDb().exec('DELETE FROM performances')
}

export function importPerformanceChunk(rows: ParsedPerformanceRow[]): { imported: number; skipped: number } {
  assertCricketDbWritable()
  const db = getCricketDb()
  return insertRows(db, rows)
}

export function finalizePerformanceImport(
  filename: string,
  totals: { rowsImported: number; skipped: number },
): ImportResult {
  assertCricketDbWritable()
  const db = getCricketDb()
  refreshDimensions(db)
  db.prepare(
    `INSERT INTO import_log (imported_at, filename, rows_imported, replace_mode) VALUES (datetime('now'), ?, ?, 1)`,
  ).run(filename, totals.rowsImported)

  const playerMerges = rebuildPlayerMerges()
  const tournamentMap = mapCompetitionsToBuiltinTournaments(true)
  const auto = runAutoMap({ apply: true, skipPrep: true })

  return {
    rowsImported: totals.rowsImported,
    skipped: totals.skipped,
    autoMap: {
      competitionsMapped: auto.competitionsMapped + tournamentMap.mapped,
      teamsMapped: auto.teamsMapped,
      playersMapped: auto.playersMapped,
      unmappedCompetitions: auto.unmappedCompetitions.length,
      playerMerges,
      tournamentMap: { mapped: tournamentMap.mapped, unmapped: tournamentMap.unmapped.length },
    },
  }
}
