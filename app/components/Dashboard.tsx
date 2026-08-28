'use client'

import { useState, useMemo, useSyncExternalStore, useEffect } from 'react'
import { CricketFormat, Gender, FORMATS, GENDERS, TOURNAMENTS } from '../data/tournaments'
import { getTeamsByTournament } from '../data/teams'
import {
  getTeamBatRatingTotal,
  getTeamBowlRatingTotal,
  getDashboardBatRankings,
  getDashboardBowlRankings,
  getSquadStoreVersion,
  subscribeSquadStore,
  type BattingPositionFilter,
} from '../data/squadStore'
import {
  readDashboardBatMetric,
  readDashboardBowlMetric,
  writeDashboardBatMetric,
  writeDashboardBowlMetric,
  formatDashboardBatMetricValue,
  formatDashboardBowlMetricValue,
  dashboardBowlMetricValueSemantics,
  dashboardBatMetricOptionLabel,
  dashboardBowlMetricOptionLabel,
  type DashboardBatMetric,
  type DashboardBowlMetric,
} from '../data/ratingDisplaySettings'
import Sidebar from './Sidebar'
import TeamsTable from './TeamsTable'
import PlayerRankings from './PlayerRankings'
import TournamentSettings from './TournamentSettings'
import TeamManager from './TeamManager'
import { TournamentUpcomingFixtures } from './TournamentLivePanel'
import TeamAnalyticsPanel from './TeamAnalyticsPanel'
import { useTournamentOptions } from '../hooks/useTournamentOptions'
import TournamentLeadPrepHint from './TournamentLeadPrepHint'

const SIDEBAR_COLLAPSED_KEY = 'tm-sidebar-collapsed'
const DASH_BAT_POS_FILTER_KEY = 'tm-dash-bat-pos-filter'

function parseBattingPositionFilter(raw: string | null): BattingPositionFilter {
  if (!raw || raw === 'all') return 'all'
  if (raw === 'openers') return 'openers'
  if (/^(10|11|[1-9])$/.test(raw)) return raw as BattingPositionFilter
  return 'all'
}

interface DashboardProps {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  /** When set, opens team workspace immediately (e.g. home wizard finished on a team). */
  initialTeamId?: string | null
  onSelectTournament: (format: CricketFormat, gender: Gender, tournamentId: string) => void
  onGoHome: () => void
}

