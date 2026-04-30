'use client'

import { useMemo, useRef, useState } from 'react'
import {
  FORMATS,
  GENDERS,
  TOURNAMENTS,
  getAllTournamentEntries,
  type CricketFormat,
  type Gender,
  type Tournament,
} from './data/tournaments'
import { TEAMS } from './data/teams'
import { getTournamentPrepProgress } from './data/squadStore'
import Dashboard from './components/Dashboard'
import AppNavSidebar, { type HomeNavId } from './components/AppNavSidebar'

type View = 'format' | 'gender' | 'tournaments' | 'dashboard'

interface SearchResult {
  type: 'tournament' | 'team'
  label: string
  sublabel: string
  format: CricketFormat
  gender: Gender
  tournamentId: string
  teamId?: string
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []
  for (const fmt of FORMATS) {
    for (const g of GENDERS) {
      const tournaments = TOURNAMENTS[fmt.key][g.key]
      for (const t of tournaments) {
        results.push({
          type: 'tournament',
          label: t.name,
          sublabel: `${fmt.label} · ${g.label}${t.country ? ` · ${t.country}` : ''}`,
          format: fmt.key,
          gender: g.key,
          tournamentId: t.id,
        })

        const teams = TEAMS[t.id] ?? []
        for (const team of teams) {
          results.push({
            type: 'team',
            label: team.name,
            sublabel: `${t.name} · ${fmt.label} · ${g.label}`,
            format: fmt.key,
            gender: g.key,
            tournamentId: t.id,
            teamId: team.id,
          })
        }
      }
    }
  }
  return results
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function syntheticStartDate(id: string, format: string, gender: string): Date {
  const daysAhead = (hashSeed(`${id}|${format}|${gender}`) % 100) + 1
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysAhead)
  return d
}

const PLACEHOLDER_LABELS: Record<Exclude<HomeNavId, 'tournament-manager'>, string> = {
  outrights: 'Outrights',
  settings: 'Settings',
  'player-team': 'Player and Team Management',
  'custom-bet': 'Custom Bet',
  schedule: 'Schedule',
  coverage: 'Coverage Rota',
}

