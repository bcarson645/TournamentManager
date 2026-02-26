'use client'

import { useState } from 'react'
import {
  FORMATS,
  GENDERS,
  TOURNAMENTS,
  type CricketFormat,
  type Gender,
} from './data/tournaments'
import Dashboard from './components/Dashboard'

type View = 'format' | 'gender' | 'tournaments' | 'dashboard'

export default function Home() {
  const [view, setView] = useState<View>('format')
  const [selectedFormat, setSelectedFormat] = useState<CricketFormat | null>(null)
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)

  function handleFormatSelect(format: CricketFormat) {
    setSelectedFormat(format)

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

  // Dashboard view – full-width layout, no page wrapper
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

  // Selection flow
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
      {/* Step indicator */}
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
          <p className="page-sub">Choose the format of cricket you want to manage.</p>
          <div className="card-grid">
            {FORMATS.map((f) => (
              <div
                key={f.key}
                className="card"
                onClick={() => handleFormatSelect(f.key)}
              >
                <div className="card-icon">{f.icon}</div>
                <div className="card-label">{f.label}</div>
                <div className="card-desc">{f.description}</div>
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
          <div className="card-grid">
            {GENDERS.map((g) => (
              <div
                key={g.key}
                className="card"
                onClick={() => handleGenderSelect(g.key)}
              >
                <div className="card-icon">{g.icon}</div>
                <div className="card-label">{g.label}</div>
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
              <div className="empty-state-icon">🏏</div>
              <p>No tournaments available yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Tournament data will be added soon.
              </p>
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
