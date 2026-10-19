import type { MonitoringFixture } from './monitoringDemoData'

export type MonitoringClientMarketGroup = 'match' | 'innings' | 'session' | 'player'

export interface MonitoringClientMarketOddsRow {
  aLabel: string
  aPrice: string
  bLabel?: string
  bPrice?: string
  cLabel?: string
  cPrice?: string
}

export interface MonitoringClientMarket {
  key: string
  marketId: string
  name: string
  group: MonitoringClientMarketGroup
  clientActive: boolean
  isNew?: boolean
  rows: MonitoringClientMarketOddsRow[]
}

function id(seed: number, fixtureSuffix: string): string {
  return `${seed}_${fixtureSuffix}`
}

function ashesMarkets(suffix: string): MonitoringClientMarket[] {
  return [
    {
      key: 'root-dismissal',
      marketId: id(1534517, suffix),
      name: 'Root, J 1st Innings Method of Dismissal',
      group: 'player',
      clientActive: true,
      rows: [
        { aLabel: 'Caught', aPrice: '2.38', bLabel: 'Bowled', bPrice: '5.57' },
        { aLabel: 'Keeper Catch', aPrice: '4.73', bLabel: 'LBW', bPrice: '7.01' },
        { aLabel: 'Run Out', aPrice: '45.89', bLabel: 'Stumped', bPrice: '49.97' },
        { aLabel: 'Other', aPrice: '412.16' },
      ],
    },
    {
      key: 'aus-2nd-ov12',
      marketId: id(1045923, suffix),
      name: 'Australia 2nd Innings 12th Over Runs',
      group: 'innings',
      clientActive: true,
      rows: [{ aLabel: 'Over 2.5', aPrice: '2.56', bLabel: 'Under 2.5', bPrice: '1.73' }],
    },
    {
      key: 'aus-2nd-ov13',
      marketId: id(1045944, suffix),
      name: 'Australia 2nd Innings 13th Over Runs',
      group: 'innings',
      clientActive: false,
      rows: [{ aLabel: 'Over 2.5', aPrice: '2.54', bLabel: 'Under 2.5', bPrice: '1.75' }],
    },
    {
      key: 'aus-2nd-30ov',
      marketId: id(1871639, suffix),
      name: 'Australia 2nd Innings Runs in 1st 30 Overs',
      group: 'innings',
      clientActive: true,
      isNew: true,
      rows: [{ aLabel: 'Over 64.5', aPrice: '1.93', bLabel: 'Under 64.5', bPrice: '2.07' }],
    },
    {
      key: 'eng-1st-fours',
      marketId: id(1434675, suffix),
      name: 'England 1st Innings Fours',
      group: 'innings',
      clientActive: true,
      rows: [{ aLabel: 'Over 25.5', aPrice: '1.96', bLabel: 'Under 25.5', bPrice: '2.04' }],
    },
    {
      key: 'root-100',
      marketId: id(1484106, suffix),
      name: 'Root, J To Score 100 in 1st Innings ?',
      group: 'player',
      clientActive: false,
      rows: [{ aLabel: 'Yes', aPrice: '3.45', bLabel: 'No', bPrice: '1.32' }],
    },
    {
      key: 'root-50',
      marketId: id(1484850, suffix),
      name: 'Root, J To Score 50 in 1st Innings ?',
      group: 'player',
      clientActive: true,
      rows: [{ aLabel: 'Yes', aPrice: '1.42', bLabel: 'No', bPrice: '2.95' }],
    },
    {
      key: 'smith-50',
      marketId: id(1534850, suffix),
      name: 'Smith, S To Score 50 in 1st Innings ?',
      group: 'player',
      clientActive: true,
      rows: [{ aLabel: 'Yes', aPrice: '1.95', bLabel: 'No', bPrice: '1.86' }],
    },
    {
      key: 'warner-25',
      marketId: id(1534225, suffix),
      name: 'Warner, D To Score 25 in 2nd Innings ?',
      group: 'player',
      clientActive: true,
      rows: [{ aLabel: 'Yes', aPrice: '1.08', bLabel: 'No', bPrice: '8.40' }],
    },
    {
      key: 'head-dismissal',
      marketId: id(1584106, suffix),
      name: 'Head, T 2nd Innings Method of Dismissal',
      group: 'player',
      clientActive: true,
      rows: [
        { aLabel: 'Fielder Catch', aPrice: '2.88', bLabel: 'Bowled', bPrice: '5.57' },
        { aLabel: 'Keeper Catch', aPrice: '4.72', bLabel: 'LBW', bPrice: '6.98' },
        { aLabel: 'Run Out', aPrice: '45.62', bLabel: 'Stumped', bPrice: '48.86' },
        { aLabel: 'Other', aPrice: '410.61' },
      ],
    },
    {
      key: 'session-runs',
      marketId: id(1200440, suffix),
      name: 'Session 2 Total Runs',
      group: 'session',
      clientActive: true,
      rows: [{ aLabel: 'Over 142.5', aPrice: '1.85', bLabel: 'Under 142.5', bPrice: '1.95' }],
    },
    {
      key: 'match-winner',
      marketId: id(1000101, suffix),
      name: 'Match Result',
      group: 'match',
      clientActive: true,
      rows: [
        { aLabel: 'England', aPrice: '2.10', bLabel: 'Draw', bPrice: '4.60' },
        { aLabel: 'Australia', aPrice: '1.85' },
      ],
    },
  ]
}

