'use client'

import { Team } from '../data/teams'
import { getTeamLogo } from '../data/logoStore'

interface TeamsTableProps {
  teams: Team[]
  teamBatRatings?: Record<string, number>
  teamBowlingRatings?: Record<string, number>
  onSelectTeam?: (teamId: string) => void
}

export default function TeamsTable({ teams, teamBatRatings, teamBowlingRatings, onSelectTeam }: TeamsTableProps) {
  if (teams.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏏</div>
        <p>No teams configured yet.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Teams will be added for this tournament.
        </p>
      </div>
    )
  }

  const sorted = teamBatRatings && teamBowlingRatings
    ? [...teams].sort((a, b) => {
        const totalA = ((teamBatRatings[a.id] ?? 0) + (teamBowlingRatings[a.id] ?? 0)) / 2
        const totalB = ((teamBatRatings[b.id] ?? 0) + (teamBowlingRatings[b.id] ?? 0)) / 2
        return totalB - totalA
      })
    : teamBatRatings
    ? [...teams].sort((a, b) => (teamBatRatings[b.id] ?? 0) - (teamBatRatings[a.id] ?? 0))
    : teams

  return (
    <div className="teams-table-wrap">
      <table className="teams-table">
        <thead>
          <tr className="teams-table-head-row">
            <th className="th-logo teams-th-identity" aria-hidden />
            <th className="th-name teams-th-identity">Team</th>
            <th className="th-num teams-th-batting">Batting</th>
            <th className="th-num teams-th-bowling">Bowling</th>
            <th className="th-num th-total teams-th-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => {
            const batVal = teamBatRatings ? (teamBatRatings[team.id] ?? 0) : team.battingFactor
            const bowlVal = teamBowlingRatings ? (teamBowlingRatings[team.id] ?? 0) : team.bowlingFactor
            const totalVal = (batVal + bowlVal) / 2
            const batDisplay = teamBatRatings ? batVal.toFixed(1) : team.battingFactor.toFixed(1)
            const bowlDisplay = teamBowlingRatings ? bowlVal.toFixed(1) : team.bowlingFactor.toFixed(1)
            const totalDisplay = (teamBatRatings || teamBowlingRatings) ? totalVal.toFixed(1) : team.totalFactor.toFixed(1)
            return (
              <tr
                key={team.id}
                className={onSelectTeam ? 'team-row-clickable' : ''}
                onClick={() => onSelectTeam?.(team.id)}
              >
                <td className="td-logo">
                  {(getTeamLogo(team.id) || team.logo) ? (
                    <img src={getTeamLogo(team.id) || team.logo!} alt="" className="team-logo" />
                  ) : (
                    <div className="team-logo-placeholder">
                      {team.name.charAt(0)}
                    </div>
                  )}
                </td>
                <td className="td-name">{team.name}</td>
                <td className={`td-num ${teamBatRatings && (batVal > 0 ? 'rating-pos' : batVal < 0 ? 'rating-neg' : '')}`}>
                  {batDisplay}
                </td>
                <td className={`td-num ${teamBowlingRatings && (bowlVal > 0 ? 'rating-pos' : bowlVal < 0 ? 'rating-neg' : '')}`}>
                  {bowlDisplay}
                </td>
                <td className="td-num td-total">{totalDisplay}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
