import { applyBet365OddsToSelections, seedBet365CompetitorHistory } from './outrightBet365Odds'
import { buildOutrightSelections } from './outrightSelections'
import {
  recordCompetitorPricesIfChanged,
  recordSentOutrightPrices,
} from './outrightPriceHistoryStore'

const STORAGE_KEY = 'tm-tournament-outrights'
const CHANGE_EVENT = 'tournament-outrights-changed'

export type OutrightType =
  | 'tournament-winner'
  | 'finalist'
  | 'top-batter'
  | 'top-bowler'

export type OutrightStatus = 'inactive' | 'published' | 'suspended' | 'settled'

export interface OutrightSelection {
  id: string
  /** Two-digit display ID (01, 02, ...) */
  selectionId: string
  label: string
  sublabel?: string
  kind: 'team' | 'player'
  entityId: string
  /** Submitted price entered by the user */
  inputPrice?: number
  /** Legacy fields migrated to inputPrice on read */
  price?: number
  preppedPrice?: number
  modelledPrice?: number
  bet365?: number
  decimal?: number
}

export interface TournamentOutright {
  id: string
  /** Two-digit display ID (01, 02, ...) */
  marketId: string
  type: OutrightType
  createdAt: number
  status: OutrightStatus
  selections: OutrightSelection[]
  pricesConfirmed: boolean
  settledAt?: number
  winningSelectionIds?: string[]
}

export const OUTRIGHT_TYPES: OutrightType[] = [
  'tournament-winner',
  'finalist',
  'top-batter',
  'top-bowler',
]


export function formatTwoDigit(n: number): string {
  const v = Math.max(1, Math.min(99, Math.floor(n)))
  return String(v).padStart(2, '0')
}

function nextMarketId(existing: TournamentOutright[]): string {
  const used = existing
    .map((o) => parseInt(o.marketId ?? '0', 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  const next = used.length > 0 ? Math.max(...used) + 1 : 1
  return formatTwoDigit(next)
}

function assignDisplayIds(outrights: TournamentOutright[]): { outrights: TournamentOutright[]; changed: boolean } {
  let changed = false
  const byCreated = [...outrights].sort((a, b) => a.createdAt - b.createdAt)
  const next = outrights.map((o) => {
    const order = byCreated.findIndex((x) => x.id === o.id) + 1
    const marketId = o.marketId ?? formatTwoDigit(order)
    if (!o.marketId) changed = true
    const selections = (o.selections ?? []).map((s, i) => {
      const selectionId = s.selectionId ?? formatTwoDigit(i + 1)
      if (!s.selectionId) changed = true
      return { ...s, selectionId }
    })
    return { ...o, marketId, selections }
  })
  return { outrights: next, changed }
}

export const OUTRIGHT_TYPE_LABELS: Record<OutrightType, string> = {
  'tournament-winner': 'Tournament Winner',
  finalist: 'Finalist',
  'top-batter': 'Tournament Top Batter',
  'top-bowler': 'Tournament Top Bowler',
}

function readAll(): Record<string, TournamentOutright[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, TournamentOutright[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, TournamentOutright[]>, notify = true): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  if (notify) {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: {} }))
  }
}

function normalizePrice(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.round(n * 100) / 100
}

function isOutrightType(v: unknown): v is OutrightType {
  return typeof v === 'string' && OUTRIGHT_TYPES.includes(v as OutrightType)
}

function normalizeSelection(raw: OutrightSelection & { inputPrice?: number }): OutrightSelection {
  const inputPrice =
    normalizePrice(raw.inputPrice) ??
    normalizePrice(raw.preppedPrice) ??
    normalizePrice(raw.price)
  return {
    id: raw.id,
    selectionId: raw.selectionId ?? '01',
    label: raw.label,
    sublabel: raw.sublabel,
    kind: raw.kind,
    entityId: raw.entityId,
    inputPrice,
    bet365: normalizePrice(raw.bet365),
    decimal: normalizePrice(raw.decimal),
  }
}

