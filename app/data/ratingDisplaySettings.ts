/**
 * Persisted preference for how many decimal places to **show** on squad bat/bowl ratings.
 * Underlying values are stored at `RATING_STORED_DECIMAL_PLACES` in `ratingBenchmarks.ts` (2 dp).
 */

const STORAGE_KEY = 'tm-squad-rating-dp'

export type SquadRatingDecimalPlaces = 0 | 1 | 2

export function readSquadRatingDp(): SquadRatingDecimalPlaces {
  if (typeof window === 'undefined') return 1
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === '0' || v === '1' || v === '2') return Number(v) as SquadRatingDecimalPlaces
  return 1
}

export function writeSquadRatingDp(dp: SquadRatingDecimalPlaces): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, String(dp))
}

export function formatSquadRatingDisplay(value: number, dp: SquadRatingDecimalPlaces): string {
  if (!Number.isFinite(value)) return '–'
  return value.toFixed(dp)
}
