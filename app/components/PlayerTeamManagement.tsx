'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchJson } from '../../lib/api/fetchJson'
import type { AppTournamentOption } from '../../lib/cricketDb/appTournamentsClient'
import { getBuiltinTournamentLabel } from '../../lib/cricketDb/appTournamentsClient'

interface AutoMapSuggestion {
  kind: 'competition' | 'team' | 'player'
  confidence: number
  label: string
  mappedTo: string
  mappedToLabel?: string
  sourceId?: string
}

interface UnmappedCompetition {
  competitionId: string
  label: string
  rowCount: number
  topTeams: string[]
  suggestedName: string
}

interface AutoMapResult {
  applied: boolean
  competitionsMapped: number
  teamsMapped: number
  playersMapped: number
  suggestions: AutoMapSuggestion[]
  unmappedCompetitions: UnmappedCompetition[]
}

type TabId = 'database' | 'players' | 'mappings' | 'raw'

interface DbStats {
  performances: number
  players: number
  competitions: number
  teams: number
  aliases: number
  mergedPlayerIds: number
  lastImport: { at: string; filename: string; rows: number } | null
}

interface PlayerHit {
  playerId: string
  displayName: string
  appearances: number
}

interface PlayerProfile {
  playerId: string
  displayName: string
  appearances: number
  batInnings: number
  runs: number
  balls: number
  average: number | null
  strikeRatePerBall: number | null
  fours: number
  sixes: number
  fifties: number
  hundreds: number
  highScore: number
  bowlInnings: number
  wickets: number
  bowlRuns: number
  bowlAverage: number | null
  recentInnings: { date: string; runs: number; notOut: boolean }[]
}

interface CompetitionRow {
  competitionId: string
  label: string
  rowCount: number
  tournamentId: string | null
}

