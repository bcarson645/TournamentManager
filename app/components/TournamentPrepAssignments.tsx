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
  getScheduleForScope,
  parseScheduleUtcDate,
  type PrepCalendarScope,
  type PrepCalendarYear,
} from '../data/tournamentSchedule2027'
import { TEAMS } from '../data/teams'
import type { PrepNavigationTarget, PrepTeamsTarget } from '../data/prepNavigation'
import {
  getCoverageRotaVersion,
  getTraders,
  getTournamentCoverage,
  getTournamentCoveragePhase,
  getTournamentCoverageSummary,
  isTraderOnTournament,
  subscribeCoverageRota,
  type CoverageStatus,
} from '../data/coverageRotaStore'
import {
  clipDatesToYear,
  daysUntil,
  formatTournamentDate,
} from '../data/tournamentDates'
import TournamentPrepGantt from './TournamentPrepGantt'
import TournamentTraderAssign from './TournamentTraderAssign'
import {
  getSquadStoreVersion,
  subscribeSquadStore,
} from '../data/squadStore'

export type { PrepNavigationTarget, PrepTeamsTarget }

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

function rowInScope(startDate: Date, endDate: Date, scope: PrepCalendarScope): boolean {
  if (scope === 'all') return true
  const y = scope
  return (
    startDate.getUTCFullYear() === y ||
    endDate.getUTCFullYear() === y ||
    startDate.getUTCFullYear() === y - 1
  )
}

