import type { SquadPlayer } from './squad'
import type { PlayerProfile } from './playerProfile'
import { getProfileForPlayer, makeDefaultProfile } from './playerProfile'

/** Use squad row stats when career profile is still empty (e.g. before API load). */
export function mergeProfileWithSquadRow(base: PlayerProfile, player: SquadPlayer): PlayerProfile {
  const hasBat = player.btCaz > 0 || player.sr > 0
  const hasBowl = player.wkts > 0 || player.econ > 0 || player.overs > 0
  if (!hasBat && !hasBowl) return base

  const ballsPerWicket = player.bowlWpo > 0 ? 6 / player.bowlWpo : 0

  return {
    ...base,
    careerBatting: hasBat
      ? {
          ...base.careerBatting,
          average: player.btCaz || base.careerBatting.average,
          strikeRate: player.sr || base.careerBatting.strikeRate,
        }
      : base.careerBatting,
    careerBowling: hasBowl
      ? {
          ...base.careerBowling,
          wickets: player.wkts || base.careerBowling.wickets,
          average: player.bowlAvg || base.careerBowling.average,
          economy: player.econ || base.careerBowling.economy,
          strikeRate: ballsPerWicket || base.careerBowling.strikeRate,
        }
      : base.careerBowling,
  }
}

export function profileForSquadPlayer(player: SquadPlayer): PlayerProfile {
  return mergeProfileWithSquadRow(getProfileForPlayer(player.name), player)
}

export function mergeApiProfileIntoBase(
  base: PlayerProfile,
  data: Partial<PlayerProfile> & { source?: string },
): PlayerProfile {
  if (data.source !== 'dataset') return base
  return {
    ...base,
    country: data.country ?? base.country,
    careerBatting: data.careerBatting
      ? { ...base.careerBatting, ...data.careerBatting }
      : base.careerBatting,
    careerBowling: data.careerBowling
      ? { ...base.careerBowling, ...data.careerBowling }
      : base.careerBowling,
    recentInnings: data.recentInnings?.length ? data.recentInnings : base.recentInnings,
  }
}

export function emptyProfile(): PlayerProfile {
  return makeDefaultProfile()
}
