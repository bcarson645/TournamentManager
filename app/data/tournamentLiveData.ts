import type { Team } from "./teams"
import { getTeamsByTournament } from "./teams"
import { generateFixtures } from "./fixtures"

export type FormResult = "W" | "L"

export interface StandingRow {
  teamId: string
  rank: number
  played?: number
  won?: number
  lost?: number
  tied?: number
  noResult?: number
  points?: number
  form?: FormResult[]
  nextOpponents: string[]
  qualifyHighlight?: boolean
}

export interface UpcomingFixture {
  id: string
  matchNumber?: number
  dateLabel: string
  time: string
  homeTeamId: string
  awayTeamId: string
  matchday: number
  venue?: string
  stage?: "group" | "qualifier" | "final"
}

export interface CompletedResult {
  id: string
  matchNumber?: number
  dateLabel: string
  time: string
  homeTeamId: string
  awayTeamId: string
  matchday: number
  venue?: string
  homeScore: string
  awayScore: string
  winnerTeamId: string
  resultSummary: string
}

export interface TournamentLiveData {
  teamCodes: Record<string, string>
  standings: StandingRow[]
  upcomingFixtures: UpcomingFixture[]
  completedResults: CompletedResult[]
}

const ETPL_TEAM_CODES: Record<string, string> = {
  "etpl-rotterdam-dockers": "RTD",
  "etpl-amsterdam-flames": "AMF",
  "etpl-belfast-wolves": "BLW",
  "etpl-dublin-guardians": "DBG",
  "etpl-edinburgh-castle-rockers": "ECR",
  "etpl-glasgow-cosmic": "GLC",
}

