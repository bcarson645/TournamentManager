import Database from 'better-sqlite3'
import { ensureCricketDbFile, getCricketDbPath } from './path'
import { initCricketSchema } from './schema'

let db: Database.Database | null = null
let openError: string | null = null

export function getCricketDbOpenError(): string | null {
  return openError
}

export function getCricketDb(): Database.Database {
  if (openError) {
    throw new Error(openError)
  }
  if (!db) {
    const dbPath = getCricketDbPath()
    try {
      ensureCricketDbFile(dbPath)
      const conn = new Database(dbPath)
      conn.pragma('journal_mode = WAL')
      initCricketSchema(conn)
      db = conn
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      openError =
        detail.includes('unable to open database') || detail.includes('SQLITE')
          ? `Cannot open SQLite database at "${dbPath}". On cloud hosts use CRICKET_DB_PATH pointing to /tmp (writable). Import your CSV after deploy. (${detail})`
          : `Database error: ${detail}`
      throw new Error(openError)
    }
  }
  return db
}
