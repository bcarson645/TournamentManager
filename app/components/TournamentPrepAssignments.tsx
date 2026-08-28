'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  FORMATS,
  GENDERS,
  getAllTournamentEntries,
  type CricketFormat,
  type Gender,
} from '../data/tournaments'
import {
  PREP_CALENDAR_YEARS,
  getScheduleForYear,
  parseScheduleUtcDate,
  type PrepCalendarYear,
} from '../data/tournamentSchedule2027'
import { TEAMS } from '../data/teams'
import {
  getCoverageRotaVersion,
  getTraderById,
  getTraders,
  getTournamentCoverage,
  getTournamentCoveragePhase,
  getTournamentCoverageSummary,
  isTraderOnTournament,
  subscribeCoverageRota,
  type CoverageStatus,
  type Trader,
} from '../data/coverageRotaStore'
import {
  clipDatesToYear,
  daysUntil,
  formatTournamentDate,
} from '../data/tournamentDates'
import TournamentPrepTeamPanel from './TournamentPrepTeamPanel'
import TournamentPrepGantt from './TournamentPrepGantt'
import TournamentTraderAssign from './TournamentTraderAssign'
import {
  getSquadStoreVersion,
  subscribeSquadStore,
} from '../data/squadStore'

type CoverageView = 'timeline' | 'traders' | 'gantt'

const STATUS_LABELS: Record<CoverageStatus, string> = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  in_progress: 'In progress',
  complete: 'Complete',
}

const MANAGER_TOURNAMENT_IDS = new Set(
  getAllTournamentEntries().map((entry) => entry.tournament.id),
)

function formatLabel(format: CricketFormat): string {
  return FORMATS.find((f) => f.key === format)?.label ?? format
}

function genderLabel(gender: Gender): string {
  return GENDERS.find((g) => g.key === gender)?.label ?? gender
}

function StatusPill({ status }: { status: CoverageStatus }) {
  return <span className={'cov-status-pill cov-status-pill--' + status}>{STATUS_LABELS[status]}</span>
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="cov-progress" aria-label={`${done} of ${total} teams complete`}>
      <div className="cov-progress-track">
        <div className="cov-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="cov-progress-label">
        {done}/{total} teams
      </span>
    </div>
  )
}

export type PrepNavigationTarget = {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  teamId?: string
}

interface TournamentPrepAssignmentsProps {
  standalone?: boolean
  onOpenTournamentPrep?: (target: PrepNavigationTarget) => void
}

function teamPanelProps(
  row: {
    format: CricketFormat
    gender: Gender
    tournament: { id: string; name: string; country?: string }
    coverage: { leadTraderId: string | null }
  },
  traders: Trader[],
  onClose: () => void,
  onOpenTournamentPrep?: (target: PrepNavigationTarget) => void,
) {
  const inManager = MANAGER_TOURNAMENT_IDS.has(row.tournament.id)
  return {
    tournamentId: row.tournament.id,
    tournamentName: row.tournament.name,
    meta: `${formatLabel(row.format)} · ${genderLabel(row.gender)}${row.tournament.country ? ` · ${row.tournament.country}` : ''}`,
    leadTraderId: row.coverage.leadTraderId,
    traders,
    onClose,
    canOpenInManager: inManager && Boolean(onOpenTournamentPrep),
    onOpenTournamentPrep:
      inManager && onOpenTournamentPrep
        ? () =>
            onOpenTournamentPrep({
              format: row.format,
              gender: row.gender,
              tournamentId: row.tournament.id,
            })
        : undefined,
    onOpenTeamPrep:
      inManager && onOpenTournamentPrep
        ? (teamId: string) =>
            onOpenTournamentPrep({
              format: row.format,
              gender: row.gender,
              tournamentId: row.tournament.id,
              teamId,
            })
        : undefined,
  }
}

