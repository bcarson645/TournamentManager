'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  getTournamentPerformanceData,
  type PerformancePlayer,
} from '../data/tournamentPerformanceData'
import { getPerformancePlayerMarketInfo } from '../data/performanceMarketData'
import { useTournamentOutrights } from '../hooks/useTournamentOutrights'
import { formatOutrightOddsValue } from './OutrightOddsCell'
import type { OutrightType, TournamentOutright } from '../data/outrightsStore'
import { getSquadStoreVersion, subscribeSquadStore } from '../data/squadStore'
import { formatSquadRatingDisplay, readSquadRatingDp } from '../data/ratingDisplaySettings'

interface TournamentTopPerformancesProps {
  tournamentId: string
}

interface PerformanceTableProps {
  title: string
  players: PerformancePlayer[]
  primaryLabel: string
  ratingLabel: string
  marketType: 'top-batter' | 'top-bowler'
  marketOutright: TournamentOutright | undefined
  tournamentId: string
  formatPrimary: (value: number) => string
}

const TOP_COUNT = 10

function formatAverage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatRanking(value: number | undefined): string {
  return value === undefined ? '\u2014' : String(value)
}

function formatTmRating(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return ''
  return formatSquadRatingDisplay(value, readSquadRatingDp())
}

function PerformanceTable({
  title,
  players,
  primaryLabel,
  ratingLabel,
  marketType,
  marketOutright,
  tournamentId,
  formatPrimary,
}: PerformanceTableProps) {
  const visible = players.slice(0, TOP_COUNT)

  return (
    <article className="outrights-performance-card">
      <div className="outrights-performance-card-head">
        <h3 className="outrights-performance-card-title">{title}</h3>
      </div>
      <div className="outrights-performance-table-wrap">
        <table className="outrights-performance-table">
          <thead>
            <tr>
              <th className="outrights-performance-th-rank" scope="col">#</th>
              <th className="outrights-performance-th-player" scope="col">Player</th>
              <th className="outrights-performance-th-team" scope="col">Team</th>
              <th scope="col">Inn</th>
              <th scope="col">Avg</th>
              <th className="outrights-performance-th-rating" scope="col">{ratingLabel}</th>
              <th className="outrights-performance-th-primary" scope="col">{primaryLabel}</th>
              <th scope="col">Rank</th>
              <th className="outrights-performance-th-price" scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((player, index) => {
              const market = getPerformancePlayerMarketInfo(
                tournamentId,
                player,
                marketType,
                marketOutright,
              )
              const ratingText = formatTmRating(player.rating)
              return (
                <tr key={player.id}>
                  <td className="outrights-performance-rank">{index + 1}</td>
                  <td className="outrights-performance-player-cell">
                    <span className="outrights-performance-avatar" aria-hidden>
                      {player.name.charAt(0)}
                    </span>
                    <span className="outrights-performance-name">{player.name}</span>
                  </td>
                  <td className="outrights-performance-team-cell">
                    <span className="outrights-performance-team-code">{player.teamCode}</span>
                    {player.hand ? (
                      <span className="outrights-performance-hand">{player.hand}</span>
                    ) : null}
                  </td>
                  <td className="outrights-performance-num">{player.innings}</td>
                  <td className="outrights-performance-num">{formatAverage(player.average)}</td>
                  <td className="outrights-performance-rating">{ratingText}</td>
                  <td className="outrights-performance-primary">{formatPrimary(player.primaryStat)}</td>
                  <td className="outrights-performance-market-rank">{formatRanking(market.ranking)}</td>
                  <td className="outrights-performance-price">
                    <span className="outrights-performance-price-value">
                      {formatOutrightOddsValue(market.currentPrice)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function findMarketOutright(
  outrights: TournamentOutright[],
  type: OutrightType,
): TournamentOutright | undefined {
  return outrights.find((outright) => outright.type === type)
}

export default function TournamentTopPerformances({ tournamentId }: TournamentTopPerformancesProps) {
  const squadVersion = useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, getSquadStoreVersion)
  const data = useMemo(
    () => getTournamentPerformanceData(tournamentId),
    [tournamentId, squadVersion],
  )
  const outrights = useTournamentOutrights(tournamentId)
  const topBatterMarket = useMemo(
    () => findMarketOutright(outrights, 'top-batter'),
    [outrights],
  )
  const topBowlerMarket = useMemo(
    () => findMarketOutright(outrights, 'top-bowler'),
    [outrights],
  )

  return (
    <section className="outrights-performances-section" aria-label="Top performances">
      <h2 className="outrights-performances-heading">Top Performances</h2>
      <div className="outrights-performances-grid outrights-performances-grid--two">
        <PerformanceTable
          title="Top Run Scorers"
          players={data.runScorers}
          primaryLabel="Runs"
          ratingLabel="Bat rating"
          marketType="top-batter"
          marketOutright={topBatterMarket}
          tournamentId={tournamentId}
          formatPrimary={(v) => String(Math.round(v))}
        />
        <PerformanceTable
          title="Top Wicket Takers"
          players={data.wicketTakers}
          primaryLabel="Wkts"
          ratingLabel="Bowl rating"
          marketType="top-bowler"
          marketOutright={topBowlerMarket}
          tournamentId={tournamentId}
          formatPrimary={(v) => String(Math.round(v))}
        />
      </div>
    </section>
  )
}
