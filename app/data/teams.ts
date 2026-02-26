import { CricketFormat, Gender } from './tournaments'

export interface Player {
  id: string
  name: string
  teamId: string
  battingRating: number
  bowlingRating: number
}

export interface Team {
  id: string
  name: string
  logo?: string
  battingFactor: number
  bowlingFactor: number
  totalFactor: number
  players: Player[]
}

function makeTeam(tournamentPrefix: string, name: string): Team {
  const id = `${tournamentPrefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return { id, name, battingFactor: 0, bowlingFactor: 0, totalFactor: 0, players: [] }
}

function makeTeams(tournamentPrefix: string, names: string[]): Team[] {
  return names.map((n) => makeTeam(tournamentPrefix, n))
}

export const TEAMS: Record<string, Team[]> = {
  // Men's T20 — IPL
  't20-m-ipl': makeTeams('ipl', [
    'Chennai Super Kings', 'Delhi Capitals', 'Gujarat Titans',
    'Kolkata Knight Riders', 'Lucknow Super Giants', 'Mumbai Indians',
    'Punjab Kings', 'Rajasthan Royals', 'Royal Challengers Bengaluru',
    'Sunrisers Hyderabad',
  ]),

  // Men's T20 — The Hundred
  't20-m-hundred': makeTeams('hundred', [
    'Birmingham Phoenix', 'London Spirit', 'Manchester Originals',
    'Northern Superchargers', 'Oval Invincibles', 'Southern Brave',
    'Trent Rockets', 'Welsh Fire',
  ]),

  // Men's T20 — BBL
  't20-m-bbl': makeTeams('bbl', [
    'Adelaide Strikers', 'Brisbane Heat', 'Hobart Hurricanes',
    'Melbourne Renegades', 'Melbourne Stars', 'Perth Scorchers',
    'Sydney Sixers', 'Sydney Thunder',
  ]),

  // Men's T20 — SA20
  't20-m-sa': makeTeams('sa20', [
    "Durban's Super Giants", 'Joburg Super Kings', 'MI Cape Town',
    'Paarl Royals', 'Pretoria Capitals', 'Sunrisers Eastern Cape',
  ]),

  // Men's T20 — The Blast
  't20-m-blast': makeTeams('blast', [
    'Derbyshire Falcons', 'Durham', 'Lancashire Lightning',
    'Leicestershire Foxes', 'Notts Outlaws', 'Yorkshire',
    'Glamorgan', 'Gloucestershire', 'Northamptonshire Steelbacks',
    'Somerset', 'Warwickshire Bears', 'Worcestershire Rapids',
    'Essex', 'Hampshire Hawks', 'Kent Spitfires',
    'Middlesex', 'Surrey', 'Sussex Sharks',
  ]),
}

/**
 * Helper: get teams for a tournament, sorted by totalFactor descending.
 */
export function getTeamsByTournament(tournamentId: string): Team[] {
  const teams = TEAMS[tournamentId] ?? []
  return [...teams].sort((a, b) => b.totalFactor - a.totalFactor)
}

/**
 * Helper: get all players from a tournament's teams.
 */
export function getPlayersByTournament(tournamentId: string): Player[] {
  const teams = TEAMS[tournamentId] ?? []
  return teams.flatMap((t) => t.players)
}

/**
 * Top N players by batting rating for a tournament.
 */
export function getTopBatters(tournamentId: string, limit = 10): Player[] {
  return getPlayersByTournament(tournamentId)
    .sort((a, b) => b.battingRating - a.battingRating)
    .slice(0, limit)
}

/**
 * Top N players by bowling rating for a tournament.
 */
export function getTopBowlers(tournamentId: string, limit = 10): Player[] {
  return getPlayersByTournament(tournamentId)
    .sort((a, b) => b.bowlingRating - a.bowlingRating)
    .slice(0, limit)
}
