'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { fetchJson } from '../../lib/api/fetchJson'
import type { SquadPlayer } from '../data/squad'
import { getProfileForPlayer, type PlayerProfile } from '../data/playerProfile'
import {
  mergeApiProfileIntoBase,
  profileForSquadPlayer,
} from '../data/squadProfileFallback'
import {
  ageLongFromDob,
  BATTING_STYLE_OPTIONS,
  BOWLING_STYLE_OPTIONS,
  formatDobDisplay,
  getEffectiveBio,
  getPlayerBio,
  getPlayerBioStoreVersion,
  PLAYING_ROLE_OPTIONS,
  savePlayerBio,
  clearPlayerBio,
  subscribePlayerBioStore,
} from '../data/playerBioStore'
import {
  getPlayerProfileLayout,
  getPlayerProfileLayoutVersion,
  isPlayerProfileSectionVisible,
  layoutNeedsPerfRows,
  setPlayerProfileSectionVisibility,
  subscribePlayerProfileLayout,
  type PlayerProfileSectionId,
} from '../data/playerProfileLayout'
import {
  careerSourceNote,
  competitionFormatFor,
  formatChoiceLabel,
  PLAYER_FORMAT_CHOICES,
  rowPassesFormatFilter,
  type CompetitionFormatRef,
  type PlayerFormatChoice,
} from '../data/playerFormatFilter'
import type { StatzMatchRow } from '../data/statzPlayer'
import { computePlayerTournamentRankSummary } from '../data/tournamentPlayerRanks'
import { getTeamsByTournament } from '../data/teams'
import {
  findSquadPlayerOnTeam,
  getSquadStoreVersion,
  setSquadPlayerNote,
  subscribeSquadStore,
} from '../data/squadStore'
import PlayerT20StatsBreakdown from './PlayerT20StatsBreakdown'

export interface HubPlayerTeamRef {
  teamId: string
  teamName: string
  tournamentId: string
  tournamentName: string
}

interface PlayerFullProfileProps {
  playerName: string
  squadPlayer?: SquadPlayer | null
  teams: HubPlayerTeamRef[]
  contextTournamentId?: string | null
  /** When opened from a team squad, notes save on this team’s draft. */
  contextTeamId?: string | null
  eyebrow: string
  onBack: () => void
  onOpenTeam: (teamId: string, tournamentId: string) => void
}

type FullProfileTab = 'overview' | 'stats' | 'matches'

interface DatasetHit {
  playerId: string
  displayName: string
  appearances: number
}

interface PerfRow {
  id: number
  matchDate: string | null
  playerName: string
  playerId: string
  teamName: string | null
  opponent: string | null
  batRuns: number | null
  batBalls: number | null
  bowlWickets: number | null
  competitionId: string | null
}

interface CompetitionOption extends CompetitionFormatRef {
  label: string
}

/** Stored SR.CAZ is runs per ball; hub tiles show traditional SR per 100 balls. */
function srPer100(caz: number): number {
  return Math.round(caz * 100 * 100) / 100
}

/** Traditional batting SR per 100 balls from runs/balls. */
function srFromRunsBalls(runs: number, balls: number): string {
  if (!balls || balls <= 0) return '—'
  return fmtNum((runs / balls) * 100)
}

function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  if (n % 1 === 0) return String(Math.trunc(n))
  return n.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase()
  return `${parts[0]?.charAt(0) ?? ''}${parts[parts.length - 1]?.charAt(0) ?? ''}`.toUpperCase()
}

function autoSummary(name: string, profile: PlayerProfile): string {
  const bat = profile.careerBatting
  const bowl = profile.careerBowling
  const bits: string[] = []
  if (bat.matches > 0 || bat.runs > 0) {
    bits.push(
      `${bat.runs.toLocaleString()} career T20 runs at an average of ${fmtNum(bat.average)} with a strike rate of ${fmtNum(srPer100(bat.strikeRate))}`,
    )
  }
  if (bowl.wickets > 0) {
    bits.push(
      `${bowl.wickets} career T20 wickets at an average of ${fmtNum(bowl.average)} (econ ${fmtNum(bowl.economy)})`,
    )
  }
  if (bits.length === 0) {
    return `${name} has no career T20 aggregates in the local database yet. Import performances or map this player to a dataset PlayerID to populate this profile.`
  }
  return `${name} — ${bits.join('; ')}.`
}

