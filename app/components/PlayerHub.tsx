'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  FORMATS,
  GENDERS,
  getAllTournamentEntries,
  type CricketFormat,
  type Gender,
} from '../data/tournaments'
import { getTeamsByTournament } from '../data/teams'
import {
  getSquadForTeam,
  getStoredSquad,
  getSquadStoreVersion,
  getTeamBatRatingTotal,
  getTeamBowlRatingTotal,
  getTournamentPrepProgress,
  subscribeSquadStore,
} from '../data/squadStore'
import { getTeamLogo } from '../data/logoStore'
import {
  getEffectiveBio,
  getPlayerBioStoreVersion,
  subscribePlayerBioStore,
} from '../data/playerBioStore'
import { useTournamentOptions } from '../hooks/useTournamentOptions'
import PlayerFullProfile, { type HubPlayerTeamRef } from './PlayerFullProfile'
import HubTeamProfile from './HubTeamProfile'

type HubRoute =
  | { view: 'leagues' }
  | { view: 'teams'; tournamentId: string }
  | { view: 'team'; tournamentId: string; teamId: string }
  | { view: 'player'; tournamentId: string | null; teamId: string | null; playerName: string }

function formatLabel(format: CricketFormat): string {
  return FORMATS.find((f) => f.key === format)?.label ?? format
}

function genderLabel(gender: Gender): string {
  return GENDERS.find((g) => g.key === gender)?.label ?? gender
}

function tournamentLabel(tournamentId: string): string {
  for (const e of getAllTournamentEntries()) {
    if (e.tournament.id === tournamentId) return e.tournament.name
  }
  return tournamentId
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase()
  return `${parts[0]?.charAt(0) ?? ''}${parts[parts.length - 1]?.charAt(0) ?? ''}`.toUpperCase()
}

function isPlaceholderName(name: string): boolean {
  return /^player \d+$/i.test(name.trim())
}

