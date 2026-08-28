import {
  recordCompetitorPriceSnapshot,
  type PriceHistorySnapshot,
} from './outrightPriceHistoryStore'
import type { OutrightSelection, OutrightType, TournamentOutright } from './outrightsStore'

export interface Bet365OddsEntry {
  fractional: string
  decimal: number
}

/** Bet365 outright prices logged from book — decimal = (numerator / denominator) + 1 */
export const BET365_OUTRIGHT_ODDS: Partial<
  Record<string, Partial<Record<OutrightType, Record<string, Bet365OddsEntry>>>>
> = {
  /** ETPL Mens — European T20 Premier League */
  't20-m-etpl': {
    'tournament-winner': {
      'etpl-rotterdam-dockers': { fractional: '10/3', decimal: 4.33 },
      'etpl-dublin-guardians': { fractional: '4/1', decimal: 5.0 },
      'etpl-belfast-wolves': { fractional: '4/1', decimal: 5.0 },
      'etpl-glasgow-cosmic': { fractional: '9/2', decimal: 5.5 },
      'etpl-amsterdam-flames': { fractional: '11/2', decimal: 6.5 },
      'etpl-edinburgh-castle-rockers': { fractional: '6/1', decimal: 7.0 },
    },
    finalist: {
      'etpl-rotterdam-dockers': { fractional: '6/5', decimal: 2.2 },
      'etpl-glasgow-cosmic': { fractional: '13/8', decimal: 2.63 },
      'etpl-dublin-guardians': { fractional: '15/8', decimal: 2.88 },
      'etpl-belfast-wolves': { fractional: '15/8', decimal: 2.88 },
      'etpl-amsterdam-flames': { fractional: '9/4', decimal: 3.25 },
      'etpl-edinburgh-castle-rockers': { fractional: '5/2', decimal: 3.5 },
    },
  },
  't20-m-bbl': {
    'tournament-winner': {
      'bbl-perth-scorchers': { fractional: '7/2', decimal: 4.5 },
      'bbl-hobart-hurricanes': { fractional: '4/1', decimal: 5.0 },
      'bbl-sydney-sixers': { fractional: '9/2', decimal: 5.5 },
      'bbl-melbourne-stars': { fractional: '13/2', decimal: 7.5 },
      'bbl-adelaide-strikers': { fractional: '15/2', decimal: 8.5 },
      'bbl-melbourne-renegades': { fractional: '8/1', decimal: 9.0 },
      'bbl-brisbane-heat': { fractional: '9/1', decimal: 10.0 },
      'bbl-sydney-thunder': { fractional: '12/1', decimal: 13.0 },
    },
  },
}

/** Prior Bet365 snapshots preserved in competitor price history when odds are updated. */
export interface Bet365HistorySeed {
  at: number
  note: string
  prices: Record<string, Bet365OddsEntry>
}

export const BET365_COMPETITOR_HISTORY: Partial<
  Record<string, Partial<Record<OutrightType, Bet365HistorySeed[]>>>
> = {
  't20-m-etpl': {
    'tournament-winner': [
      {
        at: Date.parse('2026-08-26T12:00:00.000Z'),
        note: 'Bet365 prices logged (26 Aug 2026)',
        prices: {
          'etpl-amsterdam-flames': { fractional: '7/2', decimal: 4.5 },
          'etpl-belfast-wolves': { fractional: '4/1', decimal: 5.0 },
          'etpl-glasgow-cosmic': { fractional: '15/4', decimal: 4.75 },
          'etpl-rotterdam-dockers': { fractional: '5/1', decimal: 6.0 },
          'etpl-dublin-guardians': { fractional: '4/1', decimal: 5.0 },
          'etpl-edinburgh-castle-rockers': { fractional: '6/1', decimal: 7.0 },
        },
      },
    ],
    finalist: [
      {
        at: Date.parse('2026-08-26T12:00:00.000Z'),
        note: 'Bet365 prices logged (26 Aug 2026)',
        prices: {
          'etpl-amsterdam-flames': { fractional: '6/5', decimal: 2.2 },
          'etpl-glasgow-cosmic': { fractional: '13/8', decimal: 2.63 },
          'etpl-dublin-guardians': { fractional: '15/8', decimal: 2.88 },
          'etpl-belfast-wolves': { fractional: '15/8', decimal: 2.88 },
          'etpl-rotterdam-dockers': { fractional: '2/1', decimal: 3.0 },
          'etpl-edinburgh-castle-rockers': { fractional: '5/2', decimal: 3.5 },
        },
      },
    ],
  },
}

export function fractionalToDecimal(numerator: number, denominator: number): number {
  if (denominator <= 0) return NaN
  return Math.round(((numerator / denominator) + 1) * 100) / 100
}

export function getBet365Odds(
  tournamentId: string,
  outrightType: OutrightType,
  entityId: string,
): number | undefined {
  const entry = BET365_OUTRIGHT_ODDS[tournamentId]?.[outrightType]?.[entityId]
  return entry?.decimal
}

export function applyBet365OddsToSelections(
  tournamentId: string,
  outrightType: OutrightType,
  selections: OutrightSelection[],
): OutrightSelection[] {
  return selections.map((selection) => {
    const bet365 = getBet365Odds(tournamentId, outrightType, selection.entityId)
    if (bet365 === undefined) return selection
    return { ...selection, bet365 }
  })
}


export function seedBet365CompetitorHistory(tournamentId: string, outright: TournamentOutright): void {
  if (typeof window === 'undefined') return
  const seeds = BET365_COMPETITOR_HISTORY[tournamentId]?.[outright.type]
  if (!seeds || seeds.length === 0) return

  const byEntity = new Map((outright.selections ?? []).map((s) => [s.entityId, s]))

  for (const seed of seeds) {
    const snapshots: PriceHistorySnapshot[] = []
    for (const [entityId, entry] of Object.entries(seed.prices)) {
      const selection = byEntity.get(entityId)
      if (!selection || entry.decimal <= 0) continue
      snapshots.push({
        selectionId: selection.selectionId,
        label: selection.label,
        price: entry.decimal,
      })
    }
    snapshots.sort((a, b) => a.selectionId.localeCompare(b.selectionId))
    recordCompetitorPriceSnapshot(tournamentId, outright.id, snapshots, seed.at, seed.note)
  }
}
