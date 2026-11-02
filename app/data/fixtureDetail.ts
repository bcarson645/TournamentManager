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
  teamId: string
  teamName: string
  position: number
  batCaz: number
  srCaz: number
  /** Model expected runs for this game (Prep Raw vs this opposition / conditions). */
  expectedRuns: number
  /** Order deduction — openers face more balls, so the line trims as you go down. */
  orderFactor: number
  /** Over/under line ending in .5: floor(expectedRuns × orderFactor) + 0.5. */
  lineRuns: number
  recentScores: number[]
  /** Plausible line we would have sent each past game — current line ±2, snapped to .5. */
  histLines: number[]
  recentFours: number[]
  recentSixes: number[]
  sentFoursLines: number[]
  sentSixesLines: number[]
  avgLast5: number | null
  avgLast10: number | null
  avgLast15: number | null
  /** Prep inputs for the 4s / 6s / strike-rate views (no per-innings history exists). */
  expFours: number
  expSixes: number
  expSr100: number
  lineFours: number
  lineSixes: number
  lineSr100: number
  careerBatAvg: number | null
  careerSr100: number | null
}

export interface BowlingGame {
  wickets: number
  runsConceded: number
  oversBowled: number
}

export interface FixtureBowlerRow {
  id: string
  name: string
  teamId: string
  teamName: string
  overs: number
  econ: number
  /** Model expected wickets for this game (squad W/inn figure). */
  expectedWkts: number
  /** Over/under wickets line ending in .5. */
  wktsLine: number
  /** Potential runs conceded: overs × economy. */
  runsConceded: number
  recentBowling: BowlingGame[]
  /** Plausible wickets line we would have sent each past game — current ±1, snapped to .5. */
  sentWktsLines: number[]
  avgWktsLast5: number | null
  avgWktsLast10: number | null
  avgWktsLast15: number | null
  bowlAvg: number
  careerWkts: number
  careerBowlAvg: number
  careerEcon: number
  /** Career wickets per innings, where innings data exists. */
  careerWktsPerInn: number | null
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

export interface MatchupCell {
  balls: number
  runs: number
  dismissals: number
  strikeRate: number
  average: number | null
}

export interface BatterMatchupRow {
  batterId: string
  batterName: string
  position: number
  batCaz: number
  expSr100: number
  cells: MatchupCell[]
}

export interface MatchupBowlerHead {
  id: string
  name: string
}

export interface TeamBatterMatchups {
  teamId: string
  teamName: string
  /** Opposition bowlers, one column each, in display order. */
  bowlers: MatchupBowlerHead[]
  rows: BatterMatchupRow[]
}

/** Stand-in batter-vs-bowler histories, deterministic and shaped by ratings. */
function buildTeamMatchups(
  batters: FixtureBatterRow[],
  bowlers: FixtureBowlerRow[],
  teamId: string,
  teamName: string,
): TeamBatterMatchups {
  return {
    teamId,
    teamName,
    bowlers: bowlers.map((b) => ({ id: b.id, name: b.name })),
    rows: batters.map((bat) => ({
      batterId: bat.id,
      batterName: bat.name,
      position: bat.position,
      batCaz: bat.batCaz,
      expSr100: bat.expSr100,
      cells: bowlers.map((bowl) => {
        const hBalls = hash01(`${bat.id}:vs:${bowl.id}:balls`)
        const hRuns = hash01(`${bat.id}:vs:${bowl.id}:runs`)
        const hOut = hash01(`${bat.id}:vs:${bowl.id}:out`)
        const balls = 6 + Math.floor(hBalls * 30)
        const rpb = Math.max(0.3, Math.min(2.2, bat.srCaz * (8 / Math.max(bowl.econ, 5))))
        const runs = Math.max(0, Math.round(balls * rpb * (0.7 + hRuns * 0.6)))
        const dismissals = hOut < 0.4 ? 0 : hOut < 0.7 ? 1 : hOut < 0.88 ? 2 : 3
        return {
          balls,
          runs,
          dismissals,
          strikeRate: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0,
          average: dismissals > 0 ? Math.round((runs / dismissals) * 10) / 10 : null,
        }
      }),
    })),
  }
}

export interface MatchMarketRow {
  id: string
  label: string
  scope: 'home' | 'away' | 'match'
  teamName: string
  line: number
  actuals: number[]
  sentLines: number[]
  /** Competition history over the same window (same length as actuals). */
  compActuals: number[]
  /** Ground history over the same window (same length as actuals). */
  groundActuals: number[]
}

function marketActuals(key: string, base: number, n: number, spread: number, whole: boolean): number[] {
  return Array.from({ length: n }, (_, gi) => {
    const h = hash01(`${key}:${gi}`)
    const v = base * (1 + (h - 0.5) * 2 * spread)
    return whole ? Math.max(0, Math.round(v)) : Math.round(v * 10) / 10
  })
}

function marketSentLines(key: string, line: number, n: number, jitter: number): number[] {
  return Array.from({ length: n }, (_, gi) => {
    const h = hash01(`${key}:sent:${gi}`)
    return Math.max(0.5, Math.round((line + (h - 0.5) * 2 * jitter) * 2) / 2)
  })
}

function toHalfLineFrom(x: number): number {
  return Math.max(0.5, Math.floor(x) + 0.5)
}

/** Stand-in team/match market histories, deterministic and shaped by model numbers. */
function buildMatchMarkets(
  fixtureId: string,
  homeName: string,
  awayName: string,
  homeBatFirst: number,
  awayBatFirst: number,
  homePhases: PhaseScoring,
  awayPhases: PhaseScoring,
  avgSixesMatch: number,
  avgFirstInnings: number,
): MatchMarketRow[] {
  const N = 15
  const rows: MatchMarketRow[] = []
  const push = (
    id: string,
    label: string,
    scope: 'home' | 'away' | 'match',
    teamName: string,
    base: number,
    spread: number,
    whole: boolean,
    sentJitter: number,
    compBase: number,
    groundBase: number,
  ) => {
    const line = whole ? toHalfLineFrom(base) : Math.round(base * 2) / 2
    rows.push({
      id,
      label,
      scope,
      teamName,
      line,
      actuals: marketActuals(`${fixtureId}:${id}`, base, N, spread, whole),
      sentLines: marketSentLines(`${fixtureId}:${id}`, line, N, sentJitter),
      compActuals: marketActuals(`${fixtureId}:${id}:comp`, compBase, N, spread, whole),
      groundActuals: marketActuals(`${fixtureId}:${id}:ground`, groundBase, N, spread, whole),
    })
  }
  const team4s = (innings: number) => innings * 0.11
  const team6s = (innings: number) => Math.max(2, innings * 0.045)
  for (const side of [
    { scope: 'home' as const, name: homeName, innings: homeBatFirst, phases: homePhases },
    { scope: 'away' as const, name: awayName, innings: awayBatFirst, phases: awayPhases },
  ]) {
    const runs12 = side.phases.powerplay + side.phases.middle * 0.5
    push(`${side.scope}-innings`, 'Innings runs', side.scope, side.name, side.innings, 0.12, true, 4, 166, avgFirstInnings)
    push(`${side.scope}-r6`, 'Runs @ 6 overs', side.scope, side.name, side.phases.powerplay, 0.15, true, 3, 47, Math.round(avgFirstInnings * 0.28))
    push(`${side.scope}-r12`, 'Runs @ 12 overs', side.scope, side.name, runs12, 0.13, true, 3, 96, Math.round(avgFirstInnings * 0.57))
    push(`${side.scope}-4s`, 'Total 4s', side.scope, side.name, team4s(side.innings), 0.18, true, 1.5, 17, Math.round(avgFirstInnings * 0.11))
    push(`${side.scope}-6s`, 'Total 6s', side.scope, side.name, team6s(side.innings), 0.2, true, 1, 7, Math.max(2, Math.round(avgSixesMatch / 2)))
    push(`${side.scope}-1st`, '1st over runs', side.scope, side.name, 7.5, 0.3, true, 1, 7.5, 7.5)
  }
  push('match-partnership', 'Top partnership', 'match', 'Match', 52.5, 0.2, true, 3, 50, 54)
  push('match-wickets', 'Match wickets', 'match', 'Match', 12.5, 0.15, true, 1, 12, 12)
  push('match-maxover', 'Max runs in over', 'match', 'Match', 20.5, 0.18, true, 1.5, 20, 21)
  return rows
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
  /** Batter-vs-opposition-bowler matrices, one per team. */
  batterMatchups: TeamBatterMatchups[]
  matchMarkets: MatchMarketRow[]
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

/** Over/under line ending in .5 from a prep expectation. */
function toHalfLine(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0.5
  return Math.floor(x) + 0.5
}

/** Openers face the most balls — trim ~3% per slot down the order (floor 70%). */
function orderFactorFor(position: number): number {
  return Math.max(0.7, 1 - Math.max(0, position - 1) * 0.03)
}

function avgOfScores(scores: number[]): number | null {
  if (scores.length === 0) return null
  return Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
}

function batterRows(
  tournamentId: string,
  teamId: string,
  teamName: string,
  opponentBowlingRating: number,
  conditions: number,
  format: CricketFormat,
): FixtureBatterRow[] {
  const { startingXI } = getSquadForTeam(teamId)
  const prep = getMatchPrepSettings(tournamentId)
  return startingXI.slice(0, 7).map((p, i) => {
    const position = i + 1
    const { raw } = computePrepRawEffective({
      btCaz: p.btCaz,
      battingPosition: position,
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
    const innings = (profile.recentInnings ?? []).slice(0, 15)
    const recentScores = innings.map((r) => r.score)
    const recentFours = innings.map((r) => r.fours)
    const recentSixes = innings.map((r) => r.sixes)
    const orderFactor = orderFactorFor(position)
    const lineRuns = toHalfLine(raw * orderFactor)
    const histLines = recentScores.map((_, gi) => {
      const h = (hashSeed(`${p.id}:${gi}`) % 100) / 100
      return Math.max(0.5, Math.round((lineRuns + (h - 0.5) * 4) * 2) / 2)
    })
    const expFours = p.fours
    const expSixes = p.sixes
    const sentFoursLines = recentScores.map((_, gi) => {
      const h = (hashSeed(`${p.id}:4:${gi}`) % 100) / 100
      return Math.max(0.5, Math.round((toHalfLine(expFours) + (h - 0.5) * 2) * 2) / 2)
    })
    const sentSixesLines = recentScores.map((_, gi) => {
      const h = (hashSeed(`${p.id}:6:${gi}`) % 100) / 100
      return Math.max(0.5, Math.round((toHalfLine(expSixes) + (h - 0.5) * 2) * 2) / 2)
    })
    const expSr100 = Math.round(p.sr * 1000) / 10
    const careerSr100 =
      profile.careerBatting?.strikeRate > 0
        ? Math.round(profile.careerBatting.strikeRate * 1000) / 10
        : null
    return {
      id: p.id,
      name: p.name,
      teamId,
      teamName,
      position,
      batCaz: p.btCaz,
      srCaz: p.sr,
      expectedRuns: raw,
      orderFactor,
      lineRuns,
      recentScores,
      histLines,
      recentFours,
      recentSixes,
      sentFoursLines,
      sentSixesLines,
      avgLast5: avgOfScores(recentScores.slice(0, 5)),
      avgLast10: avgOfScores(recentScores.slice(0, 10)),
      avgLast15: avgOfScores(recentScores),
      expFours: p.fours,
      expSixes: p.sixes,
      expSr100,
      lineFours: toHalfLine(p.fours),
      lineSixes: toHalfLine(p.sixes),
      lineSr100: toHalfLine(expSr100),
      careerBatAvg: profile.careerBatting?.average > 0 ? profile.careerBatting.average : null,
      careerSr100,
    }
  })
}

function hash01(key: string): number {
  return (hashSeed(key) % 1000) / 1000
}

/** Stand-in per-game bowling figures, deterministic per player and shaped by expectation. */
function synthBowlingGame(
  playerId: string,
  gi: number,
  expWkts: number,
  overs: number,
  econ: number,
  maxOvers: number,
): BowlingGame {
  const rW = hash01(`${playerId}:w:${gi}`)
  const rO = hash01(`${playerId}:o:${gi}`)
  const rR = hash01(`${playerId}:r:${gi}`)
  let wickets = Math.max(0, Math.min(6, Math.round(expWkts * (0.15 + rW * 2.1))))
  if (expWkts <= 0) wickets = rW < 0.7 ? 0 : 1
  if (expWkts >= 1 && rW > 0.95) wickets = 4
  if (expWkts >= 1.5 && rW > 0.985) wickets = 5
  const oversBowled =
    overs > 0 ? Math.round(Math.min(maxOvers, overs * (0.65 + rO * 0.35)) * 2) / 2 : 0
  const runsConceded = Math.round(oversBowled * econ * (0.7 + rR * 0.6))
  return { wickets, runsConceded, oversBowled }
}

function avgOfNumbers(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
}

function bowlerRows(teamId: string, teamName: string, format: CricketFormat): FixtureBowlerRow[] {
  const { startingXI } = getSquadForTeam(teamId)
  const maxOvers = format === 't20' ? 4 : 10
  return [...startingXI]
    .sort((a, b) => (b.wkts ?? 0) - (a.wkts ?? 0))
    .slice(0, 6)
    .map((p) => {
      const profile = getProfileForPlayer(p.name)
      const careerInnings = profile.careerBowling?.innings ?? 0
      const careerWkts = profile.careerBowling?.wickets ?? 0
      const expWkts = p.wkts ?? 0
      const wktsLine = toHalfLine(expWkts)
      const recentBowling = Array.from({ length: 15 }, (_, gi) =>
        synthBowlingGame(p.id, gi, expWkts, p.overs, p.econ, maxOvers),
      )
      const sentWktsLines = recentBowling.map((_, gi) => {
        const h = hash01(`${p.id}:s:${gi}`)
        return Math.max(0.5, Math.round((wktsLine + (h - 0.5) * 2) * 2) / 2)
      })
      const wkts = recentBowling.map((g) => g.wickets)
      return {
        id: p.id,
        name: p.name,
        teamId,
        teamName,
        overs: p.overs,
        econ: p.econ,
        expectedWkts: expWkts,
        wktsLine,
        runsConceded: Math.round(p.overs * p.econ * 10) / 10,
        recentBowling,
        sentWktsLines,
        avgWktsLast5: avgOfNumbers(wkts.slice(0, 5)),
        avgWktsLast10: avgOfNumbers(wkts.slice(0, 10)),
        avgWktsLast15: avgOfNumbers(wkts),
        bowlAvg: p.bowlAvg,
        careerWkts,
        careerBowlAvg: profile.careerBowling?.average ?? 0,
        careerEcon: profile.careerBowling?.economy ?? 0,
        careerWktsPerInn:
          careerInnings > 0 ? Math.round((careerWkts / careerInnings) * 100) / 100 : null,
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
  const homePhases = phaseSplit(homeBatFirst, `${fixture.id}-home`)
  const awayPhases = phaseSplit(awayBatFirst, `${fixture.id}-away`)
  const homeBattersRows = batterRows(
    tournamentId,
    fixture.homeTeamId,
    homeTeam.name,
    awayFactors.bowlingRating,
    homeFactors.homeConditions,
    format,
  )
  const awayBattersRows = batterRows(
    tournamentId,
    fixture.awayTeamId,
    awayTeam.name,
    homeFactors.bowlingRating,
    awayFactors.homeConditions,
    format,
  )
  const homeBowlersRows = bowlerRows(fixture.homeTeamId, homeTeam.name, format)
  const awayBowlersRows = bowlerRows(fixture.awayTeamId, awayTeam.name, format)

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
    homePhases,
    awayPhases,
    homeBattingFirst: { avgScoreBattingFirst: homeBatFirst, parScoreAtGround: par },
    awayBattingFirst: { avgScoreBattingFirst: awayBatFirst, parScoreAtGround: par },
    homeBatters: homeBattersRows,
    awayBatters: awayBattersRows,
    homeBowlers: homeBowlersRows,
    awayBowlers: awayBowlersRows,
    batterMatchups: [
      buildTeamMatchups(homeBattersRows, awayBowlersRows, fixture.homeTeamId, homeTeam.name),
      buildTeamMatchups(awayBattersRows, homeBowlersRows, fixture.awayTeamId, awayTeam.name),
    ],
    matchMarkets: buildMatchMarkets(
      fixture.id,
      homeTeam.name,
      awayTeam.name,
      homeBatFirst,
      awayBatFirst,
      homePhases,
      awayPhases,
      groundRecord.avgSixes,
      groundRecord.avgFirstInnings,
    ),
  }
}
