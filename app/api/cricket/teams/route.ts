import { NextResponse } from 'next/server'
import { listExternalTeams, setExternalTeamMapping } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json({ teams: listExternalTeams() })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list teams'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      teamId: string
      tournamentId: string | null
      appTeamId: string | null
    }
    if (!body.teamId) {
      return NextResponse.json({ error: 'teamId required' }, { status: 400 })
    }
    setExternalTeamMapping(body.teamId, body.tournamentId ?? null, body.appTeamId ?? null)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
