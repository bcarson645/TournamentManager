const STORAGE_KEY = 'tm-fixture-price-history'

export interface FixturePricePoint {
  at: number
  homeWinProb: number
}

type Store = Record<string, FixturePricePoint[]>

function readAll(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Store
  } catch {
    return {}
  }
}

function writeAll(all: Store): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function seedHistory(fixtureId: string, homeWinProb: number): FixturePricePoint[] {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const points: FixturePricePoint[] = []
  let p = Math.min(0.92, Math.max(0.08, homeWinProb + 0.06))
  for (let i = 14; i >= 0; i--) {
    const drift = (homeWinProb - p) * 0.12
    p = Math.min(0.95, Math.max(0.05, p + drift + (Math.sin(i * 0.7) * 0.015)))
    points.push({ at: now - i * day, homeWinProb: Math.round(p * 1000) / 1000 })
  }
  points.push({ at: now, homeWinProb: Math.round(homeWinProb * 1000) / 1000 })
  return points
}

export function getFixturePriceHistory(fixtureId: string, homeWinProb: number): FixturePricePoint[] {
  const all = readAll()
  let series = all[fixtureId]
  if (!series || series.length === 0) {
    series = seedHistory(fixtureId, homeWinProb)
    all[fixtureId] = series
    writeAll(all)
    return series
  }
  const last = series[series.length - 1]!
  if (Math.abs(last.homeWinProb - homeWinProb) > 0.002) {
    series = [...series, { at: Date.now(), homeWinProb: Math.round(homeWinProb * 1000) / 1000 }].slice(-48)
    all[fixtureId] = series
    writeAll(all)
  }
  return series
}
