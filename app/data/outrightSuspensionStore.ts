import { generateFixtures, type Fixture } from './fixtures'
import {
  getOutrightsForTournament,
  reactivateOutright,
  suspendOutright,
} from './outrightsStore'
import { getTeamsByTournament } from './teams'

const STORAGE_KEY = 'tm-outright-suspension'
const CHANGE_EVENT = 'outright-suspension-changed'

export type OutrightSuspensionMode = 'manual' | 'fixture' | 'daily'

export interface DailySuspensionWindow {
  id: string
  date?: string
  suspendTime: string
  resumeTime: string
}

export interface OutrightSuspensionSettings {
  mode: OutrightSuspensionMode
  minutesBeforeFixture: number
  defaultKickoffTime: string
  fixtureSuspendDurationMinutes: number
  dailyWindows: DailySuspensionWindow[]
}

interface TournamentSuspensionState {
  settings: OutrightSuspensionSettings
  autoSuspendedOutrightIds: string[]
  manualBypassUntil?: number
}

type Store = Record<string, TournamentSuspensionState>

let storeVersion = 0

export function getOutrightSuspensionStoreVersion(): number {
  return storeVersion
}

export function subscribeOutrightSuspensionStore(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    storeVersion++
    onChange()
  }
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

function notify(): void {
  if (typeof window === 'undefined') return
  storeVersion++
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

function newWindowId(): string {
  return `sw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function defaultSettings(): OutrightSuspensionSettings {
  return {
    mode: 'manual',
    minutesBeforeFixture: 30,
    defaultKickoffTime: '19:30',
    fixtureSuspendDurationMinutes: 210,
    dailyWindows: [{ id: newWindowId(), suspendTime: '18:00', resumeTime: '23:30' }],
  }
}

function readAll(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Store
  } catch {
    return {}
  }
}

function writeAll(all: Store): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  notify()
}

function normalizeTime(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback
  const m = v.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return fallback
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function normalizeSettings(raw: Partial<OutrightSuspensionSettings> | undefined): OutrightSuspensionSettings {
  const base = defaultSettings()
  const mode =
    raw?.mode === 'fixture' || raw?.mode === 'daily' || raw?.mode === 'manual' ? raw.mode : base.mode
  const dailyWindows =
    Array.isArray(raw?.dailyWindows) && raw.dailyWindows.length > 0
      ? raw.dailyWindows.map((w, i) => ({
          id: w.id || `sw-${i}`,
          date: typeof w.date === 'string' && w.date ? w.date : undefined,
          suspendTime: normalizeTime(w.suspendTime, '18:00'),
          resumeTime: normalizeTime(w.resumeTime, '23:30'),
        }))
      : base.dailyWindows

  return {
    mode,
    minutesBeforeFixture:
      Number.isFinite(raw?.minutesBeforeFixture) && (raw!.minutesBeforeFixture as number) >= 0
        ? Math.round(raw!.minutesBeforeFixture as number)
        : base.minutesBeforeFixture,
    defaultKickoffTime: normalizeTime(raw?.defaultKickoffTime, base.defaultKickoffTime),
    fixtureSuspendDurationMinutes:
      Number.isFinite(raw?.fixtureSuspendDurationMinutes) &&
      (raw!.fixtureSuspendDurationMinutes as number) > 0
        ? Math.round(raw!.fixtureSuspendDurationMinutes as number)
        : base.fixtureSuspendDurationMinutes,
    dailyWindows,
  }
}

function getState(tournamentId: string): TournamentSuspensionState {
  const row = readAll()[tournamentId]
  return {
    settings: normalizeSettings(row?.settings),
    autoSuspendedOutrightIds: row?.autoSuspendedOutrightIds ?? [],
    manualBypassUntil: row?.manualBypassUntil,
  }
}

function saveState(tournamentId: string, patch: Partial<TournamentSuspensionState>): void {
  const all = readAll()
  const current = getState(tournamentId)
  all[tournamentId] = { ...current, ...patch }
  writeAll(all)
}

export function getOutrightSuspensionSettings(tournamentId: string): OutrightSuspensionSettings {
  return getState(tournamentId).settings
}

export function saveOutrightSuspensionSettings(
  tournamentId: string,
  patch: Partial<OutrightSuspensionSettings>,
): void {
  const current = getState(tournamentId)
  saveState(tournamentId, {
    settings: normalizeSettings({ ...current.settings, ...patch }),
  })
}

export function addDailySuspensionWindow(tournamentId: string): void {
  const settings = getOutrightSuspensionSettings(tournamentId)
  saveOutrightSuspensionSettings(tournamentId, {
    dailyWindows: [
      ...settings.dailyWindows,
      { id: newWindowId(), suspendTime: '18:00', resumeTime: '23:30' },
    ],
  })
}

export function updateDailySuspensionWindow(
  tournamentId: string,
  windowId: string,
  patch: Partial<Omit<DailySuspensionWindow, 'id'>>,
): void {
  const settings = getOutrightSuspensionSettings(tournamentId)
  saveOutrightSuspensionSettings(tournamentId, {
    dailyWindows: settings.dailyWindows.map((w) => (w.id === windowId ? { ...w, ...patch } : w)),
  })
}

export function removeDailySuspensionWindow(tournamentId: string, windowId: string): void {
  const settings = getOutrightSuspensionSettings(tournamentId)
  const next = settings.dailyWindows.filter((w) => w.id !== windowId)
  saveOutrightSuspensionSettings(tournamentId, {
    dailyWindows: next.length > 0 ? next : defaultSettings().dailyWindows,
  })
}

export function markManualOutrightSuspend(tournamentId: string, outrightId: string): void {
  const state = getState(tournamentId)
  saveState(tournamentId, {
    autoSuspendedOutrightIds: state.autoSuspendedOutrightIds.filter((id) => id !== outrightId),
  })
}

export function markManualOutrightReactivate(
  tournamentId: string,
  outrightId: string,
  bypassUntilMs?: number,
): void {
  const state = getState(tournamentId)
  saveState(tournamentId, {
    autoSuspendedOutrightIds: state.autoSuspendedOutrightIds.filter((id) => id !== outrightId),
    manualBypassUntil: bypassUntilMs ?? state.manualBypassUntil,
  })
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

export function parseFixtureDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d+)(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})$/i)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()]
  const year = parseInt(m[3], 10)
  if (month === undefined || !Number.isFinite(day) || !Number.isFinite(year)) return null
  return new Date(year, month, day)
}

function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const [h, min] = timeHHmm.split(':').map((v) => parseInt(v, 10))
  const d = new Date(date)
  d.setHours(h, min, 0, 0)
  return d
}

function calendarDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isInDailyWindow(now: Date, window: DailySuspensionWindow): boolean {
  if (window.date && window.date !== calendarDateKey(now)) return false

  const suspendAt = combineDateAndTime(now, window.suspendTime)
  let resumeAt = combineDateAndTime(now, window.resumeTime)

  if (resumeAt <= suspendAt) {
    resumeAt = new Date(resumeAt.getTime() + 24 * 60 * 60 * 1000)
    if (now >= suspendAt) return true
    const prevSuspend = new Date(suspendAt.getTime() - 24 * 60 * 60 * 1000)
    if (now < resumeAt && now >= prevSuspend) return true
    return false
  }

  return now >= suspendAt && now < resumeAt
}

export interface SuspensionEvaluation {
  shouldSuspend: boolean
  suspendUntilMs?: number
  reason?: string
}

export function evaluateOutrightSuspension(
  settings: OutrightSuspensionSettings,
  fixtures: Fixture[],
  now: Date = new Date(),
): SuspensionEvaluation {
  if (settings.mode === 'manual') {
    return { shouldSuspend: false }
  }

  if (settings.mode === 'fixture') {
    let shouldSuspend = false
    let latestEnd = 0
    let reason: string | undefined

    for (const fixture of fixtures) {
      if (fixture.homeTeam === 'TBC' || fixture.awayTeam === 'TBC') continue
      const day = parseFixtureDate(fixture.date)
      if (!day) continue

      const kickoff = combineDateAndTime(day, settings.defaultKickoffTime)
      const suspendFrom = kickoff.getTime() - settings.minutesBeforeFixture * 60 * 1000
      const suspendUntil = kickoff.getTime() + settings.fixtureSuspendDurationMinutes * 60 * 1000
      const t = now.getTime()

      if (t >= suspendFrom && t < suspendUntil) {
        shouldSuspend = true
        latestEnd = Math.max(latestEnd, suspendUntil)
        reason = `Fixture window: ${fixture.homeTeam} vs ${fixture.awayTeam}`
      }
    }

    return {
      shouldSuspend,
      suspendUntilMs: shouldSuspend ? latestEnd : undefined,
      reason,
    }
  }

  if (settings.mode === 'daily') {
    for (const window of settings.dailyWindows) {
      if (isInDailyWindow(now, window)) {
        const resumeAt = combineDateAndTime(now, window.resumeTime)
        let until = resumeAt.getTime()
        const suspendAt = combineDateAndTime(now, window.suspendTime)
        if (resumeAt <= suspendAt) {
          until = resumeAt.getTime() + 24 * 60 * 60 * 1000
        }
        const label = window.date ? window.date : 'daily'
        return {
          shouldSuspend: true,
          suspendUntilMs: until,
          reason: `Daily window (${label} ${window.suspendTime}–${window.resumeTime})`,
        }
      }
    }
    return { shouldSuspend: false }
  }

  return { shouldSuspend: false }
}

export function getFixturesForTournament(tournamentId: string): Fixture[] {
  return generateFixtures(getTeamsByTournament(tournamentId), tournamentId)
}

export function applyOutrightAutoSuspension(
  tournamentId: string,
  now: Date = new Date(),
): { changed: boolean; evaluation: SuspensionEvaluation } {
  if (typeof window === 'undefined') {
    return { changed: false, evaluation: { shouldSuspend: false } }
  }

  const state = getState(tournamentId)
  const settings = state.settings
  const fixtures = getFixturesForTournament(tournamentId)
  const evaluation = evaluateOutrightSuspension(settings, fixtures, now)

  if (settings.mode === 'manual') {
    return { changed: false, evaluation }
  }

  const bypassActive = state.manualBypassUntil !== undefined && now.getTime() < state.manualBypassUntil
  const shouldSuspend = evaluation.shouldSuspend && !bypassActive

  const outrights = getOutrightsForTournament(tournamentId)
  const published = outrights.filter((o) => o.status === 'published')
  const autoIds = new Set(state.autoSuspendedOutrightIds)
  let changed = false

  if (shouldSuspend) {
    for (const outright of published) {
      if (!autoIds.has(outright.id)) {
        suspendOutright(tournamentId, outright.id)
        autoIds.add(outright.id)
        changed = true
      }
    }
  } else {
    for (const id of [...autoIds]) {
      reactivateOutright(tournamentId, id)
      autoIds.delete(id)
      changed = true
    }
    if (!evaluation.shouldSuspend && state.manualBypassUntil) {
      saveState(tournamentId, { autoSuspendedOutrightIds: [...autoIds], manualBypassUntil: undefined })
      return { changed, evaluation }
    }
  }

  if (changed || autoIds.size !== state.autoSuspendedOutrightIds.length) {
    saveState(tournamentId, { autoSuspendedOutrightIds: [...autoIds] })
  }

  return { changed, evaluation }
}

export function manualReactivateOutrightWithBypass(tournamentId: string, outrightId: string): void {
  const state = getState(tournamentId)
  const evaluation = evaluateOutrightSuspension(
    state.settings,
    getFixturesForTournament(tournamentId),
    new Date(),
  )
  reactivateOutright(tournamentId, outrightId)
  markManualOutrightReactivate(tournamentId, outrightId, evaluation.suspendUntilMs)
}

export const OUTRIGHT_SUSPENSION_MODE_LABELS: Record<OutrightSuspensionMode, string> = {
  manual: 'Manual only',
  fixture: 'Fixture start times',
  daily: 'Daily schedule',
}
