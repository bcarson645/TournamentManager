'use client'

import { useState, useEffect, useMemo } from 'react'

interface RankEntry {
  id: string
  name: string
  teamName?: string
  rating: number
}

type ValueSemantics = 'higher-better' | 'lower-better'

interface PlayerRankingsProps {
  title: string
  entries: RankEntry[]
  emptyLabel: string
  /** Players in the open squad, highlighted like the tournament team table. */
  highlightPlayerIds?: ReadonlySet<string> | string[] | null
  pageSize?: number
  /** Heading strip: batting = blue, bowling = red */
  accent?: 'batting' | 'bowling' | 'neutral'
  /** How to format the numeric cell (default: one decimal). */
  formatValue?: (n: number) => string
  /** For pill coloring: lower is better (econ, avg, balls/wkt). */
  valueSemantics?: ValueSemantics
}

export default function PlayerRankings({
  title,
  entries,
  emptyLabel,
  highlightPlayerIds = null,
  pageSize: pageSizeProp = 10,
  accent = 'neutral',
  formatValue,
  valueSemantics = 'higher-better',
}: PlayerRankingsProps) {
  const [page, setPage] = useState(0)
  const pageSize = pageSizeProp > 0 ? pageSizeProp : 10

  function displayValue(n: number): string {
    if (formatValue) return formatValue(n)
    if (!Number.isFinite(n)) return '—'
    return n.toFixed(2)
  }

  function valueClass(n: number): string {
    if (!Number.isFinite(n)) return ''
    if (valueSemantics === 'lower-better') {
      return n <= 0 ? '' : ' rating-pos'
    }
    return n > 0 ? ' rating-pos' : n < 0 ? ' rating-neg' : ''
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)))
  }, [entries.length, totalPages])

  const highlight = useMemo(() => {
    if (highlightPlayerIds == null) return new Set<string>()
    return highlightPlayerIds instanceof Set
      ? highlightPlayerIds
      : new Set(highlightPlayerIds)
  }, [highlightPlayerIds])

  const listOffset = page * pageSize
  const visible = entries.slice(listOffset, listOffset + pageSize)
  const showTabs = entries.length > pageSize
  const olStart = listOffset + 1

  const accentClass =
    accent === 'batting'
      ? ' rankings-panel--accent-bat'
      : accent === 'bowling'
        ? ' rankings-panel--accent-bowl'
        : ''

  return (
    <div className={'rankings-panel' + accentClass}>
      <h3 className="rankings-title">{title}</h3>

      {entries.length === 0 ? (
        <div className="rankings-empty">
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <>
          {showTabs && (
            <div className="rankings-dots" role="tablist" aria-label={title + ' pages'}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={page === i}
                  aria-label={'Page ' + (i + 1) + ' of ' + totalPages}
                  className={'rankings-dot' + (page === i ? ' rankings-dot-active' : '')}
                  onClick={() => setPage(i)}
                />
              ))}
            </div>
          )}

          <ol className="rankings-list" start={olStart}>
            {visible.map((p, i) => {
              const rank = listOffset + i + 1
              const isCurrent = highlight.size > 0 && highlight.has(p.id)
              return (
                <li
                  key={p.id + '-' + String(rank)}
                  className={'rankings-item' + (isCurrent ? ' rankings-item-current' : '')}
                >
                  <span className="rankings-rank">{rank}</span>
                  <div className="rankings-info">
                    <span className="rankings-name">{p.name}</span>
                    {p.teamName ? <span className="rankings-team">{p.teamName}</span> : null}
                  </div>
                  <span
                    className={
                      'rankings-value' +
                      valueClass(p.rating)
                    }
                  >
                    {displayValue(p.rating)}
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}
