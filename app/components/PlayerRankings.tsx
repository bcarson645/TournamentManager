'use client'

import { Player } from '../data/teams'

interface PlayerRankingsProps {
  title: string
  players: Player[]
  ratingKey: 'battingRating' | 'bowlingRating'
  emptyLabel: string
}

export default function PlayerRankings({
  title,
  players,
  ratingKey,
  emptyLabel,
}: PlayerRankingsProps) {
  return (
    <div className="rankings-panel">
      <h3 className="rankings-title">{title}</h3>

      {players.length === 0 ? (
        <div className="rankings-empty">
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <ol className="rankings-list">
          {players.map((p, i) => (
            <li key={p.id} className="rankings-item">
              <span className="rankings-rank">{i + 1}</span>
              <div className="rankings-info">
                <span className="rankings-name">{p.name}</span>
              </div>
              <span className="rankings-value">
                {p[ratingKey].toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
