'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { computeFixtureMatchModel } from '../data/fixtureMatchModel'
import { getTeamsByTournament } from '../data/teams'
import { getTournamentLiveData, type FormResult } from '../data/tournamentLiveData'
import {
  getSimulatorStoreVersion,
  subscribeSimulatorStore,
} from '../data/outrightSimulatorStore'
import type { CricketFormat } from '../data/tournaments'
import { formatOutrightOddsValue } from './OutrightOddsCell'

type FixturesView = 'fixtures' | 'results'

const FIXTURES_PAGE_SIZE = 6

function FixturesPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  label,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  label: string
}) {
  if (totalItems === 0 || totalPages <= 1) return null

  const from = page * FIXTURES_PAGE_SIZE + 1
  const to = Math.min(totalItems, (page + 1) * FIXTURES_PAGE_SIZE)

  return (
    <div className="outrights-fixtures-pagination" aria-label={label + ' pagination'}>
      <button
        type="button"
        className="outrights-fixtures-page-btn"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="outrights-fixtures-page-status">
        {from}–{to} of {totalItems}
      </span>
      <div className="outrights-fixtures-page-tabs" role="tablist" aria-label={label + ' pages'}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={page === i}
            className={'outrights-fixtures-page-tab' + (page === i ? ' outrights-fixtures-page-tab--active' : '')}
            onClick={() => onPageChange(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="outrights-fixtures-page-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  )
}

function statCell(value: number | undefined): string {
  return value === undefined ? '\u2014' : String(value)
}

function FormBadge({ result }: { result: FormResult }) {
  return (
    <span className={'home-form-badge home-form-badge--' + result.toLowerCase()}>{result}</span>
  )
}

function TeamBadge({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase()
  return <span className="home-team-badge" aria-hidden>{initial}</span>
}

function formatWinProb(prob: number): string {
  return (prob * 100).toFixed(1) + '%'
}

function fixtureMatchLabel(fixture: { matchNumber?: number; matchday: number; stage?: string }): string {
  if (fixture.stage === 'qualifier') return 'Qualifier'
  if (fixture.stage === 'final') return 'Final'
  return fixture.matchNumber ? `Match ${fixture.matchNumber}` : `MD ${fixture.matchday}`
}

function isFixtureTba(fixture: { homeTeamId: string; awayTeamId: string; stage?: string }): boolean {
  return fixture.stage === 'qualifier' || fixture.stage === 'final' || !fixture.homeTeamId || !fixture.awayTeamId
}

export function TournamentPointsTable({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string
  tournamentName: string
}) {
  const teams = getTeamsByTournament(tournamentId)
  const live = useMemo(() => getTournamentLiveData(tournamentId), [tournamentId])
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  if (!live || teams.length === 0) {
    return (
      <section className="outrights-live-card outrights-live-card--table">
        <h2 className="outrights-live-card-title">Points table</h2>
        <p className="outrights-content-empty">No live table data for this tournament yet.</p>
      </section>
    )
  }

  return (
    <section className="outrights-live-card outrights-live-card--table" aria-label={tournamentName + ' points table'}>
      <h2 className="outrights-live-card-title">{tournamentName} — Points table</h2>
      <div className="outrights-points-table-wrap">
        <table className="outrights-points-table">
          <thead>
            <tr>
              <th className="outrights-points-th-team">Teams</th>
              <th>M</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>N/R</th>
              <th className="outrights-points-th-pts">PTS</th>
              <th>Form</th>
              <th className="outrights-points-th-next">Next</th>
            </tr>
          </thead>
          <tbody>
            {live.standings.map((row) => {
              const team = teamById.get(row.teamId)
              if (!team) return null
              return (
                <tr key={row.teamId} className={row.qualifyHighlight ? 'outrights-points-row--qualify' : undefined}>
                  <td className="outrights-points-team-cell">
                    <span className="outrights-points-rank">{row.rank}</span>
                    <TeamBadge name={team.name} />
                    <span className="outrights-points-team-name">{team.name}</span>
                  </td>
                  <td>{statCell(row.played)}</td>
                  <td>{statCell(row.won)}</td>
                  <td>{statCell(row.lost)}</td>
                  <td>{statCell(row.tied)}</td>
                  <td>{statCell(row.noResult)}</td>
                  <td className="outrights-points-pts">{statCell(row.points)}</td>
                  <td className="outrights-points-form-cell">
                    {row.form && row.form.length > 0 ? (
                      <span className="home-form-badges">
                        {row.form.map((f, i) => (
                          <FormBadge key={i} result={f} />
                        ))}
                      </span>
                    ) : (
                      '\u2014'
                    )}
                  </td>
                  <td className="outrights-points-next-cell">
                    {row.nextOpponents.length > 0 ? (
                      <span className="home-next-fixtures">
                        {row.nextOpponents.map((code, i) => (
                          <span key={code + i}>
                            {i > 0 ? ', ' : ''}
                            <span className="home-next-code">{code}</span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      '\u2014'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function TournamentUpcomingFixtures({
  tournamentId,
  format,
  embedded = false,
}: {
  tournamentId: string
  format: CricketFormat
  embedded?: boolean
}) {
  const [view, setView] = useState<FixturesView>('fixtures')
  const [showModelOdds, setShowModelOdds] = useState(false)
  const [fixturesPage, setFixturesPage] = useState(0)
  const [resultsPage, setResultsPage] = useState(0)
  const teams = getTeamsByTournament(tournamentId)
  const live = useMemo(() => getTournamentLiveData(tournamentId), [tournamentId])
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  useSyncExternalStore(
    subscribeSimulatorStore,
    getSimulatorStoreVersion,
    getSimulatorStoreVersion,
  )

  function teamName(teamId: string): string {
    return teamById.get(teamId)?.name ?? teamId
  }

  const cardClassName =
    'outrights-live-card outrights-live-card--fixtures' + (embedded ? ' outrights-live-card--embedded' : '')

  if (!live) {
    return (
      <section className={cardClassName}>
        {!embedded ? (
          <div className="outrights-live-card-head">
            <h2 className="outrights-live-card-title">Fixtures & results</h2>
          </div>
        ) : null}
        <p className="outrights-content-empty">No fixtures scheduled.</p>
      </section>
    )
  }

  const results = live.completedResults ?? []
  const fixtures = live.upcomingFixtures

  const fixturesTotalPages = Math.max(1, Math.ceil(fixtures.length / FIXTURES_PAGE_SIZE))
  const resultsTotalPages = Math.max(1, Math.ceil(results.length / FIXTURES_PAGE_SIZE))
  const safeFixturesPage = Math.min(fixturesPage, fixturesTotalPages - 1)
  const safeResultsPage = Math.min(resultsPage, resultsTotalPages - 1)
  const visibleFixtures = fixtures.slice(
    safeFixturesPage * FIXTURES_PAGE_SIZE,
    safeFixturesPage * FIXTURES_PAGE_SIZE + FIXTURES_PAGE_SIZE,
  )
  const visibleResults = results.slice(
    safeResultsPage * FIXTURES_PAGE_SIZE,
    safeResultsPage * FIXTURES_PAGE_SIZE + FIXTURES_PAGE_SIZE,
  )

  useEffect(() => {
    setFixturesPage(0)
    setResultsPage(0)
  }, [view, tournamentId])

  useEffect(() => {
    setFixturesPage((p) => Math.min(p, fixturesTotalPages - 1))
  }, [fixtures.length, fixturesTotalPages])

  useEffect(() => {
    setResultsPage((p) => Math.min(p, resultsTotalPages - 1))
  }, [results.length, resultsTotalPages])

  return (
    <section className={cardClassName} aria-label="Fixtures and results">
      <div className={'outrights-live-card-head' + (embedded ? ' outrights-live-card-head--embedded' : '')}>
        {!embedded ? <h2 className="outrights-live-card-title">Fixtures & results</h2> : null}
        <div className="outrights-fixtures-head-controls">
          <div className="outrights-fixtures-view-toggle" role="tablist" aria-label="Fixtures or results">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'results'}
              className={'outrights-fixtures-view-btn' + (view === 'results' ? ' outrights-fixtures-view-btn--active' : '')}
              onClick={() => setView('results')}
            >
              Results
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'fixtures'}
              className={'outrights-fixtures-view-btn' + (view === 'fixtures' ? ' outrights-fixtures-view-btn--active' : '')}
              onClick={() => setView('fixtures')}
            >
              Fixtures
            </button>
          </div>
          {view === 'fixtures' ? (
            <button
              type="button"
              className={'outrights-fixtures-model-toggle' + (showModelOdds ? ' outrights-fixtures-model-toggle--active' : '')}
              aria-pressed={showModelOdds}
              onClick={() => setShowModelOdds((on) => !on)}
            >
              Model odds
            </button>
          ) : null}
        </div>
      </div>

      {view === 'fixtures' ? (
        fixtures.length === 0 ? (
          <p className="outrights-content-empty">No upcoming fixtures scheduled.</p>
        ) : (
          <>
          <ul className={'outrights-fixtures-list' + (showModelOdds ? ' outrights-fixtures-list--model' : '')}>
            {visibleFixtures.map((fixture) => {
              const tba = isFixtureTba(fixture)
              const model =
                showModelOdds && !tba
                  ? computeFixtureMatchModel(
                      tournamentId,
                      fixture.homeTeamId,
                      fixture.awayTeamId,
                      format,
                      fixture.id,
                    )
                  : null
              const homeCode = live.teamCodes[fixture.homeTeamId] ?? '?'
              const awayCode = live.teamCodes[fixture.awayTeamId] ?? '?'

              return (
                <li key={fixture.id} className="outrights-fixtures-item">
                  <div className="outrights-fixtures-when">
                    <span className="outrights-fixtures-date">{fixture.dateLabel}</span>
                    <span className="outrights-fixtures-time">{fixture.time}</span>
                    <span className="outrights-fixtures-md">{fixtureMatchLabel(fixture)}</span>
                    {fixture.venue ? (
                      <span className="outrights-fixtures-venue">{fixture.venue}</span>
                    ) : null}
                  </div>
                  <div className="outrights-fixtures-match">
                    {tba ? (
                      <span className="outrights-fixtures-team outrights-fixtures-team--tba">TBA vs TBA</span>
                    ) : model ? (
                      <div className="outrights-fixtures-teams-with-model" aria-label="Match model win probabilities">
                        <div className="outrights-fixtures-team-row">
                          <span className="outrights-fixtures-team">{teamName(fixture.homeTeamId)}</span>
                          <span className="outrights-fixtures-model-inline">
                            <span className="outrights-fixtures-model-prob">{formatWinProb(model.homeWinProb)}</span>
                            <span className="outrights-fixtures-model-price">{formatOutrightOddsValue(model.homeFairPrice)}</span>
                          </span>
                        </div>
                        <div className="outrights-fixtures-team-row">
                          <span className="outrights-fixtures-team">{teamName(fixture.awayTeamId)}</span>
                          <span className="outrights-fixtures-model-inline">
                            <span className="outrights-fixtures-model-prob">{formatWinProb(model.awayWinProb)}</span>
                            <span className="outrights-fixtures-model-price">{formatOutrightOddsValue(model.awayFairPrice)}</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="outrights-fixtures-team">{teamName(fixture.homeTeamId)}</span>
                        <span className="outrights-fixtures-vs">vs</span>
                        <span className="outrights-fixtures-team">{teamName(fixture.awayTeamId)}</span>
                      </>
                    )}
                  </div>
                  {!model ? (
                    <span className="outrights-fixtures-codes">
                      {homeCode} v {awayCode}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
          <FixturesPagination
            page={safeFixturesPage}
            totalPages={fixturesTotalPages}
            totalItems={fixtures.length}
            onPageChange={setFixturesPage}
            label="Fixtures"
          />
          </>
        )
      ) : results.length === 0 ? (
        <p className="outrights-content-empty">No results recorded yet.</p>
      ) : (
        <>
        <ul className="outrights-fixtures-list outrights-results-list">
          {visibleResults.map((result) => {
            const homeWon = result.winnerTeamId === result.homeTeamId
            const awayWon = result.winnerTeamId === result.awayTeamId
            return (
              <li key={result.id} className="outrights-fixtures-item outrights-results-item">
                <div className="outrights-fixtures-when">
                  <span className="outrights-fixtures-date">{result.dateLabel}</span>
                  <span className="outrights-fixtures-time">{result.time}</span>
                  <span className="outrights-fixtures-md">{result.matchNumber ? `Match ${result.matchNumber}` : `MD ${result.matchday}`}</span>
                  {result.venue ? (
                    <span className="outrights-fixtures-venue">{result.venue}</span>
                  ) : null}
                </div>
                <div className="outrights-results-match">
                  <div className={'outrights-results-team-row' + (homeWon ? ' outrights-results-team-row--winner' : '')}>
                    <span className="outrights-fixtures-team">{teamName(result.homeTeamId)}</span>
                    <span className="outrights-results-score">{result.homeScore}</span>
                  </div>
                  <div className={'outrights-results-team-row' + (awayWon ? ' outrights-results-team-row--winner' : '')}>
                    <span className="outrights-fixtures-team">{teamName(result.awayTeamId)}</span>
                    <span className="outrights-results-score">{result.awayScore}</span>
                  </div>
                  <span className="outrights-results-summary">{result.resultSummary}</span>
                </div>
                <span className="outrights-fixtures-codes">
                  {live.teamCodes[result.homeTeamId] ?? '?'} v {live.teamCodes[result.awayTeamId] ?? '?'}
                </span>
              </li>
            )
          })}
        </ul>
        <FixturesPagination
          page={safeResultsPage}
          totalPages={resultsTotalPages}
          totalItems={results.length}
          onPageChange={setResultsPage}
          label="Results"
        />
        </>
      )}
    </section>
  )
}
