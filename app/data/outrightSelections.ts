import { getTeamsByTournament } from './teams'
import { getTopRatedBatters, getTopRatedBowlers } from './squadStore'
import { applyBet365OddsToSelections } from './outrightBet365Odds'
import { formatTwoDigit, type OutrightSelection, type OutrightType } from './outrightsStore'

export function buildOutrightSelections(
  tournamentId: string,
  outrightId: string,
  type: OutrightType,
): OutrightSelection[] {
  const teams = getTeamsByTournament(tournamentId)

  if (type === 'tournament-winner' || type === 'finalist') {
    const selections = teams.map((team, index) => ({
      id: `${outrightId}-team-${team.id}`,
      selectionId: formatTwoDigit(index + 1),
      label: team.name,
      kind: 'team' as const,
      entityId: team.id,
    }))
    return applyBet365OddsToSelections(tournamentId, type, selections)
  }

  if (type === 'top-batter') {
    return getTopRatedBatters(teams, 20).map((p, index) => ({
      id: `${outrightId}-player-${p.id}`,
      selectionId: formatTwoDigit(index + 1),
      label: p.name,
      sublabel: p.teamName,
      kind: 'player' as const,
      entityId: p.id,
    }))
  }

  return getTopRatedBowlers(teams, 20).map((p, index) => ({
    id: `${outrightId}-player-${p.id}`,
    selectionId: formatTwoDigit(index + 1),
    label: p.name,
    sublabel: p.teamName,
    kind: 'player' as const,
    entityId: p.id,
  }))
}