const ETPL_LIVE: TournamentLiveData = {
  teamCodes: ETPL_TEAM_CODES,
  standings: [
    { teamId: "etpl-rotterdam-dockers", rank: 1, played: 1, won: 1, lost: 0, tied: 0, noResult: 0, points: 2, form: ["W"], nextOpponents: ["BLW", "GLC", "DBG"] },
    { teamId: "etpl-belfast-wolves", rank: 2, played: 1, won: 1, lost: 0, tied: 0, noResult: 0, points: 2, form: ["W"], nextOpponents: ["RTD", "AMF", "ECR"], qualifyHighlight: true },
    { teamId: "etpl-amsterdam-flames", rank: 3, played: 1, won: 0, lost: 1, tied: 0, noResult: 0, points: 0, form: ["L"], nextOpponents: ["ECR", "BLW", "GLC"] },
    { teamId: "etpl-edinburgh-castle-rockers", rank: 4, nextOpponents: ["GLC", "AMF", "DBG"], qualifyHighlight: true },
    { teamId: "etpl-dublin-guardians", rank: 5, played: 1, won: 0, lost: 1, tied: 0, noResult: 0, points: 0, form: ["L"], nextOpponents: ["GLC", "ECR", "RTD"] },
    { teamId: "etpl-glasgow-cosmic", rank: 6, nextOpponents: ["ECR", "DBG", "RTD"] },
  ],
  completedResults: [
    {
      id: "etpl-m01",
      matchNumber: 1,
      dateLabel: "Wed 26 Aug 2026",
      time: "14:15",
      homeTeamId: "etpl-amsterdam-flames",
      awayTeamId: "etpl-rotterdam-dockers",
      matchday: 1,
      venue: "Voorburg",
      homeScore: "157/8",
      awayScore: "158/5",
      winnerTeamId: "etpl-rotterdam-dockers",
      resultSummary: "Dockers won by 5 wickets (11 balls remaining)",
    },
    {
      id: "etpl-m02",
      matchNumber: 2,
      dateLabel: "Thu 27 Aug 2026",
      time: "10:30",
      homeTeamId: "etpl-belfast-wolves",
      awayTeamId: "etpl-dublin-guardians",
      matchday: 2,
      venue: "Voorburg",
      homeScore: "184/7",
      awayScore: "66/6",
      winnerTeamId: "etpl-belfast-wolves",
      resultSummary: "Belfast won by 118 runs",
    },
  ],
  upcomingFixtures: [
    {
      id: "etpl-m03",
      matchNumber: 3,
      dateLabel: "Thu 27 Aug 2026",
      time: "14:15",
      homeTeamId: "etpl-edinburgh-castle-rockers",
      awayTeamId: "etpl-glasgow-cosmic",
      matchday: 3,
      venue: "Voorburg",
    },
    {
      id: "etpl-m04",
      matchNumber: 4,
      dateLabel: "Fri 28 Aug 2026",
      time: "14:15",
      homeTeamId: "etpl-amsterdam-flames",
      awayTeamId: "etpl-edinburgh-castle-rockers",
      matchday: 4,
      venue: "Voorburg",
    },
    {
      id: "etpl-m05",
      matchNumber: 5,
      dateLabel: "Sat 29 Aug 2026",
      time: "10:30",
      homeTeamId: "etpl-glasgow-cosmic",
      awayTeamId: "etpl-dublin-guardians",
      matchday: 5,
      venue: "Voorburg",
    },
    {
      id: "etpl-m06",
      matchNumber: 6,
      dateLabel: "Sat 29 Aug 2026",
      time: "14:15",
      homeTeamId: "etpl-rotterdam-dockers",
      awayTeamId: "etpl-belfast-wolves",
      matchday: 6,
      venue: "Voorburg",
    },
    {
      id: "etpl-m07",
      matchNumber: 7,
      dateLabel: "Sun 30 Aug 2026",
      time: "10:30",
      homeTeamId: "etpl-amsterdam-flames",
      awayTeamId: "etpl-belfast-wolves",
      matchday: 7,
      venue: "Voorburg",
    },
    {
      id: "etpl-m08",
      matchNumber: 8,
      dateLabel: "Sun 30 Aug 2026",
      time: "14:15",
      homeTeamId: "etpl-edinburgh-castle-rockers",
      awayTeamId: "etpl-dublin-guardians",
      matchday: 8,
      venue: "Voorburg",
    },
    {
      id: "etpl-m09",
      matchNumber: 9,
      dateLabel: "Tue 01 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-glasgow-cosmic",
      awayTeamId: "etpl-rotterdam-dockers",
      matchday: 9,
      venue: "Voorburg",
    },
    {
      id: "etpl-m10",
      matchNumber: 10,
      dateLabel: "Wed 02 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-dublin-guardians",
      awayTeamId: "etpl-rotterdam-dockers",
      matchday: 10,
      venue: "Voorburg",
    },
    {
      id: "etpl-m11",
      matchNumber: 11,
      dateLabel: "Wed 02 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-belfast-wolves",
      awayTeamId: "etpl-edinburgh-castle-rockers",
      matchday: 11,
      venue: "Voorburg",
    },
    {
      id: "etpl-m12",
      matchNumber: 12,
      dateLabel: "Thu 03 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-amsterdam-flames",
      awayTeamId: "etpl-glasgow-cosmic",
      matchday: 12,
      venue: "Voorburg",
    },
    {
      id: "etpl-m13",
      matchNumber: 13,
      dateLabel: "Fri 04 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-glasgow-cosmic",
      awayTeamId: "etpl-belfast-wolves",
      matchday: 13,
      venue: "Voorburg",
    },
    {
      id: "etpl-m14",
      matchNumber: 14,
      dateLabel: "Sat 05 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-rotterdam-dockers",
      awayTeamId: "etpl-edinburgh-castle-rockers",
      matchday: 14,
      venue: "Voorburg",
    },
    {
      id: "etpl-m15",
      matchNumber: 15,
      dateLabel: "Sat 05 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-dublin-guardians",
      awayTeamId: "etpl-amsterdam-flames",
      matchday: 15,
      venue: "Voorburg",
    },
    {
      id: "etpl-m16",
      matchNumber: 16,
      dateLabel: "Sun 06 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-glasgow-cosmic",
      awayTeamId: "etpl-edinburgh-castle-rockers",
      matchday: 16,
      venue: "Voorburg",
    },
    {
      id: "etpl-m17",
      matchNumber: 17,
      dateLabel: "Sun 06 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-amsterdam-flames",
      awayTeamId: "etpl-rotterdam-dockers",
      matchday: 17,
      venue: "Voorburg",
    },
    {
      id: "etpl-m18",
      matchNumber: 18,
      dateLabel: "Wed 09 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-dublin-guardians",
      awayTeamId: "etpl-belfast-wolves",
      matchday: 18,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m19",
      matchNumber: 19,
      dateLabel: "Thu 10 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-rotterdam-dockers",
      awayTeamId: "etpl-glasgow-cosmic",
      matchday: 19,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m20",
      matchNumber: 20,
      dateLabel: "Thu 10 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-belfast-wolves",
      awayTeamId: "etpl-amsterdam-flames",
      matchday: 20,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m21",
      matchNumber: 21,
      dateLabel: "Fri 11 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-dublin-guardians",
      awayTeamId: "etpl-edinburgh-castle-rockers",
      matchday: 21,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m22",
      matchNumber: 22,
      dateLabel: "Sat 12 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-belfast-wolves",
      awayTeamId: "etpl-rotterdam-dockers",
      matchday: 22,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m23",
      matchNumber: 23,
      dateLabel: "Sat 12 Sep 2026",
      time: "14:35",
      homeTeamId: "etpl-dublin-guardians",
      awayTeamId: "etpl-glasgow-cosmic",
      matchday: 23,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m24",
      matchNumber: 24,
      dateLabel: "Sun 13 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-edinburgh-castle-rockers",
      awayTeamId: "etpl-amsterdam-flames",
      matchday: 24,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m25",
      matchNumber: 25,
      dateLabel: "Sun 13 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-belfast-wolves",
      awayTeamId: "etpl-glasgow-cosmic",
      matchday: 25,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m26",
      matchNumber: 26,
      dateLabel: "Tue 15 Sep 2026",
      time: "10:30",
      homeTeamId: "etpl-amsterdam-flames",
      awayTeamId: "etpl-dublin-guardians",
      matchday: 26,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m27",
      matchNumber: 27,
      dateLabel: "Tue 15 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-edinburgh-castle-rockers",
      awayTeamId: "etpl-rotterdam-dockers",
      matchday: 27,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m28",
      matchNumber: 28,
      dateLabel: "Wed 16 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-glasgow-cosmic",
      awayTeamId: "etpl-amsterdam-flames",
      matchday: 28,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m29",
      matchNumber: 29,
      dateLabel: "Thu 17 Sep 2026",
      time: "14:15",
      homeTeamId: "etpl-edinburgh-castle-rockers",
      awayTeamId: "etpl-belfast-wolves",
      matchday: 29,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-m30",
      matchNumber: 30,
      dateLabel: "Thu 17 Sep 2026",
      time: "18:00",
      homeTeamId: "etpl-rotterdam-dockers",
      awayTeamId: "etpl-dublin-guardians",
      matchday: 30,
      venue: "Dublin (Malahide)",
    },
    {
      id: "etpl-qf",
      matchNumber: 31,
      dateLabel: "Sat 19 Sep 2026",
      time: "14:15",
      homeTeamId: "",
      awayTeamId: "",
      matchday: 31,
      venue: "Dublin (Malahide)", stage: "qualifier",
    },
    {
      id: "etpl-final",
      matchNumber: 32,
      dateLabel: "Sun 20 Sep 2026",
      time: "14:15",
      homeTeamId: "",
      awayTeamId: "",
      matchday: 32,
      venue: "Dublin (Malahide)", stage: "final",
    },
  ],
}

