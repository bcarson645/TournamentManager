'use client'

import type { TeamMeanMetricChartData } from '../data/teamFirstInningsStats'

interface TeamMeanAxisChartProps {
  chart: TeamMeanMetricChartData
  ariaLabel: string
  /** When true, below mean (left) is favourable — e.g. runs conceded. */
  lowerIsBetter?: boolean
}

export default function TeamMeanAxisChart({
  chart,
  ariaLabel,
  lowerIsBetter = false,
}: TeamMeanAxisChartProps) {
  const { markers, tournamentMean } = chart
  if (markers.length === 0) return null

  const maxAbs = Math.max(
    12,
    ...markers.map((marker) => Math.abs(marker.meanDelta)),
  )
  const spread = Math.max(24, maxAbs * 1.35)

  return (
    <div className="tap-fi-chart">
      <div className={'tap-fi-chart-scores' + (markers.length > 1 ? ' tap-fi-chart-scores--dual' : '')}>
        {markers.map((marker) => (
          <div key={marker.id} className="tap-fi-chart-score">
            <span
              className={
                'tap-fi-chart-score-label tap-fi-chart-score-label--' +
                marker.tone +
                (markers.length > 1 ? ' tap-fi-chart-score-label--keyed' : '')
              }
            >
              {marker.label}
            </span>
            <span className="tap-fi-chart-score-value">{Math.round(marker.average)}</span>
          </div>
        ))}
      </div>

      <div className="tap-fi-axis" role="img" aria-label={ariaLabel}>
        <div className="tap-fi-axis-track">
          <div className="tap-fi-axis-mean" aria-hidden />
          {markers.map((marker) => {
            const markerPct = Math.max(4, Math.min(96, 50 + (marker.meanDelta / spread) * 50))
            const favourable = lowerIsBetter ? marker.meanDelta <= 0 : marker.meanDelta >= 0
            return (
              <div
                key={marker.id}
                className={
                  'tap-fi-axis-marker tap-fi-axis-marker--' +
                  marker.tone +
                  (favourable ? ' tap-fi-axis-marker--favourable' : ' tap-fi-axis-marker--unfavourable')
                }
                style={{ left: `${markerPct}%` }}
                title={`${marker.label}: ${Math.round(marker.average)} (${marker.meanDelta >= 0 ? '+' : ''}${Math.round(marker.meanDelta)} vs mean ${Math.round(tournamentMean)})`}
              />
            )
          })}
        </div>
        <div className="tap-fi-axis-labels">
          <span>Below mean</span>
          <span>Mean {Math.round(tournamentMean)}</span>
          <span>Above mean</span>
        </div>
      </div>
    </div>
  )
}
