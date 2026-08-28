export function roundOdds(n: number): number {
  return Math.round(n * 100) / 100
}

/** Fair decimal odds from true probability (no margin). */
export function probabilityToFairOdds(prob: number): number | undefined {
  if (!Number.isFinite(prob) || prob <= 0) return undefined
  return roundOdds(1 / prob)
}

export function clampBookPrice(
  price: number,
  minimumPrice: number,
  maximumPrice: number,
): number {
  const floor = Number.isFinite(minimumPrice) && minimumPrice > 1 ? minimumPrice : 1.01
  const ceiling = Number.isFinite(maximumPrice) && maximumPrice > floor ? maximumPrice : floor
  return roundOdds(Math.min(ceiling, Math.max(floor, price)))
}

/** Sum of implied probabilities (1/decimal odds) across a market. */
export function sumImpliedFromOdds(odds: Array<number | undefined>): number {
  let sum = 0
  for (const price of odds) {
    if (price !== undefined && price > 0) sum += 1 / price
  }
  return sum
}

export interface BookOddsMarketResult {
  odds: Array<number | undefined>
  fairProbabilitySum: number
  targetImpliedTotal: number
  impliedTotal: number
  /** Excess implied probability above the fair sum, in percentage points (e.g. 10 = 110% total on a 100% fair book). */
  overroundPctPoints: number
}

/**
 * Apply bookmaker overround to a full outright market.
 * Each fair probability is inflated by (1 + margin%) so sum(implied) = sum(fair) * (1 + margin%).
 * Equivalent to bookOdds = fairOdds / (1 + margin%) — prices get shorter as margin rises.
 */
export function fairProbabilitiesToBookOdds(
  fairProbabilities: number[],
  marginPct: number,
  minimumPrice: number,
  maximumPrice: number,
): Array<number | undefined> {
  return fairProbabilitiesToBookOddsMarket(fairProbabilities, marginPct, minimumPrice, maximumPrice).odds
}

export function fairProbabilitiesToBookOddsMarket(
  fairProbabilities: number[],
  marginPct: number,
  minimumPrice: number,
  maximumPrice: number,
): BookOddsMarketResult {
  const marginFactor = 1 + Math.max(0, marginPct) / 100
  const fairSum = fairProbabilities.reduce((sum, prob) => sum + (prob > 0 ? prob : 0), 0)

  if (fairSum <= 0) {
    return {
      odds: fairProbabilities.map(() => undefined),
      fairProbabilitySum: 0,
      targetImpliedTotal: 0,
      impliedTotal: 0,
      overroundPctPoints: 0,
    }
  }

  const targetImpliedTotal = fairSum * marginFactor

  let odds = fairProbabilities.map((prob) => {
    if (!Number.isFinite(prob) || prob <= 0) return undefined
    const bookProb = prob * marginFactor
    return clampBookPrice(1 / bookProb, minimumPrice, maximumPrice)
  })

  let impliedTotal = sumImpliedFromOdds(odds)

  if (impliedTotal > 0 && Math.abs(impliedTotal - targetImpliedTotal) > 0.0005) {
    const scale = impliedTotal / targetImpliedTotal
    odds = odds.map((price) => {
      if (price === undefined) return undefined
      return clampBookPrice(price * scale, minimumPrice, maximumPrice)
    })
    impliedTotal = sumImpliedFromOdds(odds)
  }

  const overroundPctPoints = fairSum > 0 ? ((impliedTotal / fairSum) - 1) * 100 : 0

  return {
    odds,
    fairProbabilitySum: fairSum,
    targetImpliedTotal,
    impliedTotal,
    overroundPctPoints,
  }
}

/** Single-selection helper when only one fair probability is known (treats market fair sum as 1). */
export function probabilityToBookOdds(
  prob: number,
  marginPct: number,
  minimumPrice: number,
  maximumPrice: number,
): number | undefined {
  const result = fairProbabilitiesToBookOddsMarket([prob], marginPct, minimumPrice, maximumPrice)
  return result.odds[0]
}
