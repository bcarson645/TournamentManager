export interface CareerBatting {
  matches: number
  runs: number
  average: number
  /** SR.CAZ — runs per ball (legacy “per 100” values in data were divided by 100). */
  strikeRate: number
  hundreds: number
  fifties: number
  highScore: string
  innings: number
}

export interface CareerBowling {
  matches: number
  wickets: number
  average: number
  economy: number
  strikeRate: number
  bestFigures: string
  fiveWickets: number
  innings: number
}

export interface RecentInnings {
  score: number
  notOut: boolean
}

export interface TournamentRecord {
  season: string
  matches: number
  runs: number
  average: number
  /** Batting SR.CAZ — runs per ball. */
  strikeRate: number
  wickets: number
  bowlAvg: number
}

export interface PlayerProfile {
  photo?: string
  country: string
  careerBatting: CareerBatting
  careerBowling: CareerBowling
  recentInnings: RecentInnings[]
  tournamentHistory: TournamentRecord[]
}

export function makeDefaultProfile(): PlayerProfile {
  return {
    country: '',
    careerBatting: {
      matches: 0, runs: 0, average: 0, strikeRate: 0,
      hundreds: 0, fifties: 0, highScore: '0', innings: 0,
    },
    careerBowling: {
      matches: 0, wickets: 0, average: 0, economy: 0,
      strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0,
    },
    recentInnings: [],
    tournamentHistory: [],
  }
}

