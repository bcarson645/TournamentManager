import { NextResponse } from 'next/server'
import { getProfileForPlayer, makeDefaultProfile } from '../../../../app/data/playerProfile'
import {
  aggregateToPlayerProfile,
  getDatasetPlayerIdForAppName,
} from '../../../../lib/cricketDb/playerProfileBridge'
import { getPlayerT20Aggregate } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')?.trim()
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const base = getProfileForPlayer(name)
    const playerId = getDatasetPlayerIdForAppName(name, true)
    if (!playerId) {
      return NextResponse.json({ ...base, source: 'static' })
    }

    const agg = getPlayerT20Aggregate(playerId)
    if (!agg) {
      return NextResponse.json({ ...base, source: 'static' })
    }

    const fromDb = aggregateToPlayerProfile(agg)
    const merged = {
      ...makeDefaultProfile(),
      ...base,
      ...fromDb,
      careerBatting: { ...base.careerBatting, ...fromDb.careerBatting },
      careerBowling: { ...base.careerBowling, ...fromDb.careerBowling },
      recentInnings: fromDb.recentInnings?.length ? fromDb.recentInnings : base.recentInnings,
      source: 'dataset',
      datasetPlayerId: agg.playerId,
      datasetDisplayName: agg.displayName,
    }
    return NextResponse.json(merged)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
