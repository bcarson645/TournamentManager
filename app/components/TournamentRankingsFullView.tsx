'use client'

import { useMemo, useState } from 'react'
import type { Team } from '../data/teams'
import { getSquadForTeam } from '../data/squadStore'
import {
  type SquadStatsScope,
  squadPlayerBattingDisplay,
  squadPlayerBowlingDisplay,
  profileForSquadPlayer,
} from '../data/squadPlayerDisplayStats'
import {
  formatSquadRatingDisplay,
  readSquadRatingDp,
} from '../data/ratingDisplaySettings'

export interface TournamentRankingsFocus {
  teamId: string
  playerId: string
}

interface TournamentRankingsFullViewProps {
  teams: Team[]
  tournamentName: string
  seasonYear: number
  onBack: () => void
  onOpenPlayerInTeam: (focus: TournamentRankingsFocus) => void
}

const SCOPE_OPTIONS: { value: SquadStatsScope; label: string }[] = [
  { value: 'recent', label: 'Squad / recent' },
  { value: 'tournament', label: 'This tournament' },
  { value: 'career', label: 'Career' },
]

interface FullRow {
  playerId: string
  name: string
  teamId: string
  teamName: string
  prepped: string[]
  real: string[]
  recent: string[]
  ratingNum: number | null
}

type SortKey = 'player' | 'team' | `p${number}` | `r${number}` | `rec${number}`

