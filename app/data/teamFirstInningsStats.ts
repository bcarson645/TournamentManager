import { GROUNDS, type Ground } from './grounds'
import { getTournamentLiveData } from './tournamentLiveData'

export interface TeamMeanMetricProfile {
  teamId: string
  average: number | null
  tournamentMean: number
  meanDelta: number | null
  sampleSize: number
}

export interface TeamMeanMetricMarker {
  id: string
  label: string
  average: number
  meanDelta: number
  tone: 'overall' | 'home'
}

export interface TeamMeanMetricChartData {
  tournamentMean: number
  markers: TeamMeanMetricMarker[]
}

function hashStr(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 16807 + 0) % 2147483647
    return (state - 1) / 2147483646
  }
}

function parseRuns(score: string): number | null {
  const match = score.trim().match(/^(\d+)/)
  if (!match) return null
  const runs = Number.parseInt(match[1] ?? '', 10)
  return Number.isFinite(runs) ? runs : null
}

function seededMetricValues(teamId: string, suffix: string, count: number, base: number, spread: number): number[] {
  const rand = seededRandom(hashStr(`${teamId}-${suffix}`))
  return Array.from({ length: count }, () => Math.round(base + rand() * spread))
}

function buildProfile(
  teamId: string,
  values: number[],
  tournamentMean: number,
): TeamMeanMetricProfile {
  const sampleSize = values.length
  const average = sampleSize > 0 ? values.reduce((sum, value) => sum + value, 0) / sampleSize : null
  const meanDelta = average != null ? average - tournamentMean : null
  return { teamId, average, tournamentMean, meanDelta, sampleSize }
}

function tournamentMean(values: number[], teamIds: string[], seedSuffix: string, base: number, spread: number): number {
  if (values.length > 0) {
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }
  const seededAvgs = teamIds.map((id) => {
    const scores = seededMetricValues(id, seedSuffix, 8, base, spread)
    return scores.reduce((sum, runs) => sum + runs, 0) / scores.length
  })
  return seededAvgs.reduce((sum, avg) => sum + avg, 0) / Math.max(seededAvgs.length, 1)
}

