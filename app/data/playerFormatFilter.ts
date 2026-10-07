import { getAllTournamentEntries } from './tournaments';

/**
 * Format filter for the full-screen player profile.
 *
 * The local dataset is T20-only, so career aggregates are always T20 numbers:
 * callers must label non-T20 selections as best-available (see
 * `careerSourceNote`). Match rows carry a `competitionId` which resolves to a
 * format through the competition → tournament mapping when one exists;
 * unmapped competitions are treated as T20 and disclosed in the UI.
 */

export type PlayerFormatChoice = 'all' | 't20' | 'odi' | 'test' | 'fc';

/** Resolved format bucket for a single match row. */
export type PlayerRowFormat = 't20' | 'odi' | 'test' | 'fc' | 'other' | 'unknown';

export const PLAYER_FORMAT_CHOICES: { id: PlayerFormatChoice; label: string; hint: string }[] = [
  { id: 'all', label: 'All', hint: 'All formats in the local dataset' },
  { id: 't20', label: 'T20', hint: 'T20 dataset numbers' },
  { id: 'odi', label: 'ODI', hint: 'Best available (dataset holds T20 only)' },
  { id: 'test', label: 'TEST', hint: 'Best available (dataset holds T20 only)' },
  { id: 'fc', label: 'FC', hint: 'Best available (dataset holds T20 only)' },
];

export interface CompetitionFormatRef {
  competitionId: string;
  tournamentId: string | null;
}

/** Map a dataset competition to a format bucket via its mapped tournament. */
export function competitionFormatFor(
  competitionId: string | null,
  competitions: CompetitionFormatRef[],
): PlayerRowFormat {
  if (!competitionId) return 'unknown';
  const comp = competitions.find((c) => c.competitionId === competitionId);
  if (!comp || !comp.tournamentId) return 'unknown';
  const entry = getAllTournamentEntries().find((e) => e.tournament.id === comp.tournamentId);
  if (!entry) return 'unknown';
  switch (entry.format) {
    case 't20':
      return 't20';
    case 'lista':
      return 'odi';
    case 'firstclass':
      return 'fc';
    default:
      return 'other';
  }
}

/** Whether a row bucket passes the selected format filter. */
export function rowPassesFormatFilter(bucket: PlayerRowFormat, choice: PlayerFormatChoice): boolean {
  if (choice === 'all') return true;
  // Unmapped dataset rows come from the T20 database; count them as T20.
  if (bucket === 'unknown') return choice === 't20';
  if (choice === 't20') return bucket === 't20';
  return bucket === choice;
}

/** Career aggregates in the dataset are T20 numbers; label them honestly. */
export function careerSourceNote(choice: PlayerFormatChoice): { title: string; bestAvailable: boolean } {
  switch (choice) {
    case 't20':
      return { title: 'T20 career · dataset', bestAvailable: false };
    case 'all':
      return { title: 'Career · all formats in dataset', bestAvailable: false };
    default:
      return { title: 'Best available: T20 data · dataset holds T20 only', bestAvailable: true };
  }
}

export function formatChoiceLabel(choice: PlayerFormatChoice): string {
  return PLAYER_FORMAT_CHOICES.find((c) => c.id === choice)?.label ?? 'All';
}