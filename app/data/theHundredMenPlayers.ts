import { TEAMS } from './teams'

/**
 * The Hundred (Men) — single source of truth for `t20-m-hundred` squads.
 * Team ids match `makeTeam('hundred', name)` in `teams.ts` (`hundred-{slug}`).
 * `squad.ts` merges this into `KNOWN_PLAYERS`; do not duplicate rosters elsewhere.
 *
 * Reuse the same display name on other teams — `getProfileForPlayer(name)` is global.
 */

export const THE_HUNDRED_MEN_SQUADS: Record<string, string[]> = {
  'hundred-birmingham-phoenix': [
    'Jacob Bethell',
    'Rehan Ahmed',
    'Donovan Ferreira',
    'Mitchell Owen',
    'Saqib Mahmood',
    'Usman Tariq',
    'Scott Currie',
    'Joe Clarke',
    'Laurie Evans',
    'Ethan Brookes',
    'Chris Wood',
    'Jordan Thompson',
    'Will Smeed',
    'Mustafizur Rahman',
  ],

  'hundred-london-spirit': [
    'James Coles',
    'Liam Livingstone',
    'Jamie Overton',
    'Adam Zampa',
    'Dewald Brevis',
    'Jonny Bairstow',
    'Tymal Mills',
    'David Willey',
    'Adam Milne',
    'Mason Crane',
    'Adam Hose',
    'James Rew',
    'Lhuan-dre Pretorius',
    'Matt Fisher',
  ],

  'hundred-manchester-originals': [
    'Jos Buttler',
    'Heinrich Klaasen',
    'Noor Ahmad',
    'Aiden Markram',
    'Josh Tongue',
    'Liam Dawson',
    'Leus du Plooy',
    'Tim Seifert',
    'Sonny Baker',
    'Gus Atkinson',
    'Tom Moores',
    'Tawanda Muyeye',
  ],

  'hundred-oval-invincibles': [
    'Will Jacks',
    'Rashid Khan',
    'Sam Curran',
    'Nicholas Pooran',
    'Trent Boult',
    'Tom Curran',
    'Nathan Sowter',
    'James Vince',
    'Sherfane Rutherford',
    'Richard Gleeson',
    'Ollie Pope',
    'Olly Stone',
    'Callum Parkinson',
    'Jason Roy',
  ],

  'hundred-southern-brave': [
    'Jamie Smith',
    'Marcus Stoinis',
    'Tristan Stubbs',
    'Jofra Archer',
    'Chris Jordan',
    'Adil Rashid',
    'David Miller',
    'Luke Wood',
    'Ben McKinney',
    'Michael Pepper',
    'Tom Abell',
    'Dan Worrall',
    'Caleb Falconer',
    'Nikhil Chaudhary',
  ],

  'hundred-northern-superchargers': [
    'Harry Brook',
    'Brydon Carse',
    'Nathan Ellis',
    'Mitchell Marsh',
    'Abrar Ahmed',
    'Ben Stokes',
    'Ollie Robinson',
    'Adam Lyth',
    'Ben Raine',
    'John Simpson',
    'Matthew Potts',
    'Saad Nasim',
  ],

  'hundred-trent-rockets': [
    'Tim David',
    'Ben Duckett',
    'Mitchell Santner',
    'Tom Banton',
    'Finn Allen',
    'Lewis Gregory',
    'Craig Overton',
    'David Payne',
    'Dan Mousley',
    'Matt Henry',
    'Sam Billings',
    'Aneurin Donald',
    'Louis Kimber',
    'Danny Briggs',
  ],

  'hundred-welsh-fire': [
    'Marco Jansen',
    'Phil Salt',
    'Rachin Ravindra',
    'Chris Woakes',
    'Jordan Cox',
    'Tom Kohler-Cadmore',
    'Joe Root',
    'Lockie Ferguson',
    'Matt Short',
    'Sam Cook',
    'Asa Tribe',
    'Tom Aspinwall',
    'Jaffer Chohan',
  ],
}

const _hundredMenTeamIds = TEAMS['t20-m-hundred']?.map((t) => t.id) ?? []
for (const id of _hundredMenTeamIds) {
  if (!THE_HUNDRED_MEN_SQUADS[id]?.length) {
    throw new Error(`[theHundredMenPlayers] Missing non-empty squad for team: ${id}`)
  }
}
for (const id of Object.keys(THE_HUNDRED_MEN_SQUADS)) {
  if (!_hundredMenTeamIds.includes(id)) {
    throw new Error(`[theHundredMenPlayers] Squad entry not in TEAMS t20-m-hundred: ${id}`)
  }
}

/** Sorted unique names — usable for autocomplete, exports, or future shared DB seed */
export function getAllTheHundredMenPlayerNames(): string[] {
  const names = new Set<string>()
  for (const roster of Object.values(THE_HUNDRED_MEN_SQUADS)) {
    for (const n of roster) names.add(n)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
