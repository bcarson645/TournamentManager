'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { getStoredSquad } from '../data/squadStore'
import { makeSquadForTeam, type SquadPlayer } from '../data/squad'
import { contextStatCellHighlight } from '../data/contextStatDeviation'

const SIDE_MARKETS_PANEL_HEIGHT_KEY = 'pmd-side-markets-panel-height'
const SIDE_MARKETS_PANEL_MIN_H = 96
const SIDE_MARKETS_PANEL_MAX_H = 560

function readStoredSideMarketsHeight(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SIDE_MARKETS_PANEL_HEIGHT_KEY)
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.min(SIDE_MARKETS_PANEL_MAX_H, Math.max(SIDE_MARKETS_PANEL_MIN_H, n))
}
const DEMO_HOME_ID = 'blast-glamorgan'
const DEMO_AWAY_ID = 'blast-warwickshire-bears'

const SIDE_MARKETS_FIXED_COLUMNS: { label: string; title: string }[] = [
  { label: 'Venue', title: 'Venue' },
  { label: 'Host', title: 'Host team' },
  { label: 'Cmptn', title: 'Competition' },
  { label: 'All', title: 'All matches' },
]
const SIDE_MARKETS_YEAR_OPTIONS = [1, 2, 3, 5, 7, 10] as const

/** Demo venue/context stats — wired to live data in a later pass */
const SIDE_MARKETS_STATS: { label: string; values: (string | null)[] }[] = [
  { label: '1st Inns', values: ['178', '171', '166', '166', '170'] },
  { label: 'Wickets', values: ['6.4', '6.7', '6.6', '6.6', '6.8'] },
  { label: 'Fours', values: ['13.8', '13.2', '12.5', '13.0', '13.1'] },
  { label: 'Sixes', values: ['7.3', '6.3', '6.2', '6.0', '6.8'] },
  { label: 'T5.Avg', values: ['29.0', '27.0', '26.5', '27.0', '26.6'] },
  { label: 'T5.SR', values: ['1.39', '1.36', '1.32', '1.32', '1.36'] },
  { label: '1st over', values: [null, null, null, '5.9', '6.2'] },
  { label: '1st 6', values: [null, null, null, '45.8', '47.6'] },
  { label: '1st 12', values: [null, null, null, '89.2', '91.3'] },
  { label: 'Fours Prop', values: ['33.3%', '32.5%', '32.0%', '32.8%', '32.4%'] },
  { label: 'Sixes Prop', values: ['26.4%', '23.2%', '23.8%', '22.8%', '25.3%'] },
  { label: 'Extras', values: ['7.5', '8.2', '8.3', '8.2', '8.4'] },
  { label: 'Wides', values: ['3.9', '4.7', '4.8', '4.8', '5.2'] },
  { label: 'Ducks', values: ['0.74', '0.66', '0.73', '0.66', '0.72'] },
  { label: 'Run Outs', values: ['0.25', '0.44', '0.41', '0.42', '0.36'] },
  { label: 'Samples', values: ['76', '734', '1824', '11864', '3164'] },
]

const SIDE_MARKETS_SAMPLES_ROW = SIDE_MARKETS_STATS[SIDE_MARKETS_STATS.length - 1]
const SIDE_MARKETS_STATS_DATA = SIDE_MARKETS_STATS.slice(0, -1)

const TEAM_SIDE_MARKET_ROWS = [
  { label: '1st over', homeCalc: '6.4', homeEdit: '6.4', awayCalc: '5.9', awayEdit: '6.0' },
  { label: '1st 6', homeCalc: '49.8', homeEdit: '50.2', awayCalc: '46.4', awayEdit: '45.5' },
  { label: '1st 12', homeCalc: '96.9', homeEdit: '97.0', awayCalc: '90.2', awayEdit: '89.5' },
  { label: 'Run Outs', homeCalc: '0.39', homeEdit: '0.40', awayCalc: '0.32', awayEdit: '0.33' },
  { label: 'Max Over', homeCalc: '18.8', homeEdit: '19.0', awayCalc: '17.9', awayEdit: '18.0' },
  { label: 'Wides Conceded', homeCalc: '5.4', homeEdit: '5.5', awayCalc: '5.6', awayEdit: '5.6' },
  { label: 'Ducks Conceded', homeCalc: '0.67', homeEdit: '0.70', awayCalc: '0.74', awayEdit: '0.75' },
] as const

