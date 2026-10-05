'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  buildFixturesPerDayCounts,
  buildRosterGameList,
  buildTraderMonthRoleGrid,
  buildTraderRosterFromSchedule,
  buildTradersOnPerDay,
  buildWhosOnDayLayout,
  buildWhosOnMonthGrid,
  canNavigateScheduleRange,
  COVERAGE_NUMBERS_BY_TOURNAMENT,
  COVERAGE_NUMBERS_BY_TRADER,
  formatScheduleDayRangeLabel,
  getScheduleDaysSlice,
  matchScheduleDayRangePreset,
  navigateScheduleDayRange,
  scheduleDayRangeFromPreset,
  IMPORT_COLUMN_MAP,
  OPS_ALERTS,
  getTournamentByCode,
  HISTORIC_SEASONS,
  IMPORT_SOURCE,
  SCHEDULE_DAYS,
  SCHEDULING_SUGGESTIONS,
  type SelectedMatchContext,
  getScheduleRevision,
  type FixtureAssignmentPatch,
  type FixtureCoverageChartSeries,
  type FixturesPerDayCount,
  type FixtureLifecycleAction,
  type Persona,
  type ScheduleDay,
  type ScheduleDayRange,
  type ScheduleDayRangePreset,
  type TraderMonthRoleGrid,
  type TraderMonthRoleId,
  type TraderMonthRoleTask,
  type TradersOnPerDay,
  type WhosOnDayEvent,
  type WhosOnDayLayout,
  type WhosOnMonthGrid,
  type WhosOnMonthGridCell,
  type ScheduleContentFilters,
  type ScheduleListMode,
  type ScheduleLayoutDensity,
  type StatusFilter,
} from '../../data/coverageScheduleStore'
import {
  FixtureCard,
  PanelCard,
  ScheduleMatchSplit,
  StatTile,
  useSelectedMatch,
  WeekScheduleLayout,
} from './CoverageShared'
import type { WhosOnViewMode } from './CoverageScheduleToolbar'

const WHOS_ON_HOUR_HEIGHT = 38

