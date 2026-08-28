'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  addTournamentTrader,
  getCoverageRotaVersion,
  getTournamentCoverage,
  getTournamentTraderIds,
  getTraderById,
  removeTournamentTrader,
  subscribeCoverageRota,
  type Trader,
} from '../data/coverageRotaStore'
import TraderPicker from './TraderPicker'

interface TournamentTraderAssignProps {
  tournamentId: string
  traders: Trader[]
  compact?: boolean
}

export default function TournamentTraderAssign({
  tournamentId,
  traders,
  compact = false,
}: TournamentTraderAssignProps) {
  useSyncExternalStore(subscribeCoverageRota, getCoverageRotaVersion, () => 0)

  const [adding, setAdding] = useState(false)
  const assignedIds = getTournamentTraderIds(tournamentId)
  const leadId = getTournamentCoverage(tournamentId).leadTraderId

  const availableTraders = useMemo(
    () => traders.filter((trader) => !assignedIds.includes(trader.id)),
    [traders, assignedIds],
  )

  function handleAdd(traderId: string | null) {
    if (traderId) addTournamentTrader(tournamentId, traderId)
    setAdding(false)
  }

  return (
    <div
      className={'cov-tournament-traders' + (compact ? ' cov-tournament-traders--compact' : '')}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="cov-tournament-traders-label">Traders</span>
      <div className="cov-tournament-traders-row">
        {assignedIds.length === 0 ? (
          <span className="cov-tournament-traders-empty">None assigned</span>
        ) : (
          assignedIds.map((traderId) => {
            const trader = getTraderById(traderId)
            if (!trader) return null
            const isLead = traderId === leadId
            return (
              <span
                key={traderId}
                className={'cov-tournament-trader-chip' + (isLead ? ' cov-tournament-trader-chip--lead' : '')}
                title={isLead ? trader.name + ' (lead)' : trader.name}
              >
                {isLead ? <span className="cov-tournament-trader-chip-lead">Lead</span> : null}
                {trader.name}
                <button
                  type="button"
                  className="cov-tournament-trader-chip-remove"
                  aria-label={'Remove ' + trader.name}
                  onClick={() => removeTournamentTrader(tournamentId, traderId)}
                >
                  ×
                </button>
              </span>
            )
          })
        )}
        {adding ? (
          <div className="cov-tournament-traders-add-picker">
            <TraderPicker
              compact
              startOpen
              value={null}
              traders={availableTraders}
              onChange={handleAdd}
              placeholder="Pick trader…"
            />
            <button type="button" className="cov-tournament-traders-cancel" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        ) : availableTraders.length > 0 ? (
          <button
            type="button"
            className="cov-tournament-traders-add"
            onClick={() => setAdding(true)}
          >
            + Add trader
          </button>
        ) : assignedIds.length > 0 ? null : (
          <button
            type="button"
            className="cov-tournament-traders-add"
            onClick={() => setAdding(true)}
          >
            Assign trader
          </button>
        )}
      </div>
    </div>
  )
}
