import {
  IMPORTED_SCHEDULE_DAYS,
  IMPORTED_TOURNAMENTS as RAW_IMPORTED_TOURNAMENTS,
  IMPORT_SOURCE,
  type ImportedTournament,
} from './coverageScheduleImported'
import { DEFAULT_TRADERS } from './traders'

export type TournamentTier = 1 | 2 | 3

export type CoverageMode = 'not-covered' | 'pre-match' | 'live' | 'standard'

export type GameLifecycle = 'prepping' | 'published' | 'settled' | 'price-check'

export type PipelineStepState = 'done' | 'current' | 'pending'

export type StatusFilter =
  | 'all'
  | 'needs-prep'
  | 'needs-publish'
  | 'needs-settle'
  | 'price-check'
  | 'unassigned'

export type CoverageLabel = 'Premium' | 'Standard' | 'Simulated' | 'Not Covered' | 'Unconfirmed'

export type Persona = 'admin' | 'trader'

export type ScheduleView =
  | 'my-rota'
  | 'schedule'
  | 'traders'
  | 'tournament'
  | 'replicate-season'
  | 'coverage-numbers'
  | 'import'
  | 'ops-alerts'

export type ScheduleListMode = 'by-day' | 'all-games' | 'by-tournament'

export type TierFilter = 'all' | 'tier-1' | 'tier-1-2' | 'tier-3'

export interface ScheduleContentFilters {
  showSrl: boolean
  tierFilter: TierFilter
  /** When set, only fixtures involving this trader (any role) are shown. */
  traderFilter: string | null
}

export interface SelectedMatchContext {
  fixture: ScheduleFixture
  day: ScheduleDay
  tournament: ScheduleTournamentGroup
}

export interface StatusLogEntry {
  step: string
  status: string
  by: string
  at: string
}

export interface ScheduleFixture {
  id: string
  time: string
  match: string
  trading: string | null
  prep: string | null
  lead: string | null
  scout: string
  data?: string | null
  gap: boolean
  tier?: TournamentTier
  coverageMode?: CoverageMode
  coverageLabel?: CoverageLabel
  lifecycle?: GameLifecycle
  prepareBy?: string
  publishBy?: string
  settleBy?: string
  preMatchTrader?: string
  marketsSent?: number
  marketsTotal?: number
  prepared?: boolean
  preparedBy?: string
  fcDay?: string
  spansDays?: boolean
  format?: string
  note?: string
  needsPriceCheck?: boolean
}

export interface ScheduleTournamentGroup {
  code: string
  name: string
  fixtureCount: number
  gapCount: number
  matches: ScheduleFixture[]
}

export interface ScheduleDay {
  label: string
  date: string
  cricketDays: number
  fixtureCount: number
  gapCount: number
  dailyLead: string
  tradersOn: string[]
  tournaments: ScheduleTournamentGroup[]
}

export { IMPORT_SOURCE, type ImportedTournament }

export const SCHEDULE_WEEK_SIZE = 7

export type ScheduleDayRangeMode = 'week' | 'day' | 'all'

export type ScheduleDayRangePreset = 'this-week' | 'next-week' | 'all'

export interface ScheduleDayRange {
  mode: ScheduleDayRangeMode
  startIndex: number
}

export function getDefaultScheduleDayRange(): ScheduleDayRange {
  return { mode: 'week', startIndex: 0 }
}

export function getScheduleDaysSlice(
  allDays: ScheduleDay[] = SCHEDULE_DAYS,
  range: ScheduleDayRange,
): ScheduleDay[] {
  if (range.mode === 'all') return allDays
  if (range.mode === 'day') {
    const day = allDays[range.startIndex]
    return day ? [day] : []
  }
  return allDays.slice(range.startIndex, range.startIndex + SCHEDULE_WEEK_SIZE)
}

export function formatScheduleDayRangeLabel(
  allDays: ScheduleDay[] = SCHEDULE_DAYS,
  range: ScheduleDayRange,
): string {
  if (!allDays.length) return 'No fixtures loaded'
  if (range.mode === 'all') {
    const first = allDays[0].label
    const last = allDays[allDays.length - 1].label
    return first === last ? first : `${first} – ${last}`
  }
  const slice = getScheduleDaysSlice(allDays, range)
  if (!slice.length) return 'No fixtures'
  if (range.mode === 'day') return slice[0].label
  const firstDay = slice[0]
  const d = parseScheduleDate(firstDay.date)
  const dayNum = d.getDate()
  const monthYear = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' })
  return `Week of ${dayNum} ${monthYear}`
}

export function canNavigateScheduleRange(
  allDays: ScheduleDay[],
  range: ScheduleDayRange,
  direction: 'prev' | 'next',
): boolean {
  if (range.mode === 'all' || !allDays.length) return false
  const step = range.mode === 'day' ? 1 : SCHEDULE_WEEK_SIZE
  if (direction === 'prev') return range.startIndex > 0
  if (range.mode === 'day') return range.startIndex < allDays.length - 1
  return range.startIndex + step < allDays.length
}

export function navigateScheduleDayRange(
  allDays: ScheduleDay[],
  range: ScheduleDayRange,
  direction: 'prev' | 'next',
): ScheduleDayRange {
  if (range.mode === 'all' || !allDays.length) return range
  const step = range.mode === 'day' ? 1 : SCHEDULE_WEEK_SIZE
  const delta = direction === 'prev' ? -step : step
  if (range.mode === 'day') {
    const nextIndex = Math.max(0, Math.min(allDays.length - 1, range.startIndex + delta))
    return { ...range, startIndex: nextIndex }
  }
  const maxStart = Math.max(0, allDays.length - 1)
  const nextIndex = Math.max(0, Math.min(maxStart, range.startIndex + delta))
  return { ...range, startIndex: nextIndex }
}

export function scheduleDayRangeFromPreset(
  preset: ScheduleDayRangePreset,
  allDays: ScheduleDay[] = SCHEDULE_DAYS,
): ScheduleDayRange {
  switch (preset) {
    case 'this-week':
      return { mode: 'week', startIndex: 0 }
    case 'next-week':
      return { mode: 'week', startIndex: Math.min(SCHEDULE_WEEK_SIZE, Math.max(0, allDays.length - 1)) }
    case 'all':
      return { mode: 'all', startIndex: 0 }
  }
}

export function scheduleDayRangeForDayIndex(dayIndex: number, allDays: ScheduleDay[] = SCHEDULE_DAYS): ScheduleDayRange {
  const startIndex = Math.max(0, Math.min(allDays.length - 1, dayIndex))
  return { mode: 'day', startIndex }
}

export interface TraderRosterDay {
  label: string
  date: string
  lead: string
  on: string[]
  off: string[]
}

export const COVERAGE_MODE_LABELS: Record<CoverageMode, string> = {
  'not-covered': 'Not covered',
  'pre-match': 'Pre-match',
  live: 'Live',
  standard: 'Standard',
}

export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-prep', label: 'Needs prep' },
  { id: 'needs-publish', label: 'Needs publish' },
  { id: 'needs-settle', label: 'Needs settle' },
  { id: 'price-check', label: 'Price check' },
  { id: 'unassigned', label: 'Unassigned' },
]

export const TRADER_ROSTER_WEEK: TraderRosterDay[] = [
  {
    label: 'Mon 17',
    date: '2026-08-17',
    lead: 'Collinson',
    on: ['Dyer', 'Perry', 'Paul', 'Moore', 'Collinson', 'Ewins'],
    off: ['Cooper'],
  },
  {
    label: 'Tue 18',
    date: '2026-08-18',
    lead: 'Collinson',
    on: ['Moore', 'Dyer', 'Ewins', 'Collinson'],
    off: ['Cooper', 'Paul', 'Perry'],
  },
  {
    label: 'Wed 19',
    date: '2026-08-19',
    lead: 'Cooper',
    on: ['Cooper', 'Dyer', 'Perry', 'Paul'],
    off: ['Moore', 'Collinson', 'Ewins'],
  },
  {
    label: 'Thu 20',
    date: '2026-08-20',
    lead: 'Cooper',
    on: ['Dyer', 'Moore', 'Paul', 'Cooper', 'Perry'],
    off: ['Collinson', 'Ewins'],
  },
  {
    label: 'Fri 21',
    date: '2026-08-21',
    lead: 'Paul',
    on: ['Paul', 'Perry', 'Moore'],
    off: ['Dyer', 'Collinson', 'Cooper', 'Ewins'],
  },
  {
    label: 'Sat 22',
    date: '2026-08-22',
    lead: 'Ewins',
    on: ['Ewins', 'Moore'],
    off: ['Dyer', 'Paul', 'Perry', 'Collinson', 'Cooper'],
  },
  {
    label: 'Sun 23',
    date: '2026-08-23',
    lead: 'Collinson',
    on: ['Collinson', 'Dyer', 'Cooper'],
    off: ['Moore', 'Paul', 'Perry', 'Ewins'],
  },
]

