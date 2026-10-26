/** ISO 3166-1 alpha-2 → flag emoji (works for national sides and franchise home countries). */
const COUNTRY_CODE: Record<string, string> = {
  England: 'GB',
  Wales: 'GB',
  Scotland: 'GB',
  Ireland: 'IE',
  India: 'IN',
  Australia: 'AU',
  Pakistan: 'PK',
  'South Africa': 'ZA',
  'New Zealand': 'NZ',
  'Sri Lanka': 'LK',
  'West Indies': 'JM',
  Bangladesh: 'BD',
  Afghanistan: 'AF',
  Zimbabwe: 'ZW',
  Netherlands: 'NL',
  Nepal: 'NP',
  UAE: 'AE',
  'United States': 'US',
  Canada: 'CA',
}

function codeToFlag(iso: string): string {
  if (iso.length !== 2) return '🏳️'
  const a = 0x1f1e6 - 65 + iso.charCodeAt(0)
  const b = 0x1f1e6 - 65 + iso.charCodeAt(1)
  return String.fromCodePoint(a, b)
}

export function flagForCountry(country: string | undefined): string {
  if (!country?.trim()) return '🏏'
  const iso = COUNTRY_CODE[country.trim()]
  if (iso) return codeToFlag(iso)
  return '🏳️'
}

export function inferTeamCountry(teamName: string, explicit?: string): string | undefined {
  if (explicit) return explicit
  for (const c of Object.keys(COUNTRY_CODE)) {
    if (teamName.includes(c)) return c
  }
  return undefined
}
