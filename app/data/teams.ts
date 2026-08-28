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
  // Men's T20 — IPL (India)
  't20-m-ipl': makeTeams('ipl', [
    'Chennai Super Kings',
    'Delhi Capitals',
    'Gujarat Titans',
    'Kolkata Knight Riders',
    'Lucknow Super Giants',
    'Mumbai Indians',
    'Punjab Kings',
    'Rajasthan Royals',
    'Royal Challengers Bengaluru',
    'Sunrisers Hyderabad',
  ]),

  // Men's T20 — PSL (Pakistan) — 2027 schedule id
  'sched-2027-psl': makeTeams('psl', [
    'Islamabad United',
    'Karachi Kings',
    'Lahore Qalandars',
    'Multan Sultans',
    'Peshawar Zalmi',
    'Quetta Gladiators',
  ]),

  // Men's T20 — SA20 (South Africa)
  't20-m-sa': makeTeams('sa20', [
    "Durban's Super Giants",
    'Joburg Super Kings',
    'MI Cape Town',
    'Paarl Royals',
    'Pretoria Capitals',
    'Sunrisers Eastern Cape',
  ]),

  // Men's T20 — ILT20 (UAE)
  'sched-2027-ilt20': makeTeams('ilt20', [
    'Abu Dhabi Knight Riders',
    'Desert Vipers',
    'Dubai Capitals',
    'Gulf Giants',
    'MI Emirates',
    'Sharjah Warriorz',
  ]),

  // Men's T20 — BBL (Australia)
  't20-m-bbl': makeTeams('bbl', [
    'Adelaide Strikers',
    'Brisbane Heat',
    'Hobart Hurricanes',
    'Melbourne Renegades',
    'Melbourne Stars',
    'Perth Scorchers',
    'Sydney Sixers',
    'Sydney Thunder',
  ]),

  // Men's T20 — CPL (Caribbean)
  't20-m-cpl': makeTeams('cpl', [
    'Barbados Royals',
    'Guyana Amazon Warriors',
    'St Kitts & Nevis Patriots',
    'Saint Lucia Kings',
    'Trinbago Knight Riders',
    'Antigua & Barbuda Falcons',
  ]),

  // Men's T20 — The Hundred (England & Wales)
  't20-m-hundred': makeTeams('hundred', [
    'Birmingham Phoenix',
    'London Spirit',
    'Manchester Originals',
    'Northern Superchargers',
    'Oval Invincibles',
    'Southern Brave',
    'Trent Rockets',
    'Welsh Fire',
  ]),

  // Men's T20 — MLC (USA)
  'sched-2027-mlc': makeTeams('mlc', [
    'Los Angeles Knight Riders',
    'MI New York',
    'San Francisco Unicorns',
    'Seattle Orcas',
    'Texas Super Kings',
    'Washington Freedom',
  ]),

  // Men's T20 — LPL (Sri Lanka)
  'sched-2027-lpl': makeTeams('lpl', [
    'B-Love Kandy',
    'Colombo Strikers',
    'Dambulla Sixers',
    'Galle Marvels',
    'Jaffna Kings',
  ]),

  // Men's T20 — BPL (Bangladesh)
  'sched-2027-bpl': makeTeams('bpl', [
    'Chattogram Challengers',
    'Comilla Victorians',
    'Dhaka Capitals',
    'Durbar Rajshahi',
    'Fortune Barishal',
    'Khulna Tigers',
    'Rangpur Riders',
    'Sylhet Strikers',
  ]),

  // Men's T20 — TNPL (India)
  'sched-2027-tnpl': makeTeams('tnpl', [
    'Chepauk Super Gillies',
    'Dindigul Dragons',
    'IDream Tiruppur Tamizhans',
    'Lyca Kovai Kings',
    'Nellai Royal Kings',
    'Salem Spartans',
    'Siechem Madurai Panthers',
    'Trichy Grand Cholas',
  ]),

  // Men's T20 — European T20 Premier League
  't20-m-etpl': makeTeams('etpl', [
    'Amsterdam Flames',
    'Belfast Wolves',
    'Glasgow Cosmic',
    'Rotterdam Dockers',
    'Dublin Guardians',
    'Edinburgh Castle Rockers',
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
