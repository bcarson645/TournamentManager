import { computeFixtureMatchModel } from './fixtureMatchModel'
import type { CricketFormat } from './tournaments'

export interface TeamLeagueMatchMarket {
  opponentId: string
  opponentName: string
  winProb: number
  fairPrice: number | undefined
}

export function computeTeamLeagueMatchMarkets(
  tournamentId: string,
  teamId: string,
  opponents: { id: string; name: string }[],
  format: CricketFormat,
): TeamLeagueMatchMarket[] {
  return opponents
    .map((opp) => {
      const model = computeFixtureMatchModel(
        tournamentId,
        teamId,
        opp.id,
        format,
        `tap-match-${teamId}-${opp.id}`,
      )
      return {
        opponentId: opp.id,
        opponentName: opp.name,
        winProb: model.homeWinProb,
        fairPrice: model.homeFairPrice,
      }
    })
    .sort((a, b) => a.opponentName.localeCompare(b.opponentName))
}
