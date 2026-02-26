'use client'

import { useState } from 'react'
import { CricketFormat, Gender, FORMATS, GENDERS, TOURNAMENTS } from '../data/tournaments'
import { getTeamsByTournament, getTopBatters, getTopBowlers } from '../data/teams'
import Sidebar from './Sidebar'
import TeamsTable from './TeamsTable'
import PlayerRankings from './PlayerRankings'
import TournamentSettings from './TournamentSettings'
import TeamManager from './TeamManager'

interface DashboardProps {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  onSelectTournament: (format: CricketFormat, gender: Gender, tournamentId: string) => void
  onGoHome: () => void
}

export default function Dashboard({
  format,
  gender,
  tournamentId,
  onSelectTournament,
  onGoHome,
}: DashboardProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const tournament = TOURNAMENTS[format][gender].find((t) => t.id === tournamentId)
  const formatInfo = FORMATS.find((f) => f.key === format)!
  const genderInfo = GENDERS.find((g) => g.key === gender)!

  const teams = getTeamsByTournament(tournamentId)
  const topBatters = getTopBatters(tournamentId)
  const topBowlers = getTopBowlers(tournamentId)

  const selectedTeam = selectedTeamId
    ? teams.find((t) => t.id === selectedTeamId) ?? null
    : null

  function handleSelectTeam(teamId: string) {
    setSelectedTeamId(teamId)
  }

  function handleBackToDashboard() {
    setSelectedTeamId(null)
  }

  function handleTournamentSwitch(f: CricketFormat, g: Gender, tId: string) {
    setSelectedTeamId(null)
    onSelectTournament(f, g, tId)
  }

  // Team manager view
  if (selectedTeam) {
    return (
      <div className="dashboard-layout">
        <Sidebar
          mode="team"
          currentFormat={format}
          currentGender={gender}
          currentTournamentId={tournamentId}
          currentTeamId={selectedTeamId}
          onSelectTournament={handleTournamentSwitch}
          onSelectTeam={handleSelectTeam}
          onBackToDashboard={handleBackToDashboard}
          onGoHome={onGoHome}
        />

        <main className="dashboard-main">
          <TeamManager
            team={selectedTeam}
            tournamentName={tournament?.name ?? ''}
          />
        </main>
      </div>
    )
  }

  // Tournament overview
  return (
    <div className="dashboard-layout">
      <Sidebar
        mode="tournament"
        currentFormat={format}
        currentGender={gender}
        currentTournamentId={tournamentId}
        onSelectTournament={handleTournamentSwitch}
        onGoHome={onGoHome}
      />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            {tournament?.name ?? 'Tournament'}
          </h1>
          <div className="dashboard-breadcrumb">
            {formatInfo.label} › {genderInfo.label} › {tournament?.name}
          </div>
        </div>

        <div className="dashboard-content">
          <section className="dashboard-left">
            <h2 className="section-title">Teams</h2>
            <TeamsTable teams={teams} onSelectTeam={handleSelectTeam} />
          </section>

          <section className="dashboard-right">
            <TournamentSettings />

            <div className="rankings-columns">
              <PlayerRankings
                title="Top Batting"
                players={topBatters}
                ratingKey="battingRating"
                emptyLabel="No player ratings yet"
              />
              <PlayerRankings
                title="Top Bowling"
                players={topBowlers}
                ratingKey="bowlingRating"
                emptyLabel="No player ratings yet"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
