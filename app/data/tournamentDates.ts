import {
  getScheduleEntryById,
  parseScheduleUtcDate,
  PREP_CALENDAR_YEAR,
  type PrepCalendarYear,
} from './tournamentSchedule2027'

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

export { PREP_CALENDAR_YEAR }
export type { PrepCalendarYear }

export function syntheticTournamentStartDate(id: string, format: string, gender: string): Date {
  const scheduled = getScheduleEntryById(id)
  if (scheduled) return parseScheduleUtcDate(scheduled.startDate)
  const day = ((hashSeed(`${id}|${format}|${gender}`) - 1) % 365) + 1
  return new Date(Date.UTC(PREP_CALENDAR_YEAR, 0, day))
}

export function syntheticTournamentDurationDays(id: string, format: string): number {
  const scheduled = getScheduleEntryById(id)
  if (scheduled) {
    const start = parseScheduleUtcDate(scheduled.startDate).getTime()
    const end = parseScheduleUtcDate(scheduled.endDate).getTime()
    return Math.max(1, Math.round((end - start) / 86_400_000) + 1)
  }
  const rand = hashSeed(`${id}|${format}|duration`) % 100
  if (format === 'firstclass') return 12 + (rand % 10)
  if (format === 'lista') return 8 + (rand % 8)
  if (format === 't10') return 3 + (rand % 4)
  return 5 + (rand % 10)
}

export function syntheticTournamentEndDate(id: string, format: string, gender: string): Date {
  const scheduled = getScheduleEntryById(id)
  if (scheduled) return parseScheduleUtcDate(scheduled.endDate)
  const start = syntheticTournamentStartDate(id, format, gender)
  const days = syntheticTournamentDurationDays(id, format)
  return new Date(start.getTime() + (days - 1) * 86_400_000)
}

export function formatTournamentDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function daysUntil(date: Date, from = new Date()): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.round((target - start) / 86_400_000)
}

export function dayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  return Math.floor((date.getTime() - start) / 86_400_000)
}

/** Clip schedule window to a calendar year for Gantt display. */
export function clipDatesToYear(start: Date, end: Date, year: number): { start: Date; end: Date } {
  const yearStart = Date.UTC(year, 0, 1)
  const yearEnd = Date.UTC(year, 11, 31)
  const s = Math.max(start.getTime(), yearStart)
  const e = Math.min(end.getTime(), yearEnd)
  return { start: new Date(s), end: new Date(e) }
}
