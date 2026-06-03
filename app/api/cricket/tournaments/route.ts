import { NextResponse } from 'next/server'
import { TOURNAMENTS } from '../../../../app/data/tournaments'
import { createCustomTournament, listCustomTournaments } from '../../../../lib/cricketDb/customTournaments'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const builtin = TOURNAMENTS.t20.men.map((t) => ({
      id: t.id,
      name: t.name,
      country: t.country ?? null,
      gender: 'men' as const,
      format: 't20' as const,
      source: 'builtin' as const,
    }))
    const custom = listCustomTournaments().map((t) => ({
      id: t.id,
      name: t.name,
      country: t.country,
      gender: t.gender,
      format: t.format,
      source: 'custom' as const,
    }))
    return NextResponse.json({ tournaments: [...builtin, ...custom] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list tournaments'
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
    const created = createCustomTournament({
      name: body.name,
      country: body.country,
      linkCompetitionId: body.linkCompetitionId,
    })
    return NextResponse.json({ tournament: { ...created, source: 'custom' } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create tournament'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
