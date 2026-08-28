'use client'

import { useMemo, useSyncExternalStore } from 'react'
import type { Team } from '../data/teams'
import {
  getTeamFirstInningsChartData,
  getTeamPowerplayChartData,
  getTeamRunsConcededProfile,
  profileToChartData,
} from '../data/teamFirstInningsStats'
import { getSquadStoreVersion, getStoredSquad, subscribeSquadStore } from '../data/squadStore'
import TeamMeanAxisChart from './TeamMeanAxisChart'

interface TeamStatsPanelProps {
  tournamentId: string
  team: Team
  allTeams: Team[]
}

export default function TeamStatsPanel({ tournamentId, team, allTeams }: TeamStatsPanelProps) {
  const squadVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, () => 0)
  const teamIds = useMemo(() => allTeams.map((entry) => entry.id), [allTeams])
  const groundId = useMemo(() => {
    void squadVersion
    return getStoredSquad(team.id)?.groundId ?? null
  }, [squadVersion, team.id])

  const firstInnings = useMemo(
    () => getTeamFirstInningsChartData(tournamentId, team.id, teamIds, groundId),
    [groundId, team.id, teamIds, tournamentId],
  )

  const powerplay = useMemo(
    () => getTeamPowerplayChartData(tournamentId, team.id, teamIds, groundId),
    [groundId, team.id, teamIds, tournamentId],
  )

  const runsConceded = useMemo(() => {
    const profile = getTeamRunsConcededProfile(tournamentId, team.id, teamIds)
    return profileToChartData(profile, 'Team average')
  }, [team.id, teamIds, tournamentId])

  const sections = [
    {
      key: 'first-innings',
      title: 'First innings score',
      subtitle: 'Overall and at home ground when batting first',
      chart: firstInnings,
      lowerIsBetter: false,
      ariaLabel: 'First innings overall and home ground versus tournament mean',
    },
    {
      key: 'powerplay',
      title: 'Powerplay score',
      subtitle: 'Overall and at home ground in overs 1–6',
      chart: powerplay,
      lowerIsBetter: false,
      ariaLabel: 'Powerplay overall and home ground versus tournament mean',
    },
    {
      key: 'runs-conceded',
      title: 'Runs conceded',
      subtitle: 'Runs conceded per innings when bowling',
      chart: runsConceded,
      lowerIsBetter: true,
      ariaLabel: 'Average runs conceded versus tournament mean',
    },
  ] as const

  return (
    <div className="tap-stats-panel">
      {sections.map((section) => (
        <section key={section.key} className="tap-stats-section" aria-label={section.title}>
          <header className="tap-stats-section-head">
            <h3 className="tap-stats-section-title">{section.title}</h3>
            <p className="tap-stats-section-subtitle">{section.subtitle}</p>
          </header>
          <TeamMeanAxisChart
            chart={section.chart}
            lowerIsBetter={section.lowerIsBetter}
            ariaLabel={section.ariaLabel}
          />
        </section>
      ))}
    </div>
  )
}
