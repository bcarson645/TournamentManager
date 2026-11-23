import { NextResponse } from 'next/server'
import { getDatasetPlayerIdForAppName } from '../../../../lib/cricketDb/playerProfileBridge'
import { allPlayerIdsForCanonical } from '../../../../lib/cricketDb/playerMerges'
import {
  getRecentBattingInnings,
  getRecentBowlingInnings,
  getTournamentCompetitionIds,
} from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export interface HubRecentInnings {
  date: string
  runs: number
  balls: number
  fours: number
  sixes: number
  notOut: boolean
  opponent: string | null
}

export interface HubRecentSpell {
  date: string
  oversText: string
  balls: number
  runs: number
  wickets: number
  opponent: string | null
}

/**
 * Real recent batting innings per squad name, restricted to the competitions
 * mapped to the given app tournament (e.g. IPL-only for t20-m-ipl).
 * Names that don't resolve to a dataset player are omitted (caller falls back).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = (searchParams.get('tournamentId') ?? '').trim()
    const names = [...new Set(
      (searchParams.get('names') ?? '')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    )].slice(0, 30)
    const limit = Math.min(30, Math.max(1, Number(searchParams.get('limit') ?? 15) || 15))

    const competitionIds = tournamentId ? getTournamentCompetitionIds(tournamentId) : []
    if (competitionIds.length === 0 || names.length === 0) {
      return NextResponse.json({ players: {}, bowling: {}, competitions: competitionIds })
    }

    const idsByName = new Map<string, string[]>()
    for (const name of names) {
      const canonical = getDatasetPlayerIdForAppName(name, false)
      if (canonical) idsByName.set(name, allPlayerIdsForCanonical(canonical))
    }
    const allIds = [...new Set([...idsByName.values()].flat())]
    const rows = getRecentBattingInnings(allIds, competitionIds, 60)
    const bowlRows = getRecentBowlingInnings(allIds, competitionIds, 60)

    const byPlayer = new Map<string, typeof rows>()
    for (const r of rows) {
      const list = byPlayer.get(r.playerId) ?? []
      list.push(r)
      byPlayer.set(r.playerId, list)
    }
    const byBowler = new Map<string, typeof bowlRows>()
    for (const r of bowlRows) {
      const list = byBowler.get(r.playerId) ?? []
      list.push(r)
      byBowler.set(r.playerId, list)
    }
    const sortByDateDesc = <T extends { date: string }>(list: T[]): T[] =>
      [...list].sort((a, b) => {
        const pa = a.date.split('/').map(Number)
        const pb = b.date.split('/').map(Number)
        const ta = pa.length === 3 ? new Date(pa[2]!, pa[0]! - 1, pa[1]!).getTime() : Date.parse(a.date)
        const tb = pb.length === 3 ? new Date(pb[2]!, pb[0]! - 1, pb[1]!).getTime() : Date.parse(b.date)
        return (Number.isNaN(tb) ? -1 : tb) - (Number.isNaN(ta) ? -1 : ta)
      })

    const players: Record<string, HubRecentInnings[]> = {}
    const bowling: Record<string, HubRecentSpell[]> = {}
    for (const [name, ids] of idsByName) {
      players[name] = []
      const picked: typeof rows = []
      for (const id of ids) {
        for (const r of byPlayer.get(id) ?? []) picked.push(r)
      }
      for (const r of sortByDateDesc(picked).slice(0, limit)) {
        players[name]!.push({
          date: r.date,
          runs: r.runs,
          balls: r.balls,
          fours: r.fours,
          sixes: r.sixes,
          notOut: r.notOut,
          opponent: r.opponent,
        })
      }
      const pickedBowling: typeof bowlRows = []
      for (const id of ids) {
        for (const r of byBowler.get(id) ?? []) pickedBowling.push(r)
      }
      const spells = sortByDateDesc(pickedBowling).slice(0, limit)
      if (spells.length > 0) {
        bowling[name] = spells.map((r) => ({
          date: r.date,
          oversText: r.oversText,
          balls: r.balls,
          runs: r.runs,
          wickets: r.wickets,
          opponent: r.opponent,
        }))
      }
    }

    return NextResponse.json({ players, bowling, competitions: competitionIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load hub recent innings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
