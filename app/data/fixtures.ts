import { Team } from './teams'

export interface Fixture {
  id: string
  matchday: number
  date: string
  homeTeam: string
  awayTeam: string
  stage: 'group' | 'semi' | 'final'
}

/**
 * Generate a full round-robin (home & away) fixture list
 * plus TBC semi-finals and final.
 * Dates start from a base date and space matches 2-3 days apart.
 */
export function generateFixtures(teams: Team[], tournamentId: string): Fixture[] {
  if (teams.length < 2) return []

  const fixtures: Fixture[] = []
  const baseDate = new Date(2026, 2, 15) // 15 March 2026
  let matchday = 0

  const teamNames = teams.map((t) => t.name)
  const n = teamNames.length

  // Round-robin scheduling using the circle method
  const slots = [...teamNames]
  // If odd number of teams, add a BYE
  if (n % 2 !== 0) slots.push('BYE')
  const numSlots = slots.length
  const rounds: { home: string; away: string }[][] = []

  for (let round = 0; round < numSlots - 1; round++) {
    const roundFixtures: { home: string; away: string }[] = []
    for (let i = 0; i < numSlots / 2; i++) {
      const home = slots[i]
      const away = slots[numSlots - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        roundFixtures.push({ home, away })
      }
    }
    rounds.push(roundFixtures)
    // Rotate: fix first element, rotate rest
    const last = slots.pop()!
    slots.splice(1, 0, last)
  }

  // First leg (home)
  for (const roundFixtures of rounds) {
    matchday++
    const matchDate = new Date(baseDate)
    matchDate.setDate(baseDate.getDate() + (matchday - 1) * 3)

    for (const f of roundFixtures) {
      fixtures.push({
        id: `${tournamentId}-md${matchday}-${f.home}-${f.away}`.replace(/[^a-zA-Z0-9-]/g, ''),
        matchday,
        date: formatDate(matchDate),
        homeTeam: f.home,
        awayTeam: f.away,
        stage: 'group',
      })
    }
  }

  // Second leg (reverse home/away)
  for (const roundFixtures of rounds) {
    matchday++
    const matchDate = new Date(baseDate)
    matchDate.setDate(baseDate.getDate() + (matchday - 1) * 3)

    for (const f of roundFixtures) {
      fixtures.push({
        id: `${tournamentId}-md${matchday}-${f.away}-${f.home}`.replace(/[^a-zA-Z0-9-]/g, ''),
        matchday,
        date: formatDate(matchDate),
        homeTeam: f.away,
        awayTeam: f.home,
        stage: 'group',
      })
    }
  }

  // Semi-finals
  matchday++
  const semiDate1 = new Date(baseDate)
  semiDate1.setDate(baseDate.getDate() + (matchday - 1) * 3)

  fixtures.push({
    id: `${tournamentId}-sf1`,
    matchday,
    date: formatDate(semiDate1),
    homeTeam: 'TBC',
    awayTeam: 'TBC',
    stage: 'semi',
  })
  fixtures.push({
    id: `${tournamentId}-sf2`,
    matchday,
    date: formatDate(semiDate1),
    homeTeam: 'TBC',
    awayTeam: 'TBC',
    stage: 'semi',
  })

  // Final
  matchday++
  const finalDate = new Date(baseDate)
  finalDate.setDate(baseDate.getDate() + (matchday - 1) * 3)

  fixtures.push({
    id: `${tournamentId}-final`,
    matchday,
    date: formatDate(finalDate),
    homeTeam: 'TBC',
    awayTeam: 'TBC',
    stage: 'final',
  })

  return fixtures
}

function formatDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = d.getDate()
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th'
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`
}
