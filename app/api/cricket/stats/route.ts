import { NextResponse } from 'next/server'
import { cricketApiErrorResponse } from '../../../../lib/api/cricketApiError'
import { getDbStats } from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json(getDbStats())
  } catch (e) {
    return cricketApiErrorResponse(e, 'Failed to read database')
  }
}