const LIVE_BY_TOURNAMENT: Partial<Record<string, TournamentLiveData>> = {
  "t20-m-etpl": ETPL_LIVE,
}

function teamCodeFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3)
  }
  return name.slice(0, 3).toUpperCase()
}

function buildTeamCodes(teams: Team[]): Record<string, string> {
  const codes: Record<string, string> = {}
  for (const team of teams) {
    codes[team.id] = teamCodeFromName(team.name)
  }
  return codes
}

function buildDefaultLiveData(tournamentId: string, teams: Team[]): TournamentLiveData {
  const teamCodes = buildTeamCodes(teams)
  const nameByTeam = new Map(teams.map((t) => [t.name, t.id]))

  const groupFixtures = generateFixtures(teams, tournamentId).filter((f) => f.stage === "group")
  const upcomingFixtures: UpcomingFixture[] = groupFixtures.slice(0, 6).map((f, index) => ({
    id: f.id,
    dateLabel: f.date,
    time: index % 2 === 0 ? "14:00" : "17:30",
    homeTeamId: nameByTeam.get(f.homeTeam) ?? f.homeTeam,
    awayTeamId: nameByTeam.get(f.awayTeam) ?? f.awayTeam,
    matchday: f.matchday,
  }))

  const nextByTeam = new Map<string, string[]>()
  for (const team of teams) nextByTeam.set(team.id, [])

  for (const fixture of groupFixtures.slice(0, 12)) {
    const homeId = nameByTeam.get(fixture.homeTeam)
    const awayId = nameByTeam.get(fixture.awayTeam)
    if (homeId && awayId) {
      const homeNext = nextByTeam.get(homeId) ?? []
      if (homeNext.length < 3 && teamCodes[awayId]) homeNext.push(teamCodes[awayId])
      nextByTeam.set(homeId, homeNext)
      const awayNext = nextByTeam.get(awayId) ?? []
      if (awayNext.length < 3 && teamCodes[homeId]) awayNext.push(teamCodes[homeId])
      nextByTeam.set(awayId, awayNext)
    }
  }

  const standings: StandingRow[] = teams.map((team, index) => ({
    teamId: team.id,
    rank: index + 1,
    nextOpponents: nextByTeam.get(team.id) ?? [],
  }))

  return { teamCodes, standings, upcomingFixtures, completedResults: [] }
}

