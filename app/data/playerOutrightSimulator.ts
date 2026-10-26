import type { CricketFormat } from './tournaments'
import { computePrepRawEffective } from './prepRawFormula'
import type { TournamentMatchPrepSettings } from './matchPrepSettings'
import type { TeamSimulatorRating } from './outrightSimulatorStore'
import { getSquadForTeam } from './squadStore'
import { ratingParPosForBatCalc } from './squad'
import type { SquadPlayer } from './squad'
import { getTeamsByTournament } from './teams'
import {
  buildSimulationFixtures,
  simulateTournamentIteration,
  type PairFixture,
  type SimulationConfig,
  type TeamSimulationResult,
  type TournamentSimulationResult,
} from './tournamentSimulator'

export interface PlayerPropSimulationRow {
  playerId: string
  name: string
  teamId: string
  teamName: string
  topCount: number
  topProbability: number
  meanTotal: number
  meanGamesPlayed: number
}

export interface PlayerPropSimulationResult {
  ranAt: number
  iterations: number
  batters: PlayerPropSimulationRow[]
  bowlers: PlayerPropSimulationRow[]
}

interface PlayerSimState {
  playerId: string
  name: string
  teamId: string
  teamName: string
  topRuns: number
  topWickets: number
  sumRuns: number
  sumWickets: number
  sumGames: number
}

function clampFactor(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.max(0.5, Math.min(2, n))
}

/** Map simulator team ratings to per-innings prep factors (conditions + opposition bowling). */
export function buildSimulatorMatchPrep(
  battingAtHomeInFixture: boolean,
  battingTeam: TeamSimulatorRating,
  fieldingTeam: TeamSimulatorRating,
  baseConditions: number,
): TournamentMatchPrepSettings {
  const batCond = clampFactor(battingTeam.conditions * baseConditions)
  const bowl = clampFactor(fieldingTeam.bowlingRating)
  const homeVenueCond = clampFactor(fieldingTeam.conditions * baseConditions)

  if (battingAtHomeInFixture) {
    return {
      homeConditionsFactor: batCond,
      awayBowlingFactor: bowl,
      awayConditionsFactor: batCond,
      homeBowlingFactor: bowl,
    }
  }
  return {
    homeConditionsFactor: homeVenueCond,
    awayBowlingFactor: bowl,
    awayConditionsFactor: batCond,
    homeBowlingFactor: bowl,
  }
}

