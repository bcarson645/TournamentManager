/**
 * Synthetic deep player analytics + percentiles — replace with API when ready.
 * Seeded by player.id for stable UI previews.
 */

export interface PlayerFingerprint {
  label: string
  /** 0–1 vs cohort approximation */
  value: number
}

export interface PctlStat {
  label: string
  valueDisplay: string
  percentile: number
}

export interface PhasePctlBlock {
  label: string
  sr: string
  avg: string
  rpi: string
  srPct: number
  avgPct: number
  rpiPct: number
}

export interface PhaseBowlBlock {
  label: string
  econ: string
  avg: string
  sr: string
  econPct: number
  avgPct: number
  srPct: number
}

export interface DismissArchetypeMixRow {
  archetype: string
  /** Share of player's dismissals attributable to facing this bowling type cluster */
  outSharePct: number
  /** Share of deliveries faced vs this bowling type cluster (what opposition bowls) */
  oppoBallSharePct: number
}

export interface WicketBattingMixRow {
  battingStyle: string
  wicketsSharePct: number
  oppoBattingBattersPct: number
}

/** Rolling-form rows: compare each inning to prior BT CAZ anchor. Demo only. */
export interface RecentBatInningsRow {
  ix: number
  runs: number
  balls: number
  /** Rolling batting CAZ benchmark before this inning */
  priorBtCaz: number
  /** Synthetic innings CAZ fingerprint (RNG; replace with inferred model later) */
  innBtCaz: number
  /** innBtCaz − priorBtCaz */
  deltaVsPrior: number
}

export interface RecentBowlingSpellRow {
  ix: number
  overs: number
  runsConc: number
  wickets: number
  /** Prior rolling econ / impact index entering spell */
  priorIndex: number
  innEcon: number
  deltaVsPrior: number
}

export interface PlayerDeepBattingMock {
  certaintyPct: number
  samples: { battingInningsEst: number; ballsFacedEst: number }
  /** Pentagon vertices (5) — percentile shape */
  fingerprint: PlayerFingerprint[]
  overall: PctlStat[]
  /** Last N innings vs rolling CAZ benchmark */
  recentVsPriorBtCaz: RecentBatInningsRow[]
  powerplay: PhasePctlBlock
  death: PhasePctlBlock
  dismissalArchetypes: DismissArchetypeMixRow[]
}

export interface PlayerDeepBowlingMock {
  certaintyPct: number
  samples: { bowlingInningsEst: number; ballsBowledEst: number }
  fingerprint: PlayerFingerprint[]
  overall: PctlStat[]
  recentSpells: RecentBowlingSpellRow[]
  powerplay: PhaseBowlBlock
  death: PhaseBowlBlock
  wicketsVsBatting: WicketBattingMixRow[]
}

function seedFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

function mulberry32(seed: number) {
  let a = seed
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1)
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

