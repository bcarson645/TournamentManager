import { NextResponse } from 'next/server'
import { listPerformances } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') ?? 1)
    const pageSize = Number(searchParams.get('pageSize') ?? 50)
    const playerId = searchParams.get('playerId') ?? undefined
    const competitionId = searchParams.get('competitionId') ?? undefined
    const data = listPerformances({ page, pageSize, playerId, competitionId })
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to list performances'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