export const MY_ROTA_TIME_OFF = [
  { type: 'Holiday', from: '21 Aug', to: '22 Aug', status: 'Confirmed', note: 'Annual leave' },
  { type: 'Day off', from: 'Sat 30 Aug', to: 'Sat 30 Aug', status: 'Pending', note: '' },
]

function prepStepFromFixture(fixture: ScheduleFixture): PipelineStepState {
  if (fixture.lifecycle === 'published' || fixture.lifecycle === 'settled' || fixture.lifecycle === 'price-check') {
    return 'done'
  }
  if (fixture.prepared || fixture.preparedBy || fixture.prepareBy) {
    return 'done'
  }
  if (fixture.prep) {
    return 'current'
  }
  if (fixture.lifecycle === 'prepping') {
    return 'pending'
  }
  return 'pending'
}

export function pipelineStepsFromFixture(fixture: ScheduleFixture): {
  prep: PipelineStepState
  publish: PipelineStepState
  settle: PipelineStepState
  priceCheck: boolean
} {
  const prep = prepStepFromFixture(fixture)
  switch (fixture.lifecycle) {
    case 'prepping':
      return {
        prep,
        publish: prep === 'done' ? 'current' : 'pending',
        settle: 'pending',
        priceCheck: false,
      }
    case 'published':
      return { prep: 'done', publish: 'done', settle: 'current', priceCheck: false }
    case 'settled':
      return { prep: 'done', publish: 'done', settle: 'done', priceCheck: false }
    case 'price-check':
      return { prep: 'done', publish: 'done', settle: 'pending', priceCheck: true }
    default: {
      const publishDone =
        fixture.lifecycle === 'published' ||
        fixture.lifecycle === 'settled' ||
        Boolean(fixture.publishBy)
      const settleDone = fixture.lifecycle === 'settled'
      return {
        prep,
        publish: publishDone ? 'done' : prep === 'done' ? 'current' : 'pending',
        settle: settleDone ? 'done' : publishDone ? 'current' : 'pending',
        priceCheck: Boolean(fixture.needsPriceCheck),
      }
    }
  }
}

export function fixtureNeedsPrepAssignment(fixture: ScheduleFixture): boolean {
  return !fixture.prep && matchNeedsPrep(fixture)
}

export interface FixtureAssignmentPatch {
  prep?: string | null
  trading?: string | null
}

export type FixtureLifecycleAction = 'prep-done' | 'published' | 'settled'

function applyAssignmentToFixture(fixture: ScheduleFixture, patch: FixtureAssignmentPatch): void {
  if ('prep' in patch) {
    fixture.prep = patch.prep ?? null
  }
  if ('trading' in patch) {
    fixture.trading = patch.trading ?? null
    if (patch.trading) {
      fixture.gap = false
    } else if (fixtureNeedsTrader(fixture)) {
      fixture.gap = true
    }
  }
}

function forEachFixtureById(fixtureId: string, apply: (fixture: ScheduleFixture) => void): boolean {
  let updated = false
  for (const day of SCHEDULE_DAYS) {
    for (const tournament of day.tournaments) {
      const fixture = tournament.matches.find((m) => m.id === fixtureId)
      if (fixture) {
        apply(fixture)
        updated = true
      }
    }
  }
  for (const tournament of IMPORTED_TOURNAMENTS) {
    const fixture = tournament.fixtures.find((m) => m.id === fixtureId)
    if (fixture) {
      apply(fixture)
    }
  }
  return updated
}

function applyLifecycleAction(fixture: ScheduleFixture, action: FixtureLifecycleAction): void {
  const actor = fixture.prep ?? fixture.trading ?? 'Admin'

  if (action === 'prep-done') {
    fixture.prepared = true
    if (!fixture.prepareBy) fixture.prepareBy = actor
    return
  }

  if (!fixture.prepared) {
    fixture.prepared = true
    if (!fixture.prepareBy) fixture.prepareBy = actor
  }

  if (action === 'published') {
    fixture.lifecycle = 'published'
    if (!fixture.publishBy) fixture.publishBy = actor
    return
  }

  if (!fixture.publishBy) fixture.publishBy = actor
  fixture.lifecycle = 'settled'
  if (!fixture.settleBy) fixture.settleBy = actor
}

export function updateFixtureLifecycle(fixtureId: string, action: FixtureLifecycleAction): boolean {
  return forEachFixtureById(fixtureId, (fixture) => applyLifecycleAction(fixture, action))
}

export function markFixturePrepDone(fixtureId: string): boolean {
  return updateFixtureLifecycle(fixtureId, 'prep-done')
}

export function markFixturePublished(fixtureId: string): boolean {
  return updateFixtureLifecycle(fixtureId, 'published')
}

export function markFixtureSettled(fixtureId: string): boolean {
  return updateFixtureLifecycle(fixtureId, 'settled')
}

export function updateFixtureAssignment(fixtureId: string, patch: FixtureAssignmentPatch): boolean {
  return forEachFixtureById(fixtureId, (fixture) => applyAssignmentToFixture(fixture, patch))
}

export function matchNeedsPrep(fixture: ScheduleFixture): boolean {
  return pipelineStepsFromFixture(fixture).prep !== 'done'
}

export function matchNeedsPublish(fixture: ScheduleFixture): boolean {
  const steps = pipelineStepsFromFixture(fixture)
  return steps.prep === 'done' && steps.publish !== 'done'
}

export function matchNeedsSettle(fixture: ScheduleFixture): boolean {
  const steps = pipelineStepsFromFixture(fixture)
  return steps.publish === 'done' && steps.settle !== 'done'
}

export function matchMatchesStatusFilter(fixture: ScheduleFixture, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'needs-prep') return matchNeedsPrep(fixture)
  if (filter === 'needs-publish') return matchNeedsPublish(fixture)
  if (filter === 'needs-settle') return matchNeedsSettle(fixture)
  if (filter === 'price-check') return pipelineStepsFromFixture(fixture).priceCheck
  if (filter === 'unassigned') return fixture.gap
  return true
}

const TOURNAMENT_TIER: Record<string, TournamentTier> = {
  SRL: 3,
  T20I: 1,
  ODI: 1,
  'A TEST': 1,
  CPL: 1,
  ILT20: 2,
  PAK: 2,
  YODI: 2,
  LA: 2,
  ODA: 2,
  AU50: 2,
  MUK: 3,
  MIN: 3,
  'AND W': 3,
  UTT: 3,
}

export function getFixtureTier(fixture: ScheduleFixture, tournamentCode: string): TournamentTier {
  if (fixture.tier) return fixture.tier
  if (TOURNAMENT_TIER[tournamentCode]) return TOURNAMENT_TIER[tournamentCode]
  if (fixture.coverageLabel === 'Simulated') return 3
  if (fixture.coverageLabel === 'Premium') return 2
  return 2
}

export function isSimulatedFixture(fixture: ScheduleFixture, tournamentCode: string): boolean {
  return tournamentCode === 'SRL' || fixture.coverageLabel === 'Simulated'
}

function isRosterFixture(fixture: ScheduleFixture, tournamentCode: string): boolean {
  return !isSimulatedFixture(fixture, tournamentCode)
}

