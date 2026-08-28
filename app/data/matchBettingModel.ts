import type { CricketFormat } from './tournaments'

export type MatchFormat = 't20' | 't10' | 'odi' | 'hundred' | 'test' | 'fc'

const FORMAT_STANDARD: Record<MatchFormat, number> = {
  t10: 110,
  t20: 163,
  hundred: 140,
  odi: 270,
  test: 338,
  fc: 328,
}

const FORMAT_BALLS: Record<MatchFormat, number> = {
  t10: 60,
  t20: 120,
  hundred: 100,
  odi: 300,
  test: 1680,
  fc: 1680,
}

export function cricketFormatToMatchFormat(format: CricketFormat): MatchFormat {
  if (format === 't10') return 't10'
  if (format === 'lista') return 'odi'
  if (format === 'firstclass') return 'fc'
  return 't20'
}

function getInningsRuns(
  batRating: number,
  bowlRating: number,
  conditions: number,
  format: MatchFormat,
): number {
  const standard = FORMAT_STANDARD[format]
  return batRating * bowlRating * conditions * standard
}

function getInningsRunsVariance(mean: number, ballsRemaining: number): number {
  const inningsStDev = 1.4195 * Math.pow(ballsRemaining, 0.6809) - 0.0389 * mean
  const sd = Math.max(inningsStDev, 1)
  return sd * sd
}

/** Box-Muller standard normal sample */
function sampleNormal(mean: number, variance: number, rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + Math.sqrt(variance) * z
}

export interface MatchBettingInputs {
  homeBatRating: number
  homeBowlRating: number
  awayBatRating: number
  awayBowlRating: number
  conditions?: number
  homeAdjustPct?: number
  format?: MatchFormat
}

/** Win probability from race of two innings score distributions (MatchBetting model). */
export function computeMatchWinProbability(
  inputs: MatchBettingInputs,
  samples = 8000,
  rng: () => number = Math.random,
): { homeWinProb: number; awayWinProb: number } {
  const conditions = inputs.conditions ?? 1
  const format = inputs.format ?? 't20'
  const balls = FORMAT_BALLS[format]
  const homeAdjust = (inputs.homeAdjustPct ?? 0) / 100

  const homeMean = getInningsRuns(inputs.homeBatRating, inputs.awayBowlRating, conditions, format)
  const awayMean = getInningsRuns(inputs.awayBatRating, inputs.homeBowlRating, conditions, format)
  const homeVar = getInningsRunsVariance(homeMean, balls)
  const awayVar = getInningsRunsVariance(awayMean, balls)

  let homeWins = 0
  let awayWins = 0

  for (let i = 0; i < samples; i++) {
    const homeScore = sampleNormal(homeMean, homeVar, rng)
    const awayScore = sampleNormal(awayMean, awayVar, rng)
    if (homeScore > awayScore) homeWins++
    else if (awayScore > homeScore) awayWins++
    else homeWins += rng() < 0.5 ? 1 : 0
  }

  let homeProb = homeWins / samples
  let awayProb = awayWins / samples
  const total = homeProb + awayProb
  if (total > 0) {
    homeProb /= total
    awayProb /= total
  }

  homeProb = Math.min(0.999, Math.max(0.001, homeProb + homeAdjust))
  awayProb = Math.min(0.999, Math.max(0.001, 1 - homeProb))

  return { homeWinProb: homeProb, awayWinProb: awayProb }
}

export interface MatchSampleResult {
  winner: 'home' | 'away'
  homeScore: number
  awayScore: number
  /** Positive favours home team (runs margin). */
  margin: number
}

function matchConditions(configConditions: number, venueConditions: number): number {
  return configConditions * venueConditions
}

/** Sample scores and winner; venue conditions apply to both batting innings (home ground). */
export function sampleMatchWithMargin(
  inputs: MatchBettingInputs,
  venueConditions = 1,
  rng: () => number = Math.random,
): MatchSampleResult {
  const format = inputs.format ?? 't20'
  const balls = FORMAT_BALLS[format]
  const homeAdjust = (inputs.homeAdjustPct ?? 0) / 100
  const baseConditions = inputs.conditions ?? 1

  const homeMean = getInningsRuns(
    inputs.homeBatRating,
    inputs.awayBowlRating,
    matchConditions(baseConditions, venueConditions),
    format,
  )
  const awayMean = getInningsRuns(
    inputs.awayBatRating,
    inputs.homeBowlRating,
    matchConditions(baseConditions, venueConditions),
    format,
  )
  const homeVar = getInningsRunsVariance(homeMean, balls)
  const awayVar = getInningsRunsVariance(awayMean, balls)

  const homeScore = sampleNormal(homeMean, homeVar, rng)
  const awayScore = sampleNormal(awayMean, awayVar, rng)
  const margin = homeScore - awayScore

  if (margin > 0) return { winner: 'home', homeScore, awayScore, margin }
  if (margin < 0) return { winner: 'away', homeScore, awayScore, margin }

  const tieHome = 0.5 + homeAdjust
  const winner = rng() < tieHome ? 'home' : 'away'
  return { winner, homeScore, awayScore, margin: 0 }
}

/** Sample a single match winner using the same score distributions. */
export function sampleMatchWinner(
  inputs: MatchBettingInputs,
  rng: () => number = Math.random,
): 'home' | 'away' {
  return sampleMatchWithMargin(inputs, 1, rng).winner
}
