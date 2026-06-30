'use client'

import {
  useState,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  type SVGProps,
  type KeyboardEvent,
} from 'react'
import {
  SquadPlayer,
  BowlAction,
  calcWktsAndBowlAvg,
  MAX_TEAM_OVERS,
  MAX_IMPACT_SUBS,
  ratingParPosForBatCalc,
} from '../data/squad'
import { searchPlayers, PlayerDbEntry } from '../data/playerDatabase'
import { type CricketFormat, type Gender, scheduledInningsOversForFormat } from '../data/tournaments'
import { calculateBatRating, calculateBowlRating } from '../data/ratingBenchmarks'
import {
  computeTournamentBattingTeamIndex,
  computeTournamentBowlingTeamIndex,
} from '../data/squadStore'
import {
  formatSquadRatingDisplay,
  readSquadHideBatRawColumns,
  readSquadEditFoursSixes,
  readSquadRatingDp,
  readSquadValueSteppers,
  writeSquadHideBatRawColumns,
  writeSquadEditFoursSixes,
  writeSquadRatingDp,
  writeSquadValueSteppers,
  teamBattingParIndexClass,
  teamBowlingParIndexClass,
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

const BOWL_ACTION_OPTIONS: { value: BowlAction; short: string; label: string }[] = [
  { value: 'SEAM', short: 'SM', label: 'Seam (pace)' },
  { value: 'OFS', short: 'OS', label: 'Off-spin (OFS)' },
  { value: 'LEG', short: 'LS', label: 'Leg spin' },
]

function BowlActionSelect({
  value,
  disabled,
  onPick,
}: {
  value: BowlAction
  disabled: boolean
  onPick: (v: BowlAction) => void
}) {
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    function place() {
      const wrap = ref.current
      const btn = wrap?.querySelector<HTMLElement>('.bowl-action-select-trigger')
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const menuMin = 8 * 16 /* 8rem readable for labels */
      const menuMax = 10.5 * 16
      const menuW = Math.min(Math.max(menuMin, r.width + 52), menuMax)
      let left = r.left + (r.width - menuW) / 2
      if (left + menuW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - menuW - 8)
      if (left < 8) left = 8
      setMenuRect({ top: r.bottom + 3, left, width: menuW })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = BOWL_ACTION_OPTIONS.find((o) => o.value === value) ?? BOWL_ACTION_OPTIONS[0]!

  return (
    <div className="bowl-action-select" ref={ref}>
      <button
        type="button"
        className="bowl-action-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Bowling action: ${current.label}. Open to change.`}
        title={`${current.label} — click to change`}
        onClick={() => !disabled && setOpen((x) => !x)}
      >
        <span className="bowl-action-select-letter">{current.short}</span>
        <span className="bowl-action-select-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && menuRect ? (
        <ul
          className="bowl-action-select-menu bowl-action-select-menu--fixed"
          role="listbox"
          style={{
            position: 'fixed',
            top: menuRect.top,
            left: menuRect.left,
            width: menuRect.width,
            zIndex: 10020,
          }}
        >
          {BOWL_ACTION_OPTIONS.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="option"
                className={'bowl-action-select-option' + (o.value === value ? ' is-active' : '')}
                aria-selected={o.value === value}
                onClick={() => {
                  onPick(o.value)
                  setOpen(false)
                }}
              >
                <span className="bowl-action-select-option-short">{o.short}</span>
                <span className="bowl-action-select-option-label">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const MAX_SCALED_HUNDREDTHS_DIGITS = 6

function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

/**
 * Strike-rate style entry: type whole hundredths (e.g. 144 → 1.44, 28 → 0.28).
 * Blurred cell shows two decimal places; focused cell shows digits only with full replace on focus.
 */
function ScaledHundredthsInput({
  value,
  disabled,
  className,
  showEmptyWhenZero,
  onCommit,
  onKeyDown,
  'data-section': dataSection,
  'data-row': dataRow,
  'data-col': dataCol,
}: {
  value: number
  disabled?: boolean
  className?: string
  /** When true, zero stored value renders as empty (bowling SR). */
  showEmptyWhenZero?: boolean
  onCommit: (n: number) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  'data-section'?: string
  'data-row'?: number
  'data-col'?: number
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const blurred =
    !Number.isFinite(value) || value <= 0
      ? showEmptyWhenZero
        ? ''
        : '0.00'
      : (Math.round(value * 100) / 100).toFixed(2)

  function seedDraftFromValue() {
    if (Number.isFinite(value) && value > 0) {
      setDraft(String(Math.round(value * 100)))
    } else {
      setDraft('')
    }
  }

  function commitFromDigitString(digitStr: string) {
    if (digitStr === '') {
      onCommit(0)
      return
    }
    const n = parseInt(digitStr, 10)
    if (!Number.isFinite(n)) return
    const capped = Math.min(n, 999999)
    onCommit(Math.round((capped / 100) * 100) / 100)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      disabled={disabled}
      value={focused ? draft : blurred}
      data-section={dataSection}
      data-row={dataRow}
      data-col={dataCol}
      onFocus={(e) => {
        setFocused(true)
        seedDraftFromValue()
        requestAnimationFrame(() => e.target.select())
      }}
      onBlur={() => {
        setFocused(false)
        commitFromDigitString(digitsOnly(draft))
      }}
      onChange={(e) => {
        const d = digitsOnly(e.target.value).slice(0, MAX_SCALED_HUNDREDTHS_DIGITS)
        setDraft(d)
        commitFromDigitString(d)
      }}
      onKeyDown={onKeyDown}
    />
  )
}

const MAX_ECON_DIGITS = 5

/** E.g. 82 → 8.2, 102 → 10.2; one digit alone is the whole economy (8 → 8.0). */
function econValueFromDigits(d: string): number {
  if (d === '') return 0
  if (d.length === 1) {
    const n = parseInt(d, 10)
    return Number.isFinite(n) ? n : 0
  }
  const intPart = parseInt(d.slice(0, -1), 10)
  const tenth = parseInt(d.slice(-1), 10)
  if (!Number.isFinite(intPart) || !Number.isFinite(tenth)) return 0
  const v = intPart + tenth / 10
  return Math.round(v * 10) / 10
}

/**
 * Economy entry without a decimal key: all but the last digit are units, last is tenths.
 * Blurred: one decimal (8.2, 10.2); focused: digits only (82, 102).
 */
function ScaledEconInput({
  value,
  disabled,
  className,
  onCommit,
  onKeyDown,
  'data-section': dataSection,
  'data-row': dataRow,
  'data-col': dataCol,
}: {
  value: number
  disabled?: boolean
  className?: string
  onCommit: (n: number) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  'data-section'?: string
  'data-row'?: number
  'data-col'?: number
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const blurred = !Number.isFinite(value) ? '0.0' : (Math.round(value * 10) / 10).toFixed(1)

  function seedDraftFromValue() {
    if (!Number.isFinite(value) || value <= 0) {
      setDraft('')
    } else {
      setDraft(String(Math.round(value * 10)))
    }
  }

  function commitFromDigitString(digitStr: string) {
    const v = econValueFromDigits(digitStr)
    onCommit(v)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      disabled={disabled}
      value={focused ? draft : blurred}
      data-section={dataSection}
      data-row={dataRow}
      data-col={dataCol}
      onFocus={(e) => {
        setFocused(true)
        seedDraftFromValue()
        requestAnimationFrame(() => e.target.select())
      }}
      onBlur={() => {
        setFocused(false)
        commitFromDigitString(digitsOnly(draft))
      }}
      onChange={(e) => {
        const d = digitsOnly(e.target.value).slice(0, MAX_ECON_DIGITS)
        setDraft(d)
        commitFromDigitString(d)
      }}
      onKeyDown={onKeyDown}
    />
  )
}

const ALL_EDITABLE_FIELDS = ['btCaz', 'rawAdj', 'sr', 'fours', 'sixes', 'overs', 'econ', 'bowlWpo'] as const
type EditableField = (typeof ALL_EDITABLE_FIELDS)[number]
const BOWL_EDITABLE: EditableField[] = ['overs', 'econ', 'bowlWpo']

const STEP_BT_CAZ = 1
const STEP_SR_CAZ = 0.01
const STEP_OVERS = 0.1
const STEP_ECON = 0.1
const STEP_BOWL_SR_WPO = 0.01
const STEP_FOURS_SIXES = 0.1

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

function editableNavOrder(hideBatRawCols: boolean, editFoursSixes: boolean): number[] {
  const base = hideBatRawCols ? [0, 2, 3, 4, 5, 6, 7] : ALL_EDITABLE_FIELDS.map((_, i) => i)
  if (editFoursSixes) return base
  return base.filter((i) => i !== 3 && i !== 4)
}

function neighbourEditableCol(
  current: number,
  dir: -1 | 1,
  hideBatRawCols: boolean,
  editFoursSixes: boolean,
): number {
  const ord = editableNavOrder(hideBatRawCols, editFoursSixes)
  const idx = ord.indexOf(current)
  if (idx < 0) return ord[0] ?? current
  return ord[Math.max(0, Math.min(ord.length - 1, idx + dir))]
}

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

/** Reserves omit lock / confirm UI; column still aligned with other squad tables */
function buildSquadTableHeaderRows(
  posLabel: string,
  posTitle: string,
  hideLockColumn = false,
  hideBatRawCols = false,
) {
  const battingColSpan = hideBatRawCols ? 5 : 7
  return (
    <>
      <tr className="group-header-row">
        <th colSpan={5} className="group-header group-panel-title group-panel-title--player">
          <div className="group-panel-chip group-panel-chip--player">
            <IconPerson className="group-panel-chip__glyph" />
            <span className="group-panel-chip__label">Player</span>
          </div>
        </th>
        <th colSpan={battingColSpan} className="group-header group-panel-title group-panel-title--batting">
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
        <th colSpan={1} className="group-header group-panel-title group-panel-title--actions">
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
        {!hideBatRawCols ? (
          <>
            <th className="th-sq-num th-bat th-stat th-stat-bat" title="Effective average (base + ADJ) used for rating">
              Raw
            </th>
            <th className="th-sq-num th-bat th-stat th-stat-bat th-raw-adj">RAW ADJ</th>
          </>
        ) : null}
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
  /** Par score for team rating index: bat = (Σ ratings + par)/par, bowl = (par − Σ)/par. */
  ratingParScore: number
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  impactSubs: SquadPlayer[]
  onUpdate: (startingXI: SquadPlayer[], reserves: SquadPlayer[], impactSubs: SquadPlayer[]) => void
  selectedPlayerId?: string | null
  onSelectPlayer?: (player: SquadPlayer) => void
  onAddPlayer?: (dbEntry: PlayerDbEntry, target: 'reserves' | 'impact') => void
  /** Add a named player with blank (zero) stats to reserves for manual editing. */
  onCreateCustomPlayer?: (name: string) => void
}

export default function SquadTable({
  cricketFormat,
  gender,
  impactSubEnabled,
  ratingParScore,
  startingXI,
  reserves,
  impactSubs,
  onUpdate,
  selectedPlayerId,
  onSelectPlayer,
  onAddPlayer,
  onCreateCustomPlayer,
}: SquadTableProps) {
  const [swapSource, setSwapSource] = useState<{ section: RosterSection; index: number } | null>(null)
  const [addQueryRes, setAddQueryRes] = useState('')
  const [addQueryImp, setAddQueryImp] = useState('')
  const [addOpenRes, setAddOpenRes] = useState(false)
  const [addOpenImp, setAddOpenImp] = useState(false)
  const [customReserveName, setCustomReserveName] = useState('')
  const [ratingDp, setRatingDp] = useState<SquadRatingDecimalPlaces>(2)
  const [valueSteppers, setValueSteppers] = useState(false)
  const [hideBatRawCols, setHideBatRawCols] = useState(false)
  const [editFoursSixes, setEditFoursSixes] = useState(false)

  useEffect(() => {
    setRatingDp(readSquadRatingDp())
    setValueSteppers(readSquadValueSteppers())
    setHideBatRawCols(readSquadHideBatRawColumns())
    setEditFoursSixes(readSquadEditFoursSixes())
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
    if (field === 'econ') {
      num = Math.round(num * 10) / 10
    }
    if (field === 'fours' || field === 'sixes') {
      num = Math.max(0, Math.round(num * 10) / 10)
    }
    if (field === 'bowlWpo') {
      num = Math.round(num * 100) / 100
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

  /** Step sizes: BT CAZ ±1, SR.CAZ ±0.01, overs/econ ±0.1, bowling SR (WPO) ±0.01 */
  function nudgeValueField(section: RosterSection, index: number, field: EditableField, delta: number) {
    const list = [...listFor(section, startingXI, reserves, impactSubs)]
    const p = list[index]!
    if (section !== 'reserves' && p.locked) return
    let cur = field === 'bowlWpo' && !(p.bowlWpo > 0) ? 0 : (p[field] as number)
    if (!Number.isFinite(cur)) cur = 0
    let next = cur + delta
    if (field === 'btCaz' || field === 'overs' || field === 'econ' || field === 'fours' || field === 'sixes') {
      next = Math.round(next * 10) / 10
    } else if (field === 'sr' || field === 'bowlWpo') {
      next = Math.round(next * 100) / 100
    }
    if ((field === 'fours' || field === 'sixes') && next < 0) next = 0
    updateField(section, index, field, String(next))
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
      nextCol = neighbourEditableCol(colIndex, 1, hideBatRawCols, editFoursSixes)
    } else if (key === 'ArrowLeft') {
      nextCol = neighbourEditableCol(colIndex, -1, hideBatRawCols, editFoursSixes)
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
        className={`squad-row ${isSwapSelected ? 'squad-row-swap-source' : ''} ${isSelected ? 'squad-row-selected' : ''} ${rowLocked ? 'squad-row-locked' : ''} ${player.overseas ? 'squad-row-overseas' : ''}`}
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
            {player.note?.trim() ? (
              <span className="sq-note-dot" title="Has squad note" aria-label="Has squad note">
                <span className="sq-note-dot-inner" aria-hidden />
              </span>
            ) : null}
            {section === 'starting' && player.keeper ? (
              <span className="sq-keeper-badge" title="Wicket-keeper">
                <img
                  src="/wk-keeper-gloves.png"
                  alt=""
                  width={16}
                  height={16}
                  className="sq-keeper-img"
                  decoding="async"
                />
              </span>
            ) : null}
            {player.overseas ? (
              <span className="sq-overseas-badge" title="Overseas">
                <svg className="sq-overseas-plane" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                  />
                </svg>
              </span>
            ) : null}
          </span>
        </td>
        <td
          className={`sq-num sq-editable sq-stat sq-stat-bat${valueSteppers ? ' sq-cell-value-stepper' : ''}`}
        >
          {valueSteppers ? (
            <div className="sq-value-stepper sq-value-stepper--spin-end">
              <input
                type="number"
                className="cell-input cell-input-sq-step"
                value={player.btCaz}
                disabled={rowLocked}
                data-section={section}
                data-row={index}
                data-col={ALL_EDITABLE_FIELDS.indexOf('btCaz')}
                onChange={(e) => updateField(section, index, 'btCaz', e.target.value)}
                onKeyDown={(e) =>
                  handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('btCaz'))
                }
                onFocus={(e) => e.target.select()}
              />
              <div className="sq-value-spin-col" role="group" aria-label="BT CAZ stepper">
                <button
                  type="button"
                  className="sq-value-spin-btn"
                  disabled={rowLocked}
                  aria-label="Increase BT CAZ by 1"
                  onClick={() => nudgeValueField(section, index, 'btCaz', STEP_BT_CAZ)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="sq-value-spin-btn"
                  disabled={rowLocked}
                  aria-label="Decrease BT CAZ by 1"
                  onClick={() => nudgeValueField(section, index, 'btCaz', -STEP_BT_CAZ)}
                >
                  ▼
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </td>
        {!hideBatRawCols ? (
          <>
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
                  onKeyDown={(e) =>
                    handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('rawAdj'))
                  }
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
          </>
        ) : null}
        <td
          className={`sq-num sq-editable sq-stat sq-stat-bat${valueSteppers ? ' sq-cell-value-stepper' : ''}`}
        >
          {valueSteppers ? (
            <div className="sq-value-stepper sq-value-stepper--spin-end">
              <ScaledHundredthsInput
                value={player.sr}
                disabled={rowLocked}
                className="cell-input cell-input-sq-step"
                showEmptyWhenZero={false}
                onCommit={(n) => updateField(section, index, 'sr', String(n))}
                onKeyDown={(e) =>
                  handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('sr'))
                }
                data-section={section}
                data-row={index}
                data-col={ALL_EDITABLE_FIELDS.indexOf('sr')}
              />
              <div className="sq-value-spin-col" role="group" aria-label="SR.CAZ stepper">
                <button
                  type="button"
                  className="sq-value-spin-btn"
                  disabled={rowLocked}
                  aria-label="Increase SR.CAZ by 0.01"
                  onClick={() => nudgeValueField(section, index, 'sr', STEP_SR_CAZ)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="sq-value-spin-btn"
                  disabled={rowLocked}
                  aria-label="Decrease SR.CAZ by 0.01"
                  onClick={() => nudgeValueField(section, index, 'sr', -STEP_SR_CAZ)}
                >
                  ▼
                </button>
              </div>
            </div>
          ) : (
            <ScaledHundredthsInput
              value={player.sr}
              disabled={rowLocked}
              className="cell-input"
              showEmptyWhenZero={false}
              onCommit={(n) => updateField(section, index, 'sr', String(n))}
              onKeyDown={(e) => handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf('sr'))}
              data-section={section}
              data-row={index}
              data-col={ALL_EDITABLE_FIELDS.indexOf('sr')}
            />
          )}
        </td>
        {(['fours', 'sixes'] as const).map((fk) =>
          editFoursSixes ? (
            <td
              key={fk}
              className={`sq-num sq-editable sq-stat sq-stat-bat${valueSteppers ? ' sq-cell-value-stepper' : ''}`}
            >
              {valueSteppers ? (
                <div className="sq-value-stepper sq-value-stepper--spin-end">
                  <input
                    type="number"
                    className="cell-input cell-input-sq-step"
                    value={player[fk]}
                    disabled={rowLocked}
                    min={0}
                    step={0.1}
                    data-section={section}
                    data-row={index}
                    data-col={ALL_EDITABLE_FIELDS.indexOf(fk)}
                    onChange={(e) => updateField(section, index, fk, e.target.value)}
                    onKeyDown={(e) =>
                      handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf(fk))
                    }
                    onFocus={(e) => e.target.select()}
                  />
                  <div
                    className="sq-value-spin-col"
                    role="group"
                    aria-label={fk === 'fours' ? '4s stepper' : '6s stepper'}
                  >
                    <button
                      type="button"
                      className="sq-value-spin-btn"
                      disabled={rowLocked}
                      aria-label={`Increase ${fk === 'fours' ? '4s' : '6s'} by ${STEP_FOURS_SIXES}`}
                      onClick={() => nudgeValueField(section, index, fk, STEP_FOURS_SIXES)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="sq-value-spin-btn"
                      disabled={rowLocked}
                      aria-label={`Decrease ${fk === 'fours' ? '4s' : '6s'} by ${STEP_FOURS_SIXES}`}
                      onClick={() => nudgeValueField(section, index, fk, -STEP_FOURS_SIXES)}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="number"
                  className="cell-input"
                  value={player[fk]}
                  disabled={rowLocked}
                  min={0}
                  step={0.1}
                  data-section={section}
                  data-row={index}
                  data-col={ALL_EDITABLE_FIELDS.indexOf(fk)}
                  onChange={(e) => updateField(section, index, fk, e.target.value)}
                  onKeyDown={(e) =>
                    handleCellKeyDown(e, section, index, ALL_EDITABLE_FIELDS.indexOf(fk))
                  }
                  onFocus={(e) => e.target.select()}
                />
              )}
            </td>
          ) : (
            <td key={fk} className="sq-num sq-stat sq-stat-bat">
              {player[fk].toFixed(1)}
            </td>
          ),
        )}
        <td
          className={`sq-num sq-rating sq-stat sq-stat-bat ${player.batRating > 0 ? 'rating-pos' : player.batRating < 0 ? 'rating-neg' : ''}`}
        >
          {formatSquadRatingDisplay(player.batRating, ratingDp)}
        </td>
        <td className="sq-action sq-stat sq-stat-bowl">
          <BowlActionSelect
            value={player.action}
            disabled={rowLocked}
            onPick={(v) => {
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
          />
        </td>
        <td className="sq-num sq-stat sq-stat-bowl">{player.wkts.toFixed(1)}</td>
        {BOWL_EDITABLE.map((field) => {
          const colIdx = ALL_EDITABLE_FIELDS.indexOf(field)
          const delta =
            field === 'overs' ? STEP_OVERS : field === 'econ' ? STEP_ECON : STEP_BOWL_SR_WPO
          const label =
            field === 'overs'
              ? ('Overs' as const)
              : field === 'econ'
                ? ('Economy rate' as const)
                : ('Bowling SR' as const)
          return (
            <td
              key={field}
              className={`sq-num sq-editable sq-stat sq-stat-bowl${valueSteppers ? ' sq-cell-value-stepper' : ''}`}
            >
              {valueSteppers ? (
                <div className="sq-value-stepper sq-value-stepper--spin-end">
                  {field === 'bowlWpo' ? (
                    <ScaledHundredthsInput
                      value={player.bowlWpo}
                      disabled={rowLocked}
                      className="cell-input cell-input-sq-step"
                      showEmptyWhenZero
                      onCommit={(n) => updateField(section, index, 'bowlWpo', String(n))}
                      onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                      data-section={section}
                      data-row={index}
                      data-col={colIdx}
                    />
                  ) : field === 'econ' ? (
                    <ScaledEconInput
                      value={player.econ}
                      disabled={rowLocked}
                      className="cell-input cell-input-sq-step"
                      onCommit={(n) => updateField(section, index, 'econ', String(n))}
                      onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                      data-section={section}
                      data-row={index}
                      data-col={colIdx}
                    />
                  ) : (
                    <input
                      type="number"
                      className="cell-input cell-input-sq-step"
                      value={player[field]}
                      disabled={rowLocked}
                      step="0.1"
                      data-section={section}
                      data-row={index}
                      data-col={colIdx}
                      onChange={(e) => updateField(section, index, field, e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                      onFocus={(e) => e.target.select()}
                    />
                  )}
                  <div className="sq-value-spin-col" role="group" aria-label={`${label} stepper`}>
                    <button
                      type="button"
                      className="sq-value-spin-btn"
                      disabled={rowLocked}
                      aria-label={`Increase ${label} by ${delta}`}
                      onClick={() => nudgeValueField(section, index, field, delta)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="sq-value-spin-btn"
                      disabled={rowLocked}
                      aria-label={`Decrease ${label} by ${delta}`}
                      onClick={() => nudgeValueField(section, index, field, -delta)}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ) : field === 'bowlWpo' ? (
                <ScaledHundredthsInput
                  value={player.bowlWpo}
                  disabled={rowLocked}
                  className="cell-input"
                  showEmptyWhenZero
                  onCommit={(n) => updateField(section, index, 'bowlWpo', String(n))}
                  onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                  data-section={section}
                  data-row={index}
                  data-col={colIdx}
                />
              ) : field === 'econ' ? (
                <ScaledEconInput
                  value={player.econ}
                  disabled={rowLocked}
                  className="cell-input"
                  onCommit={(n) => updateField(section, index, 'econ', String(n))}
                  onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                  data-section={section}
                  data-row={index}
                  data-col={colIdx}
                />
              ) : (
                <input
                  type="number"
                  className="cell-input"
                  value={player[field]}
                  disabled={rowLocked}
                  data-section={section}
                  data-row={index}
                  data-col={colIdx}
                  onChange={(e) => updateField(section, index, field, e.target.value)}
                  onKeyDown={(e) => handleCellKeyDown(e, section, index, colIdx)}
                  onFocus={(e) => e.target.select()}
                />
              )}
            </td>
          )
        })}
        <td className="sq-num sq-stat sq-stat-bowl">{player.bowlAvg.toFixed(2)}</td>
        <td
          className={`sq-num sq-rating sq-stat sq-stat-bowl ${!Number.isNaN(player.bowlRating) ? (player.bowlRating > 0 ? 'rating-pos' : player.bowlRating < 0 ? 'rating-neg' : '') : ''}`}
        >
          {Number.isNaN(player.bowlRating) ? '–' : formatSquadRatingDisplay(player.bowlRating, ratingDp)}
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
    if (section === 'reserves') return null
    const sum = (fn: (p: SquadPlayer) => number) => players.reduce((acc, p) => acc + fn(p), 0)
    const sumBat = sum((p) => p.batRating)
    const sumBowl = sum((p) => (Number.isNaN(p.bowlRating) ? 0 : p.bowlRating))
    const totBatRating = computeTournamentBattingTeamIndex(sumBat, ratingParScore)
    const totBowlRating = computeTournamentBowlingTeamIndex(sumBowl, ratingParScore)
    const totWkts = sum((p) => p.wkts)
    const totOvers = sum((p) => p.overs)
    const schedOvers = scheduledInningsOversForFormat(cricketFormat)
    const wktsWarn = totWkts > 10
    const oversWarn = totOvers > schedOvers + 1e-9

    const emptyBat = <td className="sq-num sq-stat sq-stat-bat sq-totals-empty" />
    const emptyBowlNum = <td className="sq-num sq-stat sq-stat-bowl sq-totals-empty" />
    const emptyAction = <td className="sq-action sq-stat sq-stat-bowl sq-totals-empty" />

    return (
      <tfoot>
        <tr className="squad-totals-row">
          <td className="sq-swap sq-core sq-totals-filler" />
          <td className="sq-pos sq-core sq-totals-filler" />
          <td className="sq-drag sq-core sq-totals-filler" />
          <td className="sq-pid sq-core sq-totals-filler" />
          <td className="sq-name sq-core sq-totals-label">Totals</td>
          {emptyBat}
          {!hideBatRawCols ? (
            <>
              <td className="sq-num sq-stat sq-stat-bat sq-raw-base sq-totals-empty" />
              <td className="sq-num sq-stat sq-stat-bat sq-totals-empty" />
            </>
          ) : null}
          {emptyBat}
          {emptyBat}
          {emptyBat}
          <td
            className={`sq-num sq-rating sq-stat sq-stat-bat ${teamBattingParIndexClass(totBatRating)}`}
          >
            {formatSquadRatingDisplay(totBatRating, 2)}
          </td>
          {emptyAction}
          <td
            className={'sq-num sq-stat sq-stat-bowl' + (wktsWarn ? ' sq-totals-warn' : '')}
            title={
              wktsWarn
                ? 'Total wickets exceed 10 for this group'
                : `Total wickets: ${totWkts.toFixed(1)}`
            }
          >
            {totWkts.toFixed(1)}
          </td>
          <td
            className={'sq-num sq-stat sq-stat-bowl' + (oversWarn ? ' sq-totals-warn' : '')}
            title={
              oversWarn
                ? `Total overs (${totOvers.toFixed(1)}) exceed scheduled ${schedOvers} for this format`
                : `Total overs: ${totOvers.toFixed(1)} (scheduled ${schedOvers})`
            }
          >
            {totOvers.toFixed(1)}
          </td>
          {emptyBowlNum}
          {emptyBowlNum}
          {emptyBowlNum}
          <td
            className={`sq-num sq-rating sq-stat sq-stat-bowl ${
              Number.isNaN(totBowlRating) ? '' : teamBowlingParIndexClass(totBowlRating)
            }`}
          >
            {formatSquadRatingDisplay(totBowlRating, 2)}
          </td>
          <td className="sq-lock sq-core sq-totals-lock">{lockBulkHeaderButton(section)}</td>
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

  const squadColumnCount = hideBatRawCols ? 18 : 20
  const squadTableClass = [
    'squad-table',
    valueSteppers ? 'squad-table--value-steppers' : '',
    hideBatRawCols ? 'squad-table--hide-bat-raw' : '',
    editFoursSixes ? 'squad-table--edit-46' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="squad-table-container">
      <div className="squad-section squad-section-panel">
        <div className="squad-section-header-row">
          <h3 className="squad-section-title">Starting XI</h3>
          <div className="squad-section-header-controls">
            <label
              className="squad-hide-raw-control"
              title="Hide the Raw (effective average) and RAW ADJ columns. Adjustments still apply in the background; show columns again to edit RAW ADJ."
            >
              <input
                type="checkbox"
                checked={hideBatRawCols}
                onChange={(e) => {
                  const checked = e.target.checked
                  setHideBatRawCols(checked)
                  writeSquadHideBatRawColumns(checked)
                }}
              />
              <span>Hide Raw / RAW ADJ</span>
            </label>
            <label
              className="squad-value-steppers-control"
              title="Slightly wider stat cells with steppers hidden until you hover the cell or focus the input (±1 / ±0.01 / ±0.1). RAW ADJ always has buttons. Touch: steppers stay visible."
            >
              <input
                type="checkbox"
                checked={valueSteppers}
                onChange={(e) => {
                  const checked = e.target.checked
                  setValueSteppers(checked)
                  writeSquadValueSteppers(checked)
                }}
              />
              <span>Value steppers</span>
            </label>
            <label
              className="squad-edit-46-control"
              title="Show number inputs for 4s and 6s (Starting XI, impact subs, and reserves). Preference is saved in this browser."
            >
              <input
                type="checkbox"
                checked={editFoursSixes}
                onChange={(e) => {
                  const v = e.target.checked
                  setEditFoursSixes(v)
                  writeSquadEditFoursSixes(v)
                }}
              />
              <span>Edit 4s / 6s</span>
            </label>
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
        </div>
        <div className="squad-table-wrap">
          <table className={squadTableClass}>
            <thead>
              {buildSquadTableHeaderRows('Pos', 'Line-up order in the starting XI (1–11)', false, hideBatRawCols)}
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
            <table className={squadTableClass}>
              <thead>
                {buildSquadTableHeaderRows(
                  'Rtg pos',
                  'Par batting position 1–11 for rating (bench/impact: pick the slot to compare in the par table)',
                  false,
                  hideBatRawCols,
                )}
              </thead>
              <tbody>
                {impactSubs.length === 0 && (
                  <tr
                    className="squad-drop-slot-row"
                    onDragEnter={() => handleDragEnter('impact', 0)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td colSpan={squadColumnCount} className="squad-drop-slot-cell">
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
                    <td colSpan={squadColumnCount} className="squad-drop-slot-cell">
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
          <table className={squadTableClass}>
            <thead>
              {buildSquadTableHeaderRows(
                'Rtg pos',
                'Par batting position 1–11 for rating (bench/impact: pick the slot to compare in the par table)',
                true,
                hideBatRawCols,
              )}
            </thead>
            <tbody>{reserves.map((p, i) => renderRow(p, i, 'reserves'))}</tbody>
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
            {onCreateCustomPlayer ? (
              <div className="squad-add-custom">
                <span className="squad-add-custom-label">Custom player</span>
                <div className="squad-add-custom-row">
                  <input
                    type="text"
                    className="squad-add-input squad-add-custom-input"
                    placeholder="Full name…"
                    value={customReserveName}
                    onChange={(e) => setCustomReserveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      const q = customReserveName.trim()
                      if (!q) return
                      onCreateCustomPlayer(q)
                      setCustomReserveName('')
                    }}
                    aria-label="Custom player name for reserves"
                  />
                  <button
                    type="button"
                    className="squad-add-custom-btn"
                    disabled={!customReserveName.trim()}
                    onClick={() => {
                      onCreateCustomPlayer(customReserveName.trim())
                      setCustomReserveName('')
                    }}
                  >
                    Add blank to reserves
                  </button>
                </div>
                <p className="squad-add-custom-hint">Zeroed stats — edit in the squad table.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
