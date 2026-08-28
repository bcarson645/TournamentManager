import { getTeamsByTournament } from "./teams"
import { getSquadForTeam } from "./squadStore"
import type { SquadPlayer } from "./squad"
import { getTournamentLiveData } from "./tournamentLiveData"

export type PlayerHand = "rhb" | "lhb" | "rf" | "lf"

export interface PerformancePlayer {
  id: string
  name: string
  teamCode: string
  hand?: PlayerHand
  primaryStat: number
  innings: number
  average: number
  /** Tournament Manager squad rating (batting or bowling depending on list). */
  rating?: number
}

export interface TournamentPerformanceData {
  runScorers: PerformancePlayer[]
  wicketTakers: PerformancePlayer[]
  strikeRates: PerformancePlayer[]
  economies: PerformancePlayer[]
}

function teamCode(teamId: string, teamCodes: Record<string, string>): string {
  return teamCodes[teamId] ?? teamId.slice(0, 3).toUpperCase()
}

function collectPlayers(tournamentId: string): Array<SquadPlayer & { teamId: string; teamName: string }> {
  const teams = getTeamsByTournament(tournamentId)
  const out: Array<SquadPlayer & { teamId: string; teamName: string }> = []
  for (const team of teams) {
    const squad = getSquadForTeam(team.id)
    for (const p of squad.startingXI) {
      out.push({ ...p, teamId: team.id, teamName: team.name })
    }
  }
  return out
}

function synthFromSquad(tournamentId: string): TournamentPerformanceData {
  const live = getTournamentLiveData(tournamentId)
  const codes = live?.teamCodes ?? {}
  const players = collectPlayers(tournamentId)

  const runScorers = [...players]
    .map((p) => ({
      id: p.id,
      name: p.name,
      teamCode: teamCode(p.teamId, codes),
      hand: "rhb" as PlayerHand,
      primaryStat: Math.max(1, Math.round(p.batRating * 48 + p.raw * 1.5)),
      innings: Math.max(1, Math.round(p.batRating * 0.9)),
      average: Math.round((p.raw || p.batRating * 2) * 10) / 10,
      rating: Number.isFinite(p.batRating) ? p.batRating : undefined,
    }))
    .sort((a, b) => b.primaryStat - a.primaryStat)

  const wicketTakers = [...players]
    .map((p) => ({
      id: p.id + "-bowl",
      name: p.name,
      teamCode: teamCode(p.teamId, codes),
      hand: "rf" as PlayerHand,
      primaryStat: Math.max(0, Math.round(p.wkts * 3 + p.bowlRating * 2.2)),
      innings: Math.max(1, Math.round(p.bowlRating * 0.85)),
      average: p.bowlAvg > 0 ? p.bowlAvg : Math.round(p.bowlRating * 4.2 * 10) / 10,
      rating: Number.isFinite(p.bowlRating) ? p.bowlRating : undefined,
    }))
    .sort((a, b) => b.primaryStat - a.primaryStat)

  const strikeRates = [...players]
    .filter((p) => p.sr > 0)
    .map((p) => ({
      id: p.id + "-sr",
      name: p.name,
      teamCode: teamCode(p.teamId, codes),
      hand: "rhb" as PlayerHand,
      primaryStat: Math.round(p.sr * 100 * 10) / 10,
      innings: Math.max(1, Math.round(p.batRating * 0.75)),
      average: Math.round((p.raw || 20) * 10) / 10,
    }))
    .sort((a, b) => b.primaryStat - a.primaryStat)

  const economies = [...players]
    .filter((p) => p.econ > 0)
    .map((p) => ({
      id: p.id + "-econ",
      name: p.name,
      teamCode: teamCode(p.teamId, codes),
      hand: "rf" as PlayerHand,
      primaryStat: Math.round(p.econ * 100) / 100,
      innings: Math.max(1, Math.round(p.bowlRating * 0.8)),
      average: p.bowlAvg > 0 ? p.bowlAvg : Math.round(p.bowlRating * 5 * 10) / 10,
    }))
    .sort((a, b) => a.primaryStat - b.primaryStat)

  return {
    runScorers: runScorers.slice(0, 10),
    wicketTakers: wicketTakers.slice(0, 10),
    strikeRates,
    economies,
  }
}

