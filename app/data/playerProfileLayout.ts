'use client';

/**
 * Player full-profile layout board configuration.
 *
 * Defines the configurable section order / visibility for the full-screen
 * player profile (`PlayerFullProfile`). The Layout Board
 * (`PlayerLayoutBoard`, mounted under Player and Team Management) edits this
 * config; the profile subscribes to the same store so the preview updates
 * live. Persisted to browser localStorage with a default-order fallback when
 * nothing is stored yet.
 *
 * Teams are intentionally NOT a section: squad teams render inline as chips
 * in the profile header. Stored layouts containing the retired `teams` (or
 * legacy `trend`) entries are migrated on read.
 */

export type PlayerProfileSectionId =
  | 'header'
  | 'bio'
  | 'career'
  | 'seasons'
  | 'trend'
  | 'recent'
  | 'ranks'
  | 't20'
  | 'records';

export interface PlayerProfileSectionEntry {
  id: PlayerProfileSectionId;
  visible: boolean;
}

export interface PlayerProfileLayoutConfig {
  version: 1;
  sections: PlayerProfileSectionEntry[];
}

export const PLAYER_PROFILE_LAYOUT_META: Record<
  PlayerProfileSectionId,
  { label: string; description: string }
> = {
  header: {
    label: 'Header',
    description: 'Avatar, identity, inline team chips and hero stat tiles.',
  },
  bio: {
    label: 'Bio grid',
    description: 'Full name, DOB, age, nationality, styles, role and biography.',
  },
  career: {
    label: 'Career summaries',
    description: 'Batting and bowling career summaries, side by side.',
  },
  seasons: {
    label: 'Year-by-year',
    description: 'Split batting / bowling season tables with competition filter.',
  },
  trend: {
    label: 'Trend chart',
    description: 'Filterable recent-form bar chart with reference line.',
  },
  recent: {
    label: 'Recent performances',
    description: 'Scrollable match list: opposition, batting and bowling.',
  },
  ranks: {
    label: 'Tournament ranks',
    description: 'Tournament rank summary vs drafted squads (needs squad context).',
  },
  t20: {
    label: 'T20 breakdown',
    description: 'Per-tournament T20 batting and bowling breakdown.',
  },
  records: {
    label: 'Records placeholder',
    description: 'Career highs with a slot reserved for the records module.',
  },
};

export const DEFAULT_PLAYER_PROFILE_LAYOUT: PlayerProfileSectionEntry[] = [
  { id: 'header', visible: true },
  { id: 'bio', visible: true },
  { id: 'career', visible: true },
  { id: 'seasons', visible: true },
  { id: 'trend', visible: true },
  { id: 'recent', visible: true },
  { id: 'ranks', visible: true },
  { id: 't20', visible: true },
  { id: 'records', visible: true },
];

export const PLAYER_PROFILE_LAYOUT_STORAGE_KEY = 'tm-player-profile-layout-v1';

/** Retired section ids dropped from stored layouts on read. */
const RETIRED_SECTION_IDS = new Set(['teams', 'trend']);

function defaultLayout(): PlayerProfileLayoutConfig {
  return {
    version: 1,
    sections: DEFAULT_PLAYER_PROFILE_LAYOUT.map((s) => ({ ...s })),
  };
}

/**
 * Merge stored entries with defaults: drop retired/unknown ids, append new
 * defaults. The `recent` section slots in right after `seasons` so migrated
 * layouts keep the intended overview order.
 */
