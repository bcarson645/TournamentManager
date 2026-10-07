import { NextResponse } from 'next/server'
import {
  classifyStatzCompetition,
  emptyTeamSummary,
  keyPlayersFromMatches,
  parseTeamDateLabel,
  summarizeTeamMatches,
  statzTeamSlugForName,
  type StatzTeamMatch,
  type StatzTeamMatchResult,
  type StatzTeamNext,
  type StatzTeamPayload,
} from '../../../../app/data/statzTeam'

export const runtime = 'nodejs'

const STATZ_BASE = 'https://statz.ai/cricket/teams'
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 50

interface CacheEntry {
  at: number
  data: StatzTeamPayload
}

const cache = new Map<string, CacheEntry>()

const OPP_CODES: Record<string, string> = {
  AFG: 'Afghanistan',
  AUS: 'Australia',
  BAN: 'Bangladesh',
  ENG: 'England',
  IND: 'India',
  IRE: 'Ireland',
  ITA: 'Italy',
  NPL: 'Nepal',
  NZ: 'New Zealand',
  PAK: 'Pakistan',
  SA: 'South Africa',
  SCO: 'Scotland',
  SL: 'Sri Lanka',
  WI: 'West Indies',
  ZIM: 'Zimbabwe',
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;|&bull;/g, '·')
    .replace(/\s+/g, ' ')
    .trim()
}

function cellsFor(matrix: Record<string, string[]>, prefix: string): string[] {
  const key = Object.keys(matrix).find((k) => k === prefix || k.startsWith(prefix))
  return key ? matrix[key] : []
}

function numOrNull(s: string): number | null {
  const t = s.trim()
  if (!t || t === '–' || t === '-' || t === '—') return null
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseInnings(raw: string): {
  display: string | null
  runs: number | null
  wickets: number | null
  overs: string | null
} {
  const t = raw.trim()
  if (!t || t === '–' || t === '-' || t === '—') {
    return { display: null, runs: null, wickets: null, overs: null }
  }
  const m = t.match(/^(\d+)(?:\/(\d+|all out))?/i)
  const overs = t.match(/\(([^)]+)\)/)
  return {
    display: t,
    runs: m ? Number(m[1]) : numOrNull(t),
    wickets: m && m[2] && m[2].toLowerCase() !== 'all out' ? Number(m[2]) : null,
    overs: overs ? overs[1].trim() : null,
  }
}

function parseResult(raw: string): StatzTeamMatchResult {
  const t = raw.toLowerCase()
  if (t.includes('abandon')) return 'Abandoned'
  if (t.startsWith('won') || t === 'w') return 'Won'
  if (t.startsWith('lost') || t === 'l') return 'Lost'
  return 'Unknown'
}

function parseNamedStat(raw: string): { name: string | null; value: number | null } {
  const t = raw.trim()
  if (!t || t === '–' || t === '-') return { name: null, value: null }
  const m = t.match(/^(.*?)\s*\((\d+(?:\.\d+)?)\)\s*$/)
  if (m) return { name: m[1].trim() || null, value: Number(m[2]) }
  return { name: t, value: null }
}

function teamSideNumber(hay: string): number | null {
  const matches = [...hay.matchAll(/([A-Za-z]{2,3})\s*:\s*([0-9]+(?:\.[0-9]+)?)/g)]
  for (const m of matches) {
    if (m[1].toLowerCase() === 'opp') continue
    return Number(m[2])
  }
  return numOrNull(hay.split(/\s+/)[0] ?? '')
}

