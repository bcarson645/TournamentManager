'use client'



import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import {

  allWeekFixtures,

  canNavigateScheduleRange,

  DEFAULT_CONTENT_FILTERS,

  formatScheduleDayRangeLabel,

  getDefaultMyRotaMonth,

  getDefaultScheduleDayRange,

  findCoverageScheduleAnchorDayIndex,

  isPrepOverdue,

  getScheduleDaysSlice,

  canNavigateMyRotaMonth,

  formatMyRotaMonthLabel,

  navigateMyRotaMonth,

  type MyRotaMonth,

  navigateScheduleDayRange,

  SCHEDULE_DAYS,

  updateFixtureAssignment,
  updateFixtureLifecycle,

  type FixtureAssignmentPatch,
  type FixtureLifecycleAction,

  type Persona,

  type ScheduleContentFilters,

  type ScheduleDayRange,

  type ScheduleListMode,

  type ScheduleLayoutDensity,

  type ScheduleView,

  type StatusFilter,

} from '../data/coverageScheduleStore'

import { DEFAULT_TRADERS, getAssignableTraders } from '../data/traders'

import CoverageScheduleToolbar, { type WhosOnViewMode } from './coverage/CoverageScheduleToolbar'
import {
  applyCovThemeToDocument,
  COV_FILTERS_COLLAPSED_STORAGE_KEY,
  COV_THEME_STORAGE_KEY,
  readStoredCovTheme,
  readStoredFiltersCollapsed,
  type CovTheme,
} from './coverage/covTheme'

import { StatTile } from './coverage/CoverageShared'

import {

  CoverageNumbersView,

  ImportView,

  MyRotaView,

  OpsAlertsView,

  ReplicateSeasonView,

  TournamentDetailView,

  TradersRosterView,

  WeekScheduleView,

} from './coverage/CoverageViews'



interface CoverageScheduleSectionProps {

  standalone?: boolean

  covTheme?: CovTheme

  onCovThemeChange?: (theme: CovTheme) => void

}



const SECONDARY_VIEWS: ScheduleView[] = ['coverage-numbers', 'import', 'ops-alerts', 'replicate-season', 'tournament']



