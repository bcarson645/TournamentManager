export interface CareerBatting {
  matches: number
  runs: number
  average: number
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
    careerBatting: { matches: 0, runs: 7508, average: 38.30, strikeRate: 135.67, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 1, wickets: 0, average: 0, economy: 12.50, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ruturaj Gaikwad': {
    country: 'India',
    careerBatting: { matches: 0, runs: 5002, average: 39.07, strikeRate: 140.54, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Sanju Samson': {
    country: 'India',
    careerBatting: { matches: 0, runs: 1100, average: 23.91, strikeRate: 148.85, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 1, wickets: 1, average: 0, economy: 8.00, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ayush Mhatre': {
    country: 'India',
    careerBatting: { matches: 0, runs: 565, average: 56.50, strikeRate: 175.46, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Dewald Brevis': {
    country: 'South Africa',
    careerBatting: { matches: 0, runs: 3164, average: 28.76, strikeRate: 153.44, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 133, wickets: 18, average: 21.27, economy: 7.43, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Shivam Dube': {
    country: 'India',
    careerBatting: { matches: 103, runs: 1691, average: 24.15, strikeRate: 143.03, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 92, wickets: 42, average: 0, economy: 8.40, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Urvil Patel': {
    country: 'India',
    careerBatting: { matches: 57, runs: 1425, average: 26.88, strikeRate: 179.47, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Noor Ahmad': {
    country: 'Afghanistan',
    careerBatting: { matches: 196, runs: 244, average: 6.25, strikeRate: 98.78, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 196, wickets: 229, average: 22.27, economy: 7.33, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Nathan Ellis': {
    country: 'Australia',
    careerBatting: { matches: 186, runs: 525, average: 11.41, strikeRate: 110.99, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 186, wickets: 231, average: 22.96, economy: 8.13, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Shreyas Gopal': {
    country: 'India',
    careerBatting: { matches: 110, runs: 551, average: 16.20, strikeRate: 122.17, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 110, wickets: 129, average: 20.25, economy: 7.60, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Gurjapneet Singh': {
    country: 'India',
    careerBatting: { matches: 15, runs: 10, average: 5.00, strikeRate: 62.50, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 15, wickets: 21, average: 24.38, economy: 9.25, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Khaleel Ahmed': {
    country: 'India',
    careerBatting: { matches: 128, runs: 11, average: 1.57, strikeRate: 34.37, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 128, wickets: 159, average: 25.15, economy: 8.49, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Anshul Kamboj': {
    country: 'India',
    careerBatting: { matches: 41, runs: 95, average: 13.57, strikeRate: 125.00, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 41, wickets: 55, average: 19.27, economy: 8.18, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mukesh Choudhary': {
    country: 'India',
    careerBatting: { matches: 36, runs: 32, average: 10.66, strikeRate: 96.96, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 36, wickets: 48, average: 23.62, economy: 9.16, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Jamie Overton': {
    country: 'England',
    careerBatting: { matches: 182, runs: 1738, average: 20.44, strikeRate: 157.14, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 182, wickets: 136, average: 27.29, economy: 9.11, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Nitish Rana': {
    country: 'India',
    careerBatting: { matches: 211, runs: 5122, average: 28.61, strikeRate: 136.55, hundreds: 1, fifties: 34, highScore: '107', innings: 200 },
    careerBowling: { matches: 211, wickets: 51, average: 22.88, economy: 7.18, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Abishek Porel': {
    country: 'India',
    careerBatting: { matches: 57, runs: 1482, average: 30.24, strikeRate: 154.53, hundreds: 0, fifties: 10, highScore: '81', innings: 55 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ajay Mandal': {
    country: 'India',
    careerBatting: { matches: 52, runs: 490, average: 16.33, strikeRate: 131.72, hundreds: 0, fifties: 0, highScore: '49', innings: 42 },
    careerBowling: { matches: 52, wickets: 52, average: 23.65, economy: 7.32, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ashutosh Sharma': {
    country: 'India',
    careerBatting: { matches: 48, runs: 989, average: 30.90, strikeRate: 176.0, hundreds: 0, fifties: 8, highScore: '84', innings: 39 },
    careerBowling: { matches: 54, wickets: 4, average: 28.75, economy: 10.95, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Axar Patel': {
    country: 'India',
    careerBatting: { matches: 91, runs: 700, average: 18.42, strikeRate: 134.10, hundreds: 0, fifties: 1, highScore: '65', innings: 56 },
    careerBowling: { matches: 91, wickets: 93, average: 21.30, economy: 7.32, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Dushmantha Chameera': {
    country: 'Sri Lanka',
    careerBatting: { matches: 170, runs: 231, average: 6.41, strikeRate: 87.50, hundreds: 0, fifties: 0, highScore: '24', innings: 65 },
    careerBowling: { matches: 170, wickets: 188, average: 26.01, economy: 8.15, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Karun Nair': {
    country: 'India',
    careerBatting: { matches: 171, runs: 3660, average: 26.3, strikeRate: 136.5, hundreds: 2, fifties: 22, highScore: '111', innings: 156 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'KL Rahul': {
    country: 'India',
    careerBatting: { matches: 71, runs: 2265, average: 31.90, strikeRate: 139.1, hundreds: 2, fifties: 22, highScore: '110', innings: 68 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Kuldeep Yadav': {
    country: 'India',
    careerBatting: { matches: 50, runs: 47, average: 9.40, strikeRate: 69.12, hundreds: 0, fifties: 0, highScore: '23', innings: 9 },
    careerBowling: { matches: 50, wickets: 90, average: 13.18, economy: 6.82, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Madhav Tiwari': {
    country: 'India',
    careerBatting: { matches: 1, runs: 3, average: 3.00, strikeRate: 75.00, hundreds: 0, fifties: 0, highScore: '3', innings: 1 },
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
    careerBatting: { matches: 28, runs: 229, average: 16.35, strikeRate: 157.93, hundreds: 0, fifties: 0, highScore: '39', innings: 17 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mukesh Kumar': {
    country: 'India',
    careerBatting: { matches: 77, runs: 20, average: 6.66, strikeRate: 62.50, hundreds: 0, fifties: 0, highScore: '6', innings: 16 },
    careerBowling: { matches: 63, wickets: 62, average: 26.10, economy: 8.17, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Mitchell Starc': {
    country: 'Australia',
    careerBowling: { matches: 144, wickets: 201, average: 20.90, economy: 7.43, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Anuj Rawat': {
    country: 'India',
    careerBatting: { matches: 77, runs: 1304, average: 25.07, strikeRate: 120.96, hundreds: 0, fifties: 5, highScore: '88*', innings: 68 },
    careerBowling: { matches: 77, wickets: 0, average: 0, economy: 14.00, strikeRate: 0, bestFigures: '0/14', fiveWickets: 0, innings: 1 },
  },
  'Glenn Phillips': {
    country: 'New Zealand',
    careerBatting: { matches: 283, runs: 7237, average: 32.45, strikeRate: 141.37, hundreds: 5, fifties: 47, highScore: '116*', innings: 262 },
    careerBowling: { matches: 283, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '3/6', fiveWickets: 0, innings: 0 },
  },
  'Gurnoor Brar': {
    country: 'India',
    careerBatting: { matches: 9, runs: 18, average: 6.00, strikeRate: 85.71, hundreds: 0, fifties: 0, highScore: '8', innings: 3 },
    careerBowling: { matches: 9, wickets: 10, average: 33.70, economy: 10.81, strikeRate: 18.7, bestFigures: '3/23', fiveWickets: 0, innings: 9 },
  },
  'Ishant Sharma': {
    country: 'India',
    careerBatting: { matches: 182, runs: 71, average: 7.88, strikeRate: 78.88, hundreds: 0, fifties: 0, highScore: '10', innings: 37 },
    careerBowling: { matches: 179, wickets: 155, average: 31.80, economy: 7.93, strikeRate: 0, bestFigures: '5/12', fiveWickets: 0, innings: 179 },
  },
  'Jayant Yadav': {
    country: 'India',
    careerBatting: { matches: 88, runs: 388, average: 14.9, strikeRate: 117.9, hundreds: 0, fifties: 0, highScore: '39', innings: 46 },
    careerBowling: { matches: 88, wickets: 52, average: 32.63, economy: 6.34, strikeRate: 32.6, bestFigures: '4/22', fiveWickets: 0, innings: 83 },
  },
  'Jos Buttler': {
    country: 'England',
    careerBatting: { matches: 457, runs: 13046, average: 35.74, strikeRate: 145.97, hundreds: 8, fifties: 93, highScore: '124', innings: 431 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Kagiso Rabada': {
    country: 'South Africa',
    careerBatting: { matches: 78, runs: 184, average: 15.33, strikeRate: 116.46, hundreds: 0, fifties: 0, highScore: '22', innings: 29 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '3/18', fiveWickets: 0, innings: 0 },
  },
  'Kumar Kushagra': {
    country: 'India',
    careerBatting: { matches: 32, runs: 676, average: 28.16, strikeRate: 145.68, hundreds: 0, fifties: 5, highScore: '86*', innings: 30 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Manav Suthar': {
    country: 'India',
    careerBatting: { matches: 25, runs: 94, average: 10.44, strikeRate: 127.02, hundreds: 0, fifties: 0, highScore: '16*', innings: 15 },
    careerBowling: { matches: 25, wickets: 23, average: 23.73, economy: 7.03, strikeRate: 20.2, bestFigures: '3/21', fiveWickets: 0, innings: 25 },
  },
  'Mohammed Siraj': {
    country: 'India',
    careerBatting: { matches: 161, runs: 154, average: 8.10, strikeRate: 85.08, hundreds: 0, fifties: 0, highScore: '14*', innings: 39 },
    careerBowling: { matches: 161, wickets: 186, average: 25.66, economy: 8.24, strikeRate: 18.6, bestFigures: '4/17', fiveWickets: 0, innings: 160 },
  },
  'Arshad Khan': {
    country: 'India',
    careerBatting: { matches: 30, runs: 226, average: 18.83, strikeRate: 148.68, hundreds: 0, fifties: 1, highScore: '58*', innings: 22 },
    careerBowling: { matches: 30, wickets: 29, average: 23.79, economy: 9.40, strikeRate: 15.1, bestFigures: '6/9', fiveWickets: 0, innings: 29 },
  },
  'Nishant Sindhu': {
    country: 'India',
    careerBatting: { matches: 37, runs: 763, average: 27.25, strikeRate: 138.97, hundreds: 1, fifties: 3, highScore: '100*', innings: 33 },
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
    careerBatting: { matches: 169, runs: 2107, average: 26.01, strikeRate: 144.31, hundreds: 0, fifties: 3, highScore: '59*', innings: 129 },
    careerBowling: { matches: 169, wickets: 69, average: 26.34, economy: 7.40, strikeRate: 21.3, bestFigures: '3/4', fiveWickets: 0, innings: 92 },
  },
  'Rashid Khan': {
    country: 'Afghanistan',
    careerBatting: { matches: 482, runs: 2646, average: 0, strikeRate: 146.18, hundreds: 0, fifties: 5, highScore: '--', innings: 0 },
    careerBowling: { matches: 482, wickets: 700, average: 18.54, economy: 6.57, strikeRate: 0, bestFigures: '4/--', fiveWickets: 0, innings: 0 },
  },
  'B Sai Sudharsan': {
    country: 'India',
    careerBatting: { matches: 66, runs: 2463, average: 43.2, strikeRate: 139.1, hundreds: 3, fifties: 15, highScore: '108', innings: 65 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'M Shahrukh Khan': {
    country: 'India',
    careerBatting: { matches: 116, runs: 1389, average: 19.29, strikeRate: 139.31, hundreds: 0, fifties: 2, highScore: '58', innings: 98 },
    careerBowling: { matches: 116, wickets: 8, average: 34.62, economy: 8.56, strikeRate: 24.2, bestFigures: '2/19', fiveWickets: 0, innings: 16 },
  },
  'Shubman Gill': {
    country: 'India',
    careerBatting: { matches: 157, runs: 5072, average: 38.0, strikeRate: 138.0, hundreds: 6, fifties: 32, highScore: '126*', innings: 154 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Washington Sundar': {
    country: 'India',
    careerBowling: { matches: 89, wickets: 66, average: 29.6, economy: 7.35, strikeRate: 24.1, bestFigures: '4/23', fiveWickets: 0, innings: 89 },
  },
  'Cameron Green': {
    country: 'Australia',
    careerBatting: { matches: 69, runs: 1451, average: 31.5, strikeRate: 148.4, hundreds: 1, fifties: 0, highScore: '100', innings: 63 },
    careerBowling: { matches: 69, wickets: 30, average: 34.1, economy: 9.2, strikeRate: 22.8, bestFigures: '3/35', fiveWickets: 0, innings: 0 },
  },
  'Matheesha Pathirana': {
    country: 'Sri Lanka',
    careerBatting: { matches: 109, runs: 41, average: 3.72, strikeRate: 56.16, hundreds: 0, fifties: 0, highScore: '8', innings: 21 },
    careerBowling: { matches: 109, wickets: 146, average: 21.24, economy: 8.56, strikeRate: 14.8, bestFigures: '4/20', fiveWickets: 0, innings: 0 },
  },
  'Mustafizur Rahman': {
    country: 'Bangladesh',
    careerBatting: { matches: 321, runs: 226, average: 6.10, strikeRate: 74.58, hundreds: 0, fifties: 0, highScore: '21', innings: 88 },
    careerBowling: { matches: 321, wickets: 410, average: 21.08, economy: 7.43, strikeRate: 17.0, bestFigures: '6/10', fiveWickets: 0, innings: 0 },
  },
  'Tejasvi Singh': {
    country: 'India',
  },
  'Finn Allen': {
    country: 'New Zealand',
    careerBatting: { matches: 179, runs: 5121, average: 30.30, strikeRate: 175.31, hundreds: 0, fifties: 0, highScore: '151', innings: 176 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Tim Seifert': {
    country: 'New Zealand',
    careerBatting: { matches: 313, runs: 7267, average: 28.83, strikeRate: 136.03, hundreds: 0, fifties: 0, highScore: '125*', innings: 288 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Rahul Tripathi': {
    country: 'India',
    careerBatting: { matches: 172, runs: 3807, average: 25.89, strikeRate: 134.47, hundreds: 0, fifties: 0, highScore: '93', innings: 168 },
    careerBowling: { matches: 172, wickets: 12, average: 23.75, economy: 7.50, strikeRate: 19.0, bestFigures: '5/27', fiveWickets: 0, innings: 0 },
  },
  'Kartik Tyagi': {
    country: 'India',
    careerBatting: { matches: 33, runs: 13, average: 3.25, strikeRate: 81.25, hundreds: 0, fifties: 0, highScore: '7', innings: 7 },
    careerBowling: { matches: 33, wickets: 25, average: 40.12, economy: 9.36, strikeRate: 25.8, bestFigures: '2/23', fiveWickets: 0, innings: 0 },
  },
  'Daksh Kamra': {
    country: 'India',
  },
  'Sarthak Ranjan': {
    country: 'India',
    careerBatting: { matches: 5, runs: 66, average: 13.20, strikeRate: 126.92, hundreds: 0, fifties: 0, highScore: '31', innings: 5 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Prashant Solanki': {
    country: 'India',
    careerBatting: { matches: 23, runs: 1, average: 1.00, strikeRate: 50.00, hundreds: 0, fifties: 0, highScore: '1*', innings: 2 },
    careerBowling: { matches: 23, wickets: 20, average: 32.15, economy: 8.12, strikeRate: 23.7, bestFigures: '2/8', fiveWickets: 0, innings: 0 },
  },
  'Akashdeep': {
    country: 'India',
    careerBatting: { matches: 53, runs: 151, average: 13.72, strikeRate: 186.41, hundreds: 0, fifties: 0, highScore: '31', innings: 21 },
    careerBowling: { matches: 53, wickets: 59, average: 26.23, economy: 8.32, strikeRate: 18.9, bestFigures: '4/35', fiveWickets: 0, innings: 0 },
  },
  'Rachin Ravindra': {
    country: 'New Zealand',
    careerBatting: { matches: 118, runs: 1949, average: 20.30, strikeRate: 139.41, hundreds: 0, fifties: 0, highScore: '70', innings: 107 },
    careerBowling: { matches: 118, wickets: 67, average: 22.10, economy: 7.29, strikeRate: 18.1, bestFigures: '4/11', fiveWickets: 0, innings: 0 },
  },
  'Shubham Ranjane': {
    country: 'India',
    careerBatting: { matches: 61, runs: 919, average: 35.34, strikeRate: 130.16, hundreds: 0, fifties: 0, highScore: '70', innings: 41 },
    careerBowling: { matches: 61, wickets: 23, average: 29.86, economy: 8.03, strikeRate: 22.3, bestFigures: '3/17', fiveWickets: 0, innings: 0 },
  },
  'Mayank Markande': {
    country: 'India',
    careerBatting: { matches: 93, runs: 108, average: 15.42, strikeRate: 112.50, hundreds: 0, fifties: 0, highScore: '33*', innings: 24 },
    careerBowling: { matches: 93, wickets: 94, average: 25.50, economy: 7.79, strikeRate: 19.6, bestFigures: '4/4', fiveWickets: 0, innings: 0 },
  },
  'Shardul Thakur': {
    country: 'India',
    careerBatting: { matches: 178, runs: 459, average: 10.92, strikeRate: 129.66, hundreds: 0, fifties: 0, highScore: '68', innings: 65 },
    careerBowling: { matches: 178, wickets: 202, average: 26.92, economy: 9.04, strikeRate: 17.8, bestFigures: '4/25', fiveWickets: 0, innings: 0 },
  },
  'Rilee Rossouw': {
    country: 'South Africa',
    careerBatting: { matches: 391, runs: 9705, average: 29.67, strikeRate: 145.52, hundreds: 0, fifties: 0, highScore: '121', innings: 375 },
    careerBowling: { matches: 391, wickets: 3, average: 10.66, economy: 5.64, strikeRate: 11.3, bestFigures: '1/3', fiveWickets: 0, innings: 0 },
  },
  'Brandon King': {
    country: 'West Indies',
    careerBatting: { matches: 189, runs: 4252, average: 25.92, strikeRate: 132.50, hundreds: 0, fifties: 0, highScore: '132*', innings: 179 },
    careerBowling: { matches: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Reece Topley': {
    country: 'England',
    careerBatting: { matches: 136, runs: 66, average: 4.40, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '8', innings: 31 },
    careerBowling: { matches: 136, wickets: 158, average: 23.31, economy: 0, strikeRate: 0, bestFigures: '5/33', fiveWickets: 0, innings: 0 },
  },
  'Daniel Worrall': {
    country: 'Australia',
    careerBatting: { matches: 122, runs: 178, average: 11.86, strikeRate: 101.71, hundreds: 0, fifties: 0, highScore: '62*', innings: 40 },
    careerBowling: { matches: 122, wickets: 108, average: 28.26, economy: 7.72, strikeRate: 21.9, bestFigures: '4/23', fiveWickets: 0, innings: 0 },
  },
  'Imran Tahir': {
    country: 'South Africa',
    careerBatting: { matches: 438, runs: 383, average: 8.70, strikeRate: 105.80, hundreds: 0, fifties: 0, highScore: '23', innings: 90 },
    careerBowling: { matches: 438, wickets: 559, average: 19.49, economy: 6.97, strikeRate: 16.8, bestFigures: '5/21', fiveWickets: 0, innings: 0 },
  },
  'Janco Smit': {
    country: 'South Africa',
    careerBatting: { matches: 108, runs: 1570, average: 28.03, strikeRate: 146.59, hundreds: 0, fifties: 0, highScore: '111*', innings: 88 },
    careerBowling: { matches: 108, wickets: 94, average: 22.05, economy: 7.18, strikeRate: 18.4, bestFigures: '6/10', fiveWickets: 0, innings: 0 },
  },
  'Akeal Hosein': {
    country: 'West Indies',
    careerBatting: { matches: 95, runs: 293, average: 14.65, strikeRate: 111.84, hundreds: 0, fifties: 0, highScore: '44', innings: 37 },
    careerBowling: { matches: 95, wickets: 92, average: 26.17, economy: 7.40, strikeRate: 21.22, bestFigures: '5/11', fiveWickets: 0, innings: 0 },
  },
  'Richard Gleeson': {
    country: 'England',
    careerBatting: { matches: 136, runs: 66, average: 4.40, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '8', innings: 31 },
    careerBowling: { matches: 136, wickets: 158, average: 23.31, economy: 0, strikeRate: 0, bestFigures: '5/33', fiveWickets: 0, innings: 0 },
  },
  'Hardik Pandya': {
    country: 'India',
    careerBatting: { matches: 301, runs: 5560, average: 29.73, strikeRate: 142.56, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 301, wickets: 203, average: 28.15, economy: 8.39, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Rohit Sharma': {
    country: 'India',
    careerBatting: { matches: 463, runs: 12248, average: 30.85, strikeRate: 135.21, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 463, wickets: 29, average: 28.62, economy: 7.84, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Suryakumar Yadav': {
    country: 'India',
    careerBatting: { matches: 352, runs: 9301, average: 35.63, strikeRate: 153.35, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 352, wickets: 8, average: 18.12, economy: 6.3, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Tilak Varma': {
    country: 'India',
    careerBatting: { matches: 140, runs: 4243, average: 42.85, strikeRate: 144.36, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
  },
  'Ryan Rickleton': {
    country: 'South Africa',
    careerBatting: { matches: 151, runs: 4167, average: 31.33, strikeRate: 145.24, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 151, wickets: 1, average: 14, economy: 3.5, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Robin Minz': {
    country: 'India',
    careerBatting: { matches: 20, runs: 239, average: 19.91, strikeRate: 155.19, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
  },
  'Mitchell Santner': {
    country: 'New Zealand',
    careerBatting: { matches: 251, runs: 2576, average: 23, strikeRate: 131.83, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 251, wickets: 254, average: 24, economy: 7.14, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Corbin Bosch': {
    country: 'South Africa',
    careerBatting: { matches: 118, runs: 849, average: 17.68, strikeRate: 113.35, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 118, wickets: 104, average: 26.57, economy: 8.3, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Naman Dhir': {
    country: 'India',
    careerBatting: { matches: 47, runs: 904, average: 25.82, strikeRate: 159.71, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 47, wickets: 8, average: 37.62, economy: 9.4, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Jasprit Bumrah': {
    country: 'India',
    careerBatting: { matches: 244, runs: 102, average: 8.5, strikeRate: 85.71, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 244, wickets: 313, average: 20.09, economy: 6.86, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Trent Boult': {
    country: 'New Zealand',
    careerBatting: { matches: 247, runs: 243, average: 10.12, strikeRate: 104.74, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 247, wickets: 286, average: 25.43, economy: 8.02, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Allah Ghazanfar': {
    country: 'Afghanistan',
    careerBatting: { matches: 63, runs: 96, average: 5.05, strikeRate: 96.96, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 63, wickets: 77, average: 19.9, economy: 6.72, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Ashwani Kumar': {
    country: 'India',
    careerBowling: { matches: 20, wickets: 21, average: 29.66, economy: 10.13, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Deepak Chahar': {
    country: 'India',
    careerBatting: { matches: 166, runs: 462, average: 14.43, strikeRate: 135.88, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 166, wickets: 184, average: 24.85, economy: 7.86, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Will Jacks': {
    country: 'England',
    careerBatting: { matches: 198, runs: 5055, average: 29.5, strikeRate: 154.8, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 198, wickets: 47, average: 0, economy: 0, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
  },
  'Raghu Sharma': {
    country: 'India',
    careerBatting: { matches: 3, runs: 0, average: 0, strikeRate: 0, hundreds: 0, fifties: 0, highScore: '0', innings: 0 },
    careerBowling: { matches: 3, wickets: 3, average: 29.67, economy: 7.96, strikeRate: 0, bestFigures: '0/0', fiveWickets: 0, innings: 0 },
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
