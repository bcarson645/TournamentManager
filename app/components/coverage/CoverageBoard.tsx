'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildDayMatrix,
  DAY_MATRIX_GROUP_META,
  DAY_MATRIX_TASK_META,
  type DayMatrixGroupId,
  type DayMatrixRow,
} from '../../data/coverageDayMatrix'
import {
  coverageTagClassName,
  findCoverageScheduleAnchorDayIndex,
  formatFixtureMatchLabel,
  getCoverageScheduleTodayIso,
  getFixtureTaskOwner,
  getScheduleRevision,
  isPrepOverdue,
  resolveFixtureCoverageTagKind,
  type CoverageTagKind,
  type FixtureAssignmentPatch,
  type FixtureLifecycleAction,
  type Persona,
  type ScheduleContentFilters,
  type ScheduleDay,
  type SelectedMatchContext,
  type StatusFilter,
} from '../../data/coverageScheduleStore'
import { getAssignableTraders, getDefaultPreviewTraderName } from '../../data/traders'
import { MarketsProgressBar } from './CoverageMarketsProgress'
import './CoverageBoard.css'

/**
 * Coverage Board — Jira-style Kanban prototype.
 *
 * Columns mirror the day-matrix workflow groups 1:1 (each fixture lives in exactly one
 * column = its next action from `classifyFixtureNextAction`), so no workflow logic is
 * duplicated or changed. Swimlanes split each column by tier.
 *
 * Scout is NOT a column: `fixture.scout` is a match attribute (scout attached for
 * trading) shown as a badge on the card. Scout yes/no is assigned in the match
 * panel only — there is intentionally no scout board filter.
 *
 * INTERACTION MODEL (documented choice):
 * - HTML5 drag-and-drop IS implemented, but only for *forward* lifecycle transitions
 *   (drop targets: Ready to publish → `prep-done`, Publishing → `publish-batch`,
 *   Settle → `published`, Done → `settled`). Actions are idempotent, so drops are safe.
 * - Needs prep / Price check columns are NOT drop targets: there is no
 *   lifecycle action that moves a fixture backwards into prep, and price-check is a
 *   system flag. Backward moves happen via the card "⋯" menu (same forward targets)
 *   or the full match panel.
 * - Assignment uses an inline picker on the card (same `taskOwner` patch pattern as
 *   the day matrix) plus the "Open pool" state — no drag-to-assign, to keep DnD
 *   semantics unambiguous (column drop = lifecycle, picker = owner).
 */

interface BoardColumnDef {
  id: DayMatrixGroupId
  title: string
  droppable: boolean
  dropAction?: FixtureLifecycleAction
  dropHint: string
}

/** Workflow order left → right. Scout is a card badge, not a column. */
const BOARD_COLUMNS: BoardColumnDef[] = [
  { id: 'prep', title: 'Needs prep', droppable: false, dropHint: 'Prep is the entry stage — cards start here, they are not dropped back' },
  { id: 'ready-to-publish', title: 'Ready to publish', droppable: true, dropAction: 'prep-done', dropHint: 'Drop here to mark prep done' },
  { id: 'publishing', title: 'Publishing', droppable: true, dropAction: 'publish-batch', dropHint: 'Drop here to send the next batch of markets' },
  { id: 'price-check', title: 'Price check', droppable: false, dropHint: 'Price check is system-flagged — resolve it in the match panel' },
  { id: 'settle', title: 'Settle', droppable: true, dropAction: 'published', dropHint: 'Drop here to finish publishing and queue for settle' },
  { id: 'complete', title: 'Done', droppable: true, dropAction: 'settled', dropHint: 'Drop here to settle' },
]

const BOARD_COLUMN_META: Record<DayMatrixGroupId, BoardColumnDef> = Object.fromEntries(
  BOARD_COLUMNS.map((col) => [col.id, col]),
) as Record<DayMatrixGroupId, BoardColumnDef>

interface BoardLane {
  id: string
  label: string
  matches: (row: DayMatrixRow) => boolean
}

const BOARD_LANES: BoardLane[] = [
  { id: 't1', label: 'Tier 1', matches: (row) => row.tier === 1 },
  { id: 't2', label: 'Tier 2', matches: (row) => row.tier === 2 },
  { id: 't3', label: 'Tier 3+', matches: (row) => row.tier >= 3 },
]