const ETPL_PERFORMANCE: TournamentPerformanceData = {
  runScorers: [
    { id: "etpl-rs1", name: "Kamil Pooran", teamCode: "RTD", hand: "rhb", primaryStat: 193, innings: 5, average: 38.6 },
    { id: "etpl-rs2", name: "Rovman Powell", teamCode: "BLW", hand: "rhb", primaryStat: 187, innings: 5, average: 37.4 },
    { id: "etpl-rs3", name: "Andre Russell", teamCode: "AMF", hand: "rhb", primaryStat: 143, innings: 4, average: 35.75 },
    { id: "etpl-rs4", name: "Paul Stirling", teamCode: "DBG", hand: "rhb", primaryStat: 128, innings: 5, average: 25.6 },
    { id: "etpl-rs5", name: "George Munsey", teamCode: "GLC", hand: "lhb", primaryStat: 121, innings: 5, average: 24.2 },
    { id: "etpl-rs6", name: "Richie Berrington", teamCode: "ECR", hand: "rhb", primaryStat: 109, innings: 4, average: 27.25 },
    { id: "etpl-rs7", name: "Colin Ackermann", teamCode: "GLC", hand: "rhb", primaryStat: 98, innings: 5, average: 19.6 },
    { id: "etpl-rs8", name: "Josh Little", teamCode: "DBG", hand: "lhb", primaryStat: 87, innings: 4, average: 21.75 },
    { id: "etpl-rs9", name: "Chris Lynn", teamCode: "ECR", hand: "rhb", primaryStat: 82, innings: 3, average: 27.33 },
    { id: "etpl-rs10", name: "Max O'Dowd", teamCode: "AMF", hand: "rhb", primaryStat: 76, innings: 4, average: 19.0 },
  ],
  wicketTakers: [
    { id: "etpl-wk1", name: "Matthew Forde", teamCode: "RTD", hand: "rf", primaryStat: 13, innings: 5, average: 11.08 },
    { id: "etpl-wk2", name: "Roston Chase", teamCode: "BLW", hand: "rf", primaryStat: 10, innings: 5, average: 12.5 },
    { id: "etpl-wk3", name: "Alzarri Joseph", teamCode: "AMF", hand: "rf", primaryStat: 10, innings: 4, average: 10.8 },
    { id: "etpl-wk4", name: "Mark Adair", teamCode: "DBG", hand: "rf", primaryStat: 9, innings: 5, average: 13.44 },
    { id: "etpl-wk5", name: "Chris Sole", teamCode: "ECR", hand: "rf", primaryStat: 8, innings: 4, average: 14.25 },
    { id: "etpl-wk6", name: "Ruaidhri Smith", teamCode: "GLC", hand: "rf", primaryStat: 7, innings: 5, average: 16.71 },
    { id: "etpl-wk7", name: "Josh Little", teamCode: "DBG", hand: "rf", primaryStat: 7, innings: 5, average: 15.0 },
    { id: "etpl-wk8", name: "Brad Wheal", teamCode: "ECR", hand: "rf", primaryStat: 6, innings: 4, average: 16.5 },
    { id: "etpl-wk9", name: "Fred Klaassen", teamCode: "AMF", hand: "lf", primaryStat: 6, innings: 5, average: 18.0 },
    { id: "etpl-wk10", name: "Colin Ackermann", teamCode: "GLC", hand: "rf", primaryStat: 5, innings: 4, average: 19.2 },
  ],
  strikeRates: [
    { id: "etpl-sr1", name: "Shimron Hetmyer", teamCode: "AMF", hand: "lhb", primaryStat: 234.37, innings: 4, average: 41.5 },
    { id: "etpl-sr2", name: "Obus Pienaar", teamCode: "BLW", hand: "rhb", primaryStat: 198.2, innings: 3, average: 36.0 },
    { id: "etpl-sr3", name: "Quentin Sampson", teamCode: "RTD", hand: "rhb", primaryStat: 185.5, innings: 4, average: 32.25 },
    { id: "etpl-sr4", name: "Lewis Gregory", teamCode: "DBG", hand: "rhb", primaryStat: 172.0, innings: 5, average: 28.4 },
    { id: "etpl-sr5", name: "Michael Jones", teamCode: "ECR", hand: "rhb", primaryStat: 168.4, innings: 4, average: 30.5 },
    { id: "etpl-sr6", name: "Richie Berrington", teamCode: "GLC", hand: "rhb", primaryStat: 161.2, innings: 5, average: 27.2 },
    { id: "etpl-sr7", name: "Andre Russell", teamCode: "AMF", hand: "rhb", primaryStat: 158.6, innings: 4, average: 35.75 },
    { id: "etpl-sr8", name: "Rovman Powell", teamCode: "BLW", hand: "rhb", primaryStat: 152.3, innings: 5, average: 37.4 },
    { id: "etpl-sr9", name: "Colin Ackermann", teamCode: "GLC", hand: "rhb", primaryStat: 149.8, innings: 5, average: 19.6 },
    { id: "etpl-sr10", name: "Paul Stirling", teamCode: "DBG", hand: "rhb", primaryStat: 145.1, innings: 5, average: 25.6 },
  ],
  economies: [
    { id: "etpl-ec1", name: "Shadab Khan", teamCode: "AMF", hand: "rf", primaryStat: 4.42, innings: 5, average: 12.8 },
    { id: "etpl-ec2", name: "Sunil Narine", teamCode: "RTD", hand: "rf", primaryStat: 4.85, innings: 4, average: 11.5 },
    { id: "etpl-ec3", name: "Khary Pierre", teamCode: "BLW", hand: "lf", primaryStat: 5.12, innings: 5, average: 14.2 },
    { id: "etpl-ec4", name: "Mark Watt", teamCode: "ECR", hand: "lf", primaryStat: 5.35, innings: 4, average: 15.6 },
    { id: "etpl-ec5", name: "Ben White", teamCode: "DBG", hand: "rf", primaryStat: 5.58, innings: 5, average: 16.4 },
    { id: "etpl-ec6", name: "Safyaan Sharif", teamCode: "GLC", hand: "rf", primaryStat: 5.72, innings: 4, average: 17.1 },
    { id: "etpl-ec7", name: "Matthew Forde", teamCode: "RTD", hand: "rf", primaryStat: 5.88, innings: 5, average: 11.08 },
    { id: "etpl-ec8", name: "Roston Chase", teamCode: "BLW", hand: "rf", primaryStat: 6.05, innings: 5, average: 12.5 },
    { id: "etpl-ec9", name: "Alzarri Joseph", teamCode: "AMF", hand: "rf", primaryStat: 6.22, innings: 4, average: 10.8 },
    { id: "etpl-ec10", name: "Josh Little", teamCode: "DBG", hand: "rf", primaryStat: 6.45, innings: 5, average: 15.0 },
  ],
}

const PRESET: Partial<Record<string, TournamentPerformanceData>> = {
  "t20-m-etpl": ETPL_PERFORMANCE,
}

export function getTournamentPerformanceData(tournamentId: string): TournamentPerformanceData {
  return PRESET[tournamentId] ?? synthFromSquad(tournamentId)
}
