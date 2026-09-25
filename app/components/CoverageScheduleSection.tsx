'use client'



import { useCallback, useEffect, useMemo, useState } from 'react'

import {

  allWeekFixtures,

  canNavigateScheduleRange,

  DEFAULT_CONTENT_FILTERS,

  formatScheduleDayRangeLabel,

  getDefaultMyRotaMonth,

  getDefaultScheduleDayRange,

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

  type ScheduleView,

  type StatusFilter,

} from '../data/coverageScheduleStore'

import { DEFAULT_TRADERS } from '../data/traders'

import CoverageScheduleToolbar from './coverage/CoverageScheduleToolbar'

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

}



const SECONDARY_VIEWS: ScheduleView[] = ['coverage-numbers', 'import', 'ops-alerts', 'replicate-season', 'tournament']



export default function CoverageScheduleSection({ standalone = false }: CoverageScheduleSectionProps) {

  const [persona, setPersona] = useState<Persona>('admin')

  const [activeView, setActiveView] = useState<ScheduleView>('schedule')

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [listMode, setListMode] = useState<ScheduleListMode>('by-day')

  const [contentFilters, setContentFilters] = useState<ScheduleContentFilters>(DEFAULT_CONTENT_FILTERS)

  const [whosOnDayIndex, setWhosOnDayIndex] = useState(0)

  const [showAllTraders, setShowAllTraders] = useState(false)

  const [tournamentCode, setTournamentCode] = useState<string | null>(null)

  const [scheduleTick, setScheduleTick] = useState(0)

  const [dayRange, setDayRange] = useState<ScheduleDayRange>(() => getDefaultScheduleDayRange())

  const [selectedTrader, setSelectedTrader] = useState(() => {
    const dyer = DEFAULT_TRADERS.find((trader) => trader.name === 'Dyer')
    return dyer?.name ?? DEFAULT_TRADERS[0]?.name ?? 'Dyer'
  })

  const [myRotaMonth, setMyRotaMonth] = useState<MyRotaMonth>(() => getDefaultMyRotaMonth())



  const scheduleDays = useMemo(() => SCHEDULE_DAYS, [scheduleTick])

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

    return {

      total: fixtures.length,

      gaps: fixtures.filter((f) => f.gap).length,

      needsAction: fixtures.filter((f) => f.lifecycle === 'prepping' || f.lifecycle === 'price-check' || f.gap).length,

      settled: fixtures.filter((f) => f.lifecycle === 'settled').length,

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



  const goPrevPeriod = useCallback(() => {

    setDayRange((range) => navigateScheduleDayRange(scheduleDays, range, 'prev'))

  }, [scheduleDays])



  const goNextPeriod = useCallback(() => {

    setDayRange((range) => navigateScheduleDayRange(scheduleDays, range, 'next'))

  }, [scheduleDays])



  const visibleDayKey = visibleDays.map((d) => d.date).join(',')



  useEffect(() => {

    setWhosOnDayIndex(0)

  }, [visibleDayKey])



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

      className={'cov-schedule-shell' + (standalone ? ' cov-schedule-shell--standalone' : '')}

      aria-label="Coverage schedule"

    >

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

            <StatTile label="Settled" value={stats.settled} tone="done" />

          </div>

        ) : null}

      </header>



      {!isSecondary ? (

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

          totalGames={totalGames}

          statusFilter={statusFilter}

          onStatusFilterChange={setStatusFilter}

          statusFilterDays={visibleDays}

          contentFilters={contentFilters}

          onContentFiltersChange={setContentFilters}

          whosOnDayIndex={whosOnDayIndex}

          onWhosOnDayIndexChange={setWhosOnDayIndex}

          showAllTraders={showAllTraders}

          onShowAllTradersChange={setShowAllTraders}

          traders={DEFAULT_TRADERS}

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

        />

      ) : null}



      {activeView === 'schedule' ? (

        <WeekScheduleView

          persona={persona}

          statusFilter={statusFilter}

          listMode={listMode}

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

          days={visibleDays}

          activeDayIndex={whosOnDayIndex}

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

    </section>

  )

}