export function fixtureNeedsTrader(fixture: ScheduleFixture): boolean {
  const mode = fixture.coverageMode ?? 'standard'
  return mode === 'live' || mode === 'standard'
}

export function fixtureIsPreMatchOnly(fixture: ScheduleFixture): boolean {
  return fixture.coverageMode === 'pre-match'
}

export function fixtureIsNotCovered(fixture: ScheduleFixture): boolean {
  return fixture.coverageMode === 'not-covered'
}

export function fixtureHasLimitedCoverage(fixture: ScheduleFixture): boolean {
  return fixtureIsNotCovered(fixture) || fixtureIsPreMatchOnly(fixture)
}

function traderNameMatches(value: string | null | undefined, traderName: string): boolean {
  return Boolean(value && value !== '—' && value === traderName)
}

/** Data assignments are stored on the fixture scout field when populated. */
export function getFixtureDataAssignment(fixture: ScheduleFixture): string | null {
  const scout = fixture.scout?.trim()
  if (!scout || scout === '—') return null
  return scout
}

export function fixtureInvolvesTrader(
  fixture: ScheduleFixture,
  traderName: string,
  options?: { dailyLead?: string | null },
): boolean {
  if (options?.dailyLead === traderName) return true
  if (traderNameMatches(fixture.trading, traderName)) return true
  if (traderNameMatches(fixture.prep, traderName)) return true
  if (traderNameMatches(fixture.prepareBy, traderName)) return true
  if (traderNameMatches(fixture.preparedBy, traderName)) return true
  if (traderNameMatches(fixture.lead, traderName)) return true
  if (traderNameMatches(fixture.preMatchTrader, traderName)) return true
  if (traderNameMatches(fixture.publishBy, traderName)) return true
  if (traderNameMatches(fixture.settleBy, traderName)) return true
  if (traderNameMatches(getFixtureDataAssignment(fixture), traderName)) return true
  return false
}

export function fixtureMatchesContentFilters(
  fixture: ScheduleFixture,
  tournamentCode: string,
  filters: ScheduleContentFilters,
): boolean {
  if (!filters.showSrl && isSimulatedFixture(fixture, tournamentCode)) return false
  const tier = getFixtureTier(fixture, tournamentCode)
  if (filters.tierFilter === 'tier-1' && tier !== 1) return false
  if (filters.tierFilter === 'tier-1-2' && tier > 2) return false
  if (filters.tierFilter === 'tier-3' && tier !== 3) return false
  return true
}

export function fixtureMatchesFilters(
  fixture: ScheduleFixture,
  tournamentCode: string,
  statusFilter: StatusFilter,
  contentFilters: ScheduleContentFilters,
  dailyLead?: string | null,
): boolean {
  if (
    contentFilters.traderFilter &&
    !fixtureInvolvesTrader(fixture, contentFilters.traderFilter, { dailyLead })
  ) {
    return false
  }
  return matchMatchesStatusFilter(fixture, statusFilter) &&
    fixtureMatchesContentFilters(fixture, tournamentCode, contentFilters)
}

export const DEFAULT_CONTENT_FILTERS: ScheduleContentFilters = {
  showSrl: false,
  tierFilter: 'all',
  traderFilter: null,
}

const MAX_TRADING_ASSIGNMENTS_PER_DAY = 2
const DISPLAY_DIVERSIFY_SEED = 0x5e4b7a31

