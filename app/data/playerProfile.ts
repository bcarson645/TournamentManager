export interface CareerBatting {
  matches: number
  runs: number
  average: number
  strikeRate: number
  hundreds: number
  fifties: number
  highScore: string
  innings: number
}

export interface CareerBowling {
  matches: number
  wickets: number
  average: number
  economy: number
  strikeRate: number
  bestFigures: string
  fiveWickets: number
  innings: number
}

export interface RecentInnings {
  score: number
  notOut: boolean
}

export interface TournamentRecord {
  season: string
  matches: number
  runs: number
  average: number
  strikeRate: number
  wickets: number
  bowlAvg: number
}

export interface PlayerProfile {
  photo?: string
  country: string
  careerBatting: CareerBatting
  careerBowling: CareerBowling
  recentInnings: RecentInnings[]
  tournamentHistory: TournamentRecord[]
}

export function makeDefaultProfile(): PlayerProfile {
  return {
    country: '',
    careerBatting: {
      matches: 0, runs: 0, average: 0, strikeRate: 0,
      hundreds: 0, fifties: 0, highScore: '0', innings: 0,
    },
    careerBowling: {
      matches: 0, wickets: 0, average: 0, economy: 0,
      strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0,
    },
    recentInnings: [],
    tournamentHistory: [],
  }
}