function ganttYearFromScope(scope: PrepCalendarScope): PrepCalendarYear {
  return scope === 'all' ? 2026 : scope
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

interface TournamentPrepAssignmentsProps {
  standalone?: boolean
  onSelectTournament?: (target: PrepTeamsTarget) => void
  onOpenTournamentPrep?: (target: PrepNavigationTarget) => void
}

export default function TournamentPrepAssignments({
  standalone = false,
  onSelectTournament,
  onOpenTournamentPrep,
}: TournamentPrepAssignmentsProps) {
  const [view, setView] = useState<CoverageView>('timeline')
  const [calendarScope, setCalendarScope] = useState<PrepCalendarScope>('all')
  const [windowDays, setWindowDays] = useState<30 | 60 | 90 | 365>(365)
  const [formatFilter, setFormatFilter] = useState<'all' | CricketFormat>('all')
  const [traderFilter, setTraderFilter] = useState<string>('all')
  const [hideComplete, setHideComplete] = useState(false)

  const coverageVersion = useSyncExternalStore(subscribeCoverageRota, getCoverageRotaVersion, () => 0)
  const squadVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, () => 0)

  const traders = getTraders()
  const today = useMemo(() => new Date(), [])

  const scheduleEntries = useMemo(() => getScheduleForScope(calendarScope), [calendarScope])

  const allRows = useMemo(() => {
    return scheduleEntries.map((entry) => {
      const startDate = parseScheduleUtcDate(entry.startDate)
      const endDate = parseScheduleUtcDate(entry.endDate)
      const summary = getTournamentCoverageSummary(entry.id)
      const phase = getTournamentCoveragePhase(entry.id)
      const coverage = getTournamentCoverage(entry.id)
      return {
        scheduleKey: entry.id + '@' + entry.startDate,
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

  function buildGanttRowsForYear(year: PrepCalendarYear) {
    return allRows
      .filter((row) => {
        const startY = row.startDate.getUTCFullYear()
        const endY = row.endDate.getUTCFullYear()
        return startY <= year && endY >= year
      })
      .map((row) => {
        const clipped = clipDatesToYear(row.startDate, row.endDate, year)
        return {
          scheduleKey: row.scheduleKey,
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
      })
  }

  const ganttRows = useMemo(
    () => buildGanttRowsForYear(calendarScope === 'all' ? 2026 : calendarScope),
    [allRows, calendarScope],
  )

  const ganttRows2026 = useMemo(() => buildGanttRowsForYear(2026), [allRows])
  const ganttRows2027 = useMemo(() => buildGanttRowsForYear(2027), [allRows])

  function openTeamsPrep(row: (typeof allRows)[number]) {
    onSelectTournament?.({
      tournamentId: row.tournament.id,
      tournamentName: row.tournament.name,
      format: row.format,
      gender: row.gender,
      country: row.tournament.country,
    })
  }

  const timelineRows = useMemo(() => {
    let rows = allRows.filter((r) => rowInScope(r.startDate, r.endDate, calendarScope))
    if (windowDays < 365) {
      rows = rows.filter((r) => r.daysOut >= -7 && r.daysOut <= windowDays)
    }
    if (formatFilter !== 'all') rows = rows.filter((r) => r.format === formatFilter)
    if (hideComplete) rows = rows.filter((r) => r.phase !== 'complete')
    if (traderFilter !== 'all') {
      rows = rows.filter((r) => isTraderOnTournament(r.tournament.id, traderFilter))
    }
    return rows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [allRows, calendarScope, formatFilter, hideComplete, traderFilter, windowDays])

  const stats = useMemo(() => {
    const inWindow = allRows.filter((r) => {
      if (windowDays >= 365) {
        return rowInScope(r.startDate, r.endDate, calendarScope)
      }
      return r.daysOut >= 0 && r.daysOut <= windowDays
    })
    return {
      total: inWindow.length,
      unassigned: inWindow.filter((r) => r.phase === 'unassigned').length,
      inProgress: inWindow.filter((r) => r.phase === 'in_progress').length,
      complete: inWindow.filter((r) => r.phase === 'complete').length,
    }
  }, [allRows, calendarScope, windowDays])

  const traderWorkloads = useMemo(() => {
    return traders.map((trader) => {
      const tournaments = allRows.filter((row) => {
        if (row.daysOut < 0 || row.daysOut > windowDays) return false
        return isTraderOnTournament(row.tournament.id, trader.id)
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
    calendarScope === 'all'
      ? 'Full season — late 2026 Sep–Dec comps plus the 2027 FTP calendar in one view.'
      : calendarScope === 2026
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
          <span className="cov-stat-label">{windowDays >= 365 ? (calendarScope === 'all' ? 'In full season' : `In ${calendarScope}`) : `In next ${windowDays} days`}</span>
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
          <button type="button" className={'cov-tab' + (view === 'timeline' ? ' cov-tab-active' : '')} onClick={() => setView('timeline')}>
            Upcoming timeline
          </button>
          <button type="button" className={'cov-tab' + (view === 'traders' ? ' cov-tab-active' : '')} onClick={() => setView('traders')}>
            By trader
          </button>
          <button type="button" className={'cov-tab' + (view === 'gantt' ? ' cov-tab-active' : '')} onClick={() => setView('gantt')}>
            Year calendar
          </button>
        </div>
        <div className="cov-filters">
          <label className="cov-filter">
            <span>Season</span>
            <select
              value={calendarScope}
              onChange={(e) => {
                const v = e.target.value
                setCalendarScope(v === 'all' ? 'all' : (Number(v) as PrepCalendarYear))
              }}
            >
              <option value="all">All season</option>
              {PREP_CALENDAR_YEARS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="cov-filter">
            <span>Window</span>
            <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value) as 30 | 60 | 90 | 365)}>
              <option value={365}>{calendarScope === 'all' ? 'Full season' : `Full ${calendarScope} season`}</option>
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
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="cov-filter">
            <span>Trader</span>
            <select value={traderFilter} onChange={(e) => setTraderFilter(e.target.value)}>
              <option value="all">All traders</option>
              {traders.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
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
        <div className="cov-timeline">
          {timelineRows.length === 0 ? (
            <div className="empty-state">
              <p>No tournaments in the next {windowDays} days. Try widening the window or clearing filters.</p>
              <button type="button" className="cov-empty-hint" onClick={() => setWindowDays(90)}>Show next 90 days</button>
            </div>
          ) : (
            timelineRows.map((row) => (
              <article key={row.scheduleKey} className={'cov-card cov-card--' + row.phase}>
                <button type="button" className="cov-card-open" onClick={() => openTeamsPrep(row)}>
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
                  <span className="cov-card-open-hint">Teams prep →</span>
                </button>
                <div className="cov-card-traders" onClick={(e) => e.stopPropagation()}>
                  <TournamentTraderAssign tournamentId={row.tournament.id} traders={traders} compact />
                </div>
                {row.inManager && onOpenTournamentPrep ? (
                  <button
                    type="button"
                    className="cov-go-prep-btn cov-go-prep-btn--card"
                    onClick={() => onOpenTournamentPrep({ format: row.format, gender: row.gender, tournamentId: row.tournament.id })}
                  >
                    Go to prep →
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : view === 'gantt' ? (
        calendarScope === 'all' ? (
          <div className="cov-gantt-stack">
            <TournamentPrepGantt
              rows={ganttRows2026}
              calendarYear={2026}
              onSelect={(id) => {
                const row = allRows.find((r) => r.tournament.id === id)
                if (row) openTeamsPrep(row)
              }}
            />
            <TournamentPrepGantt
              rows={ganttRows2027}
              calendarYear={2027}
              onSelect={(id) => {
                const row = allRows.find((r) => r.tournament.id === id)
                if (row) openTeamsPrep(row)
              }}
            />
          </div>
        ) : (
          <TournamentPrepGantt
            rows={ganttRows}
            calendarYear={calendarScope}
            onSelect={(id) => {
              const row = allRows.find((r) => r.tournament.id === id)
              if (row) openTeamsPrep(row)
            }}
          />
        )
      ) : (
        <div className="cov-traders-layout">
          {availableTraders.length > 0 ? (
            <section className="cov-available">
              <h2 className="cov-section-title">Available to pick up</h2>
              <p className="cov-section-sub">No assignments in the next {windowDays} days — good candidates for new comps.</p>
              <div className="cov-trader-chips">
                {availableTraders.map(({ trader }) => (
                  <span key={trader.id} className="cov-trader-chip cov-trader-chip--free">{trader.name}</span>
                ))}
              </div>
            </section>
          ) : null}
          <div className="cov-trader-grid">
            {traderWorkloads.filter((w) => w.tournaments.length > 0).map(({ trader, tournaments, teamCount }) => (
              <article key={trader.id} className="cov-trader-card">
                <header className="cov-trader-card-head">
                  <h2 className="cov-trader-card-name">{trader.name}</h2>
                  <span className="cov-trader-card-count">
                    {tournaments.length} comp{tournaments.length === 1 ? '' : 's'} · {teamCount} team{teamCount === 1 ? '' : 's'}
                  </span>
                </header>
                <ul className="cov-trader-list">
                  {tournaments.map((row) => {
                    const isLead = row.coverage.leadTraderId === trader.id
                    const onTournament = row.coverage.traderIds.includes(trader.id)
                    const roleLabel = isLead ? 'Lead' : onTournament ? 'Tournament' : 'Team coverage'
                    return (
                      <li key={row.scheduleKey} className="cov-trader-list-item">
                        <button type="button" className="cov-trader-list-item-btn" onClick={() => openTeamsPrep(row)}>
                          <span className="cov-trader-list-item-main">
                            <strong>{row.tournament.name}</strong>
                            <span className="cov-trader-list-meta">
                              {formatTournamentDate(row.startDate)} · {roleLabel}
                            </span>
                          </span>
                          <StatusPill status={row.phase === 'complete' ? 'complete' : row.phase === 'unassigned' ? 'unassigned' : 'in_progress'} />
                          <span className="cov-trader-list-item-hint">Teams prep →</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </div>
          {traderWorkloads.every((w) => w.tournaments.length === 0) ? (
            <div className="empty-state"><p>No trader assignments yet. Use the timeline to claim upcoming tournaments.</p></div>
          ) : null}
        </div>
      )}
    </section>
  )
}