function hashDisplaySeed(input: string): number {
  let h = DISPLAY_DIVERSIFY_SEED
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffleById<T extends { id: string }>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function collectDisplayTraderPool(scheduleDays: ScheduleDay[]): string[] {
  const fromDefaults = DEFAULT_TRADERS.map((trader) => trader.name)
  const pool = new Set(fromDefaults)
  for (const day of scheduleDays) {
    for (const group of day.tournaments) {
      for (const fixture of group.matches) {
        if (!isRosterFixture(fixture, group.code)) continue
        for (const name of [fixture.trading, fixture.prep, fixture.lead, fixture.scout]) {
          if (name && name !== '—') pool.add(name)
        }
      }
    }
  }
  const extras = [...pool].filter((name) => !fromDefaults.includes(name)).sort()
  return [...fromDefaults, ...extras]
}

function pickBalancedTrader(
  fixtureId: string,
  counts: Map<string, number>,
  pool: string[],
  exclude?: string | null,
): string | null {
  const candidates = pool
    .filter((name) => name !== exclude && (counts.get(name) ?? 0) < MAX_TRADING_ASSIGNMENTS_PER_DAY)
    .sort((a, b) => {
      const diff = (counts.get(a) ?? 0) - (counts.get(b) ?? 0)
      if (diff !== 0) return diff
      return hashDisplaySeed(`${fixtureId}:${a}`) - hashDisplaySeed(`${fixtureId}:${b}`)
    })
  return candidates[0] ?? null
}

function rebuildDayTradersOn(day: ScheduleDay): void {
  const on = new Set<string>()
  for (const group of day.tournaments) {
    for (const fixture of group.matches) {
      if (!isRosterFixture(fixture, group.code)) continue
      if (fixture.trading) on.add(fixture.trading)
      if (fixture.prep) on.add(fixture.prep)
    }
  }
  day.tradersOn = [...on].sort()
}

/** Spread trading assignments across the roster for demo display (max 2 trading games per trader per day). */
export function diversifyTradingAssignmentsForDisplay(scheduleDays: ScheduleDay[]): void {
  const pool = collectDisplayTraderPool(scheduleDays)

  for (const day of scheduleDays) {
    for (const group of day.tournaments) {
      for (const fixture of group.matches) {
        if (!isRosterFixture(fixture, group.code)) continue
        if (!fixtureNeedsTrader(fixture)) {
          fixture.trading = null
          fixture.gap = false
        }
      }
    }
  }

  for (const day of scheduleDays) {
    const tradingCounts = new Map<string, number>()
    const dataCounts = new Map<string, number>()
    const eligible: Array<{ fixture: ScheduleFixture; tournamentCode: string }> = []

    for (const group of day.tournaments) {
      for (const fixture of group.matches) {
        if (!isRosterFixture(fixture, group.code)) continue
        if (!fixtureNeedsTrader(fixture)) continue
        eligible.push({ fixture, tournamentCode: group.code })
      }
    }

    const shuffled = seededShuffleById(
      eligible.map((entry) => ({ id: entry.fixture.id, entry })),
      hashDisplaySeed(day.date),
    ).map((item) => item.entry)

    for (const { fixture } of shuffled) {
      const trader = pickBalancedTrader(fixture.id, tradingCounts, pool)
      if (trader) {
        fixture.trading = trader
        fixture.gap = false
        tradingCounts.set(trader, (tradingCounts.get(trader) ?? 0) + 1)
      } else if (fixtureNeedsTrader(fixture)) {
        fixture.gap = true
      }

      if (!fixture.scout || fixture.scout === '—') {
        const dataTrader = pickBalancedTrader(fixture.id, dataCounts, pool, fixture.trading)
        if (dataTrader) {
          fixture.scout = dataTrader
          dataCounts.set(dataTrader, (dataCounts.get(dataTrader) ?? 0) + 1)
        }
      }
    }

    rebuildDayTradersOn(day)
  }
}

function cloneScheduleDays(days: ScheduleDay[]): ScheduleDay[] {
  return JSON.parse(JSON.stringify(days)) as ScheduleDay[]
}

function syncTournamentFixturesFromSchedule(
  scheduleDays: ScheduleDay[],
  tournaments: ImportedTournament[],
): ImportedTournament[] {
  const patch = new Map<string, Pick<ScheduleFixture, 'trading' | 'gap' | 'scout'>>()
  for (const day of scheduleDays) {
    for (const group of day.tournaments) {
      for (const fixture of group.matches) {
        patch.set(fixture.id, { trading: fixture.trading, gap: fixture.gap, scout: fixture.scout })
      }
    }
  }

  return tournaments.map((tournament) => ({
    ...tournament,
    fixtures: tournament.fixtures.map((fixture) => {
      const updated = patch.get(fixture.id)
      if (!updated) return fixture
      return { ...fixture, ...updated }
    }),
  }))
}

function buildDisplaySchedule(): ScheduleDay[] {
  const cloned = cloneScheduleDays(IMPORTED_SCHEDULE_DAYS)
  diversifyTradingAssignmentsForDisplay(cloned)
  return cloned
}

export const SCHEDULE_DAYS: ScheduleDay[] = buildDisplaySchedule()
export const SCHEDULE_WEEK_DAYS = SCHEDULE_DAYS
export const IMPORTED_TOURNAMENTS: ImportedTournament[] = syncTournamentFixturesFromSchedule(
  SCHEDULE_DAYS,
  JSON.parse(JSON.stringify(RAW_IMPORTED_TOURNAMENTS)) as ImportedTournament[],
)

export function allWeekFixtures(days: ScheduleDay[] = SCHEDULE_DAYS): ScheduleFixture[] {
  return days.flatMap((day) => day.tournaments.flatMap((group) => group.matches))
}

export function countStatusFilter(filter: StatusFilter, days: ScheduleDay[] = SCHEDULE_DAYS): number {
  return allWeekFixtures(days).filter((fixture) => matchMatchesStatusFilter(fixture, filter)).length
}

export function getRemainingActions(fixture: ScheduleFixture): string[] {
  const steps = pipelineStepsFromFixture(fixture)
  const actions: string[] = []
  if (fixture.gap && fixtureNeedsTrader(fixture)) actions.push('Assign trading')
  if (fixtureNeedsPrepAssignment(fixture)) actions.push('Assign prep')
  if (steps.prep !== 'done') actions.push('Complete prep')
  if (steps.prep === 'done' && steps.publish !== 'done') actions.push('Publish markets')
  if (steps.priceCheck) actions.push('Complete price check')
  if (steps.publish === 'done' && steps.settle !== 'done') actions.push('Settle game')
  return actions
}

export function buildStatusLog(fixture: ScheduleFixture): StatusLogEntry[] {
  const log: StatusLogEntry[] = []
  const lc = fixture.lifecycle

  if (lc === 'prepping') {
    const prepDone = fixture.prepared || Boolean(fixture.prepareBy)
    log.push({
      step: 'Prep',
      status: prepDone ? 'Done' : fixture.prep ? 'Assigned' : 'In progress',
      by: fixture.prepareBy ?? fixture.prep ?? '—',
      at: prepDone || fixture.prep ? '17 Aug · 08:12' : '—',
    })
    log.push({ step: 'Publish', status: 'Pending', by: '—', at: '—' })
    log.push({ step: 'Settle', status: 'Pending', by: '—', at: '—' })
    return log
  }

  if (fixture.prepareBy) {
    log.push({ step: 'Prep', status: 'Done', by: fixture.prepareBy, at: '17 Aug · 08:45' })
  }
  if (fixture.publishBy) {
    log.push({ step: 'Publish', status: 'Done', by: fixture.publishBy, at: '17 Aug · 11:20' })
  } else if (lc === 'published' || lc === 'price-check') {
    log.push({ step: 'Publish', status: 'Pending', by: '—', at: '—' })
  }
  if (lc === 'price-check') {
    log.push({ step: 'Price check', status: 'Required', by: '—', at: '—' })
  }
  if (fixture.settleBy && fixture.settleBy !== '—') {
    log.push({ step: 'Settle', status: 'Done', by: fixture.settleBy, at: '17 Aug · 22:05' })
  } else if (lc !== 'settled') {
    log.push({ step: 'Settle', status: 'Pending', by: '—', at: '—' })
  }

  if (log.length === 0) {
    log.push({ step: 'Prep', status: 'Not started', by: '—', at: '—' })
  }
  return log
}

export function findFixtureById(id: string): SelectedMatchContext | null {
  for (const day of SCHEDULE_DAYS) {
    for (const tournament of day.tournaments) {
      const fixture = tournament.matches.find((m) => m.id === id)
      if (fixture) return { fixture, day, tournament }
    }
  }
  return null
}

export function findFixtureContext(id: string): SelectedMatchContext | null {
  return findFixtureById(id)
}

export const SCHEDULE_TRADER_NAMES = ['Dyer', 'Moore', 'Perry', 'Paul', 'Collinson', 'Cooper', 'Ewins']

export const TIER_LABELS: Record<TournamentTier, string> = {
  1: 'Tier 1 — highest value',
  2: 'Tier 2',
  3: 'Tier 3',
}

export interface TraderBlock {
  start: string
  end: string
  role: string
  match: string
  tone: 'success' | 'warning' | 'neutral'
}

export const TRADER_BLOCKS: TraderBlock[] = [
  { start: '00:00', end: '03:30', role: 'Trading', match: 'STL v BAR · CPL', tone: 'success' },
  { start: '09:00', end: '11:00', role: 'Training', match: 'Weekly session', tone: 'neutral' },
  { start: '13:00', end: '16:00', role: 'Prep', match: 'AUS v BAN · TEST', tone: 'warning' },
  { start: '19:00', end: '22:30', role: 'Trading', match: 'IND v SL · ODI', tone: 'success' },
]

export interface TraderMonthDay {
  day: number
  tradingCount: number
  prep: number
  unavailable: boolean
}

export const TRADER_MONTH_DAYS: TraderMonthDay[] = [
  { day: 3, tradingCount: 0, prep: 0, unavailable: false },
  { day: 10, tradingCount: 1, prep: 1, unavailable: false },
  { day: 17, tradingCount: 2, prep: 1, unavailable: false },
  { day: 18, tradingCount: 1, prep: 0, unavailable: false },
  { day: 19, tradingCount: 1, prep: 2, unavailable: false },
  { day: 21, tradingCount: 0, prep: 0, unavailable: true },
  { day: 22, tradingCount: 0, prep: 0, unavailable: true },
  { day: 24, tradingCount: 0, prep: 1, unavailable: false },
  { day: 31, tradingCount: 1, prep: 0, unavailable: false },
]

export const TRADER_WEEK_DAYS = [
  { label: 'Mon 17', title: 'Monday 17 Aug', unavailable: false },
  { label: 'Tue 18', title: 'Tuesday 18 Aug', unavailable: false },
  { label: 'Wed 19', title: 'Wednesday 19 Aug', unavailable: false },
  { label: 'Thu 20', title: 'Thursday 20 Aug', unavailable: false },
  { label: 'Fri 21', title: 'Friday 21 Aug', unavailable: true },
  { label: 'Sat 22', title: 'Saturday 22 Aug', unavailable: true },
  { label: 'Sun 23', title: 'Sunday 23 Aug', unavailable: false },
]

export interface CompFixtureRow {
  date: string
  time: string
  match: string
  trading: string | null
  coverage: CoverageMode
  lifecycle: GameLifecycle
  markets: string
  status: 'complete' | 'gap'
}

export const COMP_FIXTURES: CompFixtureRow[] = [
  { date: '17 Aug', time: '00:00', match: 'STL v BAR', trading: 'Dyer', coverage: 'live', lifecycle: 'published', markets: '42/42', status: 'complete' },
  { date: '18 Aug', time: '19:00', match: 'JAM v TKR', trading: 'Perry', coverage: 'standard', lifecycle: 'prepping', markets: '18/40', status: 'complete' },
  { date: '19 Aug', time: '00:00', match: 'BAR v GUY', trading: null, coverage: 'not-covered', lifecycle: 'prepping', markets: '0/40', status: 'gap' },
  { date: '20 Aug', time: '14:00', match: 'SKN v ANT', trading: 'Moore', coverage: 'pre-match', lifecycle: 'settled', markets: '12/12', status: 'complete' },
]

export const HISTORIC_SEASONS = [
  { season: '2025', fixtures: 30, covered: 28, pct: '93%', guide: 'Aug 12–Sep 18' },
  { season: '2024', fixtures: 28, covered: 26, pct: '93%', guide: 'Aug 14–Sep 20' },
  { season: '2023', fixtures: 30, covered: 27, pct: '90%', guide: 'Aug 10–Sep 16' },
  { season: '2016', fixtures: 24, covered: 20, pct: '83%', guide: 'Aug 4–Sep 8' },
]

export const CPL_TEAMS = ['St Lucia (STL)', 'Barbados (BAR)', 'Guyana (GUY)', 'Jamaica (JAM)', 'Trinidad (TKR)', 'Antigua (ANT)']

export const SCHEDULING_SUGGESTIONS = [
  { trader: 'Dyer', senior: true, score: 92, reasons: ['Senior trader', 'Available', '1 trading block that day', 'Tier 1 experience'] },
  { trader: 'Moore', senior: true, score: 78, reasons: ['Senior trader', 'Available', '3 trading blocks that week'] },
  { trader: 'Perry', senior: true, score: 61, reasons: ['Senior trader', 'Prep on adjacent match', 'Workload high'] },
  { trader: 'Paul', senior: false, score: 45, reasons: ['Standard trader', 'Tier 1 — prefer senior', 'Available'] },
]

export const OPS_ALERTS = [
  { tone: 'danger' as const, title: 'Capacity crunch — 21–24 Aug', detail: '18 fixtures · 4 traders available (6 on leave)', action: 'Review week' },
  { tone: 'danger' as const, title: 'Unassigned — next 48 hours', detail: '5 matches with no trading assigned', action: 'Fill gaps' },
  { tone: 'warning' as const, title: 'Tier 1 without senior trader', detail: 'T20 WC · IND v SL · Wed 19 Aug 10:00', action: 'Assign' },
  { tone: 'warning' as const, title: 'Upcoming busy week', detail: 'Week of 24 Aug — 42 fixtures vs 28 avg', action: 'Review week' },
]

export const IMPORT_COLUMN_MAP = [
  { excel: 'Match Date', mapsTo: 'Calendar date', status: 'matched' },
  { excel: 'Match', mapsTo: 'Fixture name', status: 'matched' },
  { excel: 'Prepare', mapsTo: 'Prep trader', status: 'matched' },
  { excel: 'Publish', mapsTo: 'Publish step', status: 'matched' },
  { excel: 'Settle', mapsTo: 'Settle step', status: 'matched' },
  { excel: 'Pre Match', mapsTo: 'Pre-match coverage', status: 'matched' },
  { excel: 'In Play', mapsTo: 'Live coverage', status: 'matched' },
  { excel: 'Totals', mapsTo: 'Markets sent', status: 'matched' },
  { excel: 'General notes', mapsTo: 'Game notes', status: 'matched' },
]

export const MONTH_CALENDAR_WEEKS = [
  ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ['W33', '11', '12', '13', '14', '15', '16', '17'],
  ['', '18', '19', '20', '21', '22', '23', '24'],
  ['', '25', '26', '27', '28', '29', '30', '31'],
]

export const COVERAGE_NUMBERS_BY_TRADER = [
  { name: 'Moen', games: 84 },
  { name: 'Collinson', games: 78 },
  { name: 'Dyer', games: 72 },
  { name: 'Cooper', games: 68 },
  { name: 'Ewins', games: 61 },
  { name: 'Paul', games: 58 },
]

export const COVERAGE_NUMBERS_BY_TOURNAMENT = [
  { name: 'CPL', y2026: '24', y2025: '22', delta: '+2', trend: 'Increased' },
  { name: 'IPL', y2026: '74', y2025: '70', delta: '+4', trend: 'Increased' },
  { name: 'ECN', y2026: '48', y2025: '52', delta: '−4', trend: 'Decreased' },
  { name: 'County FC', y2026: '12', y2025: '18', delta: '−6', trend: 'Decreased' },
  { name: 'T20I bilateral', y2026: '38', y2025: '38', delta: '0', trend: 'Flat' },
]

export const ADMIN_SCHEDULE_VIEWS: { id: ScheduleView; label: string }[] = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'traders', label: "Who's on" },
]

