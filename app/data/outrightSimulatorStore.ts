import { getTeamBatRatingTotal, getTeamBowlRatingTotal } from './squadStore'
import { getTeamsByTournament } from './teams'
import { getTournamentOptions } from './tournamentOptions'
import { cricketFormatToMatchFormat } from './matchBettingModel'
import {
  fairProbabilitiesToBookOddsMarket,
  probabilityToFairOdds,
  type BookOddsMarketResult,
} from './outrightOdds'
import { runTournamentSimulation, type TournamentSimulationResult } from './tournamentSimulator'
import { setOutrightInputPricesByEntityId, type OutrightType } from './outrightsStore'
import type { CricketFormat } from './tournaments'

const STORAGE_KEY = 'tm-outright-simulator'
let simulatorStoreVersion = 0

export const SIMULATOR_CHANGE_EVENT = 'outright-simulator-changed'

export function getSimulatorStoreVersion(): number {
  return simulatorStoreVersion
}

export function subscribeSimulatorStore(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    onStoreChange()
  }
  window.addEventListener(SIMULATOR_CHANGE_EVENT, handler)
  return () => window.removeEventListener(SIMULATOR_CHANGE_EVENT, handler)
}

export type TournamentStructure =
  | 'league'
  | 'league-semis-final'
  | 'league-eliminator-final'
  | 'league-final'
  | 'ipl'

export const TOURNAMENT_STRUCTURES: { key: TournamentStructure; label: string }[] = [
  { key: 'league', label: 'League only (table winner)' },
  { key: 'league-semis-final', label: 'League + semi-finals + final' },
  { key: 'league-eliminator-final', label: 'League + eliminator (2 v 3) + final' },
  { key: 'league-final', label: 'League + single final (1 v 2)' },
  { key: 'ipl', label: 'IPL (double round-robin + playoffs)' },
]

export interface SimulatorGroup {
  id: string
  name: string
  teamIds: string[]
}

export interface TeamSimulatorRating {
  teamId: string
  battingRating: number
  bowlingRating: number
  conditions: number
}

export interface SimulatorTournamentConfig {
  structure: TournamentStructure
  iterations: number
  conditions: number
  homeAdjustPct: number
  useGroups: boolean
  groups: SimulatorGroup[]
  advancePerGroup: number
  oddsMarginPct: number
  minimumPrice: number
  maximumPrice: number
  teamRatings: Record<string, TeamSimulatorRating>
  lastResult: TournamentSimulationResult | null
}

type Store = Record<string, SimulatorTournamentConfig>