export function generatePlayerDeepBatting(playerId: string): PlayerDeepBattingMock {
  const r = mulberry32(seedFromId(`bat-${playerId}`))
  const u = () => r()
  const rp = () => Math.round(u() * 100)

  const bi = Math.round(18 + u() * 180)
  const balls = Math.round(bi * (35 + u() * 50))
  const certainty = Math.min(
    98,
    Math.round(
      32 +
        Math.min(1.4, balls / 1200) * 45 +
        Math.min(1.1, bi / 80) * 28 +
        u() * 8,
    ),
  )

  const arch = ['Pure pace', 'Heavy seam', 'Off-spin', 'Finger LHB', 'Wrist / leggie']

  let dismissalArchetypes: DismissArchetypeMixRow[] = arch.map((archetype) => ({
    archetype,
    outSharePct: 5 + Math.round(u() * 38),
    oppoBallSharePct: 10 + Math.round(u() * 32),
  }))
  let sumO = dismissalArchetypes.reduce((s, x) => s + x.outSharePct, 0) || 1
  dismissalArchetypes.forEach((row) => {
    row.outSharePct = Math.round((row.outSharePct / sumO) * 100)
  })
  sumO = dismissalArchetypes.reduce((s, x) => s + x.outSharePct, 0) || 1
  if (sumO !== 100) dismissalArchetypes[0]!.outSharePct += 100 - sumO

  let sumB = dismissalArchetypes.reduce((s, x) => s + x.oppoBallSharePct, 0) || 1
  dismissalArchetypes.forEach((row) => {
    row.oppoBallSharePct = Math.round((row.oppoBallSharePct / sumB) * 100)
  })
  sumB = dismissalArchetypes.reduce((s, x) => s + x.oppoBallSharePct, 0) || 1
  if (sumB !== 100) dismissalArchetypes[1]!.oppoBallSharePct += 100 - sumB

  /** Rolling BT CAZ through recent simulated innings — compare each knock to anchor */
  let rollCaz = 24 + u() * 14
  const recentVsPriorBtCaz: RecentBatInningsRow[] = Array.from({ length: 10 }, (_, inn) => {
    const ballsF = Math.max(10, Math.round(14 + u() * 38))
    const runs = Math.min(134, Math.round(Math.max(0, u() ** 1.3) * 118))
    const priorBtCaz = Number(round2(rollCaz))
    /** Mock innings CAZ: blend runs pressure with prior inertia */
    let innBtCaz = Number(
      round2(priorBtCaz * (0.45 + u() * 0.38) + (runs / ballsF) * 48 + u() * 10 - u() * 8),
    )
    innBtCaz = Math.max(8, Math.min(72, innBtCaz))
    const deltaVsPrior = Number(round2(innBtCaz - priorBtCaz))
    rollCaz = rollCaz * 0.78 + innBtCaz * 0.22 + (u() - 0.5) * 1.1
    return {
      ix: inn + 1,
      runs,
      balls: ballsF,
      priorBtCaz,
      innBtCaz,
      deltaVsPrior,
    }
  })

  return {
    certaintyPct: certainty,
    samples: { battingInningsEst: bi, ballsFacedEst: balls },
    fingerprint: [
      { label: 'SR', value: 0.28 + u() * 0.67 },
      { label: 'Avg', value: 0.28 + u() * 0.67 },
      { label: 'R/Inn', value: 0.28 + u() * 0.67 },
      { label: '30%', value: 0.28 + u() * 0.67 },
      { label: '6%', value: 0.28 + u() * 0.67 },
    ],
    recentVsPriorBtCaz,
    overall: [
      { label: 'Strike rate', valueDisplay: `${round2(115 + u() * 80)} · CAZ scaled`, percentile: rp() },
      { label: 'Average', valueDisplay: round2(18 + u() * 38), percentile: rp() },
      { label: 'Runs / innings', valueDisplay: round2(21 + u() * 34), percentile: rp() },
      { label: '% 30+ scores', valueDisplay: `${round1(22 + u() * 40)}%`, percentile: rp() },
      { label: '6s / 100 balls', valueDisplay: round1(9 + u() * 16), percentile: rp() },
    ],
    powerplay: {
      label: 'Powerplay overs 1–6',
      sr: round2(118 + u() * 55),
      avg: round2(28 + u() * 22),
      rpi: round2(26 + u() * 20),
      srPct: rp(),
      avgPct: rp(),
      rpiPct: rp(),
    },
    death: {
      label: 'Death overs (15–20)',
      sr: round2(135 + u() * 90),
      avg: round2(24 + u() * 30),
      rpi: round2(27 + u() * 24),
      srPct: rp(),
      avgPct: rp(),
      rpiPct: rp(),
    },
    dismissalArchetypes,
  }
}

