/** Minimal RFC-style CSV row parser (handles quoted fields). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',' || ch === '\t') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

export function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows: string[][] = []
  for (const line of lines) {
    if (!line.trim()) continue
    rows.push(parseCsvLine(line))
  }
  return rows
}

function parseIntOrNull(v: string | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Column positions for the T20 performance export (duplicate headers resolved by index).
 * 0:ID 1:Date 2:Format … 15:Runs(bat) … 23:Runs(bowl) 38:PlayerID 39:CompetitionID …
 */
export interface ParsedPerformanceRow {
  sourceId: string | null
  matchDate: string | null
  format: string | null
  maxOvers: string | null
  venue: string | null
  host: string | null
  teamName: string | null
  opponent: string | null
  inningsLabel: string | null
  teamTotal: string | null
  teamWkts: string | null
  batOrder: string | null
  playerName: string
  dismissal: string | null
  batRuns: number | null
  batBalls: number | null
  fours: number | null
  sixes: number | null
  bowlOvers: string | null
  bowlMaidens: string | null
  bowlRuns: number | null
  bowlWickets: number | null
  playerId: string
  competitionId: string | null
  formatId: string | null
  venueId: string | null
  hostId: string | null
  teamId: string | null
}

export function rowToPerformance(cells: string[]): ParsedPerformanceRow | null {
  if (cells.length < 39) return null
  const playerId = cells[38]?.trim()
  const playerName = cells[13]?.trim()
  if (!playerId || !playerName) return null

  return {
    sourceId: cells[0] || null,
    matchDate: cells[1] || null,
    format: cells[2] || null,
    maxOvers: cells[3] || null,
    venue: cells[4] || null,
    host: cells[5] || null,
    teamName: cells[6] || null,
    opponent: cells[7] || null,
    inningsLabel: cells[8] || null,
    teamTotal: cells[9] || null,
    teamWkts: cells[10] || null,
    batOrder: cells[12] || null,
    playerName,
    dismissal: cells[14] || null,
    batRuns: parseIntOrNull(cells[15]),
    batBalls: parseIntOrNull(cells[16]),
    fours: parseIntOrNull(cells[17]),
    sixes: parseIntOrNull(cells[18]),
    bowlOvers: cells[19] || null,
    bowlMaidens: cells[20] || null,
    bowlRuns: parseIntOrNull(cells[23]),
    bowlWickets: parseIntOrNull(cells[24]),
    playerId,
    competitionId: cells[39] || null,
    formatId: cells[40] || null,
    venueId: cells[41] || null,
    hostId: cells[42] || null,
    teamId: cells[43] || null,
  }
}
