import type { CricketFormat, Gender } from './tournaments'
import { getTournamentFixtureScheduleDates } from './tournamentLiveData'

export const PREP_CALENDAR_YEARS = [2026, 2027] as const
export type PrepCalendarYear = (typeof PREP_CALENDAR_YEARS)[number]
export type PrepCalendarScope = PrepCalendarYear | 'all'
/** Default planning year (2027 FTP). */
export const PREP_CALENDAR_YEAR: PrepCalendarYear = 2027

const ETPL_2026_DATES = getTournamentFixtureScheduleDates('t20-m-etpl', 2026)!
const ETPL_2027_DATES = getTournamentFixtureScheduleDates('t20-m-etpl', 2027)!

export type ScheduleDateStatus = 'confirmed' | 'estimated' | 'tbc'

export interface TournamentScheduleEntry {
  id: string
  name: string
  format: CricketFormat
  gender: Gender
  country?: string
  category: 'icc' | 'bilateral' | 'franchise'
  startDate: string
  endDate: string
  dateStatus: ScheduleDateStatus
  notes?: string
}

/** FTP / ICC / franchise windows for prep planning — calendar year 2027. */
export const TOURNAMENT_SCHEDULE_2027: TournamentScheduleEntry[] = [
  { id: 't20-m-sa', name: 'SA20', format: 't20', gender: 'men', country: 'South Africa', category: 'franchise', startDate: '2027-01-10', endDate: '2027-02-20', dateStatus: 'estimated', notes: '2027 dates TBC; Jan-Feb seasonal window' },
  { id: 'sched-2027-ilt20', name: 'ILT20', format: 't20', gender: 'men', country: 'UAE', category: 'franchise', startDate: '2027-01-10', endDate: '2027-02-20', dateStatus: 'estimated', notes: 'Jan-Feb seasonal window' },
  { id: 'sched-2027-bpl', name: 'Bangladesh Premier League (BPL)', format: 't20', gender: 'men', country: 'Bangladesh', category: 'franchise', startDate: '2027-01-15', endDate: '2027-02-15', dateStatus: 'estimated', notes: 'Jan-Feb seasonal window' },
  { id: 'sched-2027-zim-ind-odi', name: 'Zimbabwe tour of India', format: 'lista', gender: 'men', country: 'India', category: 'bilateral', startDate: '2027-01-03', endDate: '2027-01-09', dateStatus: 'confirmed' },
  { id: 'sched-2027-aus-ind-test', name: 'Australia tour of India', format: 'firstclass', gender: 'men', country: 'India', category: 'bilateral', startDate: '2027-01-21', endDate: '2027-03-03', dateStatus: 'confirmed' },
  { id: 't20-m-ipl', name: 'Indian Premier League (IPL)', format: 't20', gender: 'men', country: 'India', category: 'franchise', startDate: '2027-03-14', endDate: '2027-05-30', dateStatus: 'confirmed' },
  { id: 'sched-2027-psl', name: 'Pakistan Super League (PSL)', format: 't20', gender: 'men', country: 'Pakistan', category: 'franchise', startDate: '2027-04-01', endDate: '2027-05-31', dateStatus: 'estimated', notes: 'Apr-May seasonal window' },
  { id: 'sched-2027-eng-pak-test', name: 'England vs Pakistan (Test)', format: 'firstclass', gender: 'men', country: 'England', category: 'bilateral', startDate: '2027-05-15', endDate: '2027-05-29', dateStatus: 'estimated', notes: 'End date TBD; ~2 week window shown' },
  { id: 'sched-2027-eng-ban-test', name: 'England vs Bangladesh (Test)', format: 'firstclass', gender: 'men', country: 'England', category: 'bilateral', startDate: '2027-05-28', endDate: '2027-06-01', dateStatus: 'confirmed' },
  { id: 'sched-2027-wtc-final', name: 'ICC World Test Championship Final 2027', format: 'firstclass', gender: 'men', category: 'icc', startDate: '2027-06-09', endDate: '2027-06-13', dateStatus: 'confirmed' },
  { id: 'sched-2027-asia-cup', name: 'Asia Cup 2027', format: 'lista', gender: 'men', category: 'icc', startDate: '2027-06-18', endDate: '2027-06-30', dateStatus: 'estimated', notes: 'Format TBD; end date TBC' },
  { id: 'sched-2027-eng-aus-test', name: 'England vs Australia (Test Series)', format: 'firstclass', gender: 'men', country: 'England', category: 'bilateral', startDate: '2027-06-18', endDate: '2027-08-02', dateStatus: 'confirmed' },
  { id: 'sched-2027-ban-pak-test', name: 'Bangladesh vs Pakistan (Test Series)', format: 'firstclass', gender: 'men', country: 'Bangladesh', category: 'bilateral', startDate: '2027-06-01', endDate: '2027-06-14', dateStatus: 'estimated', notes: 'June 2027; dates TBD' },
  { id: 'sched-2027-ire-pak-test', name: 'Ireland vs Pakistan (Test)', format: 'firstclass', gender: 'men', country: 'Ireland', category: 'bilateral', startDate: '2027-06-15', endDate: '2027-06-19', dateStatus: 'estimated', notes: 'June 2027; dates TBD' },
  { id: 'sched-2027-mlc', name: 'Major League Cricket (MLC)', format: 't20', gender: 'men', country: 'USA', category: 'franchise', startDate: '2027-06-15', endDate: '2027-07-31', dateStatus: 'estimated', notes: 'Jun-Jul seasonal window' },
  { id: 'sched-2027-tnpl', name: 'Tamil Nadu Premier League (TNPL)', format: 't20', gender: 'men', country: 'India', category: 'franchise', startDate: '2027-07-31', endDate: '2027-08-23', dateStatus: 'estimated', notes: 'Pattern from 2026 window' },
  { id: 'sched-2027-lpl', name: 'Lanka Premier League (LPL)', format: 't20', gender: 'men', country: 'Sri Lanka', category: 'franchise', startDate: '2027-07-20', endDate: '2027-08-08', dateStatus: 'estimated' },
  { id: 't20-m-hundred', name: 'The Hundred', format: 't20', gender: 'men', country: 'England & Wales', category: 'franchise', startDate: '2027-07-20', endDate: '2027-08-16', dateStatus: 'estimated', notes: '2027 dates TBC; Jul-Aug pattern' },
  { id: 'sched-2027-gsl', name: 'Global Super League (GSL)', format: 't20', gender: 'men', country: 'West Indies/Guyana', category: 'franchise', startDate: '2027-07-23', endDate: '2027-08-01', dateStatus: 'estimated' },
  { id: 't20-m-cpl', name: 'Caribbean Premier League (CPL)', format: 't20', gender: 'men', country: 'Caribbean', category: 'franchise', startDate: '2027-08-07', endDate: '2027-09-20', dateStatus: 'estimated' },
  {
    id: 't20-m-etpl',
    name: 'European T20 Premier League',
    format: 't20',
    gender: 'men',
    country: 'Europe',
    category: 'franchise',
    startDate: ETPL_2027_DATES.startDate,
    endDate: ETPL_2027_DATES.endDate,
    dateStatus: 'confirmed',
    notes: 'Dates from published fixture list (26 Aug – 20 Sep)',
  },
  { id: 'sched-2027-aus-nz-test', name: 'Australia vs New Zealand (Test Series)', format: 'firstclass', gender: 'men', country: 'Australia', category: 'bilateral', startDate: '2027-08-01', endDate: '2027-08-28', dateStatus: 'estimated', notes: 'August 2027; dates TBD' },
  { id: 'sched-2027-eng-nz', name: 'England vs New Zealand (Test/ODI Series)', format: 'firstclass', gender: 'men', country: 'England', category: 'bilateral', startDate: '2027-09-07', endDate: '2027-10-03', dateStatus: 'estimated', notes: 'From 7 Sep onward; end TBD' },
  { id: 'sched-2027-cwc', name: 'ICC Cricket World Cup 2027', format: 'lista', gender: 'men', category: 'icc', startDate: '2027-10-04', endDate: '2027-11-21', dateStatus: 'confirmed' },
  { id: 't20-m-bbl', name: 'Big Bash League (BBL)', format: 't20', gender: 'men', country: 'Australia', category: 'franchise', startDate: '2027-12-01', endDate: '2028-01-31', dateStatus: 'estimated', notes: 'Dec 2027-Jan 2028 likely window' },
]