export const TRADER_SCHEDULE_VIEWS: { id: ScheduleView; label: string }[] = [
  { id: 'my-rota', label: 'My rota' },
  { id: 'schedule', label: 'Full schedule' },
  { id: 'traders', label: "All traders" },
]

export function getTournamentByCode(code: string): ImportedTournament | undefined {
  return IMPORTED_TOURNAMENTS.find((t) => t.code === code)
}

export function buildTraderRosterFromSchedule(): {
  label: string
  date: string
  lead: string
  on: string[]
  off: string[]
  assignments: { trader: string; blocks: string; role: string }[]
}[] {
  const allTraders = new Set<string>()
  for (const day of SCHEDULE_DAYS) {
    day.tradersOn.forEach((t) => allTraders.add(t))
    for (const group of day.tournaments) {
      for (const m of group.matches) {
        if (!isRosterFixture(m, group.code)) continue
        if (m.trading) allTraders.add(m.trading)
        if (m.prep) allTraders.add(m.prep)
        if (m.lead) allTraders.add(m.lead)
      }
    }
  }
  const traderList = [...allTraders].sort()

  return SCHEDULE_DAYS.map((day) => {
    const onSet = new Set(day.tradersOn)
    for (const group of day.tournaments) {
      for (const m of group.matches) {
        if (!isRosterFixture(m, group.code)) continue
        if (m.trading) onSet.add(m.trading)
        if (m.prep) onSet.add(m.prep)
      }
    }
    const on = [...onSet].sort()
    const off = traderList.filter((t) => !onSet.has(t))
    const assignments = on.map((trader) => {
      const blocks: string[] = []
      for (const group of day.tournaments) {
        for (const m of group.matches) {
          if (!isRosterFixture(m, group.code)) continue
          if (m.trading === trader) blocks.push(`Trading ${m.match}`)
          if (m.prep === trader) blocks.push(`Prep ${m.match}`)
        }
      }
      const role = trader === day.dailyLead ? 'Daily lead' : blocks.length ? 'On shift' : '—'
      return { trader, blocks: blocks.length ? blocks.join(' · ') : '—', role }
    })
    return { label: day.label.split(' ').slice(0, 2).join(' '), date: day.date, lead: day.dailyLead, on, off, assignments }
  })
}

function parseScheduleDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

export interface RosterGameEntry {
  ctx: SelectedMatchContext
  unassigned: boolean
}

export interface RosterDaySection {
  day: ScheduleDay
  games: RosterGameEntry[]
}

export function buildRosterGameList(): RosterDaySection[] {
  return SCHEDULE_DAYS.map((day) => ({
    day,
    games: day.tournaments.flatMap((tournament) =>
      tournament.matches
        .filter((fixture) => isRosterFixture(fixture, tournament.code))
        .map((fixture) => ({
          ctx: { fixture, day, tournament },
          unassigned: fixtureNeedsTrader(fixture) && !fixture.trading,
        })),
    ),
  }))
}

export type TraderMonthRoleId = 'trading' | 'prep' | 'data' | 'lead' | 'training'

export interface TraderMonthRoleTask {
  id: string
  time: string
  match: string
  code: string
  ctx: SelectedMatchContext | null
}

export interface TraderMonthRoleGridDay {
  date: string
  dayOfMonth: number
  weekdayShort: string
  isWeekend: boolean
  inScheduleRange: boolean
}

export interface TraderMonthRoleGridRow {
  id: TraderMonthRoleId
  label: string
  cells: Record<string, TraderMonthRoleTask[]>
}

export interface TraderMonthRoleGrid {
  year: number
  month: number
  monthLabel: string
  days: TraderMonthRoleGridDay[]
  rows: TraderMonthRoleGridRow[]
  stats: {
    tradingCount: number
    prepCount: number
    dataCount: number
    leadDays: number
    daysWithAssignments: number
  }
}

export interface MyRotaMonth {
  year: number
  month: number
}

export const TRADER_MONTH_ROLE_ROWS: { id: TraderMonthRoleId; label: string }[] = [
  { id: 'trading', label: 'Trading' },
  { id: 'prep', label: 'Prep' },
  { id: 'data', label: 'Data' },
  { id: 'lead', label: 'Lead' },
]

