const STORAGE_KEY = 'tm-match-prep-settings'
const CHANGE_EVENT = 'match-prep-settings-changed'

/** Excel Prep Work inputs: conditions & opponent bowling (see $M$21 / $M$42). */
export interface TournamentMatchPrepSettings {
  /** Home-side batting conditions (e.g. 1.01). */
  homeConditionsFactor: number
  /** Opponent bowling when home team bats (e.g. 1.00). */
  awayBowlingFactor: number
  /** Away-side batting conditions (defaults to home). */
  awayConditionsFactor: number
  /** Opponent bowling when away team bats at home venue (e.g. 1.00). */
  homeBowlingFactor: number
}

export const DEFAULT_MATCH_PREP_SETTINGS: TournamentMatchPrepSettings = {
  homeConditionsFactor: 1.01,
  awayBowlingFactor: 1,
  awayConditionsFactor: 1.01,
  homeBowlingFactor: 1,
}

type Store = Record<string, TournamentMatchPrepSettings>

function notify(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
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
  notify()
}

function clampFactor(n: number, fallback: number): number {
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.round(n * 1000) / 1000
}

export function normalizeMatchPrepSettings(
  raw: Partial<TournamentMatchPrepSettings> | undefined,
): TournamentMatchPrepSettings {
  const d = DEFAULT_MATCH_PREP_SETTINGS
  return {
    homeConditionsFactor: clampFactor(raw?.homeConditionsFactor ?? d.homeConditionsFactor, d.homeConditionsFactor),
    awayBowlingFactor: clampFactor(raw?.awayBowlingFactor ?? d.awayBowlingFactor, d.awayBowlingFactor),
    awayConditionsFactor: clampFactor(raw?.awayConditionsFactor ?? d.awayConditionsFactor, d.awayConditionsFactor),
    homeBowlingFactor: clampFactor(raw?.homeBowlingFactor ?? d.homeBowlingFactor, d.homeBowlingFactor),
  }
}

export function getMatchPrepSettings(tournamentId: string): TournamentMatchPrepSettings {
  const all = readAll()
  return normalizeMatchPrepSettings(all[tournamentId])
}

export function setMatchPrepSettings(
  tournamentId: string,
  patch: Partial<TournamentMatchPrepSettings>,
): TournamentMatchPrepSettings {
  const all = readAll()
  const next = normalizeMatchPrepSettings({ ...getMatchPrepSettings(tournamentId), ...patch })
  all[tournamentId] = next
  writeAll(all)
  return next
}

export function subscribeMatchPrepSettings(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}
