import { NextResponse } from 'next/server'
import { importPerformancesCsv } from '../../../../lib/cricketDb/importCsv'

export const runtime = 'nodejs'

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
    const message = e instanceof Error ? e.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
