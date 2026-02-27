'use client'

import { useState, useMemo } from 'react'
import { CricketFormat, Gender, FORMATS, GENDERS, TOURNAMENTS } from '../data/tournaments'
import { getTeamsByTournament, getTopBatters, getTopBowlers } from '../data/teams'
import Sidebar from './Sidebar'
import TeamsTable from './TeamsTable'
import PlayerRankings from './PlayerRankings'
import TournamentSettings from './TournamentSettings'
import TeamManager from './TeamManager'
import FixtureList from './FixtureList'

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
  const [selectedYear, setSelectedYear] = useState(2026)

  const currentYear = 2026
  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = currentYear; y >= currentYear - 4; y--) arr.push(y)
    return arr
  }, [])

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

        <main className="dashboard-main dashboard-main-no-pad">
          <TeamManager
            team={selectedTeam}
            tournamentName={tournament?.name ?? ''}
            allTeams={teams}
            topBatters={topBatters}
            topBowlers={topBowlers}
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
          <div className="dashboard-header-top">
            <div>
              <h1 className="dashboard-title">
                {tournament?.name ?? 'Tournament'}
              </h1>
              <div className="dashboard-breadcrumb">
                {formatInfo.label} › {genderInfo.label} › {tournament?.name}
              </div>
            </div>
            <div className="dashboard-year-selector">
              {years.map((y) => (
                <button
                  key={y}
                  className={`year-btn ${y === selectedYear ? 'year-btn-active' : ''} ${y !== currentYear ? 'year-btn-past' : ''}`}
                  onClick={() => setSelectedYear(y)}
                  title={y === currentYear ? 'Current edition' : `${y} edition (read-only)`}
                >
                  {y === currentYear && <span className="year-live-dot" />}
                  {y}
                </button>
              ))}
            </div>
          </div>
          {selectedYear !== currentYear && (
            <div className="year-archive-banner">
              Viewing {tournament?.name} {selectedYear} — archived edition (read-only)
            </div>
          )}
        </div>

        <div className="dashboard-content">
          <section className="dashboard-left">
            <h2 className="section-title">Teams</h2>
            <TeamsTable teams={teams} onSelectTeam={handleSelectTeam} />

            <h2 className="section-title" style={{ marginTop: '2rem' }}>Fixtures</h2>
            <FixtureList teams={teams} tournamentId={tournamentId} />
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
