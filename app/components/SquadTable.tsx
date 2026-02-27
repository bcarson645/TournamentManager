'use client'

import { useState, useRef, useCallback } from 'react'
import { SquadPlayer, BowlAction } from '../data/squad'

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

const ALL_EDITABLE_FIELDS = ['btCaz', 'raw', 'sr', 'wkts', 'overs'] as const
type EditableField = typeof ALL_EDITABLE_FIELDS[number]

const BAT_EDITABLE: EditableField[] = ['btCaz', 'raw', 'sr']
const BOWL_EDITABLE: EditableField[] = ['wkts', 'overs']

interface SquadTableProps {
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  onUpdate: (startingXI: SquadPlayer[], reserves: SquadPlayer[]) => void
}

export default function SquadTable({ startingXI, reserves, onUpdate }: SquadTableProps) {
  const [swapSource, setSwapSource] = useState<{ section: 'starting' | 'reserves'; index: number } | null>(null)
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

    onUpdate(newStarting, newReserves)
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

    onUpdate(newStarting, newReserves)
    dragItem.current = null
    dragOver.current = null
  }

  function updateField(
    section: 'starting' | 'reserves',
    index: number,
    field: EditableField,
    value: string,
  ) {
    const num = value === '' ? 0 : parseFloat(value)
    if (isNaN(num)) return
    const list = section === 'starting' ? [...startingXI] : [...reserves]
    list[index] = { ...list[index], [field]: num }
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
      `input[data-section="${nextSection}"][data-row="${nextRow}"][data-col="${nextCol}"]`
    )
    target?.focus()
    target?.select()
  }

  function renderRow(
    player: SquadPlayer,
    index: number,
    section: 'starting' | 'reserves',
  ) {
    const isSwapTarget =
      swapSource !== null &&
      !(swapSource.section === section && swapSource.index === index)
    const isSwapSelected =
      swapSource?.section === section && swapSource?.index === index

    return (
      <tr
        key={player.id}
        className={`squad-row ${isSwapSelected ? 'squad-row-swap-source' : ''}`}
        draggable
        onDragStart={() => handleDragStart(section, index)}
        onDragEnter={() => handleDragEnter(section, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
      >
        <td className="sq-swap">
          <button
            className={`swap-btn ${isSwapSelected ? 'swap-active' : ''} ${isSwapTarget ? 'swap-target' : ''}`}
            onClick={() => handleSwap(section, index)}
            title={isSwapSelected ? 'Cancel swap' : swapSource ? 'Swap with this player' : 'Swap player'}
          >
            ⇅
          </button>
        </td>
        <td className="sq-pos">{index + 1}</td>
        <td className="sq-drag">
          <span className="drag-handle" title="Drag to reorder">⠿</span>
        </td>
        <td className="sq-pid">
          <PidCell playerId={player.playerId} />
        </td>
        <td className="sq-name">{player.name}</td>
        {/* Batting editable: BT CAZ, Raw, SR */}
        {BAT_EDITABLE.map((field) => {
          const colIdx = ALL_EDITABLE_FIELDS.indexOf(field)
          return (
            <td key={field} className="sq-num sq-editable">
              <input
                type="number"
                className="cell-input"
                value={player[field]}
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
        <td className="sq-num">{player.fours.toFixed(1)}</td>
        <td className="sq-num">{player.sixes.toFixed(1)}</td>
        <td className={`sq-num sq-rating ${player.batRating > 0 ? 'rating-pos' : player.batRating < 0 ? 'rating-neg' : ''}`}>
          {player.batRating}
        </td>
        {/* Bowling: Action dropdown */}
        <td className="sq-action">
          <select
            className="action-select"
            value={player.action}
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
        {/* Bowling editable: WKTS, Overs */}
        {BOWL_EDITABLE.map((field) => {
          const colIdx = ALL_EDITABLE_FIELDS.indexOf(field)
          return (
            <td key={field} className="sq-num sq-editable">
              <input
                type="number"
                className="cell-input"
                value={player[field]}
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
        <td className="sq-num">{player.econ.toFixed(1)}</td>
        <td className="sq-num">{player.bowlSr.toFixed(1)}</td>
        <td className="sq-num">{player.bowlAvg.toFixed(2)}</td>
        <td className={`sq-num sq-rating ${player.bowlRating > 0 ? 'rating-pos' : player.bowlRating < 0 ? 'rating-neg' : ''}`}>
          {player.bowlRating}
        </td>
        <td className="sq-info">
          <button className="info-btn" title="Player info">i</button>
        </td>
        <td className="sq-lock">
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
        <th colSpan={5}></th>
        <th colSpan={6} className="group-header group-batting">Batting</th>
        <th colSpan={7} className="group-header group-bowling">Bowling</th>
        <th colSpan={2}></th>
      </tr>
      <tr>
        <th className="th-swap"></th>
        <th className="th-pos">Pos</th>
        <th className="th-drag"></th>
        <th className="th-pid">Player ID</th>
        <th className="th-name">Name</th>
        <th className="th-sq-num th-bat">BT CAZ</th>
        <th className="th-sq-num th-bat">Raw</th>
        <th className="th-sq-num th-bat">SR</th>
        <th className="th-sq-num th-bat">4s</th>
        <th className="th-sq-num th-bat">6s</th>
        <th className="th-sq-num th-bat">Rating</th>
        <th className="th-action th-bowl">Action</th>
        <th className="th-sq-num th-bowl">WKTS</th>
        <th className="th-sq-num th-bowl">Overs</th>
        <th className="th-sq-num th-bowl">Econ</th>
        <th className="th-sq-num th-bowl">SR</th>
        <th className="th-sq-num th-bowl">Avg</th>
        <th className="th-sq-num th-bowl">Rating</th>
        <th className="th-info"></th>
        <th className="th-lock">✓</th>
      </tr>
    </>
  )

  return (
    <div className="squad-table-container">
      <div className="squad-section">
        <h3 className="squad-section-title">STARTING XI</h3>
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>{headerRows}</thead>
            <tbody>
              {startingXI.map((p, i) => renderRow(p, i, 'starting'))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="squad-divider" />

      <div className="squad-section">
        <h3 className="squad-section-title">RESERVES</h3>
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>{headerRows}</thead>
            <tbody>
              {reserves.map((p, i) => renderRow(p, i, 'reserves'))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
