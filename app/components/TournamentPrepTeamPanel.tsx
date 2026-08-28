'use client'

import { useSyncExternalStore } from 'react'
import { TEAMS } from '../data/teams'
import {
  getTraderById,
  getCoverageRotaVersion,
  getTournamentCoverage,
  isTeamSquadPrepped,
  subscribeCoverageRota,
  resolveTeamCoverageStatus,
  setTeamCoverageStatus,
  setTeamCoverageTrader,
  type CoverageStatus,
  type Trader,
} from '../data/coverageRotaStore'
import { getSquadStoreVersion, subscribeSquadStore } from '../data/squadStore'
import TraderPicker from './TraderPicker'
import TournamentTraderAssign from './TournamentTraderAssign'

const STATUS_LABELS: Record<CoverageStatus, string> = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  in_progress: 'In progress',
  complete: 'Prepped',
}

function StatusPill({ status }: { status: CoverageStatus }) {
  return <span className={'cov-status-pill cov-status-pill--' + status}>{STATUS_LABELS[status]}</span>
}

interface TournamentPrepTeamPanelProps {
  tournamentId: string
  tournamentName: string
  meta: string
  leadTraderId: string | null
  traders: Trader[]
  variant?: 'page'
  onClose?: () => void
  canOpenInManager?: boolean
  onOpenTournamentPrep?: () => void
  onOpenTeamPrep?: (teamId: string) => void
}

export default function TournamentPrepTeamPanel({
  tournamentId,
  tournamentName,
  meta,
  leadTraderId,
  traders,
  variant,
  onClose,
  canOpenInManager = false,
  onOpenTournamentPrep,
  onOpenTeamPrep,
}: TournamentPrepTeamPanelProps) {
  useSyncExternalStore(subscribeCoverageRota, getCoverageRotaVersion, () => 0)
  useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, () => 0)

  const coverage = getTournamentCoverage(tournamentId)
  const teams = TEAMS[tournamentId] ?? []
  const leadName = getTraderById(coverage.leadTraderId ?? leadTraderId)?.name
  const isPage = variant === 'page'

  return (
    <section
      className={'cov-tournament-detail' + (isPage ? ' cov-tournament-detail--page' : '')}
      aria-label={'Teams for ' + tournamentName}
    >
      {!isPage ? (
        <header className="cov-tournament-detail-head">
          <div>
            <h3 className="cov-tournament-detail-title">{tournamentName}</h3>
            <p className="cov-tournament-detail-meta">
              {meta}
              {leadName ? ` · Lead: ${leadName}` : ''}
              {coverage.traderIds.length > 1 ? ` · ${coverage.traderIds.length} traders` : ''}
            </p>
          </div>
          <div className="cov-tournament-detail-actions">
            {canOpenInManager && onOpenTournamentPrep ? (
              <button type="button" className="cov-go-prep-btn" onClick={onOpenTournamentPrep}>
                Open in Tournament Manager
              </button>
            ) : null}
            {onClose ? (
              <button type="button" className="cov-tournament-detail-close" onClick={onClose}>
                Close
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="cov-tournament-detail-lead">
        <TournamentTraderAssign tournamentId={tournamentId} traders={traders} />
        <p className="cov-tournament-traders-hint">First trader is lead. Teams without an assignee inherit the lead.</p>
        {isPage && canOpenInManager && onOpenTournamentPrep ? (
          <button type="button" className="cov-go-prep-btn cov-go-prep-btn--page" onClick={onOpenTournamentPrep}>
            Open tournament in Tournament Manager
          </button>
        ) : null}
      </div>

      {teams.length === 0 ? (
        <div className="empty-state"><p>No teams loaded for this tournament yet.</p></div>
      ) : (
        <div className="cov-team-table-wrap">
          <table className="cov-team-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Assigned to</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const status = resolveTeamCoverageStatus(tournamentId, team.id)
                const squadPrepped = isTeamSquadPrepped(team.id)
                const teamRow = coverage.teamRows[team.id]
                return (
                  <tr key={team.id}>
                    <td className="cov-team-name">
                      <span className="cov-team-name-label">{team.name}</span>
                      {onOpenTeamPrep ? (
                        <button
                          type="button"
                          className="cov-go-team-prep-btn"
                          onClick={() => onOpenTeamPrep(team.id)}
                          title={'Open ' + team.name + ' in Tournament Manager'}
                        >
                          Prep →
                        </button>
                      ) : null}
                    </td>
                    <td>
                      <TraderPicker
                        compact
                        value={teamRow?.traderId ?? null}
                        traders={traders}
                        onChange={(id) => setTeamCoverageTrader(tournamentId, team.id, id)}
                      />
                      {!teamRow?.traderId && coverage.leadTraderId ? (
                        <span className="cov-inherits-lead">inherits lead</span>
                      ) : null}
                    </td>
                    <td>
                      <StatusPill status={status} />
                      {squadPrepped ? <span className="cov-squad-badge">Squad saved</span> : null}
                    </td>
                    <td className="cov-team-actions">
                      <button
                        type="button"
                        className="cov-mark-prepped-btn"
                        disabled={status === 'complete'}
                        onClick={() => setTeamCoverageStatus(tournamentId, team.id, 'complete')}
                      >
                        Mark prepped
                      </button>
                      {status !== 'unassigned' ? (
                        <button
                          type="button"
                          className="cov-reset-btn"
                          onClick={() => setTeamCoverageStatus(tournamentId, team.id, 'unassigned')}
                        >
                          Reset
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
