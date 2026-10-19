export type MonitoringFixtureStatus = 'live' | 'upcoming' | 'stumps' | 'scheduled'

/** Which side is currently batting; null if not in an innings (e.g. pre-match). */
export type MonitoringBattingSide = 'home' | 'away'

export interface MonitoringMarketRow {
  market: string
  selection: string
  price: string
  line?: string
}

/** One swappable price board (dropdown + labelled odds boxes). */
export interface MonitoringPriceBoard {
  id: string
  name: string
  columns: { label: string; value: string }[]
}

export interface MonitoringFixture {
  id: string
  /** Display ref on fixture row (Expert Radar style). */
  refId: string
  competitionId: string
  competitionLabel: string
  formatLabel: string
  date: string
  startTimeLabel: string
  homeTeam: string
  awayTeam: string
  status: MonitoringFixtureStatus
  statusDetail: string
  scoreHome: string
  scoreAway: string
  /** Set when a team is at the crease; omit when neither side is batting. */
  battingSide?: MonitoringBattingSide
  scouting: boolean
  /** Short live commentary line for the match popup. */
  commentary: string
  /** Boards available in the row market dropdowns. */
  priceBoards: MonitoringPriceBoard[]
  markets: MonitoringMarketRow[]
}

export interface MonitoringCompetition {
  id: string
  label: string
  fixtureCount: number
}

export interface MonitoringAlert {
  id: string
  fixtureId: string
  title: string
  body: string
  severity: 'info' | 'warn' | 'extreme'
  agoLabel: string
}

/** Default market columns in the centre toolbar (swappable via dropdown). */
export const MONITORING_DEFAULT_SLOT_BOARD_IDS = ['match', 'eng-inns', 'aus-inns', 'session']

export const MONITORING_COMPETITIONS: MonitoringCompetition[] = [
  { id: 'ashes', label: 'The Ashes (Test)', fixtureCount: 1 },
  { id: 'ipl', label: 'Indian Premier League', fixtureCount: 2 },
  { id: 'wbbl', label: "Women's Big Bash League", fixtureCount: 2 },
]

