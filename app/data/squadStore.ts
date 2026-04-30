import {
  SquadPlayer,
  makeSquadForTeam,
  normalizeBowlStats,
  normalizeSquadPlayer,
  MAX_TEAM_OVERS,
  calcWktsAndBowlAvg,
} from './squad'
import { BLAST_MEN_SQUADS, BLAST_SQUAD_TEMPLATE_VERSION } from './blastMenSquads'
import { calculateBowlRating, roundRatingToStoredDecimals } from './ratingBenchmarks'
import { TEAMS } from './teams'

const BLAST_TEAM_IDS = new Set(Object.keys(BLAST_MEN_SQUADS))

interface StoredSquad {
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  impactSubs: SquadPlayer[]
  groundId: string | null
}

const store: Record<string, StoredSquad> = {}

/** Bumps when squads hydrate or mutate — use with `useSyncExternalStore` so UI refreshes. */
let squadStoreVersion = 0
const squadStoreListeners = new Set<() => void>()

function notifySquadStoreChanged(): void {
  squadStoreVersion += 1
  squadStoreListeners.forEach((l) => l())
}

/**
 * `localStorage` key for drafted squads (same origin only). Clearing site data wipes this too.
 */
export const SQUAD_DRAFTS_STORAGE_KEY = 'tm-squad-snapshots-v1'

/** Browser-only: full squad drafts (starting XI, reserves, impact subs, venue) keyed by team id. */
const PERSISTENCE_KEY = SQUAD_DRAFTS_STORAGE_KEY
const PERSISTENCE_VERSION = 1
const PERSIST_DEBOUNCE_MS = 175

function isLikelyStoredSquad(v: unknown): v is StoredSquad {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const lists = ['startingXI', 'reserves', 'impactSubs'] as const
  for (const k of lists) {
    const a = o[k]
    if (k !== 'impactSubs' && !Array.isArray(a)) return false
    if (k === 'impactSubs' && a !== undefined && !Array.isArray(a)) return false
  }
  return o.groundId === null || typeof o.groundId === 'string'
}

let persistPending: ReturnType<typeof setTimeout> | null = null

/** Write all squads to `localStorage` (call after edits; normally debounced + flush on unload). */
function flushPersistSquadsToStorage(): void {
  if (typeof window === 'undefined') return
  if (persistPending !== null) {
    clearTimeout(persistPending)
    persistPending = null
  }
  try {
    const payload = {
      v: PERSISTENCE_VERSION,
      blastTemplateVersion: BLAST_SQUAD_TEMPLATE_VERSION,
      squads: store,
    }
    window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(payload))
  } catch {
    // Quota, private mode, SSR bridge — drafts stay in RAM only until next successful write.
  }
}

function schedulePersistSquads(): void {
  if (typeof window === 'undefined') return
  if (persistPending !== null) clearTimeout(persistPending)
  persistPending = setTimeout(() => {
    persistPending = null
    flushPersistSquadsToStorage()
  }, PERSIST_DEBOUNCE_MS)
}

/** Load persisted squads as soon as this module runs in the browser. */
function hydrateSquadsOnce(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(PERSISTENCE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as {
      v?: number
      blastTemplateVersion?: number
      squads?: unknown
    }
    if (parsed?.v !== PERSISTENCE_VERSION || !parsed.squads || typeof parsed.squads !== 'object') return false
    const savedBlastVer = parsed.blastTemplateVersion ?? 0
    const blastPersistStale = savedBlastVer !== BLAST_SQUAD_TEMPLATE_VERSION
    let touched = false
    for (const [teamId, squad] of Object.entries(parsed.squads as Record<string, unknown>)) {
      if (blastPersistStale && BLAST_TEAM_IDS.has(teamId)) {
        continue
      }
      if (isLikelyStoredSquad(squad)) {
        store[teamId] = squad
        touched = true
      }
    }
    return touched
  } catch {
    return false
  }
}

if (typeof window !== 'undefined') {
  const hadPersistedData = hydrateSquadsOnce()
  if (hadPersistedData) notifySquadStoreChanged()
  window.addEventListener('pagehide', flushPersistSquadsToStorage)
}

/** Subscribe to squad mutations (after `storeSquad`). */
export function subscribeSquadStore(onChange: () => void): () => void {
  squadStoreListeners.add(onChange)
  return () => squadStoreListeners.delete(onChange)
}

export function getSquadStoreVersion(): number {
  return squadStoreVersion
}

export function getStoredSquad(teamId: string): StoredSquad | null {
  const stored = store[teamId]
  if (!stored) return null
  const startingXI = capStartingXIOvers(
    stored.startingXI.map((p) => normalizeBowlStats(normalizeSquadPlayer(p))),
  )
  const reserves = stored.reserves.map((p) => normalizeBowlStats(normalizeSquadPlayer(p)))
  const impactSubs = (stored.impactSubs ?? []).map((p) => normalizeBowlStats(normalizeSquadPlayer(p)))
  return { ...stored, startingXI, reserves, impactSubs }
}

