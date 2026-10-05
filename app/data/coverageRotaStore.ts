import { getStoredSquad } from './squadStore'
import { TEAMS } from './teams'
import { DEFAULT_TRADERS, type Trader } from './traders'
export type { Trader } from './traders'

const STORAGE_KEY = 'tm-coverage-rota-v2'
const LEGACY_STORAGE_KEY = 'tm-coverage-rota-v1'

export type CoverageStatus = 'unassigned' | 'assigned' | 'in_progress' | 'complete'

export interface TeamCoverageRow {
  traderId: string | null
  statusOverride: CoverageStatus | null
}

export interface TournamentCoverageRow {
  leadTraderId: string | null
  /** All traders assigned at tournament level (first is lead). */
  traderIds: string[]
  teamRows: Record<string, TeamCoverageRow>
  notes: string
}

export interface CoverageRotaState {
  traders: Trader[]
  tournaments: Record<string, TournamentCoverageRow>
}

function emptyTeamRow(): TeamCoverageRow {
  return { traderId: null, statusOverride: null }
}

function emptyTournamentRow(): TournamentCoverageRow {
  return { leadTraderId: null, traderIds: [], teamRows: {}, notes: '' }
}

function normalizeTournamentRow(row: TournamentCoverageRow): TournamentCoverageRow {
  if (!Array.isArray(row.traderIds)) row.traderIds = []

  if (row.leadTraderId && !row.traderIds.includes(row.leadTraderId)) {
    row.traderIds = [row.leadTraderId, ...row.traderIds.filter((id) => id !== row.leadTraderId)]
  }

  if (row.traderIds.length > 0) {
    row.leadTraderId = row.traderIds[0]
  } else if (row.leadTraderId) {
    row.traderIds = [row.leadTraderId]
  } else {
    row.leadTraderId = null
  }

  return row
}

function readLegacyTournaments(): Record<string, TournamentCoverageRow> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<CoverageRotaState>
    const tournaments = parsed.tournaments && typeof parsed.tournaments === 'object' ? parsed.tournaments : {}
    for (const row of Object.values(tournaments)) {
      normalizeTournamentRow(row)
    }
    return tournaments
  } catch {
    return {}
  }
}

function readState(): CoverageRotaState {
  if (typeof window === 'undefined') {
    return { traders: DEFAULT_TRADERS, tournaments: {} }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { traders: DEFAULT_TRADERS, tournaments: readLegacyTournaments() }
    }
    const parsed = JSON.parse(raw) as Partial<CoverageRotaState>
    const tournaments = parsed.tournaments && typeof parsed.tournaments === 'object' ? parsed.tournaments : {}
    for (const row of Object.values(tournaments)) {
      normalizeTournamentRow(row)
    }
    return {
      traders: DEFAULT_TRADERS,
      tournaments,
    }
  } catch {
    return { traders: DEFAULT_TRADERS, tournaments: readLegacyTournaments() }
  }
}

function writeState(state: CoverageRotaState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent('coverage-rota-changed'))
}

let cache: CoverageRotaState | null = null
let coverageStoreVersion = 0

function getState(): CoverageRotaState {
  if (!cache) cache = readState()
  return cache
}

function mutate(mutator: (state: CoverageRotaState) => void): void {
  const state = structuredClone(getState())
  mutator(state)
  cache = state
  writeState(state)
}

export function subscribeCoverageRota(onStoreChange: () => void): () => void {
  const handler = () => {
    cache = null
    coverageStoreVersion += 1
    onStoreChange()
  }
  window.addEventListener('coverage-rota-changed', handler)
  return () => window.removeEventListener('coverage-rota-changed', handler)
}

export function getCoverageRotaVersion(): number {
  getState()
  return coverageStoreVersion
}

export function getTraders(): Trader[] {
  return getState().traders
}

export function getTraderById(traderId: string | null | undefined): Trader | null {
  if (!traderId) return null
  return getState().traders.find((t) => t.id === traderId) ?? null
}

function ensureTournamentRow(state: CoverageRotaState, tournamentId: string): TournamentCoverageRow {
  if (!state.tournaments[tournamentId]) {
    state.tournaments[tournamentId] = emptyTournamentRow()
  }
  return normalizeTournamentRow(state.tournaments[tournamentId])
}

function ensureTeamRow(row: TournamentCoverageRow, teamId: string): TeamCoverageRow {
  if (!row.teamRows[teamId]) {
    row.teamRows[teamId] = emptyTeamRow()
  }
  return row.teamRows[teamId]
}

export function getTournamentCoverage(tournamentId: string): TournamentCoverageRow {
  return normalizeTournamentRow(getState().tournaments[tournamentId] ?? emptyTournamentRow())
}

export function getTournamentTraderIds(tournamentId: string): string[] {
  return getTournamentCoverage(tournamentId).traderIds
}

