'use client'

import { useState, useMemo } from 'react'
import { Fixture, generateFixtures } from '../data/fixtures'
import { Team } from '../data/teams'

interface FixtureListProps {
  teams: Team[]
  tournamentId: string
}

export default function FixtureList({ teams, tournamentId }: FixtureListProps) {
  const fixtures = useMemo(
    () => generateFixtures(teams, tournamentId),
    [teams, tournamentId],
  )

  const matchdays = useMemo(() => {
    const map = new Map<number, Fixture[]>()
    for (const f of fixtures) {
      const list = map.get(f.matchday) ?? []
      list.push(f)
      map.set(f.matchday, list)
    }
    return Array.from(map.entries())
  }, [fixtures])

  const [currentIdx, setCurrentIdx] = useState(0)

  if (fixtures.length === 0 || matchdays.length === 0) {
    return (
      <div className="empty-state">
        <p>Not enough teams to generate fixtures.</p>
      </div>
    )
  }

  const safeIdx = Math.min(currentIdx, matchdays.length - 1)
  const [md, matches] = matchdays[safeIdx]
  const firstMatch = matches[0]
  const isSemi = firstMatch.stage === 'semi'
  const isFinal = firstMatch.stage === 'final'
  const heading = isFinal
    ? 'Final'
    : isSemi
    ? 'Semi-Finals'
    : `Matchday ${md}`

  function stageLabel(f: Fixture): string | null {
    if (f.stage === 'semi') return 'Semi-Final'
    if (f.stage === 'final') return 'Final'
    return null
  }

  return (
    <div className="fixture-list">
      <div className="fixture-nav">
        <button
          className="fixture-nav-btn"
          disabled={safeIdx === 0}
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
        </button>
        <div className="fixture-nav-info">
          <span className="fixture-nav-title">{heading}</span>
          <span className="fixture-nav-date">{firstMatch.date}</span>
        </div>
        <button
          className="fixture-nav-btn"
          disabled={safeIdx === matchdays.length - 1}
          onClick={() => setCurrentIdx((i) => Math.min(matchdays.length - 1, i + 1))}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" /></svg>
        </button>
      </div>

      <div className="fixture-counter">
        {safeIdx + 1} / {matchdays.length}
      </div>

      <div className={`fixture-matchday ${isSemi || isFinal ? 'fixture-knockout' : ''}`}>
        <div className="fixture-matches">
          {matches.map((f) => (
            <div key={f.id} className={`fixture-match ${f.stage !== 'group' ? 'fixture-match-tbc' : ''}`}>
              <span className="fixture-home">{f.homeTeam}</span>
              <span className="fixture-vs">vs</span>
              <span className="fixture-away">{f.awayTeam}</span>
              {stageLabel(f) && (
                <span className="fixture-stage-badge">{stageLabel(f)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
