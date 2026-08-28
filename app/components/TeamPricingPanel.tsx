'use client'

import { useMemo, useSyncExternalStore } from 'react'
import type { Team } from '../data/teams'
import {
  getSimulatorStoreVersion,
  subscribeSimulatorStore,
} from '../data/outrightSimulatorStore'
import { computeTeamLeagueMatchMarkets } from '../data/teamMatchPricing'
import type { CricketFormat } from '../data/tournaments'
import { formatOutrightOddsValue } from './OutrightOddsCell'
import TeamPricingMarketBox from './TeamPricingMarketBox'

function formatWinProb(prob: number): string {
  return (prob * 100).toFixed(1) + '%'
}

interface TeamPricingPanelProps {
  tournamentId: string
  format: CricketFormat
  team: Team
  allTeams: Team[]
}

export default function TeamPricingPanel({
  tournamentId,
  format,
  team,
  allTeams,
}: TeamPricingPanelProps) {
  const simulatorVersion = useSyncExternalStore(
    subscribeSimulatorStore,
    getSimulatorStoreVersion,
    () => 0,
  )

  const matchRows = useMemo(() => {
    void simulatorVersion
    const opponents = allTeams.filter((t) => t.id !== team.id)
    return computeTeamLeagueMatchMarkets(tournamentId, team.id, opponents, format)
  }, [allTeams, format, team.id, tournamentId, simulatorVersion])

  const avgWinProb =
    matchRows.length > 0
      ? matchRows.reduce((sum, row) => sum + row.winProb, 0) / matchRows.length
      : 0

  const squadSize = team.players.length

  return (
    <div className="tap-pricing-markets">
      <TeamPricingMarketBox
        boxId={`tap-match-market-${team.id}`}
        title="Match market"
        summary={`Model vs ${matchRows.length} teams · avg ${formatWinProb(avgWinProb)}`}
        defaultOpen
      >
        <p className="tap-pricing-market-note">
          Fair win probability and price when {team.name} hosts each opponent (simulator ratings).
        </p>
        {matchRows.length === 0 ? (
          <p className="tap-pricing-market-empty">No other teams in this tournament.</p>
        ) : (
          <div className="tap-pricing-market-table-wrap">
            <table className="tap-pricing-market-table">
              <thead>
                <tr>
                  <th scope="col">Opponent</th>
                  <th scope="col">Win %</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {matchRows.map((row) => (
                  <tr key={row.opponentId}>
                    <td className="tap-pricing-market-opponent">{row.opponentName}</td>
                    <td className="tap-pricing-market-prob">{formatWinProb(row.winProb)}</td>
                    <td className="tap-pricing-market-price">
                      {formatOutrightOddsValue(row.fairPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TeamPricingMarketBox>

      <TeamPricingMarketBox
        boxId={`tap-top-bat-market-${team.id}`}
        title="Top bat"
        summary={
          squadSize > 0
            ? `${squadSize} squad players · model pending`
            : 'Squad players · model pending'
        }
      >
        <p className="tap-pricing-market-note">
          Tournament top run scorer prices for {team.name} squad players.
        </p>
        <p className="tap-pricing-market-placeholder">Model pricing coming soon.</p>
      </TeamPricingMarketBox>

      <TeamPricingMarketBox
        boxId={`tap-top-bowl-market-${team.id}`}
        title="Top bowl"
        summary={
          squadSize > 0
            ? `${squadSize} squad players · model pending`
            : 'Squad players · model pending'
        }
      >
        <p className="tap-pricing-market-note">
          Tournament top wicket taker prices for {team.name} squad players.
        </p>
        <p className="tap-pricing-market-placeholder">Model pricing coming soon.</p>
      </TeamPricingMarketBox>
    </div>
  )
}
