'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  allWeekFixtures,
  countStatusFilter,
  DEFAULT_CONTENT_FILTERS,
  findFixtureById,
  formatFixtureMatchDisplay,
  formatScheduleTournamentCellLabel,
  formatScheduleTournamentCellMeta,
  getScheduleTournamentDisplayName,
  fixtureMatchesFilters,
  coverageTagClassName,
  coverageTagKindFromLabel,
  fixtureIsNotCovered,
  fixtureIsPreMatchOnly,
  fixtureNeedsTrader,
  getFixtureTier,
  IMPORTED_TOURNAMENTS,
  isSimulatedFixture,
  matchMatchesStatusFilter,
  SCHEDULE_DAYS,
  STATUS_FILTERS,
  STATUS_FILTER_TONE,
  type Persona,
  type ScheduleContentFilters,
  type ScheduleDay,
  type ScheduleFixture,
  type ScheduleListMode,
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
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

export function ScheduleMatchSplit({
  selected,
  persona,
  onClose,
  onUpdateAssignment,
  onMarkLifecycle,
  children,
}: {
  selected: SelectedMatchContext | null
  persona: Persona
  onClose: () => void
  onUpdateAssignment?: (patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (action: FixtureLifecycleAction) => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!selected) return
    scrollSelectedFixtureIntoView(selected.fixture.id)
  }, [selected?.fixture.id])

  return (
    <div className={'cov-schedule-split' + (selected ? ' cov-schedule-split--open' : '')}>
      <div className="cov-schedule-split-main">
        <div className="cov-schedule-scroll">{children}</div>
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

function renderPrepColumn(fixture: ScheduleFixture) {
  if (fixture.prep) {
    return <span className="cov-fixture-prep-pill">{fixture.prep}</span>
  }
  return <span className="cov-muted">—</span>
}

export function FixtureCard({
  fixture,
  selected,
  onSelect,
  tournamentCode,
}: {
  fixture: ScheduleFixture
  selected: boolean
  onSelect: () => void
  tournamentCode?: string
}) {
  const tier = tournamentCode ? getFixtureTier(fixture, tournamentCode) : fixture.tier
  const simulated = tournamentCode ? isSimulatedFixture(fixture, tournamentCode) : false
  const preMatchOnly = fixtureIsPreMatchOnly(fixture)
  const notCovered = fixtureIsNotCovered(fixture)
  const needsTrader = fixtureNeedsTrader(fixture)
  const tier1PriceCheck = tier === 1 && fixture.needsPriceCheck
  const showGap = fixture.gap && !simulated && needsTrader
  const matchDisplay = formatFixtureMatchDisplay(fixture)
  const cardClass =
    'cov-fixture-card' +
    (selected ? ' cov-fixture-card--selected' : '') +
    (showGap ? ' cov-fixture-card--gap' : '') +
    (preMatchOnly ? ' cov-fixture-card--pre-match' : '') +
    (notCovered ? ' cov-fixture-card--not-covered' : '') +
    (tier1PriceCheck ? ' cov-fixture-card--price-check' : '')

  function renderTraderColumn() {
    if (simulated) {
      return <span className={fixtureCoveragePillClass('simulated')}>Sim</span>
    }
    if (notCovered) {
      return <span className={fixtureCoveragePillClass('not-covered')}>Not covered</span>
    }
    if (preMatchOnly) {
      return (
        <div className="cov-fixture-col-coverage">
          <span className={fixtureCoveragePillClass('pre-match')}>Pre-match</span>
          <span className="cov-fixture-col-note">Publish only</span>
        </div>
      )
    }
    if (fixture.trading) {
      return <span className="cov-fixture-trader-pill">{fixture.trading}</span>
    }
    return <span className="cov-chip cov-chip--danger">Unassigned</span>
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
        <span className="cov-fixture-title cov-fixture-match" title={matchDisplay.full}>
          {matchDisplay.display}
          {fixture.fcDay ? ` · ${fixture.fcDay}` : ''}
        </span>
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
      </div>
      <div className="cov-fixture-col-trader">
        {!simulated && needsTrader ? <span className="cov-fixture-trader-label">Trading</span> : null}
        {renderTraderColumn()}
      </div>
      <div className="cov-fixture-col-prep">
        <span className="cov-fixture-trader-label">Prep</span>
        {renderPrepColumn(fixture)}
      </div>
      <div className="cov-fixture-col-pipeline">
        <StatusPipelineStrip fixture={fixture} />
      </div>
      <div className="cov-fixture-col-markets">
        {fixture.marketsSent != null ? (
          <span className="cov-fixture-markets">{fixture.marketsSent} mkts</span>
        ) : (
          <span className="cov-muted">—</span>
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
}: {
  fixture: ScheduleFixture
  tournament: ScheduleTournamentGroup
  day: ScheduleDay
  selected: boolean
  onSelect: () => void
}) {
  const tier = getFixtureTier(fixture, tournament.code)
  const simulated = isSimulatedFixture(fixture, tournament.code)
  const preMatchOnly = fixtureIsPreMatchOnly(fixture)
  const notCovered = fixtureIsNotCovered(fixture)
  const needsTrader = fixtureNeedsTrader(fixture)
  const tier1PriceCheck = tier === 1 && fixture.needsPriceCheck
  const showGap = fixture.gap && !simulated && needsTrader
  const matchDisplay = formatFixtureMatchDisplay(fixture)
  const rowClass =
    'cov-tournament-table-game' +
    (selected ? ' cov-tournament-table-game--selected' : '') +
    (showGap ? ' cov-tournament-table-game--gap' : '') +
    (preMatchOnly ? ' cov-tournament-table-game--pre-match' : '') +
    (notCovered ? ' cov-tournament-table-game--not-covered' : '')

  function renderTraderColumn() {
    if (simulated) {
      return <span className={fixtureCoveragePillClass('simulated')}>Sim</span>
    }
    if (notCovered) {
      return <span className={fixtureCoveragePillClass('not-covered')}>Not covered</span>
    }
    if (preMatchOnly) {
      return (
        <div className="cov-fixture-col-coverage">
          <span className={fixtureCoveragePillClass('pre-match')}>Pre-match</span>
          <span className="cov-fixture-col-note">Publish only</span>
        </div>
      )
    }
    if (fixture.trading) {
      return <span className="cov-fixture-trader-pill">{fixture.trading}</span>
    }
    return <span className="cov-chip cov-chip--danger">Unassigned</span>
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
        <span className="cov-fixture-title cov-fixture-match" title={matchDisplay.full}>
          {matchDisplay.display}
          {fixture.fcDay ? ` · ${fixture.fcDay}` : ''}
        </span>
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
      </div>
      <div className="cov-fixture-col-trader">
        {!simulated && needsTrader ? <span className="cov-fixture-trader-label">Trading</span> : null}
        {renderTraderColumn()}
      </div>
      <div className="cov-fixture-col-prep">
        <span className="cov-fixture-trader-label">Prep</span>
        {renderPrepColumn(fixture)}
      </div>
      <div className="cov-fixture-col-pipeline">
        <StatusPipelineStrip fixture={fixture} />
      </div>
      <div className="cov-fixture-col-markets">
        {fixture.marketsSent != null ? (
          <span className="cov-fixture-markets">{fixture.marketsSent} mkts</span>
        ) : (
          <span className="cov-muted">—</span>
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
}: {
  day: ScheduleDay
  visibleGroups: { group: ScheduleTournamentGroup; matches: ScheduleFixture[] }[]
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onOpenTournament?: (code: string) => void
}) {
  return (
    <div className="cov-tournament-table">
      <div className="cov-tournament-table-header" aria-hidden="true">
        <span>Tournament</span>
        <span>Time</span>
        <span>Match</span>
        <span>Trading / coverage</span>
        <span>Prep</span>
        <span>Status</span>
        <span>Mkts</span>
      </div>
      <div className="cov-tournament-table-body">
        {visibleGroups.flatMap(({ group, matches }) => {
          const singleGame = matches.length === 1
          const displayLabel = formatScheduleTournamentCellLabel(group)
          const metaLabel = formatScheduleTournamentCellMeta(group, matches.length)
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
            title={`Open ${getScheduleTournamentDisplayName(group)}`}
          >
            <span className="cov-tournament-table-name" title={displayLabel}>
              {displayLabel}
            </span>
            {metaLabel ? <span className="cov-tournament-table-meta">{metaLabel}</span> : null}
          </button>,
          ...matches.map((fixture) => (
            <FixtureTableGameRow
              key={fixture.id}
              fixture={fixture}
              tournament={group}
              day={day}
              selected={selectedFixtureId === fixture.id}
              onSelect={() => onSelect({ fixture, day, tournament: group })}
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
}: {
  day: ScheduleDay
  groups: ScheduleTournamentGroup[]
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onOpenTournament?: (code: string) => void
}) {
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          matches: group.matches.filter((fixture) =>
            fixtureMatchesFilters(fixture, group.code, statusFilter, contentFilters, day.dailyLead),
          ),
        }))
        .filter((entry) => entry.matches.length > 0),
    [groups, statusFilter, contentFilters, day.dailyLead],
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
}: {
  day: ScheduleDay
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
  onOpenTournament?: (code: string) => void
}) {
  const visibleGroups = useMemo(
    () =>
      day.tournaments
        .map((group) => ({
          group,
          matches: group.matches.filter((fixture) =>
            fixtureMatchesFilters(fixture, group.code, statusFilter, contentFilters, day.dailyLead),
          ),
        }))
        .filter((entry) => entry.matches.length > 0),
    [day.tournaments, statusFilter, contentFilters, day.dailyLead],
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
}: {
  days: ScheduleDay[]
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  selectedFixtureId: string | null
  onSelect: (ctx: SelectedMatchContext) => void
}) {
  const items: SelectedMatchContext[] = []
  for (const day of days) {
    for (const tournament of day.tournaments) {
      for (const fixture of tournament.matches) {
        if (fixtureMatchesFilters(fixture, tournament.code, statusFilter, contentFilters, day.dailyLead)) {
          items.push({ fixture, day, tournament })
        }
      }
    }
  }

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
                selected={selectedFixtureId === ctx.fixture.id}
                onSelect={() => onSelect(ctx)}
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
  contentFilters = DEFAULT_CONTENT_FILTERS,
  onOpenTournament,
  onUpdateAssignment,
  onMarkLifecycle,
}: {
  persona: Persona
  statusFilter: StatusFilter
  days: ScheduleDay[]
  listMode?: ScheduleListMode
  contentFilters?: ScheduleContentFilters
  onOpenTournament?: (code: string) => void
  onUpdateAssignment?: (fixtureId: string, patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (fixtureId: string, action: FixtureLifecycleAction) => void
}) {
  const [selected, setSelected] = useState<SelectedMatchContext | null>(null)

  function refreshSelected() {
    if (!selected) return
    const refreshed = findFixtureById(selected.fixture.id)
    if (refreshed) setSelected(refreshed)
  }

  function handleUpdateAssignment(patch: FixtureAssignmentPatch) {
    if (!selected || !onUpdateAssignment) return
    onUpdateAssignment(selected.fixture.id, patch)
    refreshSelected()
  }

  function handleMarkLifecycle(action: FixtureLifecycleAction) {
    if (!selected || !onMarkLifecycle) return
    onMarkLifecycle(selected.fixture.id, action)
    refreshSelected()
  }

  useEffect(() => {
    if (!selected) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  const scheduleList = (
    <div className="cov-view-stack cov-view-stack--schedule">
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

  return (
    <ScheduleMatchSplit
      selected={selected}
      persona={persona}
      onClose={() => setSelected(null)}
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