export function getDefaultMyRotaMonth(allDays: ScheduleDay[] = SCHEDULE_DAYS): MyRotaMonth {
  if (!allDays.length) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }
  const d = parseScheduleDate(allDays[0].date)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function getMyRotaMonthBounds(allDays: ScheduleDay[] = SCHEDULE_DAYS): {
  min: MyRotaMonth
  max: MyRotaMonth
} {
  if (!allDays.length) {
    const now = new Date()
    return { min: { year: now.getFullYear(), month: now.getMonth() }, max: { year: now.getFullYear(), month: now.getMonth() } }
  }
  const first = parseScheduleDate(allDays[0].date)
  const last = parseScheduleDate(allDays[allDays.length - 1].date)
  return {
    min: { year: first.getFullYear(), month: first.getMonth() },
    max: { year: last.getFullYear(), month: last.getMonth() },
  }
}

export function formatMyRotaMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

function myRotaMonthIndex(year: number, month: number): number {
  return year * 12 + month
}

export function canNavigateMyRotaMonth(
  year: number,
  month: number,
  direction: 'prev' | 'next',
  allDays: ScheduleDay[] = SCHEDULE_DAYS,
): boolean {
  const bounds = getMyRotaMonthBounds(allDays)
  const current = myRotaMonthIndex(year, month)
  const min = myRotaMonthIndex(bounds.min.year, bounds.min.month)
  const max = myRotaMonthIndex(bounds.max.year, bounds.max.month)
  if (direction === 'prev') return current > min
  return current < max
}

export function navigateMyRotaMonth(year: number, month: number, direction: 'prev' | 'next'): MyRotaMonth {
  const d = new Date(year, month, 1)
  d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
  return { year: d.getFullYear(), month: d.getMonth() }
}

function formatFixtureDisplayTime(time: string): string {
  return formatMinutesAsTime(parseFixtureTimeToMinutes(time))
}

function abbreviateMatchName(match: string, maxLen = 16): string {
  const trimmed = match.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1)}…`
}

export function buildTraderMonthRoleGrid(
  traderName: string,
  year: number,
  month: number,
): TraderMonthRoleGrid {
  const gameSections = buildRosterGameList()
  const sectionsByDate = new Map(gameSections.map((section) => [section.day.date, section]))
  const scheduleByDate = new Map(SCHEDULE_DAYS.map((day) => [day.date, day]))
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const rowCells: Record<TraderMonthRoleId, Record<string, TraderMonthRoleTask[]>> = {
    trading: {},
    prep: {},
    data: {},
    lead: {},
    training: {},
  }

  let tradingCount = 0
  let prepCount = 0
  let dataCount = 0
  let leadDays = 0
  const assignmentDates = new Set<string>()

  const days: TraderMonthRoleGridDay[] = []

  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`
    const d = new Date(year, month, dayOfMonth)
    const weekdayShort = d.toLocaleString('en-GB', { weekday: 'short' })
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const inScheduleRange = scheduleByDate.has(date)

    days.push({ date, dayOfMonth, weekdayShort, isWeekend, inScheduleRange })

    for (const role of TRADER_MONTH_ROLE_ROWS) {
      rowCells[role.id][date] = []
    }

    const scheduleDay = scheduleByDate.get(date)
    if (scheduleDay?.dailyLead === traderName) {
      rowCells.lead[date].push({
        id: `lead-${date}`,
        time: '—',
        match: 'Daily lead',
        code: '—',
        ctx: null,
      })
      leadDays++
      assignmentDates.add(date)
    }

    const section = sectionsByDate.get(date)
    for (const { ctx } of section?.games ?? []) {
      const { fixture, tournament } = ctx
      const task: TraderMonthRoleTask = {
        id: fixture.id,
        time: formatFixtureDisplayTime(fixture.time),
        match: abbreviateMatchName(fixture.match),
        code: tournament.code,
        ctx,
      }

      if (fixture.trading === traderName) {
        rowCells.trading[date].push(task)
        tradingCount++
        assignmentDates.add(date)
      }
      if (fixture.prep === traderName) {
        rowCells.prep[date].push(task)
        prepCount++
        assignmentDates.add(date)
      }
      if (getFixtureDataAssignment(fixture) === traderName) {
        rowCells.data[date].push(task)
        dataCount++
        assignmentDates.add(date)
      }
      if (fixture.lead === traderName) {
        rowCells.lead[date].push({
          ...task,
          id: `fixture-lead-${fixture.id}`,
          match: `Lead · ${task.match}`,
        })
        assignmentDates.add(date)
      }
    }
  }

  const rows: TraderMonthRoleGridRow[] = TRADER_MONTH_ROLE_ROWS.map((row) => ({
    id: row.id,
    label: row.label,
    cells: rowCells[row.id],
  }))

  return {
    year,
    month,
    monthLabel: formatMyRotaMonthLabel(year, month),
    days,
    rows,
    stats: {
      tradingCount,
      prepCount,
      dataCount,
      leadDays,
      daysWithAssignments: assignmentDates.size,
    },
  }
}

export function isFixtureUnassigned(fixture: ScheduleFixture, tournamentCode: string): boolean {
  return fixtureNeedsTrader(fixture) && !isSimulatedFixture(fixture, tournamentCode) && !fixture.trading
}

export function lifecycleLabel(lifecycle: GameLifecycle): string {
  const labels: Record<GameLifecycle, string> = {
    prepping: 'Prepping',
    published: 'Published',
    settled: 'Settled',
    'price-check': 'Price check',
  }
  return labels[lifecycle]
}

/** Minutes from midnight; handles "19:30" and malformed "19.3:00" (→ 19:30). */
export function parseFixtureTimeToMinutes(time: string): number {
  const raw = (time ?? '').trim()
  if (!raw || raw === '—') return 0

  if (raw.includes('.') && raw.includes(':')) {
    const [hourPart, minPart = '00'] = raw.split(':')
    const [hoursStr, decMinStr] = hourPart.split('.')
    const hours = Number.parseInt(hoursStr, 10)
    const decMin = Number.parseInt(decMinStr ?? '0', 10)
    const minutes = decMin * 10
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.max(0, Math.min(24 * 60 - 1, hours * 60 + minutes))
    }
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hours = Number.parseInt(match[1], 10)
    const minutes = Number.parseInt(match[2], 10)
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return Math.max(0, hours * 60 + minutes)
    }
  }

  return 0
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const clamped = Math.max(0, totalMinutes)
  const hours = Math.floor(clamped / 60) % 24
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function inferFixtureDurationMinutes(fixture: ScheduleFixture): number {
  const format = (fixture.format ?? '').toUpperCase()
  if (fixture.spansDays) return 8 * 60
  if (format.includes('TEST')) return 8 * 60
  if (format.includes('ODI') || format.includes('50')) return 8 * 60
  if (format.includes('T10') || format.includes('100')) return 2 * 60
  if (format.includes('T20')) return 3 * 60
  if (fixture.coverageMode === 'pre-match') return 90
  return 3 * 60
}

export type RosterCalendarRole = 'trading' | 'prep' | 'unassigned'

export interface RosterCalendarEventSegment {
  segmentId: string
  fixtureId: string
  dayDate: string
  dayIndex: number
  startMinutes: number
  endMinutes: number
  role: RosterCalendarRole
  trader: string | null
  ctx: SelectedMatchContext
  unassigned: boolean
  continuesFromPriorDay?: boolean
  continuesIntoNextDay?: boolean
}

export interface RosterCalendarDayLayout {
  dayDate: string
  events: Array<RosterCalendarEventSegment & { lane: number; laneCount: number }>
}

export interface RosterCalendarTraderRow {
  trader: string
  days: RosterCalendarDayLayout[]
  onDayDates: Set<string>
  leadDayDates: Set<string>
}

export interface RosterWeekCalendarLayout {
  traders: RosterCalendarTraderRow[]
  unassigned: RosterCalendarDayLayout[]
  hourStart: number
  hourEnd: number
  hourLabels: number[]
}

const PREP_LEAD_MINUTES = 120
const PREP_DURATION_MINUTES = 90