const DEMO_HOME_NAME = 'Glamorgan'
const DEMO_AWAY_NAME = 'Warwickshire'

type TeamSideEdits = Record<(typeof TEAM_SIDE_MARKET_ROWS)[number]['label'], { home: string; away: string }>

function initialTeamSideEdits(): TeamSideEdits {
  const edits = {} as TeamSideEdits
  for (const row of TEAM_SIDE_MARKET_ROWS) {
    edits[row.label] = { home: row.homeEdit, away: row.awayEdit }
  }
  return edits
}

const MARKET_CONTEXT_COLUMNS: { label: string; title: string }[] = [
  { label: 'Venue', title: 'Venue' },
  { label: 'Host', title: 'Host team' },
  { label: 'Cmptn', title: 'Competition' },
  { label: '3 Yr Cm', title: '3-year competition' },
  { label: 'All', title: 'All matches' },
  { label: 'Model', title: 'Model' },
]

const MARKET_CONTEXT_ROWS = [
  {
    label: 'Match Max Over',
    values: [null, null, null, null, '18.9', '20.3'] as (string | null)[],
    now: '20.5',
  },
  {
    label: 'Team Max Over',
    values: [null, null, null, null, '17.0', null] as (string | null)[],
    now: '',
  },
  {
    label: 'Fifty in 1st inns',
    values: ['65.8%', '66.8%', '61.5%', '63.8%', '62.9%', '65%'] as (string | null)[],
    now: '65.0%',
  },
  {
    label: 'Fifty in Match',
    values: ['92.1%', '87.7%', '79.9%', '82.1%', '81.8%', null] as (string | null)[],
    now: '81.5%',
  },
  {
    label: 'Hundred in 1st inns',
    values: ['0.0%', '5.4%', '6.6%', '7.5%', '5.6%', '5.8%'] as (string | null)[],
    now: '5.8%',
  },
  {
    label: 'Hundred in Match',
    values: ['0.0%', '7.9%', '9.2%', '11.0%', '8.1%', '8.4%'] as (string | null)[],
    now: '8.4%',
  },
  {
    label: 'Highest ind. score',
    values: ['74.0', '69.0', '66.0', null, '66.0', '67'] as (string | null)[],
    now: '65',
  },
  {
    label: 'Rabbit runs',
    values: ['1.61', '1.14', '1.03', null, '0.97', null] as (string | null)[],
    now: '',
  },
] as const

type MarketContextLabel = (typeof MARKET_CONTEXT_ROWS)[number]['label']

function initialMarketContextNow(): Record<MarketContextLabel, string> {
  const now = {} as Record<MarketContextLabel, string>
  for (const row of MARKET_CONTEXT_ROWS) {
    now[row.label] = row.now
  }
  return now
}

function inferEditStep(value: string): number {
  if (value.includes('%')) return 0.1
  const raw = value.replace('%', '').trim()
  if (!raw || !Number.isFinite(Number.parseFloat(raw))) return 0.1
  return raw.includes('.') ? 0.1 : 1
}

function decimalPlaces(value: string): number {
  const raw = value.replace('%', '').trim()
  const dot = raw.indexOf('.')
  if (dot === -1) return 0
  return raw.length - dot - 1
}

function stepEditableValue(value: string, direction: 1 | -1): string {
  const isPercent = value.includes('%')
  const raw = value.replace('%', '').trim()
  const parsed = Number.parseFloat(raw)
  const step = inferEditStep(value)

  if (!Number.isFinite(parsed)) {
    if (direction < 0) return ''
    return isPercent ? '0.0%' : '0'
  }

  const next = parsed + direction * step
  const places = Math.max(decimalPlaces(value), isPercent ? 1 : 0)
  let formatted = next.toFixed(places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  if (isPercent) formatted += '%'
  return formatted
}

interface SteppedEditInputProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}

