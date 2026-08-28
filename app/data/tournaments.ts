export type CricketFormat = 't20' | 'lista' | 'firstclass' | 't10' | 'srl' | 'other'
export type Gender = 'men' | 'women'

export interface Tournament {
  id: string
  name: string
  country?: string
}

export interface FormatInfo {
  key: CricketFormat
  label: string
  description: string
  icon: string
}

export const FORMATS: FormatInfo[] = [
  { key: 't20', label: 'T20', description: '20 overs per side', icon: '⚡' },
  { key: 'lista', label: 'List A', description: '50 overs per side', icon: '🏏' },
  { key: 'firstclass', label: 'First Class', description: 'Multi-day matches', icon: '🏟️' },
  { key: 't10', label: 'T10', description: '10 overs per side', icon: '🔥' },
  { key: 'srl', label: 'SRL', description: 'Simulated Reality League', icon: '🎮' },
  { key: 'other', label: 'Other', description: 'Additional formats', icon: '📋' },
]

/** Typical scheduled overs per innings for squad allocation checks (totals row). */
export function scheduledInningsOversForFormat(format: CricketFormat): number {
  switch (format) {
    case 't10':
      return 10
    case 't20':
      return 20
    case 'lista':
      return 50
    case 'firstclass':
      return 90
    case 'srl':
    case 'other':
    default:
      return 20
  }
}

export const GENDERS: { key: Gender; label: string; icon: string }[] = [
  { key: 'men', label: "Men's", icon: '♂' },
  { key: 'women', label: "Women's", icon: '♀' },
]

export const TOURNAMENTS: Record<CricketFormat, Record<Gender, Tournament[]>> = {
  t20: {
    men: [
      { id: 't20-m-intl', name: 'International' },
      { id: 't20-m-ipl', name: 'IPL', country: 'India' },
      { id: 't20-m-bbl', name: 'BBL', country: 'Australia' },
      { id: 't20-m-hundred', name: 'The Hundred', country: 'England' },
      { id: 't20-m-blast', name: 'The Blast', country: 'England' },
      { id: 't20-m-cpl', name: 'CPL', country: 'Caribbean' },
      { id: 't20-m-etpl', name: 'European T20 Premier League', country: 'Europe' },
      { id: 't20-m-sa', name: 'SA20', country: 'South Africa' },
    ],
    women: [
      { id: 't20-w-intl', name: 'International' },
      { id: 't20-w-wipl', name: 'WIPL', country: 'India' },
      { id: 't20-w-wbbl', name: 'WBBL', country: 'Australia' },
      { id: 't20-w-whundred', name: 'The Hundred', country: 'England' },
    ],
  },
  lista: {
    men: [
      { id: 'la-m-odi', name: 'ODI' },
      { id: 'la-m-eng', name: 'England', country: 'England' },
      { id: 'la-m-aus', name: 'Australia', country: 'Australia' },
      { id: 'la-m-nz', name: 'New Zealand', country: 'New Zealand' },
      { id: 'la-m-ind', name: 'India', country: 'India' },
    ],
    women: [
      { id: 'la-w-odi', name: 'ODI' },
      { id: 'la-w-eng', name: 'England', country: 'England' },
      { id: 'la-w-aus', name: 'Australia', country: 'Australia' },
      { id: 'la-w-nz', name: 'New Zealand', country: 'New Zealand' },
      { id: 'la-w-ind', name: 'India', country: 'India' },
    ],
  },
  firstclass: {
    men: [
      { id: 'fc-m-test', name: 'Test Cricket' },
      { id: 'fc-m-county', name: 'County Championship', country: 'England' },
      { id: 'fc-m-sheffield', name: 'Sheffield Shield', country: 'Australia' },
      { id: 'fc-m-ranji', name: 'Ranji Trophy', country: 'India' },
    ],
    women: [
      { id: 'fc-w-test', name: 'Test Cricket' },
    ],
  },
  t10: {
    men: [
      { id: 't10-m-ecn', name: 'ECN' },
    ],
    women: [
      { id: 't10-w-wecn', name: 'WECN' },
    ],
  },
  srl: {
    men: [
      { id: 'srl-m-ipl', name: 'IPL SRL', country: 'India' },
      { id: 'srl-m-cpl', name: 'CPL SRL', country: 'Caribbean' },
      { id: 'srl-m-sa20', name: 'SA20 SRL', country: 'South Africa' },
    ],
    women: [],
  },
  other: {
    men: [
      { id: 'other-m-tbc', name: 'TBC' },
    ],
    women: [],
  },
}

/** Every tournament with its format and gender (for search / upcoming lists). */
export function getAllTournamentEntries(): {
  format: CricketFormat
  gender: Gender
  tournament: Tournament
}[] {
  const out: { format: CricketFormat; gender: Gender; tournament: Tournament }[] = []
  for (const fmt of Object.keys(TOURNAMENTS) as CricketFormat[]) {
    for (const g of Object.keys(TOURNAMENTS[fmt]) as Gender[]) {
      for (const t of TOURNAMENTS[fmt][g]) {
        out.push({ format: fmt, gender: g, tournament: t })
      }
    }
  }
  return out
}
