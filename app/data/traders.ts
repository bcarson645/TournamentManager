export interface Trader {
  id: string
  name: string
}

function traderId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function t(name: string): Trader {
  return { id: traderId(name), name }
}

export const DEFAULT_TRADERS: Trader[] = [
  t('Dyer'),
  t('Moore'),
  t('Perry'),
  t('Paul'),
  t('Collinson'),
  t('Cooper'),
  t('Ewins'),
  t('Moen'),
  t('Wolff'),
]

/** @deprecated Use DEFAULT_TRADERS */
export const SCHEDULE_TRADERS = DEFAULT_TRADERS

/** Default trader for My rota / trader preview (Dyer when present). */
export function getDefaultPreviewTraderName(): string {
  const dyer = DEFAULT_TRADERS.find((t) => t.name === 'Dyer')
  return dyer?.name ?? DEFAULT_TRADERS[0]?.name ?? 'Dyer'
}