const KNOWN_STATS: Record<string, Partial<PlayerProfile>> = {
  'MS Dhoni': {
    country: 'India',
    careerBatting: { matches: 0, runs: 7508, average: 38.30, strikeRate: 1.3567, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 1, wickets: 0, average: 0, economy: 12.50, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ruturaj Gaikwad': {
    country: 'India',
    careerBatting: { matches: 0, runs: 5002, average: 39.07, strikeRate: 1.4054, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Sanju Samson': {
    country: 'India',
    careerBatting: { matches: 0, runs: 1100, average: 23.91, strikeRate: 1.4885, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 1, wickets: 1, average: 0, economy: 8.00, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ayush Mhatre': {
    country: 'India',
    careerBatting: { matches: 0, runs: 565, average: 56.50, strikeRate: 1.7546, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Dewald Brevis': {
    country: 'South Africa',
    careerBatting: { matches: 0, runs: 3164, average: 28.76, strikeRate: 1.5344, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 133, wickets: 18, average: 21.27, economy: 7.43, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Shivam Dube': {
    country: 'India',
    careerBatting: { matches: 103, runs: 1691, average: 24.15, strikeRate: 1.4303, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 92, wickets: 42, average: 0, economy: 8.40, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Urvil Patel': {
    country: 'India',
    careerBatting: { matches: 57, runs: 1425, average: 26.88, strikeRate: 1.7947, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Noor Ahmad': {
    country: 'Afghanistan',
    careerBatting: { matches: 196, runs: 244, average: 6.25, strikeRate: 0.9878, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 196, wickets: 229, average: 22.27, economy: 7.33, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Nathan Ellis': {
    country: 'Australia',
    careerBatting: { matches: 186, runs: 525, average: 11.41, strikeRate: 1.1099, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 186, wickets: 231, average: 22.96, economy: 8.13, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Shreyas Gopal': {
    country: 'India',
    careerBatting: { matches: 110, runs: 551, average: 16.20, strikeRate: 1.2217, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 110, wickets: 129, average: 20.25, economy: 7.60, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Gurjapneet Singh': {
    country: 'India',
    careerBatting: { matches: 15, runs: 10, average: 5.00, strikeRate: 0.625, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 15, wickets: 21, average: 24.38, economy: 9.25, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Khaleel Ahmed': {
    country: 'India',
    careerBatting: { matches: 128, runs: 11, average: 1.57, strikeRate: 0.3437, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 128, wickets: 159, average: 25.15, economy: 8.49, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Anshul Kamboj': {
    country: 'India',
    careerBatting: { matches: 41, runs: 95, average: 13.57, strikeRate: 1.25, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 41, wickets: 55, average: 19.27, economy: 8.18, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mukesh Choudhary': {
    country: 'India',
    careerBatting: { matches: 36, runs: 32, average: 10.66, strikeRate: 0.9696, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 36, wickets: 48, average: 23.62, economy: 9.16, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Jamie Overton': {
    country: 'England',
    careerBatting: { matches: 182, runs: 1738, average: 20.44, strikeRate: 1.5714, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 182, wickets: 136, average: 27.29, economy: 9.11, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Nitish Rana': {
    country: 'India',
    careerBatting: { matches: 211, runs: 5122, average: 28.61, strikeRate: 1.3655, hundreds: 1, fifties: 34, highScore: '107', innings: 200 },
    careerBowling: { matches: 211, wickets: 51, average: 22.88, economy: 7.18, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Abishek Porel': {
    country: 'India',
    careerBatting: { matches: 57, runs: 1482, average: 30.24, strikeRate: 1.5453, hundreds: 0, fifties: 10, highScore: '81', innings: 55 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ajay Mandal': {
    country: 'India',
    careerBatting: { matches: 52, runs: 490, average: 16.33, strikeRate: 1.3172, hundreds: 0, fifties: 0, highScore: '49', innings: 42 },
    careerBowling: { matches: 52, wickets: 52, average: 23.65, economy: 7.32, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ashutosh Sharma': {
    country: 'India',
    careerBatting: { matches: 48, runs: 989, average: 30.90, strikeRate: 1.76, hundreds: 0, fifties: 8, highScore: '84', innings: 39 },
    careerBowling: { matches: 54, wickets: 4, average: 28.75, economy: 10.95, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Axar Patel': {
    country: 'India',
    careerBatting: { matches: 91, runs: 700, average: 18.42, strikeRate: 1.341, hundreds: 0, fifties: 1, highScore: '65', innings: 56 },
    careerBowling: { matches: 91, wickets: 93, average: 21.30, economy: 7.32, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Dushmantha Chameera': {
    country: 'Sri Lanka',
    careerBatting: { matches: 170, runs: 231, average: 6.41, strikeRate: 0.875, hundreds: 0, fifties: 0, highScore: '24', innings: 65 },
    careerBowling: { matches: 170, wickets: 188, average: 26.01, economy: 8.15, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Karun Nair': {
    country: 'India',
    careerBatting: { matches: 171, runs: 3660, average: 26.3, strikeRate: 1.365, hundreds: 2, fifties: 22, highScore: '111', innings: 156 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'KL Rahul': {
    country: 'India',
    careerBatting: { matches: 71, runs: 2265, average: 31.90, strikeRate: 1.391, hundreds: 2, fifties: 22, highScore: '110', innings: 68 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Kuldeep Yadav': {
    country: 'India',
    careerBatting: { matches: 50, runs: 47, average: 9.40, strikeRate: 0.6912, hundreds: 0, fifties: 0, highScore: '23', innings: 9 },
    careerBowling: { matches: 50, wickets: 90, average: 13.18, economy: 6.82, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Madhav Tiwari': {
    country: 'India',
    careerBatting: { matches: 1, runs: 3, average: 3.00, strikeRate: 0.75, hundreds: 0, fifties: 0, highScore: '3', innings: 1 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Sameer Rizvi': {
    country: 'India',
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'T Natarajan': {
    country: 'India',
    careerBowling: { matches: 115, wickets: 136, average: 23.54, economy: 8.12, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Tripurana Vijay': {
    country: 'India',
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Tristan Stubbs': {
    country: 'South Africa',
    careerBowling: { matches: 45, wickets: 6, average: 25.50, economy: 8.42, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Vipraj Nigam': {
    country: 'India',
    careerBatting: { matches: 28, runs: 229, average: 16.35, strikeRate: 1.5793, hundreds: 0, fifties: 0, highScore: '39', innings: 17 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mukesh Kumar': {
    country: 'India',
    careerBatting: { matches: 77, runs: 20, average: 6.66, strikeRate: 0.625, hundreds: 0, fifties: 0, highScore: '6', innings: 16 },
    careerBowling: { matches: 63, wickets: 62, average: 26.10, economy: 8.17, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mitchell Starc': {
    country: 'Australia',
    careerBowling: { matches: 144, wickets: 201, average: 20.90, economy: 7.43, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Anuj Rawat': {
    country: 'India',
    careerBatting: { matches: 77, runs: 1304, average: 25.07, strikeRate: 1.2096, hundreds: 0, fifties: 5, highScore: '88*', innings: 68 },
    careerBowling: { matches: 77, wickets: 0, average: 0, economy: 14.00, strikeRate: 0, bestFigures: '0/14', fiveWickets: 0, innings: 1 },
  },
  'Glenn Phillips': {
    country: 'New Zealand',
    careerBatting: { matches: 283, runs: 7237, average: 32.45, strikeRate: 1.4137, hundreds: 5, fifties: 47, highScore: '116*', innings: 262 },
    careerBowling: { matches: 283, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '3/6', fiveWickets: 0, innings: 0 },
  },
  'Gurnoor Brar': {
    country: 'India',
    careerBatting: { matches: 9, runs: 18, average: 6.00, strikeRate: 0.8571, hundreds: 0, fifties: 0, highScore: '8', innings: 3 },
    careerBowling: { matches: 9, wickets: 10, average: 33.70, economy: 10.81, strikeRate: 18.7, bestFigures: '3/23', fiveWickets: 0, innings: 9 },
  },
  'Ishant Sharma': {
    country: 'India',
    careerBatting: { matches: 182, runs: 71, average: 7.88, strikeRate: 0.7888, hundreds: 0, fifties: 0, highScore: '10', innings: 37 },
    careerBowling: { matches: 179, wickets: 155, average: 31.80, economy: 7.93, strikeRate: 0, bestFigures: '5/12', fiveWickets: 0, innings: 179 },
  },
  'Jayant Yadav': {
    country: 'India',
    careerBatting: { matches: 88, runs: 388, average: 14.9, strikeRate: 1.179, hundreds: 0, fifties: 0, highScore: '39', innings: 46 },
    careerBowling: { matches: 88, wickets: 52, average: 32.63, economy: 6.34, strikeRate: 32.6, bestFigures: '4/22', fiveWickets: 0, innings: 83 },
  },
  'Jos Buttler': {
    country: 'England',
    careerBatting: { matches: 457, runs: 13046, average: 35.74, strikeRate: 1.4597, hundreds: 8, fifties: 93, highScore: '124', innings: 431 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Kagiso Rabada': {
    country: 'South Africa',
    careerBatting: { matches: 78, runs: 184, average: 15.33, strikeRate: 1.1646, hundreds: 0, fifties: 0, highScore: '22', innings: 29 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '3/18', fiveWickets: 0, innings: 0 },
  },
  'Kumar Kushagra': {
    country: 'India',
    careerBatting: { matches: 32, runs: 676, average: 28.16, strikeRate: 1.4568, hundreds: 0, fifties: 5, highScore: '86*', innings: 30 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Manav Suthar': {
    country: 'India',
    careerBatting: { matches: 25, runs: 94, average: 10.44, strikeRate: 1.2702, hundreds: 0, fifties: 0, highScore: '16*', innings: 15 },
    careerBowling: { matches: 25, wickets: 23, average: 23.73, economy: 7.03, strikeRate: 20.2, bestFigures: '3/21', fiveWickets: 0, innings: 25 },
  },
  'Mohammed Siraj': {
    country: 'India',
    careerBatting: { matches: 161, runs: 154, average: 8.10, strikeRate: 0.8508, hundreds: 0, fifties: 0, highScore: '14*', innings: 39 },
    careerBowling: { matches: 161, wickets: 186, average: 25.66, economy: 8.24, strikeRate: 18.6, bestFigures: '4/17', fiveWickets: 0, innings: 160 },
  },
  'Arshad Khan': {
    country: 'India',
    careerBatting: { matches: 30, runs: 226, average: 18.83, strikeRate: 1.4868, hundreds: 0, fifties: 1, highScore: '58*', innings: 22 },
    careerBowling: { matches: 30, wickets: 29, average: 23.79, economy: 9.40, strikeRate: 15.1, bestFigures: '6/9', fiveWickets: 0, innings: 29 },
  },
  'Nishant Sindhu': {
    country: 'India',
    careerBatting: { matches: 37, runs: 763, average: 27.25, strikeRate: 1.3897, hundreds: 1, fifties: 3, highScore: '100*', innings: 33 },
    careerBowling: { matches: 37, wickets: 21, average: 21.76, economy: 6.72, strikeRate: 19.4, bestFigures: '3/15', fiveWickets: 0, innings: 27 },
  },
  'Prasidh Krishna': {
    country: 'India',
    careerBatting: { matches: 92, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 92, wickets: 100, average: 28.77, economy: 0, strikeRate: 0, bestFigures: '4/30', fiveWickets: 0, innings: 92 },
  },
  'R Sai Kishore': {
    country: 'India',
    careerBatting: { matches: 85, runs: 96, average: 6.40, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '21*', innings: 0 },
    careerBowling: { matches: 85, wickets: 99, average: 18.94, economy: 5.61, strikeRate: 0, bestFigures: '4/6', fiveWickets: 0, innings: 0 },
  },
  'Rahul Tewatia': {
    country: 'India',
    careerBatting: { matches: 169, runs: 2107, average: 26.01, strikeRate: 1.4431, hundreds: 0, fifties: 3, highScore: '59*', innings: 129 },
    careerBowling: { matches: 169, wickets: 69, average: 26.34, economy: 7.40, strikeRate: 21.3, bestFigures: '3/4', fiveWickets: 0, innings: 92 },
  },
  'Rashid Khan': {
    country: 'Afghanistan',
    careerBatting: { matches: 482, runs: 2646, average: 0, strikeRate: 1.4618, hundreds: 0, fifties: 5, highScore: '--', innings: 0 },
    careerBowling: { matches: 482, wickets: 700, average: 18.54, economy: 6.57, strikeRate: 0, bestFigures: '4/--', fiveWickets: 0, innings: 0 },
  },
  'B Sai Sudharsan': {
    country: 'India',
    careerBatting: { matches: 66, runs: 2463, average: 43.2, strikeRate: 1.391, hundreds: 3, fifties: 15, highScore: '108', innings: 65 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'M Shahrukh Khan': {
    country: 'India',
    careerBatting: { matches: 116, runs: 1389, average: 19.29, strikeRate: 1.3931, hundreds: 0, fifties: 2, highScore: '58', innings: 98 },
    careerBowling: { matches: 116, wickets: 8, average: 34.62, economy: 8.56, strikeRate: 24.2, bestFigures: '2/19', fiveWickets: 0, innings: 16 },
  },
  'Shubman Gill': {
    country: 'India',
    careerBatting: { matches: 157, runs: 5072, average: 38.0, strikeRate: 1.38, hundreds: 6, fifties: 32, highScore: '126*', innings: 154 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Washington Sundar': {
    country: 'India',
    careerBowling: { matches: 89, wickets: 66, average: 29.6, economy: 7.35, strikeRate: 24.1, bestFigures: '4/23', fiveWickets: 0, innings: 89 },
  },
  'Cameron Green': {
    country: 'Australia',
    careerBatting: { matches: 69, runs: 1451, average: 31.5, strikeRate: 1.484, hundreds: 1, fifties: 0, highScore: '100', innings: 63 },
    careerBowling: { matches: 69, wickets: 30, average: 34.1, economy: 9.2, strikeRate: 22.8, bestFigures: '3/35', fiveWickets: 0, innings: 0 },
  },
  'Matheesha Pathirana': {
    country: 'Sri Lanka',
    careerBatting: { matches: 109, runs: 41, average: 3.72, strikeRate: 0.5616, hundreds: 0, fifties: 0, highScore: '8', innings: 21 },
    careerBowling: { matches: 109, wickets: 146, average: 21.24, economy: 8.56, strikeRate: 14.8, bestFigures: '4/20', fiveWickets: 0, innings: 0 },
  },
  'Mustafizur Rahman': {
    country: 'Bangladesh',
    careerBatting: { matches: 321, runs: 226, average: 6.10, strikeRate: 0.7458, hundreds: 0, fifties: 0, highScore: '21', innings: 88 },
    careerBowling: { matches: 321, wickets: 410, average: 21.08, economy: 7.43, strikeRate: 17.0, bestFigures: '6/10', fiveWickets: 0, innings: 0 },
  },
  'Tejasvi Singh': {
    country: 'India',
  },
  'Finn Allen': {
    country: 'New Zealand',
    careerBatting: { matches: 179, runs: 5121, average: 30.30, strikeRate: 1.7531, hundreds: 0, fifties: 0, highScore: '151', innings: 176 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Tim Seifert': {
    country: 'New Zealand',
    careerBatting: { matches: 313, runs: 7267, average: 28.83, strikeRate: 1.3603, hundreds: 0, fifties: 0, highScore: '125*', innings: 288 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Rahul Tripathi': {
    country: 'India',
    careerBatting: { matches: 172, runs: 3807, average: 25.89, strikeRate: 1.3447, hundreds: 0, fifties: 0, highScore: '93', innings: 168 },
    careerBowling: { matches: 172, wickets: 12, average: 23.75, economy: 7.50, strikeRate: 19.0, bestFigures: '5/27', fiveWickets: 0, innings: 0 },
  },
  'Kartik Tyagi': {
    country: 'India',
    careerBatting: { matches: 33, runs: 13, average: 3.25, strikeRate: 0.8125, hundreds: 0, fifties: 0, highScore: '7', innings: 7 },
    careerBowling: { matches: 33, wickets: 25, average: 40.12, economy: 9.36, strikeRate: 25.8, bestFigures: '2/23', fiveWickets: 0, innings: 0 },
  },
  'Daksh Kamra': {
    country: 'India',
  },
  'Sarthak Ranjan': {
    country: 'India',
    careerBatting: { matches: 5, runs: 66, average: 13.20, strikeRate: 1.2692, hundreds: 0, fifties: 0, highScore: '31', innings: 5 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Prashant Solanki': {
    country: 'India',
    careerBatting: { matches: 23, runs: 1, average: 1.00, strikeRate: 0.5, hundreds: 0, fifties: 0, highScore: '1*', innings: 2 },
    careerBowling: { matches: 23, wickets: 20, average: 32.15, economy: 8.12, strikeRate: 23.7, bestFigures: '2/8', fiveWickets: 0, innings: 0 },
  },
  'Akashdeep': {
    country: 'India',
    careerBatting: { matches: 53, runs: 151, average: 13.72, strikeRate: 1.8641, hundreds: 0, fifties: 0, highScore: '31', innings: 21 },
    careerBowling: { matches: 53, wickets: 59, average: 26.23, economy: 8.32, strikeRate: 18.9, bestFigures: '4/35', fiveWickets: 0, innings: 0 },
  },
  'Rachin Ravindra': {
    country: 'New Zealand',
    careerBatting: { matches: 118, runs: 1949, average: 20.30, strikeRate: 1.3941, hundreds: 0, fifties: 0, highScore: '70', innings: 107 },
    careerBowling: { matches: 118, wickets: 67, average: 22.10, economy: 7.29, strikeRate: 18.1, bestFigures: '4/11', fiveWickets: 0, innings: 0 },
  },
  'Shubham Ranjane': {
    country: 'India',
    careerBatting: { matches: 61, runs: 919, average: 35.34, strikeRate: 1.3016, hundreds: 0, fifties: 0, highScore: '70', innings: 41 },
    careerBowling: { matches: 61, wickets: 23, average: 29.86, economy: 8.03, strikeRate: 22.3, bestFigures: '3/17', fiveWickets: 0, innings: 0 },
  },
  'Mayank Markande': {
    country: 'India',
    careerBatting: { matches: 93, runs: 108, average: 15.42, strikeRate: 1.125, hundreds: 0, fifties: 0, highScore: '33*', innings: 24 },
    careerBowling: { matches: 93, wickets: 94, average: 25.50, economy: 7.79, strikeRate: 19.6, bestFigures: '4/4', fiveWickets: 0, innings: 0 },
  },
  'Shardul Thakur': {
    country: 'India',
    careerBatting: { matches: 178, runs: 459, average: 10.92, strikeRate: 1.2966, hundreds: 0, fifties: 0, highScore: '68', innings: 65 },
    careerBowling: { matches: 178, wickets: 202, average: 26.92, economy: 9.04, strikeRate: 17.8, bestFigures: '4/25', fiveWickets: 0, innings: 0 },
  },
  'Rilee Rossouw': {
    country: 'South Africa',
    careerBatting: { matches: 391, runs: 9705, average: 29.67, strikeRate: 1.4552, hundreds: 0, fifties: 0, highScore: '121', innings: 375 },
    careerBowling: { matches: 391, wickets: 3, average: 10.66, economy: 5.64, strikeRate: 11.3, bestFigures: '1/3', fiveWickets: 0, innings: 0 },
  },
  'Brandon King': {
    country: 'West Indies',
    careerBatting: { matches: 189, runs: 4252, average: 25.92, strikeRate: 1.325, hundreds: 0, fifties: 0, highScore: '132*', innings: 179 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Reece Topley': {
    country: 'England',
    careerBatting: { matches: 136, runs: 66, average: 4.40, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '8', innings: 31 },
    careerBowling: { matches: 136, wickets: 158, average: 23.31, economy: 0, strikeRate: 0, bestFigures: '5/33', fiveWickets: 0, innings: 0 },
  },
  'Daniel Worrall': {
    country: 'Australia',
    careerBatting: { matches: 122, runs: 178, average: 11.86, strikeRate: 1.0171, hundreds: 0, fifties: 0, highScore: '62*', innings: 40 },
    careerBowling: { matches: 122, wickets: 108, average: 28.26, economy: 7.72, strikeRate: 21.9, bestFigures: '4/23', fiveWickets: 0, innings: 0 },
  },
  'Imran Tahir': {
    country: 'South Africa',
    careerBatting: { matches: 438, runs: 383, average: 8.70, strikeRate: 1.058, hundreds: 0, fifties: 0, highScore: '23', innings: 90 },
    careerBowling: { matches: 438, wickets: 559, average: 19.49, economy: 6.97, strikeRate: 16.8, bestFigures: '5/21', fiveWickets: 0, innings: 0 },
  },
  'Janco Smit': {
    country: 'South Africa',
    careerBatting: { matches: 108, runs: 1570, average: 28.03, strikeRate: 1.4659, hundreds: 0, fifties: 0, highScore: '111*', innings: 88 },
    careerBowling: { matches: 108, wickets: 94, average: 22.05, economy: 7.18, strikeRate: 18.4, bestFigures: '6/10', fiveWickets: 0, innings: 0 },
  },
  'Akeal Hosein': {
    country: 'West Indies',
    careerBatting: { matches: 95, runs: 293, average: 14.65, strikeRate: 1.1184, hundreds: 0, fifties: 0, highScore: '44', innings: 37 },
    careerBowling: { matches: 95, wickets: 92, average: 26.17, economy: 7.40, strikeRate: 21.22, bestFigures: '5/11', fiveWickets: 0, innings: 0 },
  },
  'Richard Gleeson': {
    country: 'England',
    careerBatting: { matches: 136, runs: 66, average: 4.40, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '8', innings: 31 },
    careerBowling: { matches: 136, wickets: 158, average: 23.31, economy: 0, strikeRate: 0, bestFigures: '5/33', fiveWickets: 0, innings: 0 },
  },
  'Hardik Pandya': {
    country: 'India',
    careerBatting: { matches: 301, runs: 5560, average: 29.73, strikeRate: 1.4256, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 301, wickets: 203, average: 28.15, economy: 8.39, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Rohit Sharma': {
    country: 'India',
    careerBatting: { matches: 463, runs: 12248, average: 30.85, strikeRate: 1.3521, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 463, wickets: 29, average: 28.62, economy: 7.84, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Suryakumar Yadav': {
    country: 'India',
    careerBatting: { matches: 352, runs: 9301, average: 35.63, strikeRate: 1.5335, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 352, wickets: 8, average: 18.12, economy: 6.3, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Tilak Varma': {
    country: 'India',
    careerBatting: { matches: 140, runs: 4243, average: 42.85, strikeRate: 1.4436, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
  },
  'Ryan Rickleton': {
    country: 'South Africa',
    careerBatting: { matches: 151, runs: 4167, average: 31.33, strikeRate: 1.4524, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 151, wickets: 1, average: 14, economy: 3.5, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Robin Minz': {
    country: 'India',
    careerBatting: { matches: 20, runs: 239, average: 19.91, strikeRate: 1.5519, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
  },
  'Mitchell Santner': {
    country: 'New Zealand',
    careerBatting: { matches: 251, runs: 2576, average: 23, strikeRate: 1.3183, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 251, wickets: 254, average: 24, economy: 7.14, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Corbin Bosch': {
    country: 'South Africa',
    careerBatting: { matches: 118, runs: 849, average: 17.68, strikeRate: 1.1335, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 118, wickets: 104, average: 26.57, economy: 8.3, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Naman Dhir': {
    country: 'India',
    careerBatting: { matches: 47, runs: 904, average: 25.82, strikeRate: 1.5971, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 47, wickets: 8, average: 37.62, economy: 9.4, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Jasprit Bumrah': {
    country: 'India',
    careerBatting: { matches: 244, runs: 102, average: 8.5, strikeRate: 0.8571, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 244, wickets: 313, average: 20.09, economy: 6.86, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Trent Boult': {
    country: 'New Zealand',
    careerBatting: { matches: 247, runs: 243, average: 10.12, strikeRate: 1.0474, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 247, wickets: 286, average: 25.43, economy: 8.02, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Allah Ghazanfar': {
    country: 'Afghanistan',
    careerBatting: { matches: 63, runs: 96, average: 5.05, strikeRate: 0.9696, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 63, wickets: 77, average: 19.9, economy: 6.72, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ashwani Kumar': {
    country: 'India',
    careerBowling: { matches: 20, wickets: 21, average: 29.66, economy: 10.13, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Deepak Chahar': {
    country: 'India',
    careerBatting: { matches: 166, runs: 462, average: 14.43, strikeRate: 1.3588, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 166, wickets: 184, average: 24.85, economy: 7.86, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Will Jacks': {
    country: 'England',
    careerBatting: { matches: 198, runs: 5055, average: 29.5, strikeRate: 1.548, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 198, wickets: 47, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Raghu Sharma': {
    country: 'India',
    careerBatting: { matches: 3, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 3, wickets: 3, average: 29.67, economy: 7.96, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Shreyas Iyer': {
    country: 'India',
    careerBatting: { matches: 240, runs: 6578, average: 34.08, strikeRate: 1.3661, hundreds: 3, fifties: 43, highScore: '0', innings: 0 },
    careerBowling: { matches: 240, wickets: 8, average: 81, economy: 9.91, strikeRate: 49, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Nehal Wadhera': {
    country: 'India',
    careerBatting: { matches: 61, runs: 1159, average: 26.34, strikeRate: 1.3461, hundreds: 0, fifties: 6, highScore: '0', innings: 0 },
    careerBowling: { matches: 61, wickets: 3, average: 16, economy: 7.19, strikeRate: 13.3, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Vishnu Vinod': {
    country: 'India',
    careerBatting: { matches: 72, runs: 1757, average: 32.53, strikeRate: 1.4192, hundreds: 1, fifties: 9, highScore: '0', innings: 0 },
    careerBowling: { matches: 72, wickets: 3, average: 0, economy: 7.57, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Prabhsimran Singh': {
    country: 'India',
    careerBatting: { matches: 115, runs: 3155, average: 30.63, strikeRate: 1.4903, hundreds: 2, fifties: 21, highScore: '0', innings: 0 },
  },
  'Shashank Singh': {
    country: 'India',
    careerBatting: { matches: 98, runs: 1631, average: 25.88, strikeRate: 1.4408, hundreds: 0, fifties: 10, highScore: '0', innings: 0 },
    careerBowling: { matches: 98, wickets: 21, average: 30.61, economy: 8.68, strikeRate: 21.1, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Marcus Stoinis': {
    country: 'Australia',
    careerBatting: { matches: 364, runs: 7287, average: 29.74, strikeRate: 1.3772, hundreds: 2, fifties: 38, highScore: '0', innings: 0 },
    careerBowling: { matches: 364, wickets: 202, average: 26.15, economy: 9.05, strikeRate: 17.3, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Harpreet Brar': {
    country: 'India',
    careerBatting: { matches: 105, runs: 427, average: 17.08, strikeRate: 1.2939, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 105, wickets: 102, average: 23.79, economy: 7.46, strikeRate: 19.1, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Marco Jansen': {
    country: 'South Africa',
    careerBatting: { matches: 138, runs: 1107, average: 18.76, strikeRate: 1.3683, hundreds: 0, fifties: 5, highScore: '0', innings: 0 },
    careerBowling: { matches: 138, wickets: 160, average: 25.44, economy: 8.26, strikeRate: 18.4, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Azmatullah Omarzai': {
    country: 'Afghanistan',
    careerBatting: { matches: 168, runs: 2029, average: 20.29, strikeRate: 1.3401, hundreds: 0, fifties: 3, highScore: '0', innings: 0 },
    careerBowling: { matches: 168, wickets: 157, average: 25.76, economy: 8.39, strikeRate: 18.4, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Musheer Khan': {
    country: 'India',
    careerBatting: { matches: 1, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 1, wickets: 1, average: 27, economy: 13.5, strikeRate: 12, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mitch Owen': {
    country: 'Australia',
    careerBatting: { matches: 75, runs: 1305, average: 22.11, strikeRate: 1.8099, hundreds: 2, fifties: 3, highScore: '0', innings: 0 },
    careerBowling: { matches: 75, wickets: 30, average: 27.6, economy: 9.87, strikeRate: 16.7, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Cooper Connolly': {
    country: 'Australia',
    careerBatting: { matches: 52, runs: 870, average: 24.85, strikeRate: 1.3262, hundreds: 0, fifties: 4, highScore: '0', innings: 0 },
    careerBowling: { matches: 52, wickets: 30, average: 24.13, economy: 7.46, strikeRate: 19.4, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ben Dwarshuis': {
    country: 'Australia',
    careerBatting: { matches: 188, runs: 1192, average: 18.62, strikeRate: 1.3974, hundreds: 0, fifties: 1, highScore: '0', innings: 0 },
    careerBowling: { matches: 188, wickets: 236, average: 23.22, economy: 8.33, strikeRate: 16.7, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Arshdeep Singh': {
    country: 'India',
    careerBatting: { matches: 192, runs: 161, average: 7.31, strikeRate: 1.0125, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 192, wickets: 255, average: 22.53, economy: 8.55, strikeRate: 15.8, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Yuzvendra Chahal': {
    country: 'India',
    careerBatting: { matches: 329, runs: 81, average: 4.5, strikeRate: 0.5328, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 329, wickets: 384, average: 23.6, economy: 7.73, strikeRate: 18.3, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Vyshak Vijaykumar': {
    country: 'India',
    careerBatting: { matches: 49, runs: 66, average: 6.6, strikeRate: 1.2222, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 49, wickets: 61, average: 25.52, economy: 8.94, strikeRate: 17.1, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Yash Thakur': {
    country: 'India',
    careerBatting: { matches: 73, runs: 38, average: 6.33, strikeRate: 0.6333, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 73, wickets: 108, average: 18.59, economy: 8.08, strikeRate: 13.8, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Xavier Bartlett': {
    country: 'Australia',
    careerBatting: { matches: 103, runs: 537, average: 15.79, strikeRate: 1.2401, hundreds: 0, fifties: 1, highScore: '0', innings: 0 },
    careerBowling: { matches: 103, wickets: 128, average: 23.05, economy: 8.62, strikeRate: 16, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Pravin Dubey': {
    country: 'India',
    careerBatting: { matches: 33, runs: 230, average: 15.33, strikeRate: 1.0798, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 33, wickets: 33, average: 20, economy: 7.26, strikeRate: 16.5, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Lockie Ferguson': {
    country: 'New Zealand',
    careerBatting: { matches: 204, runs: 292, average: 10.81, strikeRate: 1.123, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 204, wickets: 240, average: 22.47, economy: 7.75, strikeRate: 17.4, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Riyan Parag': {
    country: 'India',
    careerBatting: { matches: 143, runs: 3168, average: 30.75, strikeRate: 1.4413, hundreds: 0, fifties: 23, highScore: '0', innings: 0 },
    careerBowling: { matches: 143, wickets: 48, average: 30.93, economy: 7.34, strikeRate: 25.2, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Shimron Hetmyer': {
    country: 'West Indies',
    careerBatting: { matches: 322, runs: 6534, average: 27, strikeRate: 1.4436, hundreds: 1, fifties: 34, highScore: '0', innings: 0 },
  },
  'Jofra Archer': {
    country: 'England',
    careerBatting: { matches: 182, runs: 715, average: 14.3, strikeRate: 1.3856, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 182, wickets: 225, average: 23.47, economy: 7.87, strikeRate: 17.8, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Sam Curran': {
    country: 'England',
    careerBatting: { matches: 74, runs: 678, average: 20.55, strikeRate: 1.2792, hundreds: 0, fifties: 2, highScore: '0', innings: 0 },
    careerBowling: { matches: 74, wickets: 66, average: 27.18, economy: 8.65, strikeRate: 18.86, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ravindra Jadeja': {
    country: 'India',
    careerBatting: { matches: 346, runs: 3985, average: 26.39, strikeRate: 1.3082, hundreds: 0, fifties: 5, highScore: '0', innings: 0 },
    careerBowling: { matches: 346, wickets: 235, average: 30.85, economy: 7.62, strikeRate: 24.2, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Yashasvi Jaiswal': {
    country: 'India',
    careerBatting: { matches: 121, runs: 3682, average: 33.47, strikeRate: 1.5227, hundreds: 4, fifties: 23, highScore: '0', innings: 0 },
  },
  'Dhruv Jurel': {
    country: 'India',
    careerBatting: { matches: 56, runs: 784, average: 24.5, strikeRate: 1.4126, hundreds: 0, fifties: 4, highScore: '0', innings: 0 },
  },
  'Tushar Deshpande': {
    country: 'India',
    careerBatting: { matches: 102, runs: 53, average: 6.62, strikeRate: 1.0816, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 102, wickets: 135, average: 23.53, economy: 8.87, strikeRate: 15.9, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ravi Bishnoi': {
    country: 'India',
    careerBatting: { matches: 45, runs: 65, average: 9.29, strikeRate: 1.25, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 45, wickets: 67, average: 19.19, economy: 7.45, strikeRate: 15.46, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Adam Milne': {
    country: 'New Zealand',
    careerBatting: { matches: 214, runs: 492, average: 11.44, strikeRate: 1.1826, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 214, wickets: 246, average: 23.45, economy: 7.88, strikeRate: 17.8, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Suyash Sharma': {
    country: 'India',
    careerBatting: { matches: 52, runs: 7, average: 7, strikeRate: 0.7, hundreds: 0, fifties: 0, highScore: '6*', innings: 0 },
    careerBowling: { matches: 52, wickets: 56, average: 26.07, economy: 7.65, strikeRate: 20.4, bestFigures: '5/13', fiveWickets: 1, innings: 0 },
  },
  'Krunal Pandya': {
    country: 'India',
    careerBatting: { matches: 228, runs: 3017, average: 23.57, strikeRate: 1.3021, hundreds: 0, fifties: 9, highScore: '86', innings: 0 },
    careerBowling: { matches: 228, wickets: 165, average: 30.56, economy: 7.35, strikeRate: 24.9, bestFigures: '4/15', fiveWickets: 0, innings: 0 },
  },
  'Bhuvneshwar Kumar': {
    country: 'India',
    careerBatting: { matches: 315, runs: 529, average: 9.98, strikeRate: 0.9379, hundreds: 0, fifties: 0, highScore: '27', innings: 0 },
    careerBowling: { matches: 315, wickets: 335, average: 24.96, economy: 7.35, strikeRate: 20.3, bestFigures: '5/4', fiveWickets: 5, innings: 0 },
  },
  'Nuwan Thushara': {
    country: 'Sri Lanka',
    careerBatting: { matches: 137, runs: 41, average: 4.1, strikeRate: 0.5774, hundreds: 0, fifties: 0, highScore: '7*', innings: 0 },
    careerBowling: { matches: 137, wickets: 174, average: 21.25, economy: 8.25, strikeRate: 15.4, bestFigures: '5/13', fiveWickets: 2, innings: 0 },
  },
  'Jordan Cox': {
    country: 'England',
    careerBatting: { matches: 174, runs: 3931, average: 30.71, strikeRate: 1.4004, hundreds: 1, fifties: 20, highScore: '139', innings: 0 },
  },
  'Phil Salt': {
    country: 'England',
    careerBatting: { matches: 176, runs: 3936, average: 30.27, strikeRate: 1.3962, hundreds: 1, fifties: 20, highScore: '139', innings: 0 },
  },
  'Devdutt Padikkal': {
    country: 'India',
    careerBatting: { matches: 115, runs: 3362, average: 32.32, strikeRate: 1.3583, hundreds: 4, fifties: 21, highScore: '124', innings: 0 },
  },
  'Rajat Patidar': {
    country: 'India',
    careerBatting: { matches: 98, runs: 2888, average: 34.38, strikeRate: 1.5551, hundreds: 1, fifties: 26, highScore: '112*', innings: 0 },
  },
  'Virat Kohli': {
    country: 'India',
    careerBatting: { matches: 267, runs: 8661, average: 39.55, strikeRate: 1.3286, hundreds: 8, fifties: 63, highScore: '113', innings: 0 },
    careerBowling: { matches: 267, wickets: 4, average: 92, economy: 8.8, strikeRate: 62.75, bestFigures: '2/25', fiveWickets: 0, innings: 0 },
  },
  'Jitesh Sharma': {
    country: 'India',
    careerBatting: { matches: 145, runs: 2994, average: 27.98, strikeRate: 1.5401, hundreds: 1, fifties: 12, highScore: '106', innings: 0 },
  },
  'Tim David': {
    country: 'Australia',
    careerBatting: { matches: 300, runs: 4000, average: 28, strikeRate: 1.538, hundreds: 0, fifties: 18, highScore: '92*', innings: 0 },
    careerBowling: { matches: 300, wickets: 40, average: 65, economy: 8, strikeRate: 27, bestFigures: '2/20', fiveWickets: 0, innings: 0 },
  },
  'Romario Shepherd': {
    country: 'West Indies',
    careerBatting: { matches: 232, runs: 2545, average: 24.95, strikeRate: 1.5661, hundreds: 0, fifties: 7, highScore: '52*', innings: 0 },
    careerBowling: { matches: 232, wickets: 212, average: 26.33, economy: 9.23, strikeRate: 17.1, bestFigures: '5/20', fiveWickets: 1, innings: 0 },
  },
  'Jacob Bethell': {
    country: 'England',
    careerBatting: { matches: 95, runs: 1717, average: 23.52, strikeRate: 1.3914, hundreds: 0, fifties: 9, highScore: '87', innings: 0 },
    careerBowling: { matches: 95, wickets: 22, average: 22.18, economy: 8.31, strikeRate: 16, bestFigures: '4/11', fiveWickets: 0, innings: 0 },
  },
  'Venkatesh Iyer': {
    country: 'India',
    careerBatting: { matches: 135, runs: 3038, average: 35.32, strikeRate: 1.4071, hundreds: 1, fifties: 17, highScore: '104', innings: 0 },
    careerBowling: { matches: 135, wickets: 49, average: 25.18, economy: 7.7, strikeRate: 19.6, bestFigures: '6/20', fiveWickets: 1, innings: 0 },
  },
  'Satvik Deswal': {
    country: 'India',
    careerBatting: { matches: 0, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mangesh Yadav': {
    country: 'India',
    careerBatting: { matches: 2, runs: 28, average: 28, strikeRate: 2.3333, hundreds: 0, fifties: 0, highScore: '28', innings: 0 },
    careerBowling: { matches: 2, wickets: 3, average: 28.33, economy: 12.14, strikeRate: 14, bestFigures: '2/38', fiveWickets: 0, innings: 0 },
  },
  'Vicky Ostwal': {
    country: 'India',
    careerBatting: { matches: 15, runs: 67, average: 13.4, strikeRate: 1.0634, hundreds: 0, fifties: 0, highScore: '28', innings: 0 },
    careerBowling: { matches: 15, wickets: 14, average: 25.71, economy: 6.46, strikeRate: 23.8, bestFigures: '3/27', fiveWickets: 0, innings: 0 },
  },
  'Vihaan Malhotra': {
    country: 'India',
    careerBatting: { matches: 0, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Kanishk Chouhan': {
    country: 'India',
    careerBatting: { matches: 0, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Josh Hazlewood': {
    country: 'Australia',
    careerBatting: { matches: 127, runs: 71, average: 14.2, strikeRate: 0.8554, hundreds: 0, fifties: 0, highScore: '13', innings: 0 },
    careerBowling: { matches: 127, wickets: 170, average: 21.29, economy: 7.62, strikeRate: 16.7, bestFigures: '4/12', fiveWickets: 0, innings: 0 },
  },
  'Rasikh Dar': {
    country: 'India',
    careerBatting: { matches: 42, runs: 78, average: 7.09, strikeRate: 0.9873, hundreds: 0, fifties: 0, highScore: '10*', innings: 0 },
    careerBowling: { matches: 42, wickets: 50, average: 24.1, economy: 8.47, strikeRate: 17, bestFigures: '6/31', fiveWickets: 1, innings: 0 },
  },
  'Ishan Kishan': {
    country: 'India',
    careerBatting: { matches: 221, runs: 6022, average: 30.56, strikeRate: 1.4017, hundreds: 7, fifties: 32, highScore: '113', innings: 0 },
  },
  'Heinrich Klaasen': {
    country: 'South Africa',
    careerBatting: { matches: 276, runs: 6186, average: 31.24, strikeRate: 1.4985, hundreds: 3, fifties: 37, highScore: '105', innings: 0 },
    careerBowling: { matches: 276, wickets: 1, average: 68, economy: 9.71, strikeRate: 42, bestFigures: '1/12', fiveWickets: 0, innings: 0 },
  },
  'Travis Head': {
    country: 'Australia',
    careerBatting: { matches: 221, runs: 5674, average: 28.1, strikeRate: 1.436, hundreds: 1, fifties: 33, highScore: '100', innings: 0 },
    careerBowling: { matches: 221, wickets: 89, average: 27, economy: 8.44, strikeRate: 19.2, bestFigures: '4/17', fiveWickets: 0, innings: 0 },
  },
  'Harshal Patel': {
    country: 'India',
    careerBatting: { matches: 205, runs: 1288, average: 15.7, strikeRate: 1.3924, hundreds: 0, fifties: 4, highScore: '82', innings: 0 },
    careerBowling: { matches: 205, wickets: 253, average: 23.09, economy: 8.38, strikeRate: 16.5, bestFigures: '5/12', fiveWickets: 2, innings: 0 },
  },
  'Kamindu Mendis': {
    country: 'Sri Lanka',
    careerBatting: { matches: 125, runs: 2442, average: 26.25, strikeRate: 1.3072, hundreds: 0, fifties: 14, highScore: '99*', innings: 0 },
    careerBowling: { matches: 125, wickets: 30, average: 41.86, economy: 8.08, strikeRate: 31, bestFigures: '3/21', fiveWickets: 0, innings: 0 },
  },
  'Brydon Carse': {
    country: 'England',
    careerBatting: { matches: 88, runs: 792, average: 17.21, strikeRate: 1.3919, hundreds: 0, fifties: 2, highScore: '58', innings: 0 },
    careerBowling: { matches: 88, wickets: 58, average: 35.48, economy: 9.09, strikeRate: 23.3, bestFigures: '3/23', fiveWickets: 0, innings: 0 },
  },
  'Liam Livingstone': {
    country: 'England',
    careerBatting: { matches: 221, runs: 5674, average: 28.1, strikeRate: 1.436, hundreds: 1, fifties: 33, highScore: '100', innings: 0 },
    careerBowling: { matches: 221, wickets: 89, average: 27, economy: 8.44, strikeRate: 19.2, bestFigures: '4/17', fiveWickets: 0, innings: 0 },
  },
  'Abhishek Sharma': {
    country: 'India',
    careerBatting: { matches: 171, runs: 5070, average: 33.57, strikeRate: 1.45, hundreds: 8, fifties: 29, highScore: '148', innings: 0 },
    careerBowling: { matches: 171, wickets: 54, average: 27.53, economy: 7.5, strikeRate: 22, bestFigures: '3/7', fiveWickets: 0, innings: 0 },
  },
  'Pat Cummins': {
    country: 'Australia',
    careerBatting: { matches: 206, runs: 562, average: 15.61, strikeRate: 1.3009, hundreds: 0, fifties: 1, highScore: '58', innings: 0 },
    careerBowling: { matches: 206, wickets: 245, average: 22, economy: 8, strikeRate: 20, bestFigures: '5/25', fiveWickets: 2, innings: 0 },
  },
  'Shivam Mavi': {
    country: 'India',
    careerBatting: { matches: 68, runs: 195, average: 8.86, strikeRate: 1.147, hundreds: 0, fifties: 0, highScore: '45*', innings: 0 },
    careerBowling: { matches: 68, wickets: 63, average: 29.46, economy: 8.27, strikeRate: 21.3, bestFigures: '4/14', fiveWickets: 0, innings: 0 },
  },
  'Nitish Kumar Reddy': {
    country: 'India',
    careerBatting: { matches: 40, runs: 737, average: 28.34, strikeRate: 1.3113, hundreds: 0, fifties: 3, highScore: '76*', innings: 0 },
    careerBowling: { matches: 40, wickets: 14, average: 31.5, economy: 9.76, strikeRate: 19.3, bestFigures: '3/17', fiveWickets: 0, innings: 0 },
  },
  'Jaydev Unadkat': {
    country: 'India',
    careerBatting: { matches: 206, runs: 562, average: 15.61, strikeRate: 1.3009, hundreds: 0, fifties: 1, highScore: '58', innings: 0 },
    careerBowling: { matches: 206, wickets: 245, average: 22, economy: 8, strikeRate: 20, bestFigures: '5/25', fiveWickets: 2, innings: 0 },
  },
}

export function getProfileForPlayer(name: string): PlayerProfile {
  const base = makeDefaultProfile()
  const known = KNOWN_STATS[name]
  if (!known) return base
  return {
    ...base,
    ...known,
    careerBatting: known.careerBatting ? { ...base.careerBatting, ...known.careerBatting } : base.careerBatting,
    careerBowling: known.careerBowling ? { ...base.careerBowling, ...known.careerBowling } : base.careerBowling,
  }
}
