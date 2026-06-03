import { NextResponse } from 'next/server'
import { cricketApiErrorResponse } from '../../../../lib/api/cricketApiError'
import { importPerformancesCsv } from '../../../../lib/cricketDb/importCsv'

export const runtime = 'nodejs'

/** Large CSV uploads (Vercel default body limit ~4.5MB). */
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    const replace = form.get('replace') !== '0'
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    const text = await file.text()
    const result = importPerformancesCsv(text, file.name, replace)
    return NextResponse.json(result)
  } catch (e) {
    return cricketApiErrorResponse(e, 'Import failed')
  }
}
