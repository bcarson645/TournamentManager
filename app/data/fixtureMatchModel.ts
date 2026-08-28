import {
  computeMatchWinProbability,
  cricketFormatToMatchFormat,
} from './matchBettingModel'
import { probabilityToFairOdds } from './outrightOdds'
import { getSimulatorConfig } from './outrightSimulatorStore'
import type { CricketFormat } from './tournaments'

export interface FixtureMatchModel {
  homeWinProb: number
  awayWinProb: number
  homeFairPrice: number | undefined
  awayFairPrice: number | undefined
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromFixtureId(fixtureId: string): number {
  let hash = 0
  for (let i = 0; i < fixtureId.length; i++) {
    hash = (Math.imul(31, hash) + fixtureId.charCodeAt(i)) | 0
  }
  return hash
}

export function computeFixtureMatchModel(
  tournamentId: string,
  homeTeamId: string,
  awayTeamId: string,
  format: CricketFormat,
  fixtureId: string,
): FixtureMatchModel {
  const config = getSimulatorConfig(tournamentId)
  const home = config.teamRatings[homeTeamId]
  const away = config.teamRatings[awayTeamId]
  const homeRating = {
    battingRating: home?.battingRating ?? 1,
    bowlingRating: home?.bowlingRating ?? 1,
    conditions: home?.conditions ?? 1,
  }
  const awayRating = {
    battingRating: away?.battingRating ?? 1,
    bowlingRating: away?.bowlingRating ?? 1,
    conditions: away?.conditions ?? 1,
  }

  const { homeWinProb, awayWinProb } = computeMatchWinProbability(
    {
      homeBatRating: homeRating.battingRating,
      homeBowlRating: homeRating.bowlingRating,
      awayBatRating: awayRating.battingRating,
      awayBowlRating: awayRating.bowlingRating,
      conditions: config.conditions * homeRating.conditions,
      homeAdjustPct: config.homeAdjustPct,
      format: cricketFormatToMatchFormat(format),
    },
    8000,
    mulberry32(seedFromFixtureId(fixtureId)),
  )

  return {
    homeWinProb,
    awayWinProb,
    homeFairPrice: probabilityToFairOdds(homeWinProb),
    awayFairPrice: probabilityToFairOdds(awayWinProb),
  }
}
