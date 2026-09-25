'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  buildRosterGameList,
  buildTraderMonthRoleGrid,
  buildTraderRosterFromSchedule,
  buildWhosOnDayLayout,
  buildWhosOnMonthGrid,
  COVERAGE_NUMBERS_BY_TOURNAMENT,
  COVERAGE_NUMBERS_BY_TRADER,
  IMPORT_COLUMN_MAP,
  OPS_ALERTS,
  getTournamentByCode,
  HISTORIC_SEASONS,
  IMPORT_SOURCE,
  SCHEDULE_DAYS,
  SCHEDULING_SUGGESTIONS,
  type SelectedMatchContext,
  findFixtureById,
  type FixtureAssignmentPatch,
  type FixtureLifecycleAction,
  type Persona,
  type ScheduleDay,
  type TraderMonthRoleGrid,
  type TraderMonthRoleId,
  type TraderMonthRoleTask,
  type WhosOnDayEvent,
  type WhosOnDayLayout,
  type WhosOnMonthGrid,
  type WhosOnMonthGridCell,
  type ScheduleContentFilters,
  type ScheduleListMode,
  type StatusFilter,
} from '../../data/coverageScheduleStore'
import { FixtureCard, PanelCard, ScheduleMatchSplit, StatTile, WeekScheduleLayout } from './CoverageShared'
import type { WhosOnViewMode } from './CoverageScheduleToolbar'

const WHOS_ON_HOUR_HEIGHT = 38

export function WeekScheduleView({
  persona,
  statusFilter,
  listMode,
  contentFilters,
  onOpenTournament,
  days = SCHEDULE_DAYS,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  persona: Persona
  statusFilter: StatusFilter
  listMode?: ScheduleListMode
  contentFilters?: ScheduleContentFilters
  onOpenTournament?: (code: string) => void
  days?: ScheduleDay[]
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
}) {
  return (
    <WeekScheduleLayout
      persona={persona}
      statusFilter={statusFilter}
      listMode={listMode}
      contentFilters={contentFilters}
      days={days}
      onOpenTournament={onOpenTournament}
      onUpdateAssignment={onUpdateAssignment}
      onMarkLifecycle={onMarkLifecycle}
    />
  )
}

