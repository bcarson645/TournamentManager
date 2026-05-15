import type { SquadPlayer } from './squad'
import { getSquadForTeam } from './squadStore'
import type { DashboardBatMetric, DashboardBowlMetric } from './ratingDisplaySettings'
import { dashboardBowlMetricValueSemantics } from './ratingDisplaySettings'

export interface MetricRank {
  rank: number
  of: number
}

export interface PlayerTournamentRankSummary {
  batting: {
    wholeTournament: Partial<Record<DashboardBatMetric, MetricRank>>
    sameRole: Partial<Record<DashboardBatMetric, MetricRank>> | null
  }
  bowling: {
    wholeTournament: Partial<Record<DashboardBowlMetric, MetricRank>>
  }
  /** e.g. "Openers (1–2)" or "Line-up 5" or "Par slot 7" */
  roleLabel: string
}

function battingSrDisplayFromCaz(srPerBall: number): number {
  return Math.round(srPerBall * 100 * 100) / 100
}

function batMetricValue(p: SquadPlayer, metric: DashboardBatMetric): number {
  if (metric === 'batRating') return p.batRating
  if (metric === 'btCaz') return p.btCaz
  return battingSrDisplayFromCaz(p.sr)
}

function bowlMetricValue(p: SquadPlayer, metric: DashboardBowlMetric): number | null {
  if (Number.isNaN(p.bowlRating)) return null
  if (metric === 'bowlRating') return p.bowlRating
  if (metric === 'bowlAvg') return p.bowlAvg
  if (metric === 'econ') return p.econ
  if (p.bowlWpo > 0) return 6 / p.bowlWpo
  return null
}

function higherBetterForBowlMetric(metric: DashboardBowlMetric): boolean {
  return dashboardBowlMetricValueSemantics(metric) === 'higher-better'
}

function rankAmong(
  scored: { id: string; value: number }[],
  playerId: string,
  higherBetter: boolean,
): MetricRank | null {
  const finite = scored.filter((s) => Number.isFinite(s.value))
  if (finite.length === 0) return null
  const mine = finite.find((s) => s.id === playerId)
  if (!mine) return null
  const v = mine.value
  const eps = 1e-9
  const strictlyBetter = higherBetter
    ? finite.filter((s) => s.value > v + eps).length
    : finite.filter((s) => s.value < v - eps).length
  return { rank: strictlyBetter + 1, of: finite.length }
}

export interface TournamentPlayerRow {
  player: SquadPlayer
  teamId: string
  teamName: string
  /** XI batting order 1–11, or `ratingParPosition` for bench / impact */
  comparisonSlot: number
  roster: 'xi' | 'bench'
}

export function listTournamentSquadPlayerRows(teams: { id: string; name: string }[]): TournamentPlayerRow[] {
  const out: TournamentPlayerRow[] = []
  for (const team of teams) {
    const { startingXI, reserves, impactSubs } = getSquadForTeam(team.id)
    startingXI.forEach((p, i) => {
      out.push({
        player: p,
        teamId: team.id,
        teamName: team.name,
        comparisonSlot: i + 1,
        roster: 'xi',
      })
    })
    reserves.forEach((p) => {
      out.push({
        player: p,
        teamId: team.id,
        teamName: team.name,
        comparisonSlot: p.ratingParPosition,
        roster: 'bench',
      })
    })
    impactSubs.forEach((p) => {
      out.push({
        player: p,
        teamId: team.id,
        teamName: team.name,
        comparisonSlot: p.ratingParPosition,
        roster: 'bench',
      })
    })
  }
  return out
}

function sameRoleMatcher(playerSlot: number): (slot: number) => boolean {
  if (playerSlot === 1 || playerSlot === 2) return (s) => s === 1 || s === 2
  return (s) => s === playerSlot
}

function roleLabelForRow(row: TournamentPlayerRow): string {
  if (row.roster === 'xi') {
    const s = row.comparisonSlot
    if (s === 1 || s === 2) return 'Openers (line-up 1–2)'
    return `Line-up position ${s}`
  }
  const s = row.comparisonSlot
  if (s >= 1 && s <= 11) {
    if (s === 1 || s === 2) return 'Openers (par slot 1–2)'
    return `Par slot ${s}`
  }
  return 'Role'
}

/**
 * Ranks for one player vs all drafted squads in the tournament (XI + reserves + impact).
 * Batting “same role” groups positions 1 and 2 together and uses comparison slot (line-up or par).
 */
export function computePlayerTournamentRankSummary(
  playerId: string,
  teams: { id: string; name: string }[],
): PlayerTournamentRankSummary | null {
  const rows = listTournamentSquadPlayerRows(teams)
  const mine = rows.find((r) => r.player.id === playerId)
  if (!mine) return null

  const slot = mine.comparisonSlot
  const validSlot = slot >= 1 && slot <= 11
  const roleMatch = validSlot ? sameRoleMatcher(slot) : null
  const roleRows = roleMatch ? rows.filter((r) => roleMatch(r.comparisonSlot)) : null

  const batMetrics: DashboardBatMetric[] = ['batRating', 'btCaz', 'srCaz']
  const bowlMetrics: DashboardBowlMetric[] = ['bowlRating', 'bowlAvg', 'econ', 'bowlBpw']

  const battingWT: Partial<Record<DashboardBatMetric, MetricRank>> = {}
  const battingSR: Partial<Record<DashboardBatMetric, MetricRank>> | null =
    roleRows && roleRows.length > 0 ? {} : null

  for (const m of batMetrics) {
    const scored = rows.map((r) => ({ id: r.player.id, value: batMetricValue(r.player, m) }))
    const rwt = rankAmong(scored, playerId, true)
    if (rwt) battingWT[m] = rwt
    if (battingSR && roleRows) {
      const sub = roleRows.map((r) => ({ id: r.player.id, value: batMetricValue(r.player, m) }))
      const rsr = rankAmong(sub, playerId, true)
      if (rsr) battingSR[m] = rsr
    }
  }

  const bowlingWT: Partial<Record<DashboardBowlMetric, MetricRank>> = {}
  for (const m of bowlMetrics) {
    const higher = higherBetterForBowlMetric(m)
    const scored = rows
      .map((r) => {
        const v = bowlMetricValue(r.player, m)
        return v == null ? null : { id: r.player.id, value: v }
      })
      .filter((x): x is { id: string; value: number } => x != null)
    const rw = rankAmong(scored, playerId, higher)
    if (rw) bowlingWT[m] = rw
  }

  return {
    batting: {
      wholeTournament: battingWT,
      sameRole: battingSR && Object.keys(battingSR).length > 0 ? battingSR : null,
    },
    bowling: { wholeTournament: bowlingWT },
    roleLabel: roleLabelForRow(mine),
  }
}