export default function TournamentRankingsFullView({
  teams,
  tournamentName,
  seasonYear,
  onBack,
  onOpenPlayerInTeam,
}: TournamentRankingsFullViewProps) {
  const [mode, setMode] = useState<'batting' | 'bowling'>('batting')
  const [scope, setScope] = useState<SquadStatsScope>('recent')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('p2')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const ratingDp = readSquadRatingDp()
  const grpClass = mode === 'batting' ? 'tm-rk-grp-bat' : 'tm-rk-grp-bowl'

  const preppedHeads = mode === 'batting' ? ['BT CAZ', 'SR', 'Rating'] : ['Wkts', 'Overs', 'Econ', 'Rating']
  const realHeads =
    mode === 'batting'
      ? ['Avg', 'SR', 'Form', 'Avg pos']
      : ['W/inn', 'O/inn', 'Econ', 'B avg', 'SR']

  const rows = useMemo((): FullRow[] => {
    const out: FullRow[] = []

    for (const team of teams) {
      const { startingXI, reserves, impactSubs } = getSquadForTeam(team.id)
      const all: { p: (typeof startingXI)[0]; section: 'starting' | 'reserves' | 'impact'; idx: number }[] =
        []
      startingXI.forEach((p, i) => all.push({ p, section: 'starting', idx: i }))
      reserves.forEach((p, i) => all.push({ p, section: 'reserves', idx: i }))
      impactSubs.forEach((p, i) => all.push({ p, section: 'impact', idx: i }))

      for (const { p, section, idx } of all) {
        const profile = profileForSquadPlayer(p)
        if (mode === 'batting') {
          const s = squadPlayerBattingDisplay(
            p,
            profile,
            section,
            idx,
            scope,
            tournamentName,
            seasonYear,
          )
          out.push({
            playerId: p.id,
            name: p.name,
            teamId: team.id,
            teamName: team.name,
            ratingNum: Number.isFinite(p.batRating) ? p.batRating : null,
            prepped: [
              fmt(p.btCaz),
              fmt(p.sr * 100),
              formatSquadRatingDisplay(p.batRating, ratingDp),
            ],
            real: [
              fmt(s.average),
              fmt(s.strikeRate),
              fmt(s.form),
              s.avgPosition > 0 ? String(s.avgPosition) : '—',
            ],
            recent: recentFive(profile),
          })
        } else {
          const s = squadPlayerBowlingDisplay(p, profile, scope, tournamentName, seasonYear)
          const careerSr = profile.careerBowling.strikeRate
          out.push({
            playerId: p.id,
            name: p.name,
            teamId: team.id,
            teamName: team.name,
            ratingNum:
              Number.isNaN(p.bowlRating) || !Number.isFinite(p.bowlRating) ? null : p.bowlRating,
            prepped: [
              fmt(p.wkts),
              fmt(p.overs),
              fmt(p.econ),
              Number.isNaN(p.bowlRating) ? '–' : formatSquadRatingDisplay(p.bowlRating, ratingDp),
            ],
            real: [
              fmt(s.wicketsPerInnings),
              fmt(s.oversPerInnings),
              fmt(s.economy),
              fmt(s.bowlingAverage),
              careerSr > 0 ? fmt(careerSr) : '—',
            ],
            recent: ['—', '—', '—', '—', '—'],
          })
        }
      }
    }

    return out
  }, [teams, mode, scope, tournamentName, seasonYear, ratingDp])

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dirMul = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (sortKey === 'player') return a.name.localeCompare(b.name) * dirMul
      if (sortKey === 'team')
        return (a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name)) * dirMul
      let av = ''
      let bv = ''
      if (sortKey.startsWith('p')) {
        const i = Number(sortKey.slice(1))
        av = a.prepped[i] ?? ''
        bv = b.prepped[i] ?? ''
      } else if (sortKey.startsWith('rec')) {
        const i = Number(sortKey.slice(3))
        av = a.recent[i] ?? ''
        bv = b.recent[i] ?? ''
      } else {
        const i = Number(sortKey.slice(1))
        av = a.real[i] ?? ''
        bv = b.real[i] ?? ''
      }
      const an = parseLeading(av)
      const bn = parseLeading(bv)
      if (an != null && bn != null && an !== bn) return (an - bn) * dirMul
      if (an != null && bn == null) return -1
      if (an == null && bn != null) return 1
      return av.localeCompare(bv) * dirMul
    })
    return arr
  }, [rows, sortKey, sortDir])

  const visibleRows = useMemo(() => {
    if (teamFilter === 'all') return sorted
    return sorted.filter((r) => r.teamId === teamFilter)
  }, [sorted, teamFilter])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'player' || key === 'team' ? 'asc' : 'desc')
    }
  }

  function switchMode(m: 'batting' | 'bowling') {
    setMode(m)
    const heads = m === 'batting' ? 3 : 4
    setSortKey(('p' + (heads - 1)) as SortKey)
    setSortDir('desc')
    setTeamFilter('all')
  }

  return (
    <div className="tm-rankings-full dashboard-content">
      <div className="tournament-section-panel tm-rankings-full-panel">
        <div className="squad-section-header-row tm-rankings-full-toolbar">
          <button type="button" className="tm-btn tm-rankings-full-back" onClick={onBack}>
            ← Back to tournament
          </button>
          <h2 className="squad-section-title tm-rankings-full-title">Tournament player rankings</h2>
          <div className="squad-section-header-controls tm-rankings-full-controls">
            <label className="squad-hide-raw-control tm-rankings-team-filter">
              <span>Team</span>
              <select
                className="squad-rating-dp-select"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                aria-label="Filter rankings by team"
              >
                <option value="all">All teams ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="rankings-metric-bar squad-perf-metric-bar"
              role="tablist"
              aria-label="Rankings mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'batting'}
                className={
                  'squad-perf-mode-btn squad-perf-mode-btn--bat' +
                  (mode === 'batting' ? ' squad-perf-mode-btn--active' : '')
                }
                onClick={() => switchMode('batting')}
              >
                Batting
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'bowling'}
                className={
                  'squad-perf-mode-btn squad-perf-mode-btn--bowl' +
                  (mode === 'bowling' ? ' squad-perf-mode-btn--active' : '')
                }
                onClick={() => switchMode('bowling')}
              >
                Bowling
              </button>
            </div>
            <label className="squad-hide-raw-control">
              <span>Data</span>
              <select
                className="squad-rating-dp-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as SquadStatsScope)}
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
        <p className="squad-section-note tm-rankings-legend">
          <span className="tm-legend-swatch tm-legend-prepped" aria-hidden />
          Prepped = trader inputs (edit in squad)
          <span className="tm-legend-swatch tm-legend-real" aria-hidden />
          Plain = read-only real stats. Click any heading to sort. The squad icon jumps to that
          player in their team prep view.
        </p>

        <div className="teams-table-wrap tm-rankings-full-scroll">
          <table className="teams-table tm-rankings-full-table">
            <thead>
              <tr className="teams-table-head-row">
                <th className="teams-th-identity">#</th>
                <th
                  className="teams-th-identity teams-sortable"
                  title="Click to sort"
                  onClick={() => toggleSort('player')}
                >
                  Player
                  {sortKey === 'player' ? (
                    <span className="teams-sort-ind">{sortDir === 'desc' ? ' ▼' : ' ▲'}</span>
                  ) : null}
                </th>
                <th
                  className="teams-th-identity teams-sortable"
                  title="Click to sort"
                  onClick={() => toggleSort('team')}
                >
                  Team
                  {sortKey === 'team' ? (
                    <span className="teams-sort-ind">{sortDir === 'desc' ? ' ▼' : ' ▲'}</span>
                  ) : null}
                </th>
                <th colSpan={preppedHeads.length} className={grpClass}>
                  <span title="Trader inputs — edit in the squad table">Prepped ✎</span>
                </th>
                <th colSpan={realHeads.length} className="tm-rk-grp-real">
                  Real stats
                </th>
                <th colSpan={5} className="tm-rk-grp-recent">
                  Recent 5
                </th>
                <th className="teams-th-tbd" title="More fields coming soon">
                  TBD
                </th>
                <th className="teams-th-identity">
                  <span className="sr-only">Open in squad</span>
                </th>
              </tr>
              <tr className="teams-table-subrow">
                <th />
                <th />
                <th />
                {preppedHeads.map((h, i) => (
                  <SortSubHead
                    key={'ph' + h}
                    label={h}
                    sortKey={('p' + i) as SortKey}
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                  />
                ))}
                {realHeads.map((h, i) => (
                  <SortSubHead
                    key={'rh' + h + i}
                    label={h}
                    sortKey={('r' + i) as SortKey}
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                    title={
                      h === 'Avg pos'
                        ? 'Average batting position'
                        : h === 'SR' && mode === 'bowling'
                          ? 'Strike rate — balls per wicket (career)'
                          : undefined
                    }
                  />
                ))}
                {['1st', '2nd', '3rd', '4th', '5th'].map((h, i) => (
                  <SortSubHead
                    key={'rech' + h}
                    label={h}
                    sortKey={('rec' + i) as SortKey}
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                    title={
                      (mode === 'batting'
                        ? ['Most recent innings', '2nd most recent', '3rd most recent', '4th most recent', '5th most recent'][i]
                        : 'No recent bowling figures in dataset') + ' (* = not out)'
                    }
                  />
                ))}
                <th className="th-num teams-th-tbd">—</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r, i) => (
                <tr key={r.playerId + r.teamId}>
                  <td className="td-num tm-rankings-full-rank">{i + 1}</td>
                  <td className="td-name tm-rk-player" title={r.name}>{r.name}</td>
                  <td className="tm-rankings-full-team tm-rk-team" title={r.teamName}>
                    {r.teamName}
                  </td>
                  {r.prepped.map((c, j) =>
                    j === r.prepped.length - 1 ? (
                      <td
                        key={'p' + j}
                        className={
                          'td-num tm-rankings-rating tm-rk-prepped ' + ratingCellClass(r.ratingNum, c)
                        }
                        title={ratingTitle(r.ratingNum, c)}
                      >
                        {c}
                      </td>
                    ) : (
                      <td
                        key={'p' + j}
                        className="td-num tm-rk-prepped"
                        title="Trader input — edit in the squad table"
                      >
                        {c}
                      </td>
                    ),
                  )}
                  {r.real.map((c, j) => (
                    <td key={'r' + j} className="td-num tm-rk-real">
                      {c}
                    </td>
                  ))}
                  {r.recent.map((c, j) => (
                    <td
                      key={'rec' + j}
                      className="td-num tm-rk-recent"
                      title={recentTitle(mode, c)}
                    >
                      {mode === 'batting' ? (
                        <span className={milestoneClass(c)}>{c}</span>
                      ) : (
                        c
                      )}
                    </td>
                  ))}
                  <td className="td-num teams-td-tbd">—</td>
                  <td className="tm-rankings-full-action">
                    <button
                      type="button"
                      className="tm-btn tm-btn-sm tm-btn-icon"
                      title={'Open ' + r.name + ' in squad (' + r.teamName + ')'}
                      aria-label={'Open ' + r.name + ' in squad'}
                      onClick={() => onOpenPlayerInTeam({ teamId: r.teamId, playerId: r.playerId })}
                    >
                      ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="rankings-empty">No squad players in this tournament yet.</p>
          )}
          {sorted.length > 0 && visibleRows.length === 0 && (
            <p className="rankings-empty">No players match this team filter.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SortSubHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  title,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  title?: string
}) {
  const active = activeKey === sortKey
  return (
    <th
      className={'th-num teams-sortable tm-rk-sub-th' + (active ? ' teams-sorted' : '')}
      title={(title ? title + '. ' : '') + 'Click to sort'}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? <span className="teams-sort-ind">{dir === 'desc' ? ' ▼' : ' ▲'}</span> : null}
    </th>
  )
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function parseLeading(s: string): number | null {
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return Number.isFinite(n) ? n : null
}

