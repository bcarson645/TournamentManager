'use client'

import { useMemo, useState } from 'react'
import {
  clientMarketMatchesFilter,
  clientMarketsForFixture,
  type MonitoringClientMarket,
  type MonitoringClientMarketOddsRow,
} from '../../data/monitoringClientMarkets'
import type { MonitoringFixture } from '../../data/monitoringDemoData'

type PriceFilter = 'all' | 'match' | 'innings' | 'session'

function OddsChip({ label, price, muted }: { label: string; price: string; muted?: boolean }) {
  const empty = price === '—'
  return (
    <span className="monitoring-client-odds-pair">
      <span className="monitoring-client-odds-label">{label}</span>
      <span
        className={
          'monitoring-odds-cell monitoring-client-odds-cell' +
          (empty ? ' monitoring-odds-cell--empty' : '') +
          (muted ? ' monitoring-client-odds-cell--muted' : '')
        }
      >
        {price}
      </span>
    </span>
  )
}

function OddsRow({ row, muted }: { row: MonitoringClientMarketOddsRow; muted?: boolean }) {
  return (
    <div className="monitoring-client-odds-line">
      <OddsChip label={row.aLabel} price={row.aPrice} muted={muted} />
      {row.bLabel ? (
        <OddsChip label={row.bLabel} price={row.bPrice ?? '—'} muted={muted} />
      ) : null}
      {row.cLabel ? (
        <OddsChip label={row.cLabel} price={row.cPrice ?? '—'} muted={muted} />
      ) : null}
    </div>
  )
}

function MarketRow({
  market,
  selected,
  onSelect,
}: {
  market: MonitoringClientMarket
  selected: boolean
  onSelect: () => void
}) {
  const inactive = !market.clientActive

  return (
    <div
      className={
        'monitoring-client-market-row' +
        (selected ? ' monitoring-client-market-row--selected' : '') +
        (inactive ? ' monitoring-client-market-row--inactive' : '')
      }
    >
      <button
        type="button"
        className="monitoring-client-market-name"
        onClick={onSelect}
        aria-pressed={selected}
      >
        <span className="monitoring-client-market-title">
          {market.name}
          {market.isNew ? <span className="monitoring-client-market-new">NEW</span> : null}
        </span>
        <span className="monitoring-client-market-id">ID: {market.marketId}</span>
        {inactive ? (
          <span className="monitoring-client-market-inactive-tag">Not on client</span>
        ) : null}
      </button>
      <div className="monitoring-client-market-odds" aria-label={`Odds for ${market.name}`}>
        {inactive ? (
          <p className="monitoring-client-market-inactive-note">
            Market hidden for this client view — prices shown for reference only.
          </p>
        ) : null}
        {market.rows.map((row, i) => (
          <OddsRow key={i} row={row} muted={inactive} />
        ))}
      </div>
    </div>
  )
}

export default function MonitoringClientMarketsPanel({
  fixture,
  priceFilter,
}: {
  fixture: MonitoringFixture
  priceFilter: PriceFilter
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const markets = useMemo(() => clientMarketsForFixture(fixture), [fixture])

  const visible = useMemo(
    () => markets.filter((m) => clientMarketMatchesFilter(m, priceFilter)),
    [markets, priceFilter],
  )

  return (
    <div className="monitoring-client-markets">
      <div className="monitoring-client-markets-head">
        <div className="monitoring-client-markets-head-cell monitoring-client-markets-head-market">
          Market
        </div>
        <div className="monitoring-client-markets-head-cell monitoring-client-markets-head-odds">
          Selections &amp; Odds
        </div>
      </div>
      <div className="monitoring-client-markets-body">
        {visible.length === 0 ? (
          <p className="monitoring-fs-empty">No markets in this filter.</p>
        ) : (
          visible.map((m) => (
            <MarketRow
              key={m.key}
              market={m}
              selected={selectedKey === m.key}
              onSelect={() => setSelectedKey((k) => (k === m.key ? null : m.key))}
            />
          ))
        )}
      </div>
    </div>
  )
}
