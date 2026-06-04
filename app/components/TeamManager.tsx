'use client'

import { useState, useRef, useMemo, useEffect, useSyncExternalStore, useCallback } from 'react'
import { Team } from '../data/teams'
import {
  SquadPlayer,
  BowlAction,
  makeSquadForTeam,
  calcWktsAndBowlAvg,
  MAX_IMPACT_SUBS,
  MAX_OVERSEAS_XI_HINT,
  createCustomSquadBlank,
  normalizeBowlStats,
  normalizeSquadPlayer,
  sanitizeKeeperFlags,
} from '../data/squad'
import { CricketFormat, Gender } from '../data/tournaments'
import { ratingParPosForBatCalc } from '../data/squad'
import { calculateBatRating, calculateBowlRating } from '../data/ratingBenchmarks'
import { PlayerDbEntry } from '../data/playerDatabase'
import { GROUNDS, Ground } from '../data/grounds'
import SquadTable from './SquadTable'
import PlayerDetailPanel from './PlayerDetailPanel'
import TeamAnalyticsPanel from './TeamAnalyticsPanel'
import { getTeamLogo, setTeamLogo as storeTeamLogo } from '../data/logoStore'
import {
  getStoredSquad,
  getSquadStoreVersion,
  storeSquad,
  subscribeSquadStore,
  getDashboardBatRankings,
  getDashboardBowlRankings,
} from '../data/squadStore'
import {
  readDashboardBatMetric,
  readDashboardBowlMetric,
  writeDashboardBatMetric,
  writeDashboardBowlMetric,
  formatDashboardBatMetricValue,
  formatDashboardBowlMetricValue,
  dashboardBowlMetricValueSemantics,
  dashboardBatMetricOptionLabel,
  dashboardBowlMetricOptionLabel,
  teamBattingParIndexClass,
  teamBowlingParIndexClass,
  teamNetStrengthParIndex,
  type DashboardBatMetric,
  type DashboardBowlMetric,
} from '../data/ratingDisplaySettings'
import { getProfileForPlayer } from '../data/playerProfile'
import {
  mergeDbBowlingIntoSquadPlayer,
  mergeDbStatsIntoSquadPlayer,
  squadPlayerDatasetStatsDiffers,
  type SquadStatSeed,
} from '../data/squadStatSeed'
import { useTournamentOptions } from '../hooks/useTournamentOptions'
import { computePlayerTournamentRankSummary } from '../data/tournamentPlayerRanks'
import { fetchJson } from '../../lib/api/fetchJson'
import {
  clampPlayerPanelWidth,
  readStoredPlayerPanelWidth,
  PLAYER_PANEL_WIDTH_STORAGE_KEY,
} from '../data/playerPanelLayout'

function reapplySquadRatings(
  startingXI: SquadPlayer[],
  reserves: SquadPlayer[],
  impactSubs: SquadPlayer[],
  format: CricketFormat,
  gender: Gender,
): { startingXI: SquadPlayer[]; reserves: SquadPlayer[]; impactSubs: SquadPlayer[] } {
  const mapList = (list: SquadPlayer[], section: 'starting' | 'reserves' | 'impact') =>
    list.map((p, i) => {
      const n = normalizeBowlStats(normalizeSquadPlayer(p), format, gender)
      return {
        ...n,
        batRating: calculateBatRating(
          n.btCaz,
          n.raw,
          n.sr,
          ratingParPosForBatCalc(section, i, n),
          format,
          gender,
        ),
        bowlRating: calculateBowlRating(n.econ, n.bowlWpo, n.bowlAvg, n.overs, format, gender),
      }
    })
  const sx = mapList(startingXI, 'starting')
  const rx = mapList(reserves, 'reserves')
  const ix = mapList(impactSubs, 'impact')
  const [s, r, i] = sanitizeKeeperFlags(sx, rx, ix)
  return { startingXI: s, reserves: r, impactSubs: i }
}

