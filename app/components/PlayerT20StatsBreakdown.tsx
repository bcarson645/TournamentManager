'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '../../lib/api/fetchJson'
import type {
  PlayerStatsBreakdown,
  SeasonBattingRow,
  SeasonBowlingRow,
  StatsScope,
  TournamentBattingRow,
  TournamentBowlingRow,
} from '../../lib/cricketDb/playerStatsBreakdown'

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n % 1 === 0) return String(n)
  return n.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function sr100(srPerBall: number | null): string {
  if (srPerBall == null || !Number.isFinite(srPerBall)) return '—'
  return fmt(srPerBall * 100, 2)
}

interface PlayerT20StatsBreakdownProps {
  playerName: string
  contextTournamentId?: string | null
  variant: 'batting' | 'bowling'
}

export default function PlayerT20StatsBreakdown({
  playerName,
  contextTournamentId = null,
  variant,
}: PlayerT20StatsBreakdownProps) {
  const [scope, setScope] = useState<StatsScope>('current')
  const [data, setData] = useState<PlayerStatsBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setScope('current')
  }, [playerName])

  useEffect(() => {
    if (!playerName.trim()) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      name: playerName,
      scope,
    })
    if (contextTournamentId) params.set('contextTournamentId', contextTournamentId)

    void (async () => {
      const result = await fetchJson<PlayerStatsBreakdown>(
        `/api/cricket/stats-breakdown?${params}`,
      )
      if (cancelled) return
      if (!result.ok) {
        setData(null)
        setError(result.error ?? 'Could not load T20 breakdown')
        setLoading(false)
        return
      }
      const json = result.data!
      setData(json)
      if (
        json.filterOptions?.length &&
        !json.filterOptions.some((o: { scope: StatsScope }) => o.scope === scope)
      ) {
        setScope(json.scope ?? 'all')
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [playerName, contextTournamentId, scope])

  if (!playerName.trim()) return null

  const title = data?.displayName ? `${data.displayName} T20 Stats` : 'T20 Stats'

  return (
    <div className="pp-t20-breakdown">
      <div className="pp-t20-breakdown-head">
        <h3 className="pp-t20-breakdown-title">{title}</h3>
        {data && data.filterOptions.length > 1 ? (
          <label className="pp-t20-filter">
            <span className="pp-t20-filter-label">Show</span>
            <select
              className="pp-t20-filter-select"
              value={scope}
              onChange={(e) => setScope(e.target.value as StatsScope)}
            >
              {data.filterOptions.map((o) => (
                <option key={o.scope} value={o.scope}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {loading ? <p className="pp-t20-muted">Loading tournament stats…</p> : null}
      {error && !loading ? <p className="pp-t20-muted">{error}</p> : null}

      {!loading && !error && data ? (
        <>
          {variant === 'batting' ? (
            <>
              <TournamentBattingTable rows={data.tournamentBatting} />
              <SeasonBattingTable rows={data.seasonBatting} />
            </>
          ) : (
            <>
              <TournamentBowlingTable rows={data.tournamentBowling} />
              <SeasonBowlingTable rows={data.seasonBowling} />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}

function TournamentBattingTable({ rows }: { rows: TournamentBattingRow[] }) {
  if (rows.length === 0) {
    return <p className="pp-t20-muted">No batting records for this filter.</p>
  }
  return (
    <div className="pp-t20-table-block">
      <h4 className="pp-t20-table-heading">Batting &amp; fielding</h4>
      <div className="pp-t20-table-wrap">
        <table className="pp-t20-table">
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Teams</th>
              <th>Mat</th>
              <th>Inns</th>
              <th>NO</th>
              <th className="pp-t20-th-em">Runs</th>
              <th>HS</th>
              <th>Ave</th>
              <th>BF</th>
              <th>SR</th>
              <th>100s</th>
              <th>50s</th>
              <th>4s</th>
              <th>6s</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.groupKey}>
                <td className="pp-t20-td-name">{r.tournamentName}</td>
                <td className="pp-t20-td-teams">{r.teamsLabel}</td>
                <td>{r.matches}</td>
                <td>{r.inns}</td>
                <td>{r.notOuts}</td>
                <td className="pp-t20-td-em">{r.runs}</td>
                <td>
                  {r.highScore}
                  {r.highScoreNotOut ? '*' : ''}
                </td>
                <td>{fmt(r.average)}</td>
                <td>{r.balls}</td>
                <td>{sr100(r.strikeRate)}</td>
                <td>{r.hundreds || '—'}</td>
                <td>{r.fifties || '—'}</td>
                <td>{r.fours || '—'}</td>
                <td>{r.sixes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TournamentBowlingTable({ rows }: { rows: TournamentBowlingRow[] }) {
  if (rows.length === 0) {
    return <p className="pp-t20-muted">No bowling records for this filter.</p>
  }
  return (
    <div className="pp-t20-table-block">
      <h4 className="pp-t20-table-heading">Bowling</h4>
      <div className="pp-t20-table-wrap">
        <table className="pp-t20-table">
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Teams</th>
              <th>Mat</th>
              <th>Inns</th>
              <th>Balls</th>
              <th>Runs</th>
              <th className="pp-t20-th-em">Wkts</th>
              <th>BBI</th>
              <th>Ave</th>
              <th>Econ</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.groupKey}>
                <td className="pp-t20-td-name">{r.tournamentName}</td>
                <td className="pp-t20-td-teams">{r.teamsLabel}</td>
                <td>{r.matches}</td>
                <td>{r.inns || '—'}</td>
                <td>{r.balls || '—'}</td>
                <td>{r.runs || '—'}</td>
                <td className="pp-t20-td-em">{r.wickets || '—'}</td>
                <td>{r.bestInnings ?? '—'}</td>
                <td>{fmt(r.average)}</td>
                <td>{fmt(r.economy)}</td>
                <td>{fmt(r.strikeRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SeasonBattingTable({ rows }: { rows: SeasonBattingRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="pp-t20-table-block pp-t20-table-block--season">
      <h4 className="pp-t20-table-heading">Year by year (batting)</h4>
      <p className="pp-t20-season-hint">Recent seasons first — compare form over time.</p>
      <div className="pp-t20-table-wrap">
        <table className="pp-t20-table pp-t20-table--compact">
          <thead>
            <tr>
              <th>Season</th>
              <th>Mat</th>
              <th>Inns</th>
              <th>Runs</th>
              <th>Ave</th>
              <th>SR</th>
              <th>50s</th>
              <th>100s</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.season}>
                <td className="pp-t20-td-name">{r.season}</td>
                <td>{r.matches}</td>
                <td>{r.inns}</td>
                <td className="pp-t20-td-em">{r.runs}</td>
                <td>{fmt(r.average)}</td>
                <td>{sr100(r.strikeRate)}</td>
                <td>{r.fifties || '—'}</td>
                <td>{r.hundreds || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SeasonBowlingTable({ rows }: { rows: SeasonBowlingRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="pp-t20-table-block pp-t20-table-block--season">
      <h4 className="pp-t20-table-heading">Year by year (bowling)</h4>
      <p className="pp-t20-season-hint">Recent seasons first — compare form over time.</p>
      <div className="pp-t20-table-wrap">
        <table className="pp-t20-table pp-t20-table--compact">
          <thead>
            <tr>
              <th>Season</th>
              <th>Mat</th>
              <th>Inns</th>
              <th>Wkts</th>
              <th>Ave</th>
              <th>Econ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.season}>
                <td className="pp-t20-td-name">{r.season}</td>
                <td>{r.matches}</td>
                <td>{r.inns || '—'}</td>
                <td className="pp-t20-td-em">{r.wickets || '—'}</td>
                <td>{fmt(r.average)}</td>
                <td>{fmt(r.economy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