function normalizeOutright(tournamentId: string, raw: Partial<TournamentOutright>): TournamentOutright | null {
  if (!raw.id || !isOutrightType(raw.type) || typeof raw.createdAt !== 'number') return null

  const status: OutrightStatus =
    raw.status === 'settled'
      ? 'settled'
      : raw.status === 'published'
        ? 'published'
        : raw.status === 'suspended'
          ? 'suspended'
          : 'inactive'
  const baseSelections =
    Array.isArray(raw.selections) && raw.selections.length > 0
      ? raw.selections
      : buildOutrightSelections(tournamentId, raw.id, raw.type)

  const selections = applyBet365OddsToSelections(
    tournamentId,
    raw.type,
    baseSelections.map((s) => normalizeSelection(s)),
  )
  const outright: TournamentOutright = {
    id: raw.id,
    marketId: raw.marketId ?? '01',
    type: raw.type,
    createdAt: raw.createdAt,
    status,
    selections,
    pricesConfirmed: raw.pricesConfirmed === true,
    settledAt: typeof raw.settledAt === 'number' ? raw.settledAt : undefined,
    winningSelectionIds: Array.isArray(raw.winningSelectionIds)
      ? raw.winningSelectionIds.filter((id) => typeof id === 'string')
      : undefined,
  }
  if (typeof window !== 'undefined') {
    seedBet365CompetitorHistory(tournamentId, outright)
    recordCompetitorPricesIfChanged(tournamentId, outright)
  }
  return outright
}

function needsMigration(raw: Partial<TournamentOutright>): boolean {
  return (
    !Array.isArray(raw.selections) ||
    raw.selections.length === 0 ||
    raw.status === undefined ||
    raw.pricesConfirmed === undefined ||
    raw.marketId === undefined ||
    (Array.isArray(raw.selections) && raw.selections.some((s) => !s.selectionId))
  )
}

export function effectiveInputPrice(selection: OutrightSelection): number | undefined {
  return normalizePrice(selection.inputPrice) ?? normalizePrice(selection.price)
}

/** @deprecated use effectiveInputPrice */
export function effectivePreppedPrice(selection: OutrightSelection): number | undefined {
  return effectiveInputPrice(selection)
}

export function allSelectionsHavePrices(outright: TournamentOutright): boolean {
  const selections = outright.selections ?? []
  return selections.length > 0 && selections.every((s) => effectiveInputPrice(s) !== undefined)
}

export function canConfirmOutrightPrices(outright: TournamentOutright): boolean {
  return outright.status === 'inactive' && allSelectionsHavePrices(outright)
}

export function canPublishOutright(outright: TournamentOutright): boolean {
  return outright.status === 'inactive' && outright.pricesConfirmed && allSelectionsHavePrices(outright)
}

export function getOutrightsForTournament(tournamentId: string): TournamentOutright[] {
  const all = readAll()
  const rawList = all[tournamentId] ?? []
  let migrated = false

  let normalized = rawList
    .map((raw) => {
      const outright = normalizeOutright(tournamentId, raw)
      if (!outright) return null
      if (needsMigration(raw)) migrated = true
      return outright
    })
    .filter((o): o is TournamentOutright => o !== null)

  const assigned = assignDisplayIds(normalized)
  if (assigned.changed) {
    normalized = assigned.outrights
    migrated = true
  }

  if (migrated) {
    all[tournamentId] = normalized
    writeAll(all, false)
  }

  return normalized
}

export function createOutright(tournamentId: string, type: OutrightType): TournamentOutright | null {
  if (typeof window === 'undefined') return null
  const all = readAll()
  const existing = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  if (existing.some((o) => o.type === type)) return null

  const id = `${tournamentId}-${type}-${Date.now()}`
  const outright: TournamentOutright = {
    id,
    marketId: nextMarketId(existing),
    type,
    createdAt: Date.now(),
    status: 'inactive',
    selections: buildOutrightSelections(tournamentId, id, type),
    pricesConfirmed: false,
  }

  all[tournamentId] = [...existing, outright]
  writeAll(all)
  return outright
}

type EditableSelectionField = 'inputPrice'

export function updateOutrightSelectionField(
  tournamentId: string,
  outrightId: string,
  selectionId: string,
  field: EditableSelectionField,
  value: number | undefined,
): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  all[tournamentId] = list.map((o) => {
    if (o.id !== outrightId || o.status === 'published' || o.status === 'settled') return o
    return {
      ...o,
      pricesConfirmed: false,
      selections: (o.selections ?? []).map((s) => {
        if (s.id !== selectionId) return s
        const next = normalizePrice(value)
        return { ...s, inputPrice: next, price: next }
      }),
    }
  })
  writeAll(all)
}

/** @deprecated use updateOutrightSelectionField with inputPrice */
export function updateOutrightSelectionPrice(
  tournamentId: string,
  outrightId: string,
  selectionId: string,
  price: number | undefined,
): void {
  updateOutrightSelectionField(tournamentId, outrightId, selectionId, 'inputPrice', price)
}

export function confirmOutrightPrices(tournamentId: string, outrightId: string): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  all[tournamentId] = list.map((o) => {
    if (o.id !== outrightId || !canConfirmOutrightPrices(o)) return o
    return { ...o, pricesConfirmed: true }
  })
  writeAll(all)
}

