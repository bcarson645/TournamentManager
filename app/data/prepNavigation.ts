import type { CricketFormat, Gender } from './tournaments'

export type PrepNavigationTarget = {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  teamId?: string
}

export type PrepTeamsTarget = {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  tournamentName: string
  country?: string
}
