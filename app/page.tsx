'use client'

import { useMemo, useState } from 'react'
import {
  FORMATS,
  GENDERS,
  TOURNAMENTS,
  type CricketFormat,
  type Gender,
} from './data/tournaments'
import { TEAMS } from './data/teams'
import Dashboard from './components/Dashboard'

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

export default function Home() {
  const [view, setView] = useState<View>('format')
  const [selectedFormat, setSelectedFormat] = useState<CricketFormat | null>(null)
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const searchIndex = useMemo(buildSearchIndex, [])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return searchIndex
      .filter((r) => r.label.toLowerCase().includes(q) || r.sublabel.toLowerCase().includes(q))
      .slice(0, 12)
  }, [searchQuery, searchIndex])

  function handleFormatSelect(format: CricketFormat) {
    setSelectedFormat(format)
    setSearchQuery('')

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
    setView('tournaments')
  }

  function handleTournamentSelect(tournamentId: string) {
    setSelectedTournamentId(tournamentId)
    setView('dashboard')
  }

  function handleSearchSelect(result: SearchResult) {
    setSelectedFormat(result.format)
    setSelectedGender(result.gender)
    setSelectedTournamentId(result.tournamentId)
    setSearchQuery('')
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
    setView('dashboard')
  }

  function handleGoHome() {
    setSelectedFormat(null)
    setSelectedGender(null)
    setSelectedTournamentId(null)
    setSearchQuery('')
    setView('format')
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
    } else if (view === 'gender') {
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
        onSelectTournament={handleDashboardSelectTournament}
        onGoHome={handleGoHome}
      />
    )
  }

  const stepIndex = view === 'format' ? 0 : view === 'gender' ? 1 : 2
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

  return (
    <div className="page">
      <div className="steps">
        <div className={`step-dot ${stepIndex === 0 ? 'active' : stepIndex > 0 ? 'done' : ''}`}>1</div>
        <div className={`step-line ${stepIndex > 0 ? 'done' : ''}`} />
        <div className={`step-dot ${stepIndex === 1 ? 'active' : stepIndex > 1 ? 'done' : ''}`}>2</div>
        <div className={`step-line ${stepIndex > 1 ? 'done' : ''}`} />
        <div className={`step-dot ${stepIndex === 2 ? 'active' : ''}`}>3</div>
      </div>

      {/* Step 1: Format selection */}
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

      {/* Step 2: Gender selection */}
      {view === 'gender' && (
        <>
          <button className="back-btn" onClick={goBack}>
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

      {/* Step 3: Tournaments list */}
      {view === 'tournaments' && (
        <>
          <button className="back-btn" onClick={goBack}>
            ← Back to category
          </button>
          <h1 className="page-heading">
            {formatLabel} — {genderLabel} Tournaments
          </h1>
          <p className="page-sub">
            Select a tournament to manage teams and players.
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
                  onClick={() => handleTournamentSelect(t.id)}
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
  )
}