export function parseScheduleUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIsoScheduleDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** True when the entry has any overlap with Sep–Dec in the reference year. */
export function scheduleOverlapsSepDec(entry: TournamentScheduleEntry, referenceYear: number): boolean {
  const start = parseScheduleUtcDate(entry.startDate).getTime()
  const end = parseScheduleUtcDate(entry.endDate).getTime()
  const sep1 = Date.UTC(referenceYear, 8, 1)
  const dec31 = Date.UTC(referenceYear, 11, 31)
  return start <= dec31 && end >= sep1
}

/** Shift start/end to a target year, preserving month/day and cross-year spans (e.g. BBL). */
export function shiftScheduleEntryYear(entry: TournamentScheduleEntry, targetYear: number): TournamentScheduleEntry {
  const start = parseScheduleUtcDate(entry.startDate)
  const end = parseScheduleUtcDate(entry.endDate)
  const endYearOffset = end.getUTCFullYear() - start.getUTCFullYear()
  const newStart = new Date(Date.UTC(targetYear, start.getUTCMonth(), start.getUTCDate()))
  const newEnd = new Date(Date.UTC(targetYear + endYearOffset, end.getUTCMonth(), end.getUTCDate()))
  return {
    ...entry,
    startDate: toIsoScheduleDate(newStart),
    endDate: toIsoScheduleDate(newEnd),
  }
}

