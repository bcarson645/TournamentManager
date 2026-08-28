import { generateFixtures, type Fixture } from './fixtures'
import { sampleMatchWithMargin, type MatchFormat } from './matchBettingModel'
import { getTeamsByTournament, type Team } from './teams'
import type { SimulatorGroup, TeamSimulatorRating, TournamentStructure } from './outrightSimulatorStore'

export interface SimulationConfig {
  tournamentId: string
  structure: TournamentStructure
  iterations: number
  conditions: number
  homeAdjustPct: number
  useGroups: boolean
  groups: SimulatorGroup[]
  advancePerGroup: number
  format: MatchFormat
  teamRatings: Record<string, TeamSimulatorRating>
}

export interface PairFixture {
  homeTeamId: string
  awayTeamId: string
}

export interface TeamSimulationResult {
  teamId: string
  teamName: string
  wins: number
  winProbability: number
  modelledPrice: number
  finalistCount: number
  finalistProbability: number
}

export interface TournamentSimulationResult {
  ranAt: number
  iterations: number
  structure: TournamentStructure
  teams: TeamSimulationResult[]
}

interface TournamentOutcome {
  champion: string
  finalists: string[]
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ratingFor(
  ratings: Record<string, TeamSimulatorRating>,
  teamId: string,
): TeamSimulatorRating {
  const r = ratings[teamId]
  return {
    teamId,
    battingRating: r?.battingRating ?? 1,
    bowlingRating: r?.bowlingRating ?? 1,
    conditions: r?.conditions ?? 1,
  }
}

function simulateKnockoutMatch(
  homeId: string,
  awayId: string,
  ratings: Record<string, TeamSimulatorRating>,
  config: SimulationConfig,
  rng: () => number,
): string {
  const home = ratingFor(ratings, homeId)
  const away = ratingFor(ratings, awayId)
  const result = sampleMatchWithMargin(
    {
      homeBatRating: home.battingRating,
      homeBowlRating: home.bowlingRating,
      awayBatRating: away.battingRating,
      awayBowlRating: away.bowlingRating,
      conditions: config.conditions,
      homeAdjustPct: config.homeAdjustPct,
      format: config.format,
    },
    home.conditions,
    rng,
  )
  return result.winner === 'home' ? homeId : awayId
}

function groupFixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.filter((f) => f.stage === 'group' && f.homeTeam !== 'TBC' && f.awayTeam !== 'TBC')
}

function nameToId(teams: Team[], name: string): string | undefined {
  return teams.find((t) => t.name === name)?.id
}

function generateGroupRoundRobin(teamIds: string[]): PairFixture[] {
  const fixtures: PairFixture[] = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push({ homeTeamId: teamIds[i], awayTeamId: teamIds[j] })
      fixtures.push({ homeTeamId: teamIds[j], awayTeamId: teamIds[i] })
    }
  }
  return fixtures
}

function buildSimulationFixtures(config: SimulationConfig, teams: Team[]): PairFixture[] {
  const teamIds = teams.map((t) => t.id)

  if (config.structure === 'ipl' && teamIds.length >= 2 && !config.useGroups) {
    return generateGroupRoundRobin(teamIds)
  }

  if (config.useGroups && config.groups.some((g) => g.teamIds.length >= 2)) {
    const out: PairFixture[] = []
    for (const group of config.groups) {
      if (group.teamIds.length < 2) continue
      out.push(...generateGroupRoundRobin(group.teamIds))
    }
    return out
  }

  return groupFixtures(generateFixtures(teams, config.tournamentId))
    .map((f) => {
      const homeTeamId = nameToId(teams, f.homeTeam)
      const awayTeamId = nameToId(teams, f.awayTeam)
      if (!homeTeamId || !awayTeamId) return null
      return { homeTeamId, awayTeamId }
    })
    .filter((f): f is PairFixture => f !== null)
}

function groupStandings(
  teamIds: string[],
  points: Map<string, number>,
  runMargin: Map<string, number>,
): { teamId: string; points: number; runMargin: number }[] {
  return standings(teamIds, points, runMargin)
}

function qualifyFromGroups(
  groups: SimulatorGroup[],
  advancePerGroup: number,
  points: Map<string, number>,
  runMargin: Map<string, number>,
): { teamId: string; points: number; runMargin: number }[] {
  const qualifiers: { teamId: string; points: number; runMargin: number }[] = []
  for (const group of groups) {
    if (group.teamIds.length === 0) continue
    const table = groupStandings(group.teamIds, points, runMargin)
    qualifiers.push(...table.slice(0, Math.max(1, advancePerGroup)))
  }
  return qualifiers.sort((a, b) => b.points - a.points || b.runMargin - a.runMargin)
}

