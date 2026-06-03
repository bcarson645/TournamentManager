import { parseCsv, rowToPerformance, type ParsedPerformanceRow } from './csvParse'
import { fetchJson } from '../api/fetchJson'
import type { ImportResult } from './importPerformances'

/** Stay under Vercel ~4.5MB request limit (JSON is larger than raw CSV). */
export const IMPORT_CHUNK_SIZE = 2000

export const SINGLE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024

export function parseCsvToPerformances(csvText: string): {
  rows: ParsedPerformanceRow[]
  skipped: number
} {
  const allRows = parseCsv(csvText)
  if (allRows.length === 0) return { rows: [], skipped: 0 }

  let startIdx = 0
  const first = allRows[0]![0]?.toLowerCase() ?? ''
  if (first === 'id' || first.includes('player')) startIdx = 1

  const rows: ParsedPerformanceRow[] = []
  let skipped = 0
  for (let i = startIdx; i < allRows.length; i++) {
    const parsed = rowToPerformance(allRows[i]!)
    if (!parsed) {
      skipped++
      continue
    }
    rows.push(parsed)
  }
  return { rows, skipped }
}

export type ImportProgressCallback = (done: number, total: number, phase: string) => void

interface ChunkResponse {
  imported?: number
  chunkIndex?: number
  rowsImported?: number
  skipped?: number
  autoMap?: ImportResult['autoMap']
}

/**
 * Chunked JSON import for Vercel (avoids FUNCTION_PAYLOAD_TOO_LARGE on full CSV upload).
 */
export async function importCsvFileChunked(
  file: File,
  replace: boolean,
  onProgress?: ImportProgressCallback,
): Promise<ImportResult> {
  const text = await file.text()
  const { rows, skipped: parseSkipped } = parseCsvToPerformances(text)
  if (rows.length === 0) {
    return { rowsImported: 0, skipped: parseSkipped }
  }

  const chunks: ParsedPerformanceRow[][] = []
  for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + IMPORT_CHUNK_SIZE))
  }

  let lastResult: ImportResult | null = null

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length, `Uploading batch ${i + 1} of ${chunks.length}`)

    const result = await fetchJson<ChunkResponse>('/api/cricket/import-chunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        replace: replace && i === 0,
        finalize: i === chunks.length - 1,
        chunkIndex: i,
        rows: chunks[i],
      }),
    })

    if (!result.ok) {
      const hint =
        result.status === 413
          ? ' Batch still too large — reduce IMPORT_CHUNK_SIZE or split the CSV.'
          : ''
      throw new Error((result.error ?? 'Import batch failed') + hint)
    }

    const data = result.data!
    if (data.rowsImported != null) {
      lastResult = {
        rowsImported: data.rowsImported,
        skipped: parseSkipped + (data.skipped ?? 0),
        autoMap: data.autoMap,
      }
    }
  }

  return (
    lastResult ?? {
      rowsImported: rows.length,
      skipped: parseSkipped,
    }
  )
}
