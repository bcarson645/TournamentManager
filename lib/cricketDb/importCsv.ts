import { parseCsv, rowToPerformance } from './csvParse'
import {
  clearPerformancesForImport,
  finalizePerformanceImport,
  importPerformanceChunk,
  type ImportResult,
} from './importPerformances'

export function importPerformancesCsv(
  csvText: string,
  filename: string,
  replace = true,
): ImportResult {
  const allRows = parseCsv(csvText)
  if (allRows.length === 0) {
    return {
      rowsImported: 0,
      skipped: 0,
      autoMap: {
        competitionsMapped: 0,
        teamsMapped: 0,
        playersMapped: 0,
        unmappedCompetitions: 0,
      },
    }
  }

  let startIdx = 0
  const first = allRows[0]![0]?.toLowerCase() ?? ''
  if (first === 'id' || first.includes('player')) startIdx = 1

  const parsedRows = []
  let skipped = 0
  for (let i = startIdx; i < allRows.length; i++) {
    const parsed = rowToPerformance(allRows[i]!)
    if (!parsed) {
      skipped++
      continue
    }
    parsedRows.push(parsed)
  }

  if (replace) clearPerformancesForImport()
  const { imported } = importPerformanceChunk(parsedRows)

  return finalizePerformanceImport(filename, { rowsImported: imported, skipped })
}
