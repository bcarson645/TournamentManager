'use client'

import { useState, useRef, useMemo, useEffect, type SVGProps } from 'react'
import {
  SquadPlayer,
  BowlAction,
  calcWktsAndBowlAvg,
  MAX_TEAM_OVERS,
  MAX_IMPACT_SUBS,
  ratingParPosForBatCalc,
} from '../data/squad'
import { searchPlayers, PlayerDbEntry } from '../data/playerDatabase'
import type { CricketFormat, Gender } from '../data/tournaments'
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

const ALL_EDITABLE_FIELDS = ['btCaz', 'rawAdj', 'sr', 'overs', 'econ', 'bowlWpo'] as const
type EditableField = (typeof ALL_EDITABLE_FIELDS)[number]
const BOWL_EDITABLE: EditableField[] = ['overs', 'econ', 'bowlWpo']

type RosterSection = 'starting' | 'reserves' | 'impact'

function recalcRatings(
  players: SquadPlayer[],
  section: RosterSection,
  cricketFormat: CricketFormat,
  gender: Gender,
): SquadPlayer[] {
  return players.map((p, i) => ({
    ...p,
    batRating: calculateBatRating(
      p.btCaz,
      p.raw,
      p.sr,
      ratingParPosForBatCalc(section, i, p),
      cricketFormat,
      gender,
    ),
    bowlRating: calculateBowlRating(p.econ, p.bowlWpo, p.bowlAvg, p.overs, cricketFormat, gender),
  }))
}

function listFor(
  section: RosterSection,
  newS: SquadPlayer[],
  newR: SquadPlayer[],
  newI: SquadPlayer[],
): SquadPlayer[] {
  if (section === 'starting') return newS
  if (section === 'reserves') return newR
  return newI
}

const SQUAD_TABLE_COLS = 21

function IconPerson(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden focusable={false} {...props}>
      <path
        fill="currentColor"
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  )
}

function IconBat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden focusable={false} {...props}>
      <path
        fill="currentColor"
        d="M16.35 3.4a1.15 1.15 0 0 1 1.65 0l3.15 3.15a1.15 1.15 0 0 1 0 1.65L9.6 19.25a4.25 4.25 0 1 1-6-6L16.35 3.4z"
      />
      <circle cx="5.1" cy="18.7" r="2.15" fill="currentColor" />
    </svg>
  )
}

function IconBall(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden focusable={false} {...props}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        d="M7 10.5q2.25 3 10 6.75M17 13.75Q9.55 11.85 8.5 6.25"
      />
    </svg>
  )
}

/** Wicket-keeping gloves (compact icon beside name in starting XI). */
function IconKeeperGloves(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden focusable={false} {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 8.5V6a2.5 2.5 0 015 0v2.5M7 10.5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2V19a1 1 0 01-1 1h-8a1 1 0 01-1-1v-8.5zM10 21v-4M14 21v-4"
      />
    </svg>
  )
}

