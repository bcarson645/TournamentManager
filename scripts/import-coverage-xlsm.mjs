import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const xlsmPath = process.argv[2] || 'c:/Users/b.carson/Downloads/Coverage Schedule 2.2.xlsm'
const outPath = path.join(__dirname, '../app/data/coverageScheduleImported.ts')

const DAILY_LEAD_TRADERS = ['Collinson', 'Moore', 'Cooper', 'Dyer']

function excelDateToIso(serial) {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date(Date.UTC(1899, 11, 30 + serial))
  return d.toISOString().slice(0, 10)
}

function formatDayLabel(iso) {
  const d = new Date(iso + 'T12:00:00Z')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

function formatTime(hour) {
  const h = typeof hour === 'number' ? hour : parseInt(String(hour), 10)
  if (Number.isNaN(h)) return '00:00'
  return `${String(h).padStart(2, '0')}:00`
}

function coverageModeFromLabel(label) {
  const l = String(label || '').toLowerCase()
  if (l.includes('not covered')) return 'not-covered'
  if (l.includes('simulated')) return 'standard'
  if (l.includes('premium')) return 'live'
  if (l.includes('standard')) return 'standard'
  return 'standard'
}

function lifecycleFromRow(trader, markets, priceCheck) {
  if (String(priceCheck || '').trim()) return 'price-check'
  if (markets && markets > 0) return 'published'
  if (trader && trader !== 'Automated') return 'prepping'
  return 'prepping'
}

function tierFromCode(code, coverageLabel) {
  if (code === 'SRL' || coverageLabel === 'Simulated') return 3
  if (['T20I', 'ODI', 'A TEST', 'CPL', 'TEST', 'ASH'].includes(code)) return 1
  if (['ILT20', 'PAK', 'YODI', 'LA', 'ODA', 'AU50', 'ECN', 'H100', 'BBL', 'IPL'].includes(code)) return 2
  return 2
}

function fixtureId(date, code, time, match) {
  return `${date}-${code}-${time}-${match}`.replace(/[^a-zA-Z0-9-]/g, '-')
}

function normalizeTrader(value) {
  const trader = String(value || '').trim()
  if (!trader || trader === '-' || trader === 'Automated') return null
  return trader
}

function dedupeKey(dateIso, match) {
  return `${dateIso}|${String(match).trim().toUpperCase()}`
}

function parseMatchesSheet(wb) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Matches, { header: 1, defval: '' })
  const fixtures = []

  for (const row of rows.slice(9)) {
    const dateIso = excelDateToIso(row[3])
    const match = String(row[7] || '').trim()
    if (!dateIso || !match) continue

    const home = String(row[5] || '').trim() || undefined
    const away = String(row[6] || '').trim() || undefined
    const code = String(row[8] || 'UNK').trim()
    const tournamentName = String(row[9] || code).trim()
    const time = formatTime(row[4])
    const coverageLabel = String(row[1] || row[2] || 'Standard').trim()
    const trader = normalizeTrader(row[19])
    const markets = typeof row[23] === 'number' ? row[23] : parseInt(String(row[23]), 10) || 0
    const priceCheck = String(row[26] || '').trim()

    fixtures.push({
      dedupeKey: dedupeKey(dateIso, match),
      source: 'Matches',
      dateIso,
      code,
      tournamentName,
      match,
      home,
      away,
      time,
      trader,
      coverageLabel,
      gap: !trader,
      format: String(row[10] || '').trim() || undefined,
      coverageMode: coverageModeFromLabel(coverageLabel),
      lifecycle: lifecycleFromRow(trader, markets, priceCheck),
      marketsSent: markets || 0,
      marketsTotal: markets || undefined,
      needsPriceCheck: Boolean(priceCheck),
      note: String(row[27] || '').trim() || undefined,
      id: fixtureId(dateIso, code, time, match),
    })
  }

  return fixtures
}

function buildMatchesLookup(matchesFixtures) {
  const lookup = new Map()
  for (const fixture of matchesFixtures) {
    lookup.set(fixture.dedupeKey, {
      dateIso: fixture.dateIso,
      match: fixture.match,
      home: fixture.home,
      away: fixture.away,
      code: fixture.code,
      tournamentName: fixture.tournamentName,
      time: fixture.time,
      coverageLabel: fixture.coverageLabel,
      trader: fixture.trader,
      format: fixture.format,
      markets: fixture.marketsSent,
      priceCheck: fixture.needsPriceCheck ? 'yes' : '',
      note: fixture.note,
    })
  }
  return lookup
}