export default function Home() {
  const [view, setView] = useState<View>('format')
  const [homeNav, setHomeNav] = useState<HomeNavId>('tournament-manager')
  const [selectedFormat, setSelectedFormat] = useState<CricketFormat | null>(null)
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  /** Set when entering dashboard so TeamManager opens immediately (wizard or search). */
  const [teamIdForDashboard, setTeamIdForDashboard] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const searchIndex = useMemo(buildSearchIndex, [])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return searchIndex
      .filter((r) => r.label.toLowerCase().includes(q) || r.sublabel.toLowerCase().includes(q))
      .slice(0, 12)
  }, [searchQuery, searchIndex])

  type UpcomingRow = {
    format: CricketFormat
    gender: Gender
    tournament: Tournament
    startDate: Date
    prep: { prepped: number; total: number }
  }

  const shuffledTournamentPoolRef = useRef<ReturnType<typeof getAllTournamentEntries> | null>(null)

  const [upcomingFilterFormat, setUpcomingFilterFormat] = useState<'all' | CricketFormat>('all')
  const [upcomingFilterGender, setUpcomingFilterGender] = useState<'all' | Gender>('all')
  const [upcomingHideFullyPrepped, setUpcomingHideFullyPrepped] = useState(false)
  const [upcomingHideSrl, setUpcomingHideSrl] = useState(false)
  const [upcomingSearch, setUpcomingSearch] = useState('')

  function handleFormatSelect(format: CricketFormat) {
    setSelectedFormat(format)
    setSearchQuery('')
    setSelectedTournamentId(null)
    setTeamIdForDashboard(null)

    const hasWomenTournaments = TOURNAMENTS[format].women.length > 0
    if (!hasWomenTournaments) {
      setSelectedGender('men')
      setView('tournaments')
    } else {
      setSelectedGender(null)
      setView('gender')
    }
  }

  function handleGenderSelect(gender: Gender) {
    setSelectedGender(gender)
    setSelectedTournamentId(null)
    setTeamIdForDashboard(null)
    setView('tournaments')
  }

  function handleTournamentSelect(tournamentId: string) {
    setSelectedTournamentId(tournamentId)
    setTeamIdForDashboard(null)
    setView('dashboard')
  }

  function handleSearchSelect(result: SearchResult) {
    setSelectedFormat(result.format)
    setSelectedGender(result.gender)
    setSelectedTournamentId(result.tournamentId)
    setSearchQuery('')
    if (result.type === 'team' && result.teamId) {
      setTeamIdForDashboard(result.teamId)
      setView('dashboard')
    } else {
      setTeamIdForDashboard(null)
      setView('dashboard')
    }
  }

  function handleUpcomingSelect(entry: {
    format: CricketFormat
    gender: Gender
    tournament: { id: string; name: string; country?: string }
  }) {
    setSelectedFormat(entry.format)
    setSelectedGender(entry.gender)
    setSelectedTournamentId(entry.tournament.id)
    setSearchQuery('')
    setTeamIdForDashboard(null)
    setView('dashboard')
  }

  function handleDashboardSelectTournament(
    format: CricketFormat,
    gender: Gender,
    tournamentId: string,
  ) {
    setSelectedFormat(format)
    setSelectedGender(gender)
    setSelectedTournamentId(tournamentId)
    setTeamIdForDashboard(null)
    setView('dashboard')
  }

  function handleGoHome() {
    setSelectedFormat(null)
    setSelectedGender(null)
    setSelectedTournamentId(null)
    setTeamIdForDashboard(null)
    setSearchQuery('')
    setView('format')
    setHomeNav('tournament-manager')
  }

  function goBack() {
    if (view === 'tournaments') {
      const hasWomenTournaments =
        selectedFormat && TOURNAMENTS[selectedFormat].women.length > 0
      if (hasWomenTournaments) {
        setSelectedGender(null)
        setView('gender')
      } else {
        setSelectedFormat(null)
        setSelectedGender(null)
        setView('format')
      }
      return
    }
    if (view === 'gender') {
      setSelectedFormat(null)
      setView('format')
    }
  }

  if (
    view === 'dashboard' &&
    selectedFormat &&
    selectedGender &&
    selectedTournamentId
  ) {
    return (
      <Dashboard
        format={selectedFormat}
        gender={selectedGender}
        tournamentId={selectedTournamentId}
        initialTeamId={teamIdForDashboard}
        onSelectTournament={handleDashboardSelectTournament}
        onGoHome={handleGoHome}
      />
    )
  }

  const stepIndex =
    view === 'format'
      ? 0
      : view === 'gender'
        ? 1
        : view === 'tournaments'
          ? 2
          : 0
  const formatLabel = selectedFormat
    ? FORMATS.find((f) => f.key === selectedFormat)?.label
    : ''
  const genderLabel = selectedGender
    ? GENDERS.find((g) => g.key === selectedGender)?.label
    : ''

  const tournaments =
    selectedFormat && selectedGender
      ? TOURNAMENTS[selectedFormat][selectedGender]
      : []

  if (homeNav !== 'tournament-manager') {
    const label = PLACEHOLDER_LABELS[homeNav]
    return (
      <div className="app-home-shell">
        <AppNavSidebar activeId={homeNav} onSelect={setHomeNav} />
        <main className="app-home-main">
          <div className="page app-home-page">
            <div className="nav-placeholder-panel">
              <h1 className="page-heading">{label}</h1>
              <p className="page-sub">Content for this section will be added later.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!shuffledTournamentPoolRef.current) {
    const c = [...getAllTournamentEntries()]
    shuffleInPlace(c)
    shuffledTournamentPoolRef.current = c
  }

  let upcomingRowsForFormat: UpcomingRow[] = []
  let inProgressRowsForFormat: UpcomingRow[] = []
  if (shuffledTournamentPoolRef.current) {
    let rows: UpcomingRow[] = shuffledTournamentPoolRef.current.map((e) => ({
      format: e.format,
      gender: e.gender,
      tournament: e.tournament,
      startDate: syntheticStartDate(e.tournament.id, e.format, e.gender),
      prep: getTournamentPrepProgress(e.tournament.id),
    }))
    if (upcomingFilterFormat !== 'all') {
      rows = rows.filter((r) => r.format === upcomingFilterFormat)
    }
    if (upcomingFilterGender !== 'all') {
      rows = rows.filter((r) => r.gender === upcomingFilterGender)
    }
    if (upcomingHideFullyPrepped) {
      rows = rows.filter(
        (r) => !(r.prep.total > 0 && r.prep.prepped === r.prep.total),
      )
    }
    if (upcomingHideSrl) {
      rows = rows.filter((r) => r.format !== 'srl')
    }
    const q = upcomingSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) =>
          r.tournament.name.toLowerCase().includes(q) ||
          (r.tournament.country?.toLowerCase().includes(q) ?? false),
      )
    }

    const isInProgress = (r: UpcomingRow) =>
      r.prep.total > 0 && r.prep.prepped > 0 && r.prep.prepped < r.prep.total

    inProgressRowsForFormat = rows
      .filter(isInProgress)
      .sort(
        (a, b) =>
          b.prep.prepped / b.prep.total - a.prep.prepped / a.prep.total,
      )
    upcomingRowsForFormat = rows
      .filter((r) => !isInProgress(r))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }

  return (
    <div className="app-home-shell">
      <AppNavSidebar activeId={homeNav} onSelect={setHomeNav} />
      <main className="app-home-main">
    <div className="page app-home-page">
      <div className="steps">
        <div className={`step-dot ${stepIndex === 0 ? 'active' : stepIndex > 0 ? 'done' : ''}`}>1</div>
        <div className={`step-line ${stepIndex > 0 ? 'done' : ''}`} />
        <div className={`step-dot ${stepIndex === 1 ? 'active' : stepIndex > 1 ? 'done' : ''}`}>2</div>
        <div className={`step-line ${stepIndex > 1 ? 'done' : ''}`} />
        <div className={`step-dot ${stepIndex === 2 ? 'active' : ''}`}>3</div>
      </div>

      {/* Wizard: format → category → tournament (left); upcoming centre; in progress right */}
      {(view === 'format' || view === 'gender' || view === 'tournaments') && (
        <>
          <div className="format-step-grid">
            <div className="format-step-main">
              {view === 'format' && (
                <>
              <h1 className="page-heading">Select Format</h1>
              <p className="page-sub">Choose the format of cricket you want to manage, or search for a tournament or team.</p>

              {/* Search bar */}
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search tournaments or teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <ul className="search-results">
                    {searchResults.map((r, i) => (
                      <li
                        key={`${r.type}-${r.tournamentId}-${r.teamId ?? i}`}
                        className="search-result-item"
                        onClick={() => handleSearchSelect(r)}
                      >
                        <span className={`search-result-badge ${r.type === 'team' ? 'badge-team' : 'badge-tournament'}`}>
                          {r.type === 'team' ? 'Team' : 'Tournament'}
                        </span>
                        <div className="search-result-text">
                          <span className="search-result-label">{r.label}</span>
                          <span className="search-result-sub">{r.sublabel}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="search-no-results">No results found</div>
                )}
              </div>

              {/* Format list */}
              <div className="format-list">
                {FORMATS.map((f) => (
                  <div
                    key={f.key}
                    className="format-list-item"
                    onClick={() => handleFormatSelect(f.key)}
                  >
                    <div className="format-list-info">
                      <span className="format-list-label">{f.label}</span>
                      <span className="format-list-desc">{f.description}</span>
                    </div>
                    <span className="format-list-arrow">→</span>
                  </div>
                ))}
              </div>
                </>
              )}

              {view === 'gender' && (
                <>
                  <button type="button" className="back-btn" onClick={goBack}>
                    ← Back to formats
                  </button>
                  <h1 className="page-heading">{formatLabel} — Select Category</h1>
                  <p className="page-sub">Choose which category of tournaments to view.</p>
                  <div className="format-list">
                    {GENDERS.map((g) => (
                      <div
                        key={g.key}
                        className="format-list-item"
                        onClick={() => handleGenderSelect(g.key)}
                      >
                        <div className="format-list-info">
                          <span className="format-list-label">{g.label}</span>
                        </div>
                        <span className="format-list-arrow">→</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {view === 'tournaments' && (
                <>
                  <button type="button" className="back-btn" onClick={goBack}>
                    ← Back to category
                  </button>
                  <h1 className="page-heading">
                    {formatLabel} — {genderLabel} Tournaments
                  </h1>
                  <p className="page-sub">
                    Open a tournament to go to its main page (overview, standings, and teams).
                  </p>

                  {tournaments.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">No tournaments</div>
                      <p>No tournaments available yet.</p>
                    </div>
                  ) : (
                    <div className="tournament-list">
                      {tournaments.map((t) => (
                        <div
                          key={t.id}
                          className="tournament-item"
                          role="button"
                          tabIndex={0}
                          title={`Open tournament page — ${t.name}`}
                          aria-label={`Open tournament page: ${t.name}`}
                          onClick={() => handleTournamentSelect(t.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleTournamentSelect(t.id)
                            }
                          }}
                        >
                          <div>
                            <div className="tournament-name">{t.name}</div>
                            {t.country && (
                              <div className="tournament-meta">{t.country}</div>
                            )}
                          </div>
                          <span className="tournament-arrow">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <aside className="format-step-upcoming" aria-label="Upcoming tournaments">
              <h2 className="format-step-upcoming-title">Upcoming tournaments</h2>
              <p className="format-step-upcoming-sub">
                Not started or fully prepped — suggested start dates (soonest first). Filters below apply to this column and In progress.
              </p>

              <div className="format-step-filters">
                <label className="format-step-filter">
                  <span className="format-step-filter-label">Format</span>
                  <select
                    className="format-step-select"
                    value={upcomingFilterFormat}
                    onChange={(e) =>
                      setUpcomingFilterFormat(e.target.value as 'all' | CricketFormat)
                    }
                  >
                    <option value="all">All formats</option>
                    {FORMATS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="format-step-filter">
                  <span className="format-step-filter-label">Category</span>
                  <select
                    className="format-step-select"
                    value={upcomingFilterGender}
                    onChange={(e) => setUpcomingFilterGender(e.target.value as 'all' | Gender)}
                  >
                    <option value="all">All</option>
                    {GENDERS.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="format-step-filter format-step-filter-grow">
                  <span className="format-step-filter-label">Search</span>
                  <input
                    type="search"
                    className="format-step-search"
                    placeholder="Name or country…"
                    value={upcomingSearch}
                    onChange={(e) => setUpcomingSearch(e.target.value)}
                  />
                </label>
                <label className="format-step-filter format-step-filter-check">
                  <input
                    type="checkbox"
                    checked={upcomingHideFullyPrepped}
                    onChange={(e) => setUpcomingHideFullyPrepped(e.target.checked)}
                  />
                  <span>Hide fully prepped</span>
                </label>
                <label className="format-step-filter format-step-filter-check">
                  <input
                    type="checkbox"
                    checked={upcomingHideSrl}
                    onChange={(e) => setUpcomingHideSrl(e.target.checked)}
                  />
                  <span title="Simulated Reality League tournaments">Hide SRLs</span>
                </label>
              </div>

              <div className="format-step-upcoming-list-scroll">
              {upcomingRowsForFormat.length === 0 ? (
                <div className="format-step-upcoming-empty">No tournaments match these filters.</div>
              ) : (
                <ul className="format-step-upcoming-list">
                  {upcomingRowsForFormat.map((row) => {
                    const fmtInfo = FORMATS.find((f) => f.key === row.format)!
                    const genInfo = GENDERS.find((g) => g.key === row.gender)!
                    const { prepped, total } = row.prep
                    const prepRatio = total === 0 ? 0 : prepped / total
                    const prepHue = prepRatio * 120
                    return (
                      <li key={`${row.tournament.id}-${row.format}-${row.gender}`}>
                        <button
                          type="button"
                          className="format-step-upcoming-item"
                          title="Open tournament page"
                          onClick={() => handleUpcomingSelect(row)}
                        >
                          <div className="format-step-upcoming-item-top">
                            <span className="format-step-upcoming-date">
                              {row.startDate.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="format-step-upcoming-name">{row.tournament.name}</span>
                            <span className="format-step-upcoming-meta">
                              {fmtInfo.label} · {genInfo.label}
                              {row.tournament.country ? ` · ${row.tournament.country}` : ''}
                            </span>
                          </div>
                          <div className="format-step-prep">
                            <span className="format-step-prep-label">
                              {prepped}/{total} teams prepped
                            </span>
                            <div
                              className="format-step-prep-track"
                              role="progressbar"
                              aria-valuenow={prepped}
                              aria-valuemin={0}
                              aria-valuemax={Math.max(total, 1)}
                            >
                              <div
                                className="format-step-prep-fill"
                                style={{
                                  width: `${total === 0 ? 0 : (prepped / total) * 100}%`,
                                  background: `hsl(${prepHue}, 72%, 42%)`,
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              </div>
            </aside>

            <aside className="format-step-inprogress" aria-label="In progress tournaments">
              <h2 className="format-step-upcoming-title">In progress</h2>
              <p className="format-step-upcoming-sub">
                Tournaments where some teams have a saved squad but not all yet (same filters as Upcoming).
              </p>

              <div className="format-step-upcoming-list-scroll">
              {inProgressRowsForFormat.length === 0 ? (
                <div className="format-step-upcoming-empty">No tournaments in progress.</div>
              ) : (
                <ul className="format-step-upcoming-list">
                  {inProgressRowsForFormat.map((row) => {
                    const fmtInfo = FORMATS.find((f) => f.key === row.format)!
                    const genInfo = GENDERS.find((g) => g.key === row.gender)!
                    const { prepped, total } = row.prep
                    const prepRatio = total === 0 ? 0 : prepped / total
                    const prepHue = prepRatio * 120
                    return (
                      <li key={`inprog-${row.tournament.id}-${row.format}-${row.gender}`}>
                        <button
                          type="button"
                          className="format-step-upcoming-item format-step-inprogress-item"
                          title="Open tournament page"
                          onClick={() => handleUpcomingSelect(row)}
                        >
                          <div className="format-step-upcoming-item-top">
                            <div className="format-step-inprogress-date-row">
                              <span className="format-step-upcoming-date">
                                {row.startDate.toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="format-step-inprogress-badge">Resume</span>
                            </div>
                            <span className="format-step-upcoming-name">{row.tournament.name}</span>
                            <span className="format-step-upcoming-meta">
                              {fmtInfo.label} · {genInfo.label}
                              {row.tournament.country ? ` · ${row.tournament.country}` : ''}
                            </span>
                          </div>
                          <div className="format-step-prep">
                            <span className="format-step-prep-label">
                              {prepped}/{total} teams prepped
                            </span>
                            <div
                              className="format-step-prep-track"
                              role="progressbar"
                              aria-valuenow={prepped}
                              aria-valuemin={0}
                              aria-valuemax={Math.max(total, 1)}
                            >
                              <div
                                className="format-step-prep-fill"
                                style={{
                                  width: `${total === 0 ? 0 : (prepped / total) * 100}%`,
                                  background: `hsl(${prepHue}, 72%, 42%)`,
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              </div>
            </aside>

          </div>
        </>
      )}
    </div>
      </main>
    </div>
  )
}
