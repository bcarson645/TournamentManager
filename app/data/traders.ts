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
  t('Moore'),
  t('Cooper'),
  t('Collinson'),
  t('Dyer'),
  t('Ewins'),
  t('Paul'),
  t('Lindsey'),
  t('Perry'),
  t('Saigal'),
  t('Stock'),
  t('Pittom'),
  t('Hobbs'),
  t('Damley-J'),
  t('Dixon'),
  t('Plews'),
  t('Jayakumar'),
  t('Moen'),
  t('Wolff'),
  t('Nesbitt'),
  t('Nothman'),
  t('Jackson'),
  t('Burrows'),
  t('Scammell'),
  t('Horler'),
  t('Coleman'),
  t('Rushworth'),
  t('McGreal'),
  t('Palmer'),
  t('Daly-J'),
  t('Schofield'),
  t('Thompson'),
  t('Harwood'),
  t('Aurangzeb'),
  t('Faisal'),
  t('Bharadhwaj'),
  t('Canavan'),
  t('Manila'),
  t('Malik'),
  t('Winzor'),
]