interface MatchResult {
  won: boolean
  teamScore: number
  teamWickets: number
  oppName: string
  oppScore: number
  oppWickets: number
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateAvgScore(teamId: string): number {
  const rand = seededRandom(hashStr(teamId + '-avg'))
  return Math.round(140 + rand() * 40)
}

function generateLast10(teamId: string): MatchResult[] {
  const rand = seededRandom(hashStr(teamId + '-results'))
  const opponents = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E',
    'Team F', 'Team G', 'Team H', 'Team I', 'Team J']
  return Array.from({ length: 10 }, (_, i) => {
    const won = rand() > 0.45
    const teamScore = Math.round(120 + rand() * 80)
    const teamWickets = Math.round(3 + rand() * 7)
    const oppScore = won
      ? Math.round(teamScore - 5 - rand() * 40)
      : Math.round(teamScore + 5 + rand() * 40)
    const oppWickets = Math.round(3 + rand() * 7)
    return {
      won,
      teamScore,
      teamWickets: Math.min(teamWickets, 10),
      oppName: opponents[i],
      oppScore,
      oppWickets: Math.min(oppWickets, 10),
    }
  })
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

/** Seeded squad rows use 11000001–11009999 until linked to a dataset PlayerID. */
function playerNeedsDbHydrate(p: SquadPlayer): boolean {
  const n = parseInt(p.playerId, 10)
  if (Number.isFinite(n) && n >= 11000001 && n <= 11009999) return true
  return p.btCaz === 0 && p.wkts === 0 && p.sr === 0
}

const RIBBON_RANK_PAGE = 10

function ribbonNumericClass(
  n: number,
  semantics: 'higher-better' | 'lower-better',
): string {
  if (!Number.isFinite(n)) return ''
  if (semantics === 'lower-better') {
    return n <= 0 ? '' : ' rating-pos'
  }
  return n > 0 ? ' rating-pos' : n < 0 ? ' rating-neg' : ''
}

interface TeamManagerProps {
  format: CricketFormat
  gender: Gender
  tournamentId: string
  team: Team
  tournamentName: string
  allTeams: Team[]
  teamBatRatings: Record<string, number>
  teamBowlingRatings: Record<string, number>
  /** Open team-wide analytics drawer (demo / layout). */
  onOpenTeamAnalytics?: () => void
  /** Team analytics shown in the player panel column (does not block squad). */
  teamAnalyticsOpen?: boolean
  onCloseTeamAnalytics?: () => void
}

export default function TeamManager({
  format,
  gender,
  tournamentId,
  team,
  tournamentName,
  allTeams,
  teamBatRatings,
  teamBowlingRatings,
  onOpenTeamAnalytics,
  teamAnalyticsOpen = false,
  onCloseTeamAnalytics,
}: TeamManagerProps) {
  const squadStoreVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, getSquadStoreVersion)
  const [dashBatMetric, setDashBatMetric] = useState<DashboardBatMetric>('batRating')
  const [dashBowlMetric, setDashBowlMetric] = useState<DashboardBowlMetric>('bowlRating')

  useEffect(() => {
    setDashBatMetric(readDashboardBatMetric())
    setDashBowlMetric(readDashboardBowlMetric())
  }, [])

  const ribbonBatters = useMemo(
    () => getDashboardBatRankings(allTeams, dashBatMetric),
    [allTeams, squadStoreVersion, dashBatMetric],
  )
  const ribbonBowlers = useMemo(
    () => getDashboardBowlRankings(allTeams, dashBowlMetric),
    [allTeams, squadStoreVersion, dashBowlMetric],
  )