/** Reserves omit lock / confirm UI; column still aligned with other squad tables */
function buildSquadTableHeaderRows(posLabel: string, posTitle: string, hideLockColumn = false) {
  return (
    <>
      <tr className="group-header-row">
        <th colSpan={5} className="group-header group-panel-title group-panel-title--player">
          <div className="group-panel-chip group-panel-chip--player">
            <IconPerson className="group-panel-chip__glyph" />
            <span className="group-panel-chip__label">Player</span>
          </div>
        </th>
        <th colSpan={7} className="group-header group-panel-title group-panel-title--batting">
          <div className="group-panel-chip group-panel-chip--batting">
            <IconBat className="group-panel-chip__glyph" />
            <span className="group-panel-chip__label">Batting</span>
          </div>
        </th>
        <th colSpan={7} className="group-header group-panel-title group-panel-title--bowling">
          <div className="group-panel-chip group-panel-chip--bowling">
            <IconBall className="group-panel-chip__glyph" />
            <span className="group-panel-chip__label">Bowling</span>
          </div>
        </th>
        <th colSpan={2} className="group-header group-panel-title group-panel-title--actions">
          <div className="group-panel-chip group-panel-chip--actions">
            <span className="group-panel-chip__label">Actions</span>
          </div>
        </th>
      </tr>
      <tr className="squad-head-subrow">
        <th className="th-swap th-core"></th>
        <th className="th-pos th-core" title={posTitle}>
          {posLabel}
        </th>
        <th className="th-drag th-core"></th>
        <th className="th-pid th-core">Player ID</th>
        <th className="th-name th-core">Name</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat">BT CAZ</th>
        <th className="th-sq-num th-bat th-stat th-stat-bat" title="Effective average (base + ADJ) used for rating">
          Raw
        </th>
        <th className="th-sq-num th-bat th-stat th-stat-bat th-raw-adj">RAW ADJ</th>
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
        <th className={`th-lock th-core${hideLockColumn ? ' th-lock--none' : ''}`}>
          {hideLockColumn ? (
            <span className="th-lock-reserves-mute" title="Locks not used for reserves">
              —
            </span>
          ) : (
            <div className="th-lock-inner">
              <span className="th-lock-check-label" aria-hidden="true">
                ✓
              </span>
            </div>
          )}
        </th>
      </tr>
    </>
  )
}

/**
 * Two different sections: swap two players, or move into an empty / append index (listB[dstIdx] not yet filled).
 * Mutates the three parallel squad arrays. Returns false if the move is not allowed.
 */
function applyCrossRoster(
  newS: SquadPlayer[],
  newR: SquadPlayer[],
  newI: SquadPlayer[],
  srcSection: RosterSection,
  srcIdx: number,
  dstSection: RosterSection,
  dstIdx: number,
): boolean {
  if (srcSection === dstSection) return true
  const listA = listFor(srcSection, newS, newR, newI)
  const listB = listFor(dstSection, newS, newR, newI)
  if (srcIdx < 0 || srcIdx >= listA.length) return false
  if (dstIdx < 0 || dstIdx > listB.length) return false
  const bPlayer = dstIdx < listB.length ? listB[dstIdx] : undefined
  if (bPlayer === undefined) {
    if (dstSection === 'impact' && listB.length >= MAX_IMPACT_SUBS) return false
    const [moved] = listA.splice(srcIdx, 1)
    listB.splice(dstIdx, 0, moved)
  } else {
    const t = listA[srcIdx]!
    listA[srcIdx] = listB[dstIdx]!
    listB[dstIdx] = t
  }
  return true
}

interface SquadTableProps {
  cricketFormat: CricketFormat
  gender: Gender
  impactSubEnabled: boolean
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  impactSubs: SquadPlayer[]
  onUpdate: (startingXI: SquadPlayer[], reserves: SquadPlayer[], impactSubs: SquadPlayer[]) => void
  selectedPlayerId?: string | null
  onSelectPlayer?: (player: SquadPlayer) => void
  onAddPlayer?: (dbEntry: PlayerDbEntry, target: 'reserves' | 'impact') => void
}

