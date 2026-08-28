'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { FORMATS, GENDERS } from '../data/tournaments'
import { useOutrightsTournaments, type OutrightsTournamentEntry } from '../hooks/useOutrightsTournaments'
import { useTournamentOutrights } from '../hooks/useTournamentOutrights'
import { useOutrightSuspensionScheduler } from '../hooks/useOutrightSuspensionScheduler'
import OutrightsSidebar from './OutrightsSidebar'
import OutrightsPriceHistoryPanel from './OutrightsPriceHistoryPanel'
import OutrightsSettlementPanel from './OutrightsSettlementPanel'
import OutrightsSimulatorPanel from './OutrightsSimulatorPanel'
import OutrightOddsCell from './OutrightOddsCell'
import { TournamentPointsTable, TournamentUpcomingFixtures } from './TournamentLivePanel'
import TournamentTopPerformances from './TournamentTopPerformances'
import OutrightsTournamentSettings from './OutrightsTournamentSettings'
import {
  allSelectionsHavePrices,
  canConfirmOutrightPrices,
  canPublishOutright,
  confirmOutrightPrices,
  effectiveInputPrice,
  OUTRIGHT_TYPE_LABELS,
  isWinningOutrightSelection,
  outrightStatusLabel,
  publishOutright,
  reactivateOutright,
  suspendOutright,
  updateOutrightSelectionField,
  type OutrightSelection,
  type TournamentOutright,
} from '../data/outrightsStore'
import { buildModelledPriceMap, buildPreppedPriceMap } from '../data/outrightPricing'
import { getSquadStoreVersion, subscribeSquadStore } from '../data/squadStore'
import { getSimulatorStoreVersion, subscribeSimulatorStore } from '../data/outrightSimulatorStore'
import {
  manualReactivateOutrightWithBypass,
  markManualOutrightSuspend,
} from '../data/outrightSuspensionStore'

const SIDEBAR_COLLAPSED_KEY = 'tm-outrights-sidebar-collapsed'

interface OutrightsSectionProps {
  onSelectTournament?: (entry: OutrightsTournamentEntry) => void
}

function handleManualSuspend(tournamentId: string, outrightId: string): void {
  suspendOutright(tournamentId, outrightId)
  markManualOutrightSuspend(tournamentId, outrightId)
}

function handleManualReactivate(tournamentId: string, outrightId: string): void {
  manualReactivateOutrightWithBypass(tournamentId, outrightId)
}

function formatOdds(value: number | undefined): string {
  return value !== undefined ? value.toFixed(2) : '-'
}

function averageCompetitorPrice(...prices: Array<number | undefined>): number | undefined {
  const valid = prices.filter((p): p is number => p !== undefined && p > 0 && Number.isFinite(p))
  if (valid.length === 0) return undefined
  return Math.round((valid.reduce((sum, p) => sum + p, 0) / valid.length) * 100) / 100
}

function sumInversePrices(prices: Array<number | undefined>): number | undefined {
  let sum = 0
  let count = 0
  for (const price of prices) {
    if (price !== undefined && price > 0) {
      sum += 1 / price
      count++
    }
  }
  return count > 0 ? sum : undefined
}

function formatImpliedTotal(value: number | undefined): string {
  return value !== undefined ? value.toFixed(3) : '-'
}


function OutrightMarketStatusActions({
  tournamentId,
  outright,
}: {
  tournamentId: string
  outright: TournamentOutright
}) {
  const status = outright.status ?? 'inactive'
  return (
    <div className="outrights-status-actions">
      <span className={`outrights-status-badge outrights-status-${status}`}>
        {outrightStatusLabel(status)}
      </span>
      {status === 'published' ? (
        <button
          type="button"
          className="outrights-action-btn outrights-action-btn-sm outrights-action-btn-warn"
          onClick={() => handleManualSuspend(tournamentId, outright.id)}
        >
          Suspend
        </button>
      ) : null}
      {status === 'suspended' ? (
        <button
          type="button"
          className="outrights-action-btn outrights-action-btn-sm outrights-action-btn-primary"
          onClick={() => handleManualReactivate(tournamentId, outright.id)}
        >
          Reactivate
        </button>
      ) : null}
    </div>
  )
}

function OutrightMarketLabel({
  type,
  marketId,
  compact = false,
}: {
  type: TournamentOutright['type']
  marketId: string
  compact?: boolean
}) {
  return (
    <span className={'outrights-market-label' + (compact ? ' outrights-market-label-compact' : '')}>
      <span className="outrights-market-name">{OUTRIGHT_TYPE_LABELS[type]}</span>
      <span className="outrights-market-id">Market ID: {marketId}</span>
    </span>
  )
}