export default function CoverageScheduleSection({
  standalone = false,
  covTheme: covThemeProp,
  onCovThemeChange,
}: CoverageScheduleSectionProps) {

  const [persona, setPersona] = useState<Persona>('admin')

  const [activeView, setActiveView] = useState<ScheduleView>('schedule')

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [listMode, setListMode] = useState<ScheduleListMode>('by-day')

  const [layoutDensity, setLayoutDensity] = useState<ScheduleLayoutDensity>('comfortable')

  const [contentFilters, setContentFilters] = useState<ScheduleContentFilters>(DEFAULT_CONTENT_FILTERS)

  const [showAllTraders, setShowAllTraders] = useState(false)

  const [tournamentCode, setTournamentCode] = useState<string | null>(null)

  const [scheduleTick, setScheduleTick] = useState(0)

  const [dayRange, setDayRange] = useState<ScheduleDayRange>(() => getDefaultScheduleDayRange())

  const [selectedTrader, setSelectedTrader] = useState(() => {
    const dyer = DEFAULT_TRADERS.find((trader) => trader.name === 'Dyer')
    return dyer?.name ?? DEFAULT_TRADERS[0]?.name ?? 'Dyer'
  })

  const [myRotaMonth, setMyRotaMonth] = useState<MyRotaMonth>(() => getDefaultMyRotaMonth())

  const [whosOnMonth, setWhosOnMonth] = useState<MyRotaMonth>(() => getDefaultMyRotaMonth())

  const [whosOnViewMode, setWhosOnViewMode] = useState<WhosOnViewMode>('day')

  const [whosOnDayIndex, setWhosOnDayIndex] = useState(() => findCoverageScheduleAnchorDayIndex(SCHEDULE_DAYS))

  const [internalCovTheme, setInternalCovTheme] = useState<CovTheme>('light-blue')

  const [filtersCollapsed, setFiltersCollapsed] = useState(false)

  const covTheme = covThemeProp ?? internalCovTheme



  // The store mutates SCHEDULE_DAYS in place; hand out a fresh array per tick so every memo that
  // derives from it (visible slice, header stats, counts, matrix) recomputes after a save.
  const scheduleDays = useMemo(() => [...SCHEDULE_DAYS], [scheduleTick])

  const visibleDays = useMemo(() => getScheduleDaysSlice(scheduleDays, dayRange), [scheduleDays, dayRange])



  const handleUpdateAssignment = useCallback((fixtureId: string, patch: FixtureAssignmentPatch) => {

    updateFixtureAssignment(fixtureId, patch)

    setScheduleTick((tick) => tick + 1)

  }, [])

  const handleMarkLifecycle = useCallback((fixtureId: string, action: FixtureLifecycleAction) => {

    updateFixtureLifecycle(fixtureId, action)

    setScheduleTick((tick) => tick + 1)

  }, [])



  const stats = useMemo(() => {

    const fixtures = allWeekFixtures(visibleDays)

    let prepOverdue = 0

    for (const day of visibleDays) {

      for (const group of day.tournaments) {

        for (const fixture of group.matches) {

          if (isPrepOverdue(fixture, day.date)) prepOverdue++

        }

      }

    }

    return {

      total: fixtures.length,

      gaps: fixtures.filter((f) => f.gap).length,

      needsAction: fixtures.filter((f) => f.lifecycle === 'prepping' || f.lifecycle === 'price-check' || f.gap).length,

      settled: fixtures.filter((f) => f.lifecycle === 'settled').length,

      prepOverdue,

    }

  }, [visibleDays])



  const totalGames = useMemo(() => allWeekFixtures(visibleDays).length, [visibleDays])



  const periodLabel = useMemo(

    () => formatScheduleDayRangeLabel(scheduleDays, dayRange),

    [scheduleDays, dayRange],

  )



  const canGoPrevPeriod = useMemo(

    () => canNavigateScheduleRange(scheduleDays, dayRange, 'prev'),

    [scheduleDays, dayRange],

  )

  const canGoNextPeriod = useMemo(

    () => canNavigateScheduleRange(scheduleDays, dayRange, 'next'),

    [scheduleDays, dayRange],

  )

  const myRotaMonthLabel = useMemo(

    () => formatMyRotaMonthLabel(myRotaMonth.year, myRotaMonth.month),

    [myRotaMonth],

  )

  const canGoPrevMyRotaMonth = useMemo(

    () => canNavigateMyRotaMonth(myRotaMonth.year, myRotaMonth.month, 'prev', scheduleDays),

    [myRotaMonth, scheduleDays],

  )

  const canGoNextMyRotaMonth = useMemo(

    () => canNavigateMyRotaMonth(myRotaMonth.year, myRotaMonth.month, 'next', scheduleDays),

    [myRotaMonth, scheduleDays],

  )

  const goPrevMyRotaMonth = useCallback(() => {

    setMyRotaMonth((current) => navigateMyRotaMonth(current.year, current.month, 'prev'))

  }, [])

  const goNextMyRotaMonth = useCallback(() => {

    setMyRotaMonth((current) => navigateMyRotaMonth(current.year, current.month, 'next'))

  }, [])

  const whosOnMonthLabel = useMemo(

    () => formatMyRotaMonthLabel(whosOnMonth.year, whosOnMonth.month),

    [whosOnMonth],

  )

  const canGoPrevWhosOnMonth = useMemo(

    () => canNavigateMyRotaMonth(whosOnMonth.year, whosOnMonth.month, 'prev', scheduleDays),

    [whosOnMonth, scheduleDays],

  )

  const canGoNextWhosOnMonth = useMemo(

    () => canNavigateMyRotaMonth(whosOnMonth.year, whosOnMonth.month, 'next', scheduleDays),

    [whosOnMonth, scheduleDays],

  )

  const goPrevWhosOnMonth = useCallback(() => {

    setWhosOnMonth((current) => navigateMyRotaMonth(current.year, current.month, 'prev'))

  }, [])

  const goNextWhosOnMonth = useCallback(() => {

    setWhosOnMonth((current) => navigateMyRotaMonth(current.year, current.month, 'next'))

  }, [])



  const goPrevPeriod = useCallback(() => {

    setDayRange((range) => navigateScheduleDayRange(scheduleDays, range, 'prev'))

  }, [scheduleDays])



  const goNextPeriod = useCallback(() => {

    setDayRange((range) => navigateScheduleDayRange(scheduleDays, range, 'next'))

  }, [scheduleDays])



  useEffect(() => {

    if (covThemeProp != null) return

    setInternalCovTheme(readStoredCovTheme())

  }, [covThemeProp])

  useEffect(() => {
    setFiltersCollapsed(readStoredFiltersCollapsed())
  }, [])

  const handleFiltersCollapsedChange = useCallback((collapsed: boolean) => {
    setFiltersCollapsed(collapsed)
    localStorage.setItem(COV_FILTERS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
  }, [])

  const handleCovThemeChange = useCallback((theme: CovTheme) => {

    if (onCovThemeChange) {

      onCovThemeChange(theme)

      return

    }

    setInternalCovTheme(theme)

    localStorage.setItem(COV_THEME_STORAGE_KEY, theme)

  }, [onCovThemeChange])

  useLayoutEffect(() => {
    applyCovThemeToDocument(covTheme)
    return () => applyCovThemeToDocument(null)
  }, [covTheme])

  useEffect(() => {
    setWhosOnDayIndex(0)
  }, [dayRange])



  function setPersonaAndView(next: Persona) {

    setPersona(next)

    setTournamentCode(null)

    setActiveView(next === 'trader' ? 'my-rota' : 'schedule')

  }



  function openTournament(code: string) {

    setTournamentCode(code)

    setActiveView('tournament')

  }



  function backFromTournament() {

    setTournamentCode(null)

    setActiveView('schedule')

  }



  const isSecondary = SECONDARY_VIEWS.includes(activeView)

  const showHeaderStats = !isSecondary && activeView === 'schedule'



  return (

    <section

      className={
        'cov-schedule-shell' +
        (standalone ? ' cov-schedule-shell--standalone' : '') +
        (!isSecondary ? ' cov-schedule-shell--chrome-fixed' : '')
      }

      aria-label="Coverage schedule"

    >

      {!isSecondary ? (

        <div className="cov-schedule-fixed-zone">

          <header className="cov-schedule-header">

            <div className="cov-schedule-header-start">

              {standalone ? (

                <h1 className="cov-schedule-page-title">Coverage schedule</h1>

              ) : (

                <h2 className="cov-schedule-page-title">Coverage schedule</h2>

              )}

            </div>

            {showHeaderStats ? (

              <div className="cov-stats cov-stats--compact cov-stats--header">

                <StatTile label="Fixtures" value={stats.total} />

                <StatTile label="Unassigned" value={stats.gaps} tone="warn" />

                <StatTile label="Needs action" value={stats.needsAction} tone="active" />

                {stats.prepOverdue > 0 ? (
                  <StatTile label="Prep overdue" value={stats.prepOverdue} tone="warn" />
                ) : null}

                <StatTile label="Settled" value={stats.settled} tone="done" />

              </div>

            ) : null}

          </header>

          <CoverageScheduleToolbar

          persona={persona}

          activeView={activeView}

          onViewChange={(view) => {

            setTournamentCode(null)

            setActiveView(view)

          }}

          onPersonaChange={setPersonaAndView}

          gapCount={stats.gaps}

          periodLabel={periodLabel}

          canGoPrevPeriod={canGoPrevPeriod}

          canGoNextPeriod={canGoNextPeriod}

          onPrevPeriod={goPrevPeriod}

          onNextPeriod={goNextPeriod}

          scheduleDays={visibleDays}

          allDays={scheduleDays}

          dayRange={dayRange}

          onDayRangeChange={setDayRange}

          listMode={listMode}

          onListModeChange={setListMode}

          layoutDensity={layoutDensity}

          onLayoutDensityChange={setLayoutDensity}

          totalGames={totalGames}

          statusFilter={statusFilter}

          onStatusFilterChange={setStatusFilter}

          statusFilterDays={visibleDays}

          contentFilters={contentFilters}

          onContentFiltersChange={setContentFilters}

          whosOnViewMode={whosOnViewMode}

          onWhosOnViewModeChange={setWhosOnViewMode}

          whosOnDayIndex={whosOnDayIndex}

          onWhosOnDayIndexChange={setWhosOnDayIndex}

          whosOnMonthLabel={whosOnMonthLabel}

          canGoPrevWhosOnMonth={canGoPrevWhosOnMonth}

          canGoNextWhosOnMonth={canGoNextWhosOnMonth}

          onPrevWhosOnMonth={goPrevWhosOnMonth}

          onNextWhosOnMonth={goNextWhosOnMonth}

          showAllTraders={showAllTraders}

          onShowAllTradersChange={setShowAllTraders}

          traders={getAssignableTraders()}

          selectedTrader={selectedTrader}

          onSelectedTraderChange={setSelectedTrader}

          myRotaMonthLabel={myRotaMonthLabel}

          canGoPrevMyRotaMonth={canGoPrevMyRotaMonth}

          canGoNextMyRotaMonth={canGoNextMyRotaMonth}

          onPrevMyRotaMonth={goPrevMyRotaMonth}

          onNextMyRotaMonth={goNextMyRotaMonth}

          onOpenCoverageNumbers={() => setActiveView('coverage-numbers')}

          onOpenOpsAlerts={() => setActiveView('ops-alerts')}

          onOpenImport={() => setActiveView('import')}

          onOpenReplicateSeason={() => setActiveView('replicate-season')}

          covTheme={covTheme}

          onCovThemeChange={handleCovThemeChange}

          filtersCollapsed={filtersCollapsed}

          onFiltersCollapsedChange={handleFiltersCollapsedChange}

        />

        </div>

      ) : null}



      <div className={isSecondary ? 'cov-schedule-body cov-schedule-scroll' : 'cov-schedule-body'}>

      {activeView === 'schedule' ? (

        <WeekScheduleView

          persona={persona}

          statusFilter={statusFilter}

          listMode={listMode}

          layoutDensity={layoutDensity}

          contentFilters={contentFilters}

          onOpenTournament={openTournament}

          days={visibleDays}

          onUpdateAssignment={handleUpdateAssignment}

          onMarkLifecycle={handleMarkLifecycle}

        />

      ) : null}



      {activeView === 'traders' ? (

        <TradersRosterView

          persona={persona}

          viewMode={whosOnViewMode}

          days={visibleDays}

          activeDayIndex={whosOnDayIndex}

          year={whosOnMonth.year}

          month={whosOnMonth.month}

          showAllTraders={showAllTraders}

          onUpdateAssignment={handleUpdateAssignment}

          onMarkLifecycle={handleMarkLifecycle}

        />

      ) : null}



      {activeView === 'tournament' && tournamentCode ? (

        <TournamentDetailView

          code={tournamentCode}

          onBack={backFromTournament}

          persona={persona}

          onUpdateAssignment={handleUpdateAssignment}

          onMarkLifecycle={handleMarkLifecycle}

        />

      ) : null}



      {activeView === 'my-rota' ? (

        <MyRotaView

          persona={persona}

          traderName={selectedTrader}

          year={myRotaMonth.year}

          month={myRotaMonth.month}

          onGoToSchedule={() => setActiveView('schedule')}

          onUpdateAssignment={handleUpdateAssignment}

          onMarkLifecycle={handleMarkLifecycle}

        />

      ) : null}



      {activeView === 'coverage-numbers' ? (

        <CoverageNumbersView onBack={() => setActiveView('schedule')} />

      ) : null}



      {activeView === 'import' ? (

        <ImportView

          onBack={() => setActiveView('schedule')}

          onOpenReplicateSeason={() => setActiveView('replicate-season')}

        />

      ) : null}



      {activeView === 'replicate-season' ? (

        <ReplicateSeasonView onBack={() => setActiveView('import')} />

      ) : null}



      {activeView === 'ops-alerts' ? (

        <OpsAlertsView

          onBack={() => setActiveView('schedule')}

        />

      ) : null}

      </div>

    </section>

  )

}