export default function SquadTable({
  cricketFormat,
  gender,
  impactSubEnabled,
  startingXI,
  reserves,
  impactSubs,
  onUpdate,
  selectedPlayerId,
  onSelectPlayer,
  onAddPlayer,
}: SquadTableProps) {
  const [swapSource, setSwapSource] = useState<{ section: RosterSection; index: number } | null>(null)
  const [addQueryRes, setAddQueryRes] = useState('')
  const [addQueryImp, setAddQueryImp] = useState('')
  const [addOpenRes, setAddOpenRes] = useState(false)
  const [addOpenImp, setAddOpenImp] = useState(false)
  const [ratingDp, setRatingDp] = useState<SquadRatingDecimalPlaces>(1)

  useEffect(() => {
    setRatingDp(readSquadRatingDp())
  }, [])
  const dragItem = useRef<{ section: RosterSection; index: number } | null>(null)
  const dragOver = useRef<{ section: RosterSection; index: number } | null>(null)

  function toggleLock(section: RosterSection, index: number) {
    if (section === 'starting') {
      const list = [...startingXI]
      list[index] = { ...list[index], locked: !list[index].locked }
      onUpdate(list, reserves, impactSubs)
    } else if (section === 'reserves') {
      const list = [...reserves]
      list[index] = { ...list[index], locked: !list[index].locked }
      onUpdate(startingXI, list, impactSubs)
    } else {
      const list = [...impactSubs]
      list[index] = { ...list[index], locked: !list[index].locked }
      onUpdate(startingXI, reserves, list)
    }
  }

  /** Lock all stats (confirm all) or, if everyone is locked, unlock all. */
  function toggleAllLocksInSection(section: RosterSection) {
    const list =
      section === 'starting' ? [...startingXI] : section === 'reserves' ? [...reserves] : [...impactSubs]
    if (list.length === 0) return
    const allLocked = list.every((p) => p.locked)
    const next = !allLocked
    const mapped = list.map((p) => ({ ...p, locked: next }))
    if (section === 'starting') onUpdate(mapped, reserves, impactSubs)
    else if (section === 'reserves') onUpdate(startingXI, mapped, impactSubs)
    else onUpdate(startingXI, reserves, mapped)
  }

  function lockBulkHeaderButton(section: RosterSection) {
    const list =
      section === 'starting' ? startingXI : section === 'reserves' ? reserves : impactSubs
    const allLocked = list.length > 0 && list.every((p) => p.locked)
    return (
      <button
        type="button"
        className="squad-lock-toggle-all-btn squad-lock-toggle-all-btn--totals"
        disabled={list.length === 0}
        aria-pressed={allLocked}
        title={
          list.length === 0
            ? 'No rows in this section'
            : allLocked
              ? 'Unlock stats for everyone in this list'
              : 'Lock stats for everyone in this list (confirm all)'
        }
        onClick={() => toggleAllLocksInSection(section)}
        aria-label={
          allLocked
            ? 'Unlock stats for all players in this section'
            : 'Lock stats for all players in this section'
        }
      >
        {allLocked ? 'None' : 'All'}
      </button>
    )
  }

  function handleSwap(section: RosterSection, index: number) {
    if (!swapSource) {
      setSwapSource({ section, index })
      return
    }
    if (swapSource.section === section && swapSource.index === index) {
      setSwapSource(null)
      return
    }
    const newS = [...startingXI]
    const newR = [...reserves]
    const newI = [...impactSubs]
    const s = swapSource
    if (s.section === section) {
      const list = listFor(s.section, newS, newR, newI)
      const temp = list[s.index]!
      list[s.index] = list[index]!
      list[index] = temp
    } else {
      if (!applyCrossRoster(newS, newR, newI, s.section, s.index, section, index)) {
        setSwapSource(null)
        return
      }
    }
    onUpdate(
      recalcRatings(newS, 'starting', cricketFormat, gender),
      recalcRatings(newR, 'reserves', cricketFormat, gender),
      recalcRatings(newI, 'impact', cricketFormat, gender),
    )
    setSwapSource(null)
  }

  function handleDragStart(section: RosterSection, index: number) {
    dragItem.current = { section, index }
  }

  function handleDragEnter(section: RosterSection, index: number) {
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
    const newS = [...startingXI]
    const newR = [...reserves]
    const newI = [...impactSubs]
    if (src.section === dst.section) {
      const list = listFor(src.section, newS, newR, newI)
      const [moved] = list.splice(src.index, 1)
      list.splice(dst.index, 0, moved)
    } else {
      if (!applyCrossRoster(newS, newR, newI, src.section, src.index, dst.section, dst.index)) {
        dragItem.current = null
        dragOver.current = null
        return
      }
    }
    onUpdate(
      recalcRatings(newS, 'starting', cricketFormat, gender),
      recalcRatings(newR, 'reserves', cricketFormat, gender),
      recalcRatings(newI, 'impact', cricketFormat, gender),
    )
    dragItem.current = null
    dragOver.current = null
  }

  function updateField(
    section: RosterSection,
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
    if (field === 'rawAdj') {
      num = Math.round(num)
    }
    if (field === 'bowlWpo') {
      num = Math.round(num * 1000) / 1000
    }
    const list = [...listFor(section, startingXI, reserves, impactSubs)]
    const prev = list[index]!
    const updated =
      field === 'rawAdj'
        ? {
            ...prev,
            rawAdj: num,
            raw: Math.round((prev.rawBase + num) * 10) / 10,
          }
        : { ...prev, [field]: num }
    if (field === 'rawAdj' || field === 'btCaz' || field === 'sr') {
      updated.batRating = calculateBatRating(
        updated.btCaz,
        updated.raw,
        updated.sr,
        ratingParPosForBatCalc(section, index, updated),
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
    if (section === 'starting') onUpdate(list, reserves, impactSubs)
    else if (section === 'reserves') onUpdate(startingXI, list, impactSubs)
    else onUpdate(startingXI, reserves, list)
  }

  function updateRatingParPosition(section: RosterSection, index: number, value: string) {
    if (section === 'starting') return
    let n = parseInt(value, 10)
    if (isNaN(n)) return
    n = Math.max(1, Math.min(11, n))
    const list = [...listFor(section, startingXI, reserves, impactSubs)]
    const prev = list[index]!
    if (section !== 'reserves' && prev.locked) return
    const updated: SquadPlayer = {
      ...prev,
      ratingParPosition: n,
      batRating: calculateBatRating(
        prev.btCaz,
        prev.raw,
        prev.sr,
        n,
        cricketFormat,
        gender,
      ),
    }
    list[index] = updated
    if (section === 'reserves') onUpdate(startingXI, list, impactSubs)
    else onUpdate(startingXI, reserves, list)
  }

  function nudgeRawAdj(section: RosterSection, index: number, delta: number) {
    const list = [...listFor(section, startingXI, reserves, impactSubs)]
    const p = list[index]!
    if (section !== 'reserves' && p.locked) return
    const newAdj = p.rawAdj + delta
    updateField(section, index, 'rawAdj', String(newAdj))
  }

  /** For ArrowDown at last row: Starting → Impact → Reserves. */
  function nextSectionIndex(section: RosterSection) {
    if (!impactSubEnabled) {
      if (section === 'starting' && reserves.length > 0) {
        return { section: 'reserves' as RosterSection, row: 0 }
      }
      return null
    }
    if (section === 'starting') {
      if (impactSubs.length > 0) return { section: 'impact' as RosterSection, row: 0 }
      if (reserves.length > 0) return { section: 'reserves' as RosterSection, row: 0 }
      return null
    }
    if (section === 'impact' && reserves.length > 0) {
      return { section: 'reserves' as RosterSection, row: 0 }
    }
    return null
  }

  /** For ArrowUp at first row: Reserves → Impact → Starting. */
  function prevSectionIndex(section: RosterSection) {
    if (!impactSubEnabled) {
      if (section === 'reserves' && startingXI.length > 0) {
        return { section: 'starting' as RosterSection, row: startingXI.length - 1 }
      }
      return null
    }
    if (section === 'reserves') {
      if (impactSubs.length > 0) {
        return { section: 'impact' as RosterSection, row: impactSubs.length - 1 }
      }
      if (startingXI.length > 0) {
        return { section: 'starting' as RosterSection, row: startingXI.length - 1 }
      }
      return null
    }
    if (section === 'impact' && startingXI.length > 0) {
      return { section: 'starting' as RosterSection, row: startingXI.length - 1 }
    }
    return null
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    section: RosterSection,
    rowIndex: number,
    colIndex: number,
  ) {
    const { key } = e
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return
    e.preventDefault()
    let nextRow = rowIndex
    let nextCol = colIndex
    let nextSection: RosterSection = section
    if (key === 'ArrowRight') {
      nextCol = Math.min(colIndex + 1, ALL_EDITABLE_FIELDS.length - 1)
    } else if (key === 'ArrowLeft') {
      nextCol = Math.max(colIndex - 1, 0)
    } else if (key === 'ArrowDown') {
      const maxRow =
        (section === 'starting' ? startingXI.length : section === 'reserves' ? reserves.length : impactSubs.length) -
        1
      if (rowIndex < maxRow) {
        nextRow = rowIndex + 1
      } else {
        const nx = nextSectionIndex(section)
        if (nx) {
          nextSection = nx.section
          nextRow = nx.row
        }
      }
    } else if (key === 'ArrowUp') {
      if (rowIndex > 0) {
        nextRow = rowIndex - 1
      } else {
        const nx = prevSectionIndex(section)
        if (nx) {
          nextSection = nx.section
          nextRow = nx.row
        }
      }
    }
    const target = document.querySelector<HTMLInputElement>(
      `input[data-section="${nextSection}"][data-row="${nextRow}"][data-col="${nextCol}"]`,
    )
    target?.focus()
    target?.select()
  }

  function renderRow(player: SquadPlayer, index: number, section: RosterSection) {
    const rowLocked = section !== 'reserves' && player.locked
    const isSwapTarget =
      swapSource !== null && !(swapSource.section === section && swapSource.index === index)
    const isSwapSelected = swapSource?.section === section && swapSource?.index === index
    const isSelected = selectedPlayerId === player.id
    return (
      <tr
        key={player.id}
        className={`squad-row ${isSwapSelected ? 'squad-row-swap-source' : ''} ${isSelected ? 'squad-row-selected' : ''} ${rowLocked ? 'squad-row-locked' : ''}`}
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
        <td className="sq-pos sq-core">
          {section === 'starting' ? (
            index + 1
          ) : (
            <input
              type="number"
              className="cell-input cell-input-pos"
              min={1}
              max={11}
              step={1}
              value={player.ratingParPosition}
              title="Par slot 1–11 for batting rating (not your row order in this list)"
              disabled={rowLocked}
              data-section={section}
              data-row={index}
              data-col="parpos"
              onChange={(e) => updateRatingParPosition(section, index, e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          )}
        </td>
        <td className="sq-drag sq-core">
          <span className="drag-handle" title="Drag to reorder">
            ⠿
          </span>
        </td>
        <td className="sq-pid sq-core">
          <PidCell playerId={player.playerId} />
        </td>
        <td className="sq-name sq-name-clickable sq-core" onClick={() => onSelectPlayer?.(player)}>
          <span className="sq-name-inner">
            <span className="sq-name-text">{player.name}</span>
            {section === 'starting' && player.keeper ? (
              <span className="sq-keeper-badge" title="Wicket-keeper">
                <IconKeeperGloves className="sq-keeper-svg" />
              </span>
            ) : null}
          </span>
        </td>
        <td className="sq-num sq-editable sq-stat sq-stat-bat">
          <input
            type="number"
            className="cell-input"
            value={player.btCaz}
            disabled={rowLocked}
            data-section={section}
            data-row={index}
            data-col={ALL_EDITABLE_FIELDS.indexOf('btCaz')}
            onChange={(e) => updateField(section, index, 'btCaz', e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('btCaz'))}
            onFocus={(e) => e.target.select()}
          />
        </td>
        <td
          className="sq-num sq-stat sq-stat-bat sq-raw-base"
          title={`Base ${player.rawBase.toFixed(1)} + RAW ADJ ${player.rawAdj >= 0 ? '+' : ''}${player.rawAdj} → effective for rating`}
        >
          {player.raw.toFixed(1)}
        </td>
        <td className="sq-num sq-editable sq-stat sq-stat-bat sq-raw-adj-cell">
          <div className="raw-adj-stepper">
            <button
              type="button"
              className="raw-adj-btn"
              disabled={rowLocked}
              aria-label="Decrease raw adjustment by 1"
              onClick={() => nudgeRawAdj(section, index, -1)}
            >
              −
            </button>
            <input
              type="number"
              className="cell-input cell-input-raw-adj"
              value={player.rawAdj}
              disabled={rowLocked}
              step="1"
              data-section={section}
              data-row={index}
              data-col={ALL_EDITABLE_FIELDS.indexOf('rawAdj')}
              onChange={(e) => updateField(section, index, 'rawAdj', e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('rawAdj'))}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="raw-adj-btn"
              disabled={rowLocked}
              aria-label="Increase raw adjustment by 1"
              onClick={() => nudgeRawAdj(section, index, 1)}
            >
              +
            </button>
          </div>
        </td>
        <td className="sq-num sq-editable sq-stat sq-stat-bat">
          <input
            type="number"
            className="cell-input"
            value={Math.round(player.sr * 100) / 100}
            disabled={rowLocked}
            step="0.01"
            data-section={section}
            data-row={index}
            data-col={ALL_EDITABLE_FIELDS.indexOf('sr')}
            onChange={(e) => updateField(section, index, 'sr', e.target.value)}
            onKeyDown={(e) => handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('sr'))}
            onFocus={(e) => e.target.select()}
          />
        </td>
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
            disabled={rowLocked}
            onChange={(e) => {
              const v = e.target.value as BowlAction
              if (section === 'starting') {
                const list = [...startingXI]
                list[index] = { ...list[index], action: v }
                onUpdate(list, reserves, impactSubs)
              } else if (section === 'reserves') {
                const list = [...reserves]
                list[index] = { ...list[index], action: v }
                onUpdate(startingXI, list, impactSubs)
              } else {
                const list = [...impactSubs]
                list[index] = { ...list[index], action: v }
                onUpdate(startingXI, reserves, list)
              }
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
                disabled={rowLocked}
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
          {section !== 'reserves' && (
            <input
              type="checkbox"
              checked={player.locked}
              onChange={() => toggleLock(section, index)}
              title={player.locked ? 'Unlock stats' : 'Lock stats'}
            />
          )}
        </td>
      </tr>
    )
  }

  function renderTotalsRow(players: SquadPlayer[], section: RosterSection) {
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
          <td className="sq-num sq-stat sq-stat-bat sq-raw-base">{sum((p) => p.raw).toFixed(1)}</td>
          <td className="sq-num sq-stat sq-stat-bat">{sum((p) => p.rawAdj).toFixed(0)}</td>
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
          <td className="sq-info sq-core sq-totals-info"></td>
          <td className="sq-lock sq-core sq-totals-lock">
            {section !== 'reserves' && lockBulkHeaderButton(section)}
          </td>
        </tr>
      </tfoot>
    )
  }

  const existingNames = useMemo(
    () => [...startingXI, ...reserves, ...impactSubs].map((p) => p.name),
    [startingXI, reserves, impactSubs],
  )

  const addResultsRes = useMemo(() => searchPlayers(addQueryRes, existingNames), [addQueryRes, existingNames])
  const addResultsImp = useMemo(() => searchPlayers(addQueryImp, existingNames), [addQueryImp, existingNames])

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
            <thead>
              {buildSquadTableHeaderRows('Pos', 'Line-up order in the starting XI (1–11)')}
            </thead>
            <tbody>{startingXI.map((p, i) => renderRow(p, i, 'starting'))}</tbody>
            {renderTotalsRow(startingXI, 'starting')}
          </table>
        </div>
      </div>

      {impactSubEnabled && (
        <div className="squad-section squad-section-panel">
          <h3 className="squad-section-title">Impact subs</h3>
          <div className="squad-table-wrap">
            <table className="squad-table">
              <thead>
                {buildSquadTableHeaderRows(
                  'Rtg pos',
                  'Par batting position 1–11 for rating (bench/impact: pick the slot to compare in the par table)',
                )}
              </thead>
              <tbody>
                {impactSubs.length === 0 && (
                  <tr
                    className="squad-drop-slot-row"
                    onDragEnter={() => handleDragEnter('impact', 0)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td colSpan={SQUAD_TABLE_COLS} className="squad-drop-slot-cell">
                      <span className="squad-drop-slot-hint">Drop or ⇅ to add</span>
                      <button
                        type="button"
                        className="squad-drop-swap-ghost"
                        onClick={() => handleSwap('impact', 0)}
                        title="Complete swap: move / exchange with this slot"
                      >
                        ⇅
                      </button>
                    </td>
                  </tr>
                )}
                {impactSubs.map((p, i) => renderRow(p, i, 'impact'))}
                {impactSubs.length > 0 && impactSubs.length < MAX_IMPACT_SUBS && (
                  <tr
                    className="squad-drop-slot-row"
                    onDragEnter={() => handleDragEnter('impact', impactSubs.length)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td colSpan={SQUAD_TABLE_COLS} className="squad-drop-slot-cell">
                      <span className="squad-drop-slot-hint">Drop to add</span>
                      <button
                        type="button"
                        className="squad-drop-swap-ghost"
                        onClick={() => handleSwap('impact', impactSubs.length)}
                        title="Complete swap: add from another group to the end of impact subs"
                      >
                        ⇅
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
              {renderTotalsRow(impactSubs, 'impact')}
            </table>
          </div>
          {onAddPlayer && (
            <div className="squad-add-player">
              <div className="squad-add-search">
                <input
                  type="text"
                  className="squad-add-input"
                  placeholder="Add player to impact pool..."
                  value={addQueryImp}
                  onChange={(e) => {
                    setAddQueryImp(e.target.value)
                    setAddOpenImp(true)
                  }}
                  onFocus={() => {
                    if (addQueryImp.length >= 2) setAddOpenImp(true)
                  }}
                  onBlur={() => setTimeout(() => setAddOpenImp(false), 200)}
                  disabled={impactSubs.length >= MAX_IMPACT_SUBS}
                />
                {addOpenImp && addResultsImp.length > 0 && (
                  <ul className="squad-add-dropdown">
                    {addResultsImp.map((entry) => (
                      <li
                        key={entry.id}
                        className="squad-add-option"
                        onMouseDown={() => {
                          onAddPlayer(entry, 'impact')
                          setAddQueryImp('')
                          setAddOpenImp(false)
                        }}
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
                {addOpenImp && addQueryImp.length >= 2 && addResultsImp.length === 0 && (
                  <div className="squad-add-empty">No players found</div>
                )}
                {impactSubs.length >= MAX_IMPACT_SUBS && (
                  <p className="squad-add-cap">Maximum {MAX_IMPACT_SUBS}.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="squad-section squad-section-panel">
        <h3 className="squad-section-title">Reserves</h3>
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>
              {buildSquadTableHeaderRows(
                'Rtg pos',
                'Par batting position 1–11 for rating (bench/impact: pick the slot to compare in the par table)',
                true,
              )}
            </thead>
            <tbody>{reserves.map((p, i) => renderRow(p, i, 'reserves'))}</tbody>
            {renderTotalsRow(reserves, 'reserves')}
          </table>
        </div>
        {onAddPlayer && (
          <div className="squad-add-player">
            <div className="squad-add-search">
              <input
                type="text"
                className="squad-add-input"
                placeholder="Search player database to add to reserves..."
                value={addQueryRes}
                onChange={(e) => {
                  setAddQueryRes(e.target.value)
                  setAddOpenRes(true)
                }}
                onFocus={() => {
                  if (addQueryRes.length >= 2) setAddOpenRes(true)
                }}
                onBlur={() => setTimeout(() => setAddOpenRes(false), 200)}
              />
              {addOpenRes && addResultsRes.length > 0 && (
                <ul className="squad-add-dropdown">
                  {addResultsRes.map((entry) => (
                    <li
                      key={entry.id}
                      className="squad-add-option"
                      onMouseDown={() => {
                        onAddPlayer(entry, 'reserves')
                        setAddQueryRes('')
                        setAddOpenRes(false)
                      }}
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
              {addOpenRes && addQueryRes.length >= 2 && addResultsRes.length === 0 && (
                <div className="squad-add-empty">No players found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
