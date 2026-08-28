'use client'

import { useMemo } from 'react'
import { getTraderById } from '../data/coverageRotaStore'
import { dayOfYearUtc } from '../data/tournamentDates'
import type { CricketFormat, Gender, Tournament } from '../data/tournaments'
import type { TournamentCoveragePhase } from '../data/coverageRotaStore'
import type { ScheduleDateStatus } from '../data/tournamentSchedule2027'

export interface GanttTournamentRow {
  scheduleKey?: string
  tournament: Tournament
  format: CricketFormat
  gender: Gender
  startDate: Date
  endDate: Date
  fullStartDate?: Date
  fullEndDate?: Date
  dateStatus?: ScheduleDateStatus
  phase: TournamentCoveragePhase
  leadTraderId: string | null
  traderIds?: string[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface TournamentPrepGanttProps {
  rows: GanttTournamentRow[]
  calendarYear: number
  onSelect: (tournamentId: string) => void
}

export default function TournamentPrepGantt({ rows, calendarYear, onSelect }: TournamentPrepGanttProps) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [rows],
  )

  const isLeap = (calendarYear % 4 === 0 && calendarYear % 100 !== 0) || calendarYear % 400 === 0
  const daysInYear = isLeap ? 366 : 365

  function barStyle(start: Date, end: Date): { left: string; width: string } {
    const startDay = Math.max(1, dayOfYearUtc(start))
    const endDay = Math.min(daysInYear, Math.max(startDay + 1, dayOfYearUtc(end)))
    const left = ((startDay - 1) / daysInYear) * 100
    const width = ((endDay - startDay + 1) / daysInYear) * 100
    return { left: `${left}%`, width: `${Math.max(width, 0.4)}%` }
  }

  return (
    <div className="cov-gantt" aria-label={'Tournament calendar for ' + calendarYear}>
      <div className="cov-gantt-head">
        <span className="cov-gantt-year">{calendarYear}</span>
        <div className="cov-gantt-months">
          {MONTHS.map((month) => (
            <span key={month} className="cov-gantt-month">
              {month}
            </span>
          ))}
        </div>
      </div>
      <div className="cov-gantt-body">
        {sorted.length === 0 ? (
          <div className="empty-state"><p>No tournaments to show on the calendar.</p></div>
        ) : (
          sorted.map((row) => {
            const bar = barStyle(row.startDate, row.endDate)
            const traderNames = (row.traderIds?.length ? row.traderIds : row.leadTraderId ? [row.leadTraderId] : [])
              .map((id) => getTraderById(id)?.name)
              .filter(Boolean) as string[]
            const lead =
              traderNames.length > 1
                ? `${traderNames[0]} +${traderNames.length - 1}`
                : traderNames[0]
            const phase = row.phase === 'no_teams' ? 'in_progress' : row.phase
            const startLabel = (row.fullStartDate ?? row.startDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })
            const endLabel = (row.fullEndDate ?? row.endDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })
            const statusSuffix =
              row.dateStatus && row.dateStatus !== 'confirmed' ? ` (${row.dateStatus})` : ''
            const traderSuffix = lead ? ` · ${lead}` : ''
            return (
              <button
                key={row.scheduleKey ?? row.tournament.id}
                type="button"
                className='cov-gantt-row'
                onClick={() => onSelect(row.tournament.id)}
              >
                <span className="cov-gantt-row-label" title={row.tournament.name}>
                  {row.tournament.name}
                </span>
                <div className="cov-gantt-row-track">
                  <div className="cov-gantt-grid" aria-hidden />
                  <span
                    className={
                      'cov-gantt-bar cov-gantt-bar--' +
                      phase +
                      (row.dateStatus && row.dateStatus !== 'confirmed' ? ' cov-gantt-bar--estimated' : '')
                    }
                    style={bar}
                    title={`${row.tournament.name}: ${startLabel} - ${endLabel}${statusSuffix}${traderSuffix}`}
                  >
                    <span className="cov-gantt-bar-text">{lead ?? 'Unassigned'}</span>
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
