import { getTeamsByTournament } from './teams'
import { getRankedBatters, getRankedBowlers } from './squadStore'
import {
  effectiveInputPrice,
  type OutrightType,
  type TournamentOutright,
} from './outrightsStore'
import type { PerformancePlayer } from './tournamentPerformanceData'

export interface PlayerMarketInfo {
  ranking?: number
  currentPrice?: number
}

function normalizePlayerKey(value: string): string {
  return value.trim().toLowerCase()
}

function currentSelectionPrice(
  selection: TournamentOutright['selections'][number],
): number | undefined {
  return (
    effectiveInputPrice(selection) ??
    selection.bet365 ??
    selection.decimal
  )
}

function buildMarketLookup(outright: TournamentOutright | undefined): Map<string, PlayerMarketInfo> {
  const map = new Map<string, PlayerMarketInfo>()
  if (!outright) return map

  outright.selections.forEach((selection, index) => {
    const ranking = parseInt(selection.selectionId, 10) || index + 1
    const info: PlayerMarketInfo = {
      ranking,
      currentPrice: currentSelectionPrice(selection),
    }
    map.set(selection.entityId, info)
    map.set(normalizePlayerKey(selection.label), info)
  })

  return map
}

function buildRatingRankLookup(
  tournamentId: string,
  marketType: OutrightType,
): Map<string, number> {
  const teams = getTeamsByTournament(tournamentId)
  const ranked =
    marketType === 'top-batter' ? getRankedBatters(teams) : getRankedBowlers(teams)

  const map = new Map<string, number>()
  ranked.forEach((player, index) => {
    const rank = index + 1
    map.set(player.id, rank)
    map.set(normalizePlayerKey(player.name), rank)
  })
  return map
}

export function getPerformancePlayerMarketInfo(
  tournamentId: string,
  player: PerformancePlayer,
  marketType: 'top-batter' | 'top-bowler',
  outright: TournamentOutright | undefined,
): PlayerMarketInfo {
  const marketLookup = buildMarketLookup(outright)
  const fromMarket =
    marketLookup.get(player.id) ??
    marketLookup.get(normalizePlayerKey(player.name))

  if (fromMarket) return fromMarket

  const ratingRanks = buildRatingRankLookup(tournamentId, marketType)
  const ranking =
    ratingRanks.get(player.id) ?? ratingRanks.get(normalizePlayerKey(player.name))

  return { ranking, currentPrice: undefined }
}