  const { impactSubEnabled, ratingParScore } = useTournamentOptions(tournamentId)
  const [teamLogo, setTeamLogo] = useState<string | null>(getTeamLogo(team.id) ?? team.logo ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [startingXI, setStartingXI] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    if (!stored) return makeSquadForTeam(team.id, format, gender).startingXI
    return reapplySquadRatings(
      stored.startingXI,
      stored.reserves,
      stored.impactSubs ?? [],
      format,
      gender,
    ).startingXI
  })
  const [reserves, setReserves] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    if (!stored) return makeSquadForTeam(team.id, format, gender).reserves
    return reapplySquadRatings(
      stored.startingXI,
      stored.reserves,
      stored.impactSubs ?? [],
      format,
      gender,
    ).reserves
  })
  const [impactSubs, setImpactSubs] = useState<SquadPlayer[]>(() => {
    const stored = getStoredSquad(team.id)
    if (!stored) return []
    return reapplySquadRatings(
      stored.startingXI,
      stored.reserves,
      stored.impactSubs ?? [],
      format,
      gender,
    ).impactSubs
  })

  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null)

  const playerTournamentRanks = useMemo(
    () =>
      selectedPlayer ? computePlayerTournamentRankSummary(selectedPlayer.id, allTeams) : null,
    [selectedPlayer?.id, allTeams, squadStoreVersion],
  )

  const [playerPanelWidth, setPlayerPanelWidth] = useState(() => readStoredPlayerPanelWidth())

  const panelResizeRef = useRef<{ startX: number; startW: number } | null>(null)
  const playerPanelWidthRef = useRef(playerPanelWidth)
  playerPanelWidthRef.current = playerPanelWidth

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = panelResizeRef.current
      if (!drag) return
      const delta = drag.startX - e.clientX
      setPlayerPanelWidth(clampPlayerPanelWidth(drag.startW + delta))
    }
    function onUp() {
      if (panelResizeRef.current === null) return
      panelResizeRef.current = null
      setPlayerPanelWidth((w) => {
        localStorage.setItem(PLAYER_PANEL_WIDTH_STORAGE_KEY, String(w))
        return w
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function handlePanelResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    panelResizeRef.current = { startX: e.clientX, startW: playerPanelWidthRef.current }
  }
  const [selectedGround, setSelectedGround] = useState<Ground | null>(() => {
    const stored = getStoredSquad(team.id)
    if (stored?.groundId) return GROUNDS.find((g) => g.id === stored.groundId) ?? null
    return null
  })
  const [groundSearch, setGroundSearch] = useState('')
  const [groundDropdownOpen, setGroundDropdownOpen] = useState(false)
  const prevTeamIdRef = useRef<string | null>(null)

  const hydrateFromDb = useCallback(
    async (
      sxi: SquadPlayer[],
      res: SquadPlayer[],
      imp: SquadPlayer[],
    ): Promise<{ startingXI: SquadPlayer[]; reserves: SquadPlayer[]; impactSubs: SquadPlayer[] } | null> => {
      const names = [...new Set([...sxi, ...res, ...imp].map((p) => p.name.trim()).filter(Boolean))]
      if (!names.length) return null
      try {
        const result = await fetchJson<{ stats?: Record<string, SquadStatSeed> }>(
          '/api/cricket/squad-stats',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names }),
          },
        )
        if (!result.ok || !result.data?.stats || Object.keys(result.data.stats).length === 0) {
          return null
        }
        const data = result.data
        let changed = false

        const mapSection = (list: SquadPlayer[], section: 'starting' | 'reserves' | 'impact') =>
          list.map((p, i) => {
            const seed = data.stats![p.name]
            if (!seed) return p
            const next = playerNeedsDbHydrate(p)
              ? mergeDbStatsIntoSquadPlayer(p, seed, format, gender, section, i)
              : mergeDbBowlingIntoSquadPlayer(p, seed, format, gender)
            if (squadPlayerDatasetStatsDiffers(p, next)) changed = true
            return next
          })

        const out = {
          startingXI: mapSection(sxi, 'starting'),
          reserves: mapSection(res, 'reserves'),
          impactSubs: mapSection(imp, 'impact'),
        }
        return changed ? out : null
      } catch {
        return null
      }
    },
    [format, gender],
  )

  useEffect(() => {
    let cancelled = false
    const teamChanged = prevTeamIdRef.current !== team.id
    prevTeamIdRef.current = team.id

    async function load() {
      const stored = getStoredSquad(team.id)
      let sxi: SquadPlayer[]
      let res: SquadPlayer[]
      let imp: SquadPlayer[]
      let ground: Ground | null

      if (stored) {
        const reapplied = reapplySquadRatings(
          stored.startingXI,
          stored.reserves,
          stored.impactSubs ?? [],
          format,
          gender,
        )
        sxi = reapplied.startingXI
        res = reapplied.reserves
        imp = reapplied.impactSubs
        ground = stored.groundId ? GROUNDS.find((g) => g.id === stored.groundId) ?? null : null
      } else {
        const squad = makeSquadForTeam(team.id, format, gender)
        sxi = squad.startingXI
        res = squad.reserves
        imp = []
        ground = null
      }

      const hydrated = await hydrateFromDb(sxi, res, imp)
      if (cancelled) return

      if (hydrated) {
        const final = reapplySquadRatings(
          hydrated.startingXI,
          hydrated.reserves,
          hydrated.impactSubs,
          format,
          gender,
        )
        sxi = final.startingXI
        res = final.reserves
        imp = final.impactSubs
        storeSquad(team.id, sxi, res, ground?.id ?? null, imp)
      }

      setStartingXI(sxi)
      setReserves(res)
      setImpactSubs(imp)
      setSelectedGround(ground)
      if (teamChanged) setSelectedPlayer(null)
      setTeamLogo(getTeamLogo(team.id) ?? team.logo ?? null)
      setGroundSearch('')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [team.id, format, gender, hydrateFromDb])

  const avgFirstInnings = useMemo(() => generateAvgScore(team.id), [team.id])
  const last10 = useMemo(() => generateLast10(team.id), [team.id])

  const filteredGrounds = useMemo(() => {
    const q = groundSearch.toLowerCase()
    if (q.length === 0) return GROUNDS.slice(0, 15)
    return GROUNDS.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q),
    ).slice(0, 15)
  }, [groundSearch])

  const [ribbonBatPage, setRibbonBatPage] = useState(0)
  const [ribbonBowlPage, setRibbonBowlPage] = useState(0)

  const currentSquadPlayerIds = useMemo(
    () => new Set([...startingXI, ...reserves, ...impactSubs].map((p) => p.id)),
    [startingXI, reserves, impactSubs],
  )

  /** Same as tournament table: XI batting sum, XI bowling sum, average of the two. */
  const ribbonTeamRatings = useMemo(() => {
    const bat = teamBatRatings[team.id] ?? 0
    const bowl = teamBowlingRatings[team.id] ?? 0
    return { bat, bowl, total: (bat + bowl) / 2 }
  }, [team.id, teamBatRatings, teamBowlingRatings])

  const ribbonBatTotalPages = Math.max(1, Math.ceil(ribbonBatters.length / RIBBON_RANK_PAGE))
  const ribbonBowlTotalPages = Math.max(1, Math.ceil(ribbonBowlers.length / RIBBON_RANK_PAGE))

  const startingXiOverseasCount = useMemo(
    () => startingXI.filter((p) => p.overseas).length,
    [startingXI],
  )

  useEffect(() => {
    setRibbonBatPage((p) => Math.min(p, Math.max(0, ribbonBatTotalPages - 1)))
  }, [ribbonBatters.length, ribbonBatTotalPages])

  useEffect(() => {
    setRibbonBowlPage((p) => Math.min(p, Math.max(0, ribbonBowlTotalPages - 1)))
  }, [ribbonBowlers.length, ribbonBowlTotalPages])

  useEffect(() => {
    setSelectedPlayer((prev) => {
      if (!prev) return prev
      const n =
        startingXI.find((x) => x.id === prev.id) ??
        reserves.find((x) => x.id === prev.id) ??
        impactSubs.find((x) => x.id === prev.id)
      return n ?? prev
    })
  }, [startingXI, reserves, impactSubs])

  function handleUpdate(
    newStarting: SquadPlayer[],
    newReserves: SquadPlayer[],
    newImpact: SquadPlayer[],
  ) {
    const [sx, sr, si] = sanitizeKeeperFlags(newStarting, newReserves, newImpact)
    setStartingXI(sx)
    setReserves(sr)
    setImpactSubs(si)
    storeSquad(team.id, sx, sr, selectedGround?.id ?? null, si)
  }

  function handleToggleWicketKeeper() {
    if (!selectedPlayer) return
    const idx = startingXI.findIndex((p) => p.id === selectedPlayer.id)
    if (idx < 0) return
    const cur = startingXI[idx]!
    const willAssign = !cur.keeper
    const next = startingXI.map((p, i) => ({
      ...p,
      keeper: willAssign ? i === idx : false,
    }))
    setStartingXI(next)
    storeSquad(team.id, next, reserves, selectedGround?.id ?? null, impactSubs)
    setSelectedPlayer(next[idx]!)
  }

  function patchPlayerById(id: string, patch: Partial<SquadPlayer>) {
    const mapList = (list: SquadPlayer[]) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p))
    handleUpdate(mapList(startingXI), mapList(reserves), mapList(impactSubs))
  }

  function handleToggleOverseas() {
    if (!selectedPlayer) return
    patchPlayerById(selectedPlayer.id, { overseas: !selectedPlayer.overseas })
  }

  function handleSavePlayerNote(note: string) {
    if (!selectedPlayer) return
    patchPlayerById(selectedPlayer.id, { note: note.trim() ? note.trim().slice(0, 4000) : undefined })
  }

  function handleRemovePlayerFromSquad() {
    if (!selectedPlayer) return
    if (
      !window.confirm(
        `Remove ${selectedPlayer.name} from this squad? They can be added again from the database or as a custom player.`,
      )
    ) {
      return
    }
    const id = selectedPlayer.id
    const inXi = startingXI.findIndex((p) => p.id === id)
    if (inXi >= 0) {
      handleUpdate(
        startingXI.filter((p) => p.id !== id),
        reserves,
        impactSubs,
      )
      setSelectedPlayer(null)
      return
    }
    if (reserves.some((p) => p.id === id)) {
      handleUpdate(
        startingXI,
        reserves.filter((p) => p.id !== id),
        impactSubs,
      )
      setSelectedPlayer(null)
      return
    }
    if (impactSubs.some((p) => p.id === id)) {
      handleUpdate(
        startingXI,
        reserves,
        impactSubs.filter((p) => p.id !== id),
      )
      setSelectedPlayer(null)
    }
  }

  function handleCreateCustomPlayer(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const p = createCustomSquadBlank(team.id, trimmed, format, gender)
    handleUpdate(startingXI, [...reserves, p], impactSubs)
    setSelectedPlayer(p)
  }

  function handleAddPlayer(dbEntry: PlayerDbEntry, target: 'reserves' | 'impact') {
    if (target === 'impact' && impactSubs.length >= MAX_IMPACT_SUBS) return
    const totalPlayers = startingXI.length + reserves.length + impactSubs.length
    const profile = getProfileForPlayer(dbEntry.name)
    const bat = profile.careerBatting
    const bowl = profile.careerBowling
    const btCaz = bat.average || 0
    const rawBase = bat.average ? Math.round(bat.average * 0.85 * 10) / 10 : 0
    const rawAdj = 0
    const raw = Math.round((rawBase + rawAdj) * 10) / 10
    const sr = bat.strikeRate ?? 0
    const econ = bowl.economy || 0
    const ballsPerWicket = bowl.strikeRate || 0
    const bowlWpo = ballsPerWicket > 0 ? 6 / ballsPerWicket : 0
    const overs = bowl.matches > 0 && bowl.wickets > 0 && ballsPerWicket > 0
      ? Math.min(4, Math.round((bowl.wickets * ballsPerWicket) / (6 * bowl.matches) * 10) / 10)
      : bowl.wickets > 0 ? 4 : 0
    const { wkts, bowlAvg } = calcWktsAndBowlAvg(overs, econ, bowlWpo)
    const bowlRating = calculateBowlRating(econ, bowlWpo, bowlAvg, overs, format, gender)
    const ratingParPosition = 11
    const newPlayer: SquadPlayer = {
      id: `${team.id}-p${totalPlayers + 1}`,
      playerId: dbEntry.id,
      name: dbEntry.name,
      btCaz,
      rawBase,
      rawAdj,
      raw,
      sr,
      fours: 0,
      sixes: 0,
      ratingParPosition,
      batRating: calculateBatRating(btCaz, raw, sr, ratingParPosition, format, gender),
      action: (dbEntry.role === 'BOWL' ? 'SEAM' : 'SEAM') as BowlAction,
      wkts,
      overs,
      econ,
      bowlWpo,
      bowlAvg,
      bowlRating,
      locked: false,
      keeper: false,
    }
    if (target === 'reserves') {
      const newReserves = [...reserves, newPlayer]
      setReserves(newReserves)
      storeSquad(team.id, startingXI, newReserves, selectedGround?.id ?? null, impactSubs)
    } else {
      const next = [...impactSubs, newPlayer]
      setImpactSubs(next)
      storeSquad(team.id, startingXI, reserves, selectedGround?.id ?? null, next)
    }
  }

  function handleLogoClick() {
    fileInputRef.current?.click()
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      storeTeamLogo(team.id, dataUrl)
      setTeamLogo(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleSelectGround(ground: Ground) {
    setSelectedGround(ground)
    setGroundSearch('')
    setGroundDropdownOpen(false)
    storeSquad(team.id, startingXI, reserves, ground.id, impactSubs)
  }

  return (
    <div className="team-manager">
      {/* Fixed ribbon */}
      <div className="tm-ribbon">
        {/* Left: team identity + factors + ground + form */}
        <div className="tm-ribbon-team">
          <div className="tm-ribbon-surface tm-ribbon-surface--identity">
          <div className="tm-ribbon-identity">
            <div className="team-logo-upload team-logo-upload-ribbon" onClick={handleLogoClick} title="Click to upload team logo">
              {teamLogo ? (
                <img src={teamLogo} alt="" className="tm-ribbon-logo" />
              ) : (
                <div className="tm-ribbon-logo-ph">
                  {team.name.charAt(0)}
                </div>
              )}
              <div className="team-logo-overlay">
                <span>✎</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="team-logo-input"
                onChange={handleLogoChange}
              />
            </div>
            <div className="tm-ribbon-identity-text">
              <div className="tm-ribbon-name-row">
                <h1 className="tm-ribbon-name">{team.name}</h1>
                {onOpenTeamAnalytics ? (
                  <button
                    type="button"
                    className="tm-ribbon-analytics-btn"
                    onClick={onOpenTeamAnalytics}
                    title="Team analytics (demo data)"
                    aria-label="Open team analytics"
                  >
                    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden focusable={false}>
                      <path
                        fill="currentColor"
                        d="M3 3v18h18v-2H5V3H3zm4 14h2V9H7v8zm5 0h2v-4h-2v4zm5 0h2V7h-2v10z"
                      />
                    </svg>
                  </button>
                ) : null}
                <div className="tm-ribbon-factors" aria-label="Squad rating totals (Starting XI)">
                  <div className="factor-pill-sm factor-pill-inline factor-pill-ribbon">
                    <span className="factor-label-sm">Bat</span>
                    <span
                      className={[
                        'factor-value-sm',
                        teamBattingParIndexClass(ribbonTeamRatings.bat),
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {ribbonTeamRatings.bat.toFixed(2)}
                    </span>
                  </div>
                  <div className="factor-pill-sm factor-pill-inline factor-pill-ribbon">
                    <span className="factor-label-sm">Bowl</span>
                    <span
                      className={[
                        'factor-value-sm',
                        teamBowlingParIndexClass(ribbonTeamRatings.bowl),
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {ribbonTeamRatings.bowl.toFixed(2)}
                    </span>
                  </div>
                  <div className="factor-pill-sm factor-pill-inline factor-pill-ribbon factor-pill-sm-total">
                    <span className="factor-label-sm">Total</span>
                    <span
                      className={[
                        'factor-value-sm',
                        teamBattingParIndexClass(
                          teamNetStrengthParIndex(ribbonTeamRatings.bat, ribbonTeamRatings.bowl),
                        ),
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {ribbonTeamRatings.total.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={
                      'factor-pill-sm factor-pill-inline factor-pill-ribbon tm-overseas-pill' +
                      (startingXiOverseasCount > MAX_OVERSEAS_XI_HINT ? ' tm-overseas-pill--warn' : '')
                    }
                    title={`Overseas in starting XI (typical competition limit ~${MAX_OVERSEAS_XI_HINT})`}
                  >
                    <span className="factor-label-sm tm-overseas-pill-label">
                      <svg className="tm-overseas-plane-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                        />
                      </svg>
                      OS
                    </span>
                    <span className="factor-value-sm">
                      {startingXiOverseasCount}/{MAX_OVERSEAS_XI_HINT}
                    </span>
                  </div>
                </div>
              </div>
              <div className="tm-ribbon-tournament">{tournamentName}</div>
            </div>
          </div>
          </div>

          <div className="tm-ribbon-surface tm-ribbon-surface--meta">
          {/* Home ground */}
          <div className="tm-ground">
            <div className="tm-ground-row">
              <span className="tm-ground-label">Home Ground</span>
              <span className="tm-ground-avg">Avg 1st Inn: {avgFirstInnings}</span>
            </div>
            <div className="tm-ground-selector">
              <input
                type="text"
                className="tm-ground-input"
                placeholder={selectedGround ? selectedGround.name : 'Search grounds...'}
                value={groundSearch}
                onChange={(e) => {
                  setGroundSearch(e.target.value)
                  setGroundDropdownOpen(true)
                }}
                onFocus={() => setGroundDropdownOpen(true)}
                onBlur={() => setTimeout(() => setGroundDropdownOpen(false), 200)}
              />
              {selectedGround && !groundSearch && (
                <div className="tm-ground-selected">
                  {selectedGround.name}, {selectedGround.city}
                </div>
              )}
              {groundDropdownOpen && filteredGrounds.length > 0 && (
                <ul className="tm-ground-dropdown">
                  {filteredGrounds.map((g) => (
                    <li
                      key={g.id}
                      className="tm-ground-option"
                      onMouseDown={() => handleSelectGround(g)}
                    >
                      <span className="tm-ground-option-name">{g.name}</span>
                      <span className="tm-ground-option-city">{g.city}, {g.country}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Last 10 results */}
          <div className="tm-form">
            <span className="tm-form-label">Last 10</span>
            <div className="tm-form-icons">
              {last10.map((r, i) => (
                <div key={i} className={`tm-form-icon ${r.won ? 'form-w' : 'form-l'}`}>
                  {r.won ? 'W' : 'L'}
                  <div className="tm-form-tooltip">
                    <div className="tm-form-tooltip-line">
                      {team.name}: {r.teamScore}/{r.teamWickets}
                    </div>
                    <div className="tm-form-tooltip-line">
                      {r.oppName}: {r.oppScore}/{r.oppWickets}
                    </div>
                    <div className="tm-form-tooltip-result">
                      {r.won ? 'Won' : 'Lost'} by {r.won
                        ? `${r.teamScore - r.oppScore} runs`
                        : `${r.oppScore - r.teamScore} runs`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Centre: tournament ratings table */}
        <div className="tm-ribbon-surface tm-ribbon-surface--league">
        <div className="tm-ribbon-league">
          <div className="tm-ribbon-section-label">Tournament Ratings</div>
          <div className="tm-ribbon-league-scroll">
            <table className="tm-mini-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="mini-th-name">Team</th>
                  <th className="mini-th-bat">Bat</th>
                  <th className="mini-th-bowl">Bowl</th>
                  <th className="mini-th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...allTeams]
                  .sort((a, b) => {
                    const s = (id: string) =>
                      teamNetStrengthParIndex(teamBatRatings[id] ?? 0, teamBowlingRatings[id] ?? 0)
                    return s(b.id) - s(a.id)
                  })
                  .map((t, i) => {
                    const batVal = teamBatRatings[t.id] ?? 0
                    const bowlVal = teamBowlingRatings[t.id] ?? 0
                    const totalVal = (batVal + bowlVal) / 2
                    return (
                  <tr key={t.id} className={t.id === team.id ? 'mini-row-current' : ''}>
                    <td>{i + 1}</td>
                    <td className="mini-td-name">{t.name}</td>
                    <td className={teamBattingParIndexClass(batVal)}>{batVal.toFixed(2)}</td>
                    <td className={teamBowlingParIndexClass(bowlVal)}>{bowlVal.toFixed(2)}</td>
                    <td
                      className={[
                        'mini-td-total',
                        teamBattingParIndexClass(teamNetStrengthParIndex(batVal, bowlVal)),
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {totalVal.toFixed(2)}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* Right: tournament batting & bowling ladders (paged) */}
        <div className="tm-ribbon-surface tm-ribbon-surface--rankings-wrap">
        <div className="tm-ribbon-rankings">
          <div className="tm-ribbon-rank-col">
            <div className="tm-ribbon-section-head">
              <div className="tm-ribbon-section-label tm-ribbon-section-label--bat">Tournament Batting</div>
              <select
                className="tm-ribbon-metric-select"
                value={dashBatMetric}
                onChange={(e) => {
                  const v = e.target.value as DashboardBatMetric
                  setDashBatMetric(v)
                  writeDashboardBatMetric(v)
                }}
                aria-label="Batting ranking metric"
              >
                {(['batRating', 'btCaz', 'srCaz'] as const).map((k) => (
                  <option key={k} value={k}>
                    {dashboardBatMetricOptionLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div className="tm-ribbon-rank-scroll">
              {ribbonBatters.length === 0 ? (
                <div className="tm-ribbon-rank-empty">No ratings yet</div>
              ) : (
                <>
                  {ribbonBatters.length > RIBBON_RANK_PAGE && (
                    <div className="tm-rank-dots" role="tablist" aria-label="Batting rank pages">
                      {Array.from({ length: ribbonBatTotalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={ribbonBatPage === i}
                          aria-label={'Batting page ' + (i + 1) + ' of ' + ribbonBatTotalPages}
                          className={'tm-rank-dot' + (ribbonBatPage === i ? ' tm-rank-dot-active' : '')}
                          onClick={() => setRibbonBatPage(i)}
                        />
                      ))}
                    </div>
                  )}
                  <ol className="tm-mini-rank-list">
                    {ribbonBatters
                      .slice(
                        ribbonBatPage * RIBBON_RANK_PAGE,
                        ribbonBatPage * RIBBON_RANK_PAGE + RIBBON_RANK_PAGE,
                      )
                      .map((p, i) => {
                        const rank = ribbonBatPage * RIBBON_RANK_PAGE + i + 1
                        const isSquad = currentSquadPlayerIds.has(p.id)
                        const val = p.value
                        return (
                          <li key={p.id} className={isSquad ? 'mini-rank-row-current' : undefined}>
                            <span className="mini-rank-num">{rank}</span>
                            <span className="mini-rank-name">{p.name}</span>
                            <span
                              className={
                                'mini-rank-val' + ribbonNumericClass(val, 'higher-better')
                              }
                            >
                              {formatDashboardBatMetricValue(dashBatMetric, val)}
                            </span>
                          </li>
                        )
                      })}
                  </ol>
                </>
              )}
            </div>
          </div>
          <div className="tm-ribbon-rank-col">
            <div className="tm-ribbon-section-head">
              <div className="tm-ribbon-section-label tm-ribbon-section-label--bowl">Tournament Bowling</div>
              <select
                className="tm-ribbon-metric-select"
                value={dashBowlMetric}
                onChange={(e) => {
                  const v = e.target.value as DashboardBowlMetric
                  setDashBowlMetric(v)
                  writeDashboardBowlMetric(v)
                }}
                aria-label="Bowling ranking metric"
              >
                {(['bowlRating', 'bowlAvg', 'econ', 'bowlBpw'] as const).map((k) => (
                  <option key={k} value={k}>
                    {dashboardBowlMetricOptionLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div className="tm-ribbon-rank-scroll">
              {ribbonBowlers.length === 0 ? (
                <div className="tm-ribbon-rank-empty">No ratings yet</div>
              ) : (
                <>
                  {ribbonBowlers.length > RIBBON_RANK_PAGE && (
                    <div className="tm-rank-dots" role="tablist" aria-label="Bowling rank pages">
                      {Array.from({ length: ribbonBowlTotalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={ribbonBowlPage === i}
                          aria-label={'Bowling page ' + (i + 1) + ' of ' + ribbonBowlTotalPages}
                          className={'tm-rank-dot' + (ribbonBowlPage === i ? ' tm-rank-dot-active' : '')}
                          onClick={() => setRibbonBowlPage(i)}
                        />
                      ))}
                    </div>
                  )}
                  <ol className="tm-mini-rank-list">
                    {ribbonBowlers
                      .slice(
                        ribbonBowlPage * RIBBON_RANK_PAGE,
                        ribbonBowlPage * RIBBON_RANK_PAGE + RIBBON_RANK_PAGE,
                      )
                      .map((p, i) => {
                        const rank = ribbonBowlPage * RIBBON_RANK_PAGE + i + 1
                        const isSquad = currentSquadPlayerIds.has(p.id)
                        const val = p.value
                        const sem = dashboardBowlMetricValueSemantics(dashBowlMetric)
                        return (
                          <li key={p.id} className={isSquad ? 'mini-rank-row-current' : undefined}>
                            <span className="mini-rank-num">{rank}</span>
                            <span className="mini-rank-name">{p.name}</span>
                            <span
                              className={'mini-rank-val' + ribbonNumericClass(val, sem)}
                            >
                              {formatDashboardBowlMetricValue(dashBowlMetric, val)}
                            </span>
                          </li>
                        )
                      })}
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Scrollable squad body + player stats panel (always visible) */}
      <div className="tm-body-layout tm-body-with-panel">
        <div className="tm-squad-body">
          <SquadTable
            cricketFormat={format}
            gender={gender}
            impactSubEnabled={impactSubEnabled}
            ratingParScore={ratingParScore}
            startingXI={startingXI}
            reserves={reserves}
            impactSubs={impactSubs}
            onUpdate={handleUpdate}
            selectedPlayerId={selectedPlayer?.id ?? null}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onAddPlayer={handleAddPlayer}
            onCreateCustomPlayer={handleCreateCustomPlayer}
          />
        </div>
        <div
          className="tm-panel-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize side panel"
          onMouseDown={handlePanelResizeStart}
        />
        {teamAnalyticsOpen ? (
          <TeamAnalyticsPanel
            team={team}
            batRating={teamBatRatings[team.id] ?? 0}
            bowlRating={teamBowlingRatings[team.id] ?? 0}
            tournamentName={tournamentName}
            onClose={() => onCloseTeamAnalytics?.()}
            mode="docked"
            panelWidth={playerPanelWidth}
          />
        ) : (
          <PlayerDetailPanel
            player={selectedPlayer}
            tournamentName={tournamentName}
            contextTournamentId={tournamentId}
            panelWidth={playerPanelWidth}
            onClose={() => setSelectedPlayer(null)}
            squadSlot={
              selectedPlayer
                ? startingXI.some((p) => p.id === selectedPlayer.id)
                  ? 'starting'
                  : 'bench'
                : null
            }
            playerIsKeeper={selectedPlayer?.keeper === true}
            onToggleWicketKeeper={
              selectedPlayer && startingXI.some((p) => p.id === selectedPlayer.id)
                ? handleToggleWicketKeeper
                : undefined
            }
            playerIsOverseas={selectedPlayer?.overseas === true}
            onToggleOverseas={selectedPlayer ? handleToggleOverseas : undefined}
            onSavePlayerNote={selectedPlayer ? handleSavePlayerNote : undefined}
            onRemoveFromSquad={selectedPlayer ? handleRemovePlayerFromSquad : undefined}
            tournamentRankSummary={playerTournamentRanks}
          />
        )}
      </div>
    </div>
  )
}