function OutrightSelectionsPane({
  outright,
  tournamentId,
}: {
  outright: TournamentOutright
  tournamentId: string
}) {
  const status = outright.status ?? 'inactive'
  const isPriceLocked = status === 'published' || status === 'settled'
  const canConfirm = canConfirmOutrightPrices(outright)
  const canPublish = canPublishOutright(outright)
  const showTeamCol = outright.type === 'top-batter' || outright.type === 'top-bowler'
  const selections = outright.selections ?? []

  const preppedPrices = useMemo(
    () => buildPreppedPriceMap(tournamentId, outright.type, selections),
    [tournamentId, outright.type, selections],
  )
  const modelledPrices = useMemo(
    () => buildModelledPriceMap(tournamentId, outright.type, selections),
    [tournamentId, outright.type, selections],
  )

  const bet365ImpliedTotal = useMemo(
    () => sumInversePrices(selections.map((s) => s.bet365)),
    [selections],
  )
  const decimalImpliedTotal = useMemo(
    () => sumInversePrices(selections.map((s) => s.decimal)),
    [selections],
  )
  const competitorAverageImpliedTotal = useMemo(
    () => averageCompetitorPrice(bet365ImpliedTotal, decimalImpliedTotal),
    [bet365ImpliedTotal, decimalImpliedTotal],
  )
  const inputImpliedTotal = useMemo(
    () => sumInversePrices(selections.map((s) => effectiveInputPrice(s))),
    [selections],
  )

  function renderInputPrice(selection: OutrightSelection) {
    const value = effectiveInputPrice(selection)
    if (isPriceLocked) return <OutrightOddsCell value={value} variant="own" />
    return (
      <input
        type="number"
        className="outrights-price-input outrights-price-input-own"
        min={0.01}
        step={0.01}
        placeholder="0.00"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          updateOutrightSelectionField(
            tournamentId,
            outright.id,
            selection.id,
            'inputPrice',
            raw === '' ? undefined : parseFloat(raw),
          )
        }}
      />
    )
  }

  return (
    <>
      <p className="outrights-detail-sub">
        {status === 'settled'
          ? 'This market is settled. Winning selections are highlighted below.'
          : status === 'published'
          ? 'This outright is active. Prices are published.'
          : status === 'suspended'
            ? 'This outright is suspended. Input prices can still be edited before reactivating.'
            : outright.type === 'finalist'
            ? 'Modelled prices use simulation finalist probability from the same tournament structure as Tournament Winner.'
            : outright.type === 'tournament-winner'
              ? 'Modelled prices use simulation win probability from the tournament simulator.'
              : 'Prepped and modelled prices are generated from squad strength and simulation. Enter an input price for each selection, then confirm and publish.'}
      </p>

      <div className="teams-table-wrap outrights-selections-wrap outrights-grid-table-wrap">
        <table className="teams-table outrights-selections-table outrights-grid-table">
          <thead>
            <tr>
              <th className="outrights-th-id outrights-th-label">Selection ID</th>
              <th className="outrights-th-label">Selection</th>
              {showTeamCol && <th className="outrights-th-label">Team</th>}
              <th className="outrights-th-odds outrights-col-divider">Bet365</th>
              <th className="outrights-th-odds">Decimal</th>
              <th className="outrights-th-odds">Average</th>
              <th className="outrights-th-odds outrights-col-divider">Prepped</th>
              <th className="outrights-th-odds">Modelled</th>
              <th className="outrights-th-odds outrights-th-own">Own</th>
            </tr>
          </thead>
          <tbody>
            {selections.map((selection) => {
              const isWinner = status === 'settled' && isWinningOutrightSelection(outright, selection.id)
              const competitorAverage = averageCompetitorPrice(selection.bet365, selection.decimal)
              return (
              <tr key={selection.id} className={isWinner ? 'outrights-selection-row-winner' : undefined}>
                <td className="outrights-td-id outrights-td-label">{selection.selectionId}</td>
                <td className="outrights-td-label">{selection.label}{isWinner ? <span className="outrights-winner-badge">Winner</span> : null}</td>
                {showTeamCol && <td className="outrights-td-muted outrights-td-label">{selection.sublabel ?? '—'}</td>}
                <td className="outrights-td-odds outrights-col-divider"><OutrightOddsCell value={selection.bet365} variant="book" /></td>
                <td className="outrights-td-odds"><OutrightOddsCell value={selection.decimal} variant="book" /></td>
                <td className="outrights-td-odds"><OutrightOddsCell value={competitorAverage} variant="book" /></td>
                <td className="outrights-td-odds outrights-col-divider"><OutrightOddsCell value={preppedPrices[selection.id]} variant="computed" /></td>
                <td className="outrights-td-odds"><OutrightOddsCell value={modelledPrices[selection.id]} variant="computed" /></td>
                <td className="outrights-td-odds outrights-td-own">{renderInputPrice(selection)}</td>
              </tr>
            )})}
          </tbody>
          <tfoot>
            <tr className="outrights-selections-total-row">
              <td colSpan={showTeamCol ? 3 : 2} className="outrights-td-total-label">
                Total (sum of 1/price)
              </td>
              <td className="outrights-td-odds outrights-td-total outrights-col-divider"><OutrightOddsCell value={bet365ImpliedTotal} variant="book" /></td>
              <td className="outrights-td-odds outrights-td-total"><OutrightOddsCell value={decimalImpliedTotal} variant="book" /></td>
              <td className="outrights-td-odds outrights-td-total"><OutrightOddsCell value={competitorAverageImpliedTotal} variant="book" /></td>
              <td className="outrights-col-divider" />
              <td />
              <td className="outrights-td-odds outrights-td-total outrights-td-own"><OutrightOddsCell value={inputImpliedTotal} variant="own" /></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {status === 'inactive' && (
        <div className="outrights-detail-actions">
          <button
            type="button"
            className="outrights-action-btn"
            disabled={!canConfirm}
            onClick={() => confirmOutrightPrices(tournamentId, outright.id)}
          >
            Confirm prices
          </button>
          <button
            type="button"
            className="outrights-action-btn outrights-action-btn-primary"
            disabled={!canPublish}
            onClick={() => publishOutright(tournamentId, outright.id)}
          >
            Publish prices
          </button>
          {!allSelectionsHavePrices(outright) && (
            <p className="outrights-action-hint">All selections need an input price before confirming.</p>
          )}
          {allSelectionsHavePrices(outright) && !outright.pricesConfirmed && (
            <p className="outrights-action-hint">Confirm prices before publishing.</p>
          )}
        </div>
      )}


    </>
  )
}

