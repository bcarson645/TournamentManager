import { NextResponse } from 'next/server'
import { getCricketDb, getCricketDbMode, getCricketDbOpenError } from '../../../../lib/cricketDb/client'
import { getBundledSeedCandidates, resolveBundledSeedPath } from '../../../../lib/cricketDb/bundledDb'
import {
  getCricketDbDir,
  getCricketDbPath,
  isBundledCricketDbAvailable,
  isServerlessDeploy,
} from '../../../../lib/cricketDb/path'
import { getDbStats } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    getCricketDb()
    const stats = getDbStats()
    const mode = getCricketDbMode()
    return NextResponse.json({
      ok: true,
      dbPath: getCricketDbPath(),
      dbDir: getCricketDbDir(),
      serverless: isServerlessDeploy(),
      bundled: mode.bundled,
      readonly: mode.readonly,
      bundledFilePresent: isBundledCricketDbAvailable(),
      bundledSeedPath: resolveBundledSeedPath(),
      bundledSeedCandidates: getBundledSeedCandidates(),
      performances: stats.performances,
      players: stats.players,
      aliases: stats.aliases,
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
          ? 'Deploy should include data/bundled-cricket.db (npm run bundle-db). Without it, stats APIs will fail on Vercel.'
          : 'Ensure the data folder is writable or set CRICKET_DB_PATH to an absolute path.',
      },
      { status: 503 },
    )
  }
}