function newGroupId(): string {
  return `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultGroups(): SimulatorGroup[] {
  return [
    { id: newGroupId(), name: 'Group A', teamIds: [] },
    { id: newGroupId(), name: 'Group B', teamIds: [] },
  ]
}

function defaultTeamRatings(tournamentId: string): Record<string, TeamSimulatorRating> {
  const ratings: Record<string, TeamSimulatorRating> = {}
  for (const team of getTeamsByTournament(tournamentId)) {
    ratings[team.id] = {
      teamId: team.id,
      battingRating: 1,
      bowlingRating: 1,
      conditions: 1,
    }
  }
  return ratings
}

function normalizeGroups(tournamentId: string, groups: SimulatorGroup[] | undefined): SimulatorGroup[] {
  const teamIds = new Set(getTeamsByTournament(tournamentId).map((t) => t.id))
  const seen = new Set<string>()
  const normalized: SimulatorGroup[] = []

  for (const group of groups ?? []) {
    const teamIdsInGroup: string[] = []
    for (const teamId of group.teamIds ?? []) {
      if (!teamIds.has(teamId) || seen.has(teamId)) continue
      seen.add(teamId)
      teamIdsInGroup.push(teamId)
    }
    normalized.push({
      id: group.id || newGroupId(),
      name: group.name?.trim() || `Group ${String.fromCharCode(65 + normalized.length)}`,
      teamIds: teamIdsInGroup,
    })
  }

  return normalized.length > 0 ? normalized : defaultGroups()
}

function defaultConfig(tournamentId: string): SimulatorTournamentConfig {
  return {
    structure: 'league-semis-final',
    iterations: 10000,
    conditions: 1,
    homeAdjustPct: 2,
    useGroups: false,
    groups: defaultGroups(),
    advancePerGroup: 2,
    oddsMarginPct: 10,
    minimumPrice: 1.01,
    maximumPrice: 1001,
    teamRatings: defaultTeamRatings(tournamentId),
    lastResult: null,
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
  simulatorStoreVersion++
  window.dispatchEvent(new CustomEvent(SIMULATOR_CHANGE_EVENT))
}

export function getSimulatorConfig(tournamentId: string): SimulatorTournamentConfig {
  const all = readAll()
  const row = all[tournamentId]
  if (!row) return defaultConfig(tournamentId)

  const base = defaultTeamRatings(tournamentId)
  return {
    structure: row.structure ?? 'league-semis-final',
    iterations: row.iterations ?? 10000,
    conditions: row.conditions ?? 1,
    homeAdjustPct: row.homeAdjustPct ?? 2,
    useGroups: row.useGroups ?? false,
    groups: normalizeGroups(tournamentId, row.groups),
    advancePerGroup: row.advancePerGroup ?? 2,
    oddsMarginPct: row.oddsMarginPct ?? 10,
    minimumPrice: row.minimumPrice ?? 1.01,
    maximumPrice: row.maximumPrice ?? 1001,
    teamRatings: { ...base, ...row.teamRatings },
    lastResult: row.lastResult ?? null,
  }
}

export function saveSimulatorConfig(tournamentId: string, patch: Partial<SimulatorTournamentConfig>): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  all[tournamentId] = { ...getSimulatorConfig(tournamentId), ...patch }
  writeAll(all)
}

export function updateTeamSimulatorRating(
  tournamentId: string,
  teamId: string,
  patch: Partial<Omit<TeamSimulatorRating, 'teamId'>>,
): void {
  const cfg = getSimulatorConfig(tournamentId)
  cfg.teamRatings[teamId] = { ...cfg.teamRatings[teamId], teamId, ...patch }
  saveSimulatorConfig(tournamentId, { teamRatings: cfg.teamRatings })
}

export function pullRatingsFromTournamentManager(tournamentId: string): void {
  const parScore = getTournamentOptions(tournamentId).ratingParScore
  const cfg = getSimulatorConfig(tournamentId)
  for (const team of getTeamsByTournament(tournamentId)) {
    cfg.teamRatings[team.id] = {
      teamId: team.id,
      battingRating: getTeamBatRatingTotal(team.id, parScore),
      bowlingRating: getTeamBowlRatingTotal(team.id, parScore),
      conditions: 1,
    }
  }
  saveSimulatorConfig(tournamentId, { teamRatings: cfg.teamRatings })
}

export function importTeamRatingsFromJson(
  tournamentId: string,
  rows: Array<{ teamId?: string; teamName?: string; battingRating?: number; bowlingRating?: number; conditions?: number }>,
): { updated: number; errors: string[] } {
  const teams = getTeamsByTournament(tournamentId)
  const cfg = getSimulatorConfig(tournamentId)
  let updated = 0
  const errors: string[] = []

  for (const row of rows) {
    const team =
      (row.teamId ? teams.find((t) => t.id === row.teamId) : undefined) ??
      (row.teamName ? teams.find((t) => t.name.toLowerCase() === row.teamName!.toLowerCase()) : undefined)
    if (!team) {
      errors.push(`Unknown team: ${row.teamId ?? row.teamName ?? '?'}`)
      continue
    }
    cfg.teamRatings[team.id] = {
      teamId: team.id,
      battingRating: Number(row.battingRating) || 1,
      bowlingRating: Number(row.bowlingRating) || 1,
      conditions: Number(row.conditions) || 1,
    }
    updated++
  }

  saveSimulatorConfig(tournamentId, { teamRatings: cfg.teamRatings })
  return { updated, errors }
}

export function runSimulatorForTournament(tournamentId: string, format: CricketFormat): TournamentSimulationResult {
  const cfg = getSimulatorConfig(tournamentId)
  const result = runTournamentSimulation({
    tournamentId,
    structure: cfg.structure,
    iterations: cfg.iterations,
    conditions: cfg.conditions,
    homeAdjustPct: cfg.homeAdjustPct,
    useGroups: cfg.useGroups,
    groups: cfg.groups,
    advancePerGroup: cfg.advancePerGroup,
    format: cricketFormatToMatchFormat(format),
    teamRatings: cfg.teamRatings,
  })
  saveSimulatorConfig(tournamentId, { lastResult: result })
  return result
}

export type SimulationBookKind = 'winner' | 'finalist'

interface SimulationBookOddsCache {
  tournamentId: string
  version: number
  winner: BookOddsMarketResult & { byTeamId: Record<string, number | undefined> }
  finalist: BookOddsMarketResult & { byTeamId: Record<string, number | undefined> }
}

let simulationBookOddsCache: SimulationBookOddsCache | null = null

function buildSimulationBookOdds(
  tournamentId: string,
  kind: SimulationBookKind,
): BookOddsMarketResult & { byTeamId: Record<string, number | undefined> } {
  const cfg = getSimulatorConfig(tournamentId)
  const result = cfg.lastResult
  const empty: BookOddsMarketResult & { byTeamId: Record<string, number | undefined> } = {
    odds: [],
    fairProbabilitySum: 0,
    targetImpliedTotal: 0,
    impliedTotal: 0,
    overroundPctPoints: 0,
    byTeamId: {},
  }
  if (!result) return empty

  const teams = result.teams
  const fairProbs = teams.map((row) =>
    kind === 'winner' ? row.winProbability : (row.finalistProbability ?? 0),
  )
  const market = fairProbabilitiesToBookOddsMarket(
    fairProbs,
    cfg.oddsMarginPct,
    cfg.minimumPrice,
    cfg.maximumPrice,
  )
  const byTeamId: Record<string, number | undefined> = {}
  teams.forEach((row, index) => {
    byTeamId[row.teamId] = market.odds[index]
  })
  return { ...market, byTeamId }
}

function getSimulationBookOddsCache(tournamentId: string): SimulationBookOddsCache {
  const version = getSimulatorStoreVersion()
  if (simulationBookOddsCache?.tournamentId === tournamentId && simulationBookOddsCache.version === version) {
    return simulationBookOddsCache
  }
  simulationBookOddsCache = {
    tournamentId,
    version,
    winner: buildSimulationBookOdds(tournamentId, 'winner'),
    finalist: buildSimulationBookOdds(tournamentId, 'finalist'),
  }
  return simulationBookOddsCache
}

export function getSimulationBookOddsMarket(
  tournamentId: string,
  kind: SimulationBookKind,
): BookOddsMarketResult {
  const cache = getSimulationBookOddsCache(tournamentId)
  const entry = kind === 'winner' ? cache.winner : cache.finalist
  return {
    odds: entry.odds,
    fairProbabilitySum: entry.fairProbabilitySum,
    targetImpliedTotal: entry.targetImpliedTotal,
    impliedTotal: entry.impliedTotal,
    overroundPctPoints: entry.overroundPctPoints,
  }
}

export function getSimulationWinProbability(tournamentId: string, teamId: string): number | undefined {
  const result = getSimulatorConfig(tournamentId).lastResult
  if (!result) return undefined
  const row = result.teams.find((t) => t.teamId === teamId)
  return row?.winProbability
}

export function getSimulationFinalistProbability(tournamentId: string, teamId: string): number | undefined {
  const result = getSimulatorConfig(tournamentId).lastResult
  if (!result) return undefined
  const row = result.teams.find((t) => t.teamId === teamId)
  return row?.finalistProbability
}

export function getSimulationFairPrice(tournamentId: string, teamId: string): number | undefined {
  const prob = getSimulationWinProbability(tournamentId, teamId)
  if (prob === undefined) return undefined
  return probabilityToFairOdds(prob)
}

/** Book decimal odds with market overround, minimum price, and maximum price. */
export function getSimulationModelledPrice(tournamentId: string, teamId: string): number | undefined {
  return getSimulationBookOddsCache(tournamentId).winner.byTeamId[teamId]
}
export function getSimulationFinalistFairPrice(tournamentId: string, teamId: string): number | undefined {
  const prob = getSimulationFinalistProbability(tournamentId, teamId)
  if (prob === undefined) return undefined
  return probabilityToFairOdds(prob)
}

export function getSimulationFinalistModelledPrice(tournamentId: string, teamId: string): number | undefined {
  return getSimulationBookOddsCache(tournamentId).finalist.byTeamId[teamId]
}

export function getUnassignedSimulatorTeams(tournamentId: string): string[] {
  const cfg = getSimulatorConfig(tournamentId)
  const assigned = new Set(cfg.groups.flatMap((g) => g.teamIds))
  return getTeamsByTournament(tournamentId)
    .map((t) => t.id)
    .filter((id) => !assigned.has(id))
}

export function addSimulatorGroup(tournamentId: string): void {
  const cfg = getSimulatorConfig(tournamentId)
  const label = String.fromCharCode(65 + cfg.groups.length)
  saveSimulatorConfig(tournamentId, {
    groups: [...cfg.groups, { id: newGroupId(), name: `Group ${label}`, teamIds: [] }],
  })
}

export function removeSimulatorGroup(tournamentId: string, groupId: string): void {
  const cfg = getSimulatorConfig(tournamentId)
  const next = cfg.groups.filter((g) => g.id !== groupId)
  saveSimulatorConfig(tournamentId, {
    groups: next.length > 0 ? next : defaultGroups(),
  })
}

export function updateSimulatorGroup(
  tournamentId: string,
  groupId: string,
  patch: Partial<Pick<SimulatorGroup, 'name'>>,
): void {
  const cfg = getSimulatorConfig(tournamentId)
  saveSimulatorConfig(tournamentId, {
    groups: cfg.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
  })
}

export function assignTeamToSimulatorGroup(
  tournamentId: string,
  teamId: string,
  groupId: string | null,
): void {
  const cfg = getSimulatorConfig(tournamentId)
  const groups = cfg.groups.map((g) => ({
    ...g,
    teamIds: g.teamIds.filter((id) => id !== teamId),
  }))
  if (groupId) {
    const target = groups.find((g) => g.id === groupId)
    if (target && !target.teamIds.includes(teamId)) {
      target.teamIds.push(teamId)
    }
  }
  saveSimulatorConfig(tournamentId, { groups })
}

export function portSimulatorPricesToOutright(
  tournamentId: string,
  outrightType: OutrightType = 'tournament-winner',
): { updated: number; error?: string } {
  const cfg = getSimulatorConfig(tournamentId)
  if (!cfg.lastResult) {
    return { updated: 0, error: 'Run the simulator first.' }
  }

  const book = getSimulationBookOddsCache(tournamentId)[outrightType === 'finalist' ? 'finalist' : 'winner']
  const pricesByEntityId: Record<string, number> = {}
  for (const row of cfg.lastResult.teams) {
    const price = book.byTeamId[row.teamId]
    if (price !== undefined) pricesByEntityId[row.teamId] = price
  }

  if (Object.keys(pricesByEntityId).length === 0) {
    return { updated: 0, error: 'No book prices available from the latest simulation.' }
  }

  return setOutrightInputPricesByEntityId(tournamentId, outrightType, pricesByEntityId)
}

export function portSimulatorPricesToLinkedOutrights(tournamentId: string): {
  winnerUpdated: number
  finalistUpdated: number
  errors: string[]
} {
  const winner = portSimulatorPricesToOutright(tournamentId, 'tournament-winner')
  const finalist = portSimulatorPricesToOutright(tournamentId, 'finalist')
  const errors: string[] = []
  if (winner.error) errors.push(winner.error.replace('market found', 'Tournament Winner market found'))
  if (finalist.error && !finalist.error.includes('No Tournament Winner')) {
    errors.push(finalist.error.replace('market found', 'Finalist market found'))
  }
  return {
    winnerUpdated: winner.updated,
    finalistUpdated: finalist.updated,
    errors,
  }
}
