'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { Team } from '../data/teams'
import { RankedBatter, RankedBowler } from '../data/squadStore'
import {
  SquadPlayer,
  BowlAction,
  makeSquadForTeam,
  calcWktsAndBowlAvg,
  MAX_IMPACT_SUBS,
  normalizeBowlStats,
  normalizeSquadPlayer,
} from '../data/squad'
import { CricketFormat, Gender } from '../data/tournaments'
import { ratingParPosForBatCalc } from '../data/squad'
import { calculateBatRating, calculateBowlRating } from '../data/ratingBenchmarks'
import { PlayerDbEntry } from '../data/playerDatabase'
import { GROUNDS, Ground } from '../data/grounds'
import SquadTable from './SquadTable'
import PlayerDetailPanel from './PlayerDetailPanel'
import { getTeamLogo, setTeamLogo as storeTeamLogo } from '../data/logoStore'
import { getStoredSquad, storeSquad } from '../data/squadStore'
import { getProfileForPlayer } from '../data/playerProfile'
import { useTournamentOptions } from '../hooks/useTournamentOptions'

function reapplySquadRatings(
  startingXI: SquadPlayer[],
  reserves: SquadPlayer[],
  impactSubs: SquadPlayer[],
  format: CricketFormat,
  gender: Gender,
): { startingXI: SquadPlayer[]; reserves: SquadPlayer[]; impactSubs: SquadPlayer[] } {
  const mapList = (list: SquadPlayer[], section: 'starting' | 'reserves' | 'impact') =>
    list.map((p, i) => {
      const n = normalizeBowlStats(normalizeSquadPlayer(p), format, gender)
      return {
        ...n,
        batRating: calculateBatRating(
          n.btCaz,
          n.raw,
          n.sr,
          ratingParPosForBatCalc(section, i, n),
          format,
          gender,
        ),
        bowlRating: calculateBowlRating(n.econ, n.bowlWpo, n.bowlAvg, n.overs, format, gender),
      }
    })
  return {
    startingXI: mapList(startingXI, 'starting'),
    reserves: mapList(reserves, 'reserves'),
    impactSubs: mapList(impactSubs, 'impact'),
  }
}

