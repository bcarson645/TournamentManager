/**
 * Shared Statz team-match types. Numeric facts and structure only;
 * no Statz branding, copy or styling is reused anywhere.
 */

import { statzDateToIso, statzSlugForName } from './statzPlayer'

export type StatzTeamFormatChip = 'T20' | 'ODI' | 'Test'

export type StatzTeamMatchResult = 'Won' | 'Lost' | 'Abandoned' | 'Unknown'

export interface StatzTeamMatch {
  isoDate: string | null
  dateLabel: string
  competition: string | null
  format: StatzTeamFormatChip | 'Other'
  opponent: string | null
  venue: string | null
  homeAway: string | null
  result: StatzTeamMatchResult
  toss: string | null
  teamScore: string | null
  teamRuns: number | null
  teamWickets: number | null
  teamOvers: string | null
  oppScore: string | null
  oppRuns: number | null
  wicketsTaken: number | null
  wicketsLost: number | null
  runRate: number | null
  fours: number | null
  sixes: number | null
  topScorer: string | null
  topScorerRuns: number | null
  topWicketTaker: string | null
  topWickets: number | null
}

export interface StatzTeamNext {
  opponent: string | null
  opponentCode: string | null
  isoDate: string | null
  dateLabel: string | null
}

export interface StatzTeamSummary {
  matches: number
  wins: number
  losses: number
  abandoned: number
  winPct: number | null
  form: Array<'W' | 'L' | 'A'>
  avgRuns: number | null
  avgRunRate: number | null
  avgFours: number | null
  avgSixes: number | null
  avgBoundaries: number | null
  avgWicketsTaken: number | null
  avgWicketsLost: number | null
  avgRunsConceded: number | null
}

export interface StatzTeamKeyPlayer {
  name: string
  appearances: number
  highlight: number
}

export interface StatzTeamPayload {
  source: 'statz'
  team: string
  slug: string
  found: boolean
  homeGround: string | null
  next: StatzTeamNext | null
  summary: StatzTeamSummary
  matches: StatzTeamMatch[]
  keyBatters: StatzTeamKeyPlayer[]
  keyBowlers: StatzTeamKeyPlayer[]
}

export const statzTeamSlugForName = statzSlugForName

export function emptyTeamSummary(): StatzTeamSummary {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    abandoned: 0,
    winPct: null,
    form: [],
    avgRuns: null,
    avgRunRate: null,
    avgFours: null,
    avgSixes: null,
    avgBoundaries: null,
    avgWicketsTaken: null,
    avgWicketsLost: null,
    avgRunsConceded: null,
  }
}

export function classifyStatzCompetition(label: string | null): StatzTeamFormatChip | 'Other' {
  const t = (label ?? '').toLowerCase()
  if (!t) return 'Other'
  if (/\btest\b/.test(t)) return 'Test'
  if (/\bodi\b|\blist a\b/.test(t)) return 'ODI'
  if (/\bt20\b|\bhundred\b|\bblast\b/.test(t)) return 'T20'
  return 'Other'
}

export function formatChipForTournamentFormat(format: string | undefined): StatzTeamFormatChip {
  if (format === 'lista') return 'ODI'
  if (format === 'firstclass') return 'Test'
  return 'T20'
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

export function summarizeTeamMatches(matches: StatzTeamMatch[]): StatzTeamSummary {
  let wins = 0
  let losses = 0
  let abandoned = 0
  const form: Array<'W' | 'L' | 'A'> = []
  for (const m of matches) {
    if (m.result === 'Won') {
      wins += 1
      if (form.length < 5) form.push('W')
    } else if (m.result === 'Lost') {
      losses += 1
      if (form.length < 5) form.push('L')
    } else if (m.result === 'Abandoned') {
      abandoned += 1
      if (form.length < 5) form.push('A')
    }
  }
  const decidedOrAll = matches.length
  const winPct = decidedOrAll > 0 ? Math.round((wins / decidedOrAll) * 1000) / 10 : null
  const fours = matches.map((m) => m.fours).filter((n): n is number => n != null)
  const sixes = matches.map((m) => m.sixes).filter((n): n is number => n != null)
  const avgFours = mean(fours)
  const avgSixes = mean(sixes)
  return {
    matches: matches.length,
    wins,
    losses,
    abandoned,
    winPct,
    form,
    avgRuns: mean(matches.map((m) => m.teamRuns).filter((n): n is number => n != null)),
    avgRunRate: mean(matches.map((m) => m.runRate).filter((n): n is number => n != null)),
    avgFours,
    avgSixes,
    avgBoundaries:
      avgFours != null && avgSixes != null
        ? Math.round((avgFours + avgSixes) * 10) / 10
        : mean(
            matches
              .map((m) => (m.fours != null && m.sixes != null ? m.fours + m.sixes : null))
              .filter((n): n is number => n != null),
          ),
    avgWicketsTaken: mean(matches.map((m) => m.wicketsTaken).filter((n): n is number => n != null)),
    avgWicketsLost: mean(matches.map((m) => m.wicketsLost).filter((n): n is number => n != null)),
    avgRunsConceded: mean(matches.map((m) => m.oppRuns).filter((n): n is number => n != null)),
  }
}

export function keyPlayersFromMatches(matches: StatzTeamMatch[]): {
  keyBatters: StatzTeamKeyPlayer[]
  keyBowlers: StatzTeamKeyPlayer[]
} {
  const bat = new Map<string, StatzTeamKeyPlayer>()
  const bowl = new Map<string, StatzTeamKeyPlayer>()
  for (const m of matches) {
    if (m.topScorer) {
      const cur = bat.get(m.topScorer) ?? { name: m.topScorer, appearances: 0, highlight: 0 }
      cur.appearances += 1
      cur.highlight = Math.max(cur.highlight, m.topScorerRuns ?? 0)
      bat.set(m.topScorer, cur)
    }
    if (m.topWicketTaker) {
      const cur = bowl.get(m.topWicketTaker) ?? { name: m.topWicketTaker, appearances: 0, highlight: 0 }
      cur.appearances += 1
      cur.highlight = Math.max(cur.highlight, m.topWickets ?? 0)
      bowl.set(m.topWicketTaker, cur)
    }
  }
  const rank = (a: StatzTeamKeyPlayer, b: StatzTeamKeyPlayer) =>
    b.appearances - a.appearances || b.highlight - a.highlight
  return {
    keyBatters: [...bat.values()].sort(rank).slice(0, 6),
    keyBowlers: [...bowl.values()].sort(rank).slice(0, 6),
  }
}

export function matchPassesFormatChip(
  match: StatzTeamMatch,
  chip: StatzTeamFormatChip,
): boolean {
  if (match.format === chip) return true
  if (chip === 'T20' && match.format === 'Other') return true
  return false
}

export function parseTeamDateLabel(label: string): { dateLabel: string; isoDate: string | null } {
  const raw = label.replace(/\s+/g, ' ').trim()
  const m = raw.match(/^(\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4})/)
  const dateLabel = m ? m[1] : raw
  return { dateLabel, isoDate: statzDateToIso(dateLabel) }
}