export default function TournamentPrepAssignments({
  standalone = false,
  onOpenTournamentPrep,
}: TournamentPrepAssignmentsProps) {
  const [view, setView] = useState<CoverageView>('timeline')
  const [calendarYear, setCalendarYear] = useState<PrepCalendarYear>(2026)
  const [windowDays, setWindowDays] = useState<30 | 60 | 90 | 365>(365)
  const [formatFilter, setFormatFilter] = useState<'all' | CricketFormat>('all')
  const [traderFilter, setTraderFilter] = useState<string>('all')
  const [hideComplete, setHideComplete] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)

  const coverageVersion = useSyncExternalStore(subscribeCoverageRota, getCoverageRotaVersion, () => 0)
  const squadVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, () => 0)

  const traders = getTraders()
  const today = useMemo(() => new Date(), [])

  const scheduleEntries = useMemo(() => getScheduleForYear(calendarYear), [calendarYear])

  const allRows = useMemo(() => {
    return scheduleEntries.map((entry) => {
      const startDate = parseScheduleUtcDate(entry.startDate)
      const endDate = parseScheduleUtcDate(entry.endDate)
      const summary = getTournamentCoverageSummary(entry.id)
      const phase = getTournamentCoveragePhase(entry.id)
      const coverage = getTournamentCoverage(entry.id)
      return {
        format: entry.format,
        gender: entry.gender,
        tournament: { id: entry.id, name: entry.name, country: entry.country },
        category: entry.category,
        dateStatus: entry.dateStatus,
        scheduleNotes: entry.notes,
        startDate,
        endDate,
        daysOut: daysUntil(startDate, today),
        summary,
        phase,
        coverage,
        inManager: MANAGER_TOURNAMENT_IDS.has(entry.id),
      }
    })
  }, [scheduleEntries, today, coverageVersion, squadVersion])

  const ganttRows = useMemo(
    () =>
      allRows.map((row) => {
        const clipped = clipDatesToYear(row.startDate, row.endDate, calendarYear)
        return {
          tournament: row.tournament,
          format: row.format,
          gender: row.gender,
          startDate: clipped.start,
          endDate: clipped.end,
          fullStartDate: row.startDate,
          fullEndDate: row.endDate,
          dateStatus: row.dateStatus,
          phase: row.phase,
          leadTraderId: row.coverage.leadTraderId,
          traderIds: row.coverage.traderIds,
        }
      }),
    [allRows, calendarYear],
  )

  const selectedRow = useMemo(
    () => allRows.find((row) => row.tournament.id === selectedTournamentId) ?? null,
    [allRows, selectedTournamentId],
  )

  const timelineRows = useMemo(() => {
    let rows = allRows.filter((r) => {
      const y = calendarYear
      return (
        r.startDate.getUTCFullYear() === y ||
        r.endDate.getUTCFullYear() === y ||
        r.startDate.getUTCFullYear() === y - 1
      )
    })
    if (windowDays < 365) {
      rows = rows.filter((r) => r.daysOut >= -7 && r.daysOut <= windowDays)
    }
    if (formatFilter !== 'all') rows = rows.filter((r) => r.format === formatFilter)
    if (hideComplete) rows = rows.filter((r) => r.phase !== 'complete')
    if (traderFilter !== 'all') {
      rows = rows.filter((r) => {
        if (isTraderOnTournament(r.tournament.id, traderFilter)) return true
        return false
      })
    }
    return rows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [allRows, calendarYear, formatFilter, hideComplete, traderFilter, windowDays])

  const stats = useMemo(() => {
    const inWindow = allRows.filter((r) => {
      if (windowDays >= 365) {
        const y = calendarYear
        return r.startDate.getUTCFullYear() === y || r.endDate.getUTCFullYear() === y
      }
      return r.daysOut >= 0 && r.daysOut <= windowDays
    })
    return {
      total: inWindow.length,
      unassigned: inWindow.filter((r) => r.phase === 'unassigned').length,
      inProgress: inWindow.filter((r) => r.phase === 'in_progress').length,
      complete: inWindow.filter((r) => r.phase === 'complete').length,
    }
  }, [allRows, calendarYear, windowDays])

  const traderWorkloads = useMemo(() => {
    return traders.map((trader) => {
      const tournaments = allRows.filter((row) => {
        if (row.daysOut < 0 || row.daysOut > windowDays) return false
        if (isTraderOnTournament(row.tournament.id, trader.id)) return true
        return false
      })
      const teamCount = tournaments.reduce((sum, row) => {
        const teams = TEAMS[row.tournament.id] ?? []
        return (
          sum +
          teams.filter((team) => {
            const teamRow = row.coverage.teamRows[team.id]
            return teamRow?.traderId === trader.id || (!teamRow?.traderId && row.coverage.leadTraderId === trader.id)
          }).length
        )
      }, 0)
      return { trader, tournaments, teamCount }
    })
  }, [allRows, traders, windowDays])

  const availableTraders = traderWorkloads.filter((w) => w.tournaments.length === 0)

  const scheduleSubtitle =
    calendarYear === 2026
      ? 'Late 2026 season — ETPL, CPL, World Cup build-up, and other Sep–Dec comps from the FTP calendar.'
      : '2027 FTP schedule — ICC events, bilateral series, and franchise leagues.'

  return (
    <section className={'tm-prep-assignments cov-section' + (standalone ? ' tm-prep-assignments--standalone' : '')} aria-label="Prep assignments">
      <header className="tm-prep-assignments-head">
        {standalone ? (
          <h1 className="page-heading tm-prep-assignments-title">Prep assignments</h1>
        ) : (
          <h2 className="tm-prep-assignments-title">Prep assignments</h2>
        )}
        <p className="tm-prep-assignments-sub">{scheduleSubtitle} Assign traders and track team prep.</p>
      </header>

      <div className="cov-stats">
        <div className="cov-stat">
          <span className="cov-stat-value">{stats.total}</span>
          <span className="cov-stat-label">{windowDays >= 365 ? `In ${calendarYear}` : `In next ${windowDays} days`}</span>
        </div>
        <div className="cov-stat cov-stat--warn">
          <span className="cov-stat-value">{stats.unassigned}</span>
          <span className="cov-stat-label">Unassigned</span>
        </div>
        <div className="cov-stat cov-stat--active">
          <span className="cov-stat-value">{stats.inProgress}</span>
          <span className="cov-stat-label">In progress</span>
        </div>
        <div className="cov-stat cov-stat--done">
          <span className="cov-stat-value">{stats.complete}</span>
          <span className="cov-stat-label">Complete</span>
        </div>
      </div>

      <div className="cov-toolbar">
        <div className="cov-tabs">
          <button
            type="button"
            className={'cov-tab' + (view === 'timeline' ? ' cov-tab-active' : '')}
            onClick={() => setView('timeline')}
          >
            Upcoming timeline
          </button>
          <button
            type="button"
            className={'cov-tab' + (view === 'traders' ? ' cov-tab-active' : '')}
            onClick={() => setView('traders')}
          >
            By trader
          </button>
          <button
            type="button"
            className={'cov-tab' + (view === 'gantt' ? ' cov-tab-active' : '')}
            onClick={() => setView('gantt')}
          >
            Year calendar
          </button>
        </div>
        <div className="cov-filters">
          <label className="cov-filter">
            <span>Season</span>
            <select
              value={calendarYear}
              onChange={(e) => {
                setCalendarYear(Number(e.target.value) as PrepCalendarYear)
                setSelectedTournamentId(null)
              }}
            >
              {PREP_CALENDAR_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="cov-filter">
            <span>Window</span>
            <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value) as 30 | 60 | 90 | 365)}>
              <option value={365}>Full {calendarYear} season</option>
              <option value={90}>Next 90 days</option>
              <option value={60}>Next 60 days</option>
              <option value={30}>Next 30 days</option>
            </select>
          </label>
          <label className="cov-filter">
            <span>Format</span>
            <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value as 'all' | CricketFormat)}>
              <option value="all">All formats</option>
              {FORMATS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cov-filter">
            <span>Trader</span>
            <select value={traderFilter} onChange={(e) => setTraderFilter(e.target.value)}>
              <option value="all">All traders</option>
              {traders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="cov-filter cov-filter-check">
            <input type="checkbox" checked={hideComplete} onChange={(e) => setHideComplete(e.target.checked)} />
            Hide complete
          </label>
        </div>
      </div>

      {view === 'timeline' ? (
        <div className="cov-main-stage">
          <div className="cov-timeline">
            {timelineRows.length === 0 ? (
              <div className="empty-state">
                <p>No tournaments in the next {windowDays} days. Try widening the window or clearing filters.</p>
                <button type="button" className="cov-empty-hint" onClick={() => setWindowDays(90)}>
                  Show next 90 days
                </button>
              </div>
            ) : (
              timelineRows.map((row) => {
                const isSelected = selectedTournamentId === row.tournament.id
                return (
                  <article
                    key={row.tournament.id}
                    className={'cov-card cov-card--' + row.phase + (isSelected ? ' cov-card--selected' : '')}
                  >
                    <button
                      type="button"
                      className="cov-card-open"
                      onClick={() => setSelectedTournamentId(row.tournament.id)}
                    >
                      <div className="cov-card-when">
                        <span className="cov-card-date">{formatTournamentDate(row.startDate)}</span>
                        <span className="cov-card-days">
                          {row.daysOut === 0 ? 'Today' : row.daysOut === 1 ? 'Tomorrow' : `In ${row.daysOut} days`}
                        </span>
                      </div>
                      <div className="cov-card-main">
                        <h2 className="cov-card-title">{row.tournament.name}</h2>
                        <p className="cov-card-meta">
                          {formatLabel(row.format)} · {genderLabel(row.gender)}
                          {row.tournament.country ? ` · ${row.tournament.country}` : ''}
                          {row.dateStatus !== 'confirmed' ? ` · ${row.dateStatus === 'estimated' ? 'Est.' : 'TBC'}` : ''}
                        </p>
                        <ProgressBar done={row.summary.completeTeams} total={row.summary.totalTeams} />
                      </div>
                      <span className="cov-card-open-hint">View teams →</span>
                    </button>
                    <div className="cov-card-traders">
                      <TournamentTraderAssign tournamentId={row.tournament.id} traders={traders} compact />
                    </div>
                    {row.inManager && onOpenTournamentPrep ? (
                      <button
                        type="button"
                        className="cov-go-prep-btn cov-go-prep-btn--card"
                        onClick={() =>
                          onOpenTournamentPrep({
                            format: row.format,
                            gender: row.gender,
                            tournamentId: row.tournament.id,
                          })
                        }
                      >
                        Go to prep →
                      </button>
                    ) : null}
                  </article>
                )
              })
            )}
          </div>
          {selectedRow ? (
            <div className="cov-team-overlay" role="dialog" aria-modal="true" aria-label={selectedRow.tournament.name + ' teams'}>
              <TournamentPrepTeamPanel
                {...teamPanelProps(selectedRow, traders, () => setSelectedTournamentId(null), onOpenTournamentPrep)}
              />
            </div>
          ) : null}
        </div>
      ) : view === 'gantt' ? (
        <div className="cov-main-stage">
          <TournamentPrepGantt
            rows={ganttRows}
            selectedId={selectedTournamentId}
            calendarYear={calendarYear}
            onSelect={(id) => setSelectedTournamentId(id)}
          />
          {selectedRow ? (
            <div className="cov-team-overlay" role="dialog" aria-modal="true" aria-label={selectedRow.tournament.name + ' teams'}>
              <TournamentPrepTeamPanel
                {...teamPanelProps(selectedRow, traders, () => setSelectedTournamentId(null), onOpenTournamentPrep)}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="cov-traders-layout">
          {availableTraders.length > 0 ? (
            <section className="cov-available">
              <h2 className="cov-section-title">Available to pick up</h2>
              <p className="cov-section-sub">No assignments in the next {windowDays} days — good candidates for new comps.</p>
              <div className="cov-trader-chips">
                {availableTraders.map(({ trader }) => (
                  <span key={trader.id} className="cov-trader-chip cov-trader-chip--free">
                    {trader.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          <div className="cov-trader-grid">
            {traderWorkloads
              .filter((w) => w.tournaments.length > 0)
              .map(({ trader, tournaments, teamCount }) => (
                <article key={trader.id} className="cov-trader-card">
                  <header className="cov-trader-card-head">
                    <h2 className="cov-trader-card-name">{trader.name}</h2>
                    <span className="cov-trader-card-count">
                      {tournaments.length} comp{tournaments.length === 1 ? '' : 's'} · {teamCount} team
                      {teamCount === 1 ? '' : 's'}
                    </span>
                  </header>
                  <ul className="cov-trader-list">
                    {tournaments.map((row) => {
                      const isLead = row.coverage.leadTraderId === trader.id
                      const onTournament = row.coverage.traderIds.includes(trader.id)
                      const roleLabel = isLead ? 'Lead' : onTournament ? 'Tournament' : 'Team coverage'
                      return (
                        <li key={row.tournament.id} className="cov-trader-list-item">
                          <div>
                            <strong>{row.tournament.name}</strong>
                            <span className="cov-trader-list-meta">
                              {formatTournamentDate(row.startDate)} · {roleLabel}
                            </span>
                          </div>
                          <StatusPill status={row.phase === 'complete' ? 'complete' : row.phase === 'unassigned' ? 'unassigned' : 'in_progress'} />
                        </li>
                      )
                    })}
                  </ul>
                </article>
              ))}
          </div>
          {traderWorkloads.every((w) => w.tournaments.length === 0) ? (
            <div className="empty-state">
              <p>No trader assignments yet. Use the timeline to claim upcoming tournaments.</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