interface TeamRow {
  teamId: string
  label: string
  rowCount: number
  tournamentId: string | null
  appTeamId: string | null
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

const TABS: { id: TabId; label: string }[] = [
  { id: 'database', label: 'Database' },
  { id: 'players', label: 'Players' },
  { id: 'mappings', label: 'Mappings' },
  { id: 'raw', label: 'Raw data' },
]

export default function PlayerTeamManagement() {
  const [tab, setTab] = useState<TabId>('database')
  const [stats, setStats] = useState<DbStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const [playerQ, setPlayerQ] = useState('')
  const [playerHits, setPlayerHits] = useState<PlayerHit[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [aliasAppName, setAliasAppName] = useState('')
  const [aliasPlayerId, setAliasPlayerId] = useState('')

  const [rawPage, setRawPage] = useState(1)
  const [rawRows, setRawRows] = useState<PerfRow[]>([])
  const [rawTotal, setRawTotal] = useState(0)
  const [rawFilterPlayer, setRawFilterPlayer] = useState('')

  const [appTournaments, setAppTournaments] = useState<AppTournamentOption[]>([])
  const [teamsByTournament, setTeamsByTournament] = useState<Record<string, { id: string; name: string }[]>>({})
  const [autoMapBusy, setAutoMapBusy] = useState(false)
  const [autoMapResult, setAutoMapResult] = useState<AutoMapResult | null>(null)
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newTournamentCountry, setNewTournamentCountry] = useState('')
  const [linkCompetitionId, setLinkCompetitionId] = useState<string | null>(null)

  function tournamentLabel(id: string): string {
    return appTournaments.find((t) => t.id === id)?.name ?? getBuiltinTournamentLabel(id)
  }

  async function loadTournaments() {
    const result = await fetchJson<{ tournaments?: AppTournamentOption[] }>('/api/cricket/tournaments')
    if (result.ok && result.data) setAppTournaments(result.data.tournaments ?? [])
  }

  async function loadTeamsForTournament(tournamentId: string) {
    if (!tournamentId || teamsByTournament[tournamentId]) return
    const result = await fetchJson<{ teams?: { id: string; name: string }[] }>(
      `/api/cricket/custom-teams?tournamentId=${encodeURIComponent(tournamentId)}`,
    )
    if (result.ok && result.data) {
      setTeamsByTournament((prev) => ({ ...prev, [tournamentId]: result.data!.teams ?? [] }))
    }
  }

  useEffect(() => {
    void loadTournaments()
  }, [])

  const refreshStats = useCallback(async () => {
    const result = await fetchJson<DbStats>('/api/cricket/stats')
    if (!result.ok) {
      setStats(null)
      setStatsError(result.error ?? 'Failed to load stats')
      return
    }
    setStats(result.data!)
    setStatsError(null)
  }, [])

  const refreshMappings = useCallback(async () => {
    const [cResult, tResult] = await Promise.all([
      fetchJson<{ competitions?: CompetitionRow[] }>('/api/cricket/competitions'),
      fetchJson<{ teams?: TeamRow[] }>('/api/cricket/teams'),
    ])
    if (cResult.ok && cResult.data) setCompetitions(cResult.data.competitions ?? [])
    if (tResult.ok && tResult.data) setTeams(tResult.data.teams ?? [])
  }, [])

  const loadRaw = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(rawPage),
      pageSize: '50',
    })
    if (rawFilterPlayer.trim()) params.set('playerId', rawFilterPlayer.trim())
    const result = await fetchJson<{ rows?: PerfRow[]; total?: number }>(
      `/api/cricket/performances?${params}`,
    )
    if (result.ok && result.data) {
      setRawRows(result.data.rows ?? [])
      setRawTotal(result.data.total ?? 0)
    }
  }, [rawPage, rawFilterPlayer])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  useEffect(() => {
    if (tab === 'mappings') refreshMappings()
  }, [tab, refreshMappings])

  useEffect(() => {
    if (tab === 'raw') loadRaw()
  }, [tab, loadRaw])

  useEffect(() => {
    const t = window.setTimeout(async () => {
      if (playerQ.trim().length < 2) {
        setPlayerHits([])
        return
      }
      const result = await fetchJson<{ players?: PlayerHit[] }>(
        `/api/cricket/players?q=${encodeURIComponent(playerQ)}&limit=20`,
      )
      if (result.ok && result.data) setPlayerHits(result.data.players ?? [])
    }, 250)
    return () => window.clearTimeout(t)
  }, [playerQ])

  useEffect(() => {
    if (!selectedPlayerId) {
      setProfile(null)
      return
    }
    void (async () => {
      const result = await fetchJson<PlayerProfile>(
        `/api/cricket/players/${encodeURIComponent(selectedPlayerId)}`,
      )
      if (result.ok && result.data?.playerId) setProfile(result.data)
      else setProfile(null)
    })()
  }, [selectedPlayerId])

  async function handleImport(file: File, replace: boolean) {
    setImporting(true)
    setImportMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('replace', replace ? '1' : '0')
      const result = await fetchJson<{
        rowsImported: number
        skipped: number
        autoMap?: {
          competitionsMapped: number
          teamsMapped: number
          playersMapped: number
          unmappedCompetitions: number
          playerMerges?: { mergedPlayerIds: number; canonicalPlayers: number }
        }
      }>('/api/cricket/import', { method: 'POST', body: fd })
      if (!result.ok) throw new Error(result.error ?? 'Import failed')
      const data = result.data!
      const am = data.autoMap
      const mergeText =
        am?.playerMerges && am.playerMerges.mergedPlayerIds > 0
          ? ` Merged ${am.playerMerges.mergedPlayerIds} duplicate PlayerID(s) into ${am.playerMerges.canonicalPlayers} people (surname + initials).`
          : ''
      const amText = am
        ? ` Auto-mapped: ${am.competitionsMapped} competitions, ${am.teamsMapped} teams, ${am.playersMapped} squad names.${mergeText} ${am.unmappedCompetitions} competition(s) still need a tournament.`
        : ''
      setImportMsg(`Imported ${data.rowsImported} rows (${data.skipped} skipped).${amText}`)
      await refreshStats()
      await loadTournaments()
      if (tab === 'mappings') await refreshMappings()
      const preview = await fetchJson<AutoMapResult>('/api/cricket/auto-map?apply=0', {
        method: 'POST',
      })
      if (preview.ok && preview.data) setAutoMapResult(preview.data)
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function patchCompetition(competitionId: string, tournamentId: string) {
    await fetch('/api/cricket/competitions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitionId,
        tournamentId: tournamentId || null,
      }),
    })
    await refreshMappings()
  }

  async function patchTeam(teamId: string, tournamentId: string, appTeamId: string) {
    await fetch('/api/cricket/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        tournamentId: tournamentId || null,
        appTeamId: appTeamId || null,
      }),
    })
    await refreshMappings()
  }

  async function runAutoMap(apply: boolean) {
    setAutoMapBusy(true)
    try {
      const result = await fetchJson<AutoMapResult>(
        `/api/cricket/auto-map?apply=${apply ? '1' : '0'}`,
        { method: 'POST' },
      )
      if (!result.ok) throw new Error(result.error ?? 'Auto-map failed')
      setAutoMapResult(result.data!)
      if (apply) {
        await refreshMappings()
        await refreshStats()
        await loadTournaments()
      }
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Auto-map failed')
    } finally {
      setAutoMapBusy(false)
    }
  }

  async function createCustomTournament() {
    if (!newTournamentName.trim()) return
    const res = await fetch('/api/cricket/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTournamentName.trim(),
        country: newTournamentCountry.trim() || undefined,
        linkCompetitionId: linkCompetitionId ?? undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setImportMsg(data.error ?? 'Could not create tournament')
      return
    }
    setNewTournamentName('')
    setNewTournamentCountry('')
    setLinkCompetitionId(null)
    await loadTournaments()
    await refreshMappings()
    setImportMsg(`Created tournament “${data.tournament?.name ?? newTournamentName}”.`)
  }

  async function saveAlias() {
    if (!aliasAppName.trim() || !aliasPlayerId.trim()) return
    await fetch('/api/cricket/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: aliasAppName, playerId: aliasPlayerId }),
    })
    setAliasAppName('')
    setAliasPlayerId('')
    await refreshStats()
  }

  const rawTotalPages = Math.max(1, Math.ceil(rawTotal / 50))

  return (
    <div className="ptm-root">
      <header className="ptm-header">
        <h1 className="page-heading">Player and Team Management</h1>
        <p className="page-sub">
          Import T20 match performances, browse the SQLite database, map competitions and teams to
          tournaments in the manager, and link app player names to dataset IDs.
        </p>
      </header>

      <div className="ptm-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ptm-tab ${tab === t.id ? 'ptm-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'database' && (
        <div className="ptm-panel">
          <section className="ptm-card">
            <h2 className="ptm-card-title">Database status</h2>
            {statsError ? (
              <p className="ptm-error">
                {statsError}{' '}
                <a href="/api/cricket/health" target="_blank" rel="noreferrer" className="ptm-link-btn">
                  Database health
                </a>
              </p>
            ) : null}
            {stats ? (
              <div className="ptm-stat-grid">
                <div className="ptm-stat">
                  <span className="ptm-stat-label">Performances</span>
                  <span className="ptm-stat-value">{stats.performances.toLocaleString()}</span>
                </div>
                <div className="ptm-stat">
                  <span className="ptm-stat-label">Players</span>
                  <span className="ptm-stat-value">{stats.players.toLocaleString()}</span>
                </div>
                <div className="ptm-stat">
                  <span className="ptm-stat-label">Competitions</span>
                  <span className="ptm-stat-value">{stats.competitions.toLocaleString()}</span>
                </div>
                <div className="ptm-stat">
                  <span className="ptm-stat-label">Teams (dataset)</span>
                  <span className="ptm-stat-value">{stats.teams.toLocaleString()}</span>
                </div>
                <div className="ptm-stat">
                  <span className="ptm-stat-label">Name aliases</span>
                  <span className="ptm-stat-value">{stats.aliases.toLocaleString()}</span>
                </div>
                <div className="ptm-stat">
                  <span className="ptm-stat-label">Merged IDs</span>
                  <span className="ptm-stat-value">{stats.mergedPlayerIds.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="ptm-muted">Loading…</p>
            )}
            {stats?.lastImport ? (
              <p className="ptm-muted ptm-last-import">
                Last import: {stats.lastImport.filename} — {stats.lastImport.rows.toLocaleString()}{' '}
                rows at {stats.lastImport.at}
              </p>
            ) : (
              <p className="ptm-muted">No import yet. Database file: data/cricket.db</p>
            )}
          </section>

          <section className="ptm-card">
            <h2 className="ptm-card-title">Import CSV</h2>
            <p className="ptm-muted">
              Upload your T20 performance export (comma- or tab-separated). Replaces all performance
              rows by default, merges duplicate PlayerIDs that share surname + initials, maps
              competitions to built-in tournaments (IPL, Blast, …) by team overlap, then links squad
              names to dataset players.
            </p>
            <div className="ptm-import-row">
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleImport(f, true)
                  e.target.value = ''
                }}
              />
              {importing ? <span className="ptm-muted">Importing…</span> : null}
            </div>
            {importMsg ? <p className={importMsg.startsWith('Imported') ? 'ptm-success' : 'ptm-error'}>{importMsg}</p> : null}
          </section>
        </div>
      )}

      {tab === 'players' && (
        <div className="ptm-panel ptm-split">
          <section className="ptm-card ptm-split-side">
            <h2 className="ptm-card-title">Search players</h2>
            <input
              type="search"
              className="ptm-input"
              placeholder="Name or PlayerID…"
              value={playerQ}
              onChange={(e) => setPlayerQ(e.target.value)}
            />
            <ul className="ptm-player-list">
              {playerHits.map((p) => (
                <li key={p.playerId}>
                  <button
                    type="button"
                    className={`ptm-player-item ${selectedPlayerId === p.playerId ? 'ptm-player-item-active' : ''}`}
                    onClick={() => setSelectedPlayerId(p.playerId)}
                  >
                    <span className="ptm-player-name">{p.displayName}</span>
                    <span className="ptm-player-meta">
                      {p.playerId} · {p.appearances} apps
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="ptm-card ptm-split-main">
            {!profile ? (
              <p className="ptm-muted">Select a player to view T20 aggregates from the database.</p>
            ) : (
              <>
                <h2 className="ptm-card-title">{profile.displayName}</h2>
                <p className="ptm-muted">PlayerID {profile.playerId} · {profile.appearances} appearances</p>
                <div className="ptm-stat-grid">
                  <div className="ptm-stat">
                    <span className="ptm-stat-label">Runs</span>
                    <span className="ptm-stat-value">{profile.runs}</span>
                  </div>
                  <div className="ptm-stat">
                    <span className="ptm-stat-label">Average</span>
                    <span className="ptm-stat-value">{profile.average ?? '—'}</span>
                  </div>
                  <div className="ptm-stat">
                    <span className="ptm-stat-label">SR (per ball)</span>
                    <span className="ptm-stat-value">{profile.strikeRatePerBall ?? '—'}</span>
                  </div>
                  <div className="ptm-stat">
                    <span className="ptm-stat-label">Wickets</span>
                    <span className="ptm-stat-value">{profile.wickets}</span>
                  </div>
                  <div className="ptm-stat">
                    <span className="ptm-stat-label">Bowl avg</span>
                    <span className="ptm-stat-value">{profile.bowlAverage ?? '—'}</span>
                  </div>
                  <div className="ptm-stat">
                    <span className="ptm-stat-label">High score</span>
                    <span className="ptm-stat-value">{profile.highScore}</span>
                  </div>
                </div>
                {profile.recentInnings.length > 0 ? (
                  <>
                    <h3 className="ptm-subhead">Recent innings</h3>
                    <div className="ptm-recent-row">
                      {profile.recentInnings.map((inn, i) => (
                        <span key={i} className="ptm-recent-chip">
                          {inn.runs}
                          {inn.notOut ? '*' : ''}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
                <button
                  type="button"
                  className="ptm-link-btn"
                  onClick={() => {
                    setRawFilterPlayer(profile.playerId)
                    setTab('raw')
                    setRawPage(1)
                  }}
                >
                  View raw rows for this player →
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {tab === 'mappings' && (
        <div className="ptm-panel">
          <section className="ptm-card">
            <h2 className="ptm-card-title">Auto-map</h2>
            <p className="ptm-muted">
              Built-in tournaments (IPL, Blast, BBL, …) are matched to imported competitions by
              franchise/county team names. Squad players in the app are linked to the dataset by
              surname + first initial (e.g. “Virat Kohli” → “V Kohli”). Apply saves high-confidence
              links; use Mappings below to fix anything left unmapped.
            </p>
            <div className="ptm-import-row">
              <button
                type="button"
                className="ptm-btn ptm-btn-ghost"
                disabled={autoMapBusy}
                onClick={() => void runAutoMap(false)}
              >
                Preview matches
              </button>
              <button
                type="button"
                className="ptm-btn"
                disabled={autoMapBusy}
                onClick={() => void runAutoMap(true)}
              >
                Apply obvious matches
              </button>
            </div>
            {autoMapResult ? (
              <div className="ptm-auto-summary">
                {autoMapResult.applied ? (
                  <p className="ptm-success">
                    Applied — {autoMapResult.competitionsMapped} competitions,{' '}
                    {autoMapResult.teamsMapped} teams, {autoMapResult.playersMapped} player aliases.
                  </p>
                ) : (
                  <p className="ptm-muted">
                    Preview — would map up to {autoMapResult.suggestions.length} items at current
                    thresholds.
                  </p>
                )}
                {autoMapResult.suggestions.length > 0 ? (
                  <div className="ptm-table-wrap ptm-table-wrap-tall">
                    <table className="ptm-table ptm-table-compact">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>From</th>
                          <th>→</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {autoMapResult.suggestions.slice(0, 80).map((s, i) => (
                          <tr key={`${s.kind}-${s.sourceId ?? s.label}-${i}`}>
                            <td>{s.kind}</td>
                            <td>{s.label}</td>
                            <td>
                              {s.mappedToLabel ?? s.mappedTo}
                              {s.sourceId ? (
                                <span className="ptm-mono"> ({s.sourceId})</span>
                              ) : null}
                            </td>
                            <td>{(s.confidence * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {autoMapResult && autoMapResult.unmappedCompetitions.length > 0 ? (
            <section className="ptm-card">
              <h2 className="ptm-card-title">New tournaments needed</h2>
              <p className="ptm-muted">
                These competitions could not be matched to IPL, Blast, etc. Add a custom tournament
                and link the competition.
              </p>
              {autoMapResult.unmappedCompetitions.slice(0, 12).map((u) => (
                <div key={u.competitionId} className="ptm-unmapped-row">
                  <div>
                    <strong className="ptm-mono">{u.competitionId}</strong>
                    <span className="ptm-muted"> · {u.rowCount.toLocaleString()} rows</span>
                    {u.topTeams.length > 0 ? (
                      <div className="ptm-muted">Teams: {u.topTeams.join(', ')}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="ptm-btn ptm-btn-ghost"
                    onClick={() => {
                      setLinkCompetitionId(u.competitionId)
                      setNewTournamentName(u.suggestedName.replace(/ league$/i, ''))
                    }}
                  >
                    Add tournament…
                  </button>
                </div>
              ))}
              <div className="ptm-alias-form ptm-new-tournament-form">
                <input
                  className="ptm-input"
                  placeholder="Tournament name"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                />
                <input
                  className="ptm-input"
                  placeholder="Country (optional)"
                  value={newTournamentCountry}
                  onChange={(e) => setNewTournamentCountry(e.target.value)}
                />
                <button type="button" className="ptm-btn" onClick={() => void createCustomTournament()}>
                  {linkCompetitionId
                    ? `Create & link ${linkCompetitionId}`
                    : 'Create tournament'}
                </button>
              </div>
            </section>
          ) : null}

          <section className="ptm-card">
            <h2 className="ptm-card-title">Competition → tournament</h2>
            <p className="ptm-muted">Map each dataset CompetitionID to a tournament in the manager.</p>
            <div className="ptm-table-wrap">
              <table className="ptm-table">
                <thead>
                  <tr>
                    <th>Competition ID</th>
                    <th>Rows</th>
                    <th>Tournament</th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((c) => (
                    <tr key={c.competitionId}>
                      <td className="ptm-mono">{c.competitionId}</td>
                      <td>{c.rowCount}</td>
                      <td>
                        <select
                          className="ptm-select"
                          value={c.tournamentId ?? ''}
                          onChange={(e) => patchCompetition(c.competitionId, e.target.value)}
                        >
                          <option value="">— Unmapped —</option>
                          {appTournaments.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.gender})
                            </option>
                          ))}
                        </select>
                        {c.tournamentId ? (
                          <span className="ptm-map-ok">{tournamentLabel(c.tournamentId)}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ptm-card">
            <h2 className="ptm-card-title">Dataset team → app team</h2>
            <div className="ptm-table-wrap ptm-table-wrap-tall">
              <table className="ptm-table">
                <thead>
                  <tr>
                    <th>Team ID</th>
                    <th>Label</th>
                    <th>Rows</th>
                    <th>Tournament</th>
                    <th>App team</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.slice(0, 200).map((t) => (
                    <tr key={t.teamId}>
                      <td className="ptm-mono">{t.teamId}</td>
                      <td>{t.label}</td>
                      <td>{t.rowCount}</td>
                      <td>
                        <select
                          className="ptm-select"
                          value={t.tournamentId ?? ''}
                          onChange={(e) => {
                            const tid = e.target.value
                            void loadTeamsForTournament(tid)
                            patchTeam(t.teamId, tid, t.appTeamId ?? '')
                          }}
                        >
                          <option value="">—</option>
                          {appTournaments.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                              {opt.source === 'custom' ? ' (custom)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="ptm-select"
                          value={t.appTeamId ?? ''}
                          onFocus={() => {
                            if (t.tournamentId) void loadTeamsForTournament(t.tournamentId)
                          }}
                          onChange={(e) =>
                            patchTeam(t.teamId, t.tournamentId ?? '', e.target.value)
                          }
                        >
                          <option value="">—</option>
                          {(t.tournamentId ? teamsByTournament[t.tournamentId] : undefined)?.map(
                            (at) => (
                              <option key={at.id} value={at.id}>
                                {at.name}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {teams.length > 200 ? (
              <p className="ptm-muted">Showing first 200 teams. Filter in SQLite or split by competition later.</p>
            ) : null}
          </section>

          <section className="ptm-card">
            <h2 className="ptm-card-title">Player name aliases</h2>
            <p className="ptm-muted">
              Link manager squad names (e.g. full first name) to dataset PlayerID (initial + surname).
            </p>
            <div className="ptm-alias-form">
              <input
                className="ptm-input"
                placeholder="App squad name"
                value={aliasAppName}
                onChange={(e) => setAliasAppName(e.target.value)}
              />
              <input
                className="ptm-input"
                placeholder="Dataset PlayerID"
                value={aliasPlayerId}
                onChange={(e) => setAliasPlayerId(e.target.value)}
              />
              <button type="button" className="ptm-btn" onClick={() => void saveAlias()}>
                Save alias
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === 'raw' && (
        <div className="ptm-panel">
          <section className="ptm-card">
            <h2 className="ptm-card-title">Performance rows</h2>
            <div className="ptm-raw-toolbar">
              <input
                className="ptm-input"
                placeholder="Filter by PlayerID"
                value={rawFilterPlayer}
                onChange={(e) => setRawFilterPlayer(e.target.value)}
              />
              <button type="button" className="ptm-btn" onClick={() => { setRawPage(1); void loadRaw() }}>
                Apply filter
              </button>
              <span className="ptm-muted">
                {rawTotal.toLocaleString()} rows · page {rawPage} / {rawTotalPages}
              </span>
              <button
                type="button"
                className="ptm-btn ptm-btn-ghost"
                disabled={rawPage <= 1}
                onClick={() => setRawPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="ptm-btn ptm-btn-ghost"
                disabled={rawPage >= rawTotalPages}
                onClick={() => setRawPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
            <div className="ptm-table-wrap ptm-table-wrap-tall">
              <table className="ptm-table ptm-table-compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Opp</th>
                    <th>Runs</th>
                    <th>Balls</th>
                    <th>Wkts</th>
                    <th>Comp ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rawRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.matchDate ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="ptm-link-btn"
                          onClick={() => {
                            setSelectedPlayerId(r.playerId)
                            setTab('players')
                          }}
                        >
                          {r.playerName}
                        </button>
                      </td>
                      <td>{r.teamName ?? '—'}</td>
                      <td>{r.opponent ?? '—'}</td>
                      <td>{r.batRuns ?? '—'}</td>
                      <td>{r.batBalls ?? '—'}</td>
                      <td>{r.bowlWickets ?? '—'}</td>
                      <td className="ptm-mono">{r.competitionId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
