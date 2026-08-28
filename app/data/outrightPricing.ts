import { getTeamsByTournament } from './teams'
import { getTournamentOptions } from './tournamentOptions'
import {
  getStoredSquad,
  getTeamBatRatingTotal,
  getTeamBowlRatingTotal,
} from './squadStore'
import { teamNetStrengthParIndex } from './ratingDisplaySettings'
import { getSimulationFinalistModelledPrice, getSimulationModelledPrice } from './outrightSimulatorStore'
import { roundOdds } from './outrightOdds'
import type { OutrightSelection, OutrightType } from './outrightsStore'

function strengthToOdds(weight: number, totalWeight: number): number | undefined {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) {
    return undefined
  }
  const prob = weight / totalWeight
  if (prob <= 0) return undefined
  return roundOdds(1 / prob)
}

function teamStrength(teamId: string, parScore: number): number | undefined {
  if (getStoredSquad(teamId) === null) return undefined
  const bat = getTeamBatRatingTotal(teamId, parScore)
  const bowl = getTeamBowlRatingTotal(teamId, parScore)
  const net = teamNetStrengthParIndex(bat, bowl)
  return Number.isFinite(net) && net > 0 ? net : undefined
}

function playerStrength(teamId: string, playerId: string, type: 'top-batter' | 'top-bowler'): number | undefined {
  if (getStoredSquad(teamId) === null) return undefined
  const squad = getStoredSquad(teamId)!
  const player = squad.startingXI.find((p) => p.id === playerId)
  if (!player) return undefined
  const rating = type === 'top-batter' ? player.batRating : player.bowlRating
  return Number.isFinite(rating) && rating > 0 ? rating : undefined
}

function findTeamIdForPlayer(tournamentId: string, playerId: string): string | undefined {
  for (const team of getTeamsByTournament(tournamentId)) {
    const squad = getStoredSquad(team.id)
    if (squad?.startingXI.some((p) => p.id === playerId)) return team.id
  }
  return undefined
}

/** Prepped price from tournament-manager squad strength (teams must be prepped). */
export function computePreppedPrice(
  tournamentId: string,
  outrightType: OutrightType,
  selection: OutrightSelection,
  allSelections: OutrightSelection[],
): number | undefined {
  const parScore = getTournamentOptions(tournamentId).ratingParScore

  if (outrightType === 'tournament-winner' || outrightType === 'finalist') {
    const strengths = allSelections.map((s) => teamStrength(s.entityId, parScore))
    const total = strengths.reduce<number>((sum, s) => sum + (s ?? 0), 0)
    const weight = teamStrength(selection.entityId, parScore)
    return strengthToOdds(weight ?? 0, total)
  }

  if (outrightType === 'top-batter' || outrightType === 'top-bowler') {
    const weights = allSelections.map((s) => {
      const teamId = findTeamIdForPlayer(tournamentId, s.entityId)
      if (!teamId) return undefined
      return playerStrength(teamId, s.entityId, outrightType)
    })
    const total = weights.reduce<number>((sum, w) => sum + (w ?? 0), 0)
    const teamId = findTeamIdForPlayer(tournamentId, selection.entityId)
    if (!teamId) return undefined
    const weight = playerStrength(teamId, selection.entityId, outrightType)
    return strengthToOdds(weight ?? 0, total)
  }

  return undefined
}

/** Modelled price from simulation (book odds with configured margin and min/max price). */
export function computeModelledPrice(
  tournamentId: string,
  outrightType: OutrightType,
  selection: OutrightSelection,
  _allSelections: OutrightSelection[],
): number | undefined {
  if (selection.kind !== 'team') return undefined
  if (outrightType === 'tournament-winner') {
    return getSimulationModelledPrice(tournamentId, selection.entityId)
  }
  if (outrightType === 'finalist') {
    return getSimulationFinalistModelledPrice(tournamentId, selection.entityId)
  }
  return undefined
}

export function buildPreppedPriceMap(
  tournamentId: string,
  outrightType: OutrightType,
  selections: OutrightSelection[],
): Record<string, number | undefined> {
  const map: Record<string, number | undefined> = {}
  for (const s of selections) {
    map[s.id] = computePreppedPrice(tournamentId, outrightType, s, selections)
  }
  return map
}

export function buildModelledPriceMap(
  tournamentId: string,
  outrightType: OutrightType,
  selections: OutrightSelection[],
): Record<string, number | undefined> {
  const map: Record<string, number | undefined> = {}
  for (const s of selections) {
    map[s.id] = computeModelledPrice(tournamentId, outrightType, s, selections)
  }
  return map
}
