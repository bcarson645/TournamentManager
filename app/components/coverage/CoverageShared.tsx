'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  allWeekFixtures,
  countStatusFilter,
  countPrepDueFilter,
  DEFAULT_CONTENT_FILTERS,
  findFixtureByIdAndDate,
  getScheduleRevision,
  formatFixtureMatchDisplay,
  formatPrepCompletedLabel,
  formatPrepDueLabel,
  formatScheduleTournamentCellLabel,
  formatScheduleTournamentCellMeta,
  getScheduleTournamentDisplayName,
  fixtureMatchesFilters,
  coverageTagClassName,
  coverageTagKindFromLabel,
  fixtureIsNotCovered,
  fixtureIsPreMatchOnly,
  fixtureNeedsPrep,
  fixtureNeedsTrader,
  getFixtureTier,
  IMPORTED_TOURNAMENTS,
  isPrepDueSoon,
  isPrepOverdue,
  isSimulatedFixture,
  matchMatchesStatusFilter,
  PREP_DUE_FILTERS,
  SCHEDULE_DAYS,
  STATUS_FILTERS,
  STATUS_FILTER_TONE,
  type PrepDueFilter,
  type Persona,
  type ScheduleContentFilters,
  type ScheduleDay,
  type ScheduleFixture,
  type ScheduleListMode,
  type ScheduleLayoutDensity,
  formatPrepDueShortLabel,
  type ScheduleTournamentGroup,
  type SelectedMatchContext,
  type StatusFilter,
  type TierFilter,
  type CoverageTagKind,
  type FixtureAssignmentPatch,
  type FixtureLifecycleAction,
} from '../../data/coverageScheduleStore'
import StatusPipelineStrip from '../CoverageStatusPipeline'
import CoverageMatchPanel from './CoverageMatchPanel'
import CoverageDayMatrix from './CoverageDayMatrix'
import CoverageBoard from './CoverageBoard'
import FixtureMarketsBar from './CoverageMarketsProgress'