function iplMarkets(home: string, suffix: string, battingHome: boolean): MonitoringClientMarket[] {
  const batTeam = battingHome ? home : 'Chennai Super Kings'
  return [
    {
      key: 'match',
      marketId: id(2100101, suffix),
      name: 'Match Winner',
      group: 'match',
      clientActive: true,
      rows: [
        { aLabel: home, aPrice: '1.72', bLabel: 'Chennai Super Kings', bPrice: '2.18' },
      ],
    },
    {
      key: 'pp-runs',
      marketId: id(2100440, suffix),
      name: `${batTeam} Powerplay Runs`,
      group: 'session',
      clientActive: true,
      rows: [{ aLabel: 'Over 52.5', aPrice: '1.88', bLabel: 'Under 52.5', bPrice: '1.92' }],
    },
    {
      key: 'inns-runs',
      marketId: id(2100550, suffix),
      name: `${home} Innings Runs`,
      group: 'innings',
      clientActive: true,
      rows: [{ aLabel: 'Over 178.5', aPrice: '1.90', bLabel: 'Under 178.5', bPrice: '1.90' }],
    },
    {
      key: 'rohit-50',
      marketId: id(2101201, suffix),
      name: 'Sharma, R To Score 50 in Innings ?',
      group: 'player',
      clientActive: false,
      rows: [{ aLabel: 'Yes', aPrice: '2.65', bLabel: 'No', bPrice: '1.48' }],
    },
    {
      key: 'hardik-25',
      marketId: id(2101202, suffix),
      name: 'Pandya, H To Score 25 in Innings ?',
      group: 'player',
      clientActive: true,
      rows: [{ aLabel: 'Yes', aPrice: '1.55', bLabel: 'No', bPrice: '2.45' }],
    },
    {
      key: 'over-14',
      marketId: id(2100660, suffix),
      name: `${home} 15th Over Runs`,
      group: 'innings',
      clientActive: true,
      isNew: true,
      rows: [{ aLabel: 'Over 8.5', aPrice: '1.91', bLabel: 'Under 8.5', bPrice: '1.89' }],
    },
    {
      key: 'dhoni-dismissal',
      marketId: id(2101300, suffix),
      name: 'Dhoni, M Method of Dismissal (if innings)',
      group: 'player',
      clientActive: false,
      rows: [
        { aLabel: 'Caught', aPrice: '2.10', bLabel: 'Bowled', bPrice: '6.20' },
        { aLabel: 'Not Out', aPrice: '3.80' },
      ],
    },
  ]
}

