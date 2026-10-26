'use client'

import { useMemo, useState } from 'react'
import type { SquadPlayer } from '../data/squad'
import {
  type SquadStatsScope,
  squadPlayerBattingDisplay,
  squadPlayerBowlingDisplay,
  profileForSquadPlayer,
} from '../data/squadPlayerDisplayStats'

type SquadSection = 'starting' | 'reserves' | 'impact'

interface SquadInlineStatsSectionProps {
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  impactSubs: SquadPlayer[]
  impactSubEnabled: boolean
  tournamentName: string
  seasonYear: number
  selectedPlayerId?: string | null
  onSelectPlayer?: (player: SquadPlayer) => void
}

const SCOPE_OPTIONS: { value: SquadStatsScope; label: string }[] = [
  { value: 'recent', label: 'Squad / recent' },
  { value: 'tournament', label: 'This tournament' },
  { value: 'career', label: 'Career' },
]

function PerfTable({
  title,
  posLabel,
  rows,
  mode,
  scope,
  tournamentName,
  seasonYear,
  selectedPlayerId,
  onSelectPlayer,
}: {
  title: string
  posLabel: string
  rows: { player: SquadPlayer; section: SquadSection; index: number }[]
  mode: 'batting' | 'bowling'
  scope: SquadStatsScope
  tournamentName: string
  seasonYear: number
  selectedPlayerId?: string | null
  onSelectPlayer?: (player: SquadPlayer) => void
}) {
  if (rows.length === 0) return null

  const statColSpan = mode === 'batting' ? 4 : 4

  return (
    <div className="squad-section squad-section-panel squad-perf-stats-block">
      <h3 className="squad-section-title">{title}</h3>
      <div className="squad-table-wrap">
        <table className="squad-table squad-table--perf-stats">
          <thead>
            <tr className="group-header-row">
              <th colSpan={2} className="group-header group-panel-title group-panel-title--player">
                <div className="group-panel-chip group-panel-chip--player">
                  <span className="group-panel-chip__label">Player</span>
                </div>
              </th>
              <th
                colSpan={statColSpan}
                className={
                  'group-header group-panel-title ' +
                  (mode === 'batting' ? 'group-panel-title--batting' : 'group-panel-title--bowling')
                }
              >
                <div
                  className={
                    'group-panel-chip ' +
                    (mode === 'batting' ? 'group-panel-chip--batting' : 'group-panel-chip--bowling')
                  }
                >
                  <span className="group-panel-chip__label">
                    {mode === 'batting' ? 'Batting stats' : 'Bowling stats'}
                  </span>
                </div>
              </th>
            </tr>
            <tr className="squad-head-subrow">
              <th className="th-pos th-core">{posLabel}</th>
              <th className="th-name th-core">Name</th>
              {mode === 'batting' ? (
                <>
                  <th className="th-sq-num th-bat th-stat th-stat-bat">Avg</th>
                  <th className="th-sq-num th-bat th-stat th-stat-bat">SR</th>
                  <th className="th-sq-num th-bat th-stat th-stat-bat">Form</th>
                  <th className="th-sq-num th-bat th-stat th-stat-bat">Pos</th>
                </>
              ) : (
                <>
                  <th className="th-sq-num th-bowl th-stat th-stat-bowl">Wkts/inn</th>
                  <th className="th-sq-num th-bowl th-stat th-stat-bowl">Overs/inn</th>
                  <th className="th-sq-num th-bowl th-stat th-stat-bowl">Econ</th>
                  <th className="th-sq-num th-bowl th-stat th-stat-bowl">Bowl avg</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, section, index }) => {
              const profile = profileForSquadPlayer(player)
              const pos =
                section === 'starting' ? String(index + 1) : player.ratingParPosition || '—'
              const selected = selectedPlayerId === player.id
              const rowClass =
                'squad-row squad-row--perf' +
                (selected ? ' squad-row-selected' : '') +
                (onSelectPlayer ? ' squad-row--clickable' : '')

              if (mode === 'batting') {
                const s = squadPlayerBattingDisplay(
                  player,
                  profile,
                  section,
                  index,
                  scope,
                  tournamentName,
                  seasonYear,
                )
                return (
                  <tr
                    key={player.id + '-bat'}
                    className={rowClass}
                    onClick={() => onSelectPlayer?.(player)}
                  >
                    <td className="sq-pos sq-core sq-num">{pos}</td>
                    <td className="sq-name sq-core">{player.name}</td>
                    <td className="sq-num sq-stat sq-stat-bat">{fmt(s.average)}</td>
                    <td className="sq-num sq-stat sq-stat-bat">{fmt(s.strikeRate)}</td>
                    <td className="sq-num sq-stat sq-stat-bat">{fmt(s.form)}</td>
                    <td className="sq-num sq-stat sq-stat-bat">
                      {s.avgPosition > 0 ? s.avgPosition : '—'}
                    </td>
                  </tr>
                )
              }

              const s = squadPlayerBowlingDisplay(player, profile, scope, tournamentName, seasonYear)
              return (
                <tr
                  key={player.id + '-bowl'}
                  className={rowClass}
                  onClick={() => onSelectPlayer?.(player)}
                >
                  <td className="sq-pos sq-core sq-num">{pos}</td>
                  <td className="sq-name sq-core">{player.name}</td>
                  <td className="sq-num sq-stat sq-stat-bowl">{fmt(s.wicketsPerInnings)}</td>
                  <td className="sq-num sq-stat sq-stat-bowl">{fmt(s.oversPerInnings)}</td>
                  <td className="sq-num sq-stat sq-stat-bowl">{fmt(s.economy)}</td>
                  <td className="sq-num sq-stat sq-stat-bowl">{fmt(s.bowlingAverage)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SquadInlineStatsSection({
  startingXI,
  reserves,
  impactSubs,
  impactSubEnabled,
  tournamentName,
  seasonYear,
  selectedPlayerId,
  onSelectPlayer,
}: SquadInlineStatsSectionProps) {
  const [mode, setMode] = useState<'batting' | 'bowling'>('batting')
  const [scope, setScope] = useState<SquadStatsScope>('recent')

  const startingRows = useMemo(
    () => startingXI.map((p, i) => ({ player: p, section: 'starting' as const, index: i })),
    [startingXI],
  )
  const reserveRows = useMemo(
    () => reserves.map((p, i) => ({ player: p, section: 'reserves' as const, index: i })),
    [reserves],
  )
  const impactRows = useMemo(
    () => impactSubs.map((p, i) => ({ player: p, section: 'impact' as const, index: i })),
    [impactSubs],
  )

  return (
    <div className="squad-perf-stats" aria-label="Squad performance stats">
      <div className="squad-section squad-section-panel squad-perf-stats-toolbar">
        <div className="squad-section-header-row">
          <h3 className="squad-section-title">Performance stats</h3>
          <div className="squad-section-header-controls squad-perf-stats-controls">
            <div className="rankings-metric-bar squad-perf-metric-bar">
              <button
                type="button"
                className={
                  'squad-perf-mode-btn squad-perf-mode-btn--bat' +
                  (mode === 'batting' ? ' squad-perf-mode-btn--active' : '')
                }
                onClick={() => setMode('batting')}
              >
                Batting
              </button>
              <button
                type="button"
                className={
                  'squad-perf-mode-btn squad-perf-mode-btn--bowl' +
                  (mode === 'bowling' ? ' squad-perf-mode-btn--active' : '')
                }
                onClick={() => setMode('bowling')}
              >
                Bowling
              </button>
            </div>
            <label className="squad-hide-raw-control" title="Which dataset to use for performance columns">
              <span>Data</span>
              <select
                className="squad-rating-dp-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as SquadStatsScope)}
                aria-label="Stats timeframe"
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="squad-section-note">
          Read-only performance view aligned with your squad. Collapse the player panel to focus on
          this table; it hides when team analytics is open.
        </p>
      </div>

      <PerfTable
        title="Starting XI"
        posLabel="Pos"
        rows={startingRows}
        mode={mode}
        scope={scope}
        tournamentName={tournamentName}
        seasonYear={seasonYear}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={onSelectPlayer}
      />
      {impactSubEnabled && (
        <PerfTable
          title="Impact subs"
          posLabel="Rtg pos"
          rows={impactRows}
          mode={mode}
          scope={scope}
          tournamentName={tournamentName}
          seasonYear={seasonYear}
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={onSelectPlayer}
        />
      )}
      <PerfTable
        title="Reserves"
        posLabel="Rtg pos"
        rows={reserveRows}
        mode={mode}
        scope={scope}
        tournamentName={tournamentName}
        seasonYear={seasonYear}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={onSelectPlayer}
      />
    </div>
  )
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}
