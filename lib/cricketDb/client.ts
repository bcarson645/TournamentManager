import Database from 'better-sqlite3'
import {
  ensureCricketDbFile,
  getCricketDbPath,
  isBundledCricketDbAvailable,
  isCricketDbReadonly,
  shouldUseBundledCricketDb,
} from './path'
import { initCricketSchema } from './schema'

let db: Database.Database | null = null
let openError: string | null = null

export function getCricketDbOpenError(): string | null {
  return openError
}

export function getCricketDbMode(): { readonly: boolean; bundled: boolean } {
  return { readonly: isCricketDbReadonly(), bundled: shouldUseBundledCricketDb() }
}

export function getCricketDb(): Database.Database {
  if (openError) {
    throw new Error(openError)
  }
  if (!db) {
    const dbPath = getCricketDbPath()
    const readonly = isCricketDbReadonly()
    try {
      if (readonly) {
        if (!isBundledCricketDbAvailable()) {
          throw new Error(
            `Built-in stats database missing at "${dbPath}". Run npm run bundle-db locally and commit data/bundled-cricket.db.`,
          )
        }
      } else {
        ensureCricketDbFile(dbPath)
      }

      const conn = new Database(dbPath, readonly ? { readonly: true } : undefined)
      if (readonly) {
        const row = conn
          .prepare(
            `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'performances'`,
          )
          .get()
        if (!row) {
          throw new Error('Bundled database is invalid (missing performances table).')
        }
      } else {
        conn.pragma('journal_mode = WAL')
        initCricketSchema(conn)
      }
      db = conn
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      openError =
        detail.includes('unable to open database') || detail.includes('SQLITE')
          ? readonly
            ? `Cannot open bundled stats at "${dbPath}". (${detail})`
            : `Cannot open SQLite database at "${dbPath}". Set CRICKET_DB_PATH to a writable folder or use bundled stats. (${detail})`
          : `Database error: ${detail}`
      throw new Error(openError)
    }
  }
  return db
}