function addDayIso(dateIso: string, deltaDays: number): string {
  const d = parseScheduleDate(dateIso)
  d.setDate(d.getDate() + deltaDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function splitEventAcrossWeekDays(
  startDateIso: string,
  startMinutes: number,
  durationMinutes: number,
  weekDates: string[],
): Array<{ dayDate: string; dayIndex: number; startMinutes: number; endMinutes: number; continuesFromPriorDay: boolean; continuesIntoNextDay: boolean }> {
  const segments: Array<{
    dayDate: string
    dayIndex: number
    startMinutes: number
    endMinutes: number
    continuesFromPriorDay: boolean
    continuesIntoNextDay: boolean
  }> = []
  let remaining = durationMinutes
  let currentDate = startDateIso
  let currentStart = startMinutes
  let isContinuation = false

  while (remaining > 0) {
    const dayIndex = weekDates.indexOf(currentDate)
    if (dayIndex < 0) break

    const endOfDay = 24 * 60
    const endInDay = Math.min(currentStart + remaining, endOfDay)
    const durationInDay = endInDay - currentStart
    if (durationInDay > 0) {
      const spillsNext = endInDay < currentStart + remaining
      segments.push({
        dayDate: currentDate,
        dayIndex,
        startMinutes: currentStart,
        endMinutes: endInDay,
        continuesFromPriorDay: isContinuation,
        continuesIntoNextDay: spillsNext,
      })
      remaining -= durationInDay
    }

    if (remaining <= 0) break
    const nextDate = addDayIso(currentDate, 1)
    if (!weekDates.includes(nextDate)) break
    currentDate = nextDate
    currentStart = 0
    isContinuation = true
  }

  return segments
}

function layoutDayEvents(
  events: RosterCalendarEventSegment[],
): Array<RosterCalendarEventSegment & { lane: number; laneCount: number }> {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)
  const laneEnds: number[] = []
  const placed: Array<RosterCalendarEventSegment & { lane: number; laneCount: number }> = []

  for (const event of sorted) {
    let lane = 0
    for (; lane < laneEnds.length; lane++) {
      if (event.startMinutes >= laneEnds[lane]) break
    }
    if (lane === laneEnds.length) laneEnds.push(0)
    laneEnds[lane] = event.endMinutes
    placed.push({ ...event, lane, laneCount: 1 })
  }

  const laneCount = Math.max(1, laneEnds.length)
  return placed.map((e) => ({ ...e, laneCount }))
}

function buildDayLayouts(
  weekDates: string[],
  segments: RosterCalendarEventSegment[],
): RosterCalendarDayLayout[] {
  return weekDates.map((dayDate, dayIndex) => ({
    dayDate,
    events: layoutDayEvents(segments.filter((s) => s.dayDate === dayDate && s.dayIndex === dayIndex)),
  }))
}

export function buildRosterWeekCalendarLayout(
  weekSections: RosterDaySection[],
  weekDays: ScheduleDay[],
  rosterByDate: Map<string, { on: string[]; off: string[]; lead: string }>,
): RosterWeekCalendarLayout {
  const weekDates = weekDays.map((d) => d.date)
  const traderNames = new Set<string>()
  const rawSegments: RosterCalendarEventSegment[] = []
  const unassignedSegments: RosterCalendarEventSegment[] = []

  for (const day of weekDays) {
    const dayRoster = rosterByDate.get(day.date)
    dayRoster?.on.forEach((t) => traderNames.add(t))
    dayRoster?.off.forEach((t) => traderNames.add(t))
  }

  for (const section of weekSections) {
    for (const { ctx, unassigned } of section.games) {
      const { fixture, day, tournament } = ctx
      const kickoff = parseFixtureTimeToMinutes(fixture.time)
      const matchDuration = inferFixtureDurationMinutes(fixture)

      const pushSegments = (
        trader: string | null,
        role: RosterCalendarRole,
        startMinutes: number,
        durationMinutes: number,
        isUnassigned: boolean,
        target: RosterCalendarEventSegment[],
      ) => {
        const spans = splitEventAcrossWeekDays(day.date, startMinutes, durationMinutes, weekDates)
        for (const span of spans) {
          target.push({
            segmentId: `${fixture.id}-${role}-${trader ?? 'open'}-${span.dayDate}-${span.startMinutes}`,
            fixtureId: fixture.id,
            dayDate: span.dayDate,
            dayIndex: span.dayIndex,
            startMinutes: span.startMinutes,
            endMinutes: span.endMinutes,
            role,
            trader,
            ctx,
            unassigned: isUnassigned,
            continuesFromPriorDay: span.continuesFromPriorDay,
            continuesIntoNextDay: span.continuesIntoNextDay,
          })
        }
      }

      if (unassigned) {
        pushSegments(null, 'unassigned', kickoff, matchDuration, true, unassignedSegments)
        continue
      }

      if (fixture.trading) {
        traderNames.add(fixture.trading)
        pushSegments(fixture.trading, 'trading', kickoff, matchDuration, false, rawSegments)
      }
      if (fixture.prep && fixture.prep !== fixture.trading) {
        traderNames.add(fixture.prep)
        const prepStart = Math.max(0, kickoff - PREP_LEAD_MINUTES)
        pushSegments(fixture.prep, 'prep', prepStart, PREP_DURATION_MINUTES, false, rawSegments)
      }
    }
  }

  let minMinutes = 6 * 60
  let maxMinutes = 22 * 60
  const allSegments = [...rawSegments, ...unassignedSegments]
  for (const seg of allSegments) {
    minMinutes = Math.min(minMinutes, seg.startMinutes)
    maxMinutes = Math.max(maxMinutes, seg.endMinutes)
    if (seg.continuesIntoNextDay) maxMinutes = Math.max(maxMinutes, 24 * 60)
  }

  const hourStart = Math.max(0, Math.floor(minMinutes / 60) - 1)
  const hourEnd = Math.min(24, Math.ceil(maxMinutes / 60) + 1)
  const hourLabels: number[] = []
  for (let h = hourStart; h <= hourEnd; h++) hourLabels.push(h)

  const traders = [...traderNames].sort().map((trader) => {
    const onDayDates = new Set<string>()
    const leadDayDates = new Set<string>()
    for (const day of weekDays) {
      const dayRoster = rosterByDate.get(day.date)
      if (dayRoster?.on.includes(trader)) onDayDates.add(day.date)
      if (day.dailyLead === trader) leadDayDates.add(day.date)
    }
    const traderSegments = rawSegments.filter((s) => s.trader === trader)
    return {
      trader,
      days: buildDayLayouts(weekDates, traderSegments),
      onDayDates,
      leadDayDates,
    }
  })

  return {
    traders,
    unassigned: buildDayLayouts(weekDates, unassignedSegments),
    hourStart,
    hourEnd: Math.max(hourStart + 1, hourEnd),
    hourLabels,
  }
}

export interface WhosOnDayEvent {
  segmentId: string
  fixtureId: string
  startOffset: number
  endOffset: number
  role: RosterCalendarRole
  ctx: SelectedMatchContext
  unassigned: boolean
  continuesFromPriorDay: boolean
  continuesIntoNextDay: boolean
}

export interface WhosOnDayColumn {
  id: string
  label: string
  isLead: boolean
  isUnassigned: boolean
  isOnShift: boolean
  events: WhosOnDayEvent[]
}

export interface WhosOnDayLayoutOptions {
  showAllTraders?: boolean
  allTraders?: string[]
}

export interface WhosOnDayLayout {
  day: ScheduleDay
  columns: WhosOnDayColumn[]
  timelineStartHour: number
  timelineDurationHours: number
  hourLabels: Array<{ offsetMinutes: number; label: string }>
  tradersOnCount: number
  unassignedCount: number
  gameCount: number
}

const WHOS_ON_TIMELINE_START_HOUR = 6
const WHOS_ON_TIMELINE_MIN_HOURS = 24
const WHOS_ON_TIMELINE_MAX_HOURS = 36

function minutesFromViewDayOrigin(
  viewDayIso: string,
  eventDayIso: string,
  minuteOfDay: number,
  originHour: number,
): number {
  const originMs = parseScheduleDate(viewDayIso).getTime() + originHour * 60 * 60 * 1000
  const eventMs = parseScheduleDate(eventDayIso).getTime() + minuteOfDay * 60 * 1000
  return (eventMs - originMs) / (60 * 1000)
}

function pushWhosOnSegments(
  target: WhosOnDayEvent[],
  viewDayIso: string,
  fixtureDayIso: string,
  fixtureId: string,
  kickoffMinutes: number,
  durationMinutes: number,
  role: RosterCalendarRole,
  ctx: SelectedMatchContext,
  unassigned: boolean,
  timelineStartHour: number,
) {
  const startOffset = minutesFromViewDayOrigin(viewDayIso, fixtureDayIso, kickoffMinutes, timelineStartHour)
  const endOffset = minutesFromViewDayOrigin(
    viewDayIso,
    fixtureDayIso,
    kickoffMinutes + durationMinutes,
    timelineStartHour,
  )
  const clippedStart = Math.max(0, startOffset)
  if (endOffset <= clippedStart) return

  target.push({
    segmentId: `${fixtureId}-${role}-${viewDayIso}-${clippedStart}`,
    fixtureId,
    startOffset: clippedStart,
    endOffset,
    role,
    ctx,
    unassigned,
    continuesFromPriorDay: fixtureDayIso !== viewDayIso && startOffset < 0,
    continuesIntoNextDay: false,
  })
}

function buildWhosOnTimelineLabels(
  timelineStartHour: number,
  timelineDurationHours: number,
): Array<{ offsetMinutes: number; label: string }> {
  const labels: Array<{ offsetMinutes: number; label: string }> = []
  const stepHours = timelineDurationHours > 18 ? 3 : 2
  for (let h = 0; h <= timelineDurationHours; h += stepHours) {
    const totalHour = timelineStartHour + h
    const dayBump = Math.floor(totalHour / 24)
    const hour = totalHour % 24
    const label = dayBump > 0
      ? `${String(hour).padStart(2, '0')}:00 +${dayBump}`
      : `${String(hour).padStart(2, '0')}:00`
    labels.push({ offsetMinutes: h * 60, label })
  }
  return labels
}

export function buildWhosOnDayLayout(
  day: ScheduleDay,
  daySection: RosterDaySection | undefined,
  priorDaySection: RosterDaySection | null,
  rosterByDate: Map<string, { on: string[]; off: string[]; lead: string }>,
  options: WhosOnDayLayoutOptions = {},
): WhosOnDayLayout {
  const timelineStartHour = WHOS_ON_TIMELINE_START_HOUR

  const traderEvents = new Map<string, WhosOnDayEvent[]>()
  const unassignedEvents: WhosOnDayEvent[] = []
  const tradersOn = [...(rosterByDate.get(day.date)?.on ?? day.tradersOn)].sort()

  const ingestGame = (
    ctx: SelectedMatchContext,
    unassigned: boolean,
    fixtureDayIso: string,
    kickoff: number,
    duration: number,
  ) => {
    const { fixture } = ctx
    if (unassigned) {
      pushWhosOnSegments(
        unassignedEvents,
        day.date,
        fixtureDayIso,
        fixture.id,
        kickoff,
        duration,
        'unassigned',
        ctx,
        true,
        timelineStartHour,
      )
      return
    }
    if (fixture.trading) {
      const list = traderEvents.get(fixture.trading) ?? []
      pushWhosOnSegments(
        list,
        day.date,
        fixtureDayIso,
        fixture.id,
        kickoff,
        duration,
        'trading',
        ctx,
        false,
        timelineStartHour,
      )
      traderEvents.set(fixture.trading, list)
    }
    if (fixture.prep && fixture.prep !== fixture.trading) {
      const list = traderEvents.get(fixture.prep) ?? []
      const prepStart = Math.max(0, kickoff - PREP_LEAD_MINUTES)
      pushWhosOnSegments(
        list,
        day.date,
        fixtureDayIso,
        fixture.id,
        prepStart,
        PREP_DURATION_MINUTES,
        'prep',
        ctx,
        false,
        timelineStartHour,
      )
      traderEvents.set(fixture.prep, list)
    }
  }

  for (const { ctx, unassigned } of daySection?.games ?? []) {
    const kickoff = parseFixtureTimeToMinutes(ctx.fixture.time)
    const duration = inferFixtureDurationMinutes(ctx.fixture)
    ingestGame(ctx, unassigned, day.date, kickoff, duration)
  }

  if (priorDaySection) {
    const priorDate = priorDaySection.day.date
    for (const { ctx, unassigned } of priorDaySection.games) {
      const kickoff = parseFixtureTimeToMinutes(ctx.fixture.time)
      const duration = inferFixtureDurationMinutes(ctx.fixture)
      if (kickoff + duration <= 24 * 60) continue
      ingestGame(ctx, unassigned, priorDate, kickoff, duration)
    }
  }

  const allEvents = [...unassignedEvents, ...[...traderEvents.values()].flat()]
  const maxEndMinutes = allEvents.reduce((max, e) => Math.max(max, e.endOffset), 0)
  const timelineDurationHours = Math.min(
    WHOS_ON_TIMELINE_MAX_HOURS,
    Math.max(WHOS_ON_TIMELINE_MIN_HOURS, Math.ceil(maxEndMinutes / 60) + 1),
  )
  const finalDurationMinutes = timelineDurationHours * 60

  const clipEvents = (events: WhosOnDayEvent[]) =>
    events
      .map((e) => ({
        ...e,
        continuesIntoNextDay: e.endOffset > finalDurationMinutes,
        endOffset: Math.min(e.endOffset, finalDurationMinutes),
      }))
      .filter((e) => e.endOffset > e.startOffset)

  const tradersOnSet = new Set(tradersOn)
  const columnTraders = options.showAllTraders && options.allTraders?.length
    ? [...options.allTraders].sort()
    : tradersOn

  const columns: WhosOnDayColumn[] = []
  if (unassignedEvents.length > 0) {
    columns.push({
      id: '__unassigned__',
      label: 'Unassigned',
      isLead: false,
      isUnassigned: true,
      isOnShift: false,
      events: clipEvents(unassignedEvents),
    })
  }

  for (const trader of columnTraders) {
    columns.push({
      id: trader,
      label: trader,
      isLead: day.dailyLead === trader,
      isUnassigned: false,
      isOnShift: tradersOnSet.has(trader),
      events: clipEvents(traderEvents.get(trader) ?? []),
    })
  }

  const unassignedCount = daySection?.games.filter((g) => g.unassigned).length ?? 0
  const gameCount = daySection?.games.length ?? 0

  return {
    day,
    columns,
    timelineStartHour,
    timelineDurationHours,
    hourLabels: buildWhosOnTimelineLabels(timelineStartHour, timelineDurationHours),
    tradersOnCount: tradersOn.length,
    unassignedCount,
    gameCount,
  }
}

export function buildTraderPersonalCalendarLayout(
  weekSections: RosterDaySection[],
  weekDays: ScheduleDay[],
  rosterByDate: Map<string, { on: string[]; off: string[]; lead: string }>,
  traderName: string,
): { row: RosterCalendarTraderRow; hourStart: number; hourEnd: number; hourLabels: number[] } {
  const full = buildRosterWeekCalendarLayout(weekSections, weekDays, rosterByDate)
  const existing = full.traders.find((t) => t.trader === traderName)
  if (existing) {
    return {
      row: existing,
      hourStart: full.hourStart,
      hourEnd: full.hourEnd,
      hourLabels: full.hourLabels,
    }
  }

  const weekDates = weekDays.map((d) => d.date)
  const onDayDates = new Set<string>()
  const leadDayDates = new Set<string>()
  for (const day of weekDays) {
    const dayRoster = rosterByDate.get(day.date)
    if (dayRoster?.on.includes(traderName)) onDayDates.add(day.date)
    if (day.dailyLead === traderName) leadDayDates.add(day.date)
  }

  return {
    row: {
      trader: traderName,
      days: buildDayLayouts(weekDates, []),
      onDayDates,
      leadDayDates,
    },
    hourStart: full.hourStart,
    hourEnd: full.hourEnd,
    hourLabels: full.hourLabels,
  }
}