function genericT20Markets(
  fixture: MonitoringFixture,
  players: string[],
  suffix: string,
): MonitoringClientMarket[] {
  const { homeTeam, awayTeam } = fixture
  return [
    {
      key: 'match',
      marketId: id(3100101, suffix),
      name: 'Match Winner',
      group: 'match',
      clientActive: true,
      rows: [{ aLabel: homeTeam, aPrice: '1.78', bLabel: awayTeam, bPrice: '2.05' }],
    },
    {
      key: 'inns-runs',
      marketId: id(3100550, suffix),
      name: `${homeTeam} Innings Runs`,
      group: 'innings',
      clientActive: true,
      rows: [{ aLabel: 'Over 148.5', aPrice: '1.90', bLabel: 'Under 148.5', bPrice: '1.90' }],
    },
    {
      key: 'player-50',
      marketId: id(3101201, suffix),
      name: `${players[0]} To Score 50 in Innings ?`,
      group: 'player',
      clientActive: true,
      rows: [{ aLabel: 'Yes', aPrice: '2.20', bLabel: 'No', bPrice: '1.65' }],
    },
    {
      key: 'player-25',
      marketId: id(3101202, suffix),
      name: `${players[1]} To Score 25 in Innings ?`,
      group: 'player',
      clientActive: false,
      rows: [{ aLabel: 'Yes', aPrice: '1.72', bLabel: 'No', bPrice: '2.10' }],
    },
    {
      key: 'pp',
      marketId: id(3100440, suffix),
      name: 'Powerplay Runs',
      group: 'session',
      clientActive: true,
      rows: [{ aLabel: 'Over 46.5', aPrice: '1.87', bLabel: 'Under 46.5', bPrice: '1.93' }],
    },
  ]
}

function wbblLiveMarkets(suffix: string): MonitoringClientMarket[] {
  return [
    {
      key: 'match',
      marketId: id(4100101, suffix),
      name: 'Match Winner',
      group: 'match',
      clientActive: true,
      rows: [
        { aLabel: 'Sydney Sixers', aPrice: '1.65', bLabel: 'Melbourne Stars', bPrice: '2.30' },
      ],
    },
    {
      key: 'sixers-inns',
      marketId: id(4100550, suffix),
      name: 'Sydney Sixers Innings Runs (chase)',
      group: 'innings',
      clientActive: true,
      rows: [{ aLabel: 'Over 142.5', aPrice: '1.91', bLabel: 'Under 142.5', bPrice: '1.89' }],
    },
    {
      key: 'perry-50',
      marketId: id(4101201, suffix),
      name: 'Perry, E To Score 50 in Innings ?',
      group: 'player',
      clientActive: true,
      rows: [{ aLabel: 'Yes', aPrice: '2.85', bLabel: 'No', bPrice: '1.42' }],
    },
    {
      key: 'healy-25',
      marketId: id(4101202, suffix),
      name: 'Healy, A To Score 25 in Innings ?',
      group: 'player',
      clientActive: false,
      rows: [{ aLabel: 'Yes', aPrice: '1.35', bLabel: 'No', bPrice: '3.15' }],
    },
    {
      key: 'over-9',
      marketId: id(4100660, suffix),
      name: 'Sydney Sixers 9th Over Runs',
      group: 'innings',
      clientActive: true,
      isNew: true,
      rows: [{ aLabel: 'Over 7.5', aPrice: '1.94', bLabel: 'Under 7.5', bPrice: '1.86' }],
    },
    {
      key: 'perry-dismissal',
      marketId: id(4101300, suffix),
      name: 'Perry, E Method of Dismissal',
      group: 'player',
      clientActive: true,
      rows: [
        { aLabel: 'Caught', aPrice: '2.45', bLabel: 'Bowled', bPrice: '5.80' },
        { aLabel: 'Not Out', aPrice: '2.95' },
      ],
    },
  ]
}

export function clientMarketsForFixture(fixture: MonitoringFixture): MonitoringClientMarket[] {
  const suffix = fixture.refId.replace(/[^A-Z0-9]/gi, '').slice(-8) || '63128640'

  switch (fixture.id) {
    case 'ashes-5th-test':
      return ashesMarkets(suffix)
    case 'ipl-mi-csk':
      return iplMarkets(fixture.homeTeam, suffix, fixture.battingSide === 'home')
    case 'ipl-rcb-kkr':
      return genericT20Markets(fixture, ['Kohli, V', 'Russell, A'], suffix)
    case 'wbbl-six-sta':
      return wbblLiveMarkets(suffix)
    case 'wbbl-per-adl':
      return genericT20Markets(fixture, ['Devine, S', 'Wolvaardt, L'], suffix)
    default:
      return genericT20Markets(fixture, ['Player A', 'Player B'], suffix)
  }
}

export function clientMarketMatchesFilter(
  market: MonitoringClientMarket,
  filter: 'all' | 'match' | 'innings' | 'session',
): boolean {
  if (filter === 'all') return true
  if (filter === 'match') return market.group === 'match'
  if (filter === 'innings') return market.group === 'innings' || market.group === 'player'
  if (filter === 'session') return market.group === 'session'
  return true
}
