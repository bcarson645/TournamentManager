'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { Team } from '../data/teams'
import { RankedBatter } from '../data/squadStore'
import { SquadPlayer, BowlAction, makeSquadForTeam, calcWktsAndBowlAvg } from '../data/squad'
import { calculateBowlRating } from '../data/ratingBenchmarks'
import { PlayerDbEntry } from '../data/playerDatabase'
import { GROUNDS, Ground } from '../data/grounds'
import SquadTable from './SquadTable'
import PlayerDetailPanel from './PlayerDetailPanel'
import { getTeamLogo, setTeamLogo as storeTeamLogo } from '../data/logoStore'
import { getStoredSquad, storeSquad } from '../data/squadStore'
import { getProfileForPlayer } from '../data/playerProfile'

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

interface TeamManagerProps {
  team: Team
  tournamentName: string
  allTeams: Team[]
  teamBatRatings: Record<string, number>
  teamBowlingRatings: Record<string, number>
  topBatters: RankedBatter[]
  topBowlers: { id: string; name: string; bowlingRating: number }[]
}

export default function TeamManager({
  team,
  tournamentName,
  allTeams,
  teamBatRatings,
  teamBowlingRatings,
  topBatters,
  topBowlers,
}: TeamManagerProps) {
  const [teamLogo, setTeamLogo] = useState<string | null>(getTeamLogo(team.id) ?? team.logo ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [startingXI, setStartingXI] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    return stored ? stored.startingXI : makeSquadForTeam(team.id).startingXI
  })
  const [reserves, setReserves] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    return stored ? stored.reserves : makeSquadForTeam(team.id).reserves
  })

  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null)
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
      setStartingXI(stored.startingXI)
      setReserves(stored.reserves)
      setSelectedGround(stored.groundId ? GROUNDS.find((g) => g.id === stored.groundId) ?? null : null)
    } else {
      const squad = makeSquadForTeam(team.id)
      setStartingXI(squad.startingXI)
      setReserves(squad.reserves)
      setSelectedGround(null)
    }
    setSelectedPlayer(null)
    setTeamLogo(getTeamLogo(team.id) ?? team.logo ?? null)
    setGroundSearch('')
  }, [team.id])

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

  function handleUpdate(newStarting: SquadPlayer[], newReserves: SquadPlayer[]) {
    setStartingXI(newStarting)
    setReserves(newReserves)
    storeSquad(team.id, newStarting, newReserves, selectedGround?.id ?? null)
  }

  function handleAddPlayer(name: string, dbEntry: PlayerDbEntry) {
    const totalPlayers = startingXI.length + reserves.length
    const profile = getProfileForPlayer(dbEntry.name)
    const bowl = profile.careerBowling
    const econ = bowl.economy || 0
    const bowlSr = bowl.strikeRate || 0
    const overs = bowl.matches > 0 && bowl.wickets > 0 && bowlSr > 0
      ? Math.min(4, Math.round((bowl.wickets * bowlSr) / (6 * bowl.matches) * 10) / 10)
      : bowl.wickets > 0 ? 4 : 0
    const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, econ, bowlSr)
    const bowlRating = calculateBowlRating(econ, bowlSr, bowlAvg, overs)

    const newPlayer: SquadPlayer = {
      id: `${team.id}-p${totalPlayers + 1}`,
      playerId: dbEntry.id,
      name: dbEntry.name,
      btCaz: 0, raw: 0, sr: 0, fours: 0, sixes: 0, batRating: 0,
      action: (dbEntry.role === 'BOWL' ? 'SEAM' : 'SEAM') as BowlAction,
      wkts, overs, econ, bowlSr, bowlAvg, bowlRating,
      locked: false,
    }
    const newReserves = [...reserves, newPlayer]
    setReserves(newReserves)
    storeSquad(team.id, startingXI, newReserves, selectedGround?.id ?? null)
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
    storeSquad(team.id, startingXI, reserves, ground.id)
  }

  return (
    <div className="team-manager">
      {/* Fixed ribbon */}
      <div className="tm-ribbon">
        {/* Left: team identity + factors + ground + form */}
        <div className="tm-ribbon-team">
          <div className="tm-ribbon-identity">
            <div className="team-logo-upload team-logo-upload-sm" onClick={handleLogoClick} title="Click to upload team logo">
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
            <div>
              <div className="tm-ribbon-name">{team.name}</div>
              <div className="tm-ribbon-tournament">{tournamentName}</div>
            </div>
          </div>

          <div className="tm-ribbon-factors">
            <div className="factor-pill-sm">
              <span className="factor-label-sm">Bat</span>
              <span className="factor-value-sm">{team.battingFactor.toFixed(1)}</span>
            </div>
            <div className="factor-pill-sm">
              <span className="factor-label-sm">Bowl</span>
              <span className="factor-value-sm">{team.bowlingFactor.toFixed(1)}</span>
            </div>
            <div className="factor-pill-sm factor-pill-sm-total">
              <span className="factor-label-sm">Total</span>
              <span className="factor-value-sm">{team.totalFactor.toFixed(1)}</span>
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

        {/* Right: top 10 batting & bowling */}
        <div className="tm-ribbon-rankings">
          <div className="tm-ribbon-rank-col">
            <div className="tm-ribbon-section-label">Top 10 Batting</div>
            <div className="tm-ribbon-rank-scroll">
              {topBatters.length === 0 ? (
                <div className="tm-ribbon-rank-empty">No ratings yet</div>
              ) : (
                <ol className="tm-mini-rank-list">
                  {topBatters.slice(0, 10).map((p, i) => (
                    <li key={p.id}>
                      <span className="mini-rank-num">{i + 1}</span>
                      <span className="mini-rank-name">{p.name}</span>
                      <span className={`mini-rank-val ${p.batRating > 0 ? 'rating-pos' : p.batRating < 0 ? 'rating-neg' : ''}`}>{p.batRating.toFixed(1)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <div className="tm-ribbon-rank-col">
            <div className="tm-ribbon-section-label">Top 10 Bowling</div>
            <div className="tm-ribbon-rank-scroll">
              {topBowlers.length === 0 ? (
                <div className="tm-ribbon-rank-empty">No ratings yet</div>
              ) : (
                <ol className="tm-mini-rank-list">
                  {topBowlers.slice(0, 10).map((p, i) => (
                    <li key={p.id}>
                      <span className="mini-rank-num">{i + 1}</span>
                      <span className="mini-rank-name">{p.name}</span>
                      <span className={`mini-rank-val ${p.bowlingRating > 0 ? 'rating-pos' : p.bowlingRating < 0 ? 'rating-neg' : ''}`}>{p.bowlingRating.toFixed(1)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable squad body + optional player panel */}
      <div className={`tm-body-layout ${selectedPlayer ? 'tm-body-with-panel' : ''}`}>
        <div className="tm-squad-body">
          <SquadTable
            startingXI={startingXI}
            reserves={reserves}
            onUpdate={handleUpdate}
            selectedPlayerId={selectedPlayer?.id ?? null}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onAddPlayer={handleAddPlayer}
          />
        </div>
        {selectedPlayer && (
          <PlayerDetailPanel
            player={selectedPlayer}
            tournamentName={tournamentName}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </div>
    </div>
  )
}