function teamValuesWithSeed(
  teamId: string,
  liveValues: number[],
  seedSuffix: string,
  base: number,
  spread: number,
): number[] {
  let values = [...liveValues]
  if (values.length < 6) {
    const seeded = seededMetricValues(teamId, seedSuffix, 8, base, spread)
    values = [...values, ...seeded.slice(values.length)]
  }
  return values.slice(0, 10)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function venueMatchesGround(venue: string | undefined, ground: Ground | null): boolean {
  if (!venue || !ground) return false
  const normalized = venue.toLowerCase()
  if (normalized.includes(ground.city.toLowerCase())) return true
  if (normalized.includes(ground.name.toLowerCase())) return true
  for (const part of ground.name.toLowerCase().split(/\s+/)) {
    if (part.length > 3 && normalized.includes(part)) return true
  }
  return false
}

function resolveHomeGround(groundId: string | null | undefined): Ground | null {
  if (!groundId) return null
  return GROUNDS.find((ground) => ground.id === groundId) ?? null
}

function collectFirstInningsByTeam(tournamentId: string): Map<string, number[]> {
  const live = getTournamentLiveData(tournamentId)
  const byTeam = new Map<string, number[]>()
  if (!live) return byTeam

  for (const result of live.completedResults) {
    const runs = parseRuns(result.homeScore)
    if (runs == null) continue
    const list = byTeam.get(result.homeTeamId) ?? []
    list.push(runs)
    byTeam.set(result.homeTeamId, list)
  }
  return byTeam
}

function collectFirstInningsAtHomeByTeam(
  tournamentId: string,
  groundByTeam: Map<string, Ground | null>,
): Map<string, number[]> {
  const live = getTournamentLiveData(tournamentId)
  const byTeam = new Map<string, number[]>()
  if (!live) return byTeam

  for (const result of live.completedResults) {
    const ground = groundByTeam.get(result.homeTeamId) ?? null
    if (!venueMatchesGround(result.venue, ground)) continue
    const runs = parseRuns(result.homeScore)
    if (runs == null) continue
    const list = byTeam.get(result.homeTeamId) ?? []
    list.push(runs)
    byTeam.set(result.homeTeamId, list)
  }
  return byTeam
}

function estimatePowerplayRuns(totalRuns: number, teamId: string, matchId: string): number {
  const rand = seededRandom(hashStr(`${teamId}-${matchId}-pp`))
  const ratio = 0.3 + rand() * 0.12
  return Math.round(totalRuns * ratio)
}

function collectPowerplayScoresByTeam(tournamentId: string): Map<string, number[]> {
  const live = getTournamentLiveData(tournamentId)
  const byTeam = new Map<string, number[]>()
  if (!live) return byTeam

  for (const result of live.completedResults) {
    const homeTotal = parseRuns(result.homeScore)
    if (homeTotal != null) {
      const list = byTeam.get(result.homeTeamId) ?? []
      list.push(estimatePowerplayRuns(homeTotal, result.homeTeamId, result.id))
      byTeam.set(result.homeTeamId, list)
    }
    const awayTotal = parseRuns(result.awayScore)
    if (awayTotal != null) {
      const list = byTeam.get(result.awayTeamId) ?? []
      list.push(estimatePowerplayRuns(awayTotal, result.awayTeamId, result.id))
      byTeam.set(result.awayTeamId, list)
    }
  }
  return byTeam
}

function collectPowerplayAtHomeByTeam(
  tournamentId: string,
  groundByTeam: Map<string, Ground | null>,
): Map<string, number[]> {
  const live = getTournamentLiveData(tournamentId)
  const byTeam = new Map<string, number[]>()
  if (!live) return byTeam

  for (const result of live.completedResults) {
    const ground = groundByTeam.get(result.homeTeamId) ?? null
    if (!venueMatchesGround(result.venue, ground)) continue
    const homeTotal = parseRuns(result.homeScore)
    if (homeTotal == null) continue
    const list = byTeam.get(result.homeTeamId) ?? []
    list.push(estimatePowerplayRuns(homeTotal, result.homeTeamId, `${result.id}-home-pp`))
    byTeam.set(result.homeTeamId, list)
  }
  return byTeam
}

function collectRunsConcededByTeam(tournamentId: string): Map<string, number[]> {
  const live = getTournamentLiveData(tournamentId)
  const byTeam = new Map<string, number[]>()
  if (!live) return byTeam

  for (const result of live.completedResults) {
    const homeConceded = parseRuns(result.awayScore)
    const awayConceded = parseRuns(result.homeScore)
    if (homeConceded != null) {
      const homeList = byTeam.get(result.homeTeamId) ?? []
      homeList.push(homeConceded)
      byTeam.set(result.homeTeamId, homeList)
    }
    if (awayConceded != null) {
      const awayList = byTeam.get(result.awayTeamId) ?? []
      awayList.push(awayConceded)
      byTeam.set(result.awayTeamId, awayList)
    }
  }
  return byTeam
}

function seededHomeMetricValues(
  teamId: string,
  groundId: string | null,
  suffix: string,
  overallAverage: number,
  boost: number,
  spread: number,
): number[] {
  const rand = seededRandom(hashStr(`${teamId}-${groundId ?? 'no-ground'}-${suffix}-home`))
  return Array.from({ length: 6 }, () => Math.round(overallAverage + boost + rand() * spread))
}

function homeMetricAverage(
  teamId: string,
  groundId: string | null,
  liveValues: number[],
  overallAverage: number,
  suffix: string,
  boost: number,
  spread: number,
): number {
  const liveAvg = average(liveValues)
  if (liveAvg != null) return liveAvg
  const seeded = seededHomeMetricValues(teamId, groundId, suffix, overallAverage, boost, spread)
  return average(seeded) ?? overallAverage + boost
}

function buildDualMarkerChart(
  tournamentMean: number,
  overallAverage: number,
  homeAverage: number,
  overallLabel: string,
  homeLabel: string,
): TeamMeanMetricChartData {
  return {
    tournamentMean,
    markers: [
      {
        id: 'overall',
        label: overallLabel,
        average: overallAverage,
        meanDelta: overallAverage - tournamentMean,
        tone: 'overall',
      },
      {
        id: 'home',
        label: homeLabel,
        average: homeAverage,
        meanDelta: homeAverage - tournamentMean,
        tone: 'home',
      },
    ],
  }
}

export function getTeamFirstInningsProfile(
  tournamentId: string,
  teamId: string,
  teamIds: string[],
): TeamMeanMetricProfile {
  const liveByTeam = collectFirstInningsByTeam(tournamentId)
  const allLive = [...liveByTeam.values()].flat()
  const mean = tournamentMean(allLive, teamIds, '1st-inn', 132, 56)
  const values = teamValuesWithSeed(teamId, liveByTeam.get(teamId) ?? [], '1st-inn', 132, 56)
  return buildProfile(teamId, values, mean)
}

export function getTeamFirstInningsChartData(
  tournamentId: string,
  teamId: string,
  teamIds: string[],
  groundId: string | null | undefined,
): TeamMeanMetricChartData {
  const overall = getTeamFirstInningsProfile(tournamentId, teamId, teamIds)
  const overallAverage = overall.average ?? overall.tournamentMean
  const ground = resolveHomeGround(groundId)
  const groundByTeam = new Map([[teamId, ground]])
  const homeLive = collectFirstInningsAtHomeByTeam(tournamentId, groundByTeam).get(teamId) ?? []
  const homeAverage = homeMetricAverage(teamId, groundId ?? null, homeLive, overallAverage, '1st-inn', 10, 12)
  const homeLabel = ground ? `At home (${ground.city})` : 'At home ground'

  return buildDualMarkerChart(
    overall.tournamentMean,
    overallAverage,
    homeAverage,
    'Overall',
    homeLabel,
  )
}

export function getTeamPowerplayScoreProfile(
  tournamentId: string,
  teamId: string,
  teamIds: string[],
): TeamMeanMetricProfile {
  const liveByTeam = collectPowerplayScoresByTeam(tournamentId)
  const allLive = [...liveByTeam.values()].flat()
  const mean = tournamentMean(allLive, teamIds, 'powerplay-score', 44, 16)
  const values = teamValuesWithSeed(teamId, liveByTeam.get(teamId) ?? [], 'powerplay-score', 44, 16)
  return buildProfile(teamId, values, mean)
}

export function getTeamPowerplayChartData(
  tournamentId: string,
  teamId: string,
  teamIds: string[],
  groundId: string | null | undefined,
): TeamMeanMetricChartData {
  const overall = getTeamPowerplayScoreProfile(tournamentId, teamId, teamIds)
  const overallAverage = overall.average ?? overall.tournamentMean
  const ground = resolveHomeGround(groundId)
  const groundByTeam = new Map([[teamId, ground]])
  const homeLive = collectPowerplayAtHomeByTeam(tournamentId, groundByTeam).get(teamId) ?? []
  const homeAverage = homeMetricAverage(teamId, groundId ?? null, homeLive, overallAverage, 'powerplay', 3, 5)
  const homeLabel = ground ? `At home (${ground.city})` : 'At home ground'

  return buildDualMarkerChart(
    overall.tournamentMean,
    overallAverage,
    homeAverage,
    'Overall',
    homeLabel,
  )
}

export function getTeamRunsConcededProfile(
  tournamentId: string,
  teamId: string,
  teamIds: string[],
): TeamMeanMetricProfile {
  const liveByTeam = collectRunsConcededByTeam(tournamentId)
  const allLive = [...liveByTeam.values()].flat()
  const mean = tournamentMean(allLive, teamIds, 'runs-conceded', 145, 48)
  const values = teamValuesWithSeed(teamId, liveByTeam.get(teamId) ?? [], 'runs-conceded', 145, 48)
  return buildProfile(teamId, values, mean)
}

export function profileToChartData(profile: TeamMeanMetricProfile, label: string): TeamMeanMetricChartData {
  const average = profile.average ?? profile.tournamentMean
  return {
    tournamentMean: profile.tournamentMean,
    markers: [
      {
        id: 'overall',
        label,
        average,
        meanDelta: average - profile.tournamentMean,
        tone: 'overall',
      },
    ],
  }
}

/** @deprecated Use TeamMeanMetricProfile */
export type TeamFirstInningsProfile = TeamMeanMetricProfile
