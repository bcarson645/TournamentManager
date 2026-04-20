'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { SquadPlayer, BowlAction, calcWktsAndBowlAvg, MAX_TEAM_OVERS } from '../data/squad'
import { searchPlayers, PlayerDbEntry } from '../data/playerDatabase'
import type { CricketFormat, Gender } from '../data/tournaments'
import { battingPositionForParTable } from '../data/battingExpectedRunsFormula'
import { calculateBatRating, calculateBowlRating, roundRatingToStoredDecimals } from '../data/ratingBenchmarks'
import {
  formatSquadRatingDisplay,
  readSquadRatingDp,
  writeSquadRatingDp,
  type SquadRatingDecimalPlaces,
} from '../data/ratingDisplaySettings'

function PidCell({ playerId }: { playerId: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleToggle() {
    setVisible((v) => !v)
    setCopied(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(playerId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className="pid-cell">
      <button className="pid-eye" onClick={handleToggle} title={visible ? 'Hide Player ID' : 'Show Player ID'}>
        {visible ? '👁' : '👁‍🗨'}
      </button>
      {visible && (
        <span className="pid-reveal">
          <code className="pid-value">{playerId}</code>
          <button className="pid-copy" onClick={handleCopy} title="Copy ID">
            {copied ? '✓' : '⧉'}
          </button>
        </span>
      )}
    </span>
  )
}

const ALL_EDITABLE_FIELDS = ['btCaz', 'raw', 'sr', 'overs', 'econ', 'bowlWpo'] as const
type EditableField = typeof ALL_EDITABLE_FIELDS[number]

const BAT_EDITABLE: EditableField[] = ['btCaz', 'raw', 'sr']
const BOWL_EDITABLE: EditableField[] = ['overs', 'econ', 'bowlWpo']

interface SquadTableProps {
  cricketFormat: CricketFormat
  gender: Gender
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  onUpdate: (startingXI: SquadPlayer[], reserves: SquadPlayer[]) => void
  selectedPlayerId?: string | null
  onSelectPlayer?: (player: SquadPlayer) => void
  onAddPlayer?: (name: string, dbEntry: PlayerDbEntry) => void
}

function recalcRatings(
  players: SquadPlayer[],
  section: 'starting' | 'reserves',
  cricketFormat: CricketFormat,
  gender: Gender,
): SquadPlayer[] {
  return players.map((p, i) => ({
    ...p,
    batRating: calculateBatRating(
      p.btCaz,
      p.raw,
      p.sr,
      battingPositionForParTable(section, i),
      cricketFormat,
      gender,
    ),
    bowlRating: calculateBowlRating(p.econ, p.bowlWpo, p.bowlAvg, p.overs, cricketFormat, gender),
  }))
}

export default function SquadTable({
  cricketFormat,
  gender,
  startingXI,
  reserves,
  onUpdate,
  selectedPlayerId,
  onSelectPlayer,
  onAddPlayer,
}: SquadTableProps) {
  const [swapSource, setSwapSource] = useState<{ section: 'starting' | 'reserves'; index: number } | null>(null)
  const [addQuery, setAddQuery] = useState('')
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const [ratingDp, setRatingDp] = useState<SquadRatingDecimalPlaces>(1)

  useEffect(() => {
    setRatingDp(readSquadRatingDp())
  }, [])
  const dragItem = useRef<{ section: 'starting' | 'reserves'; index: number } | null>(null)
  const dragOver = useRef<{ section: 'starting' | 'reserves'; index: number } | null>(null)

  function toggleLock(section: 'starting' | 'reserves', index: number) {
    const list = section === 'starting' ? [...startingXI] : [...reserves]
    list[index] = { ...list[index], locked: !list[index].locked }
    if (section === 'starting') {
      onUpdate(list, reserves)
    } else {
      onUpdate(startingXI, list)
    }
  }

  function handleSwap(section: 'starting' | 'reserves', index: number) {
    if (!swapSource) {
      setSwapSource({ section, index })
      return
    }

    if (swapSource.section === section && swapSource.index === index) {
      setSwapSource(null)
      return
    }

    const newStarting = [...startingXI]
    const newReserves = [...reserves]

    const srcList = swapSource.section === 'starting' ? newStarting : newReserves
    const dstList = section === 'starting' ? newStarting : newReserves

    const temp = srcList[swapSource.index]
    srcList[swapSource.index] = dstList[index]
    dstList[index] = temp

    onUpdate(
      recalcRatings(newStarting, 'starting', cricketFormat, gender),
      recalcRatings(newReserves, 'reserves', cricketFormat, gender),
    )
    setSwapSource(null)
  }

  function handleDragStart(section: 'starting' | 'reserves', index: number) {
    dragItem.current = { section, index }
  }

  function handleDragEnter(section: 'starting' | 'reserves', index: number) {
    dragOver.current = { section, index }
  }

  function handleDragEnd() {
    if (!dragItem.current || !dragOver.current) {
      dragItem.current = null
      dragOver.current = null
      return
    }

    const src = dragItem.current
    const dst = dragOver.current

    const newStarting = [...startingXI]
    const newReserves = [...reserves]

    if (src.section === dst.section) {
      const list = src.section === 'starting' ? newStarting : newReserves
      const [moved] = list.splice(src.index, 1)
      list.splice(dst.index, 0, moved)
    } else {
      const srcList = src.section === 'starting' ? newStarting : newReserves
      const dstList = dst.section === 'starting' ? newStarting : newReserves
      const temp = srcList[src.index]
      srcList[src.index] = dstList[dst.index]
      dstList[dst.index] = temp
    }

    onUpdate(
      recalcRatings(newStarting, 'starting', cricketFormat, gender),
      recalcRatings(newReserves, 'reserves', cricketFormat, gender),
    )
    dragItem.current = null
    dragOver.current = null
  }

  function updateField(
    section: 'starting' | 'reserves',
    index: number,
    field: EditableField,
    value: string,
  ) {
    let num = value === '' ? 0 : parseFloat(value)
    if (isNaN(num)) return
    if (field === 'overs' && section === 'starting') {
      const otherOvers = startingXI.reduce((s, p, i) => s + (i === index ? 0 : p.overs), 0)
      num = Math.min(num, Math.max(0, MAX_TEAM_OVERS - otherOvers))
    }
    if (field === 'sr') {
      num = Math.round(num * 100) / 100
    }
    if (field === 'bowlWpo') {
      num = Math.round(num * 1000) / 1000
    }
    const list = section === 'starting' ? [...startingXI] : [...reserves]
    const updated = { ...list[index], [field]: num }

    if (BAT_EDITABLE.includes(field)) {
      updated.batRating = calculateBatRating(
        updated.btCaz,
        updated.raw,
        updated.sr,
        battingPositionForParTable(section, index),
        cricketFormat,
        gender,
      )
    }
    if (BOWL_EDITABLE.includes(field)) {
      const { wkts, bowlAvg } = calcWktsAndBowlAvg(updated.overs, updated.econ, updated.bowlWpo)
      updated.wkts = wkts
      updated.bowlAvg = bowlAvg
      updated.bowlRating = calculateBowlRating(
        updated.econ,
        updated.bowlWpo,
        bowlAvg,
        updated.overs,
        cricketFormat,
        gender,
      )
    }

    list[index] = updated
    section === 'starting' ? onUpdate(list, reserves) : onUpdate(startingXI, list)
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    section: 'starting' | 'reserves',
    rowIndex: number,
    colIndex: number,
  ) {
    const { key } = e
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return
    e.preventDefault()

    let nextRow = rowIndex
    let nextCol = colIndex
    let nextSection = section

    if (key === 'ArrowRight') {
      nextCol = Math.min(colIndex + 1, ALL_EDITABLE_FIELDS.length - 1)
    } else if (key === 'ArrowLeft') {
      nextCol = Math.max(colIndex - 1, 0)
    } else if (key === 'ArrowDown') {
      const maxRow = (section === 'starting' ? startingXI : reserves).length - 1
      if (rowIndex < maxRow) {
        nextRow = rowIndex + 1
      } else if (section === 'starting' && reserves.length > 0) {
        nextSection = 'reserves'
        nextRow = 0
      }
    } else if (key === 'ArrowUp') {
      if (rowIndex > 0) {
        nextRow = rowIndex - 1
      } else if (section === 'reserves' && startingXI.length > 0) {
        nextSection = 'starting'
        nextRow = startingXI.length - 1
      }
    }

    const target = document.querySelector<HTMLInputElement>(
      `input[data-section="${nextSection}"][data-row="${nextRow}"][data-col="${nextCol}"]`,
    )
    target?.focus()
    target?.select()
  }

  function renderRow(player: SquadPlayer, index: number, section: 'starting' | 'reserves') {
    const isSwapTarget =
      swapSource !== null &&
      !(swapSource.section === section && swapSource.index === index)
    const isSwapSelected = swapSource?.section === section && swapSource?.index === index

    const isSelected = selectedPlayerId === player.id

    return (
      <tr
        key={player.id}
        className={`squad-row ${isSwapSelected ? 'squad-row-swap-source' : ''} ${isSelected ? 'squad-row-selected' : ''} ${player.locked ? 'squad-row-locked' : ''}`}
        draggable
        onDragStart={() => handleDragStart(section, index)}
        onDragEnter={() => handleDragEnter(section, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
      >
        <td className="sq-swap sq-core">
          <button
            type="button"
            className={`swap-btn ${isSwapSelected ? 'swap-active' : ''} ${isSwapTarget ? 'swap-target' : ''}`}
            onClick={() => handleSwap(section, index)}
            title={isSwapSelected ? 'Cancel swap' : swapSource ? 'Swap with this player' : 'Swap player'}
          >
            ⇅
          </button>
        </td>
        <td className="sq-pos sq-core">{index + 1}</td>
        <td className="sq-drag sq-core">
          <span className="drag-handle" title="Drag to reorder">
            ⠿
          </span>
        </td>
        <td className="sq-pid sq-core">
          <PidCell playerId={player.playerId} />
        </td>
        <td className="sq-name sq-name-clickable sq-core" onClick={() => onSelectPlayer?.(player)}>
          {player.name}
        </td>
        {BAT_EDITABLE.map((field) => {
          const colIdx = ALL_EDITABLE_FIELDS.indexOf(field)
          return (
            <td key={field} className="sq-num sq-editable sq-stat sq-stat-bat">
              <input
                type="number"
                className="cell-input"
                value={field === 'sr' ? Math.round(player.sr * 100) / 100 : player[field]}
                disabled={player.locked}
                step={field === 'sr' ? '0.01' : undefined}
                data-section={section}
                data-row={index}
                data-col={colIdx}
                onChange={(e) => updateField(section, index, field, e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                onFocus={(e) => e.target.select()}
              />
            </td>
          )
        })}
        <td className="sq-num sq-stat sq-stat-bat">{player.fours.toFixed(1)}</td>
        <td className="sq-num sq-stat sq-stat-bat">{player.sixes.toFixed(1)}</td>
        <td
          className={`sq-num sq-rating sq-stat sq-stat-bat ${player.batRating > 0 ? 'rating-pos' : player.batRating < 0 ? 'rating-neg' : ''}`}
        >
          {formatSquadRatingDisplay(player.batRating, ratingDp)}
        </td>
        <td className="sq-action sq-stat sq-stat-bowl">
          <select
            className="action-select"
            value={player.action}
            disabled={player.locked}
            onChange={(e) => {
              const list = section === 'starting' ? [...startingXI] : [...reserves]
              list[index] = { ...list[index], action: e.target.value as BowlAction }
              section === 'starting' ? onUpdate(list, reserves) : onUpdate(startingXI, list)
            }}
          >
            <option value="SEAM">SEAM</option>
            <option value="SPIN">SPIN</option>
          </select>
        </td>
        <td className="sq-num sq-stat sq-stat-bowl">{player.wkts.toFixed(1)}</td>
        {BOWL_EDITABLE.map((field) => {
          const colIdx = ALL_EDITABLE_FIELDS.indexOf(field)
          return (
            <td key={field} className="sq-num sq-editable sq-stat sq-stat-bowl">
              <input
                type="number"
                className="cell-input"
                value={field === 'bowlWpo' ? (player.bowlWpo > 0 ? player[field] : '') : player[field]}
                disabled={player.locked}
                step={field === 'bowlWpo' ? '0.001' : undefined}
                data-section={section}
                data-row={index}
                data-col={colIdx}
                onChange={(e) => updateField(section, index, field, e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                onFocus={(e) => e.target.select()}
              />
            </td>
          )
        })}
        <td className="sq-num sq-stat sq-stat-bowl">{player.bowlAvg.toFixed(2)}</td>
        <td
          className={`sq-num sq-rating sq-stat sq-stat-bowl ${!Number.isNaN(player.bowlRating) ? (player.bowlRating > 0 ? 'rating-pos' : player.bowlRating < 0 ? 'rating-neg' : '') : ''}`}
        >
          {Number.isNaN(player.bowlRating) ? '–' : formatSquadRatingDisplay(player.bowlRating, ratingDp)}
        </td>
        <td className="sq-info sq-core">
          <button type="button" className="info-btn" title="Player info" onClick={() => onSelectPlayer?.(player)}>
            i
          </button>
        </td>
        <td className="sq-lock sq-core">
          <input
            type="checkbox"
            checked={player.locked}
            onChange={() => toggleLock(section, index)}
            title={player.locked ? 'Unlock stats' : 'Lock stats'}
          />
        </td>
      </tr>
    )
  }

  const headerRows = (
    <>
      <tr className="group-header-row">
        <th colSpan={5} className="group-header group-panel-title">
          Player
        </th>
        <th colSpan={6} className="group-header group-panel-title">
          Batting
        </th>
        <th colSpan={7} className="group-header group-panel-title">
          Bowling
        </th>
        <th colSpan={2} className="group-header group-panel-title">
          Actions
        </th>
      </tr>
      <tr className="squad-head-subrow">
        <th className="th-swap th-core"></th>
        <th className="th-pos th-core">Pos</th>
        <th className="th-drag th-core"></th>
        <th className="th-pid th-core">Player ID</th>
        <th className="th-name th-core">Name</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">BT CAZ</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">Raw</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">SR.CAZ</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">4s</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">6s</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">Rating</th>
        <th className="th-action th-bowl th-stat th-stat-bowl">Action</th>
        <th className="th-sq-num th-bowl th-stat th-stat-bowl">WKTS</th>
        <th className="th-sq-num th-bowl th-stat th-stat-bowl">Overs</th>
        <th className="th-sq-num th-bowl th-stat th-stat-bowl">Econ</th>
        <th className="th-sq-num th-bowl th-stat th-stat-bowl">SR</th>
        <th className="th-sq-num th-bowl th-stat th-stat-bowl">Avg</th>
        <th className="th-sq-num th-bowl th-stat th-stat-bowl">Rating</th>
        <th className="th-info th-core"></th>
        <th className="th-lock th-core">✓</th>
      </tr>
    </>
  )

  function renderTotalsRow(players: SquadPlayer[]) {
    const sum = (fn: (p: SquadPlayer) => number) => players.reduce((acc, p) => acc + fn(p), 0)
    const totOvers = sum((p) => p.overs)
    const totWkts = sum((p) => p.wkts)
    const teamWpo = totOvers > 0 ? Math.round((totWkts / totOvers) * 1000) / 1000 : null

    return (
      <tfoot>
        <tr className="squad-totals-row">
          <td colSpan={5} className="sq-totals-label sq-core">
            Totals
          </td>
          <td className="sq-num sq-stat sq-stat-bat">{sum((p) => p.btCaz).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bat">{sum((p) => p.raw).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bat">{sum((p) => p.sr).toFixed(2)}</td>
          <td className="sq-num sq-stat sq-stat-bat">{sum((p) => p.fours).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bat">{sum((p) => p.sixes).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bat">
            {formatSquadRatingDisplay(roundRatingToStoredDecimals(sum((p) => p.batRating)), ratingDp)}
          </td>
          <td className="sq-stat sq-stat-bowl"></td>
          <td className="sq-num sq-stat sq-stat-bowl">{sum((p) => p.wkts).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bowl">{sum((p) => p.overs).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bowl">{sum((p) => p.econ).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bowl">{teamWpo !== null ? teamWpo.toFixed(3) : '–'}</td>
          <td className="sq-num sq-stat sq-stat-bowl">{sum((p) => p.bowlAvg).toFixed(2)}</td>
          <td className="sq-num sq-stat sq-stat-bowl">
            {formatSquadRatingDisplay(
              roundRatingToStoredDecimals(sum((p) => (Number.isNaN(p.bowlRating) ? 0 : p.bowlRating))),
              ratingDp,
            )}
          </td>
          <td colSpan={2} className="sq-core"></td>
        </tr>
      </tfoot>
    )
  }

  const existingNames = useMemo(
    () => [...startingXI, ...reserves].map((p) => p.name),
    [startingXI, reserves],
  )

  const addResults = useMemo(
    () => searchPlayers(addQuery, existingNames),
    [addQuery, existingNames],
  )

  function handleAddPlayer(entry: PlayerDbEntry) {
    onAddPlayer?.(entry.name, entry)
    setAddQuery('')
    setAddDropdownOpen(false)
  }

  return (
    <div className="squad-table-container">
      <div className="squad-section squad-section-panel">
        <div className="squad-section-header-row">
          <h3 className="squad-section-title">Starting XI</h3>
          <label className="squad-rating-dp-control" title="Decimal places for Bat and Bowl rating columns">
            <span className="squad-dp-icon" aria-hidden>
              ⚙
            </span>
            <span className="sr-only">Rating decimal places</span>
            <select
              className="squad-rating-dp-select"
              value={ratingDp}
              onChange={(e) => {
                const v = Number(e.target.value) as SquadRatingDecimalPlaces
                if (v === 0 || v === 1 || v === 2) {
                  setRatingDp(v)
                  writeSquadRatingDp(v)
                }
              }}
            >
              <option value={0}>Ratings: 0 dp</option>
              <option value={1}>Ratings: 1 dp</option>
              <option value={2}>Ratings: 2 dp</option>
            </select>
          </label>
        </div>
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>{headerRows}</thead>
            <tbody>{startingXI.map((p, i) => renderRow(p, i, 'starting'))}</tbody>
            {renderTotalsRow(startingXI)}
          </table>
        </div>
      </div>

      <div className="squad-section squad-section-panel">
        <h3 className="squad-section-title">Reserves</h3>
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>{headerRows}</thead>
            <tbody>{reserves.map((p, i) => renderRow(p, i, 'reserves'))}</tbody>
            {renderTotalsRow(reserves)}
          </table>
        </div>

        {onAddPlayer && (
          <div className="squad-add-player">
            <div className="squad-add-search">
              <input
                type="text"
                className="squad-add-input"
                placeholder="Search player database to add..."
                value={addQuery}
                onChange={(e) => {
                  setAddQuery(e.target.value)
                  setAddDropdownOpen(true)
                }}
                onFocus={() => {
                  if (addQuery.length >= 2) setAddDropdownOpen(true)
                }}
                onBlur={() => setTimeout(() => setAddDropdownOpen(false), 200)}
              />
              {addDropdownOpen && addResults.length > 0 && (
                <ul className="squad-add-dropdown">
                  {addResults.map((entry) => (
                    <li
                      key={entry.id}
                      className="squad-add-option"
                      onMouseDown={() => handleAddPlayer(entry)}
                    >
                      <span className="squad-add-name">{entry.name}</span>
                      <span className="squad-add-meta">
                        <span className={`squad-add-role role-${entry.role.toLowerCase()}`}>{entry.role}</span>
                        <span className="squad-add-country">{entry.country}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {addDropdownOpen && addQuery.length >= 2 && addResults.length === 0 && (
                <div className="squad-add-empty">No players found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