function SteppedEditInput({ value, onChange, ariaLabel }: SteppedEditInputProps) {
  const bump = (direction: 1 | -1) => {
    onChange(stepEditableValue(value, direction))
  }

  return (
    <div className="pmd-sm-edit-wrap">
      <input
        type="text"
        className="pmd-sm-edit-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      <div className="pmd-sm-edit-steppers">
        <button
          type="button"
          className="pmd-sm-edit-step"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => bump(1)}
          aria-label={`Increase ${ariaLabel}`}
          tabIndex={-1}
        >
          ▲
        </button>
        <button
          type="button"
          className="pmd-sm-edit-step"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => bump(-1)}
          aria-label={`Decrease ${ariaLabel}`}
          tabIndex={-1}
        >
          ▼
        </button>
      </div>
    </div>
  )
}

function SideMarketsColGroup() {
  return (
    <colgroup>
      <col className="pmd-sm-col-label" />
      <col className="pmd-sm-col-data" />
      <col className="pmd-sm-col-data" />
      <col className="pmd-sm-col-data" />
      <col className="pmd-sm-col-data" />
      <col className="pmd-sm-col-data" />
    </colgroup>
  )
}

function SideMarketsModule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pmd-side-markets-module">
      <h3 className="pmd-side-markets-module-title">{title}</h3>
      {children}
    </div>
  )
}

function SideMarketsStatsHead({
  yearsBack,
  onYearsChange,
}: {
  yearsBack: number
  onYearsChange: (years: number) => void
}) {
  return (
    <thead>
      <tr>
        <th className="pmd-sm-stats-corner" aria-hidden />
        {SIDE_MARKETS_FIXED_COLUMNS.map((col) => (
          <th key={col.label} scope="col" title={col.title}>
            {col.label}
          </th>
        ))}
        <th scope="col" className="pmd-sm-years-head">
          <span className="pmd-sm-years-head-text">Rolling</span>
          <select
            className="pmd-sm-years-select"
            value={yearsBack}
            onChange={(e) => onYearsChange(Number(e.target.value))}
            aria-label="Years of historical data to include"
          >
            {SIDE_MARKETS_YEAR_OPTIONS.map((years) => (
              <option key={years} value={years}>
                {years} yr
              </option>
            ))}
          </select>
        </th>
      </tr>
    </thead>
  )
}

function SideMarketsStatsRow({
  row,
  yearsBack,
}: {
  row: (typeof SIDE_MARKETS_STATS)[number]
  yearsBack: number
}) {
  return (
    <tr>
      <th scope="row" className="pmd-sm-stats-label">
        {row.label}
      </th>
      {row.values.map((val, i) => {
        const dev = contextStatCellHighlight(row.label, i, val, row.values)
        const devClass =
          dev.tone === 'high-light'
            ? 'pmd-sm-dev--high-light'
            : dev.tone === 'high-dark'
              ? 'pmd-sm-dev--high-dark'
              : dev.tone === 'low-light'
                ? 'pmd-sm-dev--low-light'
                : dev.tone === 'low-dark'
                  ? 'pmd-sm-dev--low-dark'
                  : undefined
        return (
          <td
            key={i < 4 ? SIDE_MARKETS_FIXED_COLUMNS[i].label : `years-${yearsBack}`}
            className={[val == null ? 'pmd-sm-stats-empty' : undefined, devClass].filter(Boolean).join(' ') || undefined}
            title={dev.title}
          >
            {val ?? ''}
          </td>
        )
      })}
    </tr>
  )
}

function SideMarketsStatsSamplesFoot({ yearsBack }: { yearsBack: number }) {
  const row = SIDE_MARKETS_SAMPLES_ROW
  return (
    <tfoot>
      <tr className="pmd-sm-stats-samples-row">
        <th scope="row" className="pmd-sm-stats-label">
          {row.label}
        </th>
        {row.values.map((val, i) => (
          <td
            key={i < 4 ? SIDE_MARKETS_FIXED_COLUMNS[i].label : `years-${yearsBack}`}
            className={val == null ? 'pmd-sm-stats-empty' : undefined}
          >
            {val ?? ''}
          </td>
        ))}
      </tr>
    </tfoot>
  )
}

