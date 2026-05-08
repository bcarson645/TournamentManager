/**
 * Persisted preference for how many decimal places to **show** on squad bat/bowl ratings.
 * Underlying values are stored at `RATING_STORED_DECIMAL_PLACES` in `ratingBenchmarks.ts` (2 dp).
 */

const STORAGE_KEY = 'tm-squad-rating-dp'
const STORAGE_KEY_VALUE_STEPPERS = 'tm-squad-value-steppers'
const STORAGE_KEY_HIDE_BAT_RAW = 'tm-squad-hide-bat-raw-cols'
const STORAGE_KEY_DASH_BAT_METRIC = 'tm-dash-bat-rank-metric'
const STORAGE_KEY_DASH_BOWL_METRIC = 'tm-dash-bowl-rank-metric'

export type DashboardBatMetric = 'batRating' | 'btCaz' | 'srCaz'
export type DashboardBowlMetric = 'bowlRating' | 'bowlAvg' | 'econ' | 'bowlBpw'

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

export function readSquadValueSteppers(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_VALUE_STEPPERS) === '1'
}

export function writeSquadValueSteppers(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_VALUE_STEPPERS, enabled ? '1' : '0')
}

/** Hide “Raw” (effective average) and “RAW ADJ” columns on squad tables. */
export function readSquadHideBatRawColumns(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_HIDE_BAT_RAW) === '1'
}

export function writeSquadHideBatRawColumns(hide: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_HIDE_BAT_RAW, hide ? '1' : '0')
}

export function formatSquadRatingDisplay(value: number, dp: SquadRatingDecimalPlaces): string {
  if (!Number.isFinite(value)) return '–'
  return value.toFixed(dp)
}

const BAT_METRICS: DashboardBatMetric[] = ['batRating', 'btCaz', 'srCaz']
const BOWL_METRICS: DashboardBowlMetric[] = ['bowlRating', 'bowlAvg', 'econ', 'bowlBpw']

export function readDashboardBatMetric(): DashboardBatMetric {
  if (typeof window === 'undefined') return 'batRating'
  const v = localStorage.getItem(STORAGE_KEY_DASH_BAT_METRIC)
  return BAT_METRICS.includes(v as DashboardBatMetric) ? (v as DashboardBatMetric) : 'batRating'
}

export function writeDashboardBatMetric(m: DashboardBatMetric): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_DASH_BAT_METRIC, m)
}

export function readDashboardBowlMetric(): DashboardBowlMetric {
  if (typeof window === 'undefined') return 'bowlRating'
  const v = localStorage.getItem(STORAGE_KEY_DASH_BOWL_METRIC)
  return BOWL_METRICS.includes(v as DashboardBowlMetric) ? (v as DashboardBowlMetric) : 'bowlRating'
}

export function writeDashboardBowlMetric(m: DashboardBowlMetric): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_DASH_BOWL_METRIC, m)
}

/** UI label for metric selectors (dashboard + team ribbon). */
export function dashboardBatMetricOptionLabel(m: DashboardBatMetric): string {
  if (m === 'batRating') return 'Rating'
  if (m === 'btCaz') return 'Bat.CAZ'
  return 'SR'
}

export function dashboardBowlMetricOptionLabel(m: DashboardBowlMetric): string {
  if (m === 'bowlRating') return 'Rating'
  if (m === 'bowlAvg') return 'Average'
  if (m === 'econ') return 'Econ'
  return 'Bowl SR'
}

export function formatDashboardBatMetricValue(m: DashboardBatMetric, n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (m === 'btCaz') return n.toFixed(2)
  if (m === 'srCaz') return n.toFixed(1)
  return n.toFixed(1)
}

export function formatDashboardBowlMetricValue(m: DashboardBowlMetric, n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (m === 'bowlRating') return n.toFixed(1)
  if (m === 'bowlBpw') return n.toFixed(1)
  return n.toFixed(2)
}

export function dashboardBowlMetricValueSemantics(
  m: DashboardBowlMetric,
): 'higher-better' | 'lower-better' {
  return m === 'bowlRating' ? 'higher-better' : 'lower-better'
}

/**
 * Par-index team totals: 1.0 is parity. Above → green (`rating-pos`), below → red (`rating-neg`).
 */
export function teamAggregateRatingClass(n: number): 'rating-pos' | 'rating-neg' | '' {
  if (!Number.isFinite(n)) return ''
  if (n > 1) return 'rating-pos'
  if (n < 1) return 'rating-neg'
  return ''
}
