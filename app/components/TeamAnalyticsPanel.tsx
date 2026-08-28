'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { Team } from '../data/teams'
import { getTeamLogo } from '../data/logoStore'
import type { CricketFormat } from '../data/tournaments'
import TeamPricingPanel from './TeamPricingPanel'
import TeamStatsPanel from './TeamStatsPanel'

type TeamSectionTab = 'stats' | 'pricing' | 'tbd'

const TEAM_SECTION_TABS: { id: TeamSectionTab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'tbd', label: 'TBD' },
]

interface TeamAnalyticsPanelProps {
  team: Team
  tournamentId: string
  format: CricketFormat
  allTeams: Team[]
  batRating: number
  bowlRating: number
  tournamentName: string
  onGoToSquad?: () => void
  onClose: () => void
  mode?: 'overlay' | 'docked'
  panelWidth?: number
}

export default function TeamAnalyticsPanel({
  team,
  tournamentId,
  format,
  allTeams,
  tournamentName,
  onClose,
  mode = 'overlay',
  panelWidth = 400,
}: TeamAnalyticsPanelProps) {
  const [sectionTab, setSectionTab] = useState<TeamSectionTab>('stats')
  const logo = getTeamLogo(team.id) || team.logo || null

  useEffect(() => {
    setSectionTab('stats')
  }, [team.id])

  const dockedShellStyle =
    mode === 'docked'
      ? ({
          width: panelWidth,
          flex: '0 0 auto',
          minWidth: 260,
          maxWidth: 'min(820px, 78vw)',
        } as CSSProperties)
      : undefined

  const panelInner = (
    <div className="tap-panel-body">
      <div className="tap-panel-chrome">
        <header className="tap-header">
          <div className="tap-brand">
            <div className="tap-brand-logo">
              {logo ? (
                <img src={logo} alt="" width={52} height={52} />
              ) : (
                <span aria-hidden>{team.name.charAt(0)}</span>
              )}
            </div>
            <div className="tap-brand-text">
              <h2 id="tap-panel-heading" className="tap-title">
                {team.name}
              </h2>
              <p className="tap-meta">{tournamentName}</p>
            </div>
          </div>
          <button type="button" className="tap-close" onClick={onClose} title="Close">
            {'\u00d7'}
          </button>
        </header>

        <div className="pp-tabs" role="tablist" aria-label="Team stats pricing and more">
          {TEAM_SECTION_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tap-tab-${id}`}
              aria-selected={sectionTab === id}
              aria-controls={`tap-panel-${id}`}
              className={
                'pp-tab tap-tab tap-tab--' +
                id +
                (sectionTab === id ? ` pp-tab-active pp-tab-active--${id}` : '')
              }
              onClick={() => setSectionTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tap-panel-scroll pp-panel-scroll--body">
        {sectionTab === 'stats' && (
          <div
            className="pp-tab-panel tap-tab-panel tap-tab-panel--stats"
            id="tap-panel-stats"
            role="tabpanel"
            aria-labelledby="tap-tab-stats"
          >
            <TeamStatsPanel tournamentId={tournamentId} team={team} allTeams={allTeams} />
          </div>
        )}
        {sectionTab === 'pricing' && (
          <div
            className="pp-tab-panel tap-tab-panel tap-tab-panel--pricing"
            id="tap-panel-pricing"
            role="tabpanel"
            aria-labelledby="tap-tab-pricing"
          >
            <TeamPricingPanel
              tournamentId={tournamentId}
              format={format}
              team={team}
              allTeams={allTeams}
            />
          </div>
        )}
        {sectionTab === 'tbd' && (
          <div
            className="pp-tab-panel tap-tab-panel tap-tab-panel--tbd"
            id="tap-panel-tbd"
            role="tabpanel"
            aria-labelledby="tap-tab-tbd"
          />
        )}
      </div>
    </div>
  )

  if (mode === 'docked') {
    return (
      <aside
        className="tap-panel tap-panel--docked"
        role="region"
        aria-labelledby="tap-panel-heading"
        style={dockedShellStyle}
      >
        {panelInner}
      </aside>
    )
  }

  return (
    <div className="tap-backdrop" role="presentation">
      <div className="tap-backdrop-hit" aria-hidden="true" onClick={onClose} />
      <aside
        className="tap-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tap-panel-heading"
        onClick={(e) => e.stopPropagation()}
      >
        {panelInner}
      </aside>
    </div>
  )
}
