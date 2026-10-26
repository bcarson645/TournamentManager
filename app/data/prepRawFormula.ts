/**
 * Prep Work **Raw** column (Excel `M`): `((bt.caz × runs_ratio × team_scalar) + format_adj) × odi_adj + user_adj`
 *
 * Excel sometimes appends `-1` / `-0.5` on the formula; in the app that is **RAW ADJ** (`rawAdj`) added after the core.
 */

import type { CricketFormat } from './tournaments'
import { getRawRunsRatioMultiplier } from './battingBaseRunsRatio'
import type { TournamentMatchPrepSettings } from './matchPrepSettings'
import { DEFAULT_MATCH_PREP_SETTINGS } from './matchPrepSettings'
import type { SquadPlayer } from './squad'
import { ratingParPosForBatCalc } from './squad'

export interface PrepRawComputeInput {
  btCaz: number
  battingPosition: number
  format: CricketFormat
  matchPrep: TournamentMatchPrepSettings
  /** True when this squad is the home team in the fixture prep. */
  battingAtHome: boolean
  rawAdj: number
  /** Excel `DH`; ODI pricing overlay — default 1 until pricing wired. */
  odiRawAdjMultiplier?: number
}

function formatRunsAdj(format: CricketFormat): number {
  if (format === 'firstclass') return 2
  return 0
}

export function teamBattingScalar(
  battingAtHome: boolean,
  prep: TournamentMatchPrepSettings = DEFAULT_MATCH_PREP_SETTINGS,
): number {
  if (battingAtHome) {
    return prep.homeConditionsFactor / prep.awayBowlingFactor
  }
  return prep.awayConditionsFactor / prep.homeBowlingFactor
}

/** Core Raw before user **RAW ADJ** (Excel column M without trailing `-n`). */
export function computePrepRawBase(input: PrepRawComputeInput): number {
  const {
    btCaz,
    battingPosition,
    format,
    matchPrep,
    battingAtHome,
    odiRawAdjMultiplier = 1,
  } = input

  if (!(btCaz > 0)) return 0

  const runsRatio = getRawRunsRatioMultiplier(battingPosition, format)
  const scalar = teamBattingScalar(battingAtHome, matchPrep)
  const inner = btCaz * runsRatio * scalar + formatRunsAdj(format)
  const core = inner * odiRawAdjMultiplier
  return Math.round(core * 10) / 10
}

export function computePrepRawEffective(input: PrepRawComputeInput): {
  rawBase: number
  raw: number
} {
  const rawBase = computePrepRawBase(input)
  const raw = Math.round((rawBase + input.rawAdj) * 10) / 10
  return { rawBase, raw }
}

export function recomputePlayerPrepRaw(
  player: SquadPlayer,
  section: 'starting' | 'reserves' | 'impact',
  index: number,
  format: CricketFormat,
  matchPrep: TournamentMatchPrepSettings,
  battingAtHome: boolean,
): SquadPlayer {
  const position = ratingParPosForBatCalc(section, index, player)
  const { rawBase, raw } = computePrepRawEffective({
    btCaz: player.btCaz,
    battingPosition: position,
    format,
    matchPrep,
    battingAtHome,
    rawAdj: player.rawAdj ?? 0,
  })
  return { ...player, rawBase, raw }
}

export function recomputeSquadPrepRaw(
  startingXI: SquadPlayer[],
  reserves: SquadPlayer[],
  impactSubs: SquadPlayer[],
  format: CricketFormat,
  matchPrep: TournamentMatchPrepSettings,
  battingAtHome: boolean,
): { startingXI: SquadPlayer[]; reserves: SquadPlayer[]; impactSubs: SquadPlayer[] } {
  const map = (list: SquadPlayer[], section: 'starting' | 'reserves' | 'impact') =>
    list.map((p, i) => recomputePlayerPrepRaw(p, section, i, format, matchPrep, battingAtHome))

  return {
    startingXI: map(startingXI, 'starting'),
    reserves: map(reserves, 'reserves'),
    impactSubs: map(impactSubs, 'impact'),
  }
}
