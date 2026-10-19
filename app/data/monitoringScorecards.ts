export interface MonitoringScorecardBatter {
  name: string
  dismissal: string
  runs: number
  balls: number
  fours: number
  sixes: number
}

export interface MonitoringScorecardBowler {
  name: string
  overs: string
  maidens: number
  runs: number
  wickets: number
}

export interface MonitoringScorecardInnings {
  label: string
  total: string
  overs?: string
  extras: string
  batters: MonitoringScorecardBatter[]
  bowlers: MonitoringScorecardBowler[]
}

export interface MonitoringScorecard {
  innings: MonitoringScorecardInnings[]
}

const SCORECARDS: Record<string, MonitoringScorecard> = {
  'ashes-5th-test': {
    innings: [
      {
        label: 'Australia 1st innings',
        total: '289',
        overs: '98.2 ov',
        extras: '12 (b 4, lb 6, nb 2)',
        batters: [
          { name: 'Head', dismissal: 'c Bairstow b Anderson', runs: 48, balls: 72, fours: 6, sixes: 0 },
          { name: 'Warner', dismissal: 'lbw b Broad', runs: 31, balls: 44, fours: 4, sixes: 0 },
          { name: 'Smith', dismissal: 'c Root b Stokes', runs: 89, balls: 156, fours: 9, sixes: 1 },
          { name: 'Labuschagne', dismissal: 'b Robinson', runs: 42, balls: 98, fours: 3, sixes: 0 },
          { name: 'Green', dismissal: 'c Crawley b Anderson', runs: 28, balls: 51, fours: 2, sixes: 1 },
          { name: 'Carey', dismissal: 'b Broad', runs: 19, balls: 34, fours: 1, sixes: 0 },
          { name: 'Starc', dismissal: 'c Bairstow b Stokes', runs: 11, balls: 18, fours: 1, sixes: 0 },
          { name: 'Cummins', dismissal: 'not out', runs: 14, balls: 22, fours: 1, sixes: 0 },
          { name: 'Lyons', dismissal: 'b Anderson', runs: 3, balls: 11, fours: 0, sixes: 0 },
          { name: 'Hazlewood', dismissal: 'run out (Root)', runs: 2, balls: 6, fours: 0, sixes: 0 },
        ],
        bowlers: [
          { name: 'Anderson', overs: '24.2', maidens: 6, runs: 58, wickets: 3 },
          { name: 'Broad', overs: '22', maidens: 5, runs: 71, wickets: 2 },
          { name: 'Stokes', overs: '18', maidens: 2, runs: 52, wickets: 2 },
          { name: 'Robinson', overs: '20', maidens: 4, runs: 62, wickets: 1 },
          { name: 'Leach', overs: '14', maidens: 1, runs: 46, wickets: 0 },
        ],
      },
      {
        label: 'England 1st innings',
        total: '312/4',
        overs: '87 ov',
        extras: '8 (b 2, lb 4, w 2)',
        batters: [
          { name: 'Crawley', dismissal: 'c Carey b Cummins', runs: 52, balls: 78, fours: 8, sixes: 0 },
          { name: 'Duckett', dismissal: 'b Hazlewood', runs: 41, balls: 55, fours: 6, sixes: 1 },
          { name: 'Root', dismissal: 'not out', runs: 118, balls: 198, fours: 11, sixes: 0 },
          { name: 'Stokes', dismissal: 'c Smith b Lyon', runs: 34, balls: 48, fours: 2, sixes: 2 },
          { name: 'Bairstow', dismissal: 'not out', runs: 59, balls: 72, fours: 5, sixes: 1 },
        ],
        bowlers: [
          { name: 'Cummins', overs: '22', maidens: 4, runs: 68, wickets: 1 },
          { name: 'Hazlewood', overs: '20', maidens: 5, runs: 55, wickets: 1 },
          { name: 'Starc', overs: '18', maidens: 2, runs: 72, wickets: 0 },
          { name: 'Lyon', overs: '24', maidens: 3, runs: 89, wickets: 1 },
          { name: 'Green', overs: '3', maidens: 0, runs: 20, wickets: 0 },
        ],
      },
      {
        label: 'Australia 2nd innings',
        total: '41/0',
        overs: '12 ov',
        extras: '1 (nb 1)',
        batters: [
          { name: 'Head', dismissal: 'not out', runs: 22, balls: 38, fours: 3, sixes: 0 },
          { name: 'Warner', dismissal: 'not out', runs: 18, balls: 34, fours: 2, sixes: 0 },
        ],
        bowlers: [
          { name: 'Anderson', overs: '6', maidens: 2, runs: 18, wickets: 0 },
          { name: 'Broad', overs: '6', maidens: 1, runs: 22, wickets: 0 },
        ],
      },
    ],
  },
  'ipl-mi-csk': {
    innings: [
      {
        label: 'Mumbai Indians innings',
        total: '142/3',
        overs: '14.2 ov',
        extras: '6 (w 6)',
        batters: [
          { name: 'Rohit', dismissal: 'c Gaikwad b Jadeja', runs: 28, balls: 22, fours: 4, sixes: 1 },
          { name: 'Ishan', dismissal: 'b Chahar', runs: 19, balls: 14, fours: 2, sixes: 1 },
          { name: 'Tilak', dismissal: 'run out (Dhoni)', runs: 41, balls: 28, fours: 3, sixes: 2 },
          { name: 'Hardik', dismissal: 'not out', runs: 38, balls: 24, fours: 2, sixes: 3 },
          { name: 'SKY', dismissal: 'not out', runs: 10, balls: 8, fours: 0, sixes: 1 },
        ],
        bowlers: [
          { name: 'Chahar', overs: '3', maidens: 0, runs: 28, wickets: 1 },
          { name: 'Jadeja', overs: '3.2', maidens: 0, runs: 31, wickets: 1 },
          { name: 'Pathirana', overs: '4', maidens: 0, runs: 42, wickets: 0 },
          { name: 'Theekshana', overs: '4', maidens: 0, runs: 35, wickets: 0 },
        ],
      },
    ],
  },
  'ipl-rcb-kkr': {
    innings: [
      {
        label: 'Pre-match',
        total: '—',
        extras: '—',
        batters: [],
        bowlers: [],
      },
    ],
  },
  'wbbl-six-sta': {
    innings: [
      {
        label: 'Melbourne Stars innings',
        total: '156/5',
        overs: '20 ov',
        extras: '4 (lb 2, w 2)',
        batters: [
          { name: 'Lanning', dismissal: 'c Healy b Ecclestone', runs: 44, balls: 38, fours: 5, sixes: 1 },
          { name: 'Mackinlay', dismissal: 'b Schutt', runs: 22, balls: 18, fours: 3, sixes: 0 },
          { name: 'Armitage', dismissal: 'c Perry b Ecclestone', runs: 31, balls: 24, fours: 2, sixes: 1 },
          { name: 'Farrant', dismissal: 'not out', runs: 28, balls: 22, fours: 2, sixes: 0 },
          { name: 'Dayalan', dismissal: 'b Schutt', runs: 12, balls: 10, fours: 1, sixes: 0 },
        ],
        bowlers: [
          { name: 'Schutt', overs: '4', maidens: 0, runs: 28, wickets: 2 },
          { name: 'Ecclestone', overs: '4', maidens: 0, runs: 32, wickets: 2 },
          { name: 'Perry', overs: '4', maidens: 0, runs: 35, wickets: 0 },
          { name: 'Gardner', overs: '4', maidens: 0, runs: 38, wickets: 0 },
          { name: 'Aley', overs: '4', maidens: 0, runs: 23, wickets: 0 },
        ],
      },
      {
        label: 'Sydney Sixers innings (chase)',
        total: '78/1',
        overs: '8.4 ov',
        extras: '2 (w 2)',
        batters: [
          { name: 'Healy', dismissal: 'c Lanning b Dayalan', runs: 24, balls: 18, fours: 4, sixes: 0 },
          { name: 'Perry', dismissal: 'not out', runs: 42, balls: 28, fours: 3, sixes: 2 },
          { name: 'Gardner', dismissal: 'not out', runs: 10, balls: 6, fours: 1, sixes: 0 },
        ],
        bowlers: [
          { name: 'Dayalan', overs: '2', maidens: 0, runs: 18, wickets: 1 },
          { name: 'Farrant', overs: '2.4', maidens: 0, runs: 22, wickets: 0 },
          { name: 'Armitage', overs: '2', maidens: 0, runs: 21, wickets: 0 },
          { name: 'Schutt', overs: '2', maidens: 0, runs: 15, wickets: 0 },
        ],
      },
    ],
  },
  'wbbl-per-adl': {
    innings: [
      {
        label: 'Scheduled',
        total: 'Match not started',
        extras: '—',
        batters: [],
        bowlers: [],
      },
    ],
  },
}

export function monitoringScorecardFor(fixtureId: string): MonitoringScorecard | null {
  return SCORECARDS[fixtureId] ?? null
}
