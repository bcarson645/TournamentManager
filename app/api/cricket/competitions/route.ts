import { NextResponse } from 'next/server'
import { listCompetitions, setCompetitionTournament } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json({ competitions: listCompetitions() })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list competitions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { competitionId: string; tournamentId: string | null }
    if (!body.competitionId) {
      return NextResponse.json({ error: 'competitionId required' }, { status: 400 })
    }
    setCompetitionTournament(body.competitionId, body.tournamentId ?? null)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
