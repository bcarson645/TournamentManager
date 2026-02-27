'use client'

import { Team } from '../data/teams'
import { getTeamLogo } from '../data/logoStore'

interface TeamsTableProps {
  teams: Team[]
  onSelectTeam?: (teamId: string) => void
}

export default function TeamsTable({ teams, onSelectTeam }: TeamsTableProps) {
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

  return (
    <div className="teams-table-wrap">
      <table className="teams-table">
        <thead>
          <tr>
            <th className="th-logo"></th>
            <th className="th-name">Team</th>
            <th className="th-num">Batting</th>
            <th className="th-num">Bowling</th>
            <th className="th-num th-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
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
              <td className="td-num">{team.battingFactor.toFixed(1)}</td>
              <td className="td-num">{team.bowlingFactor.toFixed(1)}</td>
              <td className="td-num td-total">{team.totalFactor.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
