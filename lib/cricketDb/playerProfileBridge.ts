import type { CareerBatting, CareerBowling, PlayerProfile, RecentInnings } from '../../app/data/playerProfile'
import { getCricketDb } from './client'
import { findCanonicalByAppName, resolveCanonicalPlayerId } from './playerMerges'
import { playerNameSimilarity } from './nameMatch'
import { getPlayerT20Aggregate, type PlayerT20Aggregate, upsertAlias } from './queries'

export interface SquadStatSeed {
  datasetPlayerId: string
  datasetDisplayName: string
  appearances: number
  btCaz: number
  rawBase: number
  raw: number
  sr: number
  fours: number
  sixes: number
  wkts: number
  overs: number
  econ: number
  bowlWpo: number
  bowlAvg: number
}

export function getDatasetPlayerIdForAppName(appName: string, recordAlias = false): string | null {
  const trimmed = appName.trim()
  if (!trimmed) return null

  const db = getCricketDb()
  const aliasRow = db
    .prepare(`SELECT player_id AS id FROM player_aliases WHERE lower(app_name) = lower(?)`)
    .get(trimmed) as { id: string } | undefined
  if (aliasRow?.id) {
    return resolveCanonicalPlayerId(aliasRow.id)
  }

  const byIdentity = findCanonicalByAppName(trimmed)
  if (byIdentity) {
    if (recordAlias) {
      upsertAlias(trimmed, byIdentity.playerId, 'identity-key')
    }
    return byIdentity.playerId
  }

  const candidates = db
    .prepare(
      `SELECT player_id AS playerId, display_name AS displayName
       FROM players ORDER BY appearances DESC LIMIT 12000`,
    )
    .all() as { playerId: string; displayName: string }[]

  let best: { playerId: string; score: number } | null = null
  for (const c of candidates) {
    const score = playerNameSimilarity(trimmed, c.displayName)
    if (score >= 0.9 && (!best || score > best.score)) {
      best = { playerId: c.playerId, score }
    }
  }
  if (best) {
    if (recordAlias) upsertAlias(trimmed, best.playerId, 'fuzzy-match')
    return resolveCanonicalPlayerId(best.playerId)
  }

  return null
}

export function aggregateToSquadStatSeed(agg: PlayerT20Aggregate): SquadStatSeed {
  const btCaz = agg.average ?? 0
  const rawBase = btCaz > 0 ? Math.round(btCaz * 0.85 * 10) / 10 : 0
  const sr = agg.strikeRatePerBall ?? 0

  const bowlAvg = agg.bowlAverage ?? 0
  const econ = agg.economy ?? 0
  const wickets = agg.wickets
  let overs = 0
  if (agg.oversText && agg.bowlInnings > 0) {
    const total = parseFloat(agg.oversText) || 0
    if (total > 0) {
      overs = Math.min(4, Math.round((total / agg.bowlInnings) * 10) / 10)
    }
  }
  if (overs === 0 && agg.bowlInnings > 0 && wickets > 0 && bowlAvg > 0 && econ > 0) {
    overs = Math.min(4, Math.round(((wickets * bowlAvg) / econ) * 10) / 10)
  } else if (overs === 0 && wickets > 0) {
    overs = Math.min(4, 4)
  }
  const bowlWpo = overs > 0 && wickets > 0 ? Math.round((wickets / overs) * 100) / 100 : 0

  return {
    datasetPlayerId: agg.playerId,
    datasetDisplayName: agg.displayName,
    appearances: agg.appearances,
    btCaz,
    rawBase,
    raw: rawBase,
    sr,
    fours: agg.fours,
    sixes: agg.sixes,
    wkts: wickets,
    overs,
    econ,
    bowlWpo,
    bowlAvg,
  }
}

export function aggregateToPlayerProfile(agg: PlayerT20Aggregate): Partial<PlayerProfile> {
  const seed = aggregateToSquadStatSeed(agg)
  const ballsPerWicket =
    agg.wickets > 0 && agg.bowlInnings > 0
      ? Math.round((agg.appearances / Math.max(1, agg.wickets)) * 10) / 10
      : 0

  const recentInnings: RecentInnings[] = agg.recentInnings.map((r) => ({
    score: r.runs,
    notOut: r.notOut,
  }))

  const careerBatting: CareerBatting = {
    matches: agg.batInnings || agg.appearances,
    runs: agg.runs,
    average: seed.btCaz,
    strikeRate: seed.sr,
    hundreds: agg.hundreds,
    fifties: agg.fifties,
    highScore: String(agg.highScore),
    innings: agg.batInnings,
  }

  const careerBowling: CareerBowling = {
    matches: agg.bowlInnings,
    wickets: agg.wickets,
    average: seed.bowlAvg,
    economy: seed.econ,
    strikeRate: ballsPerWicket,
    bestFigures: '—',
    fiveWickets: 0,
    innings: agg.bowlInnings,
  }

  return { careerBatting, careerBowling, recentInnings }
}

export function getSquadStatSeedForAppName(appName: string, recordAlias = true): SquadStatSeed | null {
  const playerId = getDatasetPlayerIdForAppName(appName, recordAlias)
  if (!playerId) return null
  const agg = getPlayerT20Aggregate(playerId)
  if (!agg || (agg.batInnings === 0 && agg.bowlInnings === 0)) return null
  return aggregateToSquadStatSeed(agg)
}
