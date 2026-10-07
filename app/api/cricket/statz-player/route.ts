import { NextResponse } from 'next/server';
import { statzDateToIso, statzSlugForName, type StatzMatchRow } from '../../../../app/data/statzPlayer';

export const runtime = 'nodejs';

const STATZ_BASE = 'https://statz.ai/cricket/players';
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 50;

interface CacheEntry {
  at: number;
  data: StatzPayload;
}

interface StatzPayload {
  source: 'statz';
  player: string;
  slug: string;
  format: 'T20';
  matches: number;
  rows: StatzMatchRow[];
}

const cache = new Map<string, CacheEntry>();

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t || t === '–' || t === '-' || t.toLowerCase() === 'dnb') return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the server-rendered match table. Column order:
 * Date, Team, Oppo, Comp, H/A, Venue, Result, Runs, Balls, 4s, 6s, SR,
 * Wkts, R, Overs, Econ, Dots, Scoreline (fantasy columns ignored).
 */
function parseMatchRows(html: string): StatzMatchRow[] {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const table = tables.find((x) => x.includes('Scoreline') && x.includes('<th'));
  if (!table) return [];
  const body = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const out: StatzMatchRow[] = [];
  for (const tr of body.slice(1)) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => stripTags(m[1]));
    if (cells.length < 21) continue;
    // Skip the header row if repeated.
    if (cells[0] === 'Date') continue;
    const runsRaw = cells[7] ?? '';
    const dnb = runsRaw.trim() === '–' || runsRaw.trim() === '-' || runsRaw.trim() === '';
    const notOut = /\*$/.test(runsRaw.trim());
    const runs = dnb ? null : numOrNull(runsRaw.replace(/\*$/, ''));
    const oversRaw = (cells[14] ?? '').trim();
    const scorelineRaw = (cells[20] ?? '').trim();
    out.push({
      isoDate: statzDateToIso(cells[0] ?? ''),
      dateLabel: cells[0] ?? '',
      team: cells[1] || null,
      oppo: cells[2] || null,
      comp: cells[3] || null,
      homeAway: cells[4] || null,
      venue: cells[5] || null,
      result: cells[6] || null,
      runs,
      notOut,
      dnb,
      balls: numOrNull(cells[8] ?? ''),
      fours: numOrNull(cells[9] ?? ''),
      sixes: numOrNull(cells[10] ?? ''),
      strikeRate: numOrNull(cells[11] ?? ''),
      wickets: numOrNull(cells[12] ?? ''),
      bowlRuns: numOrNull(cells[13] ?? ''),
      overs: oversRaw && oversRaw !== '–' && oversRaw !== '-' ? oversRaw : null,
      economy: numOrNull(cells[15] ?? ''),
      dots: numOrNull(cells[16] ?? ''),
      scoreline:
        scorelineRaw && scorelineRaw !== '›'
          ? scorelineRaw.replace(/\s*›\s*$/, '').trim() || null
          : null,
    });
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name')?.trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const slug = statzSlugForName(name);
    if (!slug) return NextResponse.json({ error: 'unsupported player name' }, { status: 400 });

    const hit = cache.get(slug);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json(hit.data);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let html = '';
    try {
      const res = await fetch(`${STATZ_BASE}/${slug}`, {
        signal: ctrl.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          Accept: 'text/html',
        },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `statz responded ${res.status}`, source: 'statz' },
          { status: 502 },
        );
      }
      html = await res.text();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'statz fetch failed', source: 'statz' },
        { status: 502 },
      );
    } finally {
      clearTimeout(timer);
    }

    const rows = parseMatchRows(html);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'no match rows found', source: 'statz' },
        { status: 502 },
      );
    }

    const payload: StatzPayload = {
      source: 'statz',
      player: name,
      slug,
      format: 'T20',
      matches: rows.length,
      rows,
    };
    cache.set(slug, { at: Date.now(), data: payload });
    if (cache.size > CACHE_MAX) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load statz data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}