export default function PlayerHub({ onOpenLayoutBoard }: { onOpenLayoutBoard?: () => void } = {}) {
  const [route, setRoute] = useState<HubRoute>({ view: 'leagues' })
  const [leagueQuery, setLeagueQuery] = useState('')
  const [teamQuery, setTeamQuery] = useState('')
  const [playerQuery, setPlayerQuery] = useState('')

  const squadVersion = useSyncExternalStore(
    subscribeSquadStore,
    getSquadStoreVersion,
    getSquadStoreVersion,
  )
  void squadVersion

  const leagueEntries = useMemo(() => {
    const withTeams = getAllTournamentEntries().filter(
      (e) => (getTeamsByTournament(e.tournament.id).length ?? 0) > 0,
    )
    const q = leagueQuery.trim().toLowerCase()
    const filtered = q
      ? withTeams.filter(
          (e) =>
            e.tournament.name.toLowerCase().includes(q) ||
            (e.tournament.country?.toLowerCase().includes(q) ?? false),
        )
      : withTeams
    return [...filtered].sort((a, b) => a.tournament.name.localeCompare(b.tournament.name))
  }, [leagueQuery])

  if (route.view === 'player') {
    return (
      <HubPlayerRoute
        route={route}
        onBack={() =>
          setRoute(
            route.teamId && route.tournamentId
              ? { view: 'team', tournamentId: route.tournamentId, teamId: route.teamId }
              : { view: 'leagues' },
          )
        }
        onOpenTeam={(teamId, tournamentId) => {
          setPlayerQuery('')
          setRoute({ view: 'team', tournamentId, teamId })
        }}
      />
    )
  }

  if (route.view === 'team') {
    return (
      <HubTeamProfile
        tournamentId={route.tournamentId}
        teamId={route.teamId}
        playerQuery={playerQuery}
        onPlayerQuery={setPlayerQuery}
        onBack={() => setRoute({ view: 'teams', tournamentId: route.tournamentId })}
        onBackToLeagues={() => setRoute({ view: 'leagues' })}
        onOpenTeam={(nextTeamId, nextTournamentId) => {
          setPlayerQuery('')
          setRoute({ view: 'team', tournamentId: nextTournamentId, teamId: nextTeamId })
        }}
        onOpenPlayer={(playerName) => {
          setPlayerQuery('')
          setRoute({
            view: 'player',
            tournamentId: route.tournamentId,
            teamId: route.teamId,
            playerName,
          })
        }}
      />
    )
  }

  if (route.view === 'teams') {
    const entry = getAllTournamentEntries().find((e) => e.tournament.id === route.tournamentId)
    return (
      <div className="ph-hub">
        <HubCrumbs
          trail={[
            { label: 'Leagues', onClick: () => setRoute({ view: 'leagues' }) },
            { label: entry?.tournament.name ?? route.tournamentId },
          ]}
          onBack={() => setRoute({ view: 'leagues' })}
        />
        <div className="ph-hub-head">
          <div>
            <h2 className="ph-hub-title">{entry?.tournament.name ?? route.tournamentId}</h2>
            <p className="ph-muted">
              {entry ? `${formatLabel(entry.format)} · ${genderLabel(entry.gender)}` : ''}
              {entry?.tournament.country ? ` · ${entry.tournament.country}` : ''} — pick a team
              to open that side’s stats profile.
            </p>
          </div>
          <input
            type="search"
            className="ph-input ph-search"
            placeholder="Search teams…"
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
          />
        </div>
        <HubTeamsGrid
          tournamentId={route.tournamentId}
          query={teamQuery}
          onOpenTeam={(teamId) => {
            setTeamQuery('')
            setRoute({ view: 'team', tournamentId: route.tournamentId, teamId })
          }}
        />
      </div>
    )
  }

  return (
    <div className="ph-hub">
      <div className="ph-hub-head">
        <div>
          <h2 className="ph-hub-title">Player and team search</h2>
          <p className="ph-muted">
            Search players or teams directly with the quick finder, or drill down through
            the leagues below for full squads and profiles.
          </p>
        </div>
        {onOpenLayoutBoard && (
          <button type="button" className="ph-btn" onClick={onOpenLayoutBoard}>
            Open Layout Board
          </button>
        )}
      </div>
      <HubQuickFinder
        onOpenTeam={(teamId, tournamentId) => {
          setTeamQuery('')
          setRoute({ view: 'team', tournamentId, teamId })
        }}
        onOpenPlayer={(playerName, teamId, tournamentId) => {
          setPlayerQuery('')
          setRoute({ view: 'player', tournamentId, teamId, playerName })
        }}
      />
      <div className="ph-hub-head">
        <div>
          <h2 className="ph-hub-title">Browse leagues</h2>
          <p className="ph-muted">
            Leagues → teams → players. Open a league to browse its teams, then a team to
            browse its squad and full-screen player profiles.
          </p>
        </div>
        <input
          type="search"
          className="ph-input ph-search"
          placeholder="Search leagues…"
          value={leagueQuery}
          onChange={(e) => setLeagueQuery(e.target.value)}
        />
      </div>
      {leagueEntries.length === 0 ? (
        <div className="ph-empty">
          <div className="ph-empty-title">No leagues found</div>
          <p className="ph-muted">Try a different search.</p>
        </div>
      ) : (
        <div className="ph-card-grid">
          {leagueEntries.map((e) => {
            const teams = getTeamsByTournament(e.tournament.id)
            const prep = getTournamentPrepProgress(e.tournament.id)
            return (
              <button
                key={`${e.format}-${e.gender}-${e.tournament.id}`}
                type="button"
                className="ph-entity-card"
                onClick={() => {
                  setTeamQuery('')
                  setRoute({ view: 'teams', tournamentId: e.tournament.id })
                }}
              >
                <span className="ph-entity-badge">{initialsFor(e.tournament.name)}</span>
                <span className="ph-entity-name">{e.tournament.name}</span>
                <span className="ph-entity-meta">
                  {formatLabel(e.format)} · {genderLabel(e.gender)}
                  {e.tournament.country ? ` · ${e.tournament.country}` : ''}
                </span>
                <span className="ph-entity-sub">
                  {teams.length} teams · {prep.prepped}/{prep.total} prepped
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const FINDER_NO_COUNTRY = 'International'
const FINDER_MAX_RESULTS = 60

interface FinderTeamRef {
  teamId: string
  teamName: string
  tournamentId: string
  tournamentName: string
  country: string
  playerCount: number
  logo: string | null
}

interface FinderPlayerRef {
  name: string
  teams: FinderTeamRef[]
  role: string
  nationality: string
}

function finderCountryForTournament(country: string | undefined): string {
  const trimmed = (country ?? '').trim()
  return trimmed === '' ? FINDER_NO_COUNTRY : trimmed
}

function HubQuickFinder({
  onOpenTeam,
  onOpenPlayer,
}: {
  onOpenTeam: (teamId: string, tournamentId: string) => void
  onOpenPlayer: (playerName: string, teamId: string | null, tournamentId: string | null) => void
}) {
  const [finderPlayerQuery, setFinderPlayerQuery] = useState('')
  const [finderPlayerCountry, setFinderPlayerCountry] = useState('')
  const [finderPlayerTeamId, setFinderPlayerTeamId] = useState('')
  const [finderTeamQuery, setFinderTeamQuery] = useState('')
  const [finderTeamCountry, setFinderTeamCountry] = useState('')

  const squadVersion = useSyncExternalStore(
    subscribeSquadStore,
    getSquadStoreVersion,
    getSquadStoreVersion,
  )
  void squadVersion
  const bioVersion = useSyncExternalStore(
    subscribePlayerBioStore,
    getPlayerBioStoreVersion,
    getPlayerBioStoreVersion,
  )
  void bioVersion

  const finderEntries = useMemo(
    () =>
      getAllTournamentEntries().filter(
        (e) => (getTeamsByTournament(e.tournament.id).length ?? 0) > 0,
      ),
    [],
  )

  const finderCountries = useMemo(() => {
    const seen = new Set<string>()
    for (const e of finderEntries) {
      seen.add(finderCountryForTournament(e.tournament.country))
      for (const t of getTeamsByTournament(e.tournament.id)) {
        if (t.country && t.country.trim() !== '') seen.add(t.country.trim())
      }
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [finderEntries])

  const finderTeams = useMemo<FinderTeamRef[]>(() => {
    const out: FinderTeamRef[] = []
    for (const e of finderEntries) {
      const leagueCountry = finderCountryForTournament(e.tournament.country)
      for (const t of getTeamsByTournament(e.tournament.id)) {
        const country = (t.country && t.country.trim() !== '') ? t.country.trim() : leagueCountry
        let playerCount = 0
        try {
          const squad = getSquadForTeam(t.id)
          playerCount = squad.startingXI.length + squad.reserves.length + squad.impactSubs.length
        } catch {
          playerCount = 0
        }
        out.push({
          teamId: t.id,
          teamName: t.name,
          tournamentId: e.tournament.id,
          tournamentName: e.tournament.name,
          country,
          playerCount,
          logo: getTeamLogo(t.id) ?? t.logo ?? null,
        })
      }
    }
    return out.sort((a, b) => a.teamName.localeCompare(b.teamName))
  }, [finderEntries, squadVersion])

  const finderPlayers = useMemo<FinderPlayerRef[]>(() => {
    const byName = new Map<string, FinderPlayerRef>()
    for (const t of finderTeams) {
      let names: string[] = []
      try {
        const squad = getSquadForTeam(t.teamId)
        names = [...squad.startingXI, ...squad.reserves, ...squad.impactSubs]
          .map((p) => p.name)
          .filter((n) => n.trim() !== '' && !isPlaceholderName(n))
      } catch {
        continue
      }
      for (const rawName of names) {
        const name = rawName.trim()
        const key = name.toLowerCase()
        const existing = byName.get(key)
        if (existing) {
          if (!existing.teams.some((x) => x.teamId === t.teamId)) existing.teams.push(t)
        } else {
          const bio = getEffectiveBio(name)
          byName.set(key, {
            name,
            teams: [t],
            role: bio.playingRole !== 'Unknown' ? bio.playingRole : '',
            nationality: bio.nationality,
          })
        }
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [finderTeams, bioVersion])

  const finderPlayerTeamOptions = useMemo(
    () =>
      finderPlayerCountry === ''
        ? finderTeams
        : finderTeams.filter((t) => t.country === finderPlayerCountry),
    [finderTeams, finderPlayerCountry],
  )
  const effectiveFinderTeamId = finderPlayerTeamOptions.some(
    (t) => t.teamId === finderPlayerTeamId,
  )
    ? finderPlayerTeamId
    : ''

  const finderPlayerResults = useMemo(() => {
    const q = finderPlayerQuery.trim().toLowerCase()
    return finderPlayers.filter((p) => {
      if (effectiveFinderTeamId !== '') {
        if (!p.teams.some((t) => t.teamId === effectiveFinderTeamId)) return false
      } else if (finderPlayerCountry !== '') {
        if (!p.teams.some((t) => t.country === finderPlayerCountry)) return false
      }
      if (q !== '' && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [finderPlayers, finderPlayerQuery, finderPlayerCountry, effectiveFinderTeamId])

  const finderTeamResults = useMemo(() => {
    const q = finderTeamQuery.trim().toLowerCase()
    const filtered = finderTeams.filter((t) => {
      if (finderTeamCountry !== '' && t.country !== finderTeamCountry) return false
      if (q !== '' && !t.teamName.toLowerCase().includes(q)) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      const aNat = a.teamName === a.country ? 0 : 1
      const bNat = b.teamName === b.country ? 0 : 1
      if (aNat !== bNat) return aNat - bNat
      if (q !== '') {
        const aExact = a.teamName.toLowerCase() === q ? 0 : 1
        const bExact = b.teamName.toLowerCase() === q ? 0 : 1
        if (aExact !== bExact) return aExact - bExact
      }
      return a.teamName.localeCompare(b.teamName) || a.tournamentName.localeCompare(b.tournamentName)
    })
  }, [finderTeams, finderTeamQuery, finderTeamCountry])

  const playerFiltersActive =
    finderPlayerQuery.trim() !== '' || finderPlayerCountry !== '' || finderPlayerTeamId !== ''
  const teamFiltersActive = finderTeamQuery.trim() !== '' || finderTeamCountry !== ''

  return (
    <div className="ph-finder-grid">
      <section className="ph-card" aria-label="Search players">
        <h3 className="ph-card-title">Search Players</h3>
        <p className="ph-muted">
          Country → team → player. Pick a player to open the full-screen profile.
        </p>
        <input
          type="search"
          className="ph-input ph-finder-search"
          placeholder="Search players…"
          value={finderPlayerQuery}
          onChange={(e) => setFinderPlayerQuery(e.target.value)}
          aria-label="Search players by name"
        />
        <div className="ph-filter-row">
          <label className="ph-filter-label">
            <span>Country</span>
            <select
              className="ph-input"
              value={finderPlayerCountry}
              onChange={(e) => {
                setFinderPlayerCountry(e.target.value)
                setFinderPlayerTeamId('')
              }}
              aria-label="Filter players by country"
            >
              <option value="">All countries</option>
              {finderCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="ph-filter-label">
            <span>Team</span>
            <select
              className="ph-input"
              value={effectiveFinderTeamId}
              onChange={(e) => setFinderPlayerTeamId(e.target.value)}
              aria-label="Filter players by team"
            >
              <option value="">All teams</option>
              {finderPlayerTeamOptions.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName} ({t.tournamentName})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ph-result-count-row">
          <span className="ph-result-count">
            {finderPlayerResults.length === 0
              ? 'No players found'
              : `Showing ${Math.min(finderPlayerResults.length, FINDER_MAX_RESULTS)} of ${finderPlayerResults.length} player${finderPlayerResults.length === 1 ? '' : 's'}`}
          </span>
          {playerFiltersActive ? (
            <button
              type="button"
              className="ph-btn ph-btn-ghost ph-btn-sm"
              onClick={() => {
                setFinderPlayerQuery('')
                setFinderPlayerCountry('')
                setFinderPlayerTeamId('')
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        {finderPlayerResults.length === 0 ? (
          <div className="ph-empty">
            <div className="ph-empty-title">No players match these filters</div>
            <p className="ph-muted">Try a different search, country or team.</p>
          </div>
        ) : (
          <ul className="ph-result-list">
            {finderPlayerResults.slice(0, FINDER_MAX_RESULTS).map((p) => {
              const preferred =
                effectiveFinderTeamId !== ''
                  ? p.teams.find((t) => t.teamId === effectiveFinderTeamId)
                  : undefined
              const linkTeam = preferred ?? p.teams[0]
              const place = p.nationality !== '' ? p.nationality : (linkTeam?.country ?? '')
              const metaBits = [p.role !== '' ? p.role : null, place !== '' ? place : null].filter(
                (s): s is string => Boolean(s),
              )
              const teamBits = p.teams.slice(0, 2).map((t) => t.teamName)
              const subLine = [...metaBits, ...teamBits].join('  ·  ')
              return (
                <li key={p.name.toLowerCase()}>
                  <button
                    type="button"
                    className="ph-team-row"
                    onClick={() =>
                      onOpenPlayer(
                        p.name,
                        linkTeam ? linkTeam.teamId : null,
                        linkTeam ? linkTeam.tournamentId : null,
                      )
                    }
                    title={`Open ${p.name}`}
                  >
                    <span className="ph-entity-badge ph-entity-badge--sm">
                      {initialsFor(p.name)}
                    </span>
                    <span className="ph-result-text">
                      <span className="ph-team-row-name">{p.name}</span>
                      <span className="ph-team-row-sub">{subLine === '' ? '—' : subLine}</span>
                    </span>
                    <span className="ph-team-row-arrow">→</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="ph-card" aria-label="Search teams">
        <h3 className="ph-card-title">Search Teams</h3>
        <p className="ph-muted">Countries are teams (England, India, Australia, …). Filter by country, then pick a side to open its stats profile.</p>
        <input
          type="search"
          className="ph-input ph-finder-search"
          placeholder="Search teams…"
          value={finderTeamQuery}
          onChange={(e) => setFinderTeamQuery(e.target.value)}
          aria-label="Search teams by name"
        />
        <div className="ph-filter-row">
          <label className="ph-filter-label">
            <span>Country</span>
            <select
              className="ph-input"
              value={finderTeamCountry}
              onChange={(e) => setFinderTeamCountry(e.target.value)}
              aria-label="Filter teams by country"
            >
              <option value="">All countries</option>
              {finderCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ph-result-count-row">
          <span className="ph-result-count">
            {finderTeamResults.length === 0
              ? 'No teams found'
              : `Showing ${Math.min(finderTeamResults.length, FINDER_MAX_RESULTS)} of ${finderTeamResults.length} team${finderTeamResults.length === 1 ? '' : 's'}`}
          </span>
          {teamFiltersActive ? (
            <button
              type="button"
              className="ph-btn ph-btn-ghost ph-btn-sm"
              onClick={() => {
                setFinderTeamQuery('')
                setFinderTeamCountry('')
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        {finderTeamResults.length === 0 ? (
          <div className="ph-empty">
            <div className="ph-empty-title">No teams match these filters</div>
            <p className="ph-muted">Try a different search or country.</p>
          </div>
        ) : (
          <ul className="ph-result-list">
            {finderTeamResults.slice(0, FINDER_MAX_RESULTS).map((t) => (
              <li key={t.teamId}>
                <button
                  type="button"
                  className="ph-team-row"
                  onClick={() => onOpenTeam(t.teamId, t.tournamentId)}
                  title={`Open ${t.teamName}`}
                >
                  {t.logo ? (
                    <img src={t.logo} alt="" className="ph-entity-logo ph-entity-logo--sm" />
                  ) : (
                    <span className="ph-entity-badge ph-entity-badge--sm">
                      {initialsFor(t.teamName)}
                    </span>
                  )}
                  <span className="ph-result-text">
                    <span className="ph-team-row-name">{t.teamName}</span>
                    <span className="ph-team-row-sub">
                      {`${t.tournamentName}  ·  ${t.country}  ·  ${t.playerCount} players`}
                    </span>
                  </span>
                  <span className="ph-team-row-arrow">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}


function HubCrumbs({
  trail,
  onBack,
}: {
  trail: { label: string; onClick?: () => void }[]
  onBack: () => void
}) {
  return (
    <div className="ph-crumbs">
      <button type="button" className="ph-back-btn" onClick={onBack}>
        ← Back
      </button>
      <span className="ph-crumb-trail">
        {trail.map((t, i) => (
          <span key={i}>
            {i > 0 && <span className="ph-crumb-sep"> › </span>}
            {t.onClick ? (
              <button type="button" className="ph-crumb-link" onClick={t.onClick}>
                {t.label}
              </button>
            ) : (
              <span>{t.label}</span>
            )}
          </span>
        ))}
      </span>
    </div>
  )
}

function HubTeamsGrid({
  tournamentId,
  query,
  onOpenTeam,
}: {
  tournamentId: string
  query: string
  onOpenTeam: (teamId: string) => void
}) {
  const teams = getTeamsByTournament(tournamentId)
  const { ratingParScore } = useTournamentOptions(tournamentId)
  const q = query.trim().toLowerCase()
  const filtered = q ? teams.filter((t) => t.name.toLowerCase().includes(q)) : teams

  if (filtered.length === 0) {
    return (
      <div className="ph-empty">
        <div className="ph-empty-title">No teams found</div>
        <p className="ph-muted">Try a different search.</p>
      </div>
    )
  }

  return (
    <div className="ph-card-grid">
      {filtered.map((t) => {
        const squad = getSquadForTeam(t.id)
        const squadSize = squad.startingXI.length + squad.reserves.length + squad.impactSubs.length
        const bat = getTeamBatRatingTotal(t.id, ratingParScore)
        const bowl = getTeamBowlRatingTotal(t.id, ratingParScore)
        const logo = getTeamLogo(t.id) ?? t.logo ?? null
        const prepped = getStoredSquad(t.id) !== null
        return (
          <button key={t.id} type="button" className="ph-entity-card" onClick={() => onOpenTeam(t.id)}>
            {logo ? (
              <img src={logo} alt="" className="ph-entity-logo" />
            ) : (
              <span className="ph-entity-badge">{initialsFor(t.name)}</span>
            )}
            <span className="ph-entity-name">{t.name}</span>
            <span className="ph-entity-meta">
              {squadSize} players{prepped ? ' · prepped' : ''}
            </span>
            <span className="ph-entity-sub">
              Bat {bat.toFixed(2)} · Bowl {bowl.toFixed(2)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function HubPlayerRoute({
  route,
  onBack,
  onOpenTeam,
}: {
  route: Extract<HubRoute, { view: 'player' }>
  onBack: () => void
  onOpenTeam: (teamId: string, tournamentId: string) => void
}) {
  const squadPlayer = useMemo(() => {
    if (!route.teamId) return null
    const squad = getSquadForTeam(route.teamId)
    const all = [...squad.startingXI, ...squad.reserves, ...squad.impactSubs]
    return all.find((p) => p.name.toLowerCase() === route.playerName.toLowerCase()) ?? null
  }, [route.teamId, route.playerName])

  const teams = useMemo<HubPlayerTeamRef[]>(() => {
    const refs: HubPlayerTeamRef[] = []
    const target = route.playerName.toLowerCase()
    for (const e of getAllTournamentEntries()) {
      for (const t of getTeamsByTournament(e.tournament.id)) {
        let squad: ReturnType<typeof getSquadForTeam>
        try {
          squad = getSquadForTeam(t.id)
        } catch {
          continue
        }
        const all = [...squad.startingXI, ...squad.reserves, ...squad.impactSubs]
        if (all.some((p) => p.name.toLowerCase() === target)) {
          refs.push({
            teamId: t.id,
            teamName: t.name,
            tournamentId: e.tournament.id,
            tournamentName: e.tournament.name,
          })
        }
      }
    }
    return refs.slice(0, 12)
  }, [route.playerName])

  const currentTeamName =
    route.teamId && route.tournamentId
      ? getTeamsByTournament(route.tournamentId).find((t) => t.id === route.teamId)?.name
      : null
  const eyebrow =
    route.tournamentId && currentTeamName
      ? `Leagues › ${tournamentLabel(route.tournamentId)} › ${currentTeamName} › ${route.playerName}`
      : `Leagues › ${route.playerName}`

  return (
    <div className="ph-hub">
      <PlayerFullProfile
        playerName={route.playerName}
        squadPlayer={squadPlayer}
        teams={teams}
        contextTournamentId={route.tournamentId}
        eyebrow={eyebrow}
        onBack={onBack}
        onOpenTeam={onOpenTeam}
      />
    </div>
  )
}

