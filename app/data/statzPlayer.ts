/**
 * Shared Statz player-match types. Facts only (scores, figures, venues);
 * no Statz branding, copy or styling is reused anywhere.
 */

export interface StatzMatchRow {
  /** ISO date YYYY-MM-DD when parseable, else null. */
  isoDate: string | null;
  /** Original display date, e.g. "12 Jul 26". */
  dateLabel: string;
  team: string | null;
  oppo: string | null;
  comp: string | null;
  homeAway: string | null;
  venue: string | null;
  result: string | null;
  runs: number | null;
  notOut: boolean;
  /** True when the player did not bat (DNB "–"). */
  dnb: boolean;
  balls: number | null;
  fours: number | null;
  sixes: number | null;
  strikeRate: number | null;
  wickets: number | null;
  bowlRuns: number | null;
  overs: string | null;
  economy: number | null;
  dots: number | null;
  scoreline: string | null;
}

/** "Joe Root" -> "joe-root". Null when the name cannot form a safe slug. */
export function statzSlugForName(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
  return slug;
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/** "12 Jul 26" -> "2026-07-12". Null when unparseable. */
export function statzDateToIso(label: string): string | null {
  const m = label.trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!mon) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${mon}-${day}`;
}