export function storeSquad(
  teamId: string,
  startingXI: SquadPlayer[],
  reserves: SquadPlayer[],
  groundId: string | null,
  impactSubs: SquadPlayer[] = [],
): void {
  store[teamId] = { startingXI: capStartingXIOvers(startingXI), reserves, impactSubs, groundId }
  notifySquadStoreChanged()
  schedulePersistSquads()
}

/** Clears persisted squad drafts from this browser plus the in-memory cache. */
export function clearAllPersistedSquads(): void {
  if (persistPending !== null && typeof window !== 'undefined') {
    clearTimeout(persistPending)
    persistPending = null
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PERSISTENCE_KEY)
    } catch {
      /* ignore */
    }
  }
  for (const id of Object.keys(store)) delete store[id]
  notifySquadStoreChanged()
}

function capStartingXIOvers(players: SquadPlayer[]): SquadPlayer[] {
  const totalOvers = players.reduce((s, p) => s + p.overs, 0)
  if (totalOvers <= MAX_TEAM_OVERS || totalOvers <= 0) return players
  const scale = MAX_TEAM_OVERS / totalOvers
  return players.map((p) => {
    const overs = Math.round(p.overs * scale * 10) / 10
    const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, p.econ, p.bowlWpo)
    const bowlRating = calculateBowlRating(p.econ, p.bowlWpo, bowlAvg, overs)
    return { ...p, overs, wkts, bowlAvg, bowlRating }
  })
}

export function getSquadForTeam(teamId: string): {
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  impactSubs: SquadPlayer[]
} {
  const stored = store[teamId]
  if (stored) {
    const startingXI = capStartingXIOvers(
      stored.startingXI.map((p) => normalizeBowlStats(normalizeSquadPlayer(p))),
    )
    return {
      startingXI,
      reserves: stored.reserves.map((p) => normalizeBowlStats(normalizeSquadPlayer(p))),
      impactSubs: (stored.impactSubs ?? []).map((p) => normalizeBowlStats(normalizeSquadPlayer(p))),
    }
  }
  const made = makeSquadForTeam(teamId)
  return { ...made, impactSubs: [] as SquadPlayer[] }
}

/** Teams with a saved squad in this session count as “prepped”. */
export function getTournamentPrepProgress(tournamentId: string): { prepped: number; total: number } {
  const teams = TEAMS[tournamentId] ?? []
  const total = teams.length
  let prepped = 0
  for (const t of teams) {
    if (getStoredSquad(t.id) !== null) prepped++
  }
  return { prepped, total }
}

export function getTeamBatRatingTotal(teamId: string): number {
  const { startingXI } = getSquadForTeam(teamId)
  return roundRatingToStoredDecimals(startingXI.reduce((sum, p) => sum + p.batRating, 0))
}

export function getTeamBowlRatingTotal(teamId: string): number {
  const { startingXI } = getSquadForTeam(teamId)
  const sum = startingXI.reduce(
    (s, p) => s + (Number.isNaN(p.bowlRating) ? 0 : p.bowlRating),
    0,
  )
  return roundRatingToStoredDecimals(sum)
}

export interface RankedBatter {
  id: string
  name: string
  teamId: string
  teamName: string
  batRating: number
}

export function getRankedBatters(teams: { id: string; name: string }[]): RankedBatter[] {
  const all: RankedBatter[] = []
  for (const team of teams) {
    const { startingXI } = getSquadForTeam(team.id)
    for (const p of startingXI) {
      all.push({ id: p.id, name: p.name, teamId: team.id, teamName: team.name, batRating: p.batRating })
    }
  }
  return all.sort((a, b) => b.batRating - a.batRating)
}

export function getTopRatedBatters(teams: { id: string; name: string }[], limit = 10): RankedBatter[] {
  return getRankedBatters(teams).slice(0, limit)
}

export interface RankedBowler {
  id: string
  name: string
  teamId: string
  teamName: string
  bowlingRating: number
}

export function getRankedBowlers(teams: { id: string; name: string }[]): RankedBowler[] {
  const all: RankedBowler[] = []
  for (const team of teams) {
    const { startingXI } = getSquadForTeam(team.id)
    for (const p of startingXI) {
      if (!Number.isNaN(p.bowlRating)) {
        all.push({ id: p.id, name: p.name, teamId: team.id, teamName: team.name, bowlingRating: p.bowlRating })
      }
    }
  }
  return all.sort((a, b) => b.bowlingRating - a.bowlingRating)
}

export function getTopRatedBowlers(teams: { id: string; name: string }[], limit = 10): RankedBowler[] {
  return getRankedBowlers(teams).slice(0, limit)
}
