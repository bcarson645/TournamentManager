import { buildModelledPriceMap } from './outrightPricing'
import {
  effectiveInputPrice,
  OUTRIGHT_TYPE_LABELS,
  type OutrightSelection,
  type TournamentOutright,
} from './outrightsStore'

const STORAGE_KEY = 'tm-outright-alerts'
const CHANGE_EVENT = 'outright-alerts-changed'

export interface OutrightAlertsSettings {
  enabled: boolean
  modelledDriftEnabled: boolean
  modelledDriftPercent: number
  overroundEnabled: boolean
  overroundThreshold: number
  bet365DriftEnabled: boolean
  bet365DriftPercent: number
  missingPricesEnabled: boolean
}

export interface OutrightAlert {
  id: string
  severity: 'warning' | 'info'
  marketId: string
  marketLabel: string
  message: string
}

type Store = Record<string, OutrightAlertsSettings>

let storeVersion = 0

export function getOutrightAlertsStoreVersion(): number {
  return storeVersion
}

export function subscribeOutrightAlertsStore(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    storeVersion++
    onChange()
  }
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

function notify(): void {
  if (typeof window === 'undefined') return
  storeVersion++
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

function defaultSettings(): OutrightAlertsSettings {
  return {
    enabled: true,
    modelledDriftEnabled: true,
    modelledDriftPercent: 15,
    overroundEnabled: true,
    overroundThreshold: 1.08,
    bet365DriftEnabled: true,
    bet365DriftPercent: 20,
    missingPricesEnabled: true,
  }
}

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

function writeAll(store: Store): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
  notify()
}

export function getOutrightAlertsSettings(tournamentId: string): OutrightAlertsSettings {
  const stored = readAll()[tournamentId]
  return stored ? { ...defaultSettings(), ...stored } : defaultSettings()
}

export function saveOutrightAlertsSettings(
  tournamentId: string,
  patch: Partial<OutrightAlertsSettings>,
): OutrightAlertsSettings {
  const store = readAll()
  const next = { ...getOutrightAlertsSettings(tournamentId), ...patch }
  store[tournamentId] = next
  writeAll(store)
  return next
}

function pctDrift(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0
  return (Math.abs(a - b) / b) * 100
}

function sumInversePrices(selections: OutrightSelection[]): number | undefined {
  let sum = 0
  let count = 0
  for (const selection of selections) {
    const price = effectiveInputPrice(selection)
    if (price !== undefined && price > 0) {
      sum += 1 / price
      count++
    }
  }
  return count > 0 ? sum : undefined
}

export function evaluateOutrightAlerts(
  tournamentId: string,
  outrights: TournamentOutright[],
  settings: OutrightAlertsSettings = getOutrightAlertsSettings(tournamentId),
): OutrightAlert[] {
  if (!settings.enabled) return []

  const alerts: OutrightAlert[] = []

  for (const outright of outrights) {
    const selections = outright.selections ?? []
    const marketLabel = OUTRIGHT_TYPE_LABELS[outright.type]
    const status = outright.status ?? 'inactive'

    if (settings.missingPricesEnabled && status !== 'published') {
      const missing = selections.filter((s) => effectiveInputPrice(s) === undefined)
      if (missing.length > 0) {
        alerts.push({
          id: `${outright.id}-missing`,
          severity: 'info',
          marketId: outright.marketId,
          marketLabel,
          message: `${missing.length} selection${missing.length === 1 ? '' : 's'} missing input price`,
        })
      } else if (missing.length === 0 && !outright.pricesConfirmed) {
        alerts.push({
          id: `${outright.id}-unconfirmed`,
          severity: 'info',
          marketId: outright.marketId,
          marketLabel,
          message: 'All input prices set but not confirmed',
        })
      }
    }

    if (settings.overroundEnabled) {
      const total = sumInversePrices(selections)
      if (total !== undefined && total > settings.overroundThreshold) {
        alerts.push({
          id: `${outright.id}-overround`,
          severity: 'warning',
          marketId: outright.marketId,
          marketLabel,
          message: `Implied total ${total.toFixed(3)} exceeds ${settings.overroundThreshold.toFixed(2)}`,
        })
      }
    }

    const modelledPrices = buildModelledPriceMap(tournamentId, outright.type, selections)

    for (const selection of selections) {
      const input = effectiveInputPrice(selection)
      const modelled = modelledPrices[selection.id]
      const bet365 = selection.bet365

      if (
        settings.modelledDriftEnabled &&
        input !== undefined &&
        modelled !== undefined &&
        modelled > 0 &&
        pctDrift(input, modelled) > settings.modelledDriftPercent
      ) {
        alerts.push({
          id: `${outright.id}-${selection.id}-modelled`,
          severity: 'warning',
          marketId: outright.marketId,
          marketLabel,
          message: `${selection.label}: input ${input.toFixed(2)} vs modelled ${modelled.toFixed(2)} (${pctDrift(input, modelled).toFixed(0)}% drift)`,
        })
      }

      if (
        settings.bet365DriftEnabled &&
        input !== undefined &&
        bet365 !== undefined &&
        bet365 > 0 &&
        pctDrift(input, bet365) > settings.bet365DriftPercent
      ) {
        alerts.push({
          id: `${outright.id}-${selection.id}-bet365`,
          severity: 'warning',
          marketId: outright.marketId,
          marketLabel,
          message: `${selection.label}: input ${input.toFixed(2)} vs Bet365 ${bet365.toFixed(2)} (${pctDrift(input, bet365).toFixed(0)}% drift)`,
        })
      }
    }
  }

  return alerts
}
