'use client'

interface RankEntry {
  id: string
  name: string
  teamName?: string
  rating: number
}

interface PlayerRankingsProps {
  title: string
  entries: RankEntry[]
  emptyLabel: string
}

export default function PlayerRankings({
  title,
  entries,
  emptyLabel,
}: PlayerRankingsProps) {
  return (
    <div className="rankings-panel">
      <h3 className="rankings-title">{title}</h3>

      {entries.length === 0 ? (
        <div className="rankings-empty">
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <ol className="rankings-list">
          {entries.map((p, i) => (
            <li key={p.id} className="rankings-item">
              <span className="rankings-rank">{i + 1}</span>
              <div className="rankings-info">
                <span className="rankings-name">{p.name}</span>
                {p.teamName && <span className="rankings-team">{p.teamName}</span>}
              </div>
              <span className={`rankings-value ${p.rating > 0 ? 'rating-pos' : p.rating < 0 ? 'rating-neg' : ''}`}>
                {p.rating.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
