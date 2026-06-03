import { NextResponse } from 'next/server'
import { hasKnownStatsForPlayer } from '../../../../app/data/playerProfile'
import { getSquadStatSeedForAppName } from '../../../../lib/cricketDb/playerProfileBridge'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { names?: string[] }
    const names = [...new Set((body.names ?? []).map((n) => n.trim()).filter(Boolean))]
    const stats: Record<string, ReturnType<typeof getSquadStatSeedForAppName>> = {}

    for (const name of names) {
      if (hasKnownStatsForPlayer(name)) continue
      const seed = getSquadStatSeedForAppName(name, true)
      if (seed) stats[name] = seed
    }

    return NextResponse.json({ stats })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load squad stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