function SideMarketsStatsTable() {
  const [yearsBack, setYearsBack] = useState<number>(5)

  return (
    <div className="pmd-sm-stats-wrap">
      <table className="pmd-sm-stats-table">
        <SideMarketsColGroup />
        <SideMarketsStatsHead yearsBack={yearsBack} onYearsChange={setYearsBack} />
        <tbody>
          {SIDE_MARKETS_STATS_DATA.map((row) => (
            <SideMarketsStatsRow key={row.label} row={row} yearsBack={yearsBack} />
          ))}
        </tbody>
        <SideMarketsStatsSamplesFoot yearsBack={yearsBack} />
      </table>
    </div>
  )
}

function TeamSideMarketsTable() {
  const [edits, setEdits] = useState<TeamSideEdits>(initialTeamSideEdits)

  const setEdit = (label: (typeof TEAM_SIDE_MARKET_ROWS)[number]['label'], team: 'home' | 'away', value: string) => {
    setEdits((prev) => ({
      ...prev,
      [label]: { ...prev[label], [team]: value },
    }))
  }

  return (
    <div className="pmd-sm-stats-wrap">
      <table className="pmd-sm-stats-table pmd-sm-team-table">
        <thead>
          <tr>
            <th className="pmd-sm-stats-corner" aria-hidden />
            <th colSpan={2} className="pmd-sm-team-namehead">
              {DEMO_HOME_NAME}
            </th>
            <th colSpan={2} className="pmd-sm-team-namehead pmd-sm-team-namehead--away">
              {DEMO_AWAY_NAME}
            </th>
          </tr>
        </thead>
        <tbody>
          {TEAM_SIDE_MARKET_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="pmd-sm-stats-label">
                {row.label}
              </th>
              <td className="pmd-sm-readonly">{row.homeCalc}</td>
              <td className="pmd-sm-editable">
                <SteppedEditInput
                  value={edits[row.label].home}
                  onChange={(v) => setEdit(row.label, 'home', v)}
                  ariaLabel={`${DEMO_HOME_NAME} ${row.label} adjustment`}
                />
              </td>
              <td className="pmd-sm-readonly pmd-sm-readonly--sep">{row.awayCalc}</td>
              <td className="pmd-sm-editable">
                <SteppedEditInput
                  value={edits[row.label].away}
                  onChange={(v) => setEdit(row.label, 'away', v)}
                  ariaLabel={`${DEMO_AWAY_NAME} ${row.label} adjustment`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatchMarketsContextTable() {
  const [nowValues, setNowValues] = useState(initialMarketContextNow)

  return (
    <div className="pmd-sm-stats-wrap">
      <table className="pmd-sm-stats-table pmd-sm-context-table">
        <thead>
          <tr>
            <th className="pmd-sm-stats-corner" aria-hidden />
            {MARKET_CONTEXT_COLUMNS.map((col) => (
              <th key={col.label} scope="col" title={col.title}>
                {col.label}
              </th>
            ))}
            <th scope="col" className="pmd-sm-nowhead">
              Now
            </th>
          </tr>
        </thead>
        <tbody>
          {MARKET_CONTEXT_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="pmd-sm-stats-label">
                {row.label}
              </th>
              {row.values.map((val, i) => (
                <td key={MARKET_CONTEXT_COLUMNS[i].label} className={val == null ? 'pmd-sm-stats-empty' : undefined}>
                  {val ?? ''}
                </td>
              ))}
              <td className="pmd-sm-editable pmd-sm-editable--live">
                <SteppedEditInput
                  value={nowValues[row.label]}
                  onChange={(v) =>
                    setNowValues((prev) => ({
                      ...prev,
                      [row.label]: v,
                    }))
                  }
                  ariaLabel={`${row.label} now`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function srDisplay(srPerBall: number): string {
  if (!Number.isFinite(srPerBall) || srPerBall <= 0) return '—'
  return (Math.round(srPerBall * 100 * 100) / 100).toFixed(2)
}

function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  if (digits === 0) return String(Math.round(n))
  return n.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function loadStartingXi(teamId: string): SquadPlayer[] {
  const stored = getStoredSquad(teamId)
  if (stored?.startingXI?.length) return stored.startingXI.slice(0, 11)
  return makeSquadForTeam(teamId, 't20', 'men').startingXI
}

function ratingClass(rating: number): string {
  if (!Number.isFinite(rating) || rating === 0) return 'pmd-rating pmd-rating--neutral'
  return rating > 0 ? 'pmd-rating pmd-rating--pos' : 'pmd-rating pmd-rating--neg'
}

interface TeamBattersTableProps {
  teamName: string
  players: SquadPlayer[]
}

function TeamBattersTable({ teamName, players }: TeamBattersTableProps) {
  let btCaz = 0
  let raw = 0
  let rawAdj = 0
  let sr = 0
  let fours = 0
  let sixes = 0
  let rating = 0
  for (const p of players) {
    btCaz += p.btCaz
    raw += p.raw
    rawAdj += p.rawAdj
    sr += p.sr
    fours += p.fours
    sixes += p.sixes
    rating += Number.isFinite(p.batRating) ? p.batRating : 0
  }
  const n = Math.max(players.length, 1)
  const totals = {
    btCaz,
    raw: Math.round(raw * 10) / 10,
    rawAdj,
    sr: sr / n,
    fours: Math.round(fours * 10) / 10,
    sixes: Math.round(sixes * 10) / 10,
    rating: Math.round(rating * 100) / 100,
  }

  return (
    <div className="pmd-team-panel">
      <div className="pmd-team-panel-title">{teamName}</div>
      <div className="pmd-table-wrap">
        <table className="pmd-table">
          <thead>
            <tr>
              <th className="pmd-th-sort" aria-label="Sort" />
              <th>Pos</th>
              <th>Player ID</th>
              <th className="pmd-th-name">Name</th>
              <th>BT CAZ</th>
              <th>Raw</th>
              <th>Raw Adj</th>
              <th>SR</th>
              <th>4s</th>
              <th>6s</th>
              <th>Rating</th>
              <th className="pmd-th-info" aria-label="Info" />
              <th className="pmd-th-check" aria-label="Select" />
            </tr>
            <tr className="pmd-subhead-row">
              <th colSpan={13}>STARTING XI</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id}>
                <td className="pmd-td-sort">
                  <span className="pmd-sort-icon" aria-hidden>
                    ⇅
                  </span>
                </td>
                <td>{i + 1}</td>
                <td className="pmd-td-pid">{p.playerId}</td>
                <td className="pmd-td-name">
                  {p.name}
                  {p.note?.trim() ? (
                    <span className="pmd-note-dot" title="Squad note" aria-hidden />
                  ) : null}
                </td>
                <td>{fmtNum(p.btCaz, 1)}</td>
                <td>
                  <span className="pmd-cell-box">{fmtNum(p.raw, 1)}</span>
                </td>
                <td>
                  <span className="pmd-adj-box">
                    <span className="pmd-adj-btn" aria-hidden>
                      −
                    </span>
                    <span className="pmd-adj-val">{fmtNum(p.rawAdj, 0)}</span>
                    <span className="pmd-adj-btn" aria-hidden>
                      +
                    </span>
                  </span>
                </td>
                <td>
                  <span className="pmd-cell-box">{srDisplay(p.sr)}</span>
                </td>
                <td>
                  <span className="pmd-cell-box">{fmtNum(p.fours, 1)}</span>
                </td>
                <td>
                  <span className="pmd-cell-box">{fmtNum(p.sixes, 1)}</span>
                </td>
                <td>
                  <span className={ratingClass(p.batRating)}>{fmtNum(p.batRating, 2)}</span>
                </td>
                <td className="pmd-td-info">
                  <span className="pmd-info-icon" title="Player info" aria-hidden>
                    i
                  </span>
                </td>
                <td className="pmd-td-check">
                  <input type="checkbox" className="pmd-check" readOnly aria-label={`Select ${p.name}`} />
                </td>
              </tr>
            ))}
            <tr className="pmd-totals-row">
              <td colSpan={4} className="pmd-totals-label">
                TOTALS:
              </td>
              <td>{fmtNum(totals.btCaz, 1)}</td>
              <td>{fmtNum(totals.raw, 1)}</td>
              <td>{fmtNum(totals.rawAdj, 0)}</td>
              <td>{srDisplay(totals.sr)}</td>
              <td>{fmtNum(totals.fours, 1)}</td>
              <td>{fmtNum(totals.sixes, 1)}</td>
              <td>
                <span className={ratingClass(totals.rating)}>{fmtNum(totals.rating, 2)}</span>
              </td>
              <td colSpan={2} className="pmd-totals-all">
                <button type="button" className="pmd-all-btn">
                  All
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PreMatchDesign() {
  const [homeXi, setHomeXi] = useState(() => makeSquadForTeam(DEMO_HOME_ID, 't20', 'men').startingXI)
  const [awayXi, setAwayXi] = useState(() => makeSquadForTeam(DEMO_AWAY_ID, 't20', 'men').startingXI)
  const [sideMarketsOpen, setSideMarketsOpen] = useState(false)
  const [sideMarketsPanelHeight, setSideMarketsPanelHeight] = useState<number | null>(readStoredSideMarketsHeight)
  const sideMarketsPanelRef = useRef<HTMLDivElement>(null)
  const sideMarketsResizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => {
    setHomeXi(loadStartingXi(DEMO_HOME_ID))
    setAwayXi(loadStartingXi(DEMO_AWAY_ID))
  }, [])

  useEffect(() => {
    if (sideMarketsPanelHeight == null) {
      localStorage.removeItem(SIDE_MARKETS_PANEL_HEIGHT_KEY)
      return
    }
    localStorage.setItem(SIDE_MARKETS_PANEL_HEIGHT_KEY, String(sideMarketsPanelHeight))
  }, [sideMarketsPanelHeight])

  const onSideMarketsResizeStart = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const panel = sideMarketsPanelRef.current
      const startHeight =
        sideMarketsPanelHeight ?? panel?.getBoundingClientRect().height ?? 280
      sideMarketsResizeRef.current = { startY: e.clientY, startHeight }
      e.currentTarget.setPointerCapture(e.pointerId)
      if (sideMarketsPanelHeight == null) {
        setSideMarketsPanelHeight(Math.round(startHeight))
      }
    },
    [sideMarketsPanelHeight],
  )

  const onSideMarketsResizeMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!sideMarketsResizeRef.current) return
    const delta = e.clientY - sideMarketsResizeRef.current.startY
    const next = Math.round(
      Math.min(
        SIDE_MARKETS_PANEL_MAX_H,
        Math.max(SIDE_MARKETS_PANEL_MIN_H, sideMarketsResizeRef.current.startHeight + delta),
      ),
    )
    setSideMarketsPanelHeight(next)
  }, [])

  const onSideMarketsResizeEnd = useCallback((e: PointerEvent<HTMLDivElement>) => {
    sideMarketsResizeRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const onSideMarketsResizeDoubleClick = useCallback(() => {
    setSideMarketsPanelHeight(null)
  }, [])

  return (
    <div className="pmd-root">
      <div className="pmd-top-pane">
        <section className="pmd-match-info" aria-label="Match details">
          <h1 className="pmd-match-title">GLAMORGAN vs WARWICKSHIRE</h1>
          <ul className="pmd-match-meta">
            <li>
              <span className="pmd-meta-icon" aria-hidden>
                🏏
              </span>
              type of match?
            </li>
            <li>
              <span className="pmd-meta-icon" aria-hidden>
                🏆
              </span>
              competition
            </li>
            <li>
              <span className="pmd-meta-icon" aria-hidden>
                📍
              </span>
              venue venue
            </li>
            <li>
              <span className="pmd-meta-icon" aria-hidden>
                📅
              </span>
              start date
            </li>
          </ul>
          <div className="pmd-sr-id">
            <span className="pmd-sr-id-label">SR match ID</span>
            <code className="pmd-sr-id-value">sr:match:68858954</code>
            <button type="button" className="pmd-copy-btn" title="Copy match ID" aria-label="Copy match ID">
              ⧉
            </button>
          </div>
        </section>

        <section className="pmd-adjustments" aria-label="Match adjustments">
          <table className="pmd-adj-table">
            <thead>
              <tr>
                <th />
                <th>Glamorgan</th>
                <th className="pmd-adj-center">
                  <span className="pmd-stepper">
                    <span className="pmd-stepper-btn">−</span>
                    <span className="pmd-stepper-val">1.00</span>
                    <span className="pmd-stepper-btn">+</span>
                  </span>
                </th>
                <th>Warwickshire</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Conditions', '1.00', '1.00'],
                  ['Batting', '1.00', '1.00'],
                  ['Bowling', '1.00', '1.00'],
                  ['Total factor', '1.00', '1.00'],
                ] as const
              ).map(([label, home, away]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{home}</td>
                  <td />
                  <td>{away}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pmd-market" aria-label="Match market">
          <h2 className="pmd-market-title">MATCH MARKET</h2>
          <div className="pmd-market-rows">
            <div className="pmd-market-team">
              <span className="pmd-market-name">Glamorgan</span>
              <span className="pmd-odds-box pmd-odds-box--yes">—</span>
              <span className="pmd-odds-box pmd-odds-box--no">—</span>
            </div>
            <div className="pmd-market-team">
              <span className="pmd-market-name">Warwickshire</span>
              <span className="pmd-odds-box pmd-odds-box--yes">—</span>
              <span className="pmd-odds-box pmd-odds-box--no">—</span>
            </div>
          </div>
          <div className="pmd-market-stepper">
            <span className="pmd-stepper">
              <span className="pmd-stepper-btn">−</span>
              <span className="pmd-stepper-val">0</span>
              <span className="pmd-stepper-btn">+</span>
            </span>
          </div>
          <div className="pmd-market-actions">
            <button type="button" className="pmd-btn pmd-btn-primary">
              Get price
            </button>
            <button type="button" className="pmd-btn pmd-btn-secondary">
              Proceed
            </button>
          </div>
        </section>
      </div>

      <section
        className={`pmd-side-markets${sideMarketsOpen ? ' pmd-side-markets--open' : ''}`}
        aria-label="Side markets and data"
      >
        <button
          type="button"
          className="pmd-side-markets-toggle"
          onClick={() => setSideMarketsOpen((open) => !open)}
          aria-expanded={sideMarketsOpen}
          aria-controls="pmd-side-markets-panel"
        >
          <span className="pmd-side-markets-title">Side markets and data</span>
          <span
            className={`pmd-side-markets-chevron${sideMarketsOpen ? ' pmd-side-markets-chevron--open' : ''}`}
            aria-hidden
          >
            ▼
          </span>
        </button>
        {sideMarketsOpen ? (
          <>
            <div
              id="pmd-side-markets-panel"
              ref={sideMarketsPanelRef}
              className={`pmd-side-markets-body${sideMarketsPanelHeight != null ? ' pmd-side-markets-body--sized' : ''}`}
              style={sideMarketsPanelHeight != null ? { height: sideMarketsPanelHeight } : undefined}
            >
              <SideMarketsModule title="Context stats">
                <SideMarketsStatsTable />
              </SideMarketsModule>
              <SideMarketsModule title="Team adjustments">
                <TeamSideMarketsTable />
              </SideMarketsModule>
              <SideMarketsModule title="Match markets">
                <MatchMarketsContextTable />
              </SideMarketsModule>
            </div>
            <div
              className="pmd-side-markets-resize"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize side markets panel"
              title="Drag to resize. Double-click to reset height."
              onPointerDown={onSideMarketsResizeStart}
              onPointerMove={onSideMarketsResizeMove}
              onPointerUp={onSideMarketsResizeEnd}
              onPointerCancel={onSideMarketsResizeEnd}
              onDoubleClick={onSideMarketsResizeDoubleClick}
            />
          </>
        ) : null}
      </section>

      <div className="pmd-batters-bar">
        <span className="pmd-batters-label">BATTERS</span>
        <button type="button" className="pmd-batters-settings" title="Table settings" aria-label="Table settings">
          ⚙
        </button>
      </div>

      <div className="pmd-teams-grid">
        <TeamBattersTable teamName="Glamorgan" players={homeXi} />
        <TeamBattersTable teamName="Warwickshire" players={awayXi} />
      </div>
    </div>
  )
}
