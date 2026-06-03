import { NextResponse } from 'next/server'
import { runAutoMap } from '../../../../lib/cricketDb/autoMap'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const apply = searchParams.get('apply') !== '0'
    const result = runAutoMap({ apply })
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Auto-map failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