export default function PlayerFullProfile({
  playerName,
  squadPlayer = null,
  teams,
  contextTournamentId = null,
  contextTeamId = null,
  eyebrow,
  onBack,
  onOpenTeam,
}: PlayerFullProfileProps) {
  const [tab, setTab] = useState<FullProfileTab>('overview')
  const [profile, setProfile] = useState<PlayerProfile>(() =>
    squadPlayer ? profileForSquadPlayer(squadPlayer) : getProfileForPlayer(playerName),
  )
  const [editingBio, setEditingBio] = useState(false)
  const [perfRows, setPerfRows] = useState<PerfRow[] | null>(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([])
  const [formatChoice, setFormatChoice] = useState<PlayerFormatChoice>('all')
  const [statzRows, setStatzRows] = useState<StatzMatchRow[] | null>(null)
  const [statzLoading, setStatzLoading] = useState(false)
  const [statzError, setStatzError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const bioSectionRef = useRef<HTMLElement>(null)

  const bioVersion = useSyncExternalStore(
    subscribePlayerBioStore,
    getPlayerBioStoreVersion,
    getPlayerBioStoreVersion,
  )
  void bioVersion
  const layoutVersion = useSyncExternalStore(
    subscribePlayerProfileLayout,
    getPlayerProfileLayoutVersion,
    getPlayerProfileLayoutVersion,
  )
  void layoutVersion
  // Layout board config; falls back to the default section order when none saved.
  const layout = getPlayerProfileLayout()
  const bio = getEffectiveBio(playerName, profile.country)
  const hasSavedBio = getPlayerBio(playerName) !== null

  // Base career profile: squad-seeded when available, then dataset merge (same as pop-out modal).
  useEffect(() => {
    setProfile(squadPlayer ? profileForSquadPlayer(squadPlayer) : getProfileForPlayer(playerName))
    setTab('overview')
    setEditingBio(false)
    setFormatChoice('all')
    let cancelled = false
    void (async () => {
      const result = await fetchJson<PlayerProfile & { error?: string }>(
        `/api/cricket/profile-by-name?name=${encodeURIComponent(playerName)}`,
      )
      if (cancelled || !result.ok || !result.data || result.data.error) return
      setProfile((prev) => mergeApiProfileIntoBase(prev, result.data!))
    })()
    return () => {
      cancelled = true
    }
  }, [playerName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Competition → tournament mapping for the format + competition filters.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetchJson<{ competitions?: CompetitionOption[] }>(
        '/api/cricket/competitions',
      )
      if (!cancelled && result.ok && result.data) {
        setCompetitions(result.data.competitions ?? [])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [playerName])

  // The layout-driven overview also needs match rows when its Year-by-year,
  // Trend or Recent sections are visible.
  const overviewNeedsPerf = tab === 'overview' && layoutNeedsPerfRows(layout)
  const needsMatchRows = tab === 'matches' || overviewNeedsPerf

  // Match-level rows for the Matches tab (dataset PlayerID resolved by name search).
  useEffect(() => {
    if (!needsMatchRows || perfRows !== null) return
    let cancelled = false
    void (async () => {
      setPerfLoading(true)
      try {
        const hit = await fetchJson<{ players?: DatasetHit[] }>(
          `/api/cricket/players?q=${encodeURIComponent(playerName)}&limit=5`,
        )
        const exact =
          hit.ok && hit.data?.players?.length
            ? (hit.data.players.find(
                (p) => p.displayName.toLowerCase() === playerName.toLowerCase(),
              ) ?? hit.data.players[0]!)
            : null
        if (!exact) {
          if (!cancelled) setPerfRows([])
          return
        }
        const params = new URLSearchParams({
          page: '1',
          pageSize: '100',
          playerId: exact.playerId,
        })
        const rows = await fetchJson<{ rows?: PerfRow[] }>(
          `/api/cricket/performances?${params}`,
        )
        if (!cancelled) setPerfRows(rows.ok && rows.data ? (rows.data.rows ?? []) : [])
      } finally {
        if (!cancelled) setPerfLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [playerName, perfRows, needsMatchRows])

  // Statz recent-match feed (proxied server-side with a short cache).
  useEffect(() => {
    if (!needsMatchRows || statzRows !== null) return
    let cancelled = false
    void (async () => {
      setStatzLoading(true)
      setStatzError(null)
      try {
        const result = await fetchJson<{ rows?: StatzMatchRow[]; error?: string }>(
          `/api/cricket/statz-player?name=${encodeURIComponent(playerName)}`,
        )
        if (cancelled) return
        if (result.ok && result.data?.rows?.length) {
          setStatzRows(result.data.rows)
        } else {
          setStatzRows([])
          setStatzError(result.data?.error ?? result.error ?? 'Statz feed unavailable')
        }
      } finally {
        if (!cancelled) setStatzLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [playerName, statzRows, needsMatchRows])

  useEffect(() => {
    setPerfRows(null)
    setStatzRows(null)
    setStatzError(null)
  }, [playerName])

  const ageLong = useMemo(
    () => (bio.dob ? ageLongFromDob(bio.dob) : null),
    [bio.dob],
  )

  // Header affordance: jump to the Bio block, unhiding it if needed, so
  // handedness / styles are always one click away (no Layout Board trip).
  function handleEditBio() {
    if (!isPlayerProfileSectionVisible(getPlayerProfileLayout(), 'bio')) {
      setPlayerProfileSectionVisibility('bio', true)
    }
    setTab('overview')
    setEditingBio(true)
    window.setTimeout(() => bioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => savePlayerBio(playerName, { photo: reader.result as string })
    reader.readAsDataURL(file)
  }

  const bat = profile.careerBatting
  const bowl = profile.careerBowling
  const careerNote = careerSourceNote(formatChoice)

  // Statz covers T20 recent form; for ODI/TEST/FC fall back to dataset rows.
  const useStatz =
    statzRows !== null && statzRows.length > 0 && (formatChoice === 'all' || formatChoice === 't20')

  // Match rows after the global format filter (competition filter lives in
  // the year-by-year card). Unmapped competitions count as T20 (see filter).
  const rowsByFormat = useMemo(() => {
    const rows = perfRows ?? []
    if (formatChoice === 'all') return rows
    return rows.filter((r) =>
      rowPassesFormatFilter(competitionFormatFor(r.competitionId, competitions), formatChoice),
    )
  }, [perfRows, competitions, formatChoice])

  const squadPlayerId = squadPlayer?.id ?? null
  const rankSummary = useMemo(() => {
    if (!squadPlayerId || !contextTournamentId) return null
    try {
      const tournamentTeams = getTeamsByTournament(contextTournamentId).map((t) => ({
        id: t.id,
        name: t.name,
      }))
      return computePlayerTournamentRankSummary(squadPlayerId, tournamentTeams)
    } catch {
      return null
    }
  }, [squadPlayerId, contextTournamentId])

  function renderOverviewSection(id: PlayerProfileSectionId): JSX.Element | null {
    switch (id) {
      case 'header':
        return null
      case 'bio':
        return (
          <section className="ph-card" ref={bioSectionRef}>
            <div className="ph-card-head">
              <h2 className="ph-card-title">Player bio</h2>
              <div className="ph-card-head-actions">
                {hasSavedBio && !editingBio && (
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    onClick={() => {
                      clearPlayerBio(playerName)
                    }}
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  onClick={() => setEditingBio((v) => !v)}
                >
                  {editingBio ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>
            {!editingBio ? (
              <dl className="ph-bio-grid">
                <div className="ph-bio-cell">
                  <dt>Full name</dt>
                  <dd>{bio.fullName || playerName}</dd>
                </div>
                <div className="ph-bio-cell">
                  <dt>Born</dt>
                  <dd>{bio.dob ? formatDobDisplay(bio.dob) : '—'}</dd>
                </div>
                <div className="ph-bio-cell">
                  <dt>Age</dt>
                  <dd>{ageLong ?? '—'}</dd>
                </div>
                <div className="ph-bio-cell">
                  <dt>Nationality</dt>
                  <dd>{bio.nationality || profile.country || '—'}</dd>
                </div>
                <div className="ph-bio-cell">
                  <dt>Batting style</dt>
                  <dd>{bio.battingStyle}</dd>
                </div>
                <div className="ph-bio-cell">
                  <dt>Bowling style</dt>
                  <dd>{bio.bowlingStyle}</dd>
                </div>
                <div className="ph-bio-cell">
                  <dt>Playing role</dt>
                  <dd>{bio.playingRole}</dd>
                </div>
              </dl>
            ) : (
              <BioEditorForm playerName={playerName} countryFallback={profile.country} />
            )}
            <p className="ph-bio-text">
              {bio.bio.trim() ? bio.bio : autoSummary(playerName, profile)}
            </p>
            {!bio.bio.trim() && (
              <p className="ph-hint">Auto summary from local stats — use Edit to add a custom biography.</p>
            )}
          </section>
        )
      case 'career':
        return (
          <section className="ph-card">
            <div className="ph-card-head">
              <h2 className="ph-card-title">Career summary · {formatChoiceLabel(formatChoice)}</h2>
              <span
                className={`ph-source-badge${careerNote.bestAvailable ? ' ph-source-badge--best' : ''}`}
                title="The local dataset holds T20 numbers only"
              >
                {careerNote.title}
              </span>
            </div>
            <div className="ph-career-duo">
              <div className="ph-career-pane">
                <CareerTiles bat={bat} bowl={bowl} mode="batting" />
              </div>
              <div className="ph-career-pane">
                <CareerTiles bat={bat} bowl={bowl} mode="bowling" />
              </div>
            </div>
          </section>
        )
      case 'seasons':
        return (
          <SeasonsSplitCard
            key={playerName}
            rows={rowsByFormat}
            competitions={competitions}
            loading={perfLoading}
            formatLabel={formatChoiceLabel(formatChoice)}
          />
        )
      case 'trend':
        return (
          <MatchTrendCard
            key={`trend-${playerName}`}
            statzRows={useStatz ? statzRows : null}
            fallbackRows={rowsByFormat}
            fallbackLoading={perfLoading}
            useStatz={useStatz}
            formatLabel={formatChoiceLabel(formatChoice)}
          />
        )
      case 'recent':
        return (
          <MatchDataCard
            key={`recent-${playerName}`}
            statzRows={useStatz ? statzRows : null}
            statzLoading={statzLoading}
            statzError={statzError}
            fallbackRows={rowsByFormat}
            fallbackLoading={perfLoading}
            useStatz={useStatz}
            formatLabel={formatChoiceLabel(formatChoice)}
          />
        )
      case 'ranks':
        return (
          <TournamentRanksCard
            rankSummary={rankSummary}
            hasSquadContext={Boolean(squadPlayerId && contextTournamentId)}
          />
        )
      case 't20':
        return (
          <section className="ph-card">
            <div className="ph-card-head">
              <h2 className="ph-card-title">T20 breakdown</h2>
              {careerNote.bestAvailable && (
                <span className="ph-source-badge ph-source-badge--best">
                  Showing T20 breakdown — best available
                </span>
              )}
            </div>
            <div className="ph-breakdown">
              <PlayerT20StatsBreakdown
                playerName={playerName}
                contextTournamentId={contextTournamentId}
                variant="batting"
              />
            </div>
            <div className="ph-breakdown">
              <PlayerT20StatsBreakdown
                playerName={playerName}
                contextTournamentId={contextTournamentId}
                variant="bowling"
              />
            </div>
          </section>
        )
      case 'records':
        return <RecordsCard bat={bat} bowl={bowl} />
      default:
        return null
    }
  }

  return (
    <div className="ph-profile">
      <div className="ph-crumbs">
        <button type="button" className="ph-back-btn" onClick={onBack}>
          ← Back
        </button>
        <span className="ph-crumb-trail">{eyebrow}</span>
      </div>

      {/* Header: avatar, identity, inline team chips, hero tiles */}
      {isPlayerProfileSectionVisible(layout, 'header') && (
      <header className="ph-hero">
        <div
          className="ph-avatar"
          onClick={() => photoRef.current?.click()}
          title="Click to upload photo"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') photoRef.current?.click()
          }}
        >
          {bio.photo ? (
            <img src={bio.photo} alt="" className="ph-avatar-img" />
          ) : (
            <span className="ph-avatar-initials">{initialsFor(playerName)}</span>
          )}
          <span className="ph-avatar-edit">✎</span>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="team-logo-input"
            onChange={handlePhotoChange}
          />
        </div>
        <div className="ph-hero-info">
          <div className="ph-hero-name">{playerName}</div>
          <div className="ph-hero-meta">
            {[bio.nationality || profile.country || null, bio.playingRole !== 'Unknown' ? bio.playingRole : null]
              .filter(Boolean)
              .join('  |  ') || '—'}
          </div>
          {(bio.battingStyle !== 'Unknown' || bio.bowlingStyle !== 'Unknown') && (
            <div className="ph-hero-styles">
              {[bio.battingStyle !== 'Unknown' ? bio.battingStyle : null, bio.bowlingStyle !== 'Unknown' ? bio.bowlingStyle : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          {teams.length > 0 ? (
            <div className="ph-team-chips" aria-label="Squad teams">
              {teams.slice(0, 6).map((t) => (
                <button
                  key={`${t.tournamentId}-${t.teamId}`}
                  type="button"
                  className="ph-team-chip"
                  onClick={() => onOpenTeam(t.teamId, t.tournamentId)}
                  title={`${t.teamName} · ${t.tournamentName}`}
                >
                  {t.teamName}
                </button>
              ))}
              {ageLong ? <span className="ph-hero-sub">Age {ageLong}</span> : null}
            </div>
          ) : (
            <div className="ph-hero-sub">
              No squad team in this tournament
              {ageLong ? `  ·  Age ${ageLong}` : ''}
            </div>
          )}
          <button
            type="button"
            className="ph-btn ph-btn-ghost ph-btn-sm ph-hero-edit"
            onClick={handleEditBio}
            title="Edit name, handedness, role and biography"
          >
            ✎ Edit bio
          </button>
        </div>
        <div className="ph-hero-tiles">
          <div className="ph-hero-tile">
            <span className="ph-hero-tile-label">T20 runs</span>
            <span className="ph-hero-tile-value">{bat.runs.toLocaleString()}</span>
          </div>
          <div className="ph-hero-tile">
            <span className="ph-hero-tile-label">Bat avg</span>
            <span className="ph-hero-tile-value">{fmtNum(bat.average)}</span>
          </div>
          <div className="ph-hero-tile">
            <span className="ph-hero-tile-label">T20 wkts</span>
            <span className="ph-hero-tile-value">{bowl.wickets}</span>
          </div>
        </div>
      </header>
      )}

      {/* Tabs */}
      <div className="ph-tabs" role="tablist" aria-label="Player profile sections">
        {(
          [
            ['overview', 'Overview'],
            ['stats', 'Stats'],
            ['matches', 'Matches'],
          ] as [FullProfileTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`ph-tab${tab === id ? ' ph-tab-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <FormatSegmentedControl
        choice={formatChoice}
        onChange={setFormatChoice}
      />

      {tab === 'overview' && (
        <div className="ph-section-stack">
          <PlayerPrepNoteCard
            playerName={playerName}
            squadPlayer={squadPlayer}
            teams={teams}
            contextTournamentId={contextTournamentId}
            contextTeamId={contextTeamId}
          />
          {layout.sections
            .filter((s) => s.id !== 'header' && s.visible)
            .map((s) => (
              <Fragment key={s.id}>{renderOverviewSection(s.id)}</Fragment>
            ))}
        </div>
      )}

      {tab === 'stats' && (
        <div className="ph-section-stack">
          <section className="ph-card">
            <div className="ph-card-head">
              <h2 className="ph-card-title">Career batting · {formatChoiceLabel(formatChoice)}</h2>
              <span
                className={`ph-source-badge${careerNote.bestAvailable ? ' ph-source-badge--best' : ''}`}
              >
                {careerNote.title}
              </span>
            </div>
            <CareerTiles bat={bat} bowl={bowl} mode="batting" />
            <div className="ph-breakdown">
              <PlayerT20StatsBreakdown
                playerName={playerName}
                contextTournamentId={contextTournamentId}
                variant="batting"
              />
            </div>
          </section>
          <section className="ph-card">
            <h2 className="ph-card-title">Career bowling</h2>
            <CareerTiles bat={bat} bowl={bowl} mode="bowling" />
            <div className="ph-breakdown">
              <PlayerT20StatsBreakdown
                playerName={playerName}
                contextTournamentId={contextTournamentId}
                variant="bowling"
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'matches' && (
        <div className="ph-section-stack">
          <MatchTrendCard
            statzRows={useStatz ? statzRows : null}
            fallbackRows={rowsByFormat}
            fallbackLoading={perfLoading}
            useStatz={useStatz}
            formatLabel={formatChoiceLabel(formatChoice)}
          />
          <MatchDataCard
            statzRows={useStatz ? statzRows : null}
            statzLoading={statzLoading}
            statzError={statzError}
            fallbackRows={rowsByFormat}
            fallbackLoading={perfLoading}
            useStatz={useStatz}
            formatLabel={formatChoiceLabel(formatChoice)}
          />
        </div>
      )}
    </div>
  )
}

function PlayerPrepNoteCard({
  playerName,
  squadPlayer,
  teams,
  contextTournamentId,
  contextTeamId = null,
}: {
  playerName: string
  squadPlayer?: SquadPlayer | null
  teams: HubPlayerTeamRef[]
  contextTournamentId?: string | null
  contextTeamId?: string | null
}) {
  useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, () => 0)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const noteTeam =
    (contextTeamId ? teams.find((t) => t.teamId === contextTeamId) : null) ??
    (contextTournamentId ? teams.find((t) => t.tournamentId === contextTournamentId) : null) ??
    teams[0] ??
    null
  const livePlayer = noteTeam
    ? findSquadPlayerOnTeam(noteTeam.teamId, squadPlayer?.id, playerName)
    : squadPlayer ?? null
  const savedNote = livePlayer?.note?.trim() ?? ''

  useEffect(() => {
    if (!editing) setDraft(savedNote)
  }, [savedNote, editing, livePlayer?.id])

  function handleSave() {
    if (!noteTeam || !livePlayer) return
    setSquadPlayerNote(noteTeam.teamId, livePlayer.id, draft, playerName)
    setEditing(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  function handleClear() {
    if (!noteTeam || !livePlayer) return
    setSquadPlayerNote(noteTeam.teamId, livePlayer.id, '', playerName)
    setDraft('')
    setEditing(false)
  }

  return (
    <section className="ph-card ph-player-note" aria-label="Player note">
      <div className="ph-card-head">
        <h2 className="ph-card-title">Player note</h2>
        <div className="ph-card-head-actions">
          {livePlayer && noteTeam && !editing ? (
            <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setEditing(true)}>
              {savedNote ? 'Edit' : 'Add note'}
            </button>
          ) : null}
        </div>
      </div>
      {noteTeam && livePlayer ? (
        <p className="ph-player-note-meta">
          Saved on {noteTeam.teamName} squad · shown in Tournament Prep
          {savedFlash ? ' · Saved' : ''}
        </p>
      ) : (
        <p className="ph-player-note-empty">
          Add this player to a squad to save a prep note. Notes are stored with the squad draft in this browser.
        </p>
      )}
      {livePlayer && noteTeam && editing ? (
        <>
          <textarea
            className="ph-player-note-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="e.g. Likely opener in Cardiff; watch the left-arm matchup…"
          />
          <div className="ph-player-note-actions">
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              onClick={() => {
                setDraft(savedNote)
                setEditing(false)
              }}
            >
              Cancel
            </button>
            {savedNote ? (
              <button type="button" className="ph-btn ph-btn-ghost" onClick={handleClear}>
                Clear note
              </button>
            ) : null}
            <button type="button" className="ph-btn" onClick={handleSave}>
              Save note
            </button>
          </div>
        </>
      ) : savedNote ? (
        <p className="ph-player-note-body">{savedNote}</p>
      ) : livePlayer && noteTeam ? (
        <p className="ph-player-note-empty">No player note yet.</p>
      ) : null}
    </section>
  )
}

function FormatSegmentedControl({
  choice,
  onChange,
}: {
  choice: PlayerFormatChoice
  onChange: (choice: PlayerFormatChoice) => void
}) {
  return (
    <div className="ph-format-bar" role="group" aria-label="Format filter">
      <span className="ph-format-label">Format</span>
      <div className="ph-seg">
        {PLAYER_FORMAT_CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ph-seg-btn${choice === c.id ? ' ph-seg-btn-active' : ''}`}
            aria-pressed={choice === c.id}
            title={c.hint}
            onClick={() => onChange(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <span className="ph-format-note">
        {choice === 'all' || choice === 't20'
          ? 'Recent form: Statz T20 feed when available.'
          : 'Non-T20 views show best-available T20 data.'}
      </span>
    </div>
  )
}
function CareerTiles({
  bat,
  bowl,
  mode = 'both',
}: {
  bat: PlayerProfile['careerBatting']
  bowl: PlayerProfile['careerBowling']
  mode?: 'both' | 'batting' | 'bowling'
}) {
  const battingCells: [string, string][] = [
    ['Matches', String(bat.matches)],
    ['Runs', bat.runs.toLocaleString()],
    ['Average', fmtNum(bat.average)],
    ['SR', fmtNum(srPer100(bat.strikeRate))],
    ['100s', String(bat.hundreds)],
    ['50s', String(bat.fifties)],
    ['High score', bat.highScore || '—'],
    ['Innings', String(bat.innings)],
  ]
  const bowlingCells: [string, string][] = [
    ['Matches', String(bowl.matches)],
    ['Wickets', String(bowl.wickets)],
    ['Average', fmtNum(bowl.average)],
    ['Economy', fmtNum(bowl.economy)],
    ['Strike rate', fmtNum(bowl.strikeRate)],
    ['Best', bowl.bestFigures || '—'],
    ['5W', String(bowl.fiveWickets)],
    ['Innings', String(bowl.innings)],
  ]
  return (
    <div className="ph-stat-groups">
      {mode !== 'bowling' && (
        <div className="ph-stat-group">
          <h3 className="ph-stat-group-title ph-stat-group-title--bat">Batting &amp; fielding</h3>
          <div className="ph-stat-grid">
            {battingCells.map(([label, value]) => (
              <div key={label} className="ph-stat-box">
                <span className="ph-stat-label">{label}</span>
                <span className="ph-stat-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {mode !== 'batting' && (
        <div className="ph-stat-group">
          <h3 className="ph-stat-group-title ph-stat-group-title--bowl">Bowling</h3>
          <div className="ph-stat-grid">
            {bowlingCells.map(([label, value]) => (
              <div key={label} className="ph-stat-box">
                <span className="ph-stat-label">{label}</span>
                <span className="ph-stat-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SeasonBatYear {
  year: string
  innings: number
  runs: number
  balls: number
  hs: number
  fifties: number
  hundreds: number
}

interface SeasonBowlYear {
  year: string
  innings: number
  wickets: number
  best: number
  threeW: number
  fiveW: number
}

function SeasonsSplitCard({
  rows,
  competitions,
  loading,
  formatLabel,
}: {
  rows: PerfRow[]
  competitions: CompetitionOption[]
  loading: boolean
  formatLabel: string
}) {
  const [compChoice, setCompChoice] = useState<string>('all')

  const compOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows) {
      if (!r.competitionId || seen.has(r.competitionId)) continue
      seen.set(
        r.competitionId,
        competitions.find((c) => c.competitionId === r.competitionId)?.label ?? r.competitionId,
      )
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows, competitions])

  const compRows = useMemo(
    () => (compChoice === 'all' ? rows : rows.filter((r) => r.competitionId === compChoice)),
    [rows, compChoice],
  )

  const years = useMemo(() => {
    const bat = new Map<string, SeasonBatYear>()
    const bowl = new Map<string, SeasonBowlYear>()
    for (const r of compRows) {
      const year = (r.matchDate ?? '').slice(0, 4)
      if (!/^\d{4}$/.test(year)) continue
      let b = bat.get(year)
      if (!b) {
        b = { year, innings: 0, runs: 0, balls: 0, hs: 0, fifties: 0, hundreds: 0 }
        bat.set(year, b)
      }
      const runs = r.batRuns ?? 0
      b.innings += 1
      b.runs += runs
      b.balls += r.batBalls ?? 0
      b.hs = Math.max(b.hs, runs)
      if (runs >= 100) b.hundreds += 1
      else if (runs >= 50) b.fifties += 1
      let w = bowl.get(year)
      if (!w) {
        w = { year, innings: 0, wickets: 0, best: 0, threeW: 0, fiveW: 0 }
        bowl.set(year, w)
      }
      const wkts = r.bowlWickets ?? 0
      w.innings += 1
      w.wickets += wkts
      w.best = Math.max(w.best, wkts)
      if (wkts >= 5) w.fiveW += 1
      else if (wkts >= 3) w.threeW += 1
    }
    const allYears = [...new Set([...bat.keys(), ...bowl.keys()])].sort((a, b) =>
      b.localeCompare(a),
    )
    return allYears.map((year) => ({
      year,
      bat: bat.get(year) ?? { year, innings: 0, runs: 0, balls: 0, hs: 0, fifties: 0, hundreds: 0 },
      bowl: bowl.get(year) ?? { year, innings: 0, wickets: 0, best: 0, threeW: 0, fiveW: 0 },
    }))
  }, [compRows])

  return (
    <section className="ph-card">
      <div className="ph-card-head">
        <h2 className="ph-card-title">Year-by-year · {formatLabel}</h2>
        <label className="ph-comp-filter">
          <span>Comp</span>
          <select
            className="ph-input ph-input-sm"
            value={compChoice}
            onChange={(e) => setCompChoice(e.target.value)}
            aria-label="Filter seasons by competition"
          >
            <option value="all">All comps</option>
            {compOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p className="ph-muted">Loading match data…</p>
      ) : years.length === 0 ? (
        <div className="ph-empty">
          <div className="ph-empty-title">No season data yet</div>
          <p className="ph-muted">
            {rows.length === 0
              ? `No ${formatLabel} performances in the local dataset for this player.`
              : 'Season aggregates will appear here once dataset rows carry usable match dates.'}
          </p>
        </div>
      ) : (
        <div className="ph-seasons-duo">
          <div className="ph-seasons-pane">
            <h3 className="ph-stat-group-title ph-stat-group-title--bat">Batting years</h3>
            <div className="ph-table-wrap">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Inns</th>
                    <th>Runs</th>
                    <th>SR</th>
                    <th>HS</th>
                    <th>50s</th>
                    <th>100s</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(({ year, bat: b }) => (
                    <tr key={year}>
                      <td className="ph-td-em">{year}</td>
                      <td>{b.innings}</td>
                      <td className="ph-td-em">{b.runs.toLocaleString()}</td>
                      <td>{srFromRunsBalls(b.runs, b.balls)}</td>
                      <td>{b.hs}</td>
                      <td>{b.fifties}</td>
                      <td>{b.hundreds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="ph-seasons-pane">
            <h3 className="ph-stat-group-title ph-stat-group-title--bowl">Bowling years</h3>
            <div className="ph-table-wrap">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Inns</th>
                    <th>Wkts</th>
                    <th>Best</th>
                    <th>3W</th>
                    <th>5W</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(({ year, bowl: w }) => (
                    <tr key={year}>
                      <td className="ph-td-em">{year}</td>
                      <td>{w.innings}</td>
                      <td className="ph-td-em">{w.wickets}</td>
                      <td>{w.best}</td>
                      <td>{w.threeW}</td>
                      <td>{w.fiveW}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

type TrendStatId = 'runs' | 'sr' | 'fours' | 'sixes' | 'balls' | 'wickets' | 'econ'

const STATZ_TREND_STATS: { id: TrendStatId; label: string; step: number }[] = [
  { id: 'runs', label: 'Runs', step: 1 },
  { id: 'sr', label: 'SR', step: 0.5 },
  { id: 'fours', label: '4s', step: 1 },
  { id: 'sixes', label: '6s', step: 1 },
  { id: 'balls', label: 'Balls', step: 1 },
  { id: 'wickets', label: 'Wkts', step: 1 },
  { id: 'econ', label: 'Econ', step: 0.5 },
]

const FALLBACK_TREND_STATS: { id: TrendStatId; label: string; step: number }[] = [
  { id: 'runs', label: 'Runs', step: 1 },
  { id: 'balls', label: 'Balls', step: 1 },
  { id: 'sr', label: 'SR', step: 0.5 },
]

function statzTrendValue(r: StatzMatchRow, stat: TrendStatId): number {
  switch (stat) {
    case 'runs':
      return r.runs ?? 0
    case 'sr':
      return r.balls && r.balls > 0 ? ((r.runs ?? 0) / r.balls) * 100 : 0
    case 'fours':
      return r.fours ?? 0
    case 'sixes':
      return r.sixes ?? 0
    case 'balls':
      return r.balls ?? 0
    case 'wickets':
      return r.wickets ?? 0
    case 'econ':
      return r.economy ?? 0
  }
}

function fallbackTrendValue(r: PerfRow, stat: TrendStatId): number {
  const runs = r.batRuns ?? 0
  const balls = r.batBalls ?? 0
  switch (stat) {
    case 'runs':
      return runs
    case 'balls':
      return balls
    case 'sr':
      return balls > 0 ? (runs / balls) * 100 : 0
    default:
      return 0
  }
}

function MatchTrendCard({
  statzRows,
  fallbackRows,
  fallbackLoading,
  useStatz,
  formatLabel,
}: {
  statzRows: StatzMatchRow[] | null
  fallbackRows: PerfRow[]
  fallbackLoading: boolean
  useStatz: boolean
  formatLabel: string
}) {
  const [stat, setStat] = useState<TrendStatId>('runs')
  const [team, setTeam] = useState('all')
  const [comp, setComp] = useState('all')
  const [period, setPeriod] = useState('all')
  const [games, setGames] = useState('30')
  const [homeAway, setHomeAway] = useState('all')
  const [opposition, setOpposition] = useState('all')
  const [refOverride, setRefOverride] = useState<number | null>(null)

  const statOptions = useStatz ? STATZ_TREND_STATS : FALLBACK_TREND_STATS
  const activeStat = statOptions.some((s) => s.id === stat) ? stat : 'runs'

  const pool = useMemo(() => {
    if (useStatz && statzRows) {
      return statzRows.map((r) => ({
        key: `${r.dateLabel}-${r.team}-${r.oppo}-${r.runs}`,
        date: r.isoDate ?? '',
        dateLabel: r.dateLabel,
        team: r.team ?? '—',
        comp: r.comp ?? '—',
        oppo: r.oppo ?? '—',
        homeAway: r.homeAway ?? '',
        year: (r.isoDate ?? '').slice(0, 4),
        value: statzTrendValue(r, activeStat),
        title: `${r.dateLabel} · ${r.team ?? ''} vs ${r.oppo ?? ''} · ${activeStat.toUpperCase()} ${fmtNum(statzTrendValue(r, activeStat))}`,
      }))
    }
    return fallbackRows.map((r) => ({
      key: String(r.id),
      date: r.matchDate ?? '',
      dateLabel: r.matchDate ? r.matchDate.slice(0, 10) : '—',
      team: r.teamName ?? '—',
      comp: r.competitionId ?? '—',
      oppo: r.opponent ?? '—',
      homeAway: '',
      year: (r.matchDate ?? '').slice(0, 4),
      value: fallbackTrendValue(r, activeStat),
      title: `${r.matchDate ?? ''} · ${activeStat.toUpperCase()} ${fmtNum(fallbackTrendValue(r, activeStat))}`,
    }))
  }, [useStatz, statzRows, fallbackRows, activeStat])

  const teams = useMemo(() => [...new Set(pool.map((p) => p.team))].sort(), [pool])
  const comps = useMemo(() => [...new Set(pool.map((p) => p.comp))].sort(), [pool])
  const oppos = useMemo(() => [...new Set(pool.map((p) => p.oppo))].sort(), [pool])
  const years = useMemo(
    () => [...new Set(pool.map((p) => p.year).filter((y) => /^\d{4}$/.test(y)))].sort((a, b) => b.localeCompare(a)),
    [pool],
  )
  const hasHomeAway = useMemo(() => pool.some((p) => p.homeAway === 'H' || p.homeAway === 'A'), [pool])

  const bars = useMemo(() => {
    const sorted = [...pool].sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date)
      if (a.date && !b.date) return -1
      if (!a.date && b.date) return 1
      return 0
    })
    const filtered = sorted.filter(
      (p) =>
        (team === 'all' || p.team === team) &&
        (comp === 'all' || p.comp === comp) &&
        (period === 'all' || p.year === period) &&
        (opposition === 'all' || p.oppo === opposition) &&
        (!hasHomeAway || homeAway === 'all' || p.homeAway === homeAway),
    )
    const limit = games === 'all' ? filtered.length : parseInt(games, 10)
    return filtered.slice(0, Number.isFinite(limit) ? limit : filtered.length)
  }, [pool, team, comp, period, opposition, homeAway, hasHomeAway, games])

  const mean = bars.length > 0 ? bars.reduce((s, b) => s + b.value, 0) / bars.length : 0
  const median = (() => {
    if (bars.length === 0) return 0
    const sorted = bars.map((b) => b.value).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  })()
  const ref = refOverride ?? mean
  const max = Math.max(0, ...bars.map((b) => b.value), ref, mean, median)
  const over = bars.filter((b) => b.value > ref + 1e-9).length
  const below = bars.filter((b) => b.value < ref - 1e-9).length
  const onLine = bars.length - over - below
  // Reference line always moves in 0.5 steps and never drops below 0.
  const step = 0.5

  function select(label: string, value: string, onChange: (v: string) => void, options: string[], allLabel: string) {
    return (
      <label className="mt-filter">
        <span>{label}</span>
        <select className="ph-input ph-input-sm" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          <option value="all">{allLabel}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <section className="ph-card">
      <div className="ph-card-head">
        <h2 className="ph-card-title">Trend · {activeStat.toUpperCase()}</h2>
        <span className="ph-result-count">
          Last {bars.length} · {formatLabel}
        </span>
      </div>
      <div className="mt-filters">
        <label className="mt-filter">
          <span>Stat</span>
          <select
            className="ph-input ph-input-sm"
            value={activeStat}
            onChange={(e) => {
              setStat(e.target.value as TrendStatId)
              setRefOverride(null)
            }}
            aria-label="Trend stat"
          >
            {statOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {select('Team', team, setTeam, teams, 'All')}
        {select('Competition', comp, setComp, comps, useStatz ? 'All T20' : 'All')}
        {years.length > 1 && select('Period', period, setPeriod, years, 'All')}
        <label className="mt-filter">
          <span>Games</span>
          <select className="ph-input ph-input-sm" value={games} onChange={(e) => setGames(e.target.value)} aria-label="Games">
            {['10', '15', '30', '50'].map((g) => (
              <option key={g} value={g}>
                Last {g}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </label>
        {hasHomeAway && (
          <label className="mt-filter">
            <span>Home or away</span>
            <select className="ph-input ph-input-sm" value={homeAway} onChange={(e) => setHomeAway(e.target.value)} aria-label="Home or away">
              <option value="all">All</option>
              <option value="H">Home</option>
              <option value="A">Away</option>
            </select>
          </label>
        )}
        {select('Opposition', opposition, setOpposition, oppos, 'All')}
        <span className="mt-ref">
          <span className="mt-ref-label">Ref line</span>
          <button type="button" className="ph-btn ph-btn-ghost ph-btn-sm" onClick={() => setRefOverride((v) => Math.max(0, (v ?? mean) - step))} aria-label="Decrease reference line">−</button>
          <input
            className="ph-input ph-input-sm mt-ref-input"
            type="number"
            min="0"
            step={step}
            value={refOverride ?? Math.round(mean * 100) / 100}
            onChange={(e) => {
              const n = Number(e.target.value)
              setRefOverride(Number.isFinite(n) ? Math.max(0, n) : null)
            }}
            aria-label="Reference line value"
          />
          <button type="button" className="ph-btn ph-btn-ghost ph-btn-sm" onClick={() => setRefOverride((v) => (v ?? mean) + step)} aria-label="Increase reference line">+</button>
        </span>
      </div>
      <div className="mt-legend" aria-label="Chart lines legend">
        <span className="mt-legend-item"><span className="mt-swatch mt-swatch-mean" />Mean {fmtNum(mean)}</span>
        <span className="mt-legend-item"><span className="mt-swatch mt-swatch-median" />Median {fmtNum(median)}</span>
        <span className="mt-legend-item"><span className="mt-swatch mt-swatch-ref" />Ref {fmtNum(ref)}</span>
      </div>
      {fallbackLoading && !useStatz ? (
        <p className="ph-muted">Loading match data…</p>
      ) : bars.length === 0 ? (
        <div className="ph-empty">
          <div className="ph-empty-title">No trend data yet</div>
          <p className="ph-muted">
            {useStatz
              ? 'No innings match the current filters.'
              : 'Link a dataset PlayerID (Mappings tab) or import performances to populate the trend.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-chart" role="img" aria-label={`${activeStat} trend bar chart`}>
            <div className="mt-bars">
              {bars.map((b) => (
                <div key={b.key} className="mt-bar" title={b.title}>
                  <span className="mt-bar-value">{fmtNum(b.value)}</span>
                  <div
                    className={`mt-bar-column${b.value >= ref ? ' mt-bar-column--over' : ''}`}
                    style={{ height: `${max > 0 ? Math.max(4, (b.value / max) * 100) : 4}%` }}
                  />
                  <span className="mt-bar-team">{b.team.slice(0, 3).toUpperCase()}</span>
                </div>
              ))}
            </div>
            {max > 0 && (
              <div className="mt-chart-lines" aria-hidden="true">
                <div
                  className="mt-meanline"
                  style={{ bottom: `calc(${(mean / max) * 100}% + 1.4rem)` }}
                  title={`Mean ${fmtNum(mean)}`}
                />
                <div
                  className="mt-medianline"
                  style={{ bottom: `calc(${(median / max) * 100}% + 1.4rem)` }}
                  title={`Median ${fmtNum(median)}`}
                />
                <div
                  className="mt-refline"
                  style={{ bottom: `calc(${(ref / max) * 100}% + 1.4rem)` }}
                  title={`Reference ${fmtNum(ref)}`}
                />
              </div>
            )}
          </div>
          <p className="ph-hint">
            Newest on the left · {over} above · {below} below · {bars.length} innings
            {onLine > 0 && ` · ${onLine} on the line`}
            {!useStatz && ' · dataset view (Statz feed unavailable)'}
          </p>
        </>
      )}
    </section>
  )
}
function MatchDataCard({
  statzRows,
  statzLoading,
  statzError,
  fallbackRows,
  fallbackLoading,
  useStatz,
  formatLabel,
}: {
  statzRows: StatzMatchRow[] | null
  statzLoading: boolean
  statzError: string | null
  fallbackRows: PerfRow[]
  fallbackLoading: boolean
  useStatz: boolean
  formatLabel: string
}) {
  const [view, setView] = useState<'batting' | 'bowling'>('batting')

  const tiles = useMemo(() => {
    if (!useStatz || !statzRows) return null
    const batInnings = statzRows.filter((r) => !r.dnb)
    const runs = batInnings.reduce((s, r) => s + (r.runs ?? 0), 0)
    const balls = batInnings.reduce((s, r) => s + (r.balls ?? 0), 0)
    const fours = batInnings.reduce((s, r) => s + (r.fours ?? 0), 0)
    const sixes = batInnings.reduce((s, r) => s + (r.sixes ?? 0), 0)
    const fifties = batInnings.filter((r) => (r.runs ?? 0) >= 50).length
    const bowlInnings = statzRows.filter((r) => (r.wickets ?? 0) > 0 || r.overs != null)
    const wkts = statzRows.reduce((s, r) => s + (r.wickets ?? 0), 0)
    const dots = statzRows.reduce((s, r) => s + (r.dots ?? 0), 0)
    const econRows = statzRows.filter((r) => r.economy != null)
    return {
      batInnings: batInnings.length,
      runsPerMatch: batInnings.length ? runs / batInnings.length : 0,
      sr: balls > 0 ? (runs / balls) * 100 : 0,
      foursPerMatch: batInnings.length ? fours / batInnings.length : 0,
      sixesPerMatch: batInnings.length ? sixes / batInnings.length : 0,
      fifties,
      hundreds: batInnings.filter((r) => (r.runs ?? 0) >= 100).length,
      wktsPerMatch: bowlInnings.length ? wkts / bowlInnings.length : 0,
      econAvg: econRows.length
        ? econRows.reduce((s, r) => s + (r.economy ?? 0), 0) / econRows.length
        : 0,
      dotsPerMatch: statzRows.length ? dots / statzRows.length : 0,
      threeW: statzRows.filter((r) => (r.wickets ?? 0) >= 3).length,
    }
  }, [useStatz, statzRows])

  function resultClass(result: string | null): string {
    const r = (result ?? '').toLowerCase()
    if (r.startsWith('won')) return 'md-result-won'
    if (r.startsWith('lost')) return 'md-result-lost'
    return ''
  }

  return (
    <section className="ph-card md-card">
      <div className="ph-card-head">
        <h2 className="ph-card-title">Match data</h2>
        <span className="ph-result-count">
          {useStatz ? `T20 · ${statzRows?.length ?? 0} MATCHES` : `${formatLabel} · ${fallbackRows.length} innings`}
        </span>
      </div>

      {useStatz && statzRows ? (
        <>
          <div className="md-tabs" role="tablist" aria-label="Match data view">
            {(['batting', 'bowling'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`md-tab${view === v ? ' md-tab-active' : ''}`}
                onClick={() => setView(v)}
              >
                {v === 'batting' ? 'Batting' : 'Bowling'}
              </button>
            ))}
          </div>
          {tiles && view === 'batting' && (
            <div className="md-tiles">
              <div className="md-tile"><span className="md-tile-label">Runs / match</span><span className="md-tile-value">{fmtNum(tiles.runsPerMatch, 1)}</span><span className="md-tile-sub">{tiles.batInnings} inns</span></div>
              <div className="md-tile"><span className="md-tile-label">SR</span><span className="md-tile-value">{fmtNum(tiles.sr, 1)}</span></div>
              <div className="md-tile"><span className="md-tile-label">4s / match</span><span className="md-tile-value">{fmtNum(tiles.foursPerMatch, 1)}</span></div>
              <div className="md-tile"><span className="md-tile-label">6s / match</span><span className="md-tile-value">{fmtNum(tiles.sixesPerMatch, 1)}</span></div>
              <div className="md-tile"><span className="md-tile-label">50+</span><span className="md-tile-value">{tiles.fifties}</span><span className="md-tile-sub">of {tiles.batInnings}</span></div>
            </div>
          )}
          {tiles && view === 'bowling' && (
            <div className="md-tiles">
              <div className="md-tile"><span className="md-tile-label">Wkts / match</span><span className="md-tile-value">{fmtNum(tiles.wktsPerMatch, 1)}</span></div>
              <div className="md-tile"><span className="md-tile-label">Econ</span><span className="md-tile-value">{fmtNum(tiles.econAvg)}</span></div>
              <div className="md-tile"><span className="md-tile-label">Dots / match</span><span className="md-tile-value">{fmtNum(tiles.dotsPerMatch, 1)}</span></div>
              <div className="md-tile"><span className="md-tile-label">3W+</span><span className="md-tile-value">{tiles.threeW}</span></div>
            </div>
          )}
          <div className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Oppo</th>
                  <th>Comp</th>
                  <th>H/A</th>
                  <th>Venue</th>
                  <th>Result</th>
                  {view === 'batting' ? (
                    <>
                      <th className="md-num">Runs</th>
                      <th className="md-num">Balls</th>
                      <th className="md-num">4s</th>
                      <th className="md-num">6s</th>
                      <th className="md-num">SR</th>
                    </>
                  ) : (
                    <>
                      <th className="md-num">Wkts</th>
                      <th className="md-num">R</th>
                      <th className="md-num">Overs</th>
                      <th className="md-num">Econ</th>
                      <th className="md-num">Dots</th>
                    </>
                  )}
                  <th>Scoreline</th>
                </tr>
              </thead>
              <tbody>
                {statzRows.map((r, i) => (
                  <tr key={`${r.dateLabel}-${r.team}-${r.oppo}-${i}`}>
                    <td className="md-nowrap">{r.dateLabel}</td>
                    <td className="md-em">{r.team ?? '—'}</td>
                    <td className="md-em">{r.oppo ?? '—'}</td>
                    <td>{r.comp ?? '—'}</td>
                    <td>{r.homeAway ?? '—'}</td>
                    <td className="md-truncate" title={r.venue ?? ''}>{r.venue ?? '—'}</td>
                    <td className={resultClass(r.result)}>{r.result ?? '—'}</td>
                    {view === 'batting' ? (
                      <>
                        <td className="md-num md-em">
                          {r.dnb ? '–' : `${r.runs ?? '—'}${r.notOut ? '*' : ''}`}
                        </td>
                        <td className="md-num">{r.dnb ? '–' : (r.balls ?? '—')}</td>
                        <td className="md-num">{r.dnb ? '–' : (r.fours ?? '—')}</td>
                        <td className="md-num">{r.dnb ? '–' : (r.sixes ?? '—')}</td>
                        <td className="md-num">{r.dnb ? '–' : r.strikeRate != null ? fmtNum(r.strikeRate, 1) : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="md-num md-em">{r.wickets ?? '–'}</td>
                        <td className="md-num">{r.bowlRuns ?? '–'}</td>
                        <td className="md-num">{r.overs ?? '–'}</td>
                        <td className="md-num">{r.economy ?? '–'}</td>
                        <td className="md-num">{r.dots ?? '–'}</td>
                      </>
                    )}
                    <td className="md-truncate md-scoreline" title={r.scoreline ?? ''}>{r.scoreline ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ph-hint">Newest first · T20 feed via Statz (numbers only).</p>
        </>
      ) : (
        <>
          {statzLoading && <p className="ph-muted">Loading Statz feed…</p>}
          {!statzLoading && statzError && (
            <p className="ph-hint">Statz feed unavailable ({statzError}) — showing dataset rows.</p>
          )}
          {!statzLoading && !statzError && formatLabel !== 'All' && formatLabel !== 'T20' && (
            <p className="ph-hint">Non-T20 view — showing best-available T20 dataset rows.</p>
          )}
          {fallbackLoading ? (
            <p className="ph-muted">Loading match data…</p>
          ) : fallbackRows.length === 0 ? (
            <div className="ph-empty">
              <div className="ph-empty-title">No match data yet</div>
              <p className="ph-muted">
                Link a dataset PlayerID (Mappings tab) or import performances to populate this table.
              </p>
            </div>
          ) : (
            <div className="md-table-wrap">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Team</th>
                    <th>Oppo</th>
                    <th>Comp</th>
                    <th className="md-num">Runs</th>
                    <th className="md-num">Balls</th>
                    <th className="md-num">Wkts</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbackRows.map((r) => (
                    <tr key={r.id}>
                      <td className="md-nowrap">{r.matchDate ? r.matchDate.slice(0, 10) : '—'}</td>
                      <td className="md-em">{r.teamName ?? '—'}</td>
                      <td className="md-em">{r.opponent ?? '—'}</td>
                      <td>{r.competitionId ?? '—'}</td>
                      <td className="md-num md-em">{r.batRuns ?? '—'}</td>
                      <td className="md-num">{r.batBalls ?? '—'}</td>
                      <td className="md-num">{r.bowlWickets ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function TournamentRanksCard({
  rankSummary,
  hasSquadContext,
}: {
  rankSummary: ReturnType<typeof computePlayerTournamentRankSummary>
  hasSquadContext: boolean
}) {
  if (!rankSummary) {
    return (
      <section className="ph-card">
        <h2 className="ph-card-title">Tournament ranks</h2>
        <div className="ph-empty">
          <div className="ph-empty-title">No tournament ranks yet</div>
          <p className="ph-muted">
            {hasSquadContext
              ? 'Rank this player against drafted squads once tournament squads are loaded.'
              : 'Open this player from a squad team to rank them against the tournament field.'}
          </p>
        </div>
      </section>
    )
  }
  const batRows: [string, { rank: number; of: number }][] = [
    ['Batting rating', rankSummary.batting.wholeTournament.batRating],
    ['Expected runs', rankSummary.batting.wholeTournament.btCaz],
    ['Strike rate', rankSummary.batting.wholeTournament.srCaz],
  ].filter((e): e is [string, { rank: number; of: number }] => Boolean(e[1]))
  const bowlRows: [string, { rank: number; of: number }][] = [
    ['Bowling rating', rankSummary.bowling.wholeTournament.bowlRating],
    ['Bowling avg', rankSummary.bowling.wholeTournament.bowlAvg],
    ['Economy', rankSummary.bowling.wholeTournament.econ],
    ['Balls / wicket', rankSummary.bowling.wholeTournament.bowlBpw],
  ].filter((e): e is [string, { rank: number; of: number }] => Boolean(e[1]))
  return (
    <section className="ph-card">
      <h2 className="ph-card-title">Tournament ranks</h2>
      {batRows.length === 0 && bowlRows.length === 0 ? (
        <p className="ph-muted">No rankable metrics for this player in the current tournament.</p>
      ) : (
        <div className="ph-stat-grid">
          {batRows.map(([label, r]) => (
            <div key={label} className="ph-stat-box">
              <span className="ph-stat-label">{label}</span>
              <span className="ph-stat-value">
                #{r.rank} <span className="ph-muted">of {r.of}</span>
              </span>
            </div>
          ))}
          {bowlRows.map(([label, r]) => (
            <div key={label} className="ph-stat-box">
              <span className="ph-stat-label">{label}</span>
              <span className="ph-stat-value">
                #{r.rank} <span className="ph-muted">of {r.of}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {rankSummary.batting.sameRole && (
        <p className="ph-hint">Same-role group: {rankSummary.roleLabel}.</p>
      )}
    </section>
  )
}

function RecordsCard({
  bat,
  bowl,
}: {
  bat: PlayerProfile['careerBatting']
  bowl: PlayerProfile['careerBowling']
}) {
  return (
    <section className="ph-card">
      <h2 className="ph-card-title">Records</h2>
      <div className="ph-stat-grid">
        <div className="ph-stat-box">
          <span className="ph-stat-label">High score</span>
          <span className="ph-stat-value">{bat.highScore || '—'}</span>
        </div>
        <div className="ph-stat-box">
          <span className="ph-stat-label">Hundreds</span>
          <span className="ph-stat-value">{bat.hundreds}</span>
        </div>
        <div className="ph-stat-box">
          <span className="ph-stat-label">Fifties</span>
          <span className="ph-stat-value">{bat.fifties}</span>
        </div>
        <div className="ph-stat-box">
          <span className="ph-stat-label">Best bowling</span>
          <span className="ph-stat-value">{bowl.bestFigures || '—'}</span>
        </div>
        <div className="ph-stat-box">
          <span className="ph-stat-label">Five-wicket hauls</span>
          <span className="ph-stat-value">{bowl.fiveWickets}</span>
        </div>
        <div className="ph-stat-box">
          <span className="ph-stat-label">Career wickets</span>
          <span className="ph-stat-value">{bowl.wickets}</span>
        </div>
      </div>
      <p className="ph-hint">Full records module (tournament bests, milestones) — placeholder.</p>
    </section>
  )
}

function BioEditorForm({ playerName, countryFallback }: { playerName: string; countryFallback: string }) {
  const current = getEffectiveBio(playerName, countryFallback)
  const [draft, setDraft] = useState({
    fullName: current.fullName,
    dob: current.dob,
    nationality: current.nationality,
    battingStyle: current.battingStyle,
    bowlingStyle: current.bowlingStyle,
    playingRole: current.playingRole,
    bio: current.bio,
  })

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  return (
    <form
      className="ph-bio-form"
      onSubmit={(e) => {
        e.preventDefault()
        savePlayerBio(playerName, {
          fullName: draft.fullName.trim() || playerName,
          dob: draft.dob,
          nationality: draft.nationality.trim(),
          battingStyle: draft.battingStyle,
          bowlingStyle: draft.bowlingStyle,
          playingRole: draft.playingRole,
          bio: draft.bio,
        })
      }}
    >
      <label className="ph-field">
        <span>Full name</span>
        <input
          className="ph-input"
          value={draft.fullName}
          onChange={(e) => set('fullName', e.target.value)}
        />
      </label>
      <label className="ph-field">
        <span>Date of birth</span>
        <input
          type="date"
          className="ph-input"
          value={draft.dob}
          onChange={(e) => set('dob', e.target.value)}
        />
      </label>
      <label className="ph-field">
        <span>Nationality</span>
        <input
          className="ph-input"
          placeholder="Country"
          value={draft.nationality}
          onChange={(e) => set('nationality', e.target.value)}
        />
      </label>
      <label className="ph-field">
        <span>Batting style</span>
        <select
          className="ph-input"
          value={draft.battingStyle}
          onChange={(e) => set('battingStyle', e.target.value)}
        >
          {BATTING_STYLE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label className="ph-field">
        <span>Bowling style</span>
        <select
          className="ph-input"
          value={draft.bowlingStyle}
          onChange={(e) => set('bowlingStyle', e.target.value)}
        >
          {BOWLING_STYLE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label className="ph-field">
        <span>Playing role</span>
        <select
          className="ph-input"
          value={draft.playingRole}
          onChange={(e) => set('playingRole', e.target.value)}
        >
          {PLAYING_ROLE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label className="ph-field ph-field-wide">
        <span>Biography</span>
        <textarea
          className="ph-input ph-textarea"
          rows={4}
          placeholder="Short player biography…"
          value={draft.bio}
          onChange={(e) => set('bio', e.target.value)}
        />
      </label>
      <div className="ph-form-actions">
        <button type="submit" className="ph-btn">
          Save bio
        </button>
      </div>
    </form>
  )
}