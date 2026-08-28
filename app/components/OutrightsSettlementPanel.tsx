'use client'

import { useMemo, useState } from 'react'
import {
  settleOutright,
  settlementWinnerLimit,
  type TournamentOutright,
} from '../data/outrightsStore'

interface OutrightsSettlementPanelProps {
  tournamentId: string
  outright: TournamentOutright
  onCancel: () => void
  onSettled: () => void
}

export default function OutrightsSettlementPanel({
  tournamentId,
  outright,
  onCancel,
  onSettled,
}: OutrightsSettlementPanelProps) {
  const winnerLimit = settlementWinnerLimit(outright.type)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const selections = outright.selections ?? []

  const helper = useMemo(() => {
    if (winnerLimit === 1) return 'Select the winning selection, then submit to settle this market.'
    return `Select ${winnerLimit} winning selections, then submit to settle this market.`
  }, [winnerLimit])

  function toggleSelection(selectionId: string) {
    setError(null)
    setSelectedIds((prev) => {
      if (prev.includes(selectionId)) return prev.filter((id) => id !== selectionId)
      if (prev.length >= winnerLimit) {
        if (winnerLimit === 1) return [selectionId]
        return [...prev.slice(1), selectionId]
      }
      return [...prev, selectionId]
    })
  }

  function handleSubmit() {
    const result = settleOutright(tournamentId, outright.id, selectedIds)
    if (!result.ok) {
      setError(result.error ?? 'Could not settle market.')
      return
    }
    onSettled()
  }

  return (
    <div className="outrights-settlement-panel">
      <p className="outrights-settlement-lead">{helper}</p>
      <div className="teams-table-wrap outrights-settlement-table-wrap">
        <table className="teams-table outrights-settlement-table">
          <thead>
            <tr>
              <th className="outrights-settlement-th-pick">Win</th>
              <th className="outrights-th-id">Selection ID</th>
              <th>Selection</th>
            </tr>
          </thead>
          <tbody>
            {selections.map((selection) => {
              const checked = selectedIds.includes(selection.id)
              return (
                <tr
                  key={selection.id}
                  className={'outrights-settlement-row' + (checked ? ' outrights-settlement-row--selected' : '')}
                >
                  <td className="outrights-settlement-pick-cell">
                    <input
                      type={winnerLimit === 1 ? 'radio' : 'checkbox'}
                      name={`settlement-${outright.id}`}
                      checked={checked}
                      onChange={() => toggleSelection(selection.id)}
                      aria-label={`Mark ${selection.label} as winner`}
                    />
                  </td>
                  <td className="outrights-td-id">{selection.selectionId}</td>
                  <td>{selection.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {error ? <p className="outrights-settlement-error">{error}</p> : null}
      <div className="outrights-settlement-actions">
        <button type="button" className="outrights-action-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="outrights-action-btn outrights-action-btn-settle"
          disabled={selectedIds.length !== winnerLimit}
          onClick={handleSubmit}
        >
          Submit settlement
        </button>
      </div>
    </div>
  )
}