export function generatePlayerDeepBowling(playerId: string): PlayerDeepBowlingMock {
  const r = mulberry32(seedFromId(`bowl-${playerId}`))
  const u = () => r()
  const rp = () => Math.round(u() * 100)

  const bi = Math.round(16 + u() * 160)
  const balls = Math.round(bi * (14 + u() * 22))
  const certainty = Math.min(
    98,
    Math.round(
      30 +
        Math.min(1.3, balls / 1100) * 48 +
        Math.min(1.05, bi / 70) * 30 +
        u() * 7,
    ),
  )

  const styles = ['RHB top order', 'LHB anchor', 'RHB finisher', 'Power pinch', 'Spinners who bat']
  const wicketsVsBatting: WicketBattingMixRow[] = styles.map((battingStyle) => ({
    battingStyle,
    wicketsSharePct: Math.round(8 + u() * 28),
    oppoBattingBattersPct: Math.round(10 + u() * 25),
  }))

  let sumW = wicketsVsBatting.reduce((s, x) => s + x.wicketsSharePct, 0) || 1
  wicketsVsBatting.forEach((row) => {
    row.wicketsSharePct = Math.round((row.wicketsSharePct / sumW) * 100)
  })
  sumW = wicketsVsBatting.reduce((s, x) => s + x.wicketsSharePct, 0) || 1
  if (sumW !== 100) wicketsVsBatting[2]!.wicketsSharePct += 100 - sumW

  let sumO = wicketsVsBatting.reduce((s, x) => s + x.oppoBattingBattersPct, 0) || 1
  wicketsVsBatting.forEach((row) => {
    row.oppoBattingBattersPct = Math.round((row.oppoBattingBattersPct / sumO) * 100)
  })
  sumO = wicketsVsBatting.reduce((s, x) => s + x.oppoBattingBattersPct, 0) || 1
  if (sumO !== 100) wicketsVsBatting[0]!.oppoBattingBattersPct += 100 - sumO

  let rollEcon = 7.8 + u() * 2.8
  const recentSpells: RecentBowlingSpellRow[] = Array.from({ length: 10 }, (_, ix) => {
    const overs = Number(round1(Math.max(1.2, Math.min(4, 1.8 + u() * 2.2))))
    const runsConc = Math.round(Math.max(6, overs * u() * (7 + u() * 6)))
    const wickets = Math.min(6, Math.max(0, Math.round(Math.floor(u() * (3 + overs * 2)))))
    const priorIndex = Number(round2(rollEcon))
    const innEcon = Number(round2((runsConc / overs) * 0.94 + priorIndex * 0.06 + u() * 2 - u() * 2))
    const clampE = Math.min(13.9, Math.max(4.8, innEcon))
    const deltaVsPrior = Number(round2(clampE - priorIndex))
    rollEcon = rollEcon * 0.74 + clampE * 0.26
    return {
      ix: ix + 1,
      overs,
      runsConc,
      wickets,
      priorIndex,
      innEcon: clampE,
      deltaVsPrior,
    }
  })

  return {
    certaintyPct: certainty,
    samples: { bowlingInningsEst: bi, ballsBowledEst: balls },
    fingerprint: [
      { label: 'Econ', value: 0.28 + u() * 0.67 },
      { label: 'B-Avg', value: 0.28 + u() * 0.67 },
      { label: 'B/SR', value: 0.28 + u() * 0.67 },
      { label: 'W/Inn', value: 0.28 + u() * 0.67 },
      { label: 'Dot', value: 0.28 + u() * 0.67 },
    ],
    recentSpells,
    overall: [
      { label: 'Economy', valueDisplay: round2(7.2 + u() * 3.8), percentile: rp() },
      { label: 'Bowling average', valueDisplay: round2(21 + u() * 18), percentile: rp() },
      { label: 'Balls / wicket', valueDisplay: round2(17 + u() * 10), percentile: rp() },
      { label: 'Wickets / inning', valueDisplay: round2(1.2 + u() * 1.6), percentile: rp() },
      { label: 'Dot%', valueDisplay: `${round1(35 + u() * 12)}%`, percentile: rp() },
    ],
    powerplay: {
      label: 'Powerplay bowling',
      econ: round2(6 + u() * 5),
      avg: round2(22 + u() * 24),
      sr: round2(15 + u() * 12),
      econPct: rp(),
      avgPct: rp(),
      srPct: rp(),
    },
    death: {
      label: 'Death overs bowling',
      econ: round2(8 + u() * 7),
      avg: round2(16 + u() * 18),
      sr: round2(12 + u() * 9),
      econPct: rp(),
      avgPct: rp(),
      srPct: rp(),
    },
    wicketsVsBatting,
  }
}
