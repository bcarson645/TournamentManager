/**
 * Synthetic team analytics for layout / visualisation prototyping.
 * Seeded per team id so values stay stable between visits.
 */

export interface RadarFacet {
  label: string
  /** 0–1 scale vs cohort par ~0.55 */
  team: number
  par: number
}

export interface ArchetypeBar {
  label: string
  value: number
  subtitle?: string
}

export interface PhaseBlock {
  label: string
  rr?: number
  sr?: number
  /** 0–1 for heat bar fill */
  intensity: number
}

export interface DismissalSlice {
  key: string
  pct: number
  hue: string
}

export interface PercentileBadge {
  label: string
  slot: number
  accent: 'bat' | 'bowl'
}

export interface TeamBattingAnalytics {
  radar: RadarFacet[]
  phases: PhaseBlock[]
  vsBowlingArchetypes: ArchetypeBar[]
  percentiles: PercentileBadge[]
  dismissals: DismissalSlice[]
}

export interface TeamBowlingAnalytics {
  radar: RadarFacet[]
  phases: PhaseBlock[]
  vsBattingHands: ArchetypeBar[]
  percentiles: PercentileBadge[]
}

export interface TeamAnalyticsSnapshot {
  confidencePct: number
  confidenceTone: 'low' | 'mid' | 'high'
  confidenceHint: string
  batting: TeamBattingAnalytics
  bowling: TeamBowlingAnalytics
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickTone(pct: number): 'low' | 'mid' | 'high' {
  if (pct < 38) return 'low'
  if (pct < 72) return 'mid'
  return 'high'
}

export function generateTeamAnalyticsMock(teamId: string): TeamAnalyticsSnapshot {
  const rand = mulberry32(hashSeed(`analytics-${teamId}`))
  const u = () => rand()
  const rRange = (a: number, b: number) => a + (b - a) * u()

  const conf = Math.round(28 + u() * 62)
  const confidenceHint =
    conf < 40
      ? 'Limited coverage — illustrative only.'
      : conf < 70
        ? 'Growing sample; trust trends cautiously.'
        : 'Healthy ball volume across phases & venues.'

  const battingRadar: RadarFacet[] = [
    { label: 'SR index', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Avg power', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'PP thrust', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Death strike', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Boundary%', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Rotation', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
  ]

  const bowlingRadar: RadarFacet[] = [
    { label: 'Econ index', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Wicket rate', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'PP squeeze', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Death nails', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Dot pressure', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
    { label: 'Matchups', team: rRange(0.38, 0.92), par: rRange(0.45, 0.72) },
  ]

  const batPhases: PhaseBlock[] = [
    { label: 'Powerplay (1–6)', rr: rRange(6.8, 9.8), sr: rRange(125, 168), intensity: rRange(0.35, 0.98) },
    { label: 'Middle (7–14)', rr: rRange(6.8, 9.8), sr: rRange(125, 168), intensity: rRange(0.35, 0.98) },
    { label: 'Death (15–20)', rr: rRange(6.8, 9.8), sr: rRange(125, 168), intensity: rRange(0.35, 0.98) },
  ]

  const bowlPhases: PhaseBlock[] = [
    { label: 'PP defend', rr: rRange(6.5, 9.2), intensity: rRange(0.35, 0.98) },
    { label: 'Middle hold', rr: rRange(6.5, 9.2), intensity: rRange(0.35, 0.98) },
    { label: 'Death close', rr: rRange(6.5, 9.2), intensity: rRange(0.35, 0.98) },
  ]

  const archLabels = ['Pure pace', 'Hit-the-deck seam', 'Off-spin', 'Leg / wrist-spin']
  const batVsBowl = archLabels.map((label, i) => ({
    label,
    value: rRange(-0.85, 0.95),
    subtitle: `${Math.round(rRange(12, 340))} balls`,
  }))

  const vsHands = ['vs RHB anchor', 'vs LHB anchor', 'vs pinch hitters'].map((label) => ({
    label,
    value: rRange(-0.72, 0.88),
    subtitle: `${Math.round(rRange(18, 220))} overs`,
  }))

  const w = [u(), u(), u(), u()]
  const ws = w.reduce((x, y) => x + y, 0) || 1
  const p = w.map((v) => Math.round((100 * v) / ws))
  const fix = 100 - p.reduce((a, b) => a + b, 0)
  p[0] += fix

  const dismissals: DismissalSlice[] = [
    { key: 'Caught', pct: p[0]!, hue: '#60a5fa' },
    { key: 'Bowled', pct: p[1]!, hue: '#a78bfa' },
    { key: 'LBW', pct: p[2]!, hue: '#fb923c' },
    { key: 'Other', pct: p[3]!, hue: '#94a3b8' },
  ]

  const pct = (accent: 'bat' | 'bowl'): PercentileBadge[] =>
    ([
      { label: accent === 'bat' ? 'Average' : 'Economy', slot: Math.round(u() * 100), accent },
      { label: accent === 'bat' ? 'Strike rate' : 'Wickets / innings', slot: Math.round(u() * 100), accent },
      { label: accent === 'bat' ? 'Boundary%' : 'Dot%', slot: Math.round(u() * 100), accent },
    ])

  return {
    confidencePct: conf,
    confidenceTone: pickTone(conf),
    confidenceHint,
    batting: {
      radar: battingRadar,
      phases: batPhases,
      vsBowlingArchetypes: batVsBowl,
      percentiles: pct('bat'),
      dismissals,
    },
    bowling: {
      radar: bowlingRadar,
      phases: bowlPhases,
      vsBattingHands: vsHands,
      percentiles: pct('bowl'),
    },
  }
}
