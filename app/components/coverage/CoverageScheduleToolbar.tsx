'use client'

import { useEffect, useRef } from 'react'
import {
  ADMIN_SCHEDULE_VIEWS,
  TRADER_SCHEDULE_VIEWS,
  scheduleDayRangeForDayIndex,
  scheduleDayRangeFromPreset,
  matchScheduleDayRangePreset,
  type Persona,
  type CoverageTaskId,
  type ScheduleContentFilters,
  type ScheduleDay,
  type ScheduleDayRange,
  type ScheduleDayRangePreset,
  SCHEDULE_LAYOUT_DENSITY_OPTIONS,
  type ScheduleListMode,
  type ScheduleLayoutDensity,
  type ScheduleView,
  type StatusFilter,
} from '../../data/coverageScheduleStore'
import type { Trader } from '../../data/traders'
import { DAY_MATRIX_TASK_META } from '../../data/coverageDayMatrix'
import { isCovDarkTheme, toggleCovTheme, type CovTheme } from './covTheme'
import { ContentFilterBar, PrepDueFilterBar, StatusFilterBar } from './CoverageShared'

export type WhosOnViewMode = 'day' | 'month'

/** Selected-day context for the status bar: that day's date, staffing and actions needed by task. */
export interface CoverageDayContext {
  day: ScheduleDay
  counts: Record<CoverageTaskId, number>
  needsAction: number
  /** Rows that still need a named owner. */
  open: number
  tradersOn: number
  fixtures: number
  /** True when the range/view is pinning a single day. */
  isSingleDay: boolean
}

function rosterDayShortLabel(label: string): { weekday: string; rest: string } {
  const parts = label.split(' ')
  if (parts.length >= 3) {
    return { weekday: parts[0], rest: `${parts[1]} ${parts[2]}` }
  }
  return { weekday: label, rest: '' }
}

function isWeekendDate(dateIso: string): boolean {
  const day = new Date(`${dateIso}T12:00:00`).getDay()
  return day === 0 || day === 6
}

interface CoverageScheduleToolbarProps {
  persona: Persona
  activeView: ScheduleView
  onViewChange: (view: ScheduleView) => void
  onPersonaChange: (persona: Persona) => void
  onOpenCoverageNumbers?: () => void
  onOpenOpsAlerts?: () => void
  onOpenImport?: () => void
  onOpenReplicateSeason?: () => void
  gapCount?: number
  dayContext?: CoverageDayContext | null
  periodLabel?: string
  canGoPrevPeriod?: boolean
  canGoNextPeriod?: boolean
  onPrevPeriod?: () => void
  onNextPeriod?: () => void
  scheduleDays?: ScheduleDay[]
  allDays?: ScheduleDay[]
  dayRange?: ScheduleDayRange
  onDayRangeChange?: (range: ScheduleDayRange) => void
  listMode?: ScheduleListMode
  onListModeChange?: (mode: ScheduleListMode) => void
  layoutDensity?: ScheduleLayoutDensity
  onLayoutDensityChange?: (density: ScheduleLayoutDensity) => void
  totalGames?: number
  statusFilter?: StatusFilter
  onStatusFilterChange?: (filter: StatusFilter) => void
  statusFilterDays?: ScheduleDay[]
  contentFilters?: ScheduleContentFilters
  onContentFiltersChange?: (filters: ScheduleContentFilters) => void
  whosOnViewMode?: WhosOnViewMode
  onWhosOnViewModeChange?: (mode: WhosOnViewMode) => void
  whosOnDayIndex?: number
  onWhosOnDayIndexChange?: (index: number) => void
  whosOnMonthLabel?: string
  canGoPrevWhosOnMonth?: boolean
  canGoNextWhosOnMonth?: boolean
  onPrevWhosOnMonth?: () => void
  onNextWhosOnMonth?: () => void
  showAllTraders?: boolean
  onShowAllTradersChange?: (show: boolean) => void
  traders?: Trader[]
  selectedTrader?: string
  onSelectedTraderChange?: (traderName: string) => void
  myRotaMonthLabel?: string
  canGoPrevMyRotaMonth?: boolean
  canGoNextMyRotaMonth?: boolean
  onPrevMyRotaMonth?: () => void
  onNextMyRotaMonth?: () => void
  covTheme?: CovTheme
  onCovThemeChange?: (theme: CovTheme) => void
  filtersCollapsed?: boolean
  onFiltersCollapsedChange?: (collapsed: boolean) => void
}

