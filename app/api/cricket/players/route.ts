import { NextResponse } from 'next/server'
import { searchPlayers } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? ''
    const limit = Number(searchParams.get('limit') ?? 25)
    if (q.trim().length < 1) {
      return NextResponse.json({ players: [] })
    }
    return NextResponse.json({ players: searchPlayers(q, limit) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
