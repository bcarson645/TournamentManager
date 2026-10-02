'use client'

import { useId } from 'react'

export type PriceSeriesKind = 'sent' | 'crawled' | 'input'

export interface PricePoint {
  at: number
  price: number
}

export interface PriceSeries {
  kind: PriceSeriesKind
  points: PricePoint[]
}

export const PRICE_SERIES_META: Record<
  PriceSeriesKind,
  { label: string; color: string; dash?: string; marker: 'circle' | 'square' | 'diamond' }
> = {
  sent: { label: 'Sent', color: '#38bdf8', marker: 'circle' },
  crawled: { label: 'Crawled (Bet365)', color: '#fbbf24', dash: '5 3', marker: 'square' },
  input: { label: 'Current input (not sent)', color: '#c4b5fd', marker: 'diamond' },
}

interface OutrightsSelectionPriceChartProps {
  title: string
  selectionId: string
  series: PriceSeries[]
  /** Shared time domain so every selection chart lines up. */
  domain: { min: number; max: number }
}

const W = 420
const H = 200
const M = { top: 12, right: 14, bottom: 34, left: 44 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

function formatPrice(v: number): string {
  return v.toFixed(2)
}

function formatTick(at: number, spanMs: number): string {
  const d = new Date(at)
  const day = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  if (spanMs > 3 * 24 * 3600 * 1000) return day
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return spanMs > 24 * 3600 * 1000 ? `${day} ${time}` : time
}

function niceYDomain(values: number[]): { min: number; max: number } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    const pad = Math.max(0.1, min * 0.1)
    return { min: Math.max(0, min - pad), max: max + pad }
  }
  const pad = (max - min) * 0.15
  return { min: Math.max(0, min - pad), max: max + pad }
}

function markerShape(
  marker: 'circle' | 'square' | 'diamond',
  x: number,
  y: number,
  color: string,
  title: string,
  key: string,
) {
  const common = { fill: color, stroke: '#0f172a', strokeWidth: 1 }
  if (marker === 'square') {
    return (
      <rect key={key} x={x - 3.5} y={y - 3.5} width={7} height={7} {...common}>
        <title>{title}</title>
      </rect>
    )
  }
  if (marker === 'diamond') {
    return (
      <polygon
        key={key}
        points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`}
        {...common}
      >
        <title>{title}</title>
      </polygon>
    )
  }
  return (
    <circle key={key} cx={x} cy={y} r={4} {...common}>
      <title>{title}</title>
    </circle>
  )
}

export function PriceSeriesLegend({ kinds }: { kinds: PriceSeriesKind[] }) {
  return (
    <ul className="outrights-chart-legend" aria-label="Chart legend">
      {kinds.map((kind) => {
        const meta = PRICE_SERIES_META[kind]
        return (
          <li key={kind} className="outrights-chart-legend-item">
            <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
              <line
                x1="1"
                y1="6"
                x2="29"
                y2="6"
                stroke={meta.color}
                strokeWidth="2"
                strokeDasharray={meta.dash}
                opacity={kind === 'input' ? 0.35 : 1}
              />
              {markerShape(meta.marker, 15, 6, meta.color, meta.label, 'legend')}
            </svg>
            <span>{meta.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default function OutrightsSelectionPriceChart({
  title,
  selectionId,
  series,
  domain,
}: OutrightsSelectionPriceChartProps) {
  const uid = useId()
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`

  const populated = series.filter((s) => s.points.length > 0)
  const allPrices = populated.flatMap((s) => s.points.map((p) => p.price))
  const yDom = niceYDomain(allPrices.length > 0 ? allPrices : [1])
  const span = Math.max(1, domain.max - domain.min)

  const x = (at: number) => M.left + ((at - domain.min) / span) * PLOT_W
  const y = (price: number) => M.top + (1 - (price - yDom.min) / (yDom.max - yDom.min)) * PLOT_H

  const yTicks = Array.from({ length: 5 }, (_, i) => yDom.min + ((yDom.max - yDom.min) * i) / 4)
  const xTicks = Array.from({ length: 4 }, (_, i) => domain.min + (span * i) / 3)

  const summary = populated
    .map((s) => {
      const last = s.points[s.points.length - 1]
      const meta = PRICE_SERIES_META[s.kind]
      return `${meta.label}: ${s.points.length} point${s.points.length === 1 ? '' : 's'}, latest ${formatPrice(last.price)}`
    })
    .join('. ')

  return (
    <figure className="outrights-chart-card">
      <figcaption className="outrights-chart-title">
        <span className="outrights-td-id">{selectionId}</span>
        <span>{title}</span>
      </figcaption>
      <svg
        className="outrights-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{`Price history for ${title}`}</title>
        <desc id={descId}>{summary || 'No price data.'}</desc>

        {yTicks.map((t, i) => (
          <g key={`y-${i}`}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="outrights-chart-grid" />
            <text x={M.left - 6} y={y(t) + 3} textAnchor="end" className="outrights-chart-tick">
              {formatPrice(t)}
            </text>
          </g>
        ))}

        {xTicks.map((t, i) => (
          <g key={`x-${i}`}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={M.top + PLOT_H}
              y2={M.top + PLOT_H + 4}
              className="outrights-chart-axis"
            />
            <text
              x={x(t)}
              y={M.top + PLOT_H + 16}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="outrights-chart-tick"
            >
              {formatTick(t, span)}
            </text>
          </g>
        ))}

        <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + PLOT_H} className="outrights-chart-axis" />
        <line
          x1={M.left}
          x2={W - M.right}
          y1={M.top + PLOT_H}
          y2={M.top + PLOT_H}
          className="outrights-chart-axis"
        />
        <text x={M.left + PLOT_W / 2} y={H - 3} textAnchor="middle" className="outrights-chart-axis-label">
          Time
        </text>
        <text
          transform={`translate(10 ${M.top + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
          className="outrights-chart-axis-label"
        >
          Decimal price
        </text>

        {populated.map((s) => {
          const meta = PRICE_SERIES_META[s.kind]
          const pts = [...s.points].sort((a, b) => a.at - b.at)
          // Step-after line: a price holds until the next change; sent/crawled hold to the right edge.
          let d = `M ${x(pts[0].at)} ${y(pts[0].price)}`
          for (let i = 1; i < pts.length; i++) {
            d += ` H ${x(pts[i].at)} V ${y(pts[i].price)}`
          }
          if (s.kind !== 'input') d += ` H ${x(domain.max)}`
          return (
            <g key={s.kind}>
              {s.kind !== 'input' ? (
                <path
                  d={d}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={2}
                  strokeDasharray={meta.dash}
                  strokeLinejoin="round"
                />
              ) : null}
              {pts.map((p, i) =>
                markerShape(
                  meta.marker,
                  x(p.at),
                  y(p.price),
                  meta.color,
                  `${meta.label}: ${formatPrice(p.price)} at ${new Date(p.at).toLocaleString()}`,
                  `${s.kind}-${i}`,
                ),
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}