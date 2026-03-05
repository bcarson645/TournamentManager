export interface PositionBenchmark {
  btCaz: number
  raw: number
  sr: number
}

const BENCHMARKS: PositionBenchmark[] = [
  { btCaz: 30, raw: 35, sr: 140 },  // Position 1
  { btCaz: 30, raw: 35, sr: 140 },  // Position 2
  { btCaz: 35, raw: 30, sr: 135 },  // Position 3
  { btCaz: 28, raw: 25, sr: 145 },  // Position 4
  { btCaz: 28, raw: 25, sr: 145 },  // Position 5
  { btCaz: 22, raw: 20, sr: 155 },  // Position 6
  { btCaz: 18, raw: 15, sr: 145 },  // Position 7
  { btCaz: 12, raw: 10, sr: 130 },  // Position 8
  { btCaz: 12, raw: 10, sr: 130 },  // Position 9
  { btCaz: 5,  raw: 5,  sr: 100 },  // Position 10
  { btCaz: 5,  raw: 5,  sr: 100 },  // Position 11
]

const WEIGHTS = {
  btCaz: 0.20,
  raw: 0.25,
  sr: 0.55,
}

const PENALTY_DAMPENING: number[] = [
  1.0,   // Position 1
  1.0,   // Position 2
  1.0,   // Position 3
  0.85,  // Position 4
  0.85,  // Position 5
  0.7,   // Position 6
  0.55,  // Position 7
  0.35,  // Position 8
  0.35,  // Position 9
  0.2,   // Position 10
  0.2,   // Position 11
]

const BONUS_DAMPENING: number[] = [
  1.0,   // Position 1
  1.0,   // Position 2
  1.0,   // Position 3
  0.9,   // Position 4
  0.9,   // Position 5
  0.75,  // Position 6
  0.6,   // Position 7
  0.4,   // Position 8
  0.4,   // Position 9
  0.25,  // Position 10
  0.25,  // Position 11
]

export function getBenchmark(position: number): PositionBenchmark {
  const idx = Math.max(0, Math.min(position - 1, BENCHMARKS.length - 1))
  return BENCHMARKS[idx]
}

export function calculateBatRating(btCaz: number, raw: number, sr: number, position: number): number {
  const bench = getBenchmark(position)

  if (btCaz === 0 && raw === 0 && sr === 0) return 0

  const cazScore = bench.btCaz > 0 ? (btCaz - bench.btCaz) / bench.btCaz : 0
  const rawScore = bench.raw > 0 ? (raw - bench.raw) / bench.raw : 0
  const srScore = bench.sr > 0 ? (sr - bench.sr) / bench.sr : 0

  let composite = (cazScore * WEIGHTS.btCaz) + (rawScore * WEIGHTS.raw) + (srScore * WEIGHTS.sr)

  const idx = Math.max(0, Math.min(position - 1, PENALTY_DAMPENING.length - 1))
  if (composite < 0) {
    composite *= PENALTY_DAMPENING[idx]
  } else {
    composite *= BONUS_DAMPENING[idx]
  }

  // Scale: max ~30, can go negative when below benchmark
  return Math.round(composite * 300) / 10
}

const BOWL_BENCH = { econ: 8.0, sr: 20, avg: 24 }
const BOWL_WEIGHTS = { econ: 0.45, sr: 0.35, avg: 0.20 }

export function calculateBowlRating(econ: number, bowlSr: number, bowlAvg: number, overs: number): number {
  // No rating if any of overs, econ, sr is blank
  if (overs <= 0 || econ <= 0 || bowlSr <= 0) return NaN

  const econScore = BOWL_BENCH.econ > 0 ? (BOWL_BENCH.econ - econ) / BOWL_BENCH.econ : 0
  const srScore = BOWL_BENCH.sr > 0 ? (BOWL_BENCH.sr - bowlSr) / BOWL_BENCH.sr : 0
  const avgScore = BOWL_BENCH.avg > 0 ? (BOWL_BENCH.avg - bowlAvg) / BOWL_BENCH.avg : 0

  let composite = (econScore * BOWL_WEIGHTS.econ) + (srScore * BOWL_WEIGHTS.sr) + (avgScore * BOWL_WEIGHTS.avg)

  const oversMultiplier = Math.min(overs, 4) / 4
  composite *= oversMultiplier

  // Scale: max ~30, can go negative when below benchmark
  return Math.round(composite * 300) / 10
}
