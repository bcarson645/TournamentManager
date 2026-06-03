import { NextResponse } from 'next/server'
import { getPlayerT20Aggregate } from '../../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const profile = getPlayerT20Aggregate(decodeURIComponent(id))
    if (!profile) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    return NextResponse.json(profile)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load player'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