function TraderMonthRoleGridView({
  grid,
  selectedFixtureId,
  onSelectTask,
}: {
  grid: TraderMonthRoleGrid
  selectedFixtureId: string | null
  onSelectTask: (ctx: SelectedMatchContext) => void
}) {
  const colTemplate = `4.5rem repeat(${grid.days.length}, minmax(3.25rem, 1fr))`

  return (
    <section className="cov-myrotamonth">
      <header className="cov-myrotamonth-head">
        <strong className="cov-myrotamonth-title">{grid.monthLabel}</strong>
        <span className="cov-muted">{grid.stats.daysWithAssignments} day{grid.stats.daysWithAssignments !== 1 ? 's' : ''} with assignments</span>
      </header>
      <div className="cov-myrotamonth-scroll">
        <div className="cov-myrotamonth-grid" style={{ gridTemplateColumns: colTemplate }}>
          <div className="cov-myrotamonth-corner" />
          {grid.days.map((day) => (
            <div
              key={day.date}
              className={
                'cov-myrotamonth-day-head' +
                (day.isWeekend ? ' cov-myrotamonth-day-head--weekend' : '') +
                (!day.inScheduleRange ? ' cov-myrotamonth-day-head--off-range' : '')
              }
            >
              <span className="cov-myrotamonth-day-weekday">{day.weekdayShort}</span>
              <span className="cov-myrotamonth-day-num">{day.dayOfMonth}</span>
            </div>
          ))}

          {grid.rows.map((row) => (
            <Fragment key={row.id}>
              <div className={'cov-myrotamonth-row-label cov-myrotamonth-row-label--' + row.id}>
                {row.label}
              </div>
              {grid.days.map((day) => {
                const tasks = row.cells[day.date] ?? []
                return (
                  <div
                    key={`${row.id}-${day.date}`}
                    className={
                      'cov-myrotamonth-cell' +
                      ` cov-myrotamonth-cell--${row.id}` +
                      (day.isWeekend ? ' cov-myrotamonth-cell--weekend' : '') +
                      (!day.inScheduleRange ? ' cov-myrotamonth-cell--off-range' : '')
                    }
                  >
                    {tasks.length === 0 ? (
                      row.id === 'training' || row.id === 'data'
                        ? <span className="cov-myrotamonth-empty">—</span>
                        : null
                    ) : (
                      <div className="cov-myrotamonth-tasks">
                        {tasks.map((task) => (
                          <TraderMonthRoleTaskChip
                            key={task.id}
                            task={task}
                            role={row.id}
                            selected={Boolean(task.ctx && selectedFixtureId === task.ctx.fixture.id)}
                            onSelect={() => {
                              if (task.ctx) onSelectTask(task.ctx)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

function TraderMonthRoleTaskChip({
  task,
  role,
  selected,
  onSelect,
}: {
  task: TraderMonthRoleTask
  role: TraderMonthRoleId
  selected: boolean
  onSelect: () => void
}) {
  const clickable = Boolean(task.ctx)

  if (!clickable) {
    return (
      <span className={'cov-myrotamonth-task cov-myrotamonth-task--' + role + ' cov-myrotamonth-task--static'}>
        <span className="cov-myrotamonth-task-match">{task.match}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={
        'cov-myrotamonth-task' +
        ` cov-myrotamonth-task--${role}` +
        (selected ? ' cov-myrotamonth-task--selected' : '')
      }
      data-fixture-id={task.ctx?.fixture.id}
      title={`${task.code} · ${task.match} · ${task.time}`}
      onClick={onSelect}
    >
      <span className="cov-myrotamonth-task-time">{task.time}</span>
      <span className="cov-myrotamonth-task-code">{task.code}</span>
      <span className="cov-myrotamonth-task-match">{task.match}</span>
    </button>
  )
}

export function MyRotaView({
  traderName,
  persona = 'trader',
  year,
  month,
  onGoToSchedule,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  traderName: string
  persona?: Persona
  year: number
  month: number
  onGoToSchedule?: () => void
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
}) {
  const [selected, setSelected] = useState<SelectedMatchContext | null>(null)

  const monthGrid = useMemo(
    () => buildTraderMonthRoleGrid(traderName, year, month),
    [traderName, year, month],
  )

  const mainContent = (
    <div className="cov-view-stack cov-view-stack--schedule">
      <div className="cov-my-rota-head">
        <div className="cov-my-rota-head-start">
          <div>
            <strong className="cov-my-rota-name">{traderName}</strong>
            <p className="cov-muted">My rota — month view by role</p>
          </div>
          <div className="cov-stats cov-stats--compact cov-stats--header">
            <StatTile label="Days on" value={monthGrid.stats.daysWithAssignments} tone="done" />
            <StatTile label="Trading" value={monthGrid.stats.tradingCount} tone="done" />
            <StatTile label="Prep" value={monthGrid.stats.prepCount} tone="active" />
            <StatTile label="Data" value={monthGrid.stats.dataCount} tone={monthGrid.stats.dataCount > 0 ? 'active' : undefined} />
            <StatTile label="Lead days" value={monthGrid.stats.leadDays} tone={monthGrid.stats.leadDays > 0 ? 'active' : undefined} />
          </div>
        </div>
        <div className="cov-schedule-toolbar-actions">
          <button type="button" className="cov-btn" onClick={onGoToSchedule}>Full schedule</button>
        </div>
      </div>

      <div className="cov-roster-cal-legend cov-roster-cal-legend--compact">
        <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--trading" /> Trading</span>
        <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--prep" /> Prep</span>
        <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--data" /> Data</span>
        <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--lead" /> Lead</span>
        <span className="cov-muted">Click a match to open details · SRL hidden</span>
      </div>

      <TraderMonthRoleGridView
        grid={monthGrid}
        selectedFixtureId={selected?.fixture.id ?? null}
        onSelectTask={setSelected}
      />
    </div>
  )

  return (
    <ScheduleMatchSplit
      selected={selected}
      persona={persona ?? 'trader'}
      onClose={() => setSelected(null)}
      onUpdateAssignment={(patch) => {
        if (!selected) return
        onUpdateAssignment?.(selected.fixture.id, patch)
        const refreshed = findFixtureById(selected.fixture.id)
        if (refreshed) setSelected(refreshed)
      }}
      onMarkLifecycle={(action) => {
        if (!selected) return
        onMarkLifecycle?.(selected.fixture.id, action)
        const refreshed = findFixtureById(selected.fixture.id)
        if (refreshed) setSelected(refreshed)
      }}
    >
      {mainContent}
    </ScheduleMatchSplit>
  )
}

export function CoverageNumbersView({ onBack }: { onBack: () => void }) {
  const maxGames = Math.max(...COVERAGE_NUMBERS_BY_TRADER.map((t) => t.games))
  return (
    <div className="cov-view-stack">
      <div className="cov-view-head">
        <h3 className="cov-view-title">Coverage numbers</h3>
        <button type="button" className="cov-btn" onClick={onBack}>← Back to schedule</button>
      </div>
      <p className="cov-muted">Analytics vs previous years — not on the daily schedule.</p>
      <div className="cov-two-col">
        <PanelCard title="Coverage by trader (Aug 2026)">
          <div className="cov-hbar-chart">
            {COVERAGE_NUMBERS_BY_TRADER.map((t) => (
              <div key={t.name} className="cov-hbar-row">
                <span>{t.name}</span>
                <div className="cov-hbar-track"><div className="cov-hbar-fill" style={{ width: `${(t.games / maxGames) * 100}%` }} /></div>
                <span>{t.games}</span>
              </div>
            ))}
          </div>
        </PanelCard>
        <PanelCard title="Tournament coverage Δ vs last year">
          <table className="cov-table">
            <thead><tr><th>Tournament</th><th>2026</th><th>2025</th><th>Δ</th><th>Trend</th></tr></thead>
            <tbody>
              {COVERAGE_NUMBERS_BY_TOURNAMENT.map((row) => (
                <tr key={row.name}><td>{row.name}</td><td>{row.y2026}</td><td>{row.y2025}</td><td>{row.delta}</td><td>{row.trend}</td></tr>
              ))}
            </tbody>
          </table>
        </PanelCard>
      </div>
    </div>
  )
}

export function ImportView({
  onBack,
  onOpenReplicateSeason,
}: {
  onBack: () => void
  onOpenReplicateSeason?: () => void
}) {
  const [step, setStep] = useState(0)
  const steps = ['Upload', 'Map columns', 'Preview', 'Import']
  return (
    <div className="cov-view-stack">
      <div className="cov-view-head">
        <h3 className="cov-view-title">Add fixtures</h3>
        <div className="cov-panel-card-actions">
          {onOpenReplicateSeason ? (
            <button type="button" className="cov-btn" onClick={onOpenReplicateSeason}>Replicate season</button>
          ) : null}
          <button type="button" className="cov-btn" onClick={onBack}>← Cancel</button>
        </div>
      </div>
      <div className="cov-tabs">
        {steps.map((label, i) => (
          <button key={label} type="button" className={'cov-tab' + (step === i ? ' cov-tab-active' : '')} onClick={() => setStep(i)}>{i + 1}. {label}</button>
        ))}
      </div>
      {step === 0 ? (
        <PanelCard title="Upload Coverage Schedule 2.2.xlsm">
          <p className="cov-muted">Drop the Excel workbook — we read the Matches / Copy sheet.</p>
          <div className="cov-import-dropzone">Drop file here or browse…</div>
          <button type="button" className="cov-btn cov-btn--primary" onClick={() => setStep(1)}>Continue</button>
        </PanelCard>
      ) : null}
      {step === 1 ? (
        <PanelCard title="Map columns">
          <table className="cov-table">
            <thead><tr><th>Excel column</th><th>Maps to</th><th>Status</th></tr></thead>
            <tbody>
              {IMPORT_COLUMN_MAP.map((row) => (
                <tr key={row.excel}><td>{row.excel}</td><td>{row.mapsTo}</td><td><span className="cov-chip cov-chip--success">Matched</span></td></tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="cov-btn cov-btn--primary" onClick={() => setStep(2)}>Preview import</button>
        </PanelCard>
      ) : null}
      {step >= 2 ? (
        <PanelCard title="Preview — imported schedule">
          <p className="cov-muted">
            Loaded {IMPORT_SOURCE.fixtureCount} fixtures across {IMPORT_SOURCE.dayCount} days from sheet &quot;{IMPORT_SOURCE.sheet}&quot;.
          </p>
          <button type="button" className="cov-btn cov-btn--primary" onClick={onBack}>Use imported schedule</button>
        </PanelCard>
      ) : null}
    </div>
  )
}

export function OpsAlertsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="cov-view-stack">
      <div className="cov-view-head">
        <h3 className="cov-view-title">Ops alerts</h3>
        <button type="button" className="cov-btn" onClick={onBack}>← Back to schedule</button>
      </div>
      <div className="cov-alerts-list">
        {OPS_ALERTS.map((alert) => (
          <article key={alert.title} className={`cov-alert cov-alert--${alert.tone}`}>
            <strong>{alert.title}</strong>
            <p>{alert.detail}</p>
            <button type="button" className="cov-btn cov-btn--primary">{alert.action}</button>
          </article>
        ))}
      </div>
      <PanelCard title="Suggested for trading — ranked">
        {SCHEDULING_SUGGESTIONS.map((s, i) => (
          <div key={s.trader} className={'cov-suggestion' + (i === 0 ? ' cov-suggestion--top' : '')}>
            <strong>#{i + 1} {s.trader}</strong>
            {s.senior ? <span className="cov-chip cov-chip--success">Senior</span> : null}
            <span className="cov-chip cov-chip--info">Score {s.score}</span>
            <p className="cov-muted">{s.reasons.join(' · ')}</p>
          </div>
        ))}
      </PanelCard>
    </div>
  )
}

function WhosOnDayEventBar({
  event,
  timelineDurationMinutes,
  gridHeight,
  selected,
  onSelect,
}: {
  event: WhosOnDayEvent
  timelineDurationMinutes: number
  gridHeight: number
  selected: boolean
  onSelect: () => void
}) {
  const top = (event.startOffset / timelineDurationMinutes) * gridHeight
  const height = Math.max(
    ((event.endOffset - event.startOffset) / timelineDurationMinutes) * gridHeight,
    20,
  )
  const { fixture, tournament } = event.ctx
  const roleLabel = event.role === 'prep' ? 'Prep' : event.role === 'unassigned' ? 'Unassigned' : 'Trading'

  return (
    <button
      type="button"
      className={
        'cov-whoson-bar' +
        ` cov-whoson-bar--${event.role}` +
        (selected ? ' cov-whoson-bar--selected' : '') +
        (event.continuesFromPriorDay ? ' cov-whoson-bar--continued' : '') +
        (event.continuesIntoNextDay ? ' cov-whoson-bar--spills' : '')
      }
      style={{ top: `${top}px`, height: `${height}px` }}
      title={`${roleLabel}: ${fixture.match} (${tournament.code})`}
      onClick={onSelect}
    >
      <span className="cov-whoson-bar-code">{tournament.code}</span>
      <span className="cov-whoson-bar-match">{fixture.match}</span>
      <span className="cov-whoson-bar-role">{roleLabel}</span>
    </button>
  )
}

function WhosOnDayGantt({
  layout,
  selectedFixtureId,
  onSelectEvent,
}: {
  layout: WhosOnDayLayout
  selectedFixtureId: string | null
  onSelectEvent: (ctx: SelectedMatchContext) => void
}) {
  const timelineDurationMinutes = layout.timelineDurationHours * 60
  const gridHeight = layout.timelineDurationHours * WHOS_ON_HOUR_HEIGHT
  const colCount = Math.max(layout.columns.length, 1)
  const colTemplate = `3.25rem repeat(${colCount}, minmax(6.5rem, 1fr))`
  const midnightOffset = (24 - layout.timelineStartHour) * 60

  return (
    <div className="cov-whoson-scroll">
      <div className="cov-whoson-grid-wrap">
        <div className="cov-whoson-header" style={{ gridTemplateColumns: colTemplate }}>
          <div className="cov-whoson-corner" />
          {layout.columns.map((col) => (
            <div
              key={col.id}
              className={
                'cov-whoson-trader-head' +
                (col.isUnassigned ? ' cov-whoson-trader-head--unassigned' : '') +
                (col.isLead ? ' cov-whoson-trader-head--lead' : '') +
                (!col.isUnassigned && !col.isOnShift ? ' cov-whoson-trader-head--off' : '')
              }
            >
              <span className="cov-whoson-trader-name">{col.label}</span>
              {col.isLead ? <span className="cov-chip cov-chip--info cov-whoson-lead-badge">Lead</span> : null}
              {!col.isUnassigned && !col.isOnShift ? (
                <span className="cov-chip cov-chip--neutral cov-whoson-off-badge">Off</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="cov-whoson-body" style={{ gridTemplateColumns: colTemplate, height: gridHeight }}>
          <div className="cov-whoson-times" style={{ height: gridHeight }}>
            {layout.hourLabels.map(({ offsetMinutes, label }) => (
              <div
                key={offsetMinutes}
                className="cov-whoson-time-label"
                style={{ top: (offsetMinutes / timelineDurationMinutes) * gridHeight }}
              >
                {label}
              </div>
            ))}
          </div>
          {layout.columns.map((col) => (
            <div
              key={col.id}
              className={
                'cov-whoson-trader-col' +
                (!col.isUnassigned && !col.isOnShift ? ' cov-whoson-trader-col--off' : '')
              }
              style={{ height: gridHeight }}
            >
              <div
                className="cov-whoson-midnight-line"
                style={{ top: (midnightOffset / timelineDurationMinutes) * gridHeight }}
              />
              {layout.hourLabels.map(({ offsetMinutes }) => (
                <div
                  key={offsetMinutes}
                  className="cov-whoson-hour-line"
                  style={{ top: (offsetMinutes / timelineDurationMinutes) * gridHeight }}
                />
              ))}
              {col.events.map((event) => (
                <WhosOnDayEventBar
                  key={event.segmentId}
                  event={event}
                  timelineDurationMinutes={timelineDurationMinutes}
                  gridHeight={gridHeight}
                  selected={selectedFixtureId === event.fixtureId}
                  onSelect={() => onSelectEvent(event.ctx)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WhosOnMonthCell({
  cell,
  dayInRange,
  selected,
  onSelect,
}: {
  cell: WhosOnMonthGridCell
  dayInRange: boolean
  selected: boolean
  onSelect: () => void
}) {
  if (!dayInRange) {
    return <div className="cov-whoson-month-cell cov-whoson-month-cell--off-range" aria-hidden="true" />
  }

  const clickable = cell.isOnShift && cell.assignmentCount > 0
  const title = cell.isOnShift
    ? `${cell.isLead ? 'Lead · ' : ''}On shift${cell.assignmentCount > 0 ? ` · ${cell.assignmentCount} assignment${cell.assignmentCount !== 1 ? 's' : ''}` : ''}`
    : 'Off'

  if (!clickable) {
    return (
      <div
        className={
          'cov-whoson-month-cell' +
          (cell.isOnShift ? ' cov-whoson-month-cell--on' : ' cov-whoson-month-cell--off') +
          (cell.isLead ? ' cov-whoson-month-cell--lead' : '')
        }
        title={title}
      >
        <span className="cov-whoson-month-cell-status">{cell.isOnShift ? 'On' : 'Off'}</span>
        {cell.isLead ? <span className="cov-whoson-month-cell-lead">Lead</span> : null}
        {cell.isOnShift && cell.assignmentCount > 0 ? (
          <span className="cov-whoson-month-cell-count">{cell.assignmentCount}</span>
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={
        'cov-whoson-month-cell cov-whoson-month-cell--on cov-whoson-month-cell--clickable' +
        (cell.isLead ? ' cov-whoson-month-cell--lead' : '') +
        (selected ? ' cov-whoson-month-cell--selected' : '')
      }
      title={title}
      onClick={onSelect}
    >
      <span className="cov-whoson-month-cell-status">On</span>
      {cell.isLead ? <span className="cov-whoson-month-cell-lead">Lead</span> : null}
      <span className="cov-whoson-month-cell-count">{cell.assignmentCount}</span>
    </button>
  )
}

function isWhosOnCellSelected(
  cell: WhosOnMonthGridCell,
  trader: string,
  selected: SelectedMatchContext | null,
): boolean {
  if (!selected || !cell.date) return false
  return (
    selected.day.date === cell.date &&
    (selected.fixture.trading === trader || selected.fixture.prep === trader)
  )
}

function WhosOnMonthGridView({
  grid,
  selected,
  onSelectTraderDay,
}: {
  grid: WhosOnMonthGrid
  selected: SelectedMatchContext | null
  onSelectTraderDay: (trader: string, date: string) => void
}) {
  const colTemplate = `9.5rem repeat(${grid.days.length}, minmax(3.35rem, 3.35rem))`

  return (
    <section className="cov-whoson-month">
      <header className="cov-whoson-month-head">
        <strong className="cov-whoson-month-title">{grid.monthLabel}</strong>
        <span className="cov-muted">
          {grid.stats.traderCount} trader{grid.stats.traderCount !== 1 ? 's' : ''} · {grid.stats.shiftDaysTotal} shift day{grid.stats.shiftDaysTotal !== 1 ? 's' : ''}
        </span>
      </header>
      <div className="cov-whoson-month-scroll">
        <div className="cov-whoson-month-grid" style={{ gridTemplateColumns: colTemplate }}>
          <div className="cov-whoson-month-corner" />
          {grid.days.map((day) => (
            <div
              key={`head-${day.dayOfMonth}`}
              className={
                'cov-whoson-month-day-head' +
                (day.isWeekend ? ' cov-whoson-month-day-head--weekend' : '') +
                (!day.inScheduleRange ? ' cov-whoson-month-day-head--off-range' : '')
              }
              title={day.date ? `${day.weekdayShort} ${day.dayOfMonth}` : undefined}
            >
              <span className="cov-whoson-month-day-weekday">{day.weekdayShort}</span>
              <span className="cov-whoson-month-day-num">{day.dayOfMonth}</span>
            </div>
          ))}

          {grid.traders.map((trader) => (
            <Fragment key={trader}>
              <div className="cov-whoson-month-trader-label">{trader}</div>
              {grid.days.map((day) => {
                const cellKey = day.date ?? `off-${day.dayOfMonth}`
                const cell = grid.cells[trader]?.[cellKey] ?? {
                  date: day.date ?? '',
                  isOnShift: false,
                  isLead: false,
                  assignmentCount: 0,
                }
                return (
                  <WhosOnMonthCell
                    key={`${trader}-${cellKey}`}
                    cell={cell}
                    dayInRange={day.inScheduleRange}
                    selected={isWhosOnCellSelected(cell, trader, selected)}
                    onSelect={() => {
                      if (cell.date) onSelectTraderDay(trader, cell.date)
                    }}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TradersRosterView({
  persona,
  onUpdateAssignment,
  onMarkLifecycle,
  viewMode = 'day',
  days = SCHEDULE_DAYS,
  activeDayIndex = 0,
  year,
  month,
  showAllTraders = false,
}: {
  persona: Persona
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
  viewMode?: WhosOnViewMode
  days?: ScheduleDay[]
  activeDayIndex?: number
  year: number
  month: number
  showAllTraders?: boolean
}) {
  const roster = buildTraderRosterFromSchedule()
  const gameSections = buildRosterGameList()
  const [selected, setSelected] = useState<SelectedMatchContext | null>(null)

  const monthGrid = useMemo(
    () => buildWhosOnMonthGrid(year, month, { showAllTraders }),
    [year, month, showAllTraders],
  )

  const visibleDates = useMemo(() => new Set(days.map((d) => d.date)), [days])
  const rosterByDate = useMemo(
    () => new Map(roster.filter((d) => visibleDates.has(d.date)).map((d) => [d.date, d])),
    [roster, visibleDates],
  )

  const weekSections = useMemo(
    () => gameSections.filter((section) => visibleDates.has(section.day.date)),
    [gameSections, visibleDates],
  )

  const allTraders = useMemo(() => {
    const names = new Set<string>()
    for (const entry of roster) {
      entry.on.forEach((name) => names.add(name))
      entry.off.forEach((name) => names.add(name))
    }
    return [...names].sort()
  }, [roster])

  const safeDayIndex = days.length ? Math.min(activeDayIndex, days.length - 1) : 0
  const activeDay = days[safeDayIndex]
  const daySection = weekSections.find((s) => s.day.date === activeDay?.date)
  const priorSection = safeDayIndex > 0
    ? weekSections.find((s) => s.day.date === days[safeDayIndex - 1].date) ?? null
    : null

  const dayLayout = useMemo(() => {
    if (viewMode !== 'day' || !activeDay) return null
    return buildWhosOnDayLayout(activeDay, daySection, priorSection, rosterByDate, {
      showAllTraders,
      allTraders,
    })
  }, [viewMode, activeDay, daySection, priorSection, rosterByDate, showAllTraders, allTraders])

  const weekUnassigned = weekSections.reduce(
    (sum, section) => sum + section.games.filter((g) => g.unassigned).length,
    0,
  )

  const sectionsByDate = useMemo(
    () => new Map(gameSections.map((section) => [section.day.date, section])),
    [gameSections],
  )

  function selectTraderDay(trader: string, date: string) {
    const section = sectionsByDate.get(date)
    if (!section) return
    const match = section.games.find(
      ({ ctx }) => ctx.fixture.trading === trader || ctx.fixture.prep === trader,
    )
    if (match) setSelected(match.ctx)
  }

  const rosterSummary = (
    <div className="cov-view-stack cov-view-stack--schedule">
      <div className="cov-view-head">
        <div className="cov-view-head-start">
          <div>
            <h3 className="cov-view-title">
              {viewMode === 'day' ? "Who's on — daily workload" : "Who's on — month availability"}
            </h3>
            <p className="cov-muted">
              {viewMode === 'day'
                ? `Traders on shift as columns; time runs down from ${dayLayout ? `${String(dayLayout.timelineStartHour).padStart(2, '0')}:00` : '06:00'} through the night. Click a bar to open match details.`
                : 'Traders on the Y-axis, calendar days across the month. Click a cell with assignments to open match details.'}
            </p>
          </div>
          {viewMode === 'day' && dayLayout ? (
            <div className="cov-stats cov-stats--compact cov-stats--header">
              <StatTile label="Traders on" value={dayLayout.tradersOnCount} tone="active" />
              <StatTile label="Games" value={dayLayout.gameCount} />
              <StatTile label="Unassigned" value={dayLayout.unassignedCount} tone={dayLayout.unassignedCount > 0 ? 'warn' : 'done'} />
              <StatTile label="Lead" value={dayLayout.day.dailyLead} />
            </div>
          ) : null}
          {viewMode === 'month' ? (
            <div className="cov-stats cov-stats--compact cov-stats--header">
              <StatTile label="Traders" value={monthGrid.stats.traderCount} />
              <StatTile label="Shift days" value={monthGrid.stats.shiftDaysTotal} tone="active" />
              <StatTile label="Days in month" value={monthGrid.stats.daysInMonth} />
            </div>
          ) : null}
        </div>
      </div>

      {viewMode === 'day' ? (
        <>
          <div className="cov-roster-cal-legend cov-roster-cal-legend--compact">
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--trading" /> Trading</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--prep" /> Prep</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--unassigned" /> Unassigned</span>
            <span className="cov-muted">Week total unassigned: {weekUnassigned}</span>
          </div>

          {dayLayout ? (
            dayLayout.columns.length > 0 ? (
              <WhosOnDayGantt
                layout={dayLayout}
                selectedFixtureId={selected?.fixture.id ?? null}
                onSelectEvent={setSelected}
              />
            ) : (
              <p className="cov-empty-msg">No traders on shift this day.</p>
            )
          ) : (
            <p className="cov-empty-msg">No days in the selected week.</p>
          )}
        </>
      ) : (
        <>
          <div className="cov-roster-cal-legend cov-roster-cal-legend--compact">
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--trading" /> On shift</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--lead" /> Lead</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--neutral" /> Off</span>
            <span className="cov-muted">SRL hidden · count = assignments that day</span>
          </div>

          {monthGrid.traders.length > 0 ? (
            <WhosOnMonthGridView
              grid={monthGrid}
              selected={selected}
              onSelectTraderDay={selectTraderDay}
            />
          ) : (
            <p className="cov-empty-msg">No traders on shift in this month.</p>
          )}
        </>
      )}
    </div>
  )

  return (
    <ScheduleMatchSplit
      selected={selected}
      persona={persona}
      onClose={() => setSelected(null)}
      onUpdateAssignment={(patch) => {
        if (!selected) return
        onUpdateAssignment?.(selected.fixture.id, patch)
        const refreshed = findFixtureById(selected.fixture.id)
        if (refreshed) setSelected(refreshed)
      }}
      onMarkLifecycle={(action) => {
        if (!selected) return
        onMarkLifecycle?.(selected.fixture.id, action)
        const refreshed = findFixtureById(selected.fixture.id)
        if (refreshed) setSelected(refreshed)
      }}
    >
      {rosterSummary}
    </ScheduleMatchSplit>
  )
}

export function TournamentDetailView({
  code,
  onBack,
  persona,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  code: string
  onBack: () => void
  persona: Persona
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
}) {
  const tournament = getTournamentByCode(code)
  const [selected, setSelected] = useState<SelectedMatchContext | null>(null)

  if (!tournament) {
    return <p className="cov-empty-msg">Tournament not found.</p>
  }

  const group = {
    code: tournament.code,
    name: tournament.name,
    fixtureCount: tournament.fixtureCount,
    gapCount: tournament.gapCount,
    matches: tournament.fixtures,
  }

  const fixtureList = (
    <div className="cov-view-stack cov-view-stack--schedule">
      <div className="cov-view-head">
        <div className="cov-view-head-start">
          <div>
            <h3 className="cov-view-title">{tournament.code} — {tournament.name}</h3>
            <p className="cov-muted">{tournament.fixtureCount} fixtures · {tournament.gapCount} gaps · {tournament.format}</p>
          </div>
          <div className="cov-stats cov-stats--compact cov-stats--header">
            <StatTile label="Fixtures" value={tournament.fixtureCount} />
            <StatTile label="Gaps" value={tournament.gapCount} tone={tournament.gapCount > 0 ? 'warn' : undefined} />
          </div>
        </div>
        <button type="button" className="cov-btn" onClick={onBack}>← Back to schedule</button>
      </div>
      <PanelCard title="Fixtures in schedule">
        <div className="cov-day-list">
          {[...new Set(tournament.fixtures.map((f) => f.dayLabel))].map((dayLabel) => {
            const dayFixtures = tournament.fixtures.filter((f) => f.dayLabel === dayLabel)
            const day = SCHEDULE_DAYS.find((d) => d.label === dayLabel) ?? SCHEDULE_DAYS[0]
            return (
              <section key={dayLabel} className="cov-all-games-section">
                <header className="cov-all-games-day-head">
                  <h4 className="cov-all-games-day-title">{dayLabel}</h4>
                  <span className="cov-muted">{dayFixtures.length} game{dayFixtures.length !== 1 ? 's' : ''}</span>
                </header>
                <div className="cov-fixture-list">
                  {dayFixtures.map((f) => (
                    <FixtureCard
                      key={f.id}
                      fixture={f}
                      tournamentCode={tournament.code}
                      selected={selected?.fixture.id === f.id}
                      onSelect={() => setSelected({ fixture: f, day, tournament: group })}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </PanelCard>
      <PanelCard title="Historic coverage">
        <table className="cov-table">
          <thead><tr><th>Season</th><th>Fixtures</th><th>Covered</th><th>%</th></tr></thead>
          <tbody>
            {HISTORIC_SEASONS.map((s) => (
              <tr key={s.season}><td>{s.season}</td><td>{s.fixtures}</td><td>{s.covered}</td><td>{s.pct}</td></tr>
            ))}
          </tbody>
        </table>
      </PanelCard>
    </div>
  )

  return (
    <ScheduleMatchSplit
      selected={selected}
      persona={persona}
      onClose={() => setSelected(null)}
      onUpdateAssignment={(patch) => {
        if (!selected) return
        onUpdateAssignment?.(selected.fixture.id, patch)
        const refreshed = findFixtureById(selected.fixture.id)
        if (refreshed) setSelected(refreshed)
      }}
      onMarkLifecycle={(action) => {
        if (!selected) return
        onMarkLifecycle?.(selected.fixture.id, action)
        const refreshed = findFixtureById(selected.fixture.id)
        if (refreshed) setSelected(refreshed)
      }}
    >
      {fixtureList}
    </ScheduleMatchSplit>
  )
}

export function ReplicateSeasonView({ onBack }: { onBack: () => void }) {
  return (
    <div className="cov-view-stack">
      <div className="cov-view-head">
        <h3 className="cov-view-title">Replicate last season</h3>
        <button type="button" className="cov-btn" onClick={onBack}>← Back</button>
      </div>
      <p className="cov-muted">Copy fixture structure and typical dates from a prior season into the current schedule window.</p>
      <PanelCard title="CPL — Caribbean Premier League">
        <p className="cov-muted">2025 season: 30 fixtures · Aug 12 – Sep 18 · 28 covered (93%)</p>
        <div className="cov-form-stack">
          <label className="cov-field"><span className="cov-field-label">Target season</span><input className="cov-input" readOnly value="2026" /></label>
          <label className="cov-field"><span className="cov-field-label">Shift dates by</span><input className="cov-input" readOnly value="+7 days vs 2025" /></label>
        </div>
        <button type="button" className="cov-btn cov-btn--primary">Replicate CPL 2026 (30 fixtures)</button>
      </PanelCard>
      <PanelCard title="Source data">
        <p className="cov-muted">Current import: {IMPORT_SOURCE.file} · {IMPORT_SOURCE.fixtureCount} fixtures · {IMPORT_SOURCE.dayCount} days</p>
      </PanelCard>
    </div>
  )
}
