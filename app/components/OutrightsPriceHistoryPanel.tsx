'use client'

import { useSyncExternalStore } from 'react'
import OutrightOddsCell from './OutrightOddsCell'
import {
  getOutrightPriceHistory,
  getOutrightPriceHistoryStoreVersion,
  subscribeOutrightPriceHistoryStore,
  type PriceHistoryEntry,
} from '../data/outrightPriceHistoryStore'

interface OutrightsPriceHistoryPanelProps {
  tournamentId: string
  outrightId: string
}

function formatWhen(at: number): string {
  return new Date(at).toLocaleString()
}

function sourceLabel(entry: PriceHistoryEntry): string {
  return entry.source === 'sent' ? 'Sent' : 'Competitor'
}

export default function OutrightsPriceHistoryPanel({
  tournamentId,
  outrightId,
}: OutrightsPriceHistoryPanelProps) {
  useSyncExternalStore(
    subscribeOutrightPriceHistoryStore,
    getOutrightPriceHistoryStoreVersion,
    getOutrightPriceHistoryStoreVersion,
  )

  const history = getOutrightPriceHistory(tournamentId, outrightId)
  const sent = history.filter((h) => h.source === 'sent')
  const competitor = history.filter((h) => h.source === 'competitor')

  function renderList(entries: PriceHistoryEntry[], empty: string) {
    if (entries.length === 0) {
      return <p className="outrights-history-empty">{empty}</p>
    }
    return (
      <ul className="outrights-history-list">
        {entries.map((entry) => (
          <li key={entry.id} className="outrights-history-item">
            <div className="outrights-history-item-head">
              <span className={'outrights-history-source outrights-history-source--' + entry.source}>
                {sourceLabel(entry)}
              </span>
              <time className="outrights-history-time">{formatWhen(entry.at)}</time>
            </div>
            <div className="outrights-history-note">{entry.note}</div>
            <div className="teams-table-wrap outrights-history-table-wrap outrights-grid-table-wrap">
              <table className="teams-table outrights-history-table outrights-grid-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Selection</th>
                    <th className="outrights-th-odds outrights-th-own">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.snapshots.map((row) => (
                    <tr key={row.selectionId + entry.id}>
                      <td className="outrights-td-id">{row.selectionId}</td>
                      <td>{row.label}</td>
                      <td className="outrights-td-odds outrights-td-own"><OutrightOddsCell value={row.price} variant={entry.source === 'sent' ? 'own' : 'book'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="outrights-price-history">
      <div className="outrights-history-columns">
        <section className="outrights-history-column">
          <h4 className="outrights-history-heading">Prices we sent</h4>
          {renderList(sent, 'No published price history yet. Publish or reactivate a market to log sent prices.')}
        </section>
        <section className="outrights-history-column">
          <h4 className="outrights-history-heading">Competitor (Bet365)</h4>
          {renderList(competitor, 'No competitor price history yet. Bet365 prices are logged when they change.')}
        </section>
      </div>
    </div>
  )
}
