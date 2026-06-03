import Database from 'better-sqlite3'
import { getCricketDbPath } from './path'
import { initCricketSchema } from './schema'

let db: Database.Database | null = null

export function getCricketDb(): Database.Database {
  if (!db) {
    const conn = new Database(getCricketDbPath())
    initCricketSchema(conn)
    db = conn
  }
  return db
}