export function CoverageTag({
  kind,
  children,
  className = '',
}: {
  kind: CoverageTagKind
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`${coverageTagClassName(kind)}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}

function fixtureCoveragePillClass(kind: CoverageTagKind): string {
  return `cov-fixture-coverage-pill ${coverageTagClassName(kind)}`
}

export function MatchPanelMount({
  selected,
  persona,
  onClose,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  selected: SelectedMatchContext
  persona: Persona
  onClose: () => void
  onUpdateAssignment?: (patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (action: FixtureLifecycleAction) => void
}) {
  return (
    <div className="cov-match-panel-mount" role="dialog" aria-modal="true" aria-label="Match detail">
      <button
        type="button"
        className="cov-match-drawer-backdrop"
        onClick={onClose}
        aria-label="Close match panel"
        tabIndex={-1}
      />
      <CoverageMatchPanel
        key={`${selected.day.date}:${selected.fixture.id}`}
        fixture={selected.fixture}
        day={selected.day}
        tournament={selected.tournament}
        persona={persona}
        onClose={onClose}
        onUpdateAssignment={onUpdateAssignment}
        onMarkLifecycle={onMarkLifecycle}
      />
    </div>
  )
}

export function scrollSelectedFixtureIntoView(fixtureId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-fixture-id="${fixtureId}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  })
}

/**
 * Selected-match state shared by every view that opens the match panel.
 *
 * The schedule store mutates fixtures in place, so a stored copy of the selection goes stale. We keep
 * only the identity (fixture id + day) and re-resolve it from the store on every render — keyed on the
 * store revision — so the panel always shows what was just saved, even when the fixture appears on
 * more than one day or only exists in a tournament listing.
 */
export function useSelectedMatch(
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void,
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void,
) {
  const [picked, setPicked] = useState<SelectedMatchContext | null>(null)
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)
  const revision = getScheduleRevision()

  const selected = useMemo(() => {
    if (!picked) return null
    return findFixtureByIdAndDate(picked.fixture.id, picked.day.date) ?? picked
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
  }, [picked, revision])

  const handleUpdateAssignment = useCallback(
    (patch: FixtureAssignmentPatch) => {
      if (!selected || !onUpdateAssignment) return
      onUpdateAssignment(selected.fixture.id, patch)
      forceRender()
    },
    [selected, onUpdateAssignment],
  )

  const handleMarkLifecycle = useCallback(
    (action: FixtureLifecycleAction) => {
      if (!selected || !onMarkLifecycle) return
      onMarkLifecycle(selected.fixture.id, action)
      forceRender()
    },
    [selected, onMarkLifecycle],
  )

  const clear = useCallback(() => setPicked(null), [])

  useEffect(() => {
    if (!picked) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPicked(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [picked])

  return { selected, setSelected: setPicked, clear, handleUpdateAssignment, handleMarkLifecycle }
}

export function ScheduleMatchSplit({
  selected,
  persona,
  onClose,
  onUpdateAssignment,
  onMarkLifecycle,
  fill = false,
  children,
}: {
  selected: SelectedMatchContext | null
  persona: Persona
  onClose: () => void
  onUpdateAssignment?: (patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (action: FixtureLifecycleAction) => void
  /** Let the child manage its own scrolling (sticky headers / horizontal scroll). */
  fill?: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!selected) return
    scrollSelectedFixtureIntoView(selected.fixture.id)
  }, [selected?.fixture.id, selected?.day.date])

  // Lock page scroll behind the full-screen drawer on narrow viewports.
  useEffect(() => {
    if (!selected) return
    const query = window.matchMedia('(max-width: 1099px)')
    if (!query.matches) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [selected != null])

  return (
    <div className={'cov-schedule-split' + (selected ? ' cov-schedule-split--open' : '')}>
      <div className="cov-schedule-split-main">
        <div className={'cov-schedule-scroll' + (fill ? ' cov-schedule-scroll--fill' : '')}>{children}</div>
      </div>
      {selected ? (
        <MatchPanelMount
          selected={selected}
          persona={persona}
          onClose={onClose}
          onUpdateAssignment={onUpdateAssignment}
          onMarkLifecycle={onMarkLifecycle}
        />
      ) : null}
    </div>
  )
}

export function StatusFilterBar({
  statusFilter,
  onChange,
  days = SCHEDULE_DAYS,
  compact = false,
}: {
  statusFilter: StatusFilter
  onChange: (filter: StatusFilter) => void
  days?: ScheduleDay[]
  compact?: boolean
}) {
  return (
    <div className="cov-filter-group" role="toolbar" aria-label="Status filters">
      <span className={compact ? 'cov-chrome-label' : 'cov-schedule-filters-label'}>Status</span>
      {STATUS_FILTERS.map((filter) => {
        const count =
          filter.id === 'all' ? allWeekFixtures(days).length : countStatusFilter(filter.id, days)
        const active = statusFilter === filter.id
        const tone = STATUS_FILTER_TONE[filter.id]
        const toneClass = tone ? ` cov-tab--status-${tone}` : ''
        return (
          <button
            key={filter.id}
            type="button"
            className={
              'cov-tab' +
              (compact ? ' cov-tab--sm' : '') +
              toneClass +
              (active ? ' cov-tab-active' : '')
            }
            onClick={() => onChange(filter.id)}
          >
            {filter.label}
            {filter.id !== 'all' ? ` (${count})` : ''}
          </button>
        )
      })}
    </div>
  )
}

export function ContentFilterBar({
  filters,
  onChange,
  compact = false,
}: {
  filters: ScheduleContentFilters
  onChange: (filters: ScheduleContentFilters) => void
  compact?: boolean
}) {
  const tierOptions: { id: TierFilter; label: string }[] = [
    { id: 'all', label: 'All tiers' },
    { id: 'tier-1', label: 'Tier 1' },
    { id: 'tier-1-2', label: 'Tier 1–2' },
    { id: 'tier-3', label: 'Tier 3' },
  ]

  return (
    <div className="cov-filter-group" role="toolbar" aria-label="Content filters">
      <span className={compact ? 'cov-chrome-label' : 'cov-schedule-filters-label'}>Tier</span>
      <button
        type="button"
        className={'cov-tab' + (compact ? ' cov-tab--sm' : '') + (filters.showSrl ? ' cov-tab-active' : '')}
        onClick={() => onChange({ ...filters, showSrl: !filters.showSrl })}
      >
        Show SRL
      </button>
      {tierOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          className={'cov-tab' + (compact ? ' cov-tab--sm' : '') + (filters.tierFilter === option.id ? ' cov-tab-active' : '')}
          onClick={() => onChange({ ...filters, tierFilter: option.id })}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function PrepDueFilterBar({
  prepDueFilter,
  onChange,
  days = SCHEDULE_DAYS,
  compact = false,
}: {
  prepDueFilter: PrepDueFilter
  onChange: (filter: PrepDueFilter) => void
  days?: ScheduleDay[]
  compact?: boolean
}) {
  return (
    <div className="cov-filter-group" role="toolbar" aria-label="Prep due filters">
      <span className={compact ? 'cov-chrome-label' : 'cov-schedule-filters-label'}>Prep due</span>
      {PREP_DUE_FILTERS.map((filter) => {
        const count =
          filter.id === 'all' ? null : countPrepDueFilter(filter.id, days)
        const active = prepDueFilter === filter.id
        return (
          <button
            key={filter.id}
            type="button"
            className={
              'cov-tab' +
              (compact ? ' cov-tab--sm' : '') +
              (filter.id === 'overdue' ? ' cov-tab--status-publish' : '') +
              (active ? ' cov-tab-active' : '')
            }
            onClick={() => onChange(filter.id)}
          >
            {filter.label}
            {count != null ? ` (${count})` : ''}
          </button>
        )
      })}
    </div>
  )
}

function PrepDueColumn({
  fixture,
  dayDate,
  layoutDensity = 'condensed',
}: {
  fixture: ScheduleFixture
  dayDate?: string
  layoutDensity?: ScheduleLayoutDensity
}) {
  if (!fixtureNeedsPrep(fixture)) {
    return <span className="cov-muted">—</span>
  }
  const overdue = dayDate ? isPrepOverdue(fixture, dayDate) : false
  const dueSoon = !overdue && dayDate ? isPrepDueSoon(fixture, dayDate) : false
  const dueLabel = dayDate ? formatPrepDueLabel(fixture, dayDate) : null
  const shortDueLabel = dayDate ? formatPrepDueShortLabel(fixture, dayDate) : null
  const completedLabel = formatPrepCompletedLabel(fixture)
  const compact = layoutDensity === 'compact'

  if (completedLabel) {
    const display = compact ? '✓' : completedLabel
    return (
      <span className="cov-fixture-prep-due cov-fixture-prep-due--done" title={completedLabel}>
        {display}
      </span>
    )
  }
  if (!dueLabel) return <span className="cov-muted">—</span>

  const className =
    'cov-fixture-prep-due' +
    (overdue ? ' cov-fixture-prep-due--overdue' : dueSoon ? ' cov-prep-due--soon' : '')

  return (
    <span className={className} title={dueLabel}>
      {compact ? shortDueLabel : dueLabel}
      {!compact && overdue ? <span className="cov-fixture-prep-overdue-badge">Overdue</span> : null}
    </span>
  )
}

function renderPrepColumn(fixture: ScheduleFixture) {
  return fixture.prep ? (
    <span className="cov-fixture-prep-pill">{fixture.prep}</span>
  ) : (
    <span className="cov-muted">—</span>
  )
}

function renderFixtureMatchTitle(
  fixture: ScheduleFixture,
  matchDisplay: { display: string; full: string },
  layoutDensity: ScheduleLayoutDensity,
) {
  const compact = layoutDensity === 'compact'
  return (
    <span className="cov-fixture-title cov-fixture-match" title={matchDisplay.full}>
      {matchDisplay.display}
      {!compact && fixture.fcDay ? ` · ${fixture.fcDay}` : ''}
    </span>
  )
}

function matchMaxCharsForDensity(layoutDensity: ScheduleLayoutDensity): number {
  if (layoutDensity === 'compact') return 0
  return 36
}

function pipelineVariantForDensity(layoutDensity: ScheduleLayoutDensity): 'default' | 'dots' {
  return layoutDensity === 'compact' ? 'dots' : 'default'
}

export function scheduleLayoutDensityClass(layoutDensity: ScheduleLayoutDensity): string {
  if (layoutDensity === 'compact') return ' cov-schedule-layout--compact'
  return ' cov-schedule-layout--condensed'
}

export function FixtureCard({
  fixture,
  selected,
  onSelect,
  tournamentCode,
  dayDate,
  layoutDensity = 'condensed',
}: {
  fixture: ScheduleFixture
  selected: boolean
  onSelect: () => void
  tournamentCode?: string
  dayDate?: string
  layoutDensity?: ScheduleLayoutDensity
}) {
  const tier = tournamentCode ? getFixtureTier(fixture, tournamentCode) : fixture.tier
  const simulated = tournamentCode ? isSimulatedFixture(fixture, tournamentCode) : false
  const preMatchOnly = fixtureIsPreMatchOnly(fixture)
  const notCovered = fixtureIsNotCovered(fixture)
  const needsTrader = fixtureNeedsTrader(fixture)
  const tier1PriceCheck = tier === 1 && fixture.needsPriceCheck
  const showGap = fixture.gap && !simulated && needsTrader
  const prepOverdue = dayDate ? isPrepOverdue(fixture, dayDate) : false
  const matchDisplay = formatFixtureMatchDisplay(fixture, matchMaxCharsForDensity(layoutDensity))
  const compact = layoutDensity === 'compact'
  const cardClass =
    'cov-fixture-card' +
    (selected ? ' cov-fixture-card--selected' : '') +
    (showGap ? ' cov-fixture-card--gap' : '') +
    (prepOverdue ? ' cov-fixture-card--prep-overdue' : '') +
    (preMatchOnly ? ' cov-fixture-card--pre-match' : '') +
    (notCovered ? ' cov-fixture-card--not-covered' : '') +
    (tier1PriceCheck ? ' cov-fixture-card--price-check' : '')

  function renderTraderColumn() {
    if (simulated) {
      return <span className={fixtureCoveragePillClass('simulated')}>Sim</span>
    }
    if (notCovered) {
      return <span className={fixtureCoveragePillClass('not-covered')}>{compact ? 'NC' : 'Not covered'}</span>
    }
    if (preMatchOnly) {
      return (
        <div className="cov-fixture-col-coverage">
          <span className={fixtureCoveragePillClass('pre-match')}>{compact ? 'PM' : 'Pre-match'}</span>
          {!compact ? <span className="cov-fixture-col-note">Publish only</span> : null}
        </div>
      )
    }
    if (fixture.trading) {
      return <span className="cov-fixture-trader-pill">{fixture.trading}</span>
    }
    return <span className="cov-chip cov-chip--danger">{compact ? '!' : 'Unassigned'}</span>
  }

  return (
    <button
      type="button"
      className={cardClass}
      data-fixture-id={fixture.id}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <time className="cov-fixture-col-time">{fixture.time}</time>
      <div className="cov-fixture-col-match">
        {renderFixtureMatchTitle(fixture, matchDisplay, layoutDensity)}
        {!compact ? (
          <div className="cov-fixture-chips">
            {tier ? (
              <span className={`cov-chip cov-chip--${tier === 1 ? 'warn' : 'neutral'}`}>T{tier}</span>
            ) : null}
            {tournamentCode ? <span className="cov-chip cov-chip--neutral">{tournamentCode}</span> : null}
            {fixture.coverageLabel ? (
              <CoverageTag kind={coverageTagKindFromLabel(fixture.coverageLabel)}>
                {fixture.coverageLabel}
              </CoverageTag>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="cov-fixture-col-trader">
        {!compact && !simulated && needsTrader ? <span className="cov-fixture-trader-label">Trading</span> : null}
        {renderTraderColumn()}
      </div>
      <div className="cov-fixture-col-prep">
        {!compact ? <span className="cov-fixture-trader-label">Prep</span> : null}
        {renderPrepColumn(fixture)}
      </div>
      <div className="cov-fixture-col-prep-by">
        {!compact ? <span className="cov-fixture-trader-label">Prep by</span> : null}
        <PrepDueColumn fixture={fixture} dayDate={dayDate} layoutDensity={layoutDensity} />
      </div>
      <div className="cov-fixture-col-pipeline">
        <StatusPipelineStrip fixture={fixture} variant={pipelineVariantForDensity(layoutDensity)} />
      </div>
      <div className="cov-fixture-col-markets">
        {simulated || notCovered ? (
          <span className="cov-muted">—</span>
        ) : (
          <FixtureMarketsBar fixture={fixture} compact={compact} />
        )}
      </div>
    </button>
  )
}

function FixtureTableGameRow({
  fixture,
  tournament,
  day,
  selected,
  onSelect,
  layoutDensity = 'condensed',
}: {
  fixture: ScheduleFixture
  tournament: ScheduleTournamentGroup
  day: ScheduleDay
  selected: boolean
  onSelect: () => void
  layoutDensity?: ScheduleLayoutDensity
}) {
  const tier = getFixtureTier(fixture, tournament.code)
  const simulated = isSimulatedFixture(fixture, tournament.code)
  const preMatchOnly = fixtureIsPreMatchOnly(fixture)
  const notCovered = fixtureIsNotCovered(fixture)
  const needsTrader = fixtureNeedsTrader(fixture)
  const tier1PriceCheck = tier === 1 && fixture.needsPriceCheck
  const showGap = fixture.gap && !simulated && needsTrader
  const prepOverdue = isPrepOverdue(fixture, day.date)
  const matchDisplay = formatFixtureMatchDisplay(fixture, matchMaxCharsForDensity(layoutDensity))
  const compact = layoutDensity === 'compact'
  const rowClass =
    'cov-tournament-table-game' +
    (selected ? ' cov-tournament-table-game--selected' : '') +
    (showGap ? ' cov-tournament-table-game--gap' : '') +
    (prepOverdue ? ' cov-tournament-table-game--prep-overdue' : '') +
    (preMatchOnly ? ' cov-tournament-table-game--pre-match' : '') +
    (notCovered ? ' cov-tournament-table-game--not-covered' : '')

  function renderTraderColumn() {
    if (simulated) {
      return <span className={fixtureCoveragePillClass('simulated')}>Sim</span>
    }
    if (notCovered) {
      return <span className={fixtureCoveragePillClass('not-covered')}>{compact ? 'NC' : 'Not covered'}</span>
    }
    if (preMatchOnly) {
      return (
        <div className="cov-fixture-col-coverage">
          <span className={fixtureCoveragePillClass('pre-match')}>{compact ? 'PM' : 'Pre-match'}</span>
          {!compact ? <span className="cov-fixture-col-note">Publish only</span> : null}
        </div>
      )
    }
    if (fixture.trading) {
      return <span className="cov-fixture-trader-pill">{fixture.trading}</span>
    }
    return <span className="cov-chip cov-chip--danger">{compact ? '!' : 'Unassigned'}</span>
  }

  return (
    <button
      type="button"
      className={rowClass}
      data-fixture-id={fixture.id}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <time className="cov-fixture-col-time">{fixture.time}</time>
      <div className="cov-fixture-col-match">
        {renderFixtureMatchTitle(fixture, matchDisplay, layoutDensity)}
        {!compact ? (
          <div className="cov-fixture-chips">
            {tier ? (
              <span className={`cov-chip cov-chip--${tier === 1 ? 'warn' : 'neutral'}`}>T{tier}</span>
            ) : null}
            {fixture.coverageLabel ? (
              <CoverageTag kind={coverageTagKindFromLabel(fixture.coverageLabel)}>
                {fixture.coverageLabel}
              </CoverageTag>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="cov-fixture-col-trader">
        {!compact && !simulated && needsTrader ? <span className="cov-fixture-trader-label">Trading</span> : null}
        {renderTraderColumn()}
      </div>
      <div className="cov-fixture-col-prep">
        {!compact ? <span className="cov-fixture-trader-label">Prep</span> : null}
        {renderPrepColumn(fixture)}
      </div>
      <div className="cov-fixture-col-prep-by">
        {!compact ? <span className="cov-fixture-trader-label">Prep by</span> : null}
        <PrepDueColumn fixture={fixture} dayDate={day.date} layoutDensity={layoutDensity} />
      </div>
      <div className="cov-fixture-col-pipeline">
        <StatusPipelineStrip fixture={fixture} variant={pipelineVariantForDensity(layoutDensity)} />
      </div>
      <div className="cov-fixture-col-markets">
        {simulated || notCovered ? (
          <span className="cov-muted">—</span>
        ) : (
          <FixtureMarketsBar fixture={fixture} compact={compact} />
        )}
      </div>
    </button>
  )
}

function DayTournamentTable({
  day,
  visibleGroups,
  selectedFixtureId,
  onSelect,
  onOpenTournament,
  layoutDensity = 'condensed',
}: {
  day: ScheduleDay
  visibleGroups: { group: ScheduleTournamentGroup; matches: ScheduleFixture[] }[]
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onOpenTournament?: (code: string) => void
  layoutDensity?: ScheduleLayoutDensity
}) {
  return (
    <div className="cov-tournament-table cov-tournament-table--p2">
      <div className="cov-tournament-table-header" aria-hidden="true">
        <span>Tournament</span>
        <span>Time</span>
        <span>Match</span>
        <span>Trading / coverage</span>
        <span>Prep</span>
        <span>Prep by</span>
        <span>Status</span>
        <span>Markets</span>
      </div>
      <div className="cov-tournament-table-body">
        {visibleGroups.flatMap(({ group, matches }) => {
          const singleGame = matches.length === 1
          const displayLabel = formatScheduleTournamentCellLabel(group)
          const metaLabel = formatScheduleTournamentCellMeta(group, matches.length)
          const compact = layoutDensity === 'compact'
          const cellLabel = compact && !singleGame ? group.code : displayLabel
          const cellTitle = `Open ${getScheduleTournamentDisplayName(group)}`
          const cellTier = matches.reduce<number | null>(
            (best, fixture) => {
              const tier = getFixtureTier(fixture, group.code)
              return best == null || tier < best ? tier : best
            },
            null,
          )
          return [
          <button
            key={`${group.code}-tournament`}
            type="button"
            className={
              'cov-tournament-table-cell' +
              (singleGame ? ' cov-tournament-table-cell--single' : ' cov-tournament-table-cell--multi')
            }
            style={{ gridRow: `span ${matches.length}` }}
            onClick={() => onOpenTournament?.(group.code)}
            title={cellTitle}
            {...(cellTier != null ? { 'data-tier': `t${cellTier}` } : {})}
          >
            {cellTier != null && !compact ? (
              <span className="cov-tournament-cell-pills" aria-hidden="true">
                <span className="cov-tournament-tier-pill" data-tier={`t${cellTier}`}>
                  T{cellTier}
                </span>
              </span>
            ) : null}
            <span className="cov-tournament-table-name" title={displayLabel}>
              {cellLabel}
            </span>
            {!compact && metaLabel ? <span className="cov-tournament-table-meta">{metaLabel}</span> : null}
          </button>,
          ...matches.map((fixture) => (
            <FixtureTableGameRow
              key={fixture.id}
              fixture={fixture}
              tournament={group}
              day={day}
              selected={selectedFixtureId === fixture.id}
              onSelect={() => onSelect({ fixture, day, tournament: group })}
              layoutDensity={layoutDensity}
            />
          )),
          ]
        })}
      </div>
    </div>
  )
}

function DayFixtureList({
  day,
  groups,
  statusFilter,
  contentFilters,
  selectedFixtureId,
  onSelect,
  onOpenTournament,
  layoutDensity = 'condensed',
}: {
  day: ScheduleDay
  groups: ScheduleTournamentGroup[]
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onOpenTournament?: (code: string) => void
  layoutDensity?: ScheduleLayoutDensity
}) {
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          matches: group.matches.filter((fixture) =>
            fixtureMatchesFilters(fixture, group.code, statusFilter, contentFilters, day.dailyLead, day.date),
          ),
        }))
        .filter((entry) => entry.matches.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
    [groups, statusFilter, contentFilters, day.dailyLead, day.date, getScheduleRevision()],
  )

  if (visibleGroups.length === 0) {
    return <p className="cov-empty-msg">No fixtures match the current filters.</p>
  }

  return (
    <DayTournamentTable
      day={day}
      visibleGroups={visibleGroups}
      selectedFixtureId={selectedFixtureId}
      onSelect={onSelect}
      onOpenTournament={onOpenTournament}
      layoutDensity={layoutDensity}
    />
  )
}

export function DayBlockCard({
  day,
  statusFilter,
  contentFilters,
  selectedFixtureId,
  onSelect,
  onOpenTournament,
  layoutDensity = 'condensed',
}: {
  day: ScheduleDay
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onOpenTournament?: (code: string) => void
  layoutDensity?: ScheduleLayoutDensity
}) {
  const visibleGroups = useMemo(
    () =>
      day.tournaments
        .map((group) => ({
          group,
          matches: group.matches.filter((fixture) =>
            fixtureMatchesFilters(fixture, group.code, statusFilter, contentFilters, day.dailyLead, day.date),
          ),
        }))
        .filter((entry) => entry.matches.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates in-place store mutations
    [day.tournaments, statusFilter, contentFilters, day.dailyLead, day.date, getScheduleRevision()],
  )

  const visibleCount = visibleGroups.reduce((sum, entry) => sum + entry.matches.length, 0)
  const hasGap = visibleGroups.some((entry) =>
    entry.matches.some((f) => f.gap && fixtureNeedsTrader(f)),
  )

  if (visibleCount === 0) return null

  return (
    <article className={'cov-day-block' + (hasGap ? ' cov-day-block--gap' : '')}>
      <header className="cov-day-block-head">
        <div className="cov-day-block-head-main">
          <h3 className="cov-day-block-title">{day.label}</h3>
          <span className="cov-chip cov-chip--info">Lead: {day.dailyLead}</span>
          {hasGap ? <span className="cov-chip cov-chip--danger">Gap</span> : null}
          <span className="cov-day-block-meta">
            {visibleCount} game{visibleCount !== 1 ? 's' : ''}
            {visibleGroups.length > 1 ? ` · ${visibleGroups.length} comps` : ''}
          </span>
        </div>
        <div className="cov-day-block-traders">
          <span className="cov-day-block-traders-label">On</span>
          {day.tradersOn.map((name) => (
            <span key={name} className="cov-chip cov-chip--neutral">{name}</span>
          ))}
        </div>
      </header>
      <div className="cov-day-block-body">
        <DayFixtureList
          day={day}
          groups={day.tournaments}
          statusFilter={statusFilter}
          contentFilters={contentFilters}
          selectedFixtureId={selectedFixtureId}
          onSelect={onSelect}
          onOpenTournament={onOpenTournament}
          layoutDensity={layoutDensity}
        />
      </div>
    </article>
  )
}

function AllGamesList({
  days,
  statusFilter,
  contentFilters,
  selectedFixtureId,
  onSelect,
  layoutDensity = 'condensed',
}: {
  days: ScheduleDay[]
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  layoutDensity?: ScheduleLayoutDensity
}) {
  const items: SelectedMatchContext[] = []
  for (const day of days) {
    for (const tournament of day.tournaments) {
      for (const fixture of tournament.matches) {
        if (fixtureMatchesFilters(fixture, tournament.code, statusFilter, contentFilters, day.dailyLead, day.date)) {
          items.push({ fixture, day, tournament })
        }
      }
    }
  }

  // `items` is rebuilt every render, so this memo simply groups the fresh list by day.
  const sections = useMemo(() => {
    const map = new Map<string, { label: string; items: SelectedMatchContext[] }>()
    for (const ctx of items) {
      if (!map.has(ctx.day.date)) {
        map.set(ctx.day.date, { label: ctx.day.label, items: [] })
      }
      map.get(ctx.day.date)!.items.push(ctx)
    }
    return [...map.values()]
  }, [items])

  if (items.length === 0) return <p className="cov-empty-msg">No fixtures match filter.</p>

  return (
    <div className="cov-day-list">
      {sections.map((section) => (
        <section key={section.label} className="cov-all-games-section">
          <header className="cov-all-games-day-head">
            <h3 className="cov-all-games-day-title">{section.label}</h3>
            <span className="cov-muted">{section.items.length} game{section.items.length !== 1 ? 's' : ''}</span>
          </header>
          <div className="cov-fixture-list">
            {section.items.map((ctx) => (
              <FixtureCard
                key={ctx.fixture.id}
                fixture={ctx.fixture}
                tournamentCode={ctx.tournament.code}
                dayDate={ctx.day.date}
                selected={selectedFixtureId === ctx.fixture.id}
                onSelect={() => onSelect(ctx)}
                layoutDensity={layoutDensity}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TournamentList({
  statusFilter,
  contentFilters,
  onOpenTournament,
}: {
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  onOpenTournament: (code: string) => void
}) {
  const dailyLeadByDate = useMemo(
    () => new Map(SCHEDULE_DAYS.map((scheduleDay) => [scheduleDay.date, scheduleDay.dailyLead])),
    [],
  )

  const tournaments = IMPORTED_TOURNAMENTS.filter((t) => {
    if (!contentFilters.showSrl && t.code === 'SRL') return false
    return t.fixtures.some((f) =>
      fixtureMatchesFilters(
        f,
        t.code,
        statusFilter,
        contentFilters,
        dailyLeadByDate.get(f.dateIso),
        f.dateIso,
      ),
    )
  })

  return (
    <div className="cov-tournament-grid">
      {tournaments.map((t) => (
        <button
          key={t.code}
          type="button"
          className="cov-tournament-card"
          onClick={() => onOpenTournament(t.code)}
        >
          <div className="cov-tournament-card-head">
            <span className="cov-chip cov-chip--neutral">{t.code}</span>
            {t.gapCount > 0 ? <span className="cov-chip cov-chip--danger">{t.gapCount} gaps</span> : null}
          </div>
          <strong className="cov-tournament-card-name">{t.name}</strong>
          <p className="cov-muted">{t.fixtureCount} fixtures · {t.format ?? 'Cricket'}</p>
        </button>
      ))}
    </div>
  )
}

export function WeekScheduleLayout({
  persona,
  statusFilter,
  days,
  listMode = 'by-day',
  layoutDensity = 'condensed',
  contentFilters = DEFAULT_CONTENT_FILTERS,
  onOpenTournament,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  persona: Persona
  statusFilter: StatusFilter
  days: ScheduleDay[]
  listMode?: ScheduleListMode
  layoutDensity?: ScheduleLayoutDensity
  contentFilters?: ScheduleContentFilters
  onOpenTournament?: (code: string) => void
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
}) {
  const { selected, setSelected, clear, handleUpdateAssignment, handleMarkLifecycle } = useSelectedMatch(
    onUpdateAssignment,
    onMarkLifecycle,
  )

  const scheduleList = (
    <div className={'cov-view-stack cov-view-stack--schedule' + scheduleLayoutDensityClass(layoutDensity)}>
      {listMode === 'by-day' ? (
        <div className="cov-day-list">
          {days.map((day) => (
            <DayBlockCard
              key={day.date}
              day={day}
              statusFilter={statusFilter}
              contentFilters={contentFilters}
              selectedFixtureId={selected?.fixture.id ?? null}
              onSelect={setSelected}
              onOpenTournament={onOpenTournament}
              layoutDensity={layoutDensity}
            />
          ))}
        </div>
      ) : null}

      {listMode === 'all-games' ? (
        <AllGamesList
          days={days}
          statusFilter={statusFilter}
          contentFilters={contentFilters}
          selectedFixtureId={selected?.fixture.id ?? null}
          onSelect={setSelected}
          layoutDensity={layoutDensity}
        />
      ) : null}

      {listMode === 'by-tournament' ? (
        <TournamentList
          statusFilter={statusFilter}
          contentFilters={contentFilters}
          onOpenTournament={(code) => onOpenTournament?.(code)}
        />
      ) : null}
    </div>
  )

  if (listMode === 'day-matrix') {
    return (
      <ScheduleMatchSplit
        selected={selected}
        persona={persona}
        onClose={clear}
        onUpdateAssignment={handleUpdateAssignment}
        onMarkLifecycle={handleMarkLifecycle}
        fill
      >
        <CoverageDayMatrix
          days={days}
          persona={persona}
          onUpdateAssignment={onUpdateAssignment}
          statusFilter={statusFilter}
          contentFilters={contentFilters}
          layoutDensity={layoutDensity}
          selectedFixtureId={selected?.fixture.id ?? null}
          onSelect={setSelected}
        />
      </ScheduleMatchSplit>
    )
  }

  if (listMode === 'board') {
    return (
      <ScheduleMatchSplit
        selected={selected}
        persona={persona}
        onClose={clear}
        onUpdateAssignment={handleUpdateAssignment}
        onMarkLifecycle={handleMarkLifecycle}
        fill
      >
        <CoverageBoard
          days={days}
          persona={persona}
          statusFilter={statusFilter}
          contentFilters={contentFilters}
          layoutDensity={layoutDensity}
          selectedFixtureId={selected?.fixture.id ?? null}
          onSelect={setSelected}
          onUpdateAssignment={onUpdateAssignment}
          onMarkLifecycle={onMarkLifecycle}
        />
      </ScheduleMatchSplit>
    )
  }

  return (
    <ScheduleMatchSplit
      selected={selected}
      persona={persona}
      onClose={clear}
      onUpdateAssignment={handleUpdateAssignment}
      onMarkLifecycle={handleMarkLifecycle}
    >
      {scheduleList}
    </ScheduleMatchSplit>
  )
}

export function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'warn' | 'active' | 'done'
}) {
  return (
    <div className={'cov-stat' + (tone ? ` cov-stat--${tone}` : '')}>
      <span className="cov-stat-value">{value}</span>
      <span className="cov-stat-label">{label}</span>
    </div>
  )
}

export function PanelCard({
  title,
  children,
  actions,
}: {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <section className="cov-panel-card">
      <header className="cov-panel-card-head">
        <h3 className="cov-panel-card-title">{title}</h3>
        {actions ? <div className="cov-panel-card-actions">{actions}</div> : null}
      </header>
      <div className="cov-panel-card-body">{children}</div>
    </section>
  )
}
