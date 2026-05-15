'use client'

import { Team } from '../data/teams'
import { getTeamLogo } from '../data/logoStore'
import {
  teamBattingParIndexClass,
  teamBowlingParIndexClass,
  teamNetStrengthParIndex,
} from '../data/ratingDisplaySettings'

interface TeamsTableProps {
  teams: Team[]
  teamBatRatings?: Record<string, number>
  teamBowlingRatings?: Record<string, number>
  onSelectTeam?: (teamId: string) => void
  /** Chart button per row opens the team analytics overlay (name/row still open squad). */
  onOpenTeamAnalytics?: (teamId: string) => void
}

export default function TeamsTable({
  teams,
  teamBatRatings,
  teamBowlingRatings,
  onSelectTeam,
  onOpenTeamAnalytics,
}: TeamsTableProps) {
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
        const strength = (id: string) =>
          teamNetStrengthParIndex(teamBatRatings[id] ?? 0, teamBowlingRatings[id] ?? 0)
        return strength(b.id) - strength(a.id)
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
            const batDisplay = teamBatRatings ? batVal.toFixed(2) : team.battingFactor.toFixed(2)
            const bowlDisplay = teamBowlingRatings ? bowlVal.toFixed(2) : team.bowlingFactor.toFixed(2)
            const totalDisplay = (teamBatRatings || teamBowlingRatings) ? totalVal.toFixed(2) : team.totalFactor.toFixed(2)
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
                <td className="td-name td-name-with-actions">
                  <span className="td-name-text">{team.name}</span>
                  {onOpenTeamAnalytics ? (
                    <button
                      type="button"
                      className="td-analytics-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenTeamAnalytics(team.id)
                      }}
                      title="Team analytics (demo data)"
                      aria-label={`Open analytics for ${team.name}`}
                    >
                      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden focusable={false}>
                        <path
                          fill="currentColor"
                          d="M3 3v18h18v-2H5V3H3zm4 14h2V9H7v8zm5 0h2v-4h-2v4zm5 0h2V7h-2v10z"
                        />
                      </svg>
                    </button>
                  ) : null}
                </td>
                <td
                  className={[
                    'td-num',
                    teamBatRatings ? teamBattingParIndexClass(batVal) : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {batDisplay}
                </td>
                <td
                  className={[
                    'td-num',
                    teamBowlingRatings ? teamBowlingParIndexClass(bowlVal) : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {bowlDisplay}
                </td>
                <td
                  className={[
                    'td-num',
                    'td-total',
                    teamBatRatings && teamBowlingRatings
                      ? teamBattingParIndexClass(teamNetStrengthParIndex(batVal, bowlVal))
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {totalDisplay}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
