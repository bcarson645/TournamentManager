'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  buildDayMatrix,
  DAY_MATRIX_GROUP_META,
  DAY_MATRIX_TASK_META,
  DAY_MATRIX_TASKS,
  type DayMatrixColumn,
  type DayMatrixGroup,
  type DayMatrixGroupId,
  type DayMatrixRow,
} from '../../data/coverageDayMatrix'
import {
  coverageTagClassName,
  formatFixtureMatchLabel,
  getFixtureMarketsProgress,
  getScheduleRevision,
  getCoverageScheduleTodayIso,
  findCoverageScheduleAnchorDayIndex,
  MAX_MARKETS_PER_GAME,
  PUBLISH_BATCH_SIZE,
  resolveFixtureCoverageTagKind,
  updateFixtureAssignment,
  type CoverageTagKind,
  type FixtureAssignmentPatch,
  type Persona,
  type ScheduleContentFilters,
  type ScheduleDay,
  type ScheduleLayoutDensity,
  type SelectedMatchContext,
  type StatusFilter,
} from '../../data/coverageScheduleStore'
import { MarketsProgressBar } from './CoverageMarketsProgress'

const COVERAGE_TAG_LABEL: Record<CoverageTagKind, string> = {
  premium: 'Premium',
  'pre-match': 'Pre-match',
  'not-covered': 'Not covered',
  simulated: 'Simulated',
  standard: 'Standard',
  live: 'Live',
  unconfirmed: 'Unconfirmed',
}

const DEFAULT_COLLAPSED: DayMatrixGroupId[] = ['complete']

function pickDefaultDay(days: ScheduleDay[]): ScheduleDay | null {
  if (days.length === 0) return null
  const today = getCoverageScheduleTodayIso()
  return days.find((day) => day.date === today) ?? days[findCoverageScheduleAnchorDayIndex(days)] ?? days[0]
}

function actionSummary(row: DayMatrixRow): string {
  return row.actionDetail ? `${row.actionLabel} (${row.actionDetail})` : row.actionLabel
}

function ActionChip({ row, compact = false }: { row: DayMatrixRow; compact?: boolean }) {
  return (
    <span
      className={`cov-dm-action cov-dm-action--${row.tone}` + (compact ? ' cov-dm-action--compact' : '')}
      title={`Action needed: ${actionSummary(row)}`}
    >
      {row.actionLabel}
      {row.actionDetail && !compact ? <span className="cov-dm-action-detail">{row.actionDetail}</span> : null}
    </span>
  )
}

function traderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function OwnerTag({ row, compact = false }: { row: DayMatrixRow; compact?: boolean }) {
  if (!row.task) return null
  const taskLabel = DAY_MATRIX_TASK_META[row.task].label
  if (row.owner) {
    return (
      <span className="cov-dm-owner" title={`${row.owner} assigned to ${taskLabel} (not done yet)`}>
        {compact ? row.owner.slice(0, 3) : row.owner}
      </span>
    )
  }
  if (row.taskOpen) {
    return (
      <span className="cov-dm-owner cov-dm-owner--open" title={`${taskLabel} is open — any trader can claim`}>
        {compact ? 'Any' : 'Open · anyone'}
      </span>
    )
  }
  return (
    <span className="cov-dm-owner cov-dm-owner--none" title={`${taskLabel} needs a named owner — assign someone from the matrix`}>
      {compact ? '!' : 'Needs owner'}
    </span>
  )
}

