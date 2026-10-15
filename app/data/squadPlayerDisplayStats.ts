import type { SquadPlayer } from './squad'
import { type PlayerProfile, type TournamentRecord } from './playerProfile'
import { profileForSquadPlayer as profileForSquadPlayerBase } from './squadProfileFallback'

export type SquadStatsScope = 'recent' | 'tournament' | 'career'

export interface SquadPlayerBatDisplay {
  average: number
  strikeRate: number
  form: number
  avgPosition: number
}

export interface SquadPlayerBowlDisplay {
  wicketsPerInnings: number
  oversPerInnings: number
  economy: number
  bowlingAverage: number
}

function pickTournamentRecord(
  profile: PlayerProfile,
  tournamentName: string,
  seasonYear?: number,
): TournamentRecord | null {
  const hist = profile.tournamentHistory ?? []
  if (hist.length === 0) return null
  if (seasonYear != null) {
    const y = String(seasonYear)
    const bySeason = hist.find((h) => h.season.includes(y))
    if (bySeason) return bySeason
  }
  const byName = hist.find((h) =>
    tournamentName && h.season.toLowerCase().includes(tournamentName.toLowerCase().slice(0, 8)),
  )
  return byName ?? hist[0]
}

function battingForm(profile: PlayerProfile): number {
  const recent = profile.recentInnings ?? []
  if (recent.length === 0) return 0
  const slice = recent.slice(0, 5)
  const sum = slice.reduce((a, inn) => a + inn.score, 0)
  return Math.round((sum / slice.length) * 100) / 100
}

export function avgBattingPosition(
  player: SquadPlayer,
  section: 'starting' | 'reserves' | 'impact',
  indexInSection: number,
): number {
  if (section === 'starting') return indexInSection + 1
  const pos = player.ratingParPosition
  return pos >= 1 && pos <= 11 ? pos : 0
}

export function squadPlayerBattingDisplay(
  player: SquadPlayer,
  profile: PlayerProfile,
  section: 'starting' | 'reserves' | 'impact',
  indexInSection: number,
  scope: SquadStatsScope,
  tournamentName: string,
  seasonYear?: number,
): SquadPlayerBatDisplay {
  const pos = avgBattingPosition(player, section, indexInSection)
  const form = battingForm(profile)

  if (scope === 'recent') {
    return {
      average: player.raw,
      strikeRate: player.sr * 100,
      form: form > 0 ? form : player.raw,
      avgPosition: pos,
    }
  }

  const tour = pickTournamentRecord(profile, tournamentName, seasonYear)
  if (scope === 'tournament' && tour) {
    return {
      average: tour.average,
      strikeRate: tour.strikeRate * 100,
      form: form > 0 ? form : tour.average,
      avgPosition: pos,
    }
  }

  const bat = profile.careerBatting
  const innings = bat.innings > 0 ? bat.innings : bat.matches > 0 ? bat.matches : 0
  const avg = innings > 0 && bat.runs > 0 ? bat.runs / innings : player.raw
  return {
    average: bat.average > 0 ? bat.average : avg,
    strikeRate: bat.strikeRate > 0 ? bat.strikeRate * 100 : player.sr * 100,
    form: form > 0 ? form : player.raw,
    avgPosition: pos,
  }
}

export function squadPlayerBowlingDisplay(
  player: SquadPlayer,
  profile: PlayerProfile,
  scope: SquadStatsScope,
  tournamentName: string,
  seasonYear?: number,
): SquadPlayerBowlDisplay {
  if (scope === 'recent') {
    const innings = player.overs > 0 ? Math.max(1, Math.round(player.overs / 4)) : 1
    return {
      wicketsPerInnings: Math.round((player.wkts / innings) * 100) / 100,
      oversPerInnings: Math.round((player.overs / innings) * 100) / 100,
      economy: player.econ,
      bowlingAverage: player.bowlAvg,
    }
  }

  const tour = pickTournamentRecord(profile, tournamentName, seasonYear)
  if (scope === 'tournament' && tour && tour.wickets > 0) {
    const inn = tour.matches > 0 ? tour.matches : 1
    return {
      wicketsPerInnings: Math.round((tour.wickets / inn) * 100) / 100,
      oversPerInnings: player.overs > 0 ? Math.round((player.overs / inn) * 100) / 100 : 0,
      economy: player.econ,
      bowlingAverage: tour.bowlAvg > 0 ? tour.bowlAvg : player.bowlAvg,
    }
  }

  const bowl = profile.careerBowling
  const inn = bowl.innings > 0 ? bowl.innings : bowl.matches > 0 ? bowl.matches : 1
  return {
    wicketsPerInnings: Math.round((bowl.wickets / inn) * 100) / 100,
    oversPerInnings: player.overs > 0 ? Math.round((player.overs / inn) * 100) / 100 : 0,
    economy: bowl.economy > 0 ? bowl.economy : player.econ,
    bowlingAverage: bowl.average > 0 ? bowl.average : player.bowlAvg,
  }
}

export function profileForSquadPlayer(player: SquadPlayer): PlayerProfile {
  return profileForSquadPlayerBase(player)
}