export function WeekScheduleView({
  persona,
  statusFilter,
  listMode,
  layoutDensity,
  contentFilters,
  onOpenTournament,
  days = SCHEDULE_DAYS,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  persona: Persona
  statusFilter: StatusFilter
  listMode?: ScheduleListMode
  layoutDensity?: ScheduleLayoutDensity
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
      layoutDensity={layoutDensity}
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
  const { selected, setSelected, clear, handleUpdateAssignment, handleMarkLifecycle } = useSelectedMatch(
    onUpdateAssignment,
    onMarkLifecycle,
  )

  const monthGrid = useMemo(
    () => buildTraderMonthRoleGrid(traderName, year, month),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
    [traderName, year, month, getScheduleRevision()],
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
      onClose={clear}
      onUpdateAssignment={handleUpdateAssignment}
      onMarkLifecycle={handleMarkLifecycle}
    >
      {mainContent}
    </ScheduleMatchSplit>
  )
}

const COVERAGE_CHART_SERIES: {
  id: FixtureCoverageChartSeries
  label: string
  className: string
}[] = [
  { id: 'live', label: 'Live', className: 'cov-chart-seg--live' },
  { id: 'preMatch', label: 'Pre-match', className: 'cov-chart-seg--pre-match' },
  { id: 'standard', label: 'Standard', className: 'cov-chart-seg--standard' },
  { id: 'notCovered', label: 'Not covered', className: 'cov-chart-seg--not-covered' },
]

const DEFAULT_COVERAGE_SERIES: Record<FixtureCoverageChartSeries, boolean> = {
  live: true,
  preMatch: true,
  standard: true,
  notCovered: true,
}

function formatChartDayLabel(label: string): string {
  const parts = label.split(' ')
  if (parts.length >= 2) return `${parts[0].slice(0, 3)} ${parts[1]}`
  return label.slice(0, 6)
}

function CoverageChartToggles({
  series,
  showTotal,
  onToggleSeries,
  onToggleTotal,
}: {
  series: Record<FixtureCoverageChartSeries, boolean>
  showTotal: boolean
  onToggleSeries: (id: FixtureCoverageChartSeries) => void
  onToggleTotal: () => void
}) {
  return (
    <div className="cov-chart-toggles">
      {COVERAGE_CHART_SERIES.map((item) => (
        <label key={item.id} className="cov-chart-toggle">
          <input
            type="checkbox"
            checked={series[item.id]}
            onChange={() => onToggleSeries(item.id)}
          />
          <span className={`cov-chart-swatch ${item.className}`} aria-hidden />
          {item.label}
        </label>
      ))}
      <label className="cov-chart-toggle cov-chart-toggle--total">
        <input type="checkbox" checked={showTotal} onChange={onToggleTotal} />
        <span className="cov-chart-swatch cov-chart-seg--total" aria-hidden />
        All (total line)
      </label>
    </div>
  )
}

function FixturesPerDayChart({
  rows,
  series,
  showTotal,
}: {
  rows: FixturesPerDayCount[]
  series: Record<FixtureCoverageChartSeries, boolean>
  showTotal: boolean
}) {
  const maxStack = Math.max(
    1,
    ...rows.map((row) => {
      let sum = 0
      if (series.live) sum += row.live
      if (series.preMatch) sum += row.preMatch
      if (series.standard) sum += row.standard
      if (series.notCovered) sum += row.notCovered
      return sum
    }),
  )
  const maxTotal = Math.max(1, ...rows.map((row) => row.total))

  return (
    <div className="cov-numbers-chart-plot cov-vbar-chart-wrap">
      <div className="cov-vbar-y-axis" aria-hidden>
        <span>{maxStack}</span>
        <span>{Math.round(maxStack / 2)}</span>
        <span>0</span>
      </div>
      <div className="cov-vbar-chart-scroll">
        <div className="cov-vbar-chart" role="img" aria-label="Fixtures per day by coverage type">
        {rows.map((row) => {
          const segments = COVERAGE_CHART_SERIES.filter((item) => series[item.id])
          const stackTotal = segments.reduce((sum, item) => sum + row[item.id], 0)
          const stackHeight = (stackTotal / maxStack) * 100
          const totalHeight = showTotal ? (row.total / maxTotal) * 100 : 0
          return (
            <div key={row.date} className="cov-vbar-col" title={`${row.label}: ${stackTotal} fixtures`}>
              <div className="cov-vbar-col-inner">
                {showTotal ? (
                  <div
                    className="cov-vbar-total-marker"
                    style={{ bottom: `${totalHeight}%` }}
                    title={`Total: ${row.total}`}
                  />
                ) : null}
                <div className="cov-vbar-stack" style={{ height: `${stackHeight}%` }}>
                  {segments.map((item) => {
                    const value = row[item.id]
                    if (!value) return null
                    return (
                      <div
                        key={item.id}
                        className={`cov-vbar-seg ${item.className}`}
                        style={{ flexGrow: value }}
                        title={`${item.label}: ${value}`}
                      />
                    )
                  })}
                </div>
              </div>
              <span className="cov-vbar-label">{formatChartDayLabel(row.label)}</span>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function FixturesVsTradersChart({
  fixtureRows,
  traderRows,
  series,
}: {
  fixtureRows: FixturesPerDayCount[]
  traderRows: TradersOnPerDay[]
  series: Record<FixtureCoverageChartSeries, boolean>
}) {
  const minColWidth = 36
  const chartWidth = Math.max(fixtureRows.length * minColWidth, 260)
  const chartHeight = 200
  const pad = { top: 20, right: 40, bottom: 32, left: 38 }
  const innerW = chartWidth - pad.left - pad.right
  const innerH = chartHeight - pad.top - pad.bottom

  const maxFixtures = Math.max(
    1,
    ...fixtureRows.map((row) => {
      let sum = 0
      if (series.live) sum += row.live
      if (series.preMatch) sum += row.preMatch
      if (series.standard) sum += row.standard
      if (series.notCovered) sum += row.notCovered
      return sum
    }),
  )
  const maxTraders = Math.max(1, ...traderRows.map((row) => row.countOn))
  const colW = fixtureRows.length ? innerW / fixtureRows.length : innerW
  const barW = Math.min(20, Math.max(10, colW * 0.65))

  const traderPoints = traderRows.map((row, i) => {
    const x = pad.left + i * colW + colW / 2
    const y = pad.top + innerH - (row.countOn / maxTraders) * innerH
    return `${x},${y}`
  })

  return (
    <div className="cov-numbers-chart-plot cov-combo-chart-wrap">
      <svg
        className="cov-combo-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ minWidth: chartWidth }}
        role="img"
        aria-label="Fixtures per day compared with traders on"
      >
        {[0, 0.5, 1].map((tick) => {
          const y = pad.top + innerH * (1 - tick)
          const value = Math.round(maxFixtures * tick)
          return (
            <g key={`fix-${tick}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={chartWidth - pad.right}
                y2={y}
                className="cov-combo-grid"
              />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" className="cov-combo-axis-label">
                {value}
              </text>
            </g>
          )
        })}
        {[0, 0.5, 1].map((tick) => {
          const y = pad.top + innerH * (1 - tick)
          const value = Math.round(maxTraders * tick)
          return (
            <text
              key={`trader-${tick}`}
              x={chartWidth - pad.right + 6}
              y={y + 4}
              textAnchor="start"
              className="cov-combo-axis-label cov-combo-axis-label--traders"
            >
              {value}
            </text>
          )
        })}
        {fixtureRows.map((row, i) => {
          const segments = COVERAGE_CHART_SERIES.filter((item) => series[item.id])
          const stackTotal = segments.reduce((sum, item) => sum + row[item.id], 0)
          const x = pad.left + i * colW + (colW - barW) / 2
          let yOffset = pad.top + innerH
          return (
            <g key={row.date}>
              {segments.map((item) => {
                const value = row[item.id]
                if (!value) return null
                const h = (value / maxFixtures) * innerH
                yOffset -= h
                return (
                  <rect
                    key={item.id}
                    x={x}
                    y={yOffset}
                    width={barW}
                    height={h}
                    className={`cov-combo-bar ${item.className}`}
                    rx={1}
                  >
                    <title>{`${row.label} — ${item.label}: ${value}`}</title>
                  </rect>
                )
              })}
              <text
                x={x + barW / 2}
                y={chartHeight - 6}
                textAnchor="middle"
                className="cov-combo-x-label"
              >
                {formatChartDayLabel(row.label)}
              </text>
              {stackTotal ? (
                <text
                  x={x + barW / 2}
                  y={pad.top + innerH - (stackTotal / maxFixtures) * innerH - 4}
                  textAnchor="middle"
                  className="cov-combo-bar-total"
                >
                  {stackTotal}
                </text>
              ) : null}
            </g>
          )
        })}
        <polyline points={traderPoints.join(' ')} className="cov-combo-trader-line" fill="none" />
        {traderRows.map((row, i) => {
          const x = pad.left + i * colW + colW / 2
          const y = pad.top + innerH - (row.countOn / maxTraders) * innerH
          return (
            <circle key={row.date} cx={x} cy={y} r={3.5} className="cov-combo-trader-dot">
              <title>{`${row.label}: ${row.countOn} traders on`}</title>
            </circle>
          )
        })}
        <text x={pad.left} y={10} className="cov-combo-legend cov-combo-legend--fixtures">Fixtures</text>
        <text
          x={chartWidth - pad.right}
          y={10}
          textAnchor="end"
          className="cov-combo-legend cov-combo-legend--traders"
        >
          Traders on
        </text>
      </svg>
    </div>
  )
}

export function CoverageNumbersView({ onBack }: { onBack: () => void }) {
  const [dayRange, setDayRange] = useState<ScheduleDayRange>(() =>
    scheduleDayRangeFromPreset('four-weeks', SCHEDULE_DAYS),
  )
  const [series, setSeries] = useState(DEFAULT_COVERAGE_SERIES)
  const [showTotal, setShowTotal] = useState(false)

  const numbersPresets: { id: ScheduleDayRangePreset; label: string }[] = [
    { id: 'this-week', label: 'Week' },
    { id: 'four-weeks', label: '4 weeks' },
    { id: 'this-month', label: 'Month' },
    { id: 'all', label: 'All days' },
  ]

  const visibleDays = useMemo(
    () => getScheduleDaysSlice(SCHEDULE_DAYS, dayRange.mode === 'all' ? { mode: 'all', startIndex: 0 } : dayRange),
    [dayRange],
  )
  const fixtureRows = useMemo(() => buildFixturesPerDayCounts(visibleDays), [visibleDays])
  const traderRows = useMemo(() => buildTradersOnPerDay(visibleDays), [visibleDays])
  const periodLabel = formatScheduleDayRangeLabel(
    SCHEDULE_DAYS,
    dayRange.mode === 'all' ? { mode: 'all', startIndex: 0 } : dayRange,
  )

  const toggleSeries = (id: FixtureCoverageChartSeries) => {
    setSeries((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const maxGames = Math.max(...COVERAGE_NUMBERS_BY_TRADER.map((t) => t.games))
  const kpiFixtures = fixtureRows.reduce((sum, row) => sum + row.total, 0)
  const kpiPeak = fixtureRows.reduce<{ label: string; total: number } | null>(
    (peak, row) => (!peak || row.total > peak.total ? { label: row.label, total: row.total } : peak),
    null,
  )
  const kpiTradersPeak = traderRows.reduce((peak, row) => Math.max(peak, row.countOn), 0)
  const kpiTradersAvg = traderRows.length
    ? Math.round((traderRows.reduce((sum, row) => sum + row.countOn, 0) / traderRows.length) * 10) / 10
    : 0
  const hasChartData = fixtureRows.length > 0 && kpiFixtures > 0
  return (
    <div className="cov-view-stack cov-numbers-view cov-numbers--p2">
      <div className="cov-view-head">
        <h3 className="cov-view-title">Coverage numbers</h3>
        <button type="button" className="cov-btn" onClick={onBack}>← Back to schedule</button>
      </div>
      <p className="cov-muted">Imported schedule analytics and year-on-year comparison.</p>

      <div className="cov-numbers-kpis" role="group" aria-label="Period totals">
        <StatTile label="Fixtures in period" value={kpiFixtures} tone="active" />
        <StatTile label="Peak day" value={kpiPeak ? `${kpiPeak.total}` : '—'} />
        <StatTile label="Traders on (avg)" value={kpiTradersAvg} tone="done" />
        <StatTile label="Traders on (peak)" value={kpiTradersPeak} tone={kpiTradersPeak > 0 ? 'done' : undefined} />
      </div>
      {kpiPeak && hasChartData ? (
        <p className="cov-muted cov-numbers-kpis-note">Busiest day in view: {kpiPeak.label} · {periodLabel}</p>
      ) : null}

      <section className="cov-numbers-charts-section" aria-label="Coverage charts">
        <div className="cov-numbers-toolbar">
          <div className="cov-numbers-period">
            <div className="cov-numbers-period-presets cov-seg">
              {numbersPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={
                    'cov-btn' +
                    (matchScheduleDayRangePreset(dayRange, preset.id, SCHEDULE_DAYS) ? ' cov-btn--primary' : '')
                  }
                  onClick={() => setDayRange(scheduleDayRangeFromPreset(preset.id, SCHEDULE_DAYS))}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {dayRange.mode !== 'all' ? (
              <div className="cov-numbers-period-nav">
                <button
                  type="button"
                  className="cov-btn"
                  disabled={!canNavigateScheduleRange(SCHEDULE_DAYS, dayRange, 'prev')}
                  onClick={() => setDayRange((r) => navigateScheduleDayRange(SCHEDULE_DAYS, r, 'prev'))}
                >
                  ← Prev
                </button>
                <span className="cov-muted">{periodLabel}</span>
                <button
                  type="button"
                  className="cov-btn"
                  disabled={!canNavigateScheduleRange(SCHEDULE_DAYS, dayRange, 'next')}
                  onClick={() => setDayRange((r) => navigateScheduleDayRange(SCHEDULE_DAYS, r, 'next'))}
                >
                  Next →
                </button>
              </div>
            ) : (
              <span className="cov-muted">{periodLabel}</span>
            )}
          </div>
          <CoverageChartToggles
            series={series}
            showTotal={showTotal}
            onToggleSeries={toggleSeries}
            onToggleTotal={() => setShowTotal((v) => !v)}
          />
        </div>

        <div className="cov-numbers-charts-grid">
          {hasChartData ? (
          <>
          <PanelCard title="Fixtures per day by coverage">
            <FixturesPerDayChart rows={fixtureRows} series={series} showTotal={showTotal} />
          </PanelCard>

          <PanelCard title="Fixtures vs trader availability">
            <p className="cov-muted cov-combo-chart-caption">
              Stacked bars = fixture count by coverage type. Line = traders on per day.
            </p>
            <FixturesVsTradersChart fixtureRows={fixtureRows} traderRows={traderRows} series={series} />
          </PanelCard>
          </>
          ) : (
            <p className="cov-numbers-empty">No fixtures in this period — try a wider range.</p>
          )}
        </div>
      </section>

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

const EMPTY_WHOS_ON_MONTH_ROLES = { prep: 0, data: 0, fixtureLead: 0, training: 0 }

function whosOnMonthCellHasAssignments(cell: WhosOnMonthGridCell): boolean {
  return (
    cell.tradingGameCount > 0 ||
    cell.roles.prep > 0 ||
    cell.roles.data > 0 ||
    cell.roles.fixtureLead > 0 ||
    cell.roles.training > 0
  )
}

function formatWhosOnMonthCellTitle(cell: WhosOnMonthGridCell): string {
  if (!cell.isOnShift) return 'Off shift'
  const parts = ['On shift']
  parts.push(
    `${cell.tradingGameCount} trading game${cell.tradingGameCount !== 1 ? 's' : ''}`,
  )
  if (cell.isLead) parts.push('Daily lead')
  if (cell.roles.prep > 0) {
    parts.push(`${cell.roles.prep} prep`)
  }
  if (cell.roles.data > 0) {
    parts.push(`${cell.roles.data} data`)
  }
  if (cell.roles.fixtureLead > 0) {
    parts.push(`${cell.roles.fixtureLead} fixture lead`)
  }
  if (cell.roles.training > 0) {
    parts.push(`${cell.roles.training} training`)
  }
  return parts.join(' · ')
}

function WhosOnMonthRoleDots({ cell }: { cell: WhosOnMonthGridCell }) {
  const dots: { role: string; label: string }[] = []
  if (cell.roles.prep > 0) {
    dots.push({ role: 'prep', label: `Prep (${cell.roles.prep})` })
  }
  if (cell.roles.data > 0) {
    dots.push({ role: 'data', label: `Data (${cell.roles.data})` })
  }
  if (cell.isLead) {
    dots.push({ role: 'lead', label: 'Daily lead' })
  } else if (cell.roles.fixtureLead > 0) {
    dots.push({ role: 'lead', label: `Lead (${cell.roles.fixtureLead})` })
  }
  if (cell.roles.training > 0) {
    dots.push({ role: 'training', label: `Training (${cell.roles.training})` })
  }
  if (dots.length === 0) return null

  return (
    <div className="cov-whoson-month-cell-dots" aria-hidden="true">
      {dots.map((dot) => (
        <span
          key={dot.role}
          className={`cov-whoson-month-cell-dot cov-whoson-month-cell-dot--${dot.role}`}
          title={dot.label}
        />
      ))}
    </div>
  )
}

function WhosOnMonthCellContent({ cell }: { cell: WhosOnMonthGridCell }) {
  if (!cell.isOnShift) return null

  return (
    <>
      <span
        className={
          'cov-whoson-month-cell-games' +
          (cell.tradingGameCount === 0 ? ' cov-whoson-month-cell-games--zero' : '')
        }
      >
        {cell.tradingGameCount}
      </span>
      <WhosOnMonthRoleDots cell={cell} />
    </>
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

  const clickable = cell.isOnShift && whosOnMonthCellHasAssignments(cell)
  const title = formatWhosOnMonthCellTitle(cell)
  const cellClassName =
    'cov-whoson-month-cell' +
    (cell.isOnShift ? ' cov-whoson-month-cell--on' : ' cov-whoson-month-cell--off') +
    (cell.isLead ? ' cov-whoson-month-cell--lead' : '') +
    (clickable ? ' cov-whoson-month-cell--clickable' : '') +
    (selected ? ' cov-whoson-month-cell--selected' : '')

  if (!clickable) {
    return (
      <div className={cellClassName} title={title}>
        <WhosOnMonthCellContent cell={cell} />
      </div>
    )
  }

  return (
    <button type="button" className={cellClassName} title={title} onClick={onSelect}>
      <WhosOnMonthCellContent cell={cell} />
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
                  tradingGameCount: 0,
                  roles: EMPTY_WHOS_ON_MONTH_ROLES,
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
  const { selected, setSelected, clear, handleUpdateAssignment, handleMarkLifecycle } = useSelectedMatch(
    onUpdateAssignment,
    onMarkLifecycle,
  )

  const monthGrid = useMemo(
    () => buildWhosOnMonthGrid(year, month, { showAllTraders }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
    [year, month, showAllTraders, getScheduleRevision()],
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
                : 'Traders on the Y-axis, calendar days across the month. Number = trading games; dots = other roles. Click a cell with assignments to open match details.'}
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
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--trading" /> On shift (cell fill)</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-roster-cal-swatch cov-roster-cal-swatch--neutral" /> Off</span>
            <span className="cov-muted">Number = trading games</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-whoson-month-cell-dot cov-whoson-month-cell-dot--prep" /> Prep</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-whoson-month-cell-dot cov-whoson-month-cell-dot--data" /> Data</span>
            <span className="cov-roster-cal-legend-item"><span className="cov-whoson-month-cell-dot cov-whoson-month-cell-dot--lead" /> Lead</span>
            <span className="cov-muted">SRL hidden</span>
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
      onClose={clear}
      onUpdateAssignment={handleUpdateAssignment}
      onMarkLifecycle={handleMarkLifecycle}
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
  const { selected, setSelected, clear, handleUpdateAssignment, handleMarkLifecycle } = useSelectedMatch(
    onUpdateAssignment,
    onMarkLifecycle,
  )

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
      onClose={clear}
      onUpdateAssignment={handleUpdateAssignment}
      onMarkLifecycle={handleMarkLifecycle}
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
