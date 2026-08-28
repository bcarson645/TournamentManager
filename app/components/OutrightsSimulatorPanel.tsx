'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { getTeamsByTournament } from '../data/teams'
import type { CricketFormat } from '../data/tournaments'
import { computeMatchWinProbability } from '../data/matchBettingModel'
import {
  TOURNAMENT_STRUCTURES,
  addSimulatorGroup,
  assignTeamToSimulatorGroup,
  getSimulationBookOddsMarket,
  getSimulationFinalistModelledPrice,
  getSimulationModelledPrice,
  getSimulatorConfig,
  getSimulatorStoreVersion,
  getUnassignedSimulatorTeams,
  importTeamRatingsFromJson,
  pullRatingsFromTournamentManager,
  removeSimulatorGroup,
  portSimulatorPricesToLinkedOutrights,
  runSimulatorForTournament,
  saveSimulatorConfig,
  subscribeSimulatorStore,
  updateSimulatorGroup,
  updateTeamSimulatorRating,
  type TournamentStructure,
} from '../data/outrightSimulatorStore'

interface OutrightsSimulatorPanelProps {
  tournamentId: string
  tournamentName: string
  format: CricketFormat
}

export default function OutrightsSimulatorPanel({
  tournamentId,
  tournamentName,
  format,
}: OutrightsSimulatorPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [running, setRunning] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [portMsg, setPortMsg] = useState<string | null>(null)

  useSyncExternalStore(subscribeSimulatorStore, getSimulatorStoreVersion, getSimulatorStoreVersion)

  const config = getSimulatorConfig(tournamentId)
  const winnerBookMarket = getSimulationBookOddsMarket(tournamentId, 'winner')
  const finalistBookMarket = getSimulationBookOddsMarket(tournamentId, 'finalist')
  const teams = getTeamsByTournament(tournamentId)

  function handlePortPrices() {
    const result = portSimulatorPricesToLinkedOutrights(tournamentId)
    if (result.errors.length > 0 && result.winnerUpdated === 0 && result.finalistUpdated === 0) {
      setPortMsg(result.errors.join(' '))
      return
    }
    const parts = []
    if (result.winnerUpdated > 0) parts.push(`Tournament Winner: ${result.winnerUpdated}`)
    if (result.finalistUpdated > 0) parts.push(`Finalist: ${result.finalistUpdated}`)
    let msg = parts.length ? `Ported book prices (${parts.join(', ')} selection(s)).` : 'No prices ported.'
    if (result.errors.length > 0) msg += ' ' + result.errors.join(' ')
    setPortMsg(msg)
  }

  function handleRun() {
    setRunning(true)
    try {
      runSimulatorForTournament(tournamentId, format)
    } finally {
      setRunning(false)
    }
  }

  function handleImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        let rows: Array<Record<string, unknown>> = []
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          rows = Array.isArray(parsed) ? parsed : parsed.teams ?? []
        } else {
          const lines = text.trim().split(/\r?\n/)
          const header = lines[0]?.toLowerCase() ?? ''
          const start = header.includes('team') ? 1 : 0
          for (let i = start; i < lines.length; i++) {
            const parts = lines[i].split(',').map((p) => p.trim())
            if (parts.length < 3) continue
            rows.push({
              teamName: parts[0],
              battingRating: parseFloat(parts[1]),
              bowlingRating: parseFloat(parts[2]),
              conditions: parts[3] ? parseFloat(parts[3]) : 1,
            })
          }
        }
        const result = importTeamRatingsFromJson(tournamentId, rows as never)
        setImportMsg(
          result.errors.length
            ? `Updated ${result.updated}. ${result.errors.slice(0, 3).join('; ')}`
            : `Imported ratings for ${result.updated} team(s).`,
        )
      } catch {
        setImportMsg('Could not parse file. Use JSON array or CSV: team,batting,bowling[,conditions]')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="outrights-simulator">
      <p className="settings-lead">Simulate {tournamentName} using the match betting model</p>
      <p className="settings-par-score-hint">
        Monte Carlo simulation of group fixtures plus knockout stage. Enable custom groups to run round-robin within each
        group and advance top teams to knockouts. Modelled prices for Tournament Winner use win probabilities from the latest run.
      </p>

      <div className="outrights-simulator-sanity-block">
        {(() => {
          const sanity = computeMatchWinProbability({
            homeBatRating: 1.04,
            homeBowlRating: 1.0,
            awayBatRating: 0.98,
            awayBowlRating: 1.01,
            conditions: config.conditions,
            homeAdjustPct: 0,
            format: 't20',
          })
          return (
            <p className="outrights-simulator-sanity">
              Match model check (1.04/1.00 vs 0.98/1.01, no home adj): home{' '}
              {(sanity.homeWinProb * 100).toFixed(1)}% / away {(sanity.awayWinProb * 100).toFixed(1)}%
            </p>
          )
        })()}
        {(() => {
          const calibration = computeMatchWinProbability({
            homeBatRating: 1.02,
            homeBowlRating: 0.98,
            awayBatRating: 1.06,
            awayBowlRating: 1.04,
            conditions: 1.01,
            homeAdjustPct: 0,
            format: 't20',
          })
          const homePct = calibration.homeWinProb * 100
          const awayPct = calibration.awayWinProb * 100
          return (
            <p className="outrights-simulator-sanity">
              Calibration (cond 1.01, home 1.02/0.98 vs away 1.06/1.04, no home adj): home{' '}
              {homePct.toFixed(1)}% / away {awayPct.toFixed(1)}% — target 53% / 47%
            </p>
          )
        })()}
      </div>

      <div className="outrights-simulator-controls">
        <label className="outrights-simulator-field">
          <span>Tournament structure</span>
          <select
            value={config.structure}
            onChange={(e) =>
              saveSimulatorConfig(tournamentId, { structure: e.target.value as TournamentStructure })
            }
          >
            {TOURNAMENT_STRUCTURES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="outrights-simulator-field">
          <span>Simulations</span>
          <input
            type="number"
            min={100}
            max={100000}
            step={100}
            value={config.iterations}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (Number.isFinite(n)) saveSimulatorConfig(tournamentId, { iterations: n })
            }}
          />
        </label>

        <label className="outrights-simulator-field">
          <span>Base conditions</span>
          <input
            type="number"
            min={0.5}
            max={1.5}
            step={0.01}
            value={config.conditions}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n)) saveSimulatorConfig(tournamentId, { conditions: n })
            }}
          />
        </label>

        <label className="outrights-simulator-field">
          <span>Home advantage (%)</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={config.homeAdjustPct}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n)) saveSimulatorConfig(tournamentId, { homeAdjustPct: n })
            }}
          />
        </label>

        <label className="outrights-simulator-field">
          <span>Odds margin (%)</span>
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={config.oddsMarginPct}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n) && n >= 0) saveSimulatorConfig(tournamentId, { oddsMarginPct: n })
            }}
          />
        </label>

        <label className="outrights-simulator-field">
          <span>Minimum price</span>
          <input
            type="number"
            min={1.01}
            max={1000}
            step={0.01}
            value={config.minimumPrice}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n) && n > 1) saveSimulatorConfig(tournamentId, { minimumPrice: n })
            }}
          />
        </label>

        <label className="outrights-simulator-field">
          <span>Maximum price</span>
          <input
            type="number"
            min={1.01}
            max={10000}
            step={0.01}
            value={config.maximumPrice}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n) && n > 1) saveSimulatorConfig(tournamentId, { maximumPrice: n })
            }}
          />
        </label>
      </div>

      <p className="settings-par-score-hint outrights-simulator-odds-hint">
        Fair price = 1 / probability. Book price = fair price ÷ (1 + margin%). E.g. 20% margin shortens a 5.00 fair price to 4.17. Margin inflates implied probability across the market (10% margin on a 100% fair book targets 110% implied). Prices are then clamped to minimum/maximum.
      </p>

      <section className="outrights-simulator-groups">
        <div className="outrights-simulator-groups-header">
          <label className="outrights-simulator-groups-toggle">
            <input
              type="checkbox"
              checked={config.useGroups}
              onChange={(e) => saveSimulatorConfig(tournamentId, { useGroups: e.target.checked })}
            />
            <span>Use custom groups</span>
          </label>
          {config.useGroups ? (
            <label className="outrights-simulator-field outrights-simulator-field-inline">
              <span>Advance per group</span>
              <input
                type="number"
                min={1}
                max={8}
                step={1}
                value={config.advancePerGroup}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (Number.isFinite(n) && n >= 1) saveSimulatorConfig(tournamentId, { advancePerGroup: n })
                }}
              />
            </label>
          ) : null}
        </div>

        {config.useGroups ? (
          <>
            <div className="outrights-simulator-groups-list">
              {config.groups.map((group) => (
                <div key={group.id} className="outrights-simulator-group-card">
                  <div className="outrights-simulator-group-card-head">
                    <input
                      type="text"
                      className="outrights-simulator-group-name"
                      value={group.name}
                      onChange={(e) => updateSimulatorGroup(tournamentId, group.id, { name: e.target.value })}
                    />
                    <span className="outrights-simulator-group-count">{group.teamIds.length} teams</span>
                    <button
                      type="button"
                      className="outrights-action-btn outrights-action-btn-sm outrights-simulator-group-remove"
                      disabled={config.groups.length <= 1}
                      onClick={() => removeSimulatorGroup(tournamentId, group.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <ul className="outrights-simulator-group-teams">
                    {group.teamIds.length === 0 ? (
                      <li className="outrights-simulator-group-empty">No teams assigned</li>
                    ) : (
                      group.teamIds.map((teamId) => {
                        const team = teams.find((t) => t.id === teamId)
                        return team ? <li key={teamId}>{team.name}</li> : null
                      })
                    )}
                  </ul>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="outrights-action-btn outrights-action-btn-sm"
              onClick={() => addSimulatorGroup(tournamentId)}
            >
              Add group
            </button>
            {(() => {
              const unassigned = getUnassignedSimulatorTeams(tournamentId)
              if (unassigned.length === 0) return null
              return (
                <p className="outrights-simulator-unassigned">
                  Unassigned: {unassigned.map((id) => teams.find((t) => t.id === id)?.name ?? id).join(', ')}
                </p>
              )
            })()}
          </>
        ) : null}
      </section>

      <div className="outrights-simulator-toolbar">
        <button
          type="button"
          className="outrights-action-btn outrights-action-btn-sm"
          onClick={() => pullRatingsFromTournamentManager(tournamentId)}
        >
          Pull from Tournament Manager
        </button>
        <button
          type="button"
          className="outrights-action-btn outrights-action-btn-sm"
          onClick={() => fileRef.current?.click()}
        >
          Upload ratings
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,text/csv,application/json"
          className="outrights-simulator-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImportFile(f)
            e.target.value = ''
          }}
        />
      </div>
      {importMsg ? <p className="outrights-simulator-import-msg">{importMsg}</p> : null}

      <p className="settings-par-score-hint outrights-simulator-home-conditions-hint">
        Home conditions apply to both teams when batting at that team&apos;s ground. Raise for batting-strong sides
        (higher scores at home); lower for bowling-strong sides (lower scores at home).
      </p>

      <div className="outrights-simulator-table-wrap">
        <table className="outrights-simulator-table">
          <thead>
            <tr>
              <th>Team</th>
              {config.useGroups ? <th>Group</th> : null}
              <th>Batting</th>
              <th>Bowling</th>
              <th>Home conditions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const row = config.teamRatings[team.id] ?? {
                teamId: team.id,
                battingRating: 1,
                bowlingRating: 1,
                conditions: 1,
              }
              return (
                <tr key={team.id}>
                  <td>{team.name}</td>
                  {config.useGroups ? (
                    <td>
                      <select
                        className="outrights-simulator-group-select"
                        value={config.groups.find((g) => g.teamIds.includes(team.id))?.id ?? ''}
                        onChange={(e) =>
                          assignTeamToSimulatorGroup(
                            tournamentId,
                            team.id,
                            e.target.value ? e.target.value : null,
                          )
                        }
                      >
                        <option value="">Unassigned</option>
                        {config.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                  <td>
                    <input
                      type="number"
                      className="outrights-simulator-num"
                      step={0.01}
                      value={row.battingRating}
                      onChange={(e) =>
                        updateTeamSimulatorRating(tournamentId, team.id, {
                          battingRating: parseFloat(e.target.value) || 1,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="outrights-simulator-num"
                      step={0.01}
                      value={row.bowlingRating}
                      onChange={(e) =>
                        updateTeamSimulatorRating(tournamentId, team.id, {
                          bowlingRating: parseFloat(e.target.value) || 1,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="outrights-simulator-num"
                      step={0.01}
                      value={row.conditions}
                      onChange={(e) =>
                        updateTeamSimulatorRating(tournamentId, team.id, {
                          conditions: parseFloat(e.target.value) || 1,
                        })
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="outrights-action-btn outrights-action-btn-primary outrights-simulator-run"
        disabled={running || teams.length < 2}
        onClick={handleRun}
      >
        {running ? 'Running...' : `Run ${config.iterations.toLocaleString()} simulations`}
      </button>

      {config.lastResult ? (
        <section className="outrights-simulator-results">
          <h4 className="outrights-simulator-results-title">Tournament winner & finalist probabilities</h4>
          <div className="outrights-simulator-results-head">
            <p className="settings-par-score-hint">
              Last run: {new Date(config.lastResult.ranAt).toLocaleString()} ·{' '}
              {config.lastResult.iterations.toLocaleString()} iterations ·{' '}
              {TOURNAMENT_STRUCTURES.find((s) => s.key === config.lastResult!.structure)?.label}
            </p>
            <button
              type="button"
              className="outrights-action-btn outrights-action-btn-sm"
              onClick={handlePortPrices}
            >
              Port book prices to Winner & Finalist
            </button>
          </div>
          {portMsg ? <p className="outrights-simulator-import-msg">{portMsg}</p> : null}
          <div className="outrights-simulator-table-wrap">
            <table className="outrights-simulator-table outrights-simulator-results-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Win %</th>
                  <th>Final %</th>
                  <th>Winner book</th>
                  <th>Finalist book</th>
                  <th>Wins</th>
                </tr>
              </thead>
              <tbody>
                {config.lastResult.teams.map((row) => (
                  <tr key={row.teamId}>
                    <td>{row.teamName}</td>
                    <td>{(row.winProbability * 100).toFixed(2)}%</td>
                    <td>{((row.finalistProbability ?? 0) * 100).toFixed(2)}%</td>
                    <td>{getSimulationModelledPrice(tournamentId, row.teamId)?.toFixed(2) ?? '-'}</td>
                    <td>{getSimulationFinalistModelledPrice(tournamentId, row.teamId)?.toFixed(2) ?? '-'}</td>
                    <td>{row.wins.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="outrights-simulator-overround-row">
                  <td colSpan={3}>Implied total (sum 1/price)</td>
                  <td>
                    {winnerBookMarket.impliedTotal > 0
                      ? `${(winnerBookMarket.impliedTotal * 100).toFixed(1)}% (${winnerBookMarket.overroundPctPoints.toFixed(1)}% overround)`
                      : '-'}
                  </td>
                  <td>
                    {finalistBookMarket.impliedTotal > 0
                      ? `${(finalistBookMarket.impliedTotal * 100).toFixed(1)}% (${finalistBookMarket.overroundPctPoints.toFixed(1)}% overround)`
                      : '-'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
