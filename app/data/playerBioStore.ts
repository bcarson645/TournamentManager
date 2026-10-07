'use client'

/**
 * Editable player biography store.
 *
 * Keeps full-screen hub profiles (DOB, nationality, batting/bowling style,
 * playing role, bio text, photo) separate from rating-critical squad rows so
 * persisted squad drafts never need migrating. Keyed by normalised player
 * name; browser-localStorage backed with an in-memory fallback for SSR.
 */

export interface PlayerBio {
  /** Display name as stored on the squad row (key source). */
  name: string
  fullName: string
  /** ISO date YYYY-MM-DD. */
  dob: string
  nationality: string
  battingStyle: string
  bowlingStyle: string
  playingRole: string
  bio: string
  photo?: string
  updatedAt: string
}

export const BATTING_STYLE_OPTIONS = [
  'Unknown',
  'Right hand Bat',
  'Left hand Bat',
] as const

export const BOWLING_STYLE_OPTIONS = [
  'Unknown',
  'Right arm Fast',
  'Right arm Medium',
  'Right arm Spin',
  'Right arm Offbreak',
  'Right arm Legbreak',
  'Left arm Fast',
  'Left arm Medium',
  'Left arm Spin',
  'Left arm Orthodox',
  'Slow Left arm Orthodox',
] as const

export const PLAYING_ROLE_OPTIONS = [
  'Unknown',
  'Top order Batter',
  'Middle order Batter',
  'Opener',
  'Wicketkeeper Batter',
  'Allrounder',
  'Bowling Allrounder',
  'Batting Allrounder',
  'Seam Bowler',
  'Spin Bowler',
  'Bowler',
] as const

export function bioKeyForName(name: string): string {
  return name.trim().toLowerCase()
}

/** Blank bio scaffold for a player with no saved edits. */
export function makeEmptyBio(name: string, nationality = ''): PlayerBio {
  return {
    name: name.trim(),
    fullName: name.trim(),
    dob: '',
    nationality,
    battingStyle: 'Unknown',
    bowlingStyle: 'Unknown',
    playingRole: 'Unknown',
    bio: '',
    updatedAt: new Date().toISOString(),
  }
}

const STORAGE_KEY = 'tm-player-bios-v1'

const memoryBios: Record<string, PlayerBio> = {}
let hydrated = false
let bioStoreVersion = 0
const listeners = new Set<() => void>()

function notifyBioChanged(): void {
  bioStoreVersion += 1
  listeners.forEach((l) => l())
}

function hydrateOnce(): void {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { bios?: Record<string, PlayerBio> }
    if (!parsed?.bios || typeof parsed.bios !== 'object') return
    for (const [k, v] of Object.entries(parsed.bios)) {
      if (v && typeof v === 'object') memoryBios[k] = v as PlayerBio
    }
  } catch {
    /* corrupted JSON — start fresh */
  }
}

function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, bios: memoryBios }))
  } catch {
    /* quota / private mode — bios stay in memory only */
  }
}

export function subscribePlayerBioStore(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getPlayerBioStoreVersion(): number {
  return bioStoreVersion
}

/** Saved bio for this player, or null when never edited. */
export function getPlayerBio(name: string): PlayerBio | null {
  hydrateOnce()
  return memoryBios[bioKeyForName(name)] ?? null
}

/** Effective bio: saved edits over scaffold defaults (fills nationality). */
export function getEffectiveBio(name: string, fallbackNationality = ''): PlayerBio {
  const saved = getPlayerBio(name)
  if (!saved) return makeEmptyBio(name, fallbackNationality)
  return {
    ...saved,
    name: saved.name || name.trim(),
    fullName: saved.fullName || name.trim(),
    nationality: saved.nationality || fallbackNationality,
  }
}

export function savePlayerBio(name: string, patch: Partial<Omit<PlayerBio, 'name'>>): PlayerBio {
  hydrateOnce()
  const key = bioKeyForName(name)
  const prev = memoryBios[key] ?? makeEmptyBio(name)
  const next: PlayerBio = {
    ...prev,
    ...patch,
    name: prev.name || name.trim(),
    updatedAt: new Date().toISOString(),
  }
  memoryBios[key] = next
  persist()
  notifyBioChanged()
  return next
}

export function clearPlayerBio(name: string): void {
  hydrateOnce()
  const key = bioKeyForName(name)
  if (memoryBios[key] === undefined) return
  delete memoryBios[key]
  persist()
  notifyBioChanged()
}

/** Whole years since dob (ISO string); null when missing/invalid/future. */
export function ageFromDob(dob: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const born = new Date(`${dob}T00:00:00Z`)
  if (Number.isNaN(born.getTime()) || born.getTime() > now.getTime()) return null
  let age = now.getUTCFullYear() - born.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - born.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) age -= 1
  return age >= 0 ? age : null
}

/** ESPN-style "37y 335d" display alongside whole years. */
export function ageLongFromDob(dob: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const born = new Date(`${dob}T00:00:00Z`)
  if (Number.isNaN(born.getTime()) || born.getTime() > now.getTime()) return null
  const years = ageFromDob(dob, now)
  if (years == null) return null
  const anniversary = new Date(born)
  anniversary.setUTCFullYear(born.getUTCFullYear() + years)
  const days = Math.max(0, Math.floor((now.getTime() - anniversary.getTime()) / 86400000))
  return `${years}y ${days}d`
}

export function formatDobDisplay(dob: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return '—'
  const [y, m, d] = dob.split('-').map(Number)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const monthName = months[(m ?? 1) - 1] ?? ''
  return `${monthName} ${String(d).padStart(2, '0')}, ${y}`
}
