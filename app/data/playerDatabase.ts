export interface PlayerDbEntry {
  id: string
  name: string
  country: string
  role: 'BAT' | 'BOWL' | 'AR' | 'WK'
}

export const PLAYER_DATABASE: PlayerDbEntry[] = [
  // India
  { id: 'db-001', name: 'Virat Kohli', country: 'India', role: 'BAT' },
  { id: 'db-002', name: 'Rohit Sharma', country: 'India', role: 'BAT' },
  { id: 'db-003', name: 'Jasprit Bumrah', country: 'India', role: 'BOWL' },
  { id: 'db-004', name: 'Ravindra Jadeja', country: 'India', role: 'AR' },
  { id: 'db-005', name: 'KL Rahul', country: 'India', role: 'WK' },
  { id: 'db-006', name: 'Suryakumar Yadav', country: 'India', role: 'BAT' },
  { id: 'db-007', name: 'Hardik Pandya', country: 'India', role: 'AR' },
  { id: 'db-008', name: 'Rishabh Pant', country: 'India', role: 'WK' },
  { id: 'db-009', name: 'Shubman Gill', country: 'India', role: 'BAT' },
  { id: 'db-010', name: 'Yashasvi Jaiswal', country: 'India', role: 'BAT' },
  { id: 'db-011', name: 'Mohammed Shami', country: 'India', role: 'BOWL' },
  { id: 'db-012', name: 'Yuzvendra Chahal', country: 'India', role: 'BOWL' },
  { id: 'db-013', name: 'Kuldeep Yadav', country: 'India', role: 'BOWL' },
  { id: 'db-014', name: 'Shreyas Iyer', country: 'India', role: 'BAT' },
  { id: 'db-015', name: 'Ishan Kishan', country: 'India', role: 'WK' },
  { id: 'db-016', name: 'Axar Patel', country: 'India', role: 'AR' },
  { id: 'db-017', name: 'Bhuvneshwar Kumar', country: 'India', role: 'BOWL' },
  { id: 'db-018', name: 'Deepak Chahar', country: 'India', role: 'BOWL' },
  { id: 'db-019', name: 'Tilak Varma', country: 'India', role: 'BAT' },
  { id: 'db-020', name: 'Ruturaj Gaikwad', country: 'India', role: 'BAT' },
  { id: 'db-021', name: 'Sanju Samson', country: 'India', role: 'WK' },
  { id: 'db-022', name: 'Rinku Singh', country: 'India', role: 'BAT' },
  { id: 'db-023', name: 'Arshdeep Singh', country: 'India', role: 'BOWL' },
  { id: 'db-024', name: 'Shardul Thakur', country: 'India', role: 'AR' },
  { id: 'db-025', name: 'Devdutt Padikkal', country: 'India', role: 'BAT' },
  { id: 'db-026', name: 'Prithvi Shaw', country: 'India', role: 'BAT' },
  { id: 'db-027', name: 'Venkatesh Iyer', country: 'India', role: 'AR' },
  { id: 'db-028', name: 'Rahul Tewatia', country: 'India', role: 'AR' },
  { id: 'db-029', name: 'Washington Sundar', country: 'India', role: 'AR' },
  { id: 'db-030', name: 'Ravi Bishnoi', country: 'India', role: 'BOWL' },
  // Australia
  { id: 'db-031', name: 'David Warner', country: 'Australia', role: 'BAT' },
  { id: 'db-032', name: 'Steve Smith', country: 'Australia', role: 'BAT' },
  { id: 'db-033', name: 'Pat Cummins', country: 'Australia', role: 'BOWL' },
  { id: 'db-034', name: 'Mitchell Starc', country: 'Australia', role: 'BOWL' },
  { id: 'db-035', name: 'Glenn Maxwell', country: 'Australia', role: 'AR' },
  { id: 'db-036', name: 'Josh Hazlewood', country: 'Australia', role: 'BOWL' },
  { id: 'db-037', name: 'Travis Head', country: 'Australia', role: 'BAT' },
  { id: 'db-038', name: 'Marnus Labuschagne', country: 'Australia', role: 'BAT' },
  { id: 'db-039', name: 'Marcus Stoinis', country: 'Australia', role: 'AR' },
  { id: 'db-040', name: 'Adam Zampa', country: 'Australia', role: 'BOWL' },
  { id: 'db-041', name: 'Nathan Ellis', country: 'Australia', role: 'BOWL' },
  { id: 'db-042', name: 'Jake Fraser-McGurk', country: 'Australia', role: 'BAT' },
  // England
  { id: 'db-043', name: 'Joe Root', country: 'England', role: 'BAT' },
  { id: 'db-044', name: 'Ben Stokes', country: 'England', role: 'AR' },
  { id: 'db-045', name: 'Jos Buttler', country: 'England', role: 'WK' },
  { id: 'db-046', name: 'Jofra Archer', country: 'England', role: 'BOWL' },
  { id: 'db-047', name: 'Mark Wood', country: 'England', role: 'BOWL' },
  { id: 'db-048', name: 'Adil Rashid', country: 'England', role: 'BOWL' },
  { id: 'db-049', name: 'Liam Livingstone', country: 'England', role: 'AR' },
  { id: 'db-050', name: 'Phil Salt', country: 'England', role: 'WK' },
  { id: 'db-051', name: 'Harry Brook', country: 'England', role: 'BAT' },
  { id: 'db-052', name: 'Will Jacks', country: 'England', role: 'AR' },
  { id: 'db-053', name: 'Sam Curran', country: 'England', role: 'AR' },
  { id: 'db-054', name: 'Reece Topley', country: 'England', role: 'BOWL' },
  // South Africa
  { id: 'db-055', name: 'Quinton de Kock', country: 'South Africa', role: 'WK' },
  { id: 'db-056', name: 'Kagiso Rabada', country: 'South Africa', role: 'BOWL' },
  { id: 'db-057', name: 'Aiden Markram', country: 'South Africa', role: 'AR' },
  { id: 'db-058', name: 'David Miller', country: 'South Africa', role: 'BAT' },
  { id: 'db-059', name: 'Anrich Nortje', country: 'South Africa', role: 'BOWL' },
  { id: 'db-060', name: 'Marco Jansen', country: 'South Africa', role: 'AR' },
  { id: 'db-061', name: 'Rassie van der Dussen', country: 'South Africa', role: 'BAT' },
  { id: 'db-062', name: 'Tristan Stubbs', country: 'South Africa', role: 'BAT' },
  // New Zealand
  { id: 'db-063', name: 'Kane Williamson', country: 'New Zealand', role: 'BAT' },
  { id: 'db-064', name: 'Trent Boult', country: 'New Zealand', role: 'BOWL' },
  { id: 'db-065', name: 'Devon Conway', country: 'New Zealand', role: 'BAT' },
  { id: 'db-066', name: 'Glenn Phillips', country: 'New Zealand', role: 'AR' },
  { id: 'db-067', name: 'Rachin Ravindra', country: 'New Zealand', role: 'AR' },
  { id: 'db-068', name: 'Finn Allen', country: 'New Zealand', role: 'BAT' },
  { id: 'db-069', name: 'Mitchell Santner', country: 'New Zealand', role: 'AR' },
  { id: 'db-070', name: 'Tim Southee', country: 'New Zealand', role: 'BOWL' },
  // West Indies
  { id: 'db-071', name: 'Nicholas Pooran', country: 'West Indies', role: 'WK' },
  { id: 'db-072', name: 'Andre Russell', country: 'West Indies', role: 'AR' },
  { id: 'db-073', name: 'Sunil Narine', country: 'West Indies', role: 'AR' },
  { id: 'db-074', name: 'Shimron Hetmyer', country: 'West Indies', role: 'BAT' },
  { id: 'db-075', name: 'Sherfane Rutherford', country: 'West Indies', role: 'BAT' },
  { id: 'db-076', name: 'Brandon King', country: 'West Indies', role: 'BAT' },
  // Pakistan
  { id: 'db-077', name: 'Babar Azam', country: 'Pakistan', role: 'BAT' },
  { id: 'db-078', name: 'Shaheen Afridi', country: 'Pakistan', role: 'BOWL' },
  { id: 'db-079', name: 'Mohammad Rizwan', country: 'Pakistan', role: 'WK' },
  { id: 'db-080', name: 'Fakhar Zaman', country: 'Pakistan', role: 'BAT' },
  { id: 'db-081', name: 'Shadab Khan', country: 'Pakistan', role: 'AR' },
  { id: 'db-082', name: 'Haris Rauf', country: 'Pakistan', role: 'BOWL' },
  // Sri Lanka
  { id: 'db-083', name: 'Wanindu Hasaranga', country: 'Sri Lanka', role: 'AR' },
  { id: 'db-084', name: 'Pathum Nissanka', country: 'Sri Lanka', role: 'BAT' },
  { id: 'db-085', name: 'Matheesha Pathirana', country: 'Sri Lanka', role: 'BOWL' },
  // Bangladesh
  { id: 'db-086', name: 'Shakib Al Hasan', country: 'Bangladesh', role: 'AR' },
  { id: 'db-087', name: 'Mustafizur Rahman', country: 'Bangladesh', role: 'BOWL' },
  { id: 'db-088', name: 'Litton Das', country: 'Bangladesh', role: 'WK' },
  // Afghanistan
  { id: 'db-089', name: 'Rashid Khan', country: 'Afghanistan', role: 'BOWL' },
  { id: 'db-090', name: 'Ibrahim Zadran', country: 'Afghanistan', role: 'BAT' },
  { id: 'db-091', name: 'Rahmanullah Gurbaz', country: 'Afghanistan', role: 'WK' },
  { id: 'db-092', name: 'Naveen-ul-Haq', country: 'Afghanistan', role: 'BOWL' },
  { id: 'db-093', name: 'Noor Ahmad', country: 'Afghanistan', role: 'BOWL' },
  // Zimbabwe
  { id: 'db-094', name: 'Sikandar Raza', country: 'Zimbabwe', role: 'AR' },
  { id: 'db-095', name: 'Sean Williams', country: 'Zimbabwe', role: 'AR' },
  // Ireland
  { id: 'db-096', name: 'Paul Stirling', country: 'Ireland', role: 'BAT' },
  { id: 'db-097', name: 'Josh Little', country: 'Ireland', role: 'BOWL' },
  // Scotland
  { id: 'db-098', name: 'Richie Berrington', country: 'Scotland', role: 'AR' },
  // Nepal
  { id: 'db-099', name: 'Sandeep Lamichhane', country: 'Nepal', role: 'BOWL' },
  // Netherlands
  { id: 'db-100', name: 'Bas de Leede', country: 'Netherlands', role: 'AR' },
]

export function searchPlayers(query: string, excludeNames: string[], limit = 15): PlayerDbEntry[] {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return PLAYER_DATABASE
    .filter((p) => {
      const alreadyInSquad = excludeNames.some(
        (n) => n.toLowerCase() === p.name.toLowerCase(),
      )
      if (alreadyInSquad) return false
      return (
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      )
    })
    .slice(0, limit)
}
