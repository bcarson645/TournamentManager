import { NextResponse } from 'next/server'
import { getCricketDb, getCricketDbOpenError } from '../../../../lib/cricketDb/client'
import { getCricketDbDir, getCricketDbPath, isServerlessDeploy } from '../../../../lib/cricketDb/path'
import { getDbStats } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    getCricketDb()
    const stats = getDbStats()
    return NextResponse.json({
      ok: true,
      dbPath: getCricketDbPath(),
      dbDir: getCricketDbDir(),
      serverless: isServerlessDeploy(),
      performances: stats.performances,
      players: stats.players,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database unavailable'
    return NextResponse.json(
      {
        ok: false,
        error: message,
        cachedError: getCricketDbOpenError(),
        dbPath: getCricketDbPath(),
        dbDir: getCricketDbDir(),
        serverless: isServerlessDeploy(),
        hint: isServerlessDeploy()
          ? 'On Vercel, upload CSV via Player & Team Management after deploy (DB lives in /tmp). For a persistent DB, host on a VM/Docker and set CRICKET_DB_PATH.'
          : 'Ensure the data folder is writable or set CRICKET_DB_PATH to an absolute path.',
      },
      { status: 503 },
    )
  }
}
