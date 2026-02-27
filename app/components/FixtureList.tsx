'use client'

import { useMemo } from 'react'
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

  if (fixtures.length === 0) {
    return (
      <div className="empty-state">
        <p>Not enough teams to generate fixtures.</p>
      </div>
    )
  }

  // Group by matchday
  const matchdays = new Map<number, Fixture[]>()
  for (const f of fixtures) {
    const list = matchdays.get(f.matchday) ?? []
    list.push(f)
    matchdays.set(f.matchday, list)
  }

  function stageLabel(f: Fixture): string | null {
    if (f.stage === 'semi') return 'Semi-Final'
    if (f.stage === 'final') return 'Final'
    return null
  }

  return (
    <div className="fixture-list">
      {Array.from(matchdays.entries()).map(([md, matches]) => {
        const firstMatch = matches[0]
        const isSemi = firstMatch.stage === 'semi'
        const isFinal = firstMatch.stage === 'final'
        const heading = isFinal
          ? 'Final'
          : isSemi
          ? 'Semi-Finals'
          : `Matchday ${md}`

        return (
          <div key={md} className={`fixture-matchday ${isSemi || isFinal ? 'fixture-knockout' : ''}`}>
            <div className="fixture-md-header">
              <span className="fixture-md-title">{heading}</span>
              <span className="fixture-md-date">{firstMatch.date}</span>
            </div>
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
        )
      })}
    </div>
  )
}
