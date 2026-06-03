import { NextResponse } from 'next/server'
import { listCustomTeams } from '../../../../lib/cricketDb/customTournaments'
import { TEAMS } from '../../../../app/data/teams'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const tournamentId = new URL(req.url).searchParams.get('tournamentId')
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })
    }
    const builtin = (TEAMS[tournamentId] ?? []).map((t) => ({ id: t.id, name: t.name, source: 'builtin' }))
    const custom = listCustomTeams(tournamentId).map((t) => ({
      id: t.id,
      name: t.name,
      source: 'custom',
    }))
    return NextResponse.json({ teams: [...builtin, ...custom] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list teams'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