function sanitizeLayout(stored: PlayerProfileSectionEntry[] | null): PlayerProfileLayoutConfig {
  const base = defaultLayout();
  if (!stored || !Array.isArray(stored)) return base;
  const seen = new Set<string>();
  const sections: PlayerProfileSectionEntry[] = [];
  for (const entry of stored) {
    if (
      entry &&
      typeof entry.id === 'string' &&
      entry.id in PLAYER_PROFILE_LAYOUT_META &&
      !RETIRED_SECTION_IDS.has(entry.id) &&
      !seen.has(entry.id)
    ) {
      seen.add(entry.id);
      sections.push({
        id: entry.id as PlayerProfileSectionId,
        visible: entry.visible !== false,
      });
    }
  }
  // Missing defaults slot in right after their default predecessor so migrated
  // layouts keep the intended overview order.
  for (const def of DEFAULT_PLAYER_PROFILE_LAYOUT) {
    if (seen.has(def.id)) continue;
    const defIndex = DEFAULT_PLAYER_PROFILE_LAYOUT.findIndex((d) => d.id === def.id);
    let insertAt = sections.length;
    for (let i = defIndex - 1; i >= 0; i--) {
      const prevId = DEFAULT_PLAYER_PROFILE_LAYOUT[i].id;
      const at = sections.findIndex((s) => s.id === prevId);
      if (at >= 0) { insertAt = at + 1; break; }
    }
    sections.splice(insertAt, 0, { ...def });
    seen.add(def.id);
  }
  return { version: 1, sections };
}

let layoutCache: PlayerProfileLayoutConfig | null = null;
let hydrated = false;
let layoutVersion = 0;
const listeners = new Set<() => void>();

function notifyLayoutChanged(): void {
  layoutVersion += 1;
  listeners.forEach((l) => l());
}

function hydrateOnce(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(PLAYER_PROFILE_LAYOUT_STORAGE_KEY);
    if (!raw) {
      layoutCache = defaultLayout();
      return;
    }
    const parsed = JSON.parse(raw) as { sections?: PlayerProfileSectionEntry[] };
    layoutCache = sanitizeLayout(parsed?.sections ?? null);
  } catch {
    layoutCache = defaultLayout();
  }
}

function persist(): void {
  if (typeof window === 'undefined' || !layoutCache) return;
  try {
    window.localStorage.setItem(
      PLAYER_PROFILE_LAYOUT_STORAGE_KEY,
      JSON.stringify({ v: 1, sections: layoutCache.sections }),
    );
  } catch {
    /* quota / private mode — layout stays in memory only */
  }
}

export function subscribePlayerProfileLayout(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getPlayerProfileLayoutVersion(): number {
  return layoutVersion;
}

/** Current layout config; falls back to the default order when none stored. */
export function getPlayerProfileLayout(): PlayerProfileLayoutConfig {
  hydrateOnce();
  if (!layoutCache) layoutCache = defaultLayout();
  return layoutCache;
}

function writeLayout(sections: PlayerProfileSectionEntry[]): PlayerProfileLayoutConfig {
  layoutCache = sanitizeLayout(sections);
  persist();
  notifyLayoutChanged();
  return layoutCache;
}

export function setPlayerProfileSectionVisibility(
  id: PlayerProfileSectionId,
  visible: boolean,
): PlayerProfileLayoutConfig {
  const current = getPlayerProfileLayout();
  return writeLayout(current.sections.map((s) => (s.id === id ? { ...s, visible } : s)));
}

export function movePlayerProfileSection(fromIndex: number, toIndex: number): PlayerProfileLayoutConfig {
  const current = getPlayerProfileLayout();
  const sections = [...current.sections];
  if (fromIndex < 0 || fromIndex >= sections.length) return current;
  const clampedTo = Math.max(0, Math.min(sections.length - 1, toIndex));
  const moved = sections.splice(fromIndex, 1)[0];
  if (!moved) return current;
  sections.splice(clampedTo, 0, moved);
  return writeLayout(sections);
}

export function resetPlayerProfileLayout(): PlayerProfileLayoutConfig {
  return writeLayout(defaultLayout().sections);
}

export function isPlayerProfileSectionVisible(
  layout: PlayerProfileLayoutConfig,
  id: PlayerProfileSectionId,
): boolean {
  return layout.sections.some((s) => s.id === id && s.visible);
}

/** Whether the overview needs match rows (year-by-year / trend / recent). */
export function layoutNeedsPerfRows(layout: PlayerProfileLayoutConfig): boolean {
  return (
    isPlayerProfileSectionVisible(layout, 'recent') ||
    isPlayerProfileSectionVisible(layout, 'seasons') ||
    isPlayerProfileSectionVisible(layout, 'trend')
  );
}