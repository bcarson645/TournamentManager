import type Database from 'better-sqlite3'

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name)
  return row != null
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as { name: string }[]
  return cols.some((c) => c.name === column)
}

/** Add columns / tables introduced after first deploy (safe on old cricket.db files). */
function migrateCricketSchema(db: Database.Database): void {
  if (tableExists(db, 'players') && !columnExists(db, 'players', 'identity_key')) {
    db.exec(`ALTER TABLE players ADD COLUMN identity_key TEXT`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_id_merges (
      player_id TEXT PRIMARY KEY,
      canonical_player_id TEXT NOT NULL,
      identity_key TEXT NOT NULL,
      merged_at TEXT NOT NULL
    );
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_player_identity ON players(identity_key)`)
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_merge_canonical ON player_id_merges(canonical_player_id)`,
  )
}

export function initCricketSchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS performances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT,
      match_date TEXT,
      format TEXT,
      max_overs TEXT,
      venue TEXT,
      host TEXT,
      team_name TEXT,
      opponent TEXT,
      innings_label TEXT,
      team_total TEXT,
      team_wkts TEXT,
      bat_order TEXT,
      player_name TEXT NOT NULL,
      dismissal TEXT,
      bat_runs INTEGER,
      bat_balls INTEGER,
      fours INTEGER,
      sixes INTEGER,
      bowl_overs TEXT,
      bowl_maidens TEXT,
      bowl_runs INTEGER,
      bowl_wickets INTEGER,
      player_id TEXT NOT NULL,
      competition_id TEXT,
      format_id TEXT,
      venue_id TEXT,
      host_id TEXT,
      team_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_perf_player ON performances(player_id);
    CREATE INDEX IF NOT EXISTS idx_perf_competition ON performances(competition_id);
    CREATE INDEX IF NOT EXISTS idx_perf_team ON performances(team_id);
    CREATE INDEX IF NOT EXISTS idx_perf_date ON performances(match_date);

    CREATE TABLE IF NOT EXISTS players (
      player_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      identity_key TEXT,
      appearances INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competition_dim (
      competition_id TEXT PRIMARY KEY,
      label TEXT,
      row_count INTEGER NOT NULL DEFAULT 0,
      tournament_id TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS team_dim (
      team_id TEXT PRIMARY KEY,
      label TEXT,
      row_count INTEGER NOT NULL DEFAULT 0,
      tournament_id TEXT,
      app_team_id TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS player_aliases (
      app_name TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imported_at TEXT NOT NULL,
      filename TEXT,
      rows_imported INTEGER NOT NULL,
      replace_mode INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS custom_tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT,
      gender TEXT NOT NULL DEFAULT 'men',
      format TEXT NOT NULL DEFAULT 't20',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES custom_tournaments(id)
    );
  `)

  migrateCricketSchema(db)
}
