'use client'

import {
  FORMATS,
  GENDERS,
  TOURNAMENTS,
  type CricketFormat,
  type Gender,
} from '../data/tournaments'
import { getTeamsByTournament } from '../data/teams'

type SidebarMode = 'tournament' | 'team'

interface SidebarProps {
  mode: SidebarMode
  currentFormat: CricketFormat
  currentGender: Gender
  currentTournamentId: string
  currentTeamId?: string | null
  onSelectTournament: (format: CricketFormat, gender: Gender, tournamentId: string) => void
  onSelectTeam?: (teamId: string) => void
  onBackToDashboard?: () => void
  onGoHome: () => void
}

export default function Sidebar({
  mode,
  currentFormat,
  currentGender,
  currentTournamentId,
  currentTeamId,
  onSelectTournament,
  onSelectTeam,
  onBackToDashboard,
  onGoHome,
}: SidebarProps) {
  const formatInfo = FORMATS.find((f) => f.key === currentFormat)!
  const genderInfo = GENDERS.find((g) => g.key === currentGender)!
  const tournament = TOURNAMENTS[currentFormat][currentGender].find(
    (t) => t.id === currentTournamentId,
  )
  const tournaments = TOURNAMENTS[currentFormat][currentGender]
  const teams = getTeamsByTournament(currentTournamentId)

  return (
    <aside className="sidebar">
      <button className="sidebar-home" onClick={onGoHome}>
        ← All Formats
      </button>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Format</div>
        <div className="sidebar-current">
          <span className="sidebar-icon">{formatInfo.icon}</span>
          {formatInfo.label}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Category</div>
        <div className="sidebar-current">
          <span className="sidebar-icon">{genderInfo.icon}</span>
          {genderInfo.label}
        </div>
      </div>

      {mode === 'tournament' && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Tournaments</div>
            <ul className="sidebar-tree">
              {tournaments.map((t) => (
                <li
                  key={t.id}
                  className={`sidebar-tree-item ${t.id === currentTournamentId ? 'active' : ''}`}
                  onClick={() => onSelectTournament(currentFormat, currentGender, t.id)}
                >
                  {t.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section sidebar-other-formats">
            <div className="sidebar-section-label">Other Formats</div>
            <ul className="sidebar-tree">
              {FORMATS.filter((f) => f.key !== currentFormat).map((f) => {
                const genderTournaments = TOURNAMENTS[f.key][currentGender]
                if (genderTournaments.length === 0) return null
                return (
                  <li
                    key={f.key}
                    className="sidebar-tree-item dimmed"
                    onClick={() =>
                      onSelectTournament(f.key, currentGender, genderTournaments[0].id)
                    }
                  >
                    <span className="sidebar-icon">{f.icon}</span>
                    {f.label}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}

      {mode === 'team' && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Tournament</div>
            <div
              className="sidebar-tournament-back"
              onClick={onBackToDashboard}
            >
              ← {tournament?.name ?? 'Dashboard'}
            </div>
          </div>

          <div className="sidebar-section sidebar-teams-section">
            <div className="sidebar-section-label">Teams</div>
            <ul className="sidebar-tree">
              {teams.map((t) => (
                <li
                  key={t.id}
                  className={`sidebar-tree-item ${t.id === currentTeamId ? 'active' : ''}`}
                  onClick={() => onSelectTeam?.(t.id)}
                >
                  <span className="sidebar-team-initial">
                    {t.name.charAt(0)}
                  </span>
                  {t.name}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </aside>
  )
}