const COVERAGE_TAG_LABEL: Record<CoverageTagKind, string> = {
  premium: 'Premium',
  'pre-match': 'Pre-match',
  'not-covered': 'Not covered',
  simulated: 'Simulated',
  standard: 'Standard',
  live: 'Live',
  unconfirmed: 'Unconfirmed',
}

function traderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function pickDefaultDay(days: ScheduleDay[]): ScheduleDay | null {
  if (days.length === 0) return null
  const today = getCoverageScheduleTodayIso()
  return days.find((day) => day.date === today) ?? days[findCoverageScheduleAnchorDayIndex(days)] ?? days[0]
}

function rowOwnerLabel(row: DayMatrixRow): string | null {
  if (!row.task) return null
  return getFixtureTaskOwner(row.ctx.fixture, row.task)
}

function isRowOverdue(row: DayMatrixRow): boolean {
  return isPrepOverdue(row.ctx.fixture, row.ctx.day.date)
}

function BoardCard({
  row,
  selected,
  admin,
  mineTrader,
  onSelect,
  onAssign,
  onMove,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  row: DayMatrixRow
  selected: boolean
  admin: boolean
  mineTrader: string
  onSelect: () => void
  onAssign: (trader: string | null, openPool: boolean) => void
  onMove: (target: DayMatrixGroupId) => void
  onDragStart: (event: React.DragEvent) => void
  onDragEnd: () => void
  dragging: boolean
}) {
  const { fixture, tournament, day } = row.ctx
  const coverageKind = resolveFixtureCoverageTagKind(fixture, tournament.code)
  const owner = rowOwnerLabel(row)
  const overdue = isRowOverdue(row)
  const isMine = owner === mineTrader
  const forwardTargets = BOARD_COLUMNS.filter((col) => col.droppable && col.id !== row.group)

  return (
    <article
      className={
        'cov-board-card' +
        ` cov-board-card--${row.tone}` +
        (selected ? ' cov-board-card--selected' : '') +
        (dragging ? ' cov-board-card--dragging' : '') +
        (overdue ? ' cov-board-card--overdue' : '')
      }
      data-fixture-id={fixture.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${fixture.time} ${formatFixtureMatchLabel(fixture)} · ${tournament.name} · ${day.label}. Drag to a highlighted column for the next step, or open for details.`}
    >
      <button type="button" className="cov-board-card-hit" onClick={onSelect} aria-label={`Open ${fixture.match} details`}>
        <span className="cov-board-card-top">
          <time className="cov-board-card-time">{fixture.time}</time>
          {overdue ? (
            <span className="cov-board-card-flag" title={`Prep overdue (due ${fixture.prepareBy ?? 'past due'})`}>⚑ Overdue</span>
          ) : null}
          {row.group === 'price-check' ? <span className="cov-chip cov-chip--warn">PC</span> : null}
        </span>
        <span className="cov-board-card-match">{formatFixtureMatchLabel(fixture)}</span>
        <span className="cov-board-card-meta">
          <span className="cov-chip cov-chip--neutral">{tournament.code}</span>
          <span className={`cov-chip cov-chip--${row.tier === 1 ? 'warn' : 'neutral'}`}>T{row.tier}</span>
          {coverageKind ? (
            <span className={coverageTagClassName(coverageKind)}>{COVERAGE_TAG_LABEL[coverageKind]}</span>
          ) : null}
          {row.scout ? (
            <span className="cov-chip cov-chip--info" title="Scout attached for trading">🔭 Scout</span>
          ) : null}
        </span>
        {row.markets ? (
          <span className="cov-board-card-markets">
            <MarketsProgressBar progress={row.markets} compact />
          </span>
        ) : null}
        <span className="cov-board-card-action" title={row.actionDetail ? `${row.actionLabel} (${row.actionDetail})` : row.actionLabel}>
          {row.actionLabel}
          {row.actionDetail ? <span className="cov-board-card-action-detail">{row.actionDetail}</span> : null}
        </span>
      </button>
      <span className="cov-board-card-foot">
        {owner ? (
          <span
            className={'cov-board-avatar' + (isMine ? ' cov-board-avatar--mine' : '')}
            title={row.task ? `${owner} owns ${DAY_MATRIX_TASK_META[row.task].label}` : owner}
          >
            {traderInitials(owner)}
          </span>
        ) : row.taskOpen ? (
          <span className="cov-board-avatar cov-board-avatar--open" title={row.task ? `${DAY_MATRIX_TASK_META[row.task].label} is open — anyone can claim` : 'Open pool'}>
            Any
          </span>
        ) : (
          <span className="cov-board-avatar cov-board-avatar--none" title="Needs a named owner">!</span>
        )}
        {admin && row.task ? (
          <label className="cov-board-assign" onClick={(e) => e.stopPropagation()}>
            <span className="cov-sr-only">Assign {DAY_MATRIX_TASK_META[row.task].label} owner</span>
            <select
              className="cov-board-assign-select"
              value={owner ?? (row.taskOpen ? '__open__' : '__needs__')}
              onChange={(e) => {
                const value = e.target.value
                if (value === '__open__') onAssign(null, true)
                else if (value === '__needs__') onAssign(null, false)
                else onAssign(value, false)
              }}
            >
              <option value="__open__">Open · anyone</option>
              <option value="__needs__">Needs owner…</option>
              {getAssignableTraders().map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="cov-board-owner-name">{owner ?? (row.taskOpen ? 'Open' : '—')}</span>
        )}
        <details className="cov-board-menu" onClick={(e) => e.stopPropagation()}>
          <summary className="cov-board-menu-trigger" title="Move card / open details" aria-label="Card actions">⋯</summary>
          <div className="cov-board-menu-panel">
            <button type="button" className="cov-board-menu-item" onClick={onSelect}>Open details</button>
            {forwardTargets.map((target) => (
              <button key={target.id} type="button" className="cov-board-menu-item" onClick={() => onMove(target.id)}>
                Move → {target.title}
              </button>
            ))}
          </div>
        </details>
      </span>
    </article>
  )
}

export default function CoverageBoard({
  days,
  persona,
  statusFilter,
  contentFilters,
  selectedFixtureId,
  onSelect,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  days: ScheduleDay[]
  persona: Persona
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
}) {
  const [scope, setScope] = useState<'day' | 'week'>('day')
  const [dayDate, setDayDate] = useState<string | null>(null)
  const [mineOnly, setMineOnly] = useState(false)
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [mineTrader, setMineTrader] = useState(() => getDefaultPreviewTraderName())
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DayMatrixGroupId | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const admin = persona === 'admin'
  const revision = getScheduleRevision()

  const activeDay = scope === 'day' ? (days.find((day) => day.date === dayDate) ?? pickDefaultDay(days)) : null
  const activeIndex = activeDay ? days.findIndex((day) => day.date === activeDay.date) : -1

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const rows = useMemo(() => {
    const scopeDays = scope === 'day' ? (activeDay ? [activeDay] : []) : days
    const all: DayMatrixRow[] = []
    for (const day of scopeDays) {
      const matrix = buildDayMatrix(day, { statusFilter, contentFilters })
      all.push(...matrix.groups.flatMap((group) => group.rows))
    }
    all.sort((a, b) => a.minutes - b.minutes || a.ctx.fixture.match.localeCompare(b.ctx.fixture.match))
    return all
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
  }, [scope, activeDay, days, statusFilter, contentFilters, revision])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (mineOnly && rowOwnerLabel(row) !== mineTrader) return false
      if (unassignedOnly && rowOwnerLabel(row)) return false
      if (overdueOnly && !isRowOverdue(row)) return false
      if (query) {
        const haystack = `${row.ctx.fixture.match} ${row.ctx.tournament.code} ${row.ctx.tournament.name}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [rows, mineOnly, unassignedOnly, overdueOnly, search, mineTrader])

  const columnCounts = useMemo(() => {
    const map = new Map<DayMatrixGroupId, number>()
    const unowned = new Map<DayMatrixGroupId, number>()
    for (const row of filtered) {
      map.set(row.group, (map.get(row.group) ?? 0) + 1)
      if (row.needsAction && !rowOwnerLabel(row)) unowned.set(row.group, (unowned.get(row.group) ?? 0) + 1)
    }
    return { map, unowned }
  }, [filtered])

  const assignOwner = useCallback(
    (row: DayMatrixRow, trader: string | null, openPool: boolean) => {
      if (!row.task || !onUpdateAssignment) return
      if (trader) onUpdateAssignment(row.ctx.fixture.id, { taskOwner: { task: row.task, trader } })
      else onUpdateAssignment(row.ctx.fixture.id, { taskOwner: { task: row.task, trader: null, open: openPool } })
      const match = formatFixtureMatchLabel(row.ctx.fixture)
      setToast(trader ? `${trader} assigned · ${match}` : openPool ? `Open to anyone · ${match}` : `Needs a named owner · ${match}`)
    },
    [onUpdateAssignment],
  )

  const moveCard = useCallback(
    (row: DayMatrixRow, targetId: DayMatrixGroupId) => {
      const target = BOARD_COLUMN_META[targetId]
      if (!target.droppable || !target.dropAction) {
        setToast(`${target.title} is not a drop target — ${target.dropHint}`)
        return
      }
      if (row.group === targetId) return
      onMarkLifecycle?.(row.ctx.fixture.id, target.dropAction)
      setToast(`${formatFixtureMatchLabel(row.ctx.fixture)} → ${target.title}`)
    },
    [onMarkLifecycle],
  )

  const scopeLabel = scope === 'day' ? (activeDay?.label ?? 'Pick a day') : `Week · ${days.length} days · ${filtered.length} cards`

  return (
    <div className="cov-board cov-board--p2">
      <div className="cov-board-top">
        <div className="cov-board-scope" role="toolbar" aria-label="Board scope">
          <div className="cov-tabs cov-tabs--chrome">
            <button type="button" className={'cov-tab cov-tab--sm' + (scope === 'day' ? ' cov-tab-active' : '')} onClick={() => setScope('day')}>
              Day
            </button>
            <button type="button" className={'cov-tab cov-tab--sm' + (scope === 'week' ? ' cov-tab-active' : '')} onClick={() => setScope('week')}>
              Week
            </button>
          </div>
          {scope === 'day' && days.length > 0 ? (
            <div className="cov-board-daynav" aria-label="Board day">
              <button type="button" className="cov-btn cov-btn--icon cov-btn--sm" aria-label="Previous day" disabled={activeIndex <= 0} onClick={() => setDayDate(days[activeIndex - 1].date)}>‹</button>
              <span className="cov-board-daylabel">{activeDay?.label}</span>
              <button type="button" className="cov-btn cov-btn--icon cov-btn--sm" aria-label="Next day" disabled={activeIndex >= days.length - 1} onClick={() => setDayDate(days[activeIndex + 1].date)}>›</button>
            </div>
          ) : null}
          {scope === 'week' ? <span className="cov-muted">{scopeLabel}</span> : null}
        </div>
        <div className="cov-board-filters" role="toolbar" aria-label="Board quick filters">
          <input
            className="cov-input cov-board-search"
            type="search"
            placeholder="Search team / competition…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search cards by team or competition"
          />
          <label className="cov-board-mine">
            <span className="cov-sr-only">My tasks identity</span>
            <select className="cov-day-picker-select" value={mineTrader} onChange={(e) => setMineTrader(e.target.value)} title="Who counts as me for the Mine filter">
              {getAssignableTraders().map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </label>
          <button type="button" className={'cov-tab cov-tab--sm' + (mineOnly ? ' cov-tab-active' : '')} onClick={() => setMineOnly((v) => !v)} aria-pressed={mineOnly}>
            Mine{ mineOnly ? ` (${mineTrader})` : ''}
          </button>
          <button type="button" className={'cov-tab cov-tab--sm' + (unassignedOnly ? ' cov-tab-active' : '')} onClick={() => setUnassignedOnly((v) => !v)} aria-pressed={unassignedOnly}>
            Unassigned
          </button>
          <button type="button" className={'cov-tab cov-tab--sm' + (overdueOnly ? ' cov-tab-active' : '')} onClick={() => setOverdueOnly((v) => !v)} aria-pressed={overdueOnly}>
            Overdue
          </button>
        </div>
      </div>

      <div className="cov-board-toast" role="status" aria-live="polite">{toast}</div>

      {filtered.length === 0 ? (
        <p className="cov-empty-msg">No cards match the current filters — try widening the scope or clearing search.</p>
      ) : (
        <div className="cov-board-scroll" tabIndex={0} aria-label={`Coverage board — ${scopeLabel}`}>
          <div className="cov-board-grid" style={{ ['--board-cols' as string]: BOARD_COLUMNS.length }}>
            <div className="cov-board-row cov-board-row--head" role="row">
              <div className="cov-board-corner" role="columnheader">
                <span className="cov-board-corner-title">Swimlane · stage</span>
                <span className="cov-board-corner-sub">{filtered.length} cards</span>
              </div>
              {BOARD_COLUMNS.map((col) => {
                const count = columnCounts.map.get(col.id) ?? 0
                const unowned = columnCounts.unowned.get(col.id) ?? 0
                return (
                  <div
                    key={col.id}
                    role="columnheader"
                    className={'cov-board-colhead' + (col.droppable ? ' cov-board-colhead--droppable' : '') + (dropTarget === col.id ? ' cov-board-colhead--drop' : '')}
                    title={col.droppable ? col.dropHint : `${DAY_MATRIX_GROUP_META[col.id].action}. ${col.dropHint}`}
                  >
                    <span className="cov-board-colhead-title">{col.title}</span>
                    <span className="cov-board-colhead-count" title="WIP: cards in this stage">WIP {count}</span>
                    {unowned > 0 ? <span className="cov-chip cov-chip--danger">{unowned} need owner</span> : null}
                  </div>
                )
              })}
            </div>
            {BOARD_LANES.map((lane) => {
              const laneRows = filtered.filter((row) => lane.matches(row))
              if (laneRows.length === 0) return null
              return (
                <div key={lane.id} className="cov-board-row cov-board-row--lane" role="rowgroup" aria-label={lane.label}>
                  <div className="cov-board-lanehead" role="rowheader">
                    <span className="cov-board-lane-title">{lane.label}</span>
                    <span className="cov-board-lane-count">{laneRows.length} card{laneRows.length !== 1 ? 's' : ''}</span>
                  </div>
                  {BOARD_COLUMNS.map((col) => {
                    const cards = laneRows.filter((row) => row.group === col.id)
                    return (
                      <div
                        key={col.id}
                        role="gridcell"
                        className={'cov-board-col' + (col.droppable ? ' cov-board-col--droppable' : '') + (dropTarget === col.id ? ' cov-board-col--drop' : '')}
                        onDragOver={(e) => {
                          if (!col.droppable) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          setDropTarget(col.id)
                        }}
                        onDragLeave={() => setDropTarget((t) => (t === col.id ? null : t))}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDropTarget(null)
                          if (!draggingKey) return
                          const row = filtered.find((r) => r.key === draggingKey)
                          if (row) moveCard(row, col.id)
                          setDraggingKey(null)
                        }}
                        title={col.droppable ? col.dropHint : undefined}
                      >
                        {cards.length === 0 ? (
                          <span className="cov-board-empty">—</span>
                        ) : (
                          cards.map((row) => (
                            <BoardCard
                              key={row.key}
                              row={row}
                              selected={selectedFixtureId === row.ctx.fixture.id}
                              admin={admin}
                              mineTrader={mineTrader}
                              onSelect={() => onSelect(row.ctx)}
                              onAssign={(trader, openPool) => assignOwner(row, trader, openPool)}
                              onMove={(target) => moveCard(row, target)}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', row.key)
                                e.dataTransfer.effectAllowed = 'move'
                                setDraggingKey(row.key)
                              }}
                              onDragEnd={() => {
                                setDraggingKey(null)
                                setDropTarget(null)
                              }}
                              dragging={draggingKey === row.key}
                            />
                          ))
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <p className="cov-muted cov-board-hint">
        Drag cards onto highlighted columns to advance them (prep done → publish → settle). Price check and Needs prep are not drop targets — {admin ? 'assign owners with the card picker; ' : ''}open a card for full details. 🔭 Scout is a match attribute shown on the card, assigned in the match panel.
      </p>
    </div>
  )
}
