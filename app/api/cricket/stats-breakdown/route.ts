import { NextResponse } from 'next/server'
import {
  getPlayerStatsBreakdown,
  type StatsScope,
} from '../../../../lib/cricketDb/playerStatsBreakdown'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')?.trim()
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const contextTournamentId = searchParams.get('contextTournamentId') || null
    const scope = (searchParams.get('scope') || 'current') as StatsScope

    const breakdown = getPlayerStatsBreakdown(name, contextTournamentId, scope)
    if (!breakdown) {
      return NextResponse.json({ error: 'No dataset player found for this name' }, { status: 404 })
    }
    return NextResponse.json(breakdown)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load stats breakdown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