export function addTournamentTrader(tournamentId: string, traderId: string): void {
  mutate((state) => {
    const row = ensureTournamentRow(state, tournamentId)
    if (!row.traderIds.includes(traderId)) {
      row.traderIds.push(traderId)
    }
    if (!row.leadTraderId) row.leadTraderId = traderId
    row.leadTraderId = row.traderIds[0] ?? null
  })
}

export function removeTournamentTrader(tournamentId: string, traderId: string): void {
  mutate((state) => {
    const row = ensureTournamentRow(state, tournamentId)
    row.traderIds = row.traderIds.filter((id) => id !== traderId)
    row.leadTraderId = row.traderIds[0] ?? null
  })
}

export function setTournamentLeadTrader(tournamentId: string, traderId: string | null): void {
  mutate((state) => {
    const row = ensureTournamentRow(state, tournamentId)
    if (!traderId) {
      row.traderIds = row.traderIds.slice(1)
      row.leadTraderId = row.traderIds[0] ?? null
      return
    }
    row.traderIds = [traderId, ...row.traderIds.filter((id) => id !== traderId)]
    row.leadTraderId = traderId
  })
}

export function setTeamCoverageTrader(tournamentId: string, teamId: string, traderId: string | null): void {
  mutate((state) => {
    const row = ensureTournamentRow(state, tournamentId)
    const teamRow = ensureTeamRow(row, teamId)
    teamRow.traderId = traderId
    if (traderId && !teamRow.statusOverride) {
      teamRow.statusOverride = 'assigned'
    }
    if (!traderId) {
      teamRow.statusOverride = null
    }
  })
}

export function setTeamCoverageStatus(
  tournamentId: string,
  teamId: string,
  status: CoverageStatus,
): void {
  mutate((state) => {
    const row = ensureTournamentRow(state, tournamentId)
    const teamRow = ensureTeamRow(row, teamId)
    teamRow.statusOverride = status === 'unassigned' ? null : status
    if (status === 'unassigned') {
      teamRow.traderId = null
    }
  })
}

export function setTournamentCoverageNotes(tournamentId: string, notes: string): void {
  mutate((state) => {
    const row = ensureTournamentRow(state, tournamentId)
    row.notes = notes
  })
}

export function isTeamSquadPrepped(teamId: string): boolean {
  return getStoredSquad(teamId) != null
}

export function resolveTeamCoverageStatus(
  tournamentId: string,
  teamId: string,
): CoverageStatus {
  const row = getTournamentCoverage(tournamentId)
  const teamRow = row.teamRows[teamId]
  const prepped = isTeamSquadPrepped(teamId)

  if (teamRow?.statusOverride === 'complete') return 'complete'
  if (prepped) return 'complete'
  if (teamRow?.statusOverride === 'in_progress') return 'in_progress'
  if (teamRow?.traderId) return teamRow.statusOverride === 'assigned' ? 'assigned' : 'assigned'
  if (row.leadTraderId && !teamRow) return 'assigned'
  if (teamRow?.statusOverride === 'assigned') return 'assigned'
  return 'unassigned'
}

export function getTournamentCoverageSummary(tournamentId: string): {
  totalTeams: number
  completeTeams: number
  assignedTeams: number
  unassignedTeams: number
  leadTraderId: string | null
  traderIds: string[]
} {
  const teams = TEAMS[tournamentId] ?? []
  const row = getTournamentCoverage(tournamentId)
  let completeTeams = 0
  let assignedTeams = 0
  let unassignedTeams = 0

  for (const team of teams) {
    const status = resolveTeamCoverageStatus(tournamentId, team.id)
    if (status === 'complete') completeTeams += 1
    else if (status === 'unassigned') unassignedTeams += 1
    else assignedTeams += 1
  }

  return {
    totalTeams: teams.length,
    completeTeams,
    assignedTeams,
    unassignedTeams,
    leadTraderId: row.leadTraderId,
    traderIds: row.traderIds,
  }
}

export type TournamentCoveragePhase = 'unassigned' | 'in_progress' | 'complete' | 'no_teams'

export function getTournamentCoveragePhase(tournamentId: string): TournamentCoveragePhase {
  const summary = getTournamentCoverageSummary(tournamentId)
  if (summary.totalTeams === 0) {
    return summary.traderIds.length > 0 ? 'in_progress' : 'no_teams'
  }
  if (summary.completeTeams === summary.totalTeams) return 'complete'
  if (summary.completeTeams > 0 || summary.assignedTeams > 0 || summary.traderIds.length > 0) return 'in_progress'
  return 'unassigned'
}

export function isTraderOnTournament(tournamentId: string, traderId: string): boolean {
  const row = getTournamentCoverage(tournamentId)
  if (row.traderIds.includes(traderId)) return true
  const teams = TEAMS[tournamentId] ?? []
  return teams.some((team) => row.teamRows[team.id]?.traderId === traderId)
}
