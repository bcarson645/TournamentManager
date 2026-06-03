import { NextResponse } from 'next/server'
import { cricketApiErrorResponse } from '../../../../lib/api/cricketApiError'
import type { ParsedPerformanceRow } from '../../../../lib/cricketDb/csvParse'
import { getCricketDb } from '../../../../lib/cricketDb/client'
import {
  clearPerformancesForImport,
  finalizePerformanceImport,
  importPerformanceChunk,
} from '../../../../lib/cricketDb/importPerformances'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      filename?: string
      replace?: boolean
      finalize?: boolean
      chunkIndex?: number
      rows?: ParsedPerformanceRow[]
    }

    const rows = body.rows ?? []
    if (rows.length === 0 && !body.finalize) {
      return NextResponse.json({ error: 'No rows in chunk' }, { status: 400 })
    }

    if (body.replace) {
      clearPerformancesForImport()
    }

    let imported = 0
    if (rows.length > 0) {
      imported = importPerformanceChunk(rows).imported
    }

    if (body.finalize) {
      const filename = body.filename ?? 'import.csv'
      const count = (getCricketDb().prepare('SELECT COUNT(*) AS c FROM performances').get() as { c: number })
        .c
      const fin = finalizePerformanceImport(filename, { rowsImported: count, skipped: 0 })
      return NextResponse.json(fin)
    }

    return NextResponse.json({ imported, chunkIndex: body.chunkIndex ?? 0 })
  } catch (e) {
    return cricketApiErrorResponse(e, 'Chunk import failed')
  }
}