export function getTournamentLiveData(tournamentId: string): TournamentLiveData | null {
  const preset = LIVE_BY_TOURNAMENT[tournamentId]
  if (preset) return preset

  const teams = getTeamsByTournament(tournamentId)
  if (teams.length === 0) return null
  return buildDefaultLiveData(tournamentId, teams)
}

const FIXTURE_MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

/** Parse fixture date labels like "Wed 26 Aug 2026". */
export function parseFixtureDateLabel(label: string): Date {
  const parts = label.trim().split(/\s+/)
  if (parts.length < 4) throw new Error(`Invalid fixture date label: ${label}`)
  const day = parseInt(parts[1], 10)
  const month = FIXTURE_MONTH_INDEX[parts[2]]
  const year = parseInt(parts[3], 10)
  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    throw new Error(`Invalid fixture date label: ${label}`)
  }
  return new Date(Date.UTC(year, month, day))
}

export function toIsoScheduleDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Min/max fixture dates from published live data; optionally remap to a planning calendar year. */
export function getTournamentFixtureScheduleDates(
  tournamentId: string,
  calendarYear?: number,
): { startDate: string; endDate: string } | null {
  const live = LIVE_BY_TOURNAMENT[tournamentId]
  if (!live) return null

  const labels: string[] = []
  for (const fixture of live.completedResults) labels.push(fixture.dateLabel)
  for (const fixture of live.upcomingFixtures) labels.push(fixture.dateLabel)
  if (labels.length === 0) return null

  let min = parseFixtureDateLabel(labels[0])
  let max = min
  for (const label of labels.slice(1)) {
    const parsed = parseFixtureDateLabel(label)
    if (parsed < min) min = parsed
    if (parsed > max) max = parsed
  }

  if (calendarYear !== undefined) {
    min = new Date(Date.UTC(calendarYear, min.getUTCMonth(), min.getUTCDate()))
    max = new Date(Date.UTC(calendarYear, max.getUTCMonth(), max.getUTCDate()))
  }

  return { startDate: toIsoScheduleDate(min), endDate: toIsoScheduleDate(max) }
}