export default function CoverageScheduleToolbar({
  persona,
  activeView,
  onViewChange,
  onPersonaChange,
  onOpenCoverageNumbers,
  onOpenOpsAlerts,
  onOpenImport,
  onOpenReplicateSeason,
  gapCount = 0,
  dayContext = null,
  periodLabel = 'Schedule',
  canGoPrevPeriod = false,
  canGoNextPeriod = false,
  onPrevPeriod,
  onNextPeriod,
  scheduleDays = [],
  allDays = scheduleDays,
  dayRange,
  onDayRangeChange,
  listMode = 'by-day',
  onListModeChange,
  layoutDensity = 'comfortable',
  onLayoutDensityChange,
  totalGames = 0,
  statusFilter = 'all',
  onStatusFilterChange,
  statusFilterDays = scheduleDays,
  contentFilters,
  onContentFiltersChange,
  whosOnViewMode = 'day',
  onWhosOnViewModeChange,
  whosOnDayIndex = 0,
  onWhosOnDayIndexChange,
  whosOnMonthLabel = 'Month',
  canGoPrevWhosOnMonth = false,
  canGoNextWhosOnMonth = false,
  onPrevWhosOnMonth,
  onNextWhosOnMonth,
  showAllTraders = false,
  onShowAllTradersChange,
  traders = [],
  selectedTrader = '',
  onSelectedTraderChange,
  myRotaMonthLabel = 'Month',
  canGoPrevMyRotaMonth = false,
  canGoNextMyRotaMonth = false,
  onPrevMyRotaMonth,
  onNextMyRotaMonth,
  covTheme = 'light-blue',
  onCovThemeChange,
  filtersCollapsed = false,
  onFiltersCollapsedChange,
}: CoverageScheduleToolbarProps) {
  const isAdmin = persona === 'admin'
  const views = isAdmin ? ADMIN_SCHEDULE_VIEWS : TRADER_SCHEDULE_VIEWS
  const menuRef = useRef<HTMLDetailsElement>(null)

  const showPeriodNav = activeView === 'schedule' || (activeView === 'traders' && whosOnViewMode === 'day')
  const showMyRotaMonthNav = activeView === 'my-rota'
  const showWhosOnMonthNav = activeView === 'traders' && whosOnViewMode === 'month'
  const showWhosOnDayNav = activeView === 'traders' && whosOnViewMode === 'day' && scheduleDays.length > 0
  const safeWhosOnIndex = scheduleDays.length
    ? Math.min(whosOnDayIndex, scheduleDays.length - 1)
    : 0
  const showScheduleContext = activeView === 'schedule' && onDayRangeChange && dayRange
  const showScheduleFilters =
    activeView === 'schedule' &&
    onStatusFilterChange &&
    onContentFiltersChange &&
    contentFilters
  const showTraderPicker =
    persona === 'trader' && traders.length > 0 && Boolean(onSelectedTraderChange)

  const dayPresets: { id: ScheduleDayRangePreset; label: string }[] = [
    { id: 'this-week', label: 'This week' },
    { id: 'next-week', label: 'Next week' },
    { id: 'four-weeks', label: '4 weeks' },
    { id: 'this-month', label: 'This month' },
    { id: 'all', label: 'All days' },
  ]

  const activePreset =
    dayRange && allDays.length
      ? dayPresets.find((preset) => matchScheduleDayRangePreset(dayRange, preset.id, allDays))?.id ?? null
      : null

  const activeViewLabel = views.find((view) => view.id === activeView)?.label ?? 'Schedule'

  const collapsedContextLabel = (() => {
    if (activeView === 'my-rota') return myRotaMonthLabel
    if (activeView === 'traders') {
      if (whosOnViewMode === 'month') return whosOnMonthLabel
      const day = scheduleDays[safeWhosOnIndex]
      return day?.label ?? periodLabel
    }
    return periodLabel
  })()

  const showCollapsibleSections =
    showPeriodNav ||
    showMyRotaMonthNav ||
    showWhosOnMonthNav ||
    showWhosOnDayNav ||
    showScheduleContext ||
    showTraderPicker ||
    (activeView === 'traders' && onWhosOnViewModeChange) ||
    showScheduleFilters ||
    (activeView === 'traders' && onShowAllTradersChange)

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.open) return
      if (!menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <nav
      className={
        'cov-chrome cov-chrome--fixed cov-chrome--enterprise' + (filtersCollapsed ? ' cov-chrome--filters-collapsed' : '')
      }
      aria-label="Coverage schedule navigation"
    >
      {dayContext ? (
        <div className="cov-chrome-day-summary" aria-live="polite" aria-label="Selected day summary">
          <span className="cov-chrome-day-summary-date">
            <strong>{dayContext.day.label}</strong>
            {dayContext.isSingleDay ? null : <span className="cov-chip cov-chip--neutral">Focus day</span>}
          </span>
          <span className="cov-chrome-day-summary-sep" aria-hidden="true">
            ·
          </span>
          <span className="cov-chrome-day-summary-traders" title={`On shift: ${dayContext.day.tradersOn.join(', ') || 'none listed'}`}>
            {dayContext.tradersOn} trader{dayContext.tradersOn === 1 ? '' : 's'} on
          </span>
          <span className="cov-chrome-day-summary-sep" aria-hidden="true">
            ·
          </span>
          <span className="cov-chrome-day-summary-tasks">
            {dayContext.needsAction > 0 ? (
              <>
                <strong>{dayContext.needsAction}</strong> need action
                <span className="cov-chrome-day-summary-task-list">
                  {(Object.keys(dayContext.counts) as CoverageTaskId[])
                    .filter((task) => dayContext.counts[task] > 0)
                    .map((task) => (
                      <span key={task} className="cov-chrome-day-summary-task">
                        {dayContext.counts[task]} {DAY_MATRIX_TASK_META[task].short}
                      </span>
                    ))}
                  {dayContext.open > 0 ? (
                    <span className="cov-chrome-day-summary-task cov-chrome-day-summary-task--open">
                      {dayContext.open} need owner
                    </span>
                  ) : null}
                </span>
              </>
            ) : (
              <span>All clear — nothing needs action</span>
            )}
          </span>
          <span className="cov-chrome-day-summary-fixtures">
            {dayContext.fixtures} fixture{dayContext.fixtures === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}
      <div className="cov-chrome-primary">
        <div className="cov-chrome-primary-start">
          <div className="cov-chrome-group">
            <span className="cov-chrome-label">View</span>
            <div className="cov-tabs cov-tabs--chrome">
              {views.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={'cov-tab cov-tab--sm' + (activeView === view.id ? ' cov-tab-active' : '')}
                  onClick={() => onViewChange(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {filtersCollapsed ? (
            <span className="cov-chrome-collapsed-summary" aria-live="polite">
              <span className="cov-chrome-collapsed-summary-view">{activeViewLabel}</span>
              {collapsedContextLabel ? (
                <>
                  <span className="cov-chrome-collapsed-summary-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="cov-chrome-collapsed-summary-context">{collapsedContextLabel}</span>
                </>
              ) : null}
            </span>
          ) : (
            <>
              <span className="cov-chrome-divider" aria-hidden="true" />
              <div className="cov-chrome-group cov-chrome-group--persona">
                <span className="cov-chrome-label">Preview as</span>
                <div className="cov-tabs cov-tabs--chrome">
                  <button
                    type="button"
                    className={'cov-tab cov-tab--sm' + (persona === 'trader' ? ' cov-tab-active' : '')}
                    onClick={() => onPersonaChange('trader')}
                  >
                    Trader
                  </button>
                  <button
                    type="button"
                    className={'cov-tab cov-tab--sm' + (persona === 'admin' ? ' cov-tab-active' : '')}
                    onClick={() => onPersonaChange('admin')}
                  >
                    Admin / OC
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {onCovThemeChange ? (
          <>
            <span className="cov-chrome-divider" aria-hidden="true" />
            <div className="cov-chrome-group cov-chrome-group--theme">
              <span className="cov-chrome-label">Theme</span>
              <button
                type="button"
                className="cov-btn cov-btn--sm cov-btn--icon cov-theme-toggle"
                aria-pressed={isCovDarkTheme(covTheme)}
                aria-label={isCovDarkTheme(covTheme) ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isCovDarkTheme(covTheme) ? 'Switch to light theme' : 'Switch to dark theme'}
                onClick={() => onCovThemeChange(toggleCovTheme(covTheme))}
              >
                <span aria-hidden="true" className="cov-theme-toggle-icon">
                  {isCovDarkTheme(covTheme) ? '☀' : '☾'}
                </span>
                <span className="cov-theme-toggle-label">
                  {isCovDarkTheme(covTheme) ? 'Light' : 'Dark'}
                </span>
              </button>
            </div>
          </>
        ) : null}

        <div className="cov-chrome-actions">
          {onFiltersCollapsedChange && showCollapsibleSections ? (
            <button
              type="button"
              className="cov-btn cov-btn--sm cov-btn--icon cov-chrome-collapse-toggle"
              aria-expanded={!filtersCollapsed}
              aria-controls="cov-chrome-collapsible"
              aria-label={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
              title={filtersCollapsed ? 'Expand filters' : 'Collapse filters'}
              onClick={() => onFiltersCollapsedChange(!filtersCollapsed)}
            >
              {filtersCollapsed ? '▾' : '▴'}
            </button>
          ) : null}

          {!filtersCollapsed && isAdmin ? (
            <>
              <span className="cov-chip cov-chip--danger">4 alerts</span>
              <button type="button" className="cov-btn cov-btn--sm cov-btn--primary" onClick={onOpenImport}>
                Add fixtures
              </button>
              <details className="cov-chrome-menu" ref={menuRef}>
                <summary className="cov-btn cov-btn--sm cov-chrome-menu-trigger">More</summary>
                <div className="cov-chrome-menu-panel">
                  <button type="button" className="cov-chrome-menu-item" onClick={onOpenOpsAlerts}>
                    Ops alerts
                  </button>
                  <button type="button" className="cov-chrome-menu-item" onClick={onOpenCoverageNumbers}>
                    Coverage numbers
                  </button>
                  <button type="button" className="cov-chrome-menu-item" onClick={onOpenReplicateSeason}>
                    Replicate season
                  </button>
                  <button type="button" className="cov-chrome-menu-item">Export</button>
                  <button type="button" className="cov-chrome-menu-item" disabled title="Format TBD">
                    Upload to PCM
                  </button>
                </div>
              </details>
            </>
          ) : !filtersCollapsed ? (
            <>
              <span className="cov-chip cov-chip--info">Can&apos;t assign</span>
              {gapCount > 0 ? (
                <span className="cov-chip cov-chip--danger">{gapCount} gaps this week</span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {!filtersCollapsed &&
      (showPeriodNav ||
        showMyRotaMonthNav ||
        showWhosOnMonthNav ||
        showWhosOnDayNav ||
        showScheduleContext ||
        showTraderPicker ||
        (activeView === 'traders' && onWhosOnViewModeChange)) ? (
        <div id="cov-chrome-collapsible" className="cov-chrome-context">
          {showTraderPicker ? (
            <div className="cov-chrome-group">
              <span className="cov-chrome-label">Trader</span>
              <label className="cov-day-picker cov-trader-picker">
                <span className="cov-sr-only">Pick trader to preview</span>
                <select
                  className="cov-day-picker-select cov-trader-picker-select"
                  value={selectedTrader}
                  onChange={(event) => onSelectedTraderChange?.(event.target.value)}
                >
                  {traders.map((trader) => (
                    <option key={trader.id} value={trader.name}>
                      {trader.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {showMyRotaMonthNav ? (
            <div className="cov-chrome-group">
              <span className="cov-chrome-label">Month</span>
              <div className="cov-schedule-period-nav" aria-label="My rota month">
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Previous month"
                  disabled={!canGoPrevMyRotaMonth}
                  onClick={onPrevMyRotaMonth}
                >
                  ←
                </button>
                <span className="cov-schedule-period-pill">{myRotaMonthLabel}</span>
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Next month"
                  disabled={!canGoNextMyRotaMonth}
                  onClick={onNextMyRotaMonth}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}

          {activeView === 'traders' && onWhosOnViewModeChange ? (
            <div className="cov-chrome-group">
              <span className="cov-chrome-label">View</span>
              <div className="cov-filter-group" role="toolbar" aria-label="Who's on view mode">
                <button
                  type="button"
                  className={'cov-tab cov-tab--sm' + (whosOnViewMode === 'day' ? ' cov-tab-active' : '')}
                  onClick={() => onWhosOnViewModeChange('day')}
                >
                  Day
                </button>
                <button
                  type="button"
                  className={'cov-tab cov-tab--sm' + (whosOnViewMode === 'month' ? ' cov-tab-active' : '')}
                  onClick={() => onWhosOnViewModeChange('month')}
                >
                  Month
                </button>
              </div>
            </div>
          ) : null}

          {showWhosOnDayNav ? (
            <div className="cov-chrome-group cov-chrome-group--grow">
              <span className="cov-chrome-label">Day</span>
              <div className="cov-whoson-day-nav">
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Previous day"
                  disabled={safeWhosOnIndex <= 0}
                  onClick={() => onWhosOnDayIndexChange?.(Math.max(0, safeWhosOnIndex - 1))}
                >
                  ←
                </button>
                <div className="cov-tabs cov-tabs--chrome cov-whoson-day-tabs">
                  {scheduleDays.map((day, index) => {
                    const short = rosterDayShortLabel(day.label)
                    const weekend = isWeekendDate(day.date)
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={
                          'cov-tab cov-tab--sm' +
                          (safeWhosOnIndex === index ? ' cov-tab-active' : '') +
                          (weekend ? ' cov-whoson-day-tab--weekend' : '')
                        }
                        onClick={() => onWhosOnDayIndexChange?.(index)}
                      >
                        {short.weekday} {short.rest.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Next day"
                  disabled={safeWhosOnIndex >= scheduleDays.length - 1}
                  onClick={() =>
                    onWhosOnDayIndexChange?.(Math.min(scheduleDays.length - 1, safeWhosOnIndex + 1))
                  }
                >
                  →
                </button>
              </div>
            </div>
          ) : null}

          {showWhosOnMonthNav ? (
            <div className="cov-chrome-group">
              <span className="cov-chrome-label">Month</span>
              <div className="cov-schedule-period-nav" aria-label="Who's on month">
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Previous month"
                  disabled={!canGoPrevWhosOnMonth}
                  onClick={onPrevWhosOnMonth}
                >
                  ←
                </button>
                <span className="cov-schedule-period-pill">{whosOnMonthLabel}</span>
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Next month"
                  disabled={!canGoNextWhosOnMonth}
                  onClick={onNextWhosOnMonth}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}

          {showPeriodNav && activeView !== 'traders' ? (
            <div className="cov-chrome-group">
              <span className="cov-chrome-label">Period</span>
              <div className="cov-schedule-period-nav" aria-label="Schedule period">
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Previous period"
                  disabled={!canGoPrevPeriod}
                  onClick={onPrevPeriod}
                >
                  ←
                </button>
                <span className="cov-schedule-period-pill">{periodLabel}</span>
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Next period"
                  disabled={!canGoNextPeriod}
                  onClick={onNextPeriod}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}

          {showPeriodNav && activeView === 'traders' ? (
            <div className="cov-chrome-group">
              <span className="cov-chrome-label">Period</span>
              <div className="cov-schedule-period-nav" aria-label="Schedule period">
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Previous period"
                  disabled={!canGoPrevPeriod}
                  onClick={onPrevPeriod}
                >
                  ←
                </button>
                <span className="cov-schedule-period-pill">{periodLabel}</span>
                <button
                  type="button"
                  className="cov-btn cov-btn--icon cov-btn--sm"
                  aria-label="Next period"
                  disabled={!canGoNextPeriod}
                  onClick={onNextPeriod}
                >
                  →
                </button>
              </div>
            </div>
          ) : null}

          {showScheduleContext ? (
            <>
              <div className="cov-chrome-group">
                <span className="cov-chrome-label">Range</span>
                <div className="cov-filter-group" role="toolbar" aria-label="Day range">
                  {dayPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={'cov-tab cov-tab--sm' + (activePreset === preset.id ? ' cov-tab-active' : '')}
                      onClick={() => onDayRangeChange!(scheduleDayRangeFromPreset(preset.id, allDays))}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <label className="cov-day-picker">
                    <span className="cov-sr-only">Pick a day</span>
                    <select
                      className="cov-day-picker-select"
                      value={dayRange!.mode === 'day' ? String(dayRange!.startIndex) : ''}
                      onChange={(event) => {
                        const value = event.target.value
                        if (value === '') {
                          onDayRangeChange!(scheduleDayRangeFromPreset('this-week', allDays))
                          return
                        }
                        onDayRangeChange!(scheduleDayRangeForDayIndex(Number(value), allDays))
                      }}
                    >
                      <option value="">Pick day…</option>
                      {allDays.map((day, index) => (
                        <option key={day.date} value={index}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              {onListModeChange ? (
                <div className="cov-chrome-group">
                  <span className="cov-chrome-label">Layout</span>
                  <div className="cov-filter-group" role="toolbar" aria-label="Layout">
                    <button
                      type="button"
                      className={'cov-tab cov-tab--sm' + (listMode === 'by-day' ? ' cov-tab-active' : '')}
                      onClick={() => onListModeChange('by-day')}
                    >
                      By day
                    </button>
                    <button
                      type="button"
                      className={'cov-tab cov-tab--sm' + (listMode === 'day-matrix' ? ' cov-tab-active' : '')}
                      onClick={() => onListModeChange('day-matrix')}
                      title="One day: fixtures as rows, traders on shift as columns"
                    >
                      Day matrix
                    </button>
                    <button
                      type="button"
                      className={'cov-tab cov-tab--sm' + (listMode === 'board' ? ' cov-tab-active' : '')}
                      onClick={() => onListModeChange('board')}
                      title="Kanban board: fixtures as cards, columns are workflow stages, lanes are tiers"
                    >
                      Board
                    </button>
                    <button
                      type="button"
                      className={'cov-tab cov-tab--sm' + (listMode === 'all-games' ? ' cov-tab-active' : '')}
                      onClick={() => onListModeChange('all-games')}
                    >
                      All ({totalGames})
                    </button>
                    <button
                      type="button"
                      className={'cov-tab cov-tab--sm' + (listMode === 'by-tournament' ? ' cov-tab-active' : '')}
                      onClick={() => onListModeChange('by-tournament')}
                    >
                      Tournaments
                    </button>
                  </div>
                </div>
              ) : null}
              {onLayoutDensityChange ? (
                <div className="cov-chrome-group">
                  <span className="cov-chrome-label">Density</span>
                  <div className="cov-filter-group" role="toolbar" aria-label="Schedule row density">
                    {SCHEDULE_LAYOUT_DENSITY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          'cov-tab cov-tab--sm' + (layoutDensity === option.id ? ' cov-tab-active' : '')
                        }
                        onClick={() => onLayoutDensityChange(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

        </div>
      ) : null}

      {!filtersCollapsed && (showScheduleFilters || (activeView === 'traders' && onShowAllTradersChange)) ? (
        <div className="cov-chrome-filters">
          {showScheduleFilters ? (
            <>
              <StatusFilterBar
                statusFilter={statusFilter}
                onChange={onStatusFilterChange}
                days={statusFilterDays}
                compact
              />
              <ContentFilterBar
                filters={contentFilters}
                onChange={onContentFiltersChange}
                compact
              />
              <PrepDueFilterBar
                prepDueFilter={contentFilters.prepDueFilter}
                onChange={(prepDueFilter) =>
                  onContentFiltersChange({ ...contentFilters, prepDueFilter })
                }
                days={statusFilterDays}
                compact
              />
              {traders.length > 0 ? (
                <div className="cov-filter-group" role="toolbar" aria-label="Trader filter">
                  <span className="cov-chrome-label">Trader</span>
                  <label className="cov-day-picker cov-trader-picker">
                    <span className="cov-sr-only">Filter by trader</span>
                    <select
                      className="cov-day-picker-select cov-trader-picker-select"
                      value={contentFilters.traderFilter ?? ''}
                      onChange={(event) =>
                        onContentFiltersChange({
                          ...contentFilters,
                          traderFilter: event.target.value || null,
                        })
                      }
                    >
                      <option value="">All traders</option>
                      {traders.map((trader) => (
                        <option key={trader.id} value={trader.name}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
          {activeView === 'traders' && onShowAllTradersChange ? (
            <div className="cov-filter-group" role="toolbar" aria-label="Who's on filters">
              <span className="cov-chrome-label">Filters</span>
              <button
                type="button"
                className={'cov-tab cov-tab--sm' + (showAllTraders ? ' cov-tab-active' : '')}
                onClick={() => onShowAllTradersChange(!showAllTraders)}
              >
                Show all traders
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  )
}