function normalSample(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Gamma variate (shape ≥ 0.5) — used for over-dispersed run totals. */
function sampleGamma(shape: number, scale: number, rng: () => number): number {
  if (shape <= 0 || scale <= 0) return 0
  if (shape < 1) {
    return sampleGamma(shape + 1, scale, rng) * Math.pow(rng(), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x = normalSample(rng)
    let v = 1 + c * x
    if (v <= 0) continue
    v = v * v * v
    const u = rng()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale
  }
}

/** Expected runs for this innings (Prep Raw); simulated with Gamma around that mean. */
function sampleInningsRuns(expected: number, rng: () => number): number {
  if (expected <= 0) return 0
  const shape = Math.max(1.5, Math.min(12, expected / 4))
  const scale = expected / shape
  return Math.max(0, Math.round(sampleGamma(shape, scale, rng)))
}

function samplePoisson(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0
  if (lambda > 40) {
    const n = Math.round(lambda + Math.sqrt(lambda) * normalSample(rng))
    return Math.max(0, n)
  }
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

function expectedRunsForPlayer(
  player: SquadPlayer,
  index: number,
  format: CricketFormat,
  matchPrep: TournamentMatchPrepSettings,
  battingAtHome: boolean,
): number {
  const { raw } = computePrepRawEffective({
    btCaz: player.btCaz,
    battingPosition: ratingParPosForBatCalc('starting', index, player),
    format,
    matchPrep,
    battingAtHome,
    rawAdj: player.rawAdj ?? 0,
  })
  return raw
}

function simulatePlayerInningsForTeam(
  teamId: string,
  battingAtHome: boolean,
  opponentId: string,
  format: CricketFormat,
  config: SimulationConfig,
  ratings: Record<string, TeamSimulatorRating>,
  runsTotals: Map<string, number>,
  wktsTotals: Map<string, number>,
  gamesPlayed: Map<string, number>,
  rng: () => number,
): void {
  const battingTeam = ratings[teamId] ?? { teamId, battingRating: 1, bowlingRating: 1, conditions: 1 }
  const fieldingTeam = ratings[opponentId] ?? {
    teamId: opponentId,
    battingRating: 1,
    bowlingRating: 1,
    conditions: 1,
  }
  const matchPrep = buildSimulatorMatchPrep(
    battingAtHome,
    battingTeam,
    fieldingTeam,
    config.conditions,
  )
  const { startingXI } = getSquadForTeam(teamId)
  for (let i = 0; i < startingXI.length; i++) {
    const p = startingXI[i]!
    const expected = expectedRunsForPlayer(p, i, format, matchPrep, battingAtHome)
    const sampled = sampleInningsRuns(expected, rng)
    runsTotals.set(p.id, (runsTotals.get(p.id) ?? 0) + sampled)

    const wktsLambda = Math.max(0, p.wkts ?? 0)
    if (wktsLambda > 0) {
      const wkts = samplePoisson(wktsLambda, rng)
      wktsTotals.set(p.id, (wktsTotals.get(p.id) ?? 0) + wkts)
    }
    gamesPlayed.set(p.id, (gamesPlayed.get(p.id) ?? 0) + 1)
  }
}

function processFixture(
  fix: PairFixture,
  format: CricketFormat,
  config: SimulationConfig,
  ratings: Record<string, TeamSimulatorRating>,
  runsTotals: Map<string, number>,
  wktsTotals: Map<string, number>,
  gamesPlayed: Map<string, number>,
  rng: () => number,
): void {
  simulatePlayerInningsForTeam(
    fix.homeTeamId,
    true,
    fix.awayTeamId,
    format,
    config,
    ratings,
    runsTotals,
    wktsTotals,
    gamesPlayed,
    rng,
  )
  simulatePlayerInningsForTeam(
    fix.awayTeamId,
    false,
    fix.homeTeamId,
    format,
    config,
    ratings,
    runsTotals,
    wktsTotals,
    gamesPlayed,
    rng,
  )
}

function findTopPlayerIds(totals: Map<string, number>, playerIds: Set<string>): string[] {
  let best = -1
  for (const id of playerIds) {
    best = Math.max(best, totals.get(id) ?? 0)
  }
  if (best < 0) return []
  return [...playerIds].filter((id) => (totals.get(id) ?? 0) === best)
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIM_YIELD_EVERY = 8

function buildPlayerPropResult(
  players: PlayerSimState[],
  iterations: number,
): PlayerPropSimulationResult {
  const n = Math.max(1, iterations)
  const batters: PlayerPropSimulationRow[] = players
    .filter((p) => p.sumRuns > 0 || p.topRuns > 0)
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName,
      topCount: p.topRuns,
      topProbability: p.topRuns / n,
      meanTotal: p.sumRuns / n,
      meanGamesPlayed: p.sumGames / n,
    }))
    .sort((a, b) => b.topProbability - a.topProbability || b.meanTotal - a.meanTotal)

  const bowlers: PlayerPropSimulationRow[] = players
    .filter((p) => p.sumWickets > 0 || p.topWickets > 0)
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName,
      topCount: p.topWickets,
      topProbability: p.topWickets / n,
      meanTotal: p.sumWickets / n,
      meanGamesPlayed: p.sumGames / n,
    }))
    .sort((a, b) => b.topProbability - a.topProbability || b.meanTotal - a.meanTotal)

  return {
    ranAt: Date.now(),
    iterations,
    batters,
    bowlers,
  }
}