export function publishOutright(tournamentId: string, outrightId: string): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  let published: TournamentOutright | null = null
  all[tournamentId] = list.map((o) => {
    if (o.id !== outrightId || !canPublishOutright(o)) return o
    published = { ...o, status: 'published' as OutrightStatus }
    return published
  })
  writeAll(all)
  if (published) recordSentOutrightPrices(tournamentId, published, 'published')
}

export function removeOutright(tournamentId: string, outrightId: string): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  all[tournamentId] = (all[tournamentId] ?? []).filter((o) => o.id !== outrightId)
  writeAll(all)
}



export function suspendOutright(tournamentId: string, outrightId: string): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  all[tournamentId] = list.map((o) => {
    if (o.id !== outrightId || o.status !== 'published') return o
    return { ...o, status: 'suspended' as OutrightStatus }
  })
  writeAll(all)
}

export function reactivateOutright(tournamentId: string, outrightId: string): void {
  if (typeof window === 'undefined') return
  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  let reactivated: TournamentOutright | null = null
  all[tournamentId] = list.map((o) => {
    if (o.id !== outrightId || o.status !== 'suspended') return o
    reactivated = { ...o, status: 'published' as OutrightStatus }
    return reactivated
  })
  writeAll(all)
  if (reactivated) recordSentOutrightPrices(tournamentId, reactivated, 'reactivated')
}

export function settlementWinnerLimit(type: OutrightType): number {
  return type === 'finalist' ? 2 : 1
}

export function settleOutright(
  tournamentId: string,
  outrightId: string,
  winningSelectionIds: string[],
): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') return { ok: false, error: 'Not available on server.' }

  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  const outright = list.find((o) => o.id === outrightId)
  if (!outright) return { ok: false, error: 'Market not found.' }
  if (outright.status === 'settled') return { ok: false, error: 'Market is already settled.' }

  const limit = settlementWinnerLimit(outright.type)
  const unique = [...new Set(winningSelectionIds)]
  if (unique.length !== winningSelectionIds.length) {
    return { ok: false, error: 'Duplicate winning selections.' }
  }
  if (unique.length !== limit) {
    return {
      ok: false,
      error: `Select exactly ${limit} winning selection${limit === 1 ? '' : 's'}.`,
    }
  }

  const validIds = new Set((outright.selections ?? []).map((s) => s.id))
  if (!unique.every((id) => validIds.has(id))) {
    return { ok: false, error: 'Invalid winning selection.' }
  }

  all[tournamentId] = list.map((o) => {
    if (o.id !== outrightId) return o
    return {
      ...o,
      status: 'settled' as OutrightStatus,
      settledAt: Date.now(),
      winningSelectionIds: unique,
    }
  })
  writeAll(all)
  return { ok: true }
}

export function outrightStatusLabel(status: OutrightStatus | undefined): string {
  if (status === 'published') return 'Active'
  if (status === 'suspended') return 'Suspended'
  if (status === 'settled') return 'Settled'
  return 'Inactive'
}

export function isWinningOutrightSelection(outright: TournamentOutright, selectionId: string): boolean {
  return (outright.winningSelectionIds ?? []).includes(selectionId)
}

export const OUTRIGHTS_CHANGE_EVENT = CHANGE_EVENT

export function setOutrightInputPricesByEntityId(
  tournamentId: string,
  outrightType: OutrightType,
  pricesByEntityId: Record<string, number>,
): { updated: number; error?: string } {
  if (typeof window === 'undefined') return { updated: 0, error: 'Not available on server.' }

  const outright = getOutrightsForTournament(tournamentId).find((o) => o.type === outrightType)
  if (!outright) {
    return { updated: 0, error: `No ${OUTRIGHT_TYPE_LABELS[outrightType]} market found. Create it in Outrights first.` }
  }
  if (outright.status === 'published' || outright.status === 'settled') {
    return { updated: 0, error: 'Market is published — input prices cannot be changed.' }
  }

  const all = readAll()
  const list = (all[tournamentId] ?? [])
    .map((raw) => normalizeOutright(tournamentId, raw))
    .filter((o): o is TournamentOutright => o !== null)

  let updated = 0
  all[tournamentId] = list.map((o) => {
    if (o.id !== outright.id) return o
    return {
      ...o,
      pricesConfirmed: false,
      selections: (o.selections ?? []).map((s) => {
        const raw = pricesByEntityId[s.entityId]
        if (raw === undefined) return s
        const next = normalizePrice(raw)
        if (next === undefined) return s
        updated++
        return { ...s, inputPrice: next, price: next }
      }),
    }
  })
  writeAll(all)
  return { updated }
}
