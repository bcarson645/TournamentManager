import fs from 'fs'
import path from 'path'

/**
 * Writable directory for cricket.db.
 * - Local dev: <project>/data
 * - Vercel / read-only cwd: /tmp/tournament-manager
 * - Override: CRICKET_DB_PATH (full path to .db file)
 * - Override dir only: CRICKET_DB_DIR
 */
export function getCricketDbDir(): string {
  if (process.env.CRICKET_DB_DIR) {
    return process.env.CRICKET_DB_DIR
  }
  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'tournament-manager')
  }
  return path.join(process.cwd(), 'data')
}

export function getCricketDbPath(): string {
  if (process.env.CRICKET_DB_PATH) {
    return process.env.CRICKET_DB_PATH
  }

  const dir = getCricketDbDir()
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Cannot create database directory "${dir}". Set CRICKET_DB_DIR or CRICKET_DB_PATH to a writable folder. (${msg})`,
    )
  }

  return path.join(dir, 'cricket.db')
}

/** If a bundled/seed DB exists, copy it to the writable path (once). */
export function ensureCricketDbFile(dbPath: string): void {
  if (fs.existsSync(dbPath)) return

  const seeds: string[] = []
  if (process.env.CRICKET_DB_SEED_PATH) {
    seeds.push(process.env.CRICKET_DB_SEED_PATH)
  }
  seeds.push(path.join(process.cwd(), 'data', 'cricket.db'))
  seeds.push(path.join(process.cwd(), 'cricket.db'))

  for (const seed of seeds) {
    if (!seed || seed === dbPath || !fs.existsSync(seed)) continue
    try {
      fs.copyFileSync(seed, dbPath)
      return
    } catch {
      /* try next seed */
    }
  }
}

export function isServerlessDeploy(): boolean {
  return process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME
}
