import { SquadPlayer, makeSquadForTeam, normalizeBowlStats, MAX_TEAM_OVERS, calcWktsAndBowlAvg } from './squad'
import { calculateBowlRating } from './ratingBenchmarks'
import { TEAMS } from './teams'

interface StoredSquad {
  startingXI: SquadPlayer[]
  reserves: SquadPlayer[]
  groundId: string | null
}

const store: Record<string, StoredSquad> = {}

export function getStoredSquad(teamId: string): StoredSquad | null {
  const stored = store[teamId]
  if (!stored) return null
  const startingXI = capStartingXIOvers(stored.startingXI.map(normalizeBowlStats))
  const reserves = stored.reserves.map(normalizeBowlStats)
  return { ...stored, startingXI, reserves }
}

export function storeSquad(teamId: string, startingXI: SquadPlayer[], reserves: SquadPlayer[], groundId: string | null): void {
  store[teamId] = { startingXI: capStartingXIOvers(startingXI), reserves, groundId }
}

function capStartingXIOvers(players: SquadPlayer[]): SquadPlayer[] {
  const totalOvers = players.reduce((s, p) => s + p.overs, 0)
  if (totalOvers <= MAX_TEAM_OVERS || totalOvers <= 0) return players
  const scale = MAX_TEAM_OVERS / totalOvers
  return players.map((p) => {
    const overs = Math.round(p.overs * scale * 10) / 10
    const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, p.econ, p.bowlSr)
    const bowlRating = calculateBowlRating(p.econ, p.bowlSr, bowlAvg, overs)
    return { ...p, overs, wkts, bowlAvg, bowlRating }
  })
}

export function getSquadForTeam(teamId: string): { startingXI: SquadPlayer[]; reserves: SquadPlayer[] } {
  const stored = store[teamId]
  if (stored) {
    const startingXI = capStartingXIOvers(stored.startingXI.map(normalizeBowlStats))
    return {
      startingXI,
      reserves: stored.reserves.map(normalizeBowlStats),
    }
  }
  return makeSquadForTeam(teamId)
}

/** Teams with a saved squad in this session count as “prepped”. */
export function getTournamentPrepProgress(tournamentId: string): { prepped: number; total: number } {
  const teams = TEAMS[tournamentId] ?? []
  const total = teams.length
  let prepped = 0
  for (const t of teams) {
    if (getStoredSquad(t.id) !== null) prepped++
  }
  return { prepped, total }
}

export function getTeamBatRatingTotal(teamId: string): number {
  const { startingXI } = getSquadForTeam(teamId)
  return Math.round(startingXI.reduce((sum, p) => sum + p.batRating, 0) * 10) / 10
}

export function getTeamBowlRatingTotal(teamId: string): number {
  const { startingXI } = getSquadForTeam(teamId)
  const sum = startingXI.reduce(
    (s, p) => s + (Number.isNaN(p.bowlRating) ? 0 : p.bowlRating),
    0,
  )
  return Math.round(sum * 10) / 10
}

export interface RankedBatter {
  id: string
  name: string
  teamId: string
  teamName: string
  batRating: number
}

export function getTopRatedBatters(teams: { id: string; name: string }[], limit = 10): RankedBatter[] {
  const all: RankedBatter[] = []
  for (const team of teams) {
    const { startingXI } = getSquadForTeam(team.id)
    for (const p of startingXI) {
      all.push({ id: p.id, name: p.name, teamId: team.id, teamName: team.name, batRating: p.batRating })
    }
  }
  return all.sort((a, b) => b.batRating - a.batRating).slice(0, limit)
}

export interface RankedBowler {
  id: string
  name: string
  teamId: string
  teamName: string
  bowlingRating: number
}

export function getTopRatedBowlers(teams: { id: string; name: string }[], limit = 10): RankedBowler[] {
  const all: RankedBowler[] = []
  for (const team of teams) {
    const { startingXI } = getSquadForTeam(team.id)
    for (const p of startingXI) {
      if (!Number.isNaN(p.bowlRating)) {
        all.push({ id: p.id, name: p.name, teamId: team.id, teamName: team.name, bowlingRating: p.bowlRating })
      }
    }
  }
  return all.sort((a, b) => b.bowlingRating - a.bowlingRating).slice(0, limit)
}
