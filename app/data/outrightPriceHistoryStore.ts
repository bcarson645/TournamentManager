import type { OutrightSelection, TournamentOutright } from './outrightsStore'

const STORAGE_KEY = 'tm-outright-price-history'
const CHANGE_EVENT = 'outright-price-history-changed'

export type PriceHistorySource = 'sent' | 'competitor'

export type PriceHistoryEvent =
  | 'published'
  | 'reactivated'
  | 'competitor_update'

export interface PriceHistorySnapshot {
  selectionId: string
  label: string
  price: number
}

export interface PriceHistoryEntry {
  id: string
  at: number
  source: PriceHistorySource
  event: PriceHistoryEvent
  note: string
  snapshots: PriceHistorySnapshot[]
}

type Store = Record<string, PriceHistoryEntry[]>

let storeVersion = 0

function marketKey(tournamentId: string, outrightId: string): string {
  return `${tournamentId}:${outrightId}`
}

export function getOutrightPriceHistoryStoreVersion(): number {
  return storeVersion
}

export function subscribeOutrightPriceHistoryStore(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    storeVersion++
    onChange()
  }
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

function notify(): void {
  if (typeof window === 'undefined') return
  storeVersion++
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

function writeAll(store: Store): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  notify()
}

function newEntryId(): string {
  return `ph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function snapshotsFromSelections(
  selections: OutrightSelection[],
  pick: (s: OutrightSelection) => number | undefined,
): PriceHistorySnapshot[] {
  return selections
    .map((s) => {
      const price = pick(s)
      if (price === undefined || price <= 0) return null
      return { selectionId: s.selectionId, label: s.label, price }
    })
    .filter((row): row is PriceHistorySnapshot => row !== null)
}

function priceFingerprint(snapshots: PriceHistorySnapshot[]): string {
  return snapshots
    .slice()
    .sort((a, b) => a.selectionId.localeCompare(b.selectionId))
    .map((s) => `${s.selectionId}:${s.price.toFixed(2)}`)
    .join('|')
}

export function getOutrightPriceHistory(tournamentId: string, outrightId: string): PriceHistoryEntry[] {
  const key = marketKey(tournamentId, outrightId)
  return [...(readAll()[key] ?? [])].sort((a, b) => b.at - a.at)
}

function appendEntry(tournamentId: string, outrightId: string, entry: PriceHistoryEntry): void {
  const key = marketKey(tournamentId, outrightId)
  const store = readAll()
  const list = store[key] ?? []
  store[key] = [entry, ...list].slice(0, 200)
  writeAll(store)
}

export function recordSentOutrightPrices(
  tournamentId: string,
  outright: TournamentOutright,
  event: Extract<PriceHistoryEvent, 'published' | 'reactivated'>,
): void {
  const snapshots = snapshotsFromSelections(outright.selections ?? [], (s) => s.inputPrice ?? s.price)
  if (snapshots.length === 0) return

  const note = event === 'published' ? 'Published to market' : 'Reactivated with prices'
  appendEntry(tournamentId, outright.id, {
    id: newEntryId(),
    at: Date.now(),
    source: 'sent',
    event,
    note,
    snapshots,
  })
}

export function recordCompetitorPriceSnapshot(
  tournamentId: string,
  outrightId: string,
  snapshots: PriceHistorySnapshot[],
  at: number,
  note: string,
): void {
  if (snapshots.length === 0) return
  const history = getOutrightPriceHistory(tournamentId, outrightId)
  const fingerprint = priceFingerprint(snapshots)
  const exists = history.some(
    (h) => h.source === 'competitor' && priceFingerprint(h.snapshots) === fingerprint,
  )
  if (exists) return

  appendEntry(tournamentId, outrightId, {
    id: newEntryId(),
    at,
    source: 'competitor',
    event: 'competitor_update',
    note,
    snapshots,
  })
}

export function recordCompetitorPricesIfChanged(tournamentId: string, outright: TournamentOutright): void {
  const snapshots = snapshotsFromSelections(outright.selections ?? [], (s) => s.bet365)
  if (snapshots.length === 0) return

  const history = getOutrightPriceHistory(tournamentId, outright.id)
  const lastCompetitor = history.find((h) => h.source === 'competitor')
  const fingerprint = priceFingerprint(snapshots)
  if (lastCompetitor && priceFingerprint(lastCompetitor.snapshots) === fingerprint) return

  appendEntry(tournamentId, outright.id, {
    id: newEntryId(),
    at: Date.now(),
    source: 'competitor',
    event: 'competitor_update',
    note: 'Bet365 prices logged',
    snapshots,
  })
}