function FixtureHeaderCell({
  row,
  selected,
  dimmed,
  density,
  onSelect,
  onToggleOpen,
  canAssign,
}: {
  row: DayMatrixRow
  selected: boolean
  dimmed: boolean
  density: ScheduleLayoutDensity
  onSelect: () => void
  onToggleOpen: () => void
  canAssign: boolean
}) {
  const { fixture, tournament } = row.ctx
  const compact = density === 'compact'
  const label = formatFixtureMatchLabel(fixture)
  const coverageKind = resolveFixtureCoverageTagKind(fixture, tournament.code)
  const dayLabel = row.ctx.day.label
  const showMarkets = row.markets != null && (row.group === 'ready-to-publish' || row.group === 'publishing')

  return (
    <div
      role="rowheader"
      className={
        'cov-dm-fixture' +
        ` cov-dm-fixture--${row.tone}` +
        (selected ? ' cov-dm-fixture--selected' : '') +
        (dimmed ? ' cov-dm-fixture--dim' : '')
      }
      data-fixture-id={fixture.id}
    >
      <button
        type="button"
        className="cov-dm-fixture-hit"
        aria-pressed={selected}
        aria-label={`${fixture.time} ${label}, ${tournament.code}. ${actionSummary(row)}. Open match panel`}
        title={`${label}\n${dayLabel} · ${fixture.time} · ${tournament.name}\nNext: ${actionSummary(row)}\nClick to open match panel`}
        onClick={onSelect}
      >
        <time className="cov-dm-fixture-time">{fixture.time}</time>
        <span className="cov-dm-fixture-main">
          <span className="cov-dm-fixture-title">{label}</span>
          {!compact ? (
            <span className="cov-dm-fixture-meta">
              <span className="cov-chip cov-chip--neutral cov-dm-comp">{tournament.code}</span>
              <span className={`cov-chip cov-chip--${row.tier === 1 ? 'warn' : 'neutral'}`}>T{row.tier}</span>
              {coverageKind ? (
                <span className={coverageTagClassName(coverageKind)}>{COVERAGE_TAG_LABEL[coverageKind]}</span>
              ) : null}
              {row.scout ? <span className="cov-chip cov-chip--info" title="Scout attached for trading">🔭 Scout</span> : null}
            </span>
          ) : null}
        </span>
        <span className="cov-dm-fixture-open" aria-hidden="true">
          <span className="cov-dm-fixture-open-label">Open</span>
          <span className="cov-dm-fixture-open-chevron">›</span>
        </span>
      </button>
      <div className="cov-dm-fixture-state">
        <ActionChip row={row} compact={compact} />
        {showMarkets && row.markets ? (
          <MarketsProgressBar progress={row.markets} compact />
        ) : null}
        <OwnerTag row={row} compact={compact} />
        {canAssign && row.task && row.needsAction && !row.owner ? (
          <button
            type="button"
            className={'cov-dm-open-slot' + (!row.taskOpen ? ' cov-dm-open-slot--active' : '')}
            title={
              row.taskOpen
                ? 'Open pool — click to require a named owner before anyone claims'
                : 'Named owner required — click to return to the open pool'
            }
            aria-pressed={!row.taskOpen}
            onClick={(event) => {
              event.stopPropagation()
              onToggleOpen()
            }}
          >
            {compact
              ? row.taskOpen
                ? 'Pin'
                : '!'
              : row.taskOpen
                ? 'Assign to someone'
                : 'Named owner only'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ColumnHeader({
  column,
  density,
  focused,
  onToggleFocus,
}: {
  column: DayMatrixColumn
  density: ScheduleLayoutDensity
  focused: boolean
  onToggleFocus: () => void
}) {
  const compact = density === 'compact'
  const breakdown = DAY_MATRIX_TASKS.filter((task) => column.counts[task] > 0)
    .map((task) => `${DAY_MATRIX_TASK_META[task].label} ${column.counts[task]}`)
    .join(' · ')
  const title = `${column.trader}${column.isDailyLead ? ' — daily lead' : ''}\n${breakdown || 'No tasks owned in view'}\nClick to highlight this trader's tasks`

  return (
    <button
      type="button"
      role="columnheader"
      className={
        'cov-dm-colhead' + (focused ? ' cov-dm-colhead--focus' : '') + (column.isDailyLead ? ' cov-dm-colhead--lead' : '')
      }
      title={title}
      aria-pressed={focused}
      onClick={onToggleFocus}
    >
      <span className={'cov-dm-colhead-name' + (compact ? ' cov-dm-colhead-name--vertical' : '')}>{column.trader}</span>
      {column.isDailyLead ? (
        <span className="cov-dm-colhead-lead" title="Daily lead">
          {compact ? '★' : '★ Lead'}
        </span>
      ) : null}
      <span className="cov-dm-colhead-load">
        {column.total > 0 ? (
          compact ? (
            column.total
          ) : (
            DAY_MATRIX_TASKS.filter((task) => column.counts[task] > 0).map((task) => (
              <span key={task} className={`cov-dm-load cov-dm-task--${task}`}>
                {column.counts[task]} {DAY_MATRIX_TASK_META[task].short}
              </span>
            ))
          )
        ) : (
          <span className="cov-dm-load cov-dm-load--idle">idle</span>
        )}
      </span>
    </button>
  )
}

function GroupHeaderRow({
  group,
  columns,
  collapsed,
  onToggle,
}: {
  group: DayMatrixGroup
  columns: DayMatrixColumn[]
  collapsed: boolean
  onToggle: () => void
}) {
  const { meta } = group
  const actionable = meta.task != null
  return (
    <div
      className={`cov-dm-row cov-dm-row--group cov-dm-row--group-${group.tone}`}
      role="row"
      data-dm-group={group.id}
    >
      <button
        type="button"
        role="rowheader"
        className="cov-dm-group-head"
        aria-expanded={!collapsed}
        title={meta.action}
        onClick={onToggle}
      >
        <span className="cov-dm-group-chevron" aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
        <span className={`cov-dm-group-dot cov-dm-group-dot--${group.tone}`} aria-hidden="true" />
        <span className="cov-dm-group-text">
          <span className="cov-dm-group-title">
            {meta.label}
            <span className="cov-dm-group-count">{group.rows.length}</span>
            {actionable && group.unowned > 0 ? (
              <span className="cov-chip cov-chip--danger cov-dm-group-unowned">{group.unowned} need owner</span>
            ) : null}
          </span>
          <span className="cov-dm-group-action">{meta.action}</span>
        </span>
      </button>
      {columns.map((column) => {
        const owned = group.ownedBy.get(column.trader) ?? 0
        return (
          <div key={column.trader} role="gridcell" className="cov-dm-group-cell">
            {owned > 0 ? <span className="cov-dm-group-owned">{owned}</span> : null}
          </div>
        )
      })}
    </div>
  )
}

function MatrixCell({
  row,
  column,
  density,
  focused,
  onAssign,
  onUnassign,
}: {
  row: DayMatrixRow
  column: DayMatrixColumn
  density: ScheduleLayoutDensity
  focused: boolean
  onAssign: () => void
  onUnassign: () => void
}) {
  const label = formatFixtureMatchLabel(row.ctx.fixture)
  const colFocus = focused ? ' cov-dm-cell--col-focus' : ''

  if (!row.task) {
    return <div role="gridcell" aria-hidden="true" className={'cov-dm-cell cov-dm-cell--na' + colFocus} />
  }

  const task = row.task
  const meta = DAY_MATRIX_TASK_META[task]
  const owned = row.owner === column.trader
  const compact = density === 'compact'

  if (owned) {
    return (
      <button
        type="button"
        role="gridcell"
        className={`cov-dm-cell cov-dm-cell--owned cov-dm-task--${task}` + colFocus}
        title={`${column.trader} assigned to ${meta.label} · ${label}\nComplete in the match panel · Alt/Shift-click to unassign`}
        aria-label={`${column.trader} assigned to ${meta.label} for ${label}. Not complete yet. Hold Alt to unassign`}
        onClick={(event) => {
          if (event.altKey || event.shiftKey) onUnassign()
        }}
      >
        {compact ? (
          <span className="cov-dm-cell-assigned cov-dm-cell-assigned--initials" aria-hidden="true">
            {traderInitials(column.trader)}
          </span>
        ) : (
          <span className="cov-dm-cell-assigned">
            <span className="cov-dm-cell-assigned-dot" aria-hidden="true" />
            {meta.short}
          </span>
        )}
      </button>
    )
  }

  const poolClaim = row.taskOpen && !row.owner
  const verb = row.owner
    ? `Reassign ${meta.label} to ${column.trader} (from ${row.owner})`
    : row.taskOpen
      ? `Claim ${meta.label} for ${column.trader}`
      : `Assign ${column.trader} to ${meta.label}`
  return (
    <button
      type="button"
      role="gridcell"
      className={
        'cov-dm-cell cov-dm-cell--open' +
        (row.owner ? ' cov-dm-cell--taken' : '') +
        (row.taskOpen ? ` cov-dm-cell--pool cov-dm-task--${task}` : '') +
        colFocus
      }
      title={`${verb}\n${row.ctx.fixture.time} ${label}`}
      aria-label={`${verb} on ${label}`}
      onClick={onAssign}
    >
      {poolClaim ? (
        <span className="cov-dm-cell-pool-dot" aria-hidden="true" />
      ) : (
        <>
          <span className="cov-dm-cell-plus" aria-hidden="true">
            {row.owner ? '⇄' : '+'}
          </span>
        </>
      )}
    </button>
  )
}

export default function CoverageDayMatrix({
  days,
  persona,
  statusFilter,
  contentFilters,
  layoutDensity,
  selectedFixtureId,
  onSelect,
  onUpdateAssignment,
}: {
  days: ScheduleDay[]
  persona: Persona
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  layoutDensity: ScheduleLayoutDensity
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  /** Store writers (usually lifted so the rest of the schedule refreshes); falls back to the store directly. */
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
}) {
  const [dayDate, setDayDate] = useState<string | null>(null)
  const [unownedOnly, setUnownedOnly] = useState(false)
  const [hideIdleTraders, setHideIdleTraders] = useState(false)
  const [focusTrader, setFocusTrader] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<DayMatrixGroupId>>(() => new Set(DEFAULT_COLLAPSED))
  const [toast, setToast] = useState<string | null>(null)
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)

  const activeDay = days.find((day) => day.date === dayDate) ?? pickDefaultDay(days)
  const activeIndex = activeDay ? days.findIndex((day) => day.date === activeDay.date) : -1
  const revision = getScheduleRevision()
  const dayStripRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeDate = activeDay?.date ?? null

  useEffect(() => {
    const chip = dayStripRef.current?.querySelector<HTMLElement>('.cov-dm-daychip--active')
    if (!chip || !dayStripRef.current) return
    const strip = dayStripRef.current
    const left = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [activeDate])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const matrix = useMemo(
    () => (activeDay ? buildDayMatrix(activeDay, { statusFilter, contentFilters, hideIdleTraders }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
    [activeDay, statusFilter, contentFilters, hideIdleTraders, revision],
  )

  const groups = useMemo(() => {
    if (!matrix) return []
    if (!unownedOnly) return matrix.groups
    return matrix.groups
      .map((group) => ({
        ...group,
        rows: group.rows.filter((row) => row.needsAction && !row.owner && !row.taskOpen),
      }))
      .filter((group) => group.rows.length > 0)
  }, [matrix, unownedOnly])

  const writeAssignment = useCallback(
    (fixtureId: string, patch: FixtureAssignmentPatch) => {
      if (onUpdateAssignment) onUpdateAssignment(fixtureId, patch)
      else {
        updateFixtureAssignment(fixtureId, patch)
        forceRender()
      }
    },
    [onUpdateAssignment],
  )

  const assignTask = useCallback(
    (row: DayMatrixRow, trader: string | null) => {
      if (!row.task) return
      writeAssignment(row.ctx.fixture.id, { taskOwner: { task: row.task, trader } })
      const match = formatFixtureMatchLabel(row.ctx.fixture)
      const taskLabel = DAY_MATRIX_TASK_META[row.task].label
      setToast(trader ? `${trader} assigned to ${taskLabel} · ${match}` : `${taskLabel} unassigned · ${match}`)
    },
    [writeAssignment],
  )

  const toggleTaskOpen = useCallback(
    (row: DayMatrixRow) => {
      if (!row.task) return
      const toOpenPool = !row.taskOpen
      writeAssignment(row.ctx.fixture.id, {
        taskOwner: { task: row.task, trader: null, open: toOpenPool },
      })
      const match = formatFixtureMatchLabel(row.ctx.fixture)
      const taskLabel = DAY_MATRIX_TASK_META[row.task].label
      setToast(
        toOpenPool
          ? `${taskLabel} open to anyone · ${match}`
          : `${taskLabel} needs a named owner · ${match}`,
      )
    },
    [writeAssignment],
  )

  const canAssign = persona === 'admin'

  function toggleGroup(id: DayMatrixGroupId) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function jumpToGroup(id: DayMatrixGroupId) {
    setCollapsed((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
    requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector<HTMLElement>(`[data-dm-group="${id}"]`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  if (!activeDay || !matrix) {
    return <p className="cov-empty-msg">No days in the selected range.</p>
  }

  const focusedColumn = focusTrader && matrix.columns.some((column) => column.trader === focusTrader) ? focusTrader : null
  const densityClass = layoutDensity === 'compact' ? ' cov-dm--compact' : ' cov-dm--condensed'
  const { stats } = matrix
  const visibleRowCount = groups.reduce((sum, group) => sum + group.rows.length, 0)

  return (
    <div className={'cov-dm cov-dm--p2' + densityClass}>
      <div className="cov-dm-top">
        <div className="cov-dm-daynav" role="toolbar" aria-label="Select day">
          <button
            type="button"
            className="cov-btn cov-btn--icon"
            aria-label="Previous day"
            disabled={activeIndex <= 0}
            onClick={() => setDayDate(days[activeIndex - 1].date)}
          >
            ‹
          </button>
          <div className="cov-dm-daystrip" ref={dayStripRef}>
            {days.map((day) => {
              const count = day.tournaments.reduce((sum, group) => sum + group.matches.length, 0)
              const active = day.date === activeDay.date
              return (
                <button
                  key={day.date}
                  type="button"
                  className={'cov-dm-daychip' + (active ? ' cov-dm-daychip--active' : '')}
                  aria-pressed={active}
                  onClick={() => setDayDate(day.date)}
                  title={`${day.label} · ${count} fixtures`}
                >
                  <span className="cov-dm-daychip-label">{day.label}</span>
                  <span className="cov-dm-daychip-count">{count}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="cov-btn cov-btn--icon"
            aria-label="Next day"
            disabled={activeIndex >= days.length - 1}
            onClick={() => setDayDate(days[activeIndex + 1].date)}
          >
            ›
          </button>
        </div>

        <div className="cov-dm-controls">
          <label className="cov-dm-toggle">
            <input type="checkbox" checked={unownedOnly} onChange={(e) => setUnownedOnly(e.target.checked)} />
            <span>Needs owner only</span>
          </label>
          <label className="cov-dm-toggle">
            <input type="checkbox" checked={hideIdleTraders} onChange={(e) => setHideIdleTraders(e.target.checked)} />
            <span>Hide idle traders</span>
          </label>
          {focusedColumn ? (
            <button type="button" className="cov-btn cov-btn--sm" onClick={() => setFocusTrader(null)}>
              Clear highlight: {focusedColumn} ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="cov-dm-summary" aria-label="Day summary">
        <h3 className="cov-dm-summary-title">
          {activeDay.label}
          <span className="cov-chip cov-chip--info">Lead: {activeDay.dailyLead}</span>
        </h3>
        <div className="cov-dm-summary-stats">
          <span className="cov-dm-stat">
            <strong>{stats.fixtures}</strong> games
          </span>
          <span className={'cov-dm-stat' + (stats.needsAction > 0 ? ' cov-dm-stat--warn' : ' cov-dm-stat--ok')}>
            <strong>{stats.needsAction}</strong> need action
          </span>
          <span className={'cov-dm-stat' + (stats.unowned > 0 ? ' cov-dm-stat--danger' : '')}>
            <strong>{stats.unowned}</strong> need owner
          </span>
          {stats.prepOverdue > 0 ? (
            <span className="cov-dm-stat cov-dm-stat--danger">
              <strong>{stats.prepOverdue}</strong> prep overdue
            </span>
          ) : null}
          <span className="cov-dm-stat" title={`Max ${MAX_MARKETS_PER_GAME} markets per game`}>
            <strong>
              {stats.marketsSent}/{stats.marketsTotal}
            </strong>{' '}
            markets sent
          </span>
          <span className="cov-dm-stat">
            <strong>{stats.tradersOn}</strong> traders on
          </span>
        </div>
      </div>

      <div className="cov-dm-jump" role="toolbar" aria-label="Jump to task section">
        <span className="cov-dm-legend-title">Tasks</span>
        {matrix.groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`cov-dm-jump-chip cov-dm-jump-chip--${group.tone}`}
            onClick={() => jumpToGroup(group.id)}
            title={DAY_MATRIX_GROUP_META[group.id].action}
          >
            {group.meta.label}
            <strong>{group.rows.length}</strong>
          </button>
        ))}
      </div>

      <div className="cov-dm-legend" aria-label="How cells work">
        <span className="cov-dm-legend-group">
          <span className="cov-dm-legend-title">Cells</span>
          <span className="cov-dm-legend-item">
            <span className="cov-dm-legend-demo cov-dm-legend-demo--open">+</span>
            Click to assign that trader
          </span>
          <span className="cov-dm-legend-item">
            <span className="cov-dm-legend-demo cov-dm-legend-demo--open">⇄</span>
            Click another trader to reassign
          </span>
          <span className="cov-dm-legend-item">
            <span className="cov-dm-legend-demo cov-dm-legend-demo--owned cov-dm-task--prep">
              <span className="cov-dm-legend-dot" aria-hidden="true" />
            </span>
            Assigned — soft task tint
          </span>
          <span className="cov-dm-legend-item">
            <span className="cov-dm-legend-demo cov-dm-legend-demo--pool cov-dm-task--prep">
              <span className="cov-dm-legend-dot" aria-hidden="true" />
            </span>
            Open pool — click a column to claim · task colour
          </span>
          <span className="cov-dm-legend-item">
            <span className="cov-dm-legend-demo cov-dm-legend-demo--neutral" aria-hidden="true" />
            Empty — neutral until you assign
          </span>
        </span>
        <span className="cov-dm-legend-hint">
          Alt/Shift-click an assigned cell to unassign · tasks start in the open pool · Assign to someone requires a named owner first · click a game row to open the match panel
          {persona === 'admin' ? '' : ' (read-only details)'}
        </span>
      </div>

      <div className="cov-dm-toast" role="status" aria-live="polite">
        {toast}
      </div>

      {visibleRowCount === 0 ? (
        <p className="cov-empty-msg">
          {unownedOnly
            ? 'Every task on this day has an owner.'
            : 'No fixtures match the current filters on this day.'}
        </p>
      ) : (
        <div
          className="cov-dm-scroll"
          ref={scrollRef}
          tabIndex={0}
          aria-label={`Games grouped by task needed — ${activeDay.label}`}
        >
          <div className="cov-dm-grid" role="grid" style={{ ['--dm-cols' as string]: matrix.columns.length }}>
            <div className="cov-dm-row cov-dm-row--head" role="row">
              <div className="cov-dm-corner" role="columnheader">
                <span className="cov-dm-corner-title">Game · action needed</span>
                <span className="cov-dm-corner-sub">
                  {visibleRowCount} games · grouped by task, then kick-off
                </span>
              </div>
              {matrix.columns.map((column) => (
                <ColumnHeader
                  key={column.trader}
                  column={column}
                  density={layoutDensity}
                  focused={focusedColumn === column.trader}
                  onToggleFocus={() => setFocusTrader((current) => (current === column.trader ? null : column.trader))}
                />
              ))}
            </div>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.id)
              return (
                <div key={group.id} className="cov-dm-section" role="rowgroup">
                  <GroupHeaderRow
                    group={group}
                    columns={matrix.columns}
                    collapsed={isCollapsed}
                    onToggle={() => toggleGroup(group.id)}
                  />
                  {isCollapsed
                    ? null
                    : group.rows.map((row) => {
                        const selected = selectedFixtureId === row.ctx.fixture.id
                        const dimmed =
                          focusedColumn != null && row.owner !== focusedColumn && !row.taskOpen
                        return (
                          <div
                            key={row.key}
                            role="row"
                            className={
                              'cov-dm-row' +
                              ` cov-dm-row--${row.tone}` +
                              (selected ? ' cov-dm-row--selected' : '') +
                              (dimmed ? ' cov-dm-row--dim' : '')
                            }
                          >
                            <FixtureHeaderCell
                              row={row}
                              selected={selected}
                              dimmed={dimmed}
                              density={layoutDensity}
                              onSelect={() => onSelect(row.ctx)}
                              onToggleOpen={() => toggleTaskOpen(row)}
                              canAssign={canAssign}
                            />
                            {matrix.columns.map((column) => (
                              <MatrixCell
                                key={column.trader}
                                row={row}
                                column={column}
                                density={layoutDensity}
                                focused={focusedColumn === column.trader}
                                onAssign={() => assignTask(row, column.trader)}
                                onUnassign={() => assignTask(row, null)}
                              />
                            ))}
                          </div>
                        )
                      })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