function parseCopySheet(wb, matchesLookup) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Copy, { header: 1, defval: '' })
  const fixtures = []

  for (const row of rows.slice(2)) {
    const dateIso = excelDateToIso(row[3])
    const match = String(row[7] || '').trim()
    if (!dateIso || !match) continue

    const enriched = matchesLookup.get(dedupeKey(dateIso, match))
    const home = enriched?.home
    const away = enriched?.away
    const code = String(row[8] || 'UNK').trim()
    const tournamentName = String(row[9] || code).trim()
    const time = formatTime(row[4])
    const coverageLabel = String(row[1] || row[2] || 'Standard').trim()
    const trader = normalizeTrader(row[14])
    const markets = typeof row[20] === 'number' ? row[20] : parseInt(String(row[20]), 10) || 0

    fixtures.push({
      dedupeKey: dedupeKey(dateIso, match),
      source: 'Copy',
      dateIso,
      code,
      tournamentName,
      match,
      home,
      away,
      time,
      trader,
      coverageLabel,
      gap: !trader,
      format: String(row[10] || '').trim() || undefined,
      coverageMode: coverageModeFromLabel(coverageLabel),
      lifecycle: lifecycleFromRow(trader, markets, ''),
      marketsSent: markets || 0,
      marketsTotal: markets || undefined,
      needsPriceCheck: false,
      note: undefined,
      id: fixtureId(dateIso, code, time, match),
    })
  }

  return fixtures
}

function parsePmRotaSheet(wb, matchesLookup) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['PM Rota by Match Date'], { header: 1, defval: '' })
  const fixtures = []

  for (const row of rows.slice(7)) {
    const match = String(row[3] || '').trim()
    if (!match || match === 'MATCH') continue

    const dateIso = excelDateToIso(typeof row[5] === 'number' ? row[5] : row[2])
    if (!dateIso) continue

    const enriched = matchesLookup.get(dedupeKey(dateIso, match))
    const code = enriched?.code || String(row[4] || 'UNK').trim()
    const tournamentName = enriched?.tournamentName || code
    const time = enriched?.time || '00:00'
    const coverageLabel = enriched?.coverageLabel || 'Standard'
    const trader = enriched?.trader ?? null
    const markets = enriched?.markets || 0
    const priceCheck = enriched?.priceCheck || ''

    fixtures.push({
      dedupeKey: dedupeKey(dateIso, match),
      source: 'PM Rota by Match Date',
      dateIso,
      code,
      tournamentName,
      match,
      home: enriched?.home,
      away: enriched?.away,
      time,
      trader,
      coverageLabel,
      gap: !trader,
      format: enriched?.format,
      coverageMode: coverageModeFromLabel(coverageLabel),
      lifecycle: lifecycleFromRow(trader, markets, priceCheck),
      marketsSent: markets || 0,
      marketsTotal: markets || undefined,
      needsPriceCheck: Boolean(priceCheck),
      note: enriched?.note,
      id: fixtureId(dateIso, code, time, match),
    })
  }

  return fixtures
}

function mergeFixtures(matchesFixtures, copyFixtures, pmFixtures) {
  const merged = new Map()
  const sourceCounts = {}

  for (const fixture of matchesFixtures) {
    merged.set(fixture.dedupeKey, { ...fixture })
    sourceCounts[fixture.source] = (sourceCounts[fixture.source] || 0) + 1
  }

  for (const fixture of pmFixtures) {
    const existing = merged.get(fixture.dedupeKey)
    if (existing) {
      if (fixture.trader) {
        existing.trader = fixture.trader
        existing.gap = fixture.gap
        existing.lifecycle = fixture.lifecycle
        existing.needsPriceCheck = fixture.needsPriceCheck
      }
      sourceCounts[fixture.source] = (sourceCounts[fixture.source] || 0) + 1
    } else {
      merged.set(fixture.dedupeKey, fixture)
      sourceCounts[fixture.source] = (sourceCounts[fixture.source] || 0) + 1
    }
  }

  for (const fixture of copyFixtures) {
    const existing = merged.get(fixture.dedupeKey)
    merged.set(fixture.dedupeKey, {
      ...fixture,
      home: fixture.home ?? existing?.home,
      away: fixture.away ?? existing?.away,
    })
    sourceCounts[fixture.source] = (sourceCounts[fixture.source] || 0) + 1
  }

  const fixtures = [...merged.values()].sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time) || a.match.localeCompare(b.match),
  )

  return { fixtures, sourceCounts }
}

const wb = XLSX.readFile(xlsmPath)
const matchesFixtures = parseMatchesSheet(wb)
const matchesLookup = buildMatchesLookup(matchesFixtures)
const copyFixtures = parseCopySheet(wb, matchesLookup)
const pmFixtures = parsePmRotaSheet(wb, matchesLookup)
const { fixtures, sourceCounts } = mergeFixtures(matchesFixtures, copyFixtures, pmFixtures)

const dayMap = new Map()
const tournamentMeta = new Map()