function parseTransposedMatches(html: string): StatzTeamMatch[] {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0])
  const table = tables.find((x) => x.includes('Stat category') && x.includes('Opponent'))
  if (!table) return []

  const matrix: Record<string, string[]> = {}
  const body = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1])
  for (const tr of body) {
    const th = tr.match(/<th[^>]*>([\s\S]*?)<\/th>/)
    if (!th) continue
    const key = stripTags(th[1])
    if (!key || key === 'Stat category') continue
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]))
    matrix[key] = cells
  }

  const n = Math.max(
    matrix.Competition?.length ?? 0,
    matrix.Opponent?.length ?? 0,
    matrix.Date?.length ?? 0,
  )
  if (n === 0) return []

  const col = (row: string, i: number): string => cellsFor(matrix, row)[i] ?? ''
  const out: StatzTeamMatch[] = []
  for (let i = 0; i < n; i++) {
    const competition = col('Competition', i) || null
    const dateRaw = col('Date', i)
    const { dateLabel, isoDate } = parseTeamDateLabel(dateRaw)
    const teamInn = parseInnings(col('Team score', i))
    const oppInn = parseInnings(col('Opposition score', i))
    const topBat = parseNamedStat(col('Top scorer', i))
    const topBowl = parseNamedStat(col('Top wicket taker', i))
    const venueRaw = col('Venue', i)
    const homeAway = /home/i.test(venueRaw) ? 'H' : /away/i.test(venueRaw) ? 'A' : null
    const venue = venueRaw.replace(/\s*(Home|Away)\*?\s*$/i, '').trim() || null
    const rrRaw = col('Run rate', i) || col('Match run rate', i)
    const foursRaw = col('Fours', i) || col('Match fours', i)
    const sixesRaw = col('Sixes', i) || col('Match sixes', i)
    const wktsLostRaw = col('Wickets lost', i)
    const wktsTakenRaw = col('Wickets taken', i)
    const oppCode = col('Opponent', i)
    out.push({
      isoDate,
      dateLabel,
      competition,
      format: classifyStatzCompetition(competition),
      opponent: OPP_CODES[oppCode.toUpperCase()] ?? (oppCode || null),
      venue,
      homeAway,
      result: parseResult(col('Result', i)),
      toss: col('Toss', i) || null,
      teamScore: teamInn.display,
      teamRuns: teamInn.runs,
      teamWickets: teamInn.wickets,
      teamOvers: teamInn.overs,
      oppScore: oppInn.display,
      oppRuns: oppInn.runs,
      wicketsTaken: numOrNull(wktsTakenRaw.split(/\s+/)[0] ?? ''),
      wicketsLost: numOrNull(wktsLostRaw.split(/\s+/)[0] ?? ''),
      runRate: teamSideNumber(rrRaw),
      fours: teamSideNumber(foursRaw),
      sixes: teamSideNumber(sixesRaw),
      topScorer: topBat.name,
      topScorerRuns: topBat.value,
      topWicketTaker: topBowl.name,
      topWickets: topBowl.value,
    })
  }
  return out
}

function parseNext(html: string): StatzTeamNext | null {
  const utc = html.match(/class="ck-tnext[\s\S]{0,1200}?data-utc="([^"]+)"/)
  const code = html.match(/class="ck-tnext[\s\S]{0,800}?class="ck-disc"[^>]*>([A-Z]{2,3})</)
  const label = html.match(/data-format="kitnext"[^>]*>([^<]+)</)
  if (!utc && !code) return null
  const opponentCode = code ? code[1] : null
  const iso = utc ? utc[1].slice(0, 10) : null
  return {
    opponentCode,
    opponent: opponentCode ? (OPP_CODES[opponentCode] ?? opponentCode) : null,
    isoDate: iso,
    dateLabel: label ? stripTags(label[1]) : iso,
  }
}

function parseHomeGround(html: string): string | null {
  const m = html.match(/primary home ground is ([^.<"]+)/i)
  return m ? stripTags(m[1]).trim() : null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')?.trim()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    const slug = statzTeamSlugForName(name)
    if (!slug) return NextResponse.json({ error: 'unsupported team name' }, { status: 400 })

    const hit = cache.get(slug)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json(hit.data)
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    let html = ''
    let status = 0
    try {
      const res = await fetch(`${STATZ_BASE}/${slug}`, {
        signal: ctrl.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          Accept: 'text/html',
        },
      })
      status = res.status
      if (!res.ok) {
        const missing: StatzTeamPayload = {
          source: 'statz',
          team: name,
          slug,
          found: false,
          homeGround: null,
          next: null,
          summary: emptyTeamSummary(),
          matches: [],
          keyBatters: [],
          keyBowlers: [],
        }
        if (status === 404) {
          cache.set(slug, { at: Date.now(), data: missing })
          return NextResponse.json(missing)
        }
        return NextResponse.json(
          { error: `upstream responded ${status}`, source: 'statz', found: false },
          { status: 502 },
        )
      }
      html = await res.text()
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'statz fetch failed', source: 'statz', found: false },
        { status: 502 },
      )
    } finally {
      clearTimeout(timer)
    }

    const matches = parseTransposedMatches(html)
    const { keyBatters, keyBowlers } = keyPlayersFromMatches(matches)
    const payload: StatzTeamPayload = {
      source: 'statz',
      team: name,
      slug,
      found: matches.length > 0,
      homeGround: parseHomeGround(html),
      next: parseNext(html),
      summary: summarizeTeamMatches(matches),
      matches,
      keyBatters,
      keyBowlers,
    }
    cache.set(slug, { at: Date.now(), data: payload })
    if (cache.size > CACHE_MAX) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
      if (oldest) cache.delete(oldest[0])
    }
    return NextResponse.json(payload)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load team data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