export const MONITORING_FIXTURES: MonitoringFixture[] = [
  {
    id: 'ashes-5th-test',
    refId: 'CR-ASH-5TH',
    competitionId: 'ashes',
    competitionLabel: 'The Ashes',
    formatLabel: 'Test',
    date: '2026-07-18',
    startTimeLabel: 'Day 3 · 11:00',
    homeTeam: 'England',
    awayTeam: 'Australia',
    status: 'live',
    statusDetail: 'Lunch',
    scoreHome: '312/4',
    scoreAway: '289 & 41/0',
    battingSide: 'away',
    scouting: true,
    commentary:
      'England are 312 for 4 at lunch on day 3 — Australia are 41 for 0 in their second innings (289 all out).',
    priceBoards: [
      {
        id: 'match',
        name: 'Match winner',
        columns: [
          { label: '1', value: '2.10' },
          { label: 'X', value: '4.60' },
          { label: '2', value: '1.85' },
        ],
      },
      {
        id: 'eng-inns',
        name: 'Eng 1st inns runs',
        columns: [
          { label: 'O', value: '1.92' },
          { label: '325.5', value: '—' },
          { label: 'U', value: '1.88' },
        ],
      },
      {
        id: 'aus-inns',
        name: 'Aus 2nd inns runs',
        columns: [
          { label: 'O', value: '1.73' },
          { label: '193.5', value: '—' },
          { label: 'U', value: '2.37' },
        ],
      },
      {
        id: 'session',
        name: 'Session runs',
        columns: [
          { label: 'O', value: '1.85' },
          { label: '142.5', value: '—' },
          { label: 'U', value: '1.95' },
        ],
      },
      {
        id: 'top-bat',
        name: 'Top batter',
        columns: [
          { label: 'Root', value: '5.50' },
          { label: 'Smith', value: '6.20' },
          { label: '—', value: '—' },
        ],
      },
    ],
    markets: [
      { market: 'Match winner', selection: 'England', price: '2.10' },
      { market: 'Match winner', selection: 'Australia', price: '1.85' },
      { market: 'Draw', selection: 'Draw', price: '4.60' },
      { market: '1st innings runs', selection: 'England over', line: '325.5', price: '1.92' },
      { market: '1st innings runs', selection: 'England under', line: '325.5', price: '1.88' },
      { market: 'Top batter', selection: 'Root', price: '5.50' },
    ],
  },
  {
    id: 'ipl-mi-csk',
    refId: 'CR-IPL-4412',
    competitionId: 'ipl',
    competitionLabel: 'IPL',
    formatLabel: 'T20',
    date: '2026-04-12',
    startTimeLabel: 'Live · 19:30',
    homeTeam: 'Mumbai Indians',
    awayTeam: 'Chennai Super Kings',
    status: 'live',
    statusDetail: '14.2 ov',
    scoreHome: '142/3',
    scoreAway: '—',
    battingSide: 'home',
    scouting: true,
    commentary: 'Mumbai Indians are 142 for 3 after 14.2 overs — Chennai yet to bat.',
    priceBoards: [
      {
        id: 'match',
        name: 'Match winner',
        columns: [
          { label: '1', value: '1.72' },
          { label: '2', value: '2.18' },
        ],
      },
      {
        id: 'inns',
        name: 'MI innings runs',
        columns: [
          { label: 'O', value: '1.90' },
          { label: '178.5', value: '—' },
          { label: 'U', value: '1.90' },
        ],
      },
      {
        id: 'powerplay',
        name: 'PP runs',
        columns: [
          { label: 'O', value: '1.88' },
          { label: '52.5', value: '—' },
          { label: 'U', value: '1.92' },
        ],
      },
    ],
    markets: [
      { market: 'Match winner', selection: 'Mumbai Indians', price: '1.72' },
      { market: 'Match winner', selection: 'Chennai Super Kings', price: '2.18' },
      { market: 'Innings runs line', selection: 'MI over', line: '178.5', price: '1.90' },
      { market: 'Innings runs line', selection: 'MI under', line: '178.5', price: '1.90' },
    ],
  },
  {
    id: 'ipl-rcb-kkr',
    refId: 'CR-IPL-4413',
    competitionId: 'ipl',
    competitionLabel: 'IPL',
    formatLabel: 'T20',
    date: '2026-04-13',
    startTimeLabel: '19:30',
    homeTeam: 'Royal Challengers Bengaluru',
    awayTeam: 'Kolkata Knight Riders',
    status: 'upcoming',
    statusDetail: 'Starts in 4h 20m',
    scoreHome: '—',
    scoreAway: '—',
    scouting: false,
    commentary: 'Match starts in under 5 hours. Line-ups expected within the hour.',
    priceBoards: [
      {
        id: 'match',
        name: 'Match winner',
        columns: [
          { label: '1', value: '1.95' },
          { label: '2', value: '1.95' },
        ],
      },
      {
        id: 'inns',
        name: 'RCB innings runs',
        columns: [
          { label: 'O', value: '1.88' },
          { label: '165.5', value: '—' },
          { label: 'U', value: '1.92' },
        ],
      },
    ],
    markets: [
      { market: 'Match winner', selection: 'RCB', price: '1.95' },
      { market: 'Match winner', selection: 'KKR', price: '1.95' },
      { market: 'Innings runs line', selection: 'RCB over', line: '165.5', price: '1.88' },
    ],
  },
  {
    id: 'wbbl-six-sta',
    refId: 'CR-WBBL-882',
    competitionId: 'wbbl',
    competitionLabel: 'WBBL',
    formatLabel: 'T20',
    date: '2026-11-08',
    startTimeLabel: 'Live · 13:40',
    homeTeam: 'Sydney Sixers',
    awayTeam: 'Melbourne Stars',
    status: 'live',
    statusDetail: '8.4 ov',
    scoreHome: '78/1',
    scoreAway: '—',
    battingSide: 'home',
    scouting: true,
    commentary: 'Sydney Sixers are 78 for 1 after 8.4 overs in the chase.',
    priceBoards: [
      {
        id: 'match',
        name: 'Match winner',
        columns: [
          { label: '1', value: '1.65' },
          { label: '2', value: '2.30' },
        ],
      },
      {
        id: 'inns',
        name: 'Sixers innings runs',
        columns: [
          { label: 'O', value: '1.91' },
          { label: '142.5', value: '—' },
          { label: 'U', value: '1.89' },
        ],
      },
    ],
    markets: [
      { market: 'Match winner', selection: 'Sixers', price: '1.65' },
      { market: 'Match winner', selection: 'Stars', price: '2.30' },
      { market: 'Innings runs line', selection: 'Sixers over', line: '142.5', price: '1.91' },
    ],
  },
  {
    id: 'wbbl-per-adl',
    refId: 'CR-WBBL-883',
    competitionId: 'wbbl',
    competitionLabel: 'WBBL',
    formatLabel: 'T20',
    date: '2026-11-09',
    startTimeLabel: '10:10',
    homeTeam: 'Perth Scorchers',
    awayTeam: 'Adelaide Strikers',
    status: 'scheduled',
    statusDetail: 'Tomorrow',
    scoreHome: '—',
    scoreAway: '—',
    scouting: false,
    commentary: 'Scheduled for tomorrow morning — prices are early markets only.',
    priceBoards: [
      {
        id: 'match',
        name: 'Match winner',
        columns: [
          { label: '1', value: '1.78' },
          { label: '2', value: '2.05' },
        ],
      },
      {
        id: 'inns',
        name: 'Scorchers innings runs',
        columns: [
          { label: 'O', value: '1.90' },
          { label: '148.5', value: '—' },
          { label: 'U', value: '1.90' },
        ],
      },
    ],
    markets: [
      { market: 'Match winner', selection: 'Scorchers', price: '1.78' },
      { market: 'Match winner', selection: 'Strikers', price: '2.05' },
    ],
  },
]

export const MONITORING_ALERTS: MonitoringAlert[] = [
  {
    id: 'a1',
    fixtureId: 'ashes-5th-test',
    title: 'Extreme slider',
    body: 'England 1st innings runs — line moved 8 runs in 2 min.',
    severity: 'extreme',
    agoLabel: '2m ago',
  },
  {
    id: 'a2',
    fixtureId: 'ipl-mi-csk',
    title: 'Scout feed lag',
    body: 'Ball-by-ball delay > 12s. Pricing auto-hold active.',
    severity: 'warn',
    agoLabel: '6m ago',
  },
  {
    id: 'a3',
    fixtureId: 'wbbl-six-sta',
    title: 'Market suspend',
    body: 'Next over runs suspended — boundary review.',
    severity: 'info',
    agoLabel: '14m ago',
  },
  {
    id: 'a4',
    fixtureId: 'ashes-5th-test',
    title: 'Model break',
    body: 'Draw price outside trader band (+0.4 vs model).',
    severity: 'warn',
    agoLabel: '22m ago',
  },
]

export function fixtureStatusLabel(status: MonitoringFixtureStatus): string {
  switch (status) {
    case 'live':
      return 'Live'
    case 'upcoming':
      return 'Upcoming'
    case 'stumps':
      return 'Stumps'
    default:
      return 'Scheduled'
  }
}