function TournamentOverview({
  entry,
  outrights,
  onOpenOutright,
  onOpenSimulator,
}: {
  entry: OutrightsTournamentEntry
  outrights: TournamentOutright[]
  onOpenOutright: (id: string) => void
  onOpenSimulator: () => void
}) {
  const fmt = FORMATS.find((f) => f.key === entry.format)!
  const gen = GENDERS.find((g) => g.key === entry.gender)!
  const activeCount = outrights.filter((o) => (o.status ?? 'inactive') === 'published').length
  const suspendedCount = outrights.filter((o) => o.status === 'suspended').length
  const settledCount = outrights.filter((o) => o.status === 'settled').length

  return (
    <div className="outrights-overview">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <h1 className="dashboard-title">{entry.tournament.name}</h1>
            <div className="dashboard-breadcrumb">
              {fmt.label} › {gen.label}
              {entry.tournament.country ? ` › ${entry.tournament.country}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="outrights-metric-strip">
        <div className="outrights-metric-pill">
          <span className="outrights-metric-value">{outrights.length}</span>
          <span className="outrights-metric-label">Markets</span>
        </div>
        <div className="outrights-metric-pill outrights-metric-pill--active">
          <span className="outrights-metric-value">{activeCount}</span>
          <span className="outrights-metric-label">Active</span>
        </div>
        <div className="outrights-metric-pill outrights-metric-pill--suspended">
          <span className="outrights-metric-value">{suspendedCount}</span>
          <span className="outrights-metric-label">Suspended</span>
        </div>
        <div className="outrights-metric-pill outrights-metric-pill--settled">
          <span className="outrights-metric-value">{settledCount}</span>
          <span className="outrights-metric-label">Settled</span>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-left">
          <section className="tournament-section-panel">
            <h2 className="tournament-section-head">Outright markets</h2>
            <div className="tournament-section-body">
          {outrights.length === 0 ? (
            <p className="outrights-content-empty">No outright markets created yet. Use Create Outright in the sidebar.</p>
          ) : (
            <div className="teams-table-wrap outrights-grid-table-wrap">
              <table className="teams-table outrights-overview-table outrights-grid-table">
                <thead>
                  <tr>
                    <th className="outrights-overview-th-market">Market</th>
                    <th className="outrights-overview-th-status">Status</th>
                    <th className="outrights-overview-th-count">Selections</th>
                    <th className="outrights-overview-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outrights.map((outright) => (
                      <tr key={outright.id}>
                        <td className="outrights-overview-market-cell">
                          <button
                            type="button"
                            className="outrights-overview-market-link"
                            onClick={() => onOpenOutright(outright.id)}
                          >
                            <OutrightMarketLabel type={outright.type} marketId={outright.marketId} compact />
                          </button>
                        </td>
                        <td className="outrights-overview-status-cell">
                          <OutrightMarketStatusActions tournamentId={entry.tournament.id} outright={outright} />
                        </td>
                        <td className="outrights-overview-count-cell">{(outright.selections ?? []).length}</td>
                        <td className="outrights-overview-actions-cell">
                          <div className="outrights-overview-actions">
                            <button
                              type="button"
                              className="outrights-action-btn outrights-action-btn-sm"
                              onClick={() => onOpenOutright(outright.id)}
                            >
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </section>
        </section>

        <section className="dashboard-right">
          <div className="tournament-section-panel">
            <OutrightsTournamentSettings
              tournamentId={entry.tournament.id}
              tournamentName={entry.tournament.name}
              format={entry.format}
              outrights={outrights}
              onOpenSimulator={onOpenSimulator}
            />
          </div>
        </section>
      </div>

      <div className="outrights-live-row">
        <TournamentPointsTable
          tournamentId={entry.tournament.id}
          tournamentName={entry.tournament.name}
        />
        <TournamentUpcomingFixtures tournamentId={entry.tournament.id} format={entry.format} />
      </div>

      <TournamentTopPerformances tournamentId={entry.tournament.id} />
    </div>
  )
}

export default function OutrightsSection({ onSelectTournament }: OutrightsSectionProps) {
  const tournaments = useOutrightsTournaments()
  useOutrightSuspensionScheduler(tournaments.map((t) => t.tournament.id))
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [selectedOutrightId, setSelectedOutrightId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [showSettlement, setShowSettlement] = useState(false)
  const [showSimulatorPage, setShowSimulatorPage] = useState(false)

  useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, getSquadStoreVersion)
  useSyncExternalStore(subscribeSimulatorStore, getSimulatorStoreVersion, getSimulatorStoreVersion)

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    } catch { /* ignore */ }
  }, [])

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const selectedEntry = tournaments.find((t) => t.tournament.id === selectedTournamentId) ?? null
  const outrights = useTournamentOutrights(selectedEntry?.tournament.id ?? null)
  const selectedOutright = useMemo(
    () => outrights.find((o) => o.id === selectedOutrightId) ?? null,
    [outrights, selectedOutrightId],
  )

  useEffect(() => {
    if (selectedOutrightId && !outrights.some((o) => o.id === selectedOutrightId)) {
      setSelectedOutrightId(null)
    }
  }, [outrights, selectedOutrightId])

  function handleSelectTournament(entry: OutrightsTournamentEntry) {
    setSelectedTournamentId(entry.tournament.id)
    setSelectedOutrightId(null)
    setShowPriceHistory(false)
    setShowSettlement(false)
    setShowSimulatorPage(false)
    onSelectTournament?.(entry)
  }

  function handleBackToTournaments() {
    setSelectedTournamentId(null)
    setSelectedOutrightId(null)
    setShowPriceHistory(false)
    setShowSettlement(false)
    setShowSimulatorPage(false)
  }

  function handleOpenSimulator() {
    setShowSimulatorPage(true)
    setSelectedOutrightId(null)
    setShowPriceHistory(false)
    setShowSettlement(false)
  }

  function handleOpenOutright(id: string) {
    setShowSimulatorPage(false)
    setSelectedOutrightId(id)
    setShowPriceHistory(false)
    setShowSettlement(false)
  }

  function handleOpenOverview() {
    setShowSimulatorPage(false)
    setSelectedOutrightId(null)
    setShowPriceHistory(false)
    setShowSettlement(false)
  }

  const sidebarMode = selectedEntry ? 'tournament' : 'tournaments'

  return (
    <div className="outrights-root">
      {tournaments.length === 0 ? (
        <div className="outrights-empty-page">
          <h1 className="page-heading">Outrights</h1>
          <div className="empty-state">
            <div className="empty-state-icon">No outrights tournaments</div>
            <p>No tournaments have outrights enabled yet.</p>
            <p className="outrights-empty-hint">
              Open a tournament in Tournament Manager, go to Tournament Settings, and turn on Enable Tournament Outrights.
            </p>
          </div>
        </div>
      ) : (
        <div className={'dashboard-layout outrights-dashboard-layout' + (sidebarCollapsed ? ' dashboard-layout--sidebar-collapsed' : '')}>
          <OutrightsSidebar
            mode={sidebarMode}
            tournaments={tournaments}
            selectedEntry={selectedEntry}
            outrights={outrights}
            selectedOutrightId={selectedOutrightId}
            showSimulatorPage={showSimulatorPage}
            onSelectTournament={handleSelectTournament}
            onBackToTournaments={handleBackToTournaments}
            onSelectOutright={(id) => { if (id === null) handleOpenOverview(); else handleOpenOutright(id) }}
            onOpenSimulator={handleOpenSimulator}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
          />

          <main className="dashboard-main outrights-main">
            {!selectedEntry ? (
              <div className="outrights-welcome">
                <div className="dashboard-header">
                  <h1 className="dashboard-title">Outrights</h1>
                  <div className="dashboard-breadcrumb">Tournament markets & pricing</div>
                </div>
                <div className="empty-state outrights-welcome-empty">
                  <div className="empty-state-icon">Select a tournament</div>
                  <p>Choose a tournament from the sidebar to view markets, pricing, and simulator settings.</p>
                </div>
              </div>
            ) : showSimulatorPage ? (
              <div className="outrights-overview outrights-simulator-view">
                <div className="dashboard-header">
                  <div className="dashboard-header-top">
                    <div>
                      <h1 className="dashboard-title">Simulator</h1>
                      <div className="dashboard-breadcrumb">
                        {selectedEntry.tournament.name} › Tournament simulation
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tournament-section-panel outrights-simulator-page-panel">
                  <div className="tournament-section-body">
                    <OutrightsSimulatorPanel
                      tournamentId={selectedEntry.tournament.id}
                      tournamentName={selectedEntry.tournament.name}
                      format={selectedEntry.format}
                    />
                  </div>
                </div>
              </div>
            ) : selectedOutright ? (
              <div className="outrights-overview outrights-market-view">
                <div className="dashboard-header">
                  <div className="dashboard-header-top">
                    <div>
                      <h1 className="dashboard-title">{OUTRIGHT_TYPE_LABELS[selectedOutright.type]}</h1>
                      <div className="dashboard-breadcrumb">
                        {selectedEntry.tournament.name} › Market {selectedOutright.marketId}
                      </div>
                    </div>
                    <div className="outrights-market-header-actions">
                      <OutrightMarketStatusActions
                        tournamentId={selectedEntry.tournament.id}
                        outright={selectedOutright}
                      />
                      {selectedOutright.status !== 'settled' ? (
                        <button
                          type="button"
                          className={'outrights-action-btn outrights-action-btn-sm outrights-action-btn-settle' + (showSettlement ? ' outrights-action-btn-settle-active' : '')}
                          onClick={() => {
                            setShowSettlement((open) => !open)
                            if (!showSettlement) setShowPriceHistory(false)
                          }}
                        >
                          {showSettlement ? 'Cancel settlement' : 'Settle'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={'outrights-action-btn outrights-action-btn-sm' + (showPriceHistory ? ' outrights-action-btn-primary' : '')}
                        onClick={() => {
                          setShowPriceHistory((open) => !open)
                          if (!showPriceHistory) setShowSettlement(false)
                        }}
                      >
                        {showPriceHistory ? 'Hide price history' : 'Price history'}
                      </button>
                    </div>
                  </div>
                </div>
                {showSettlement ? (
                  <div className="tournament-section-panel outrights-settlement-section">
                    <h2 className="tournament-section-head">Settle market</h2>
                    <div className="tournament-section-body">
                      <OutrightsSettlementPanel
                        tournamentId={selectedEntry.tournament.id}
                        outright={selectedOutright}
                        onCancel={() => setShowSettlement(false)}
                        onSettled={() => setShowSettlement(false)}
                      />
                    </div>
                  </div>
                ) : null}
                                {showPriceHistory ? (
                  <div className="tournament-section-panel outrights-history-panel">
                    <h2 className="tournament-section-head">Price history</h2>
                    <div className="tournament-section-body">
                      <OutrightsPriceHistoryPanel
                        tournamentId={selectedEntry.tournament.id}
                        outrightId={selectedOutright.id}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="tournament-section-panel">
                  <h2 className="tournament-section-head">Selections & pricing</h2>
                  <div className="tournament-section-body">
                    <OutrightSelectionsPane
                      outright={selectedOutright}
                      tournamentId={selectedEntry.tournament.id}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <TournamentOverview
                entry={selectedEntry}
                outrights={outrights}
                onOpenOutright={handleOpenOutright}
                onOpenSimulator={handleOpenSimulator}
              />
            )}
          </main>
        </div>
      )}
    </div>
  )
}