function buildTournamentResult(
  config: SimulationConfig,
  teams: ReturnType<typeof getTeamsByTournament>,
  winCounts: Map<string, number>,
  finalistCounts: Map<string, number>,
): TournamentSimulationResult {
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

interface CombinedSimState {
  teams: ReturnType<typeof getTeamsByTournament>
  teamIds: string[]
  groupFixtures: PairFixture[]
  players: PlayerSimState[]
  playerIds: Set<string>
  winCounts: Map<string, number>
  finalistCounts: Map<string, number>
  rng: () => number
}

function initCombinedSimState(config: SimulationConfig): CombinedSimState {
  const teams = getTeamsByTournament(config.tournamentId)
  const teamIds = teams.map((t) => t.id)
  const groupFixtures = buildSimulationFixtures(config, teams)
  const players: PlayerSimState[] = []
  for (const team of teams) {
    const { startingXI } = getSquadForTeam(team.id)
    for (const p of startingXI) {
      players.push({
        playerId: p.id,
        name: p.name,
        teamId: team.id,
        teamName: team.name,
        topRuns: 0,
        topWickets: 0,
        sumRuns: 0,
        sumWickets: 0,
        sumGames: 0,
      })
    }
  }
  const winCounts = new Map<string, number>()
  const finalistCounts = new Map<string, number>()
  for (const id of teamIds) {
    winCounts.set(id, 0)
    finalistCounts.set(id, 0)
  }
  const rng = mulberry32(config.iterations * 9973 + config.tournamentId.length * 17)
  return {
    teams,
    teamIds,
    groupFixtures,
    players,
    playerIds: new Set(players.map((p) => p.playerId)),
    winCounts,
    finalistCounts,
    rng,
  }
}

function runCombinedIterations(
  config: SimulationConfig,
  format: CricketFormat,
  state: CombinedSimState,
  fromIter: number,
  toIter: number,
): void {
  const { teams, teamIds, groupFixtures, players, playerIds, winCounts, finalistCounts, rng } =
    state
  for (let iter = fromIter; iter < toIter; iter++) {
    const { outcome, knockoutMatches } = simulateTournamentIteration(
      config,
      teamIds,
      groupFixtures,
      rng,
    )
    if (outcome.champion) {
      winCounts.set(outcome.champion, (winCounts.get(outcome.champion) ?? 0) + 1)
    }
    for (const finalistId of outcome.finalists) {
      finalistCounts.set(finalistId, (finalistCounts.get(finalistId) ?? 0) + 1)
    }

    const allMatches: PairFixture[] = [...groupFixtures, ...knockoutMatches]
    const runsTotals = new Map<string, number>()
    const wktsTotals = new Map<string, number>()
    const gamesPlayed = new Map<string, number>()

    for (const fix of allMatches) {
      processFixture(
        fix,
        format,
        config,
        config.teamRatings,
        runsTotals,
        wktsTotals,
        gamesPlayed,
        rng,
      )
    }

    const topRunsIds = findTopPlayerIds(runsTotals, playerIds)
    const topWktsIds = findTopPlayerIds(wktsTotals, playerIds)

    for (const row of players) {
      row.sumRuns += runsTotals.get(row.playerId) ?? 0
      row.sumWickets += wktsTotals.get(row.playerId) ?? 0
      row.sumGames += gamesPlayed.get(row.playerId) ?? 0
      if (topRunsIds.includes(row.playerId)) row.topRuns++
      if (topWktsIds.includes(row.playerId)) row.topWickets++
    }
  }
}

/** Team winner + player props in one pass (half the work vs two full sims). */
export function runCombinedOutrightSimulation(
  config: SimulationConfig,
  format: CricketFormat,
): { tournament: TournamentSimulationResult; players: PlayerPropSimulationResult } {
  const state = initCombinedSimState(config)
  runCombinedIterations(config, format, state, 0, config.iterations)
  return {
    tournament: buildTournamentResult(config, state.teams, state.winCounts, state.finalistCounts),
    players: buildPlayerPropResult(state.players, config.iterations),
  }
}

export async function runCombinedOutrightSimulationAsync(
  config: SimulationConfig,
  format: CricketFormat,
  yieldEvery = SIM_YIELD_EVERY,
): Promise<{ tournament: TournamentSimulationResult; players: PlayerPropSimulationResult }> {
  const state = initCombinedSimState(config)
  let done = 0
  while (done < config.iterations) {
    const batch = Math.min(yieldEvery, config.iterations - done)
    runCombinedIterations(config, format, state, done, done + batch)
    done += batch
    if (done < config.iterations) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
    }
  }
  return {
    tournament: buildTournamentResult(config, state.teams, state.winCounts, state.finalistCounts),
    players: buildPlayerPropResult(state.players, config.iterations),
  }
}

/** @deprecated Use runCombinedOutrightSimulation — kept for direct calls. */
export function runPlayerPropSimulation(
  config: SimulationConfig,
  format: CricketFormat,
): PlayerPropSimulationResult {
  return runCombinedOutrightSimulation(config, format).players
}
