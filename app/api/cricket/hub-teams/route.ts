import { NextResponse } from 'next/server'
import { stringSimilarity } from '../../../../lib/cricketDb/nameMatch'
import {
  getCompetitionRecentInnings,
  getExternalTeamIdsForAppTeam,
  getHeadToHeadMeetings,
  getRecentMatchWickets,
  getTeamHomePar,
  getTeamHomeRecentInnings,
  getTeamHomeVenues,
  getTeamRecentInnings,
  getTournamentCompetitionIds,
  getVenueRecentInnings,
  getVenueRecord,
  listCompetitionVenues,
  type DbH2HMeeting,
  type DbTeamInnings,
  type DbVenueRecord,
} from '../../../../lib/cricketDb/queries'

export const runtime = 'nodejs'

export interface HubTeamHistory {
  appTeamId: string
  innings: DbTeamInnings[]
  /** First-innings only (for 1st-innings market chains) — newest first. */
  firstInnings: DbTeamInnings[]
  /** Average total batting first (innings 1), null when no data. */
  avgBatFirst: number | null
  batFirstGames: number
  /** Average total across all innings, null when no data. */
  avgAll: number | null
  avgFours: number | null
  avgSixes: number | null
  games: number
}

function summarize(
  appTeamId: string,
  innings: DbTeamInnings[],
  firstInnings: DbTeamInnings[],
): HubTeamHistory {
  const avg = (xs: number[]): number | null =>
    xs.length > 0 ? Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 10) / 10 : null
  const first = innings.filter((r) => r.inningsNo === 1)
  return {
    appTeamId,
    innings,
    firstInnings,
    avgBatFirst: avg(first.map((r) => r.total)),
    batFirstGames: first.length,
    avgAll: avg(innings.map((r) => r.total)),
    avgFours: avg(innings.map((r) => r.fours)),
    avgSixes: avg(innings.map((r) => r.sixes)),
    games: innings.length,
  }
}

/**
 * Real team-level history for a fixture: recent innings per side (totals, 4s, 6s,
 * batting first vs chasing), head-to-head meetings and the ground record.
 * App team ids resolve via team_dim (tournament + app_team mapping).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = (searchParams.get('tournamentId') ?? '').trim()
    const homeAppTeamId = (searchParams.get('home') ?? '').trim()
    const awayAppTeamId = (searchParams.get('away') ?? '').trim()
    const venue = (searchParams.get('venue') ?? '').trim()
    const limit = Math.min(30, Math.max(1, Number(searchParams.get('limit') ?? 15) || 15))

    const competitionIds = tournamentId ? getTournamentCompetitionIds(tournamentId) : []
    if (competitionIds.length === 0 || !homeAppTeamId || !awayAppTeamId) {
      return NextResponse.json({ error: 'Missing tournament/home/away or unmapped tournament' }, { status: 400 })
    }

    const homeExt = getExternalTeamIdsForAppTeam(tournamentId, homeAppTeamId)
    const awayExt = getExternalTeamIdsForAppTeam(tournamentId, awayAppTeamId)

    const homeFull = getTeamRecentInnings(homeExt, competitionIds, 60)
    const awayFull = getTeamRecentInnings(awayExt, competitionIds, 60)
    const firstOnly = (list: DbTeamInnings[]): DbTeamInnings[] =>
      list.filter((r) => r.inningsNo === 1).slice(0, 30)
    const home = summarize(homeAppTeamId, homeFull.slice(0, limit), firstOnly(homeFull))
    const away = summarize(awayAppTeamId, awayFull.slice(0, limit), firstOnly(awayFull))

    const h2h: DbH2HMeeting[] =
      homeExt.length > 0 && awayExt.length > 0
        ? getHeadToHeadMeetings(homeExt, awayExt, competitionIds, 10)
        : []

    // Fuzzy-match the fixture venue against dataset venue names.
    let matchedVenue: string | null = null
    if (venue) {
      let best: { name: string; score: number } | null = null
      for (const name of listCompetitionVenues(competitionIds)) {
        const score = stringSimilarity(venue, name)
        if (score >= 0.6 && (!best || score > best.score)) best = { name, score }
      }
      matchedVenue = best?.name ?? null
    }
    const ground: DbVenueRecord | null = getVenueRecord(matchedVenue, competitionIds)

    // Ground chains: matched fixture venue when we can, else the home side's
    // home games (matches where the home team played at home).
    const homeVenues = getTeamHomeVenues(homeExt, competitionIds)
    const groundInnings = matchedVenue
      ? getVenueRecentInnings(matchedVenue, competitionIds, 30)
      : getTeamHomeRecentInnings(homeExt, competitionIds, 30)
    const groundSource: 'venue' | 'home' | 'none' = matchedVenue
      ? 'venue'
      : groundInnings.length > 0
        ? 'home'
        : 'none'

    return NextResponse.json({
      home,
      away,
      h2h,
      ground,
      matchedVenue,
      par: homeExt.length > 0 ? getTeamHomePar(homeExt, competitionIds) : null,
      compInnings: getCompetitionRecentInnings(competitionIds, 30),
      groundInnings,
      groundSource,
      groundVenues: matchedVenue ? [matchedVenue] : homeVenues,
      matchWickets: {
        home: getRecentMatchWickets({ competitionIds, teamIds: homeExt, limit: 30 }),
        away: getRecentMatchWickets({ competitionIds, teamIds: awayExt, limit: 30 }),
        comp: getRecentMatchWickets({ competitionIds, limit: 30 }),
        ground: matchedVenue
          ? getRecentMatchWickets({ competitionIds, venue: matchedVenue, limit: 30 })
          : homeVenues.length > 0
            ? getRecentMatchWickets({ competitionIds, teamIds: homeExt, venues: homeVenues, limit: 30 })
            : [],
      },
      competitions: competitionIds,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load hub team history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
