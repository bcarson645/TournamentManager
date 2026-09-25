'use client'

import { useEffect, useRef } from 'react'
import {
  ADMIN_SCHEDULE_VIEWS,
  TRADER_SCHEDULE_VIEWS,
  scheduleDayRangeForDayIndex,
  scheduleDayRangeFromPreset,
  type Persona,
  type ScheduleContentFilters,
  type ScheduleDay,
  type ScheduleDayRange,
  type ScheduleDayRangePreset,
  type ScheduleListMode,
  type ScheduleView,
  type StatusFilter,
} from '../../data/coverageScheduleStore'
import type { Trader } from '../../data/traders'
import { COV_THEME_OPTIONS, type CovTheme } from './covTheme'
import { ContentFilterBar, StatusFilterBar } from './CoverageShared'

export type WhosOnViewMode = 'day' | 'month'

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
  covTheme = 'default',
  onCovThemeChange,
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
    { id: 'all', label: 'All days' },
  ]

  const activePreset =
    dayRange?.mode === 'all'
      ? 'all'
      : dayRange?.mode === 'week' && dayRange.startIndex === 0
        ? 'this-week'
        : dayRange?.mode === 'week' && dayRange.startIndex === 7
          ? 'next-week'
          : null

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
    <nav className="cov-chrome cov-chrome--fixed" aria-label="Coverage schedule navigation">
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
        </div>

        {onCovThemeChange ? (
          <>
            <span className="cov-chrome-divider" aria-hidden="true" />
            <div className="cov-chrome-group cov-chrome-group--theme">
              <span className="cov-chrome-label">Style</span>
              <div className="cov-theme-picker" role="radiogroup" aria-label="Coverage style theme">
                {COV_THEME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={covTheme === option.id}
                    className={
                      'cov-tab cov-tab--sm cov-theme-option' +
                      (covTheme === option.id ? ' cov-tab-active' : '')
                    }
                    onClick={() => onCovThemeChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="cov-chrome-actions">
          {isAdmin ? (
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
          ) : (
            <>
              <span className="cov-chip cov-chip--info">Can&apos;t assign</span>
              {gapCount > 0 ? (
                <span className="cov-chip cov-chip--danger">{gapCount} gaps this week</span>
              ) : null}
            </>
          )}
        </div>
      </div>

      {showPeriodNav || showMyRotaMonthNav || showWhosOnMonthNav || showWhosOnDayNav || showScheduleContext || showTraderPicker || (activeView === 'traders' && onWhosOnViewModeChange) ? (
        <div className="cov-chrome-context">
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
            </>
          ) : null}

        </div>
      ) : null}

      {showScheduleFilters || (activeView === 'traders' && onShowAllTradersChange) ? (
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