for (const entry of fixtures) {
  const fixture = {
    id: entry.id,
    time: entry.time,
    match: entry.match,
    ...(entry.home ? { home: entry.home } : {}),
    ...(entry.away ? { away: entry.away } : {}),
    trading: entry.trader,
    prep: null,
    lead: null,
    scout: false,
    data: null,
    gap: entry.gap,
    tier: tierFromCode(entry.code, entry.coverageLabel),
    format: entry.format,
    coverageLabel: entry.coverageLabel,
    coverageMode: entry.coverageMode,
    lifecycle: entry.lifecycle,
    marketsSent: entry.marketsSent,
    marketsTotal: entry.marketsTotal,
    needsPriceCheck: entry.needsPriceCheck,
    note: entry.note,
  }

  if (!dayMap.has(entry.dateIso)) {
    dayMap.set(entry.dateIso, {
      label: formatDayLabel(entry.dateIso),
      date: entry.dateIso,
      cricketDays: 1,
      fixtureCount: 0,
      gapCount: 0,
      dailyLead: DAILY_LEAD_TRADERS[0],
      tradersOn: [],
      tournaments: new Map(),
    })
  }

  const day = dayMap.get(entry.dateIso)
  day.fixtureCount += 1
  if (entry.gap) day.gapCount += 1
  if (entry.trader && !day.tradersOn.includes(entry.trader)) day.tradersOn.push(entry.trader)

  if (!day.tournaments.has(entry.code)) {
    day.tournaments.set(entry.code, {
      code: entry.code,
      name: entry.tournamentName,
      fixtureCount: 0,
      gapCount: 0,
      matches: [],
    })
  }

  const group = day.tournaments.get(entry.code)
  group.fixtureCount += 1
  if (entry.gap) group.gapCount += 1
  group.matches.push(fixture)

  if (!tournamentMeta.has(entry.code)) {
    tournamentMeta.set(entry.code, {
      code: entry.code,
      name: entry.tournamentName,
      format: entry.format,
      fixtureCount: 0,
      gapCount: 0,
      fixtures: [],
    })
  }

  const meta = tournamentMeta.get(entry.code)
  meta.fixtureCount += 1
  if (entry.gap) meta.gapCount += 1
  meta.fixtures.push({ ...fixture, dateIso: entry.dateIso, dayLabel: day.label })
}

const scheduleDays = [...dayMap.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, day]) => ({
    label: day.label,
    date: day.date,
    cricketDays: day.cricketDays,
    fixtureCount: day.fixtureCount,
    gapCount: day.gapCount,
    dailyLead: day.dailyLead,
    tradersOn: day.tradersOn.sort(),
    tournaments: [...day.tournaments.values()].sort((a, b) => a.code.localeCompare(b.code)),
  }))

const leadCounts = Object.fromEntries(DAILY_LEAD_TRADERS.map((name) => [name, 0]))
for (const day of scheduleDays) {
  const onShift = new Set(day.tradersOn.filter((name) => DAILY_LEAD_TRADERS.includes(name)))
  const pool =
    onShift.size > 0 ? DAILY_LEAD_TRADERS.filter((name) => onShift.has(name)) : DAILY_LEAD_TRADERS
  const lead = pool
    .slice()
    .sort((a, b) => leadCounts[a] - leadCounts[b] || day.date.localeCompare(day.date) || a.localeCompare(b))[0]
  day.dailyLead = lead
  leadCounts[lead] += 1
}

const tournaments = [...tournamentMeta.values()].sort((a, b) => b.fixtureCount - a.fixtureCount)
const sheetsUsed = Object.entries(sourceCounts)
  .filter(([, count]) => count > 0)
  .map(([sheet]) => sheet)

const ts = `// Generated from Coverage Schedule 2.2.xlsm — do not edit by hand
// Run: node scripts/import-coverage-xlsm.mjs "<path-to-xlsm>"

import type { ScheduleDay, ScheduleFixture } from './coverageScheduleStore'

export interface ImportedTournament {
  code: string
  name: string
  format?: string
  fixtureCount: number
  gapCount: number
  fixtures: (ScheduleFixture & { dateIso: string; dayLabel: string })[]
}

export const IMPORTED_SCHEDULE_DAYS: ScheduleDay[] = ${JSON.stringify(scheduleDays, null, 2)}

export const IMPORTED_TOURNAMENTS: ImportedTournament[] = ${JSON.stringify(tournaments, null, 2)}

export const IMPORT_SOURCE = {
  file: 'Coverage Schedule 2.2.xlsm',
  sheet: ${JSON.stringify(sheetsUsed.join(' + '))},
  sheets: ${JSON.stringify(sheetsUsed)},
  fixtureCount: ${fixtures.length},
  dayCount: ${scheduleDays.length},
  importedAt: '${new Date().toISOString()}',
}
`

fs.writeFileSync(outPath, ts)
console.log(`Wrote ${fixtures.length} fixtures across ${scheduleDays.length} days to ${outPath}`)
console.log(`Sheets: ${sheetsUsed.join(', ')}`)
console.log(`Matches: ${matchesFixtures.length} rows, Copy: ${copyFixtures.length} rows, PM Rota: ${pmFixtures.length} rows, merged unique: ${fixtures.length}`)
if (scheduleDays.length) {
  console.log(`Range: ${scheduleDays[0].label} (${scheduleDays[0].date}) – ${scheduleDays[scheduleDays.length - 1].label} (${scheduleDays[scheduleDays.length - 1].date})`)
}