function standings(
  teamIds: string[],
  points: Map<string, number>,
  runMargin: Map<string, number>,
): { teamId: string; points: number; runMargin: number }[] {
  return [...teamIds]
    .map((teamId) => ({
      teamId,
      points: points.get(teamId) ?? 0,
      runMargin: runMargin.get(teamId) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || b.runMargin - a.runMargin)
}

function uniqueFinalists(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

function resolveTournamentOutcome(
  structure: TournamentStructure,
  table: { teamId: string; points: number; runMargin: number }[],
  ratings: Record<string, TeamSimulatorRating>,
  config: SimulationConfig,
  rng: () => number,
): TournamentOutcome {
  if (structure === 'league') {
    const champion = table[0]?.teamId ?? ''
    const finalists = uniqueFinalists([table[0]?.teamId ?? '', table[1]?.teamId ?? ''])
    return { champion, finalists }
  }

  if (structure === 'league-final') {
    const first = table[0]?.teamId
    const second = table[1]?.teamId
    if (!first) return { champion: '', finalists: [] }
    if (!second) return { champion: first, finalists: [first] }
    const champion = simulateKnockoutMatch(first, second, ratings, config, rng)
    return { champion, finalists: [first, second] }
  }

  if (structure === 'ipl') {
    const first = table[0]?.teamId
    const second = table[1]?.teamId
    const third = table[2]?.teamId
    const fourth = table[3]?.teamId
    if (!first) return { champion: '', finalists: [] }
    if (!second) return { champion: first, finalists: [first] }
    if (!third || !fourth) {
      const champion = simulateKnockoutMatch(first, second, ratings, config, rng)
      return { champion, finalists: [first, second] }
    }

    const q1Winner = simulateKnockoutMatch(first, second, ratings, config, rng)
    const q1Loser = q1Winner === first ? second : first
    const elimWinner = simulateKnockoutMatch(third, fourth, ratings, config, rng)
    const q2Winner = simulateKnockoutMatch(q1Loser, elimWinner, ratings, config, rng)
    const finalHome =
      table.findIndex((r) => r.teamId === q1Winner) <= table.findIndex((r) => r.teamId === q2Winner)
        ? q1Winner
        : q2Winner
    const finalAway = finalHome === q1Winner ? q2Winner : q1Winner
    const champion = simulateKnockoutMatch(finalHome, finalAway, ratings, config, rng)
    return { champion, finalists: [q1Winner, q2Winner] }
  }

  if (structure === 'league-eliminator-final') {
    const first = table[0]?.teamId
    const second = table[1]?.teamId
    const third = table[2]?.teamId
    if (!first) return { champion: '', finalists: [] }
    if (!second || !third) return { champion: first, finalists: [first] }
    const elimWinner = simulateKnockoutMatch(second, third, ratings, config, rng)
    const champion = simulateKnockoutMatch(first, elimWinner, ratings, config, rng)
    return { champion, finalists: [first, elimWinner] }
  }

  const top4 = table.slice(0, 4).map((r) => r.teamId)
  if (top4.length < 2) {
    const champion = top4[0] ?? ''
    return { champion, finalists: champion ? [champion] : [] }
  }
  const semi1 = simulateKnockoutMatch(top4[0], top4[3] ?? top4[1], ratings, config, rng)
  const semi2 = simulateKnockoutMatch(top4[1], top4[2] ?? top4[0], ratings, config, rng)
  const champion = simulateKnockoutMatch(semi1, semi2, ratings, config, rng)
  return { champion, finalists: [semi1, semi2] }
}

export function runTournamentSimulation(config: SimulationConfig): TournamentSimulationResult {
  const teams = getTeamsByTournament(config.tournamentId)
  const teamIds = teams.map((t) => t.id)
  const fixtures = buildSimulationFixtures(config, teams)
  const winCounts = new Map<string, number>()
  const finalistCounts = new Map<string, number>()
  for (const id of teamIds) {
    winCounts.set(id, 0)
    finalistCounts.set(id, 0)
  }

  const rng = mulberry32(config.iterations * 9973 + config.tournamentId.length)

  for (let i = 0; i < config.iterations; i++) {
    const points = new Map<string, number>()
    const runMargin = new Map<string, number>()
    for (const id of teamIds) {
      points.set(id, 0)
      runMargin.set(id, 0)
    }

    for (const fix of fixtures) {
      const homeId = fix.homeTeamId
      const awayId = fix.awayTeamId
      if (!homeId || !awayId) continue

      const home = ratingFor(config.teamRatings, homeId)
      const away = ratingFor(config.teamRatings, awayId)
      const result = sampleMatchWithMargin(
        {
          homeBatRating: home.battingRating,
          homeBowlRating: home.bowlingRating,
          awayBatRating: away.battingRating,
          awayBowlRating: away.bowlingRating,
          conditions: config.conditions,
          homeAdjustPct: config.homeAdjustPct,
          format: config.format,
        },
        home.conditions,
        rng,
      )
      const winnerId = result.winner === 'home' ? homeId : awayId
      points.set(winnerId, (points.get(winnerId) ?? 0) + 2)
      runMargin.set(homeId, (runMargin.get(homeId) ?? 0) + result.margin)
      runMargin.set(awayId, (runMargin.get(awayId) ?? 0) - result.margin)
    }

    const table =
      config.structure === 'ipl' || !(config.useGroups && config.groups.some((g) => g.teamIds.length >= 2))
        ? standings(teamIds, points, runMargin)
        : qualifyFromGroups(config.groups, config.advancePerGroup, points, runMargin)
    const outcome = resolveTournamentOutcome(config.structure, table, config.teamRatings, config, rng)
    if (outcome.champion) winCounts.set(outcome.champion, (winCounts.get(outcome.champion) ?? 0) + 1)
    for (const finalistId of outcome.finalists) {
      finalistCounts.set(finalistId, (finalistCounts.get(finalistId) ?? 0) + 1)
    }
  }

  const results: TeamSimulationResult[] = teams.map((team) => {
    const wins = winCounts.get(team.id) ?? 0
    const finalistCount = finalistCounts.get(team.id) ?? 0
    const winProbability = config.iterations > 0 ? wins / config.iterations : 0
    const finalistProbability = config.iterations > 0 ? finalistCount / config.iterations : 0
    const modelledPrice = winProbability > 0 ? Math.round((1 / winProbability) * 100) / 100 : 0
    return {
      teamId: team.id,
      teamName: team.name,
      wins,
      winProbability,
      modelledPrice,
      finalistCount,
      finalistProbability,
    }
  })

  results.sort((a, b) => b.winProbability - a.winProbability)

  return {
    ranAt: Date.now(),
    iterations: config.iterations,
    structure: config.structure,
    teams: results,
  }
}
