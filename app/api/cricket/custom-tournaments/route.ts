import { NextResponse } from 'next/server'
import { createCustomTournament, listCustomTournaments } from '../../../../lib/cricketDb/customTournaments'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json({ tournaments: listCustomTournaments() })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name: string
      country?: string
      linkCompetitionId?: string
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }
    const t = createCustomTournament({
      name: body.name,
      country: body.country,
      linkCompetitionId: body.linkCompetitionId,
    })
    return NextResponse.json({ tournament: t })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
