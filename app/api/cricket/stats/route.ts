import { NextResponse } from 'next/server'
import { getDbStats } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json(getDbStats())
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read database'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
