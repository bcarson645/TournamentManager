import { NextResponse } from 'next/server'
import { getDatasetPlayerIdForAppName } from '../../../../lib/cricketDb/playerProfileBridge'
import { allPlayerIdsForCanonical } from '../../../../lib/cricketDb/playerMerges'
import { oversTextToBalls } from '../../../../lib/cricketDb/parseOvers'
import {
  getMajorT20CompetitionIds,
  getPlayerT20Aggregate,
  getRecentBattingInnings,
  getRecentBowlingInnings,
  getT20CompetitionIds,
  getTournamentCompetitionIds,
} from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

/** Which matches feed the stats: this tournament only, all T20, or the major leagues. */
export type RankingsScope = 'tournament' | 't20' | 'majors'

export interface RankingsRecentInnings {
  date: string
  runs: number
  balls: number
  fours: number
  sixes: number
  notOut: boolean
  opponent: string | null
}

export interface RankingsBowlContext {
  /** Overs per match (balls / 6 / matches). */
  oversPerMatch: number | null
  economy: number | null
  average: number | null
  wickets: number
  matches: number
}

export interface RankingsPlayerData {
  /** Scope-filtered innings, newest first (balls faced included where collected). */
  innings: RankingsRecentInnings[]
  /** Scope average / SR per 100 (runs per dismissal; strike rate per 100 balls). */
  careerAvg: number | null
  careerSr: number | null
  /** Scope boundary totals. */
  careerFours: number | null
  careerSixes: number | null
  /** Scope average batting order (1–11) and distinct orders observed. */
  careerAvgBatOrder: number | null
  careerBatOrders: number[]
  /** Scope batting innings — drives the confidence meter. */
  careerInnings: number | null
  /** Scope bowling context. Null when the player never bowled in scope. */
  bowlCareer: RankingsBowlContext | null
  /** Scope recent bowling context. Null when no spells in scope. */
  bowlTourn: RankingsBowlContext | null
}

/**
 * Collected-data backing for the expanded tournament rankings batting view.
 * Scope-filtered recent innings (with balls faced) plus scope aggregates,
 * keyed by squad name. Names that don't resolve are omitted — the caller
 * falls back to its built-in static records and flags the source.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      tournamentId?: string
      names?: string[]
      limit?: number
      scope?: RankingsScope
    }
    const tournamentId = (body.tournamentId ?? '').trim()
    const names = [...new Set((body.names ?? []).map((n) => String(n).trim()).filter(Boolean))].slice(
      0,
      400,
    )
    const limit = Math.min(60, Math.max(5, Number(body.limit) || 15))
    const scope: RankingsScope = body.scope === 't20' || body.scope === 'majors' ? body.scope : 'tournament'

    const competitionIds =
      scope === 't20'
        ? getT20CompetitionIds()
        : scope === 'majors'
          ? getMajorT20CompetitionIds()
          : tournamentId
            ? getTournamentCompetitionIds(tournamentId)
            : []
    if (competitionIds.length === 0 || names.length === 0) {
      return NextResponse.json({ players: {} })
    }

    const players: Record<string, RankingsPlayerData> = {}
    for (const name of names) {
      try {
        const canonical = getDatasetPlayerIdForAppName(name, false)
        if (!canonical) continue
        const ids = allPlayerIdsForCanonical(canonical)
        if (ids.length === 0) continue
        const rows = getRecentBattingInnings(ids, competitionIds, limit)
        const bowlRows = getRecentBowlingInnings(ids, competitionIds, limit)
        if (rows.length === 0 && bowlRows.length === 0) continue
        let careerAvg: number | null = null
        let careerSr: number | null = null
        let careerFours: number | null = null
        let careerSixes: number | null = null
        let careerAvgBatOrder: number | null = null
        let careerBatOrders: number[] = []
        let careerInnings: number | null = null
        let bowlCareer: RankingsBowlContext | null = null
        try {
          const agg = getPlayerT20Aggregate(canonical, competitionIds)
          if (agg) {
            careerAvg = agg.average
            careerSr = agg.strikeRatePerBall != null ? Math.round(agg.strikeRatePerBall * 10000) / 100 : null
            careerFours = agg.fours
            careerSixes = agg.sixes
            careerInnings = agg.batInnings
            careerAvgBatOrder = agg.avgBatOrder
            careerBatOrders = agg.batOrders
            const balls = oversTextToBalls(agg.oversText)
            const matches = agg.bowlMatchAppearances
            if (balls > 0 && matches > 0) {
              const overs = balls / 6
              bowlCareer = {
                oversPerMatch: Math.round((overs / matches) * 100) / 100,
                economy: agg.economy,
                average: agg.bowlAverage,
                wickets: agg.wickets,
                matches,
              }
            } else if (agg.wickets > 0) {
              bowlCareer = {
                oversPerMatch: null,
                economy: agg.economy,
                average: agg.bowlAverage,
                wickets: agg.wickets,
                matches,
              }
            }
          }
        } catch {
          /* career aggregates optional — recent innings still useful */
        }
        let bowlTourn: RankingsBowlContext | null = null
        if (bowlRows.length > 0) {
          const balls = bowlRows.reduce((s, r) => s + r.balls, 0)
          const runs = bowlRows.reduce((s, r) => s + r.runs, 0)
          const wickets = bowlRows.reduce((s, r) => s + r.wickets, 0)
          const matches = bowlRows.length
          const overs = balls / 6
          bowlTourn = {
            oversPerMatch: overs > 0 && matches > 0 ? Math.round((overs / matches) * 100) / 100 : null,
            economy: overs > 0 ? Math.round((runs / overs) * 100) / 100 : null,
            average: wickets > 0 ? Math.round((runs / wickets) * 100) / 100 : null,
            wickets,
            matches,
          }
        }
        players[name] = {
          innings: rows.map((r) => ({
            date: r.date,
            runs: r.runs,
            balls: r.balls,
            fours: r.fours,
            sixes: r.sixes,
            notOut: r.notOut,
            opponent: r.opponent,
          })),
          careerAvg,
          careerSr,
          careerFours,
          careerSixes,
          careerAvgBatOrder,
          careerBatOrders,
          careerInnings,
          bowlCareer,
          bowlTourn,
        }
      } catch {
        /* per-name failure — caller falls back for this player */
      }
    }
    return NextResponse.json({ players })
  } catch {
    return NextResponse.json({ players: {} })
  }
}