/** Late-season 2027 FTP comps that also run in the preceding calendar year (Sep–Dec window). */
export function buildSchedule2026(): TournamentScheduleEntry[] {
  const rows: TournamentScheduleEntry[] = []

  for (const entry of TOURNAMENT_SCHEDULE_2027) {
    if (!scheduleOverlapsSepDec(entry, 2027)) continue

    if (entry.id === 't20-m-etpl') {
      rows.push({
        ...entry,
        startDate: ETPL_2026_DATES.startDate,
        endDate: ETPL_2026_DATES.endDate,
        dateStatus: 'confirmed',
        notes: 'Dates from published fixture list (26 Aug – 20 Sep)',
      })
      continue
    }

    rows.push({
      ...shiftScheduleEntryYear(entry, 2026),
      notes: entry.notes ? `${entry.notes}; 2026 season window` : '2026 season window',
    })
  }

  return rows.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export const TOURNAMENT_SCHEDULE_2026: TournamentScheduleEntry[] = buildSchedule2026()

export function getScheduleForYear(year: PrepCalendarYear): TournamentScheduleEntry[] {
  return year === 2026 ? TOURNAMENT_SCHEDULE_2026 : TOURNAMENT_SCHEDULE_2027
}

export function getScheduleForScope(scope: PrepCalendarScope): TournamentScheduleEntry[] {
  if (scope === 'all') {
    return [...TOURNAMENT_SCHEDULE_2026, ...TOURNAMENT_SCHEDULE_2027].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    )
  }
  return getScheduleForYear(scope)
}

export function getScheduleEntryById(id: string, year?: PrepCalendarYear): TournamentScheduleEntry | undefined {
  if (year !== undefined) {
    return getScheduleForYear(year).find((e) => e.id === id)
  }
  return TOURNAMENT_SCHEDULE_2026.find((e) => e.id === id) ?? TOURNAMENT_SCHEDULE_2027.find((e) => e.id === id)
}

export function getAllScheduleEntries(year: PrepCalendarYear = PREP_CALENDAR_YEAR): TournamentScheduleEntry[] {
  return getScheduleForYear(year)
}
