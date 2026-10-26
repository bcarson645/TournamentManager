import { computeFixtureMatchModel } from './fixtureMatchModel'
import { getFixturePriceHistory, type FixturePricePoint } from './fixturePriceHistoryStore'
import { flagForCountry, inferTeamCountry } from './countryFlags'
import { GROUNDS, type Ground } from './grounds'
import { getSimulatorConfig } from './outrightSimulatorStore'
import { getMatchPrepSettings } from './matchPrepSettings'
import { getStoredSquad, getSquadForTeam } from './squadStore'
import { getTeamsByTournament, type Team } from './teams'
import {
  getTournamentLiveData,
  parseFixtureDateLabel,
  type CompletedResult,
  type UpcomingFixture,
} from './tournamentLiveData'
import { getProfileForPlayer } from './playerProfile'
import { computePrepRawEffective } from './prepRawFormula'
import type { CricketFormat, Tournament } from './tournaments'
import { FORMATS, GENDERS } from './tournaments'
export interface FixtureTeamFactors {
  teamId: string
  name: string
  country?: string
  flag: string
  battingRating: number
  bowlingRating: number
  homeConditions: number
  /** Trader / prep ground factor (home side when venue matches). */
  groundFactor: number
  matchFactor: number
}

export interface CompetitorPrice {
  book: string
  homePrice: number
  awayPrice: number
  updatedAt: number
}

export interface GroupMarketLine {
  id: string
  label: string
  selection: string
  prob: number
  price: number
}

export interface PlayerWatchRow {
  id: string
  name: string
  teamId: string
  role: 'bat' | 'bowl'
  metric: string
  value: number
}

export interface PhaseScoring {
  powerplay: number
  middle: number
  death: number
}

export interface BattingFirstLine {
  avgScoreBattingFirst: number
  parScoreAtGround: number
}

export interface FixtureBatterRow {
  id: string
  name: string
  position: number
  batCaz: number
  srCaz: number
  /** Model expected runs for this game (Prep Raw vs this opposition / conditions). */
  expectedRuns: number
  recentScores: number[]
  avgLast5: number | null
}

export interface FixtureBowlerRow {
  id: string
  name: string
  overs: number
  econ: number
  /** Model expected wickets for this game (squad W/inn figure). */
  expectedWkts: number
  bowlAvg: number
  careerWkts: number
  careerBowlAvg: number
}

export interface GroundRecord {
  venue: string
  inningsPlayed: number
  avgFirstInnings: number
  avgSixes: number
  winBatFirstPct: number
  homeTeamWinsPct: number
}

export interface CompetitorTrack {
  book: string
  points: FixturePricePoint[]
}

export interface FixtureDetailBundle {
  fixture: UpcomingFixture | CompletedResult
  isCompleted: boolean
  tournamentId: string
  tournamentName: string
  seriesLabel: string
  formatLabel: string
  genderLabel: string
  venue: string
  ground: Ground | null
  home: FixtureTeamFactors
  away: FixtureTeamFactors
  homeWinProb: number
  awayWinProb: number
  homeFairPrice: number | undefined
  awayFairPrice: number | undefined
  priceHistory: FixturePricePoint[]
  competitorTracks: CompetitorTrack[]
  competitorPrices: CompetitorPrice[]
  groupMarkets: GroupMarketLine[]
  groundRecord: GroundRecord
  playersToWatch: PlayerWatchRow[]
  prevFixtureId: string | null
  nextFixtureId: string | null
  /** e.g. "3rd T20I" — from match number + format. */
  matchLabel: string
  /** "Today" / "Tomorrow" / date label for the header countdown slot. */
  relativeDayLabel: string
  homePhases: PhaseScoring
  awayPhases: PhaseScoring
  homeBattingFirst: BattingFirstLine
  awayBattingFirst: BattingFirstLine
  homeBatters: FixtureBatterRow[]
  awayBatters: FixtureBatterRow[]
  homeBowlers: FixtureBowlerRow[]
  awayBowlers: FixtureBowlerRow[]
}

