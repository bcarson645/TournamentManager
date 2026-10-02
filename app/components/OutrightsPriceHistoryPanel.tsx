'use client'

import { useSyncExternalStore } from 'react'
import OutrightOddsCell from './OutrightOddsCell'
import OutrightsSelectionPriceChart, {
  PriceSeriesLegend,
  type PriceSeries,
  type PriceSeriesKind,
} from './OutrightsSelectionPriceChart'
import {
  getOutrightPriceHistory,
  getOutrightPriceHistoryStoreVersion,
  subscribeOutrightPriceHistoryStore,
  type PriceHistoryEntry,
} from '../data/outrightPriceHistoryStore'
import { effectiveInputPrice, type TournamentOutright } from '../data/outrightsStore'

interface OutrightsPriceHistoryPanelProps {
  tournamentId: string
  outrightId: string
  /** Current market, used for selection names and the not-yet-sent input price. */
  outright?: TournamentOutright
}

function formatWhen(at: number): string {
  return new Date(at).toLocaleString()
}

function sourceLabel(entry: PriceHistoryEntry): string {
  return entry.source === 'sent' ? 'Sent' : 'Crawled (Bet365)'
}

interface SelectionChartData {
  selectionId: string
  label: string
  series: PriceSeries[]
}

const HOUR_MS = 3600 * 1000

function buildChartData(
  history: PriceHistoryEntry[],
  outright: TournamentOutright | undefined,
  now: number,
): { charts: SelectionChartData[]; domain: { min: number; max: number }; kinds: PriceSeriesKind[] } {
  const labels = new Map<string, string>()
  const sent = new Map<string, { at: number; price: number }[]>()
  const crawled = new Map<string, { at: number; price: number }[]>()
  const input = new Map<string, { at: number; price: number }[]>()

  for (const s of outright?.selections ?? []) labels.set(s.selectionId, s.label)

  const chronological = [...history].sort((a, b) => a.at - b.at)
  for (const entry of chronological) {
    const target = entry.source === 'sent' ? sent : crawled
    for (const snap of entry.snapshots) {
      if (!labels.has(snap.selectionId)) labels.set(snap.selectionId, snap.label)
      const list = target.get(snap.selectionId) ?? []
      list.push({ at: entry.at, price: snap.price })
      target.set(snap.selectionId, list)
    }
  }

  // Prepped/own price that has not been sent (or differs from the last sent price): plot at "now".
  for (const s of outright?.selections ?? []) {
    const price = effectiveInputPrice(s)
    if (price === undefined) continue
    const lastSent = sent.get(s.selectionId)?.slice(-1)[0]
    if (lastSent && Math.abs(lastSent.price - price) < 0.005) continue
    input.set(s.selectionId, [{ at: now, price }])
  }

  const charts: SelectionChartData[] = []
  for (const [selectionId, label] of labels) {
    const series: PriceSeries[] = [
      { kind: 'sent', points: sent.get(selectionId) ?? [] },
      { kind: 'crawled', points: crawled.get(selectionId) ?? [] },
      { kind: 'input', points: input.get(selectionId) ?? [] },
    ]
    if (series.every((s) => s.points.length === 0)) continue
    charts.push({ selectionId, label, series })
  }
  charts.sort((a, b) => a.selectionId.localeCompare(b.selectionId))

  const allAt = charts.flatMap((c) => c.series.flatMap((s) => s.points.map((p) => p.at)))
  let min = allAt.length > 0 ? Math.min(...allAt) : now - HOUR_MS
  const max = Math.max(now, ...allAt)
  if (max - min < HOUR_MS) min = max - HOUR_MS

  const kinds = (['sent', 'crawled', 'input'] as PriceSeriesKind[]).filter((k) =>
    charts.some((c) => c.series.some((s) => s.kind === k && s.points.length > 0)),
  )
  return { charts, domain: { min, max }, kinds }
}

export default function OutrightsPriceHistoryPanel({
  tournamentId,
  outrightId,
  outright,
}: OutrightsPriceHistoryPanelProps) {
  useSyncExternalStore(
    subscribeOutrightPriceHistoryStore,
    getOutrightPriceHistoryStoreVersion,
    getOutrightPriceHistoryStoreVersion,
  )

  const history = getOutrightPriceHistory(tournamentId, outrightId)
  const sent = history.filter((h) => h.source === 'sent')
  const competitor = history.filter((h) => h.source === 'competitor')
  const { charts, domain, kinds } = buildChartData(history, outright, Date.now())

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
              <time className="outrights-history-time" dateTime={new Date(entry.at).toISOString()}>
                {formatWhen(entry.at)}
              </time>
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
                      <td className="outrights-td-odds outrights-td-own">
                        <OutrightOddsCell value={row.price} variant={entry.source === 'sent' ? 'own' : 'book'} />
                      </td>
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
      {charts.length === 0 ? (
        <p className="outrights-history-empty">
          No price history yet. Publish or reactivate a market to log sent prices; crawled Bet365 prices are logged
          when they change.
        </p>
      ) : (
        <>
          <PriceSeriesLegend kinds={kinds} />
          <div className="outrights-chart-grid-wrap" role="group" aria-label="Price history charts, one per selection">
            {charts.map((chart) => (
              <OutrightsSelectionPriceChart
                key={chart.selectionId}
                selectionId={chart.selectionId}
                title={chart.label}
                series={chart.series}
                domain={domain}
              />
            ))}
          </div>
        </>
      )}

      <details className="outrights-history-log">
        <summary>Price log ({history.length} {history.length === 1 ? 'entry' : 'entries'})</summary>
        <div className="outrights-history-columns">
          <section className="outrights-history-column">
            <h4 className="outrights-history-heading">Prices we sent</h4>
            {renderList(sent, 'No published price history yet. Publish or reactivate a market to log sent prices.')}
          </section>
          <section className="outrights-history-column">
            <h4 className="outrights-history-heading">Crawled (Bet365)</h4>
            {renderList(competitor, 'No crawled price history yet. Bet365 prices are logged when they change.')}
          </section>
        </div>
      </details>
    </div>
  )
}