interface MatchResult {
  won: boolean
  teamScore: number
  teamWickets: number
  oppName: string
  oppScore: number
  oppWickets: number
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateAvgScore(teamId: string): number {
  const rand = seededRandom(hashStr(teamId + '-avg'))
  return Math.round(140 + rand() * 40)
}

function generateLast10(teamId: string): MatchResult[] {
  const rand = seededRandom(hashStr(teamId + '-results'))
  const opponents = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E',
    'Team F', 'Team G', 'Team H', 'Team I', 'Team J']
  return Array.from({ length: 10 }, (_, i) => {
    const won = rand() > 0.45
    const teamScore = Math.round(120 + rand() * 80)
    const teamWickets = Math.round(3 + rand() * 7)
    const oppScore = won
      ? Math.round(teamScore - 5 - rand() * 40)
      : Math.round(teamScore + 5 + rand() * 40)
    const oppWickets = Math.round(3 + rand() * 7)
    return {
      won,
      teamScore,
      teamWickets: Math.min(teamWickets, 10),
      oppName: opponents[i],
      oppScore,
      oppWickets: Math.min(oppWickets, 10),
    }
  })
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

const RIBBON_RANK_PAGE = 10

interface TeamManagerProps {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  team: Team
  tournamentName: string
  allTeams: Team[]
  teamBatRatings: Record<string, number>
  teamBowlingRatings: Record<string, number>
  /** Full tournament batting ladder (sliced in ribbon by page). */
  rankedBatters: RankedBatter[]
  /** Full tournament bowling ladder. */
  rankedBowlers: RankedBowler[]
}

export default function TeamManager({
  format,
  gender,
  tournamentId,
  team,
  tournamentName,
  allTeams,
  teamBatRatings,
  teamBowlingRatings,
  rankedBatters,
  rankedBowlers,
}: TeamManagerProps) {
  const { impactSubEnabled } = useTournamentOptions(tournamentId)
  const [teamLogo, setTeamLogo] = useState<string | null>(getTeamLogo(team.id) ?? team.logo ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [startingXI, setStartingXI] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    if (!stored) return makeSquadForTeam(team.id, format, gender).startingXI
    return reapplySquadRatings(
      stored.startingXI,
      stored.reserves,
      stored.impactSubs ?? [],
      format,
      gender,
    ).startingXI
  })
  const [reserves, setReserves] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    if (!stored) return makeSquadForTeam(team.id, format, gender).reserves
    return reapplySquadRatings(
      stored.startingXI,
      stored.reserves,
      stored.impactSubs ?? [],
      format,
      gender,
    ).reserves
  })
  const [impactSubs, setImpactSubs] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    if (!stored) return []
    return reapplySquadRatings(
      stored.startingXI,
      stored.reserves,
      stored.impactSubs ?? [],
      format,
      gender,
    ).impactSubs
  })

  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null)

  const [playerPanelWidth, setPlayerPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 400
    const raw = localStorage.getItem('tm-player-panel-w')
    const n = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(n) ? Math.min(640, Math.max(260, n)) : 400
  })

  const panelResizeRef = useRef<{ startX: number; startW: number } | null>(null)
  const playerPanelWidthRef = useRef(playerPanelWidth)
  playerPanelWidthRef.current = playerPanelWidth

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = panelResizeRef.current
      if (!drag) return
      const delta = drag.startX - e.clientX
      setPlayerPanelWidth(Math.min(640, Math.max(260, drag.startW + delta)))
    }
    function onUp() {
      if (panelResizeRef.current === null) return
      panelResizeRef.current = null
      setPlayerPanelWidth((w) => {
        localStorage.setItem('tm-player-panel-w', String(w))
        return w
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function handlePanelResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    panelResizeRef.current = { startX: e.clientX, startW: playerPanelWidthRef.current }
  }
  const [selectedGround, setSelectedGround] = useState<Ground | null>(() => {
    const stored = getStoredSquad(team.id)
    if (stored?.groundId) return GROUNDS.find((g) => g.id === stored.groundId) ?? null
    return null
  })
  const [groundSearch, setGroundSearch] = useState('')
  const [groundDropdownOpen, setGroundDropdownOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredSquad(team.id)
    if (stored) {
      const reapplied = reapplySquadRatings(
        stored.startingXI,
        stored.reserves,
        stored.impactSubs ?? [],
        format,
        gender,
      )
      setStartingXI(reapplied.startingXI)
      setReserves(reapplied.reserves)
      setImpactSubs(reapplied.impactSubs)
      setSelectedGround(stored.groundId ? GROUNDS.find((g) => g.id === stored.groundId) ?? null : null)
    } else {
      const squad = makeSquadForTeam(team.id, format, gender)
      setStartingXI(squad.startingXI)
      setReserves(squad.reserves)
      setImpactSubs([])
      setSelectedGround(null)
    }
    setSelectedPlayer(null)
    setTeamLogo(getTeamLogo(team.id) ?? team.logo ?? null)
    setGroundSearch('')
  }, [team.id, format, gender])

  const avgFirstInnings = useMemo(() => generateAvgScore(team.id), [team.id])
  const last10 = useMemo(() => generateLast10(team.id), [team.id])

  const filteredGrounds = useMemo(() => {
    const q = groundSearch.toLowerCase()
    if (q.length === 0) return GROUNDS.slice(0, 15)
    return GROUNDS.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q),
    ).slice(0, 15)
  }, [groundSearch])

  const [ribbonBatPage, setRibbonBatPage] = useState(0)
  const [ribbonBowlPage, setRibbonBowlPage] = useState(0)

  const currentSquadPlayerIds = useMemo(
    () => new Set([...startingXI, ...reserves, ...impactSubs].map((p) => p.id)),
    [startingXI, reserves, impactSubs],
  )

  /** Same as tournament table: XI batting sum, XI bowling sum, average of the two. */
  const ribbonTeamRatings = useMemo(() => {
    const bat = teamBatRatings[team.id] ?? 0
    const bowl = teamBowlingRatings[team.id] ?? 0
    return { bat, bowl, total: (bat + bowl) / 2 }
  }, [team.id, teamBatRatings, teamBowlingRatings])

  const ribbonBatTotalPages = Math.max(1, Math.ceil(rankedBatters.length / RIBBON_RANK_PAGE))
  const ribbonBowlTotalPages = Math.max(1, Math.ceil(rankedBowlers.length / RIBBON_RANK_PAGE))

  useEffect(() => {
    setRibbonBatPage((p) => Math.min(p, Math.max(0, ribbonBatTotalPages - 1)))
  }, [rankedBatters.length, ribbonBatTotalPages])

  useEffect(() => {
    setRibbonBowlPage((p) => Math.min(p, Math.max(0, ribbonBowlTotalPages - 1)))
  }, [rankedBowlers.length, ribbonBowlTotalPages])

  function handleUpdate(
    newStarting: SquadPlayer[],
    newReserves: SquadPlayer[],
    newImpact: SquadPlayer[],
  ) {
    setStartingXI(newStarting)
    setReserves(newReserves)
    setImpactSubs(newImpact)
    storeSquad(team.id, newStarting, newReserves, selectedGround?.id ?? null, newImpact)
  }

  function handleAddPlayer(dbEntry: PlayerDbEntry, target: 'reserves' | 'impact') {
    if (target === 'impact' && impactSubs.length >= MAX_IMPACT_SUBS) return
    const totalPlayers = startingXI.length + reserves.length + impactSubs.length
    const profile = getProfileForPlayer(dbEntry.name)
    const bat = profile.careerBatting
    const bowl = profile.careerBowling
    const btCaz = bat.average || 0
    const rawBase = bat.average ? Math.round(bat.average * 0.85 * 10) / 10 : 0
    const rawAdj = 0
    const raw = Math.round((rawBase + rawAdj) * 10) / 10
    const sr = bat.strikeRate ?? 0
    const econ = bowl.economy || 0
    const ballsPerWicket = bowl.strikeRate || 0
    const bowlWpo = ballsPerWicket > 0 ? 6 / ballsPerWicket : 0
    const overs = bowl.matches > 0 && bowl.wickets > 0 && ballsPerWicket > 0
      ? Math.min(4, Math.round((bowl.wickets * ballsPerWicket) / (6 * bowl.matches) * 10) / 10)
      : bowl.wickets > 0 ? 4 : 0
    const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, econ, bowlWpo)
    const bowlRating = calculateBowlRating(econ, bowlWpo, bowlAvg, overs, format, gender)
    const ratingParPosition = 11
    const newPlayer: SquadPlayer = {
      id: `${team.id}-p${totalPlayers + 1}`,
      playerId: dbEntry.id,
      name: dbEntry.name,
      btCaz,
      rawBase,
      rawAdj,
      raw,
      sr,
      fours: 0,
      sixes: 0,
      ratingParPosition,
      batRating: calculateBatRating(btCaz, raw, sr, ratingParPosition, format, gender),
      action: (dbEntry.role === 'BOWL' ? 'SEAM' : 'SEAM') as BowlAction,
      wkts,
      overs,
      econ,
      bowlWpo,
      bowlAvg,
      bowlRating,
      locked: false,
    }
    if (target === 'reserves') {
      const newReserves = [...reserves, newPlayer]
      setReserves(newReserves)
      storeSquad(team.id, startingXI, newReserves, selectedGround?.id ?? null, impactSubs)
    } else {
      const next = [...impactSubs, newPlayer]
      setImpactSubs(next)
      storeSquad(team.id, startingXI, reserves, selectedGround?.id ?? null, next)
    }
  }

  function handleLogoClick() {
    fileInputRef.current?.click()
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      storeTeamLogo(team.id, dataUrl)
      setTeamLogo(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleSelectGround(ground: Ground) {
    setSelectedGround(ground)
    setGroundSearch('')
    setGroundDropdownOpen(false)
    storeSquad(team.id, startingXI, reserves, ground.id, impactSubs)
  }

  return (
    <div className="team-manager">
      {/* Fixed ribbon */}
      <div className="tm-ribbon">
        {/* Left: team identity + factors + ground + form */}
        <div className="tm-ribbon-team">
          <div className="tm-ribbon-identity">
            <div className="team-logo-upload team-logo-upload-ribbon" onClick={handleLogoClick} title="Click to upload team logo">
              {teamLogo ? (
                <img src={teamLogo} alt="" className="tm-ribbon-logo" />
              ) : (
                <div className="tm-ribbon-logo-ph">
                  {team.name.charAt(0)}
                </div>
              )}
              <div className="team-logo-overlay">
                <span>✎</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="team-logo-input"
                onChange={handleLogoChange}
              />
            </div>
            <div className="tm-ribbon-identity-text">
              <div className="tm-ribbon-name-row">
                <h1 className="tm-ribbon-name">{team.name}</h1>
                <div className="tm-ribbon-factors" aria-label="Squad rating totals (Starting XI)">
                  <div className="factor-pill-sm factor-pill-inline factor-pill-ribbon">
                    <span className="factor-label-sm">Bat</span>
                    <span
                      className={
                        'factor-value-sm' +
                        (ribbonTeamRatings.bat > 0
                          ? ' rating-pos'
                          : ribbonTeamRatings.bat < 0
                            ? ' rating-neg'
                            : '')
                      }
                    >
                      {ribbonTeamRatings.bat.toFixed(1)}
                    </span>
                  </div>
                  <div className="factor-pill-sm factor-pill-inline factor-pill-ribbon">
                    <span className="factor-label-sm">Bowl</span>
                    <span
                      className={
                        'factor-value-sm' +
                        (ribbonTeamRatings.bowl > 0
                          ? ' rating-pos'
                          : ribbonTeamRatings.bowl < 0
                            ? ' rating-neg'
                            : '')
                      }
                    >
                      {ribbonTeamRatings.bowl.toFixed(1)}
                    </span>
                  </div>
                  <div className="factor-pill-sm factor-pill-inline factor-pill-ribbon factor-pill-sm-total">
                    <span className="factor-label-sm">Total</span>
                    <span className="factor-value-sm">{ribbonTeamRatings.total.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="tm-ribbon-tournament">{tournamentName}</div>
            </div>
          </div>

          {/* Home ground */}
          <div className="tm-ground">
            <div className="tm-ground-row">
              <span className="tm-ground-label">Home Ground</span>
              <span className="tm-ground-avg">Avg 1st Inn: {avgFirstInnings}</span>
            </div>
            <div className="tm-ground-selector">
              <input
                type="text"
                className="tm-ground-input"
                placeholder={selectedGround ? selectedGround.name : 'Search grounds...'}
                value={groundSearch}
                onChange={(e) => {
                  setGroundSearch(e.target.value)
                  setGroundDropdownOpen(true)
                }}
                onFocus={() => setGroundDropdownOpen(true)}
                onBlur={() => setTimeout(() => setGroundDropdownOpen(false), 200)}
              />
              {selectedGround && !groundSearch && (
                <div className="tm-ground-selected">
                  {selectedGround.name}, {selectedGround.city}
                </div>
              )}
              {groundDropdownOpen && filteredGrounds.length > 0 && (
                <ul className="tm-ground-dropdown">
                  {filteredGrounds.map((g) => (
                    <li
                      key={g.id}
                      className="tm-ground-option"
                      onMouseDown={() => handleSelectGround(g)}
                    >
                      <span className="tm-ground-option-name">{g.name}</span>
                      <span className="tm-ground-option-city">{g.city}, {g.country}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Last 10 results */}
          <div className="tm-form">
            <span className="tm-form-label">Last 10</span>
            <div className="tm-form-icons">
              {last10.map((r, i) => (
                <div key={i} className={`tm-form-icon ${r.won ? 'form-w' : 'form-l'}`}>
                  {r.won ? 'W' : 'L'}
                  <div className="tm-form-tooltip">
                    <div className="tm-form-tooltip-line">
                      {team.name}: {r.teamScore}/{r.teamWickets}
                    </div>
                    <div className="tm-form-tooltip-line">
                      {r.oppName}: {r.oppScore}/{r.oppWickets}
                    </div>
                    <div className="tm-form-tooltip-result">
                      {r.won ? 'Won' : 'Lost'} by {r.won
                        ? `${r.teamScore - r.oppScore} runs`
                        : `${r.oppScore - r.teamScore} runs`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Centre: tournament ratings table */}
        <div className="tm-ribbon-league">
          <div className="tm-ribbon-section-label">Tournament Ratings</div>
          <div className="tm-ribbon-league-scroll">
            <table className="tm-mini-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="mini-th-name">Team</th>
                  <th>Bat</th>
                  <th>Bowl</th>
                  <th className="mini-th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...allTeams]
                  .sort((a, b) => {
                    const totalA = ((teamBatRatings[a.id] ?? 0) + (teamBowlingRatings[a.id] ?? 0)) / 2
                    const totalB = ((teamBatRatings[b.id] ?? 0) + (teamBowlingRatings[b.id] ?? 0)) / 2
                    return totalB - totalA
                  })
                  .map((t, i) => {
                    const batVal = teamBatRatings[t.id] ?? 0
                    const bowlVal = teamBowlingRatings[t.id] ?? 0
                    const totalVal = (batVal + bowlVal) / 2
                    return (
                  <tr key={t.id} className={t.id === team.id ? 'mini-row-current' : ''}>
                    <td>{i + 1}</td>
                    <td className="mini-td-name">{t.name}</td>
                    <td className={batVal > 0 ? 'rating-pos' : batVal < 0 ? 'rating-neg' : ''}>{batVal.toFixed(1)}</td>
                    <td className={bowlVal > 0 ? 'rating-pos' : bowlVal < 0 ? 'rating-neg' : ''}>{bowlVal.toFixed(1)}</td>
                    <td className="mini-td-total">{totalVal.toFixed(1)}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: tournament batting & bowling ladders (paged) */}
        <div className="tm-ribbon-rankings">
          <div className="tm-ribbon-rank-col">
            <div className="tm-ribbon-section-label">Tournament Batting</div>
            <div className="tm-ribbon-rank-scroll">
              {rankedBatters.length === 0 ? (
                <div className="tm-ribbon-rank-empty">No ratings yet</div>
              ) : (
                <>
                  {rankedBatters.length > RIBBON_RANK_PAGE && (
                    <div className="tm-rank-dots" role="tablist" aria-label="Batting rank pages">
                      {Array.from({ length: ribbonBatTotalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={ribbonBatPage === i}
                          aria-label={'Batting page ' + (i + 1) + ' of ' + ribbonBatTotalPages}
                          className={'tm-rank-dot' + (ribbonBatPage === i ? ' tm-rank-dot-active' : '')}
                          onClick={() => setRibbonBatPage(i)}
                        />
                      ))}
                    </div>
                  )}
                  <ol className="tm-mini-rank-list">
                    {rankedBatters
                      .slice(
                        ribbonBatPage * RIBBON_RANK_PAGE,
                        ribbonBatPage * RIBBON_RANK_PAGE + RIBBON_RANK_PAGE,
                      )
                      .map((p, i) => {
                        const rank = ribbonBatPage * RIBBON_RANK_PAGE + i + 1
                        const isSquad = currentSquadPlayerIds.has(p.id)
                        return (
                          <li key={p.id} className={isSquad ? 'mini-rank-row-current' : undefined}>
                            <span className="mini-rank-num">{rank}</span>
                            <span className="mini-rank-name">{p.name}</span>
                            <span
                              className={`mini-rank-val ${
                                p.batRating > 0 ? 'rating-pos' : p.batRating < 0 ? 'rating-neg' : ''
                              }`}
                            >
                              {p.batRating.toFixed(1)}
                            </span>
                          </li>
                        )
                      })}
                  </ol>
                </>
              )}
            </div>
          </div>
          <div className="tm-ribbon-rank-col">
            <div className="tm-ribbon-section-label">Tournament Bowling</div>
            <div className="tm-ribbon-rank-scroll">
              {rankedBowlers.length === 0 ? (
                <div className="tm-ribbon-rank-empty">No ratings yet</div>
              ) : (
                <>
                  {rankedBowlers.length > RIBBON_RANK_PAGE && (
                    <div className="tm-rank-dots" role="tablist" aria-label="Bowling rank pages">
                      {Array.from({ length: ribbonBowlTotalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={ribbonBowlPage === i}
                          aria-label={'Bowling page ' + (i + 1) + ' of ' + ribbonBowlTotalPages}
                          className={'tm-rank-dot' + (ribbonBowlPage === i ? ' tm-rank-dot-active' : '')}
                          onClick={() => setRibbonBowlPage(i)}
                        />
                      ))}
                    </div>
                  )}
                  <ol className="tm-mini-rank-list">
                    {rankedBowlers
                      .slice(
                        ribbonBowlPage * RIBBON_RANK_PAGE,
                        ribbonBowlPage * RIBBON_RANK_PAGE + RIBBON_RANK_PAGE,
                      )
                      .map((p, i) => {
                        const rank = ribbonBowlPage * RIBBON_RANK_PAGE + i + 1
                        const isSquad = currentSquadPlayerIds.has(p.id)
                        return (
                          <li key={p.id} className={isSquad ? 'mini-rank-row-current' : undefined}>
                            <span className="mini-rank-num">{rank}</span>
                            <span className="mini-rank-name">{p.name}</span>
                            <span
                              className={`mini-rank-val ${
                                p.bowlingRating > 0
                                  ? 'rating-pos'
                                  : p.bowlingRating < 0
                                    ? 'rating-neg'
                                    : ''
                              }`}
                            >
                              {p.bowlingRating.toFixed(1)}
                            </span>
                          </li>
                        )
                      })}
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable squad body + player stats panel (always visible) */}
      <div className="tm-body-layout tm-body-with-panel">
        <div className="tm-squad-body">
          <SquadTable
            cricketFormat={format}
            gender={gender}
            impactSubEnabled={impactSubEnabled}
            startingXI={startingXI}
            reserves={reserves}
            impactSubs={impactSubs}
            onUpdate={handleUpdate}
            selectedPlayerId={selectedPlayer?.id ?? null}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onAddPlayer={handleAddPlayer}
          />
        </div>
        <div
          className="tm-panel-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize player stats panel"
          onMouseDown={handlePanelResizeStart}
        />
        <PlayerDetailPanel
          player={selectedPlayer}
          tournamentName={tournamentName}
          panelWidth={playerPanelWidth}
          onClose={() => setSelectedPlayer(null)}
        />
      </div>
    </div>
  )
}