export default function Dashboard({
  format,
  gender,
  tournamentId,
  initialTeamId = null,
  onSelectTournament,
  onGoHome,
}: DashboardProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(initialTeamId)
  const [analyticsTeamId, setAnalyticsTeamId] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dashBatMetric, setDashBatMetric] = useState<DashboardBatMetric>('batRating')
  const [dashBowlMetric, setDashBowlMetric] = useState<DashboardBowlMetric>('bowlRating')
  const [dashBatPosFilter, setDashBatPosFilter] = useState<BattingPositionFilter>('all')

  useEffect(() => {
    setSidebarCollapsed(typeof window !== 'undefined' && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    setDashBatMetric(readDashboardBatMetric())
    setDashBowlMetric(readDashboardBowlMetric())
    if (typeof window !== 'undefined') {
      setDashBatPosFilter(parseBattingPositionFilter(localStorage.getItem(DASH_BAT_POS_FILTER_KEY)))
    }
  }, [])

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((c) => {
      const next = !c
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      }
      return next
    })
  }

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

  const tournamentOpts = useTournamentOptions(tournamentId)
  const ratingParScore = tournamentOpts.ratingParScore

  const squadStoreVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, getSquadStoreVersion)

  const teamBatRatings = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of teams) {
      map[t.id] = getTeamBatRatingTotal(t.id, ratingParScore)
    }
    return map
  }, [teams, squadStoreVersion, ratingParScore])

  const teamBowlingRatings = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of teams) {
      map[t.id] = getTeamBowlRatingTotal(t.id, ratingParScore)
    }
    return map
  }, [teams, squadStoreVersion, ratingParScore])

  const rankedBatters = useMemo(
    () => getDashboardBatRankings(teams, dashBatMetric, dashBatPosFilter),
    [teams, squadStoreVersion, dashBatMetric, dashBatPosFilter],
  )

  const rankedBowlers = useMemo(
    () => getDashboardBowlRankings(teams, dashBowlMetric),
    [teams, squadStoreVersion, dashBowlMetric],
  )

  const selectedTeam = selectedTeamId
    ? teams.find((t) => t.id === selectedTeamId) ?? null
    : null

  const analyticsTeam =
    analyticsTeamId != null ? teams.find((t) => t.id === analyticsTeamId) ?? null : null

  /** Team analytics docked beside squad (same slot as player panel), not fullscreen overlay */
  const teamAnalyticsDocked =
    selectedTeam != null && analyticsTeam != null && analyticsTeam.id === selectedTeam.id

  function handleSelectTeam(teamId: string) {
    setAnalyticsTeamId(null)
    setSelectedTeamId(teamId)
  }

  function handleBackToDashboard() {
    setSelectedTeamId(null)
    setAnalyticsTeamId(null)
  }

  function handleTournamentSwitch(f: CricketFormat, g: Gender, tId: string) {
    setSelectedTeamId(null)
    setAnalyticsTeamId(null)
    onSelectTournament(f, g, tId)
  }

  // Team manager view
  if (selectedTeam) {
    return (
      <>
        <div
          className={
            'dashboard-layout' + (sidebarCollapsed ? ' dashboard-layout--sidebar-collapsed' : '')
          }
        >
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
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
          />

          <main className="dashboard-main dashboard-main-no-pad">
            <TeamManager
              format={format}
              gender={gender}
              tournamentId={tournamentId}
              team={selectedTeam}
              tournamentName={tournament?.name ?? ''}
              allTeams={teams}
              teamBatRatings={teamBatRatings}
              teamBowlingRatings={teamBowlingRatings}
              onOpenTeamAnalytics={() => setAnalyticsTeamId(selectedTeam.id)}
              teamAnalyticsOpen={teamAnalyticsDocked}
              onCloseTeamAnalytics={() => setAnalyticsTeamId(null)}
            />
          </main>
        </div>
        {analyticsTeam && !teamAnalyticsDocked ? (
          <TeamAnalyticsPanel
            team={analyticsTeam}
            tournamentId={tournamentId}
            format={format}
            allTeams={teams}
            batRating={teamBatRatings[analyticsTeam.id] ?? 0}
            bowlRating={teamBowlingRatings[analyticsTeam.id] ?? 0}
            tournamentName={tournament?.name ?? 'Tournament'}
            onClose={() => setAnalyticsTeamId(null)}
          />
        ) : null}
      </>
    )
  }

  // Tournament overview
  return (
    <>
      <div
        className={
          'dashboard-layout' + (sidebarCollapsed ? ' dashboard-layout--sidebar-collapsed' : '')
        }
      >
        <Sidebar
          mode="tournament"
          currentFormat={format}
          currentGender={gender}
          currentTournamentId={tournamentId}
          onSelectTournament={handleTournamentSwitch}
          onGoHome={onGoHome}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
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
              <TournamentLeadPrepHint tournamentId={tournamentId} />
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
            <div className="tournament-section-panel">
              <h2 className="tournament-section-head">Tournament ratings</h2>
              <div className="tournament-section-body">
                <TeamsTable
                  teams={teams}
                  teamBatRatings={teamBatRatings}
                  teamBowlingRatings={teamBowlingRatings}
                  onSelectTeam={handleSelectTeam}
                  onOpenTeamAnalytics={(id) => {
                    setSelectedTeamId(id)
                    setAnalyticsTeamId(id)
                  }}
                />
              </div>
            </div>
            <div className="tournament-section-panel">
              <h2 className="tournament-section-head">Fixtures</h2>
              <div className="tournament-section-body">
                <TournamentUpcomingFixtures
                  tournamentId={tournamentId}
                  format={format}
                  embedded
                />
              </div>
            </div>
          </section>

          <section className="dashboard-right">
            <div className="tournament-section-panel">
              <TournamentSettings
                tournamentId={tournamentId}
                tournamentName={tournament?.name ?? 'Tournament'}
              />
            </div>
            <div className="tournament-section-panel">
              <h2 className="tournament-section-head">Player ratings</h2>
              <div className="tournament-section-body tournament-section-body--rankings">
                <div className="rankings-metric-bar">
                  <label className="rankings-metric-label">
                    <span>Batting</span>
                    <select
                      className="rankings-metric-select"
                      value={dashBatMetric}
                      onChange={(e) => {
                        const v = e.target.value as DashboardBatMetric
                        setDashBatMetric(v)
                        writeDashboardBatMetric(v)
                      }}
                      aria-label="Batting ranking metric"
                    >
                      {(['batRating', 'btCaz', 'srCaz'] as const).map((k) => (
                        <option key={k} value={k}>
                          {dashboardBatMetricOptionLabel(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rankings-metric-label rankings-metric-label--pos">
                    <span className="rankings-pos-label">Line-up</span>
                    <select
                      className="rankings-metric-select"
                      value={dashBatPosFilter}
                      onChange={(e) => {
                        const v = parseBattingPositionFilter(e.target.value)
                        setDashBatPosFilter(v)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(DASH_BAT_POS_FILTER_KEY, v)
                        }
                      }}
                      aria-label="Filter batting rankings by starting XI position"
                    >
                      <option value="all">All positions</option>
                      <option value="openers">Openers (1–2)</option>
                      {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map((n) => (
                        <option key={n} value={String(n)}>
                          Position {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rankings-metric-label">
                    <span>Bowling</span>
                    <select
                      className="rankings-metric-select"
                      value={dashBowlMetric}
                      onChange={(e) => {
                        const v = e.target.value as DashboardBowlMetric
                        setDashBowlMetric(v)
                        writeDashboardBowlMetric(v)
                      }}
                      aria-label="Bowling ranking metric"
                    >
                      {(['bowlRating', 'bowlAvg', 'econ', 'bowlBpw'] as const).map((k) => (
                        <option key={k} value={k}>
                          {dashboardBowlMetricOptionLabel(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="rankings-columns">
                  <PlayerRankings
                    title={
                      'Tournament Batting · ' +
                      dashboardBatMetricOptionLabel(dashBatMetric) +
                      (dashBatPosFilter === 'all'
                        ? ''
                        : dashBatPosFilter === 'openers'
                          ? ' · Openers'
                          : ' · Pos. ' + dashBatPosFilter)
                    }
                    accent="batting"
                    entries={rankedBatters.map((b) => ({
                      id: b.id,
                      name: b.name,
                      teamName: b.teamName,
                      rating: b.value,
                    }))}
                    emptyLabel="No player ratings yet"
                    formatValue={(n) => formatDashboardBatMetricValue(dashBatMetric, n)}
                    valueSemantics="higher-better"
                  />
                  <PlayerRankings
                    title={'Tournament Bowling · ' + dashboardBowlMetricOptionLabel(dashBowlMetric)}
                    accent="bowling"
                    entries={rankedBowlers.map((p) => ({
                      id: p.id,
                      name: p.name,
                      teamName: p.teamName,
                      rating: p.value,
                    }))}
                    emptyLabel="No player ratings yet"
                    formatValue={(n) => formatDashboardBowlMetricValue(dashBowlMetric, n)}
                    valueSemantics={dashboardBowlMetricValueSemantics(dashBowlMetric)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>

    {analyticsTeam ? (
      <TeamAnalyticsPanel
        team={analyticsTeam}
        tournamentId={tournamentId}
        format={format}
        allTeams={teams}
        batRating={teamBatRatings[analyticsTeam.id] ?? 0}
        bowlRating={teamBowlingRatings[analyticsTeam.id] ?? 0}
        tournamentName={tournament?.name ?? 'Tournament'}
        onClose={() => setAnalyticsTeamId(null)}
        onGoToSquad={() => {
          setAnalyticsTeamId(null)
          setSelectedTeamId(analyticsTeam.id)
        }}
      />
    ) : null}
    </>
  )
}