export function findFixtureInTournament(
  tournamentId: string,
  fixtureId: string,
): (UpcomingFixture | CompletedResult) | null {
  const live = getTournamentLiveData(tournamentId)
  if (!live) return null
  const up = live.upcomingFixtures.find((f) => f.id === fixtureId)
  if (up) return up
  return live.completedResults.find((f) => f.id === fixtureId) ?? null
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function groundForVenue(venue: string | undefined, homeTeamId: string): Ground | null {
  const stored = getStoredSquad(homeTeamId)?.groundId
  if (stored) {
    const g = GROUNDS.find((x) => x.id === stored)
    if (g) return g
  }
  if (!venue) return null
  const v = venue.toLowerCase()
  return (
    GROUNDS.find(
      (g) =>
        g.name.toLowerCase().includes(v) ||
        g.city.toLowerCase().includes(v) ||
        v.includes(g.city.toLowerCase()),
    ) ?? null
  )
}

function teamFactors(
  team: Team,
  tournamentId: string,
  isHome: boolean,
  venueGround: Ground | null,
): FixtureTeamFactors {
  const cfg = getSimulatorConfig(tournamentId)
  const row = cfg.teamRatings[team.id]
  const prep = getMatchPrepSettings(tournamentId)
  const country = inferTeamCountry(team.name, team.country)
  const groundFactor = isHome
    ? row?.conditions ?? prep.homeConditionsFactor
    : prep.awayConditionsFactor
  const matchFactor = (row?.battingRating ?? 1) / (row?.bowlingRating ?? 1)
  return {
    teamId: team.id,
    name: team.name,
    country,
    flag: flagForCountry(country ?? venueGround?.country),
    battingRating: row?.battingRating ?? 1,
    bowlingRating: row?.bowlingRating ?? 1,
    homeConditions: row?.conditions ?? 1,
    groundFactor: Math.round(groundFactor * 1000) / 1000,
    matchFactor: Math.round(matchFactor * 1000) / 1000,
  }
}

export function buildCompetitorPrices(homeFair: number | undefined, awayFair: number | undefined): CompetitorPrice[] {
  const now = Date.now()
  const h = homeFair ?? 2
  const a = awayFair ?? 2
  const jitter = (base: number, n: number) => Math.round((base + n) * 100) / 100
  return [
    { book: 'Bet365', homePrice: jitter(h, 0), awayPrice: jitter(a, 0.02), updatedAt: now - 120_000 },
    { book: 'Betfair', homePrice: jitter(h, -0.03), awayPrice: jitter(a, -0.01), updatedAt: now - 300_000 },
    { book: 'Pinnacle', homePrice: jitter(h, -0.05), awayPrice: jitter(a, -0.04), updatedAt: now - 600_000 },
    { book: 'Sportsbet', homePrice: jitter(h, 0.04), awayPrice: jitter(a, 0.05), updatedAt: now - 90_000 },
  ]
}

function buildGroupMarkets(
  homeName: string,
  awayName: string,
  homeProb: number,
  format: CricketFormat,
): GroupMarketLine[] {
  const sixesBase = format === 't20' ? 14.5 : format === 'lista' ? 9.5 : 12.5
  const seed = hashSeed(homeName + awayName) % 100
  const topBat = homeProb > 0.52 ? homeName : awayName
  return [
    {
      id: 'top-bat',
      label: 'Top batter',
      selection: `${topBat} opener`,
      prob: 0.11 + (seed % 8) / 100,
      price: 7.5,
    },
    {
      id: 'top-bowl',
      label: 'Top bowler',
      selection: homeProb > 0.5 ? `${awayName} seamer` : `${homeName} spinner`,
      prob: 0.09,
      price: 9,
    },
    {
      id: 'hp',
      label: 'Highest partnership',
      selection: 'Over 52.5 runs',
      prob: 0.48,
      price: 1.92,
    },
    {
      id: 'sixes',
      label: 'Sixes per match',
      selection: `Over ${sixesBase}`,
      prob: 0.52 + (seed % 10) / 100,
      price: 1.88,
    },
    {
      id: 'group-winner',
      label: 'Group position',
      selection: `${homeName} top 2`,
      prob: 0.38,
      price: 2.45,
    },
  ].map((m) => ({
    ...m,
    price: Math.round((1 / m.prob) * 100) / 100,
  }))
}

function buildPlayersToWatch(homeId: string, awayId: string): PlayerWatchRow[] {
  const rows: PlayerWatchRow[] = []
  for (const teamId of [homeId, awayId]) {
    const { startingXI } = getSquadForTeam(teamId)
    const bat = [...startingXI].sort((a, b) => b.batRating - a.batRating).slice(0, 2)
    const bowl = [...startingXI].sort((a, b) => b.bowlRating - a.bowlRating).slice(0, 2)
    for (const p of bat) {
      rows.push({
        id: p.id,
        name: p.name,
        teamId,
        role: 'bat',
        metric: 'Bat rating',
        value: p.batRating,
      })
    }
    for (const p of bowl) {
      rows.push({
        id: p.id,
        name: p.name,
        teamId,
        role: 'bowl',
        metric: 'Bowl rating',
        value: p.bowlRating,
      })
    }
  }
  return rows.sort((a, b) => b.value - a.value).slice(0, 10)
}

function buildGroundRecord(venue: string, homeTeamId: string, fixtureId: string): GroundRecord {
  const seed = hashSeed(fixtureId + venue)
  return {
    venue,
    inningsPlayed: 12 + (seed % 24),
    avgFirstInnings: 158 + (seed % 35),
    avgSixes: 11 + (seed % 9),
    winBatFirstPct: 42 + (seed % 18),
    homeTeamWinsPct: 48 + (seed % 22),
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function relativeDayLabelFor(dateLabel: string): string {
  try {
    const d = parseFixtureDateLabel(dateLabel)
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
    if (diff <= 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return dateLabel
  } catch {
    return dateLabel
  }
}

function fixtureNavIds(
  tournamentId: string,
  fixtureId: string,
): { prev: string | null; next: string | null } {
  const live = getTournamentLiveData(tournamentId)
  if (!live) return { prev: null, next: null }
  const all = [...live.completedResults, ...live.upcomingFixtures]
  const idx = all.findIndex((f) => f.id === fixtureId)
  if (idx < 0) return { prev: null, next: null }
  return {
    prev: idx > 0 ? all[idx - 1]!.id : null,
    next: idx < all.length - 1 ? all[idx + 1]!.id : null,
  }
}

/** Model phase split of a T20-ish innings total (seeded estimate, labelled in UI). */
function phaseSplit(teamTotal: number, seedKey: string): PhaseScoring {
  const seed = hashSeed(seedKey) % 100
  const ppShare = 0.27 + (seed % 7) / 100
  const deathShare = 0.26 + ((seed >> 3) % 7) / 100
  const powerplay = Math.round(teamTotal * ppShare)
  const death = Math.round(teamTotal * deathShare)
  return { powerplay, middle: Math.max(0, Math.round(teamTotal) - powerplay - death), death }
}

function batterRows(
  tournamentId: string,
  teamId: string,
  opponentBowlingRating: number,
  conditions: number,
  format: CricketFormat,
): FixtureBatterRow[] {
  const { startingXI } = getSquadForTeam(teamId)
  const prep = getMatchPrepSettings(tournamentId)
  return startingXI.slice(0, 7).map((p, i) => {
    const { raw } = computePrepRawEffective({
      btCaz: p.btCaz,
      battingPosition: i + 1,
      format,
      matchPrep: {
        ...prep,
        homeConditionsFactor: conditions,
        awayBowlingFactor: opponentBowlingRating,
      },
      battingAtHome: true,
      rawAdj: p.rawAdj ?? 0,
    })
    const profile = getProfileForPlayer(p.name)
    const recentScores = (profile.recentInnings ?? []).slice(0, 5).map((r) => r.score)
    const avgLast5 =
      recentScores.length > 0
        ? Math.round((recentScores.reduce((s, v) => s + v, 0) / recentScores.length) * 10) / 10
        : null
    return {
      id: p.id,
      name: p.name,
      position: i + 1,
      batCaz: p.btCaz,
      srCaz: p.sr,
      expectedRuns: raw,
      recentScores,
      avgLast5,
    }
  })
}

function bowlerRows(teamId: string): FixtureBowlerRow[] {
  const { startingXI } = getSquadForTeam(teamId)
  return [...startingXI]
    .sort((a, b) => (b.wkts ?? 0) - (a.wkts ?? 0))
    .slice(0, 6)
    .map((p) => {
      const profile = getProfileForPlayer(p.name)
      return {
        id: p.id,
        name: p.name,
        overs: p.overs,
        econ: p.econ,
        expectedWkts: p.wkts ?? 0,
        bowlAvg: p.bowlAvg,
        careerWkts: profile.careerBowling?.wickets ?? 0,
        careerBowlAvg: profile.careerBowling?.average ?? 0,
      }
    })
}

export function buildFixtureDetail(
  tournamentId: string,
  fixtureId: string,
  format: CricketFormat,
  gender: 'men' | 'women',
  tournament: Tournament | undefined,
): FixtureDetailBundle | null {
  const fixture = findFixtureInTournament(tournamentId, fixtureId)
  if (!fixture) return null

  const teams = getTeamsByTournament(tournamentId)
  const homeTeam = teams.find((t) => t.id === fixture.homeTeamId)
  const awayTeam = teams.find((t) => t.id === fixture.awayTeamId)
  if (!homeTeam || !awayTeam) return null

  const venue = fixture.venue ?? 'Venue TBC'
  const ground = groundForVenue(fixture.venue, fixture.homeTeamId)
  const model = computeFixtureMatchModel(
    tournamentId,
    fixture.homeTeamId,
    fixture.awayTeamId,
    format,
    fixture.id,
  )
  const priceHistory = getFixturePriceHistory(fixture.id, model.homeWinProb)
  const competitorPrices = buildCompetitorPrices(model.homeFairPrice, model.awayFairPrice)
  const competitorTracks: CompetitorTrack[] = competitorPrices.slice(0, 3).map((row, bi) => {
    // Normalised implied home prob from this book's two-way prices, eased in from the model line.
    const ih = 1 / row.homePrice
    const ia = 1 / row.awayPrice
    const bookProb = ih / Math.max(ih + ia, 1e-9)
    const n = Math.max(priceHistory.length - 1, 1)
    return {
      book: row.book,
      points: priceHistory.map((p, i) => {
        const t = i / n
        const wobble = Math.sin(i * 1.3 + bi * 2.1) * 0.004
        const v = p.homeWinProb + (bookProb - p.homeWinProb) * t * 0.9 + wobble * t
        return { at: p.at, homeWinProb: Math.min(0.97, Math.max(0.03, Math.round(v * 1000) / 1000)) }
      }),
    }
  })
  const formatLabel = FORMATS.find((f) => f.key === format)?.label ?? format
  const genderLabel = GENDERS.find((g) => g.key === gender)?.label ?? gender
  const nav = fixtureNavIds(tournamentId, fixture.id)
  const homeFactors = teamFactors(homeTeam, tournamentId, true, ground)
  const awayFactors = teamFactors(awayTeam, tournamentId, false, ground)
  const groundRecord = buildGroundRecord(venue, fixture.homeTeamId, fixture.id)
  const par = groundRecord.avgFirstInnings

  const homeTotal = getSquadForTeam(fixture.homeTeamId).startingXI.reduce((s, p) => s + (p.raw ?? 0), 0)
  const awayTotal = getSquadForTeam(fixture.awayTeamId).startingXI.reduce((s, p) => s + (p.raw ?? 0), 0)
  const homeBatFirst = Math.round(homeTotal * homeFactors.homeConditions)
  const awayBatFirst = Math.round(awayTotal * awayFactors.homeConditions)

  return {
    fixture,
    isCompleted: 'homeScore' in fixture,
    tournamentId,
    tournamentName: tournament?.name ?? 'Tournament',
    seriesLabel: tournament?.country
      ? `${tournament.name} · ${tournament.country}`
      : tournament?.name ?? tournamentId,
    formatLabel,
    genderLabel,
    venue,
    ground,
    home: homeFactors,
    away: awayFactors,
    homeWinProb: model.homeWinProb,
    awayWinProb: model.awayWinProb,
    homeFairPrice: model.homeFairPrice,
    awayFairPrice: model.awayFairPrice,
    priceHistory,
    competitorTracks,
    competitorPrices,
    groupMarkets: buildGroupMarkets(homeTeam.name, awayTeam.name, model.homeWinProb, format),
    groundRecord,
    playersToWatch: buildPlayersToWatch(fixture.homeTeamId, fixture.awayTeamId),
    prevFixtureId: nav.prev,
    nextFixtureId: nav.next,
    matchLabel:
      fixture.matchNumber != null ? `${ordinal(fixture.matchNumber)} ${formatLabel}` : formatLabel,
    relativeDayLabel: relativeDayLabelFor(fixture.dateLabel),
    homePhases: phaseSplit(homeBatFirst, `${fixture.id}-home`),
    awayPhases: phaseSplit(awayBatFirst, `${fixture.id}-away`),
    homeBattingFirst: { avgScoreBattingFirst: homeBatFirst, parScoreAtGround: par },
    awayBattingFirst: { avgScoreBattingFirst: awayBatFirst, parScoreAtGround: par },
    homeBatters: batterRows(
      tournamentId,
      fixture.homeTeamId,
      awayFactors.bowlingRating,
      homeFactors.homeConditions,
      format,
    ),
    awayBatters: batterRows(
      tournamentId,
      fixture.awayTeamId,
      homeFactors.bowlingRating,
      awayFactors.homeConditions,
      format,
    ),
    homeBowlers: bowlerRows(fixture.homeTeamId),
    awayBowlers: bowlerRows(fixture.awayTeamId),
  }
}