/** Sign for colour: numeric rating first, then parsed display (same rules as squad table). */
function signedRating(v: number | null, display: string): number | null {
  if (v != null && Number.isFinite(v)) return v
  if (display === '–' || display === '—') return null
  const n = parseLeading(display.replace(/\u2212/g, '-'))
  return n
}

function ratingCellClass(v: number | null, display: string): string {
  const n = signedRating(v, display)
  if (n == null) return ''
  if (n > 0) return 'rating-pos'
  if (n < 0) return 'rating-neg'
  return 'tm-rk-rating-zero'
}

function ratingTitle(v: number | null, display: string): string {
  const n = signedRating(v, display)
  if (n == null) return 'No rating'
  if (n > 0) return `Rating ${display} — above par (trader input, edit in squad)`
  if (n < 0) return `Rating ${display} — below par (trader input, edit in squad)`
  return 'Rating 0 — at par (trader input, edit in squad)'
}

function recentTitle(mode: 'batting' | 'bowling', c: string): string | undefined {
  if (mode !== 'batting' || c === '—') return undefined
  const n = parseLeading(c)
  const bits: string[] = ['Innings score (* = not out)']
  if (n != null && n >= 100) bits.push('Hundred')
  else if (n != null && n >= 50) bits.push('Fifty')
  return bits.join('. ')
}

function milestoneClass(c: string): string | undefined {
  const n = parseLeading(c)
  if (n == null) return undefined
  if (n >= 100) return 'tm-recent-ton'
  if (n >= 50) return 'tm-recent-fifty'
  return undefined
}

function recentFive(profile: {
  recentInnings?: { score: number; notOut: boolean }[]
}): string[] {
  const out: string[] = ['—', '—', '—', '—', '—']
  const recent = (profile.recentInnings ?? []).slice(0, 5)
  recent.forEach((inn, i) => {
    out[i] = `${inn.score}${inn.notOut ? '*' : ''}`
  })
  return out
}
