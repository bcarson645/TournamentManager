'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { fetchJson } from '../../lib/api/fetchJson'
import { GROUNDS } from '../data/grounds'
import { getTeamLogo } from '../data/logoStore'
import { getEffectiveBio } from '../data/playerBioStore'
import type { SquadPlayer } from '../data/squad'
import {
  getSquadForTeam,
  getSquadStoreVersion,
  getStoredSquad,
  getTeamBatRatingTotal,
  getTeamBowlRatingTotal,
  subscribeSquadStore,
} from '../data/squadStore'
import {
  formatChipForTournamentFormat,
  matchPassesFormatChip,
  summarizeTeamMatches,
  type StatzTeamFormatChip,
  type StatzTeamMatch,
  type StatzTeamPayload,
} from '../data/statzTeam'
import { getTeamsByTournament } from '../data/teams'
import { getAllTournamentEntries, type CricketFormat } from '../data/tournaments'
import { useTournamentOptions } from '../hooks/useTournamentOptions'
import { HubTeamCharts, ThpFormStrip } from './HubTeamCharts'

const FORMAT_CHIPS: StatzTeamFormatChip[] = ['T20', 'ODI', 'Test']

const SISTER_TOURNAMENT: Record<StatzTeamFormatChip, string> = {
  T20: 't20-m-intl',
  ODI: 'la-m-odi',
  Test: 'fc-m-test',
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase()
  return `${parts[0]?.charAt(0) ?? ''}${parts[parts.length - 1]?.charAt(0) ?? ''}`.toUpperCase()
}

function isPlaceholderName(name: string): boolean {
  return /^player \d+$/i.test(name.trim())
}

function tournamentLabel(tournamentId: string): string {
  for (const e of getAllTournamentEntries()) {
    if (e.tournament.id === tournamentId) return e.tournament.name
  }
  return tournamentId
}

function tournamentFormat(tournamentId: string): CricketFormat | undefined {
  return getAllTournamentEntries().find((e) => e.tournament.id === tournamentId)?.format
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase()
  const nb = b.trim().toLowerCase()
  if (na === nb) return true
  const pa = na.split(/\s+/)
  const pb = nb.split(/\s+/)
  if (pa.length === 0 || pb.length === 0) return false
  if (pa[pa.length - 1] !== pb[pb.length - 1]) return false
  const fa = pa[0]
  const fb = pb[0]
  return fa === fb || fa.startsWith(fb) || fb.startsWith(fa)
}

function findSquadPlayerByName(players: SquadPlayer[], name: string): SquadPlayer | null {
  return players.find((p) => namesLikelyMatch(p.name, name)) ?? null
}

function sisterTeam(teamName: string, chip: StatzTeamFormatChip): { teamId: string; tournamentId: string } | null {
  const tournamentId = SISTER_TOURNAMENT[chip]
  const team = getTeamsByTournament(tournamentId).find(
    (t) => t.name.toLowerCase() === teamName.toLowerCase(),
  )
  return team ? { teamId: team.id, tournamentId } : null
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

function resultLetter(result: StatzTeamMatch['result']): 'W' | 'L' | 'A' | '·' {
  if (result === 'Won') return 'W'
  if (result === 'Lost') return 'L'
  if (result === 'Abandoned') return 'A'
  return '·'
}

export default function HubTeamProfile({
  tournamentId,
  teamId,
  playerQuery,
  onPlayerQuery,
  onBack,
  onBackToLeagues,
  onOpenPlayer,
  onOpenTeam,
}: {
  tournamentId: string
  teamId: string
  playerQuery: string
  onPlayerQuery: (q: string) => void
  onBack: () => void
  onBackToLeagues: () => void
  onOpenPlayer: (playerName: string) => void
  onOpenTeam?: (teamId: string, tournamentId: string) => void
}) {
  const squadVersion = useSyncExternalStore(
    subscribeSquadStore,
    getSquadStoreVersion,
    getSquadStoreVersion,
  )
  void squadVersion

  const teams = getTeamsByTournament(tournamentId)
  const team = teams.find((t) => t.id === teamId) ?? null
  const squad = useMemo(() => getSquadForTeam(teamId), [teamId, squadVersion])
  const { ratingParScore } = useTournamentOptions(tournamentId)
  const stored = getStoredSquad(teamId)
  const ground = stored?.groundId ? GROUNDS.find((g) => g.id === stored.groundId) ?? null : null
  const logo = team ? (getTeamLogo(team.id) ?? team.logo ?? null) : null
  const tFormat = tournamentFormat(tournamentId)
  const [chip, setChip] = useState<StatzTeamFormatChip>(() => formatChipForTournamentFormat(tFormat))
  const [statz, setStatz] = useState<StatzTeamPayload | null>(null)
  const [statzLoading, setStatzLoading] = useState(false)
  const [statzError, setStatzError] = useState<string | null>(null)

  useEffect(() => {
    setChip(formatChipForTournamentFormat(tFormat))
  }, [tFormat, teamId])

  useEffect(() => {
    if (!team) return
    let cancelled = false
    setStatz(null)
    setStatzError(null)
    setStatzLoading(true)
    void (async () => {
      const result = await fetchJson<StatzTeamPayload>(
        `/api/cricket/statz-team?name=${encodeURIComponent(team.name)}`,
      )
      if (cancelled) return
      if (result.ok && result.data) {
        setStatz(result.data)
        if (!result.data.found) setStatzError(null)
      } else {
        setStatzError(result.error ?? 'Match feed unavailable')
      }
      setStatzLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [team])

  const allPlayers: { p: SquadPlayer; section: string }[] = useMemo(
    () => [
      ...squad.startingXI.map((p) => ({ p, section: 'Starting XI' })),
      ...squad.reserves.map((p) => ({ p, section: 'Reserves' })),
      ...squad.impactSubs.map((p) => ({ p, section: 'Impact' })),
    ],
    [squad],
  )
  const namedPlayers = allPlayers.map((x) => x.p).filter((p) => !isPlaceholderName(p.name))
  const q = playerQuery.trim().toLowerCase()
  const filtered = q
    ? allPlayers.filter(({ p }) => p.name.toLowerCase().includes(q))
    : allPlayers

  const chipMatches = useMemo(() => {
    const rows = statz?.matches ?? []
    return rows.filter((m) => matchPassesFormatChip(m, chip))
  }, [statz, chip])
  const chipSummary = useMemo(() => summarizeTeamMatches(chipMatches), [chipMatches])
  const rich = Boolean(statz?.found && chipMatches.length > 0)

  function handleChip(next: StatzTeamFormatChip) {
    setChip(next)
    if (!team || !onOpenTeam) return
    const sister = sisterTeam(team.name, next)
    if (sister && (sister.teamId !== teamId || sister.tournamentId !== tournamentId)) {
      onOpenTeam(sister.teamId, sister.tournamentId)
    }
  }

  if (!team) {
    return (
      <div className="ph-hub">
        <HubCrumbs
          trail={[{ label: 'Leagues', onClick: onBackToLeagues }, { label: 'Unknown team' }]}
          onBack={onBack}
        />
        <div className="ph-empty">
          <div className="ph-empty-title">Team not found</div>
        </div>
      </div>
    )
  }

  const bat = getTeamBatRatingTotal(teamId, ratingParScore)
  const bowl = getTeamBowlRatingTotal(teamId, ratingParScore)
  const last = chipMatches[0] ?? null
  const homeLabel = statz?.homeGround
    ? statz.homeGround
    : ground
      ? `${ground.name}, ${ground.city}`
      : null

  return (
    <div className="ph-hub">
      <HubCrumbs
        trail={[
          { label: 'Leagues', onClick: onBackToLeagues },
          { label: tournamentLabel(tournamentId), onClick: onBack },
          { label: team.name },
        ]}
        onBack={onBack}
      />

      <header className="ph-hero thp-hero">
        {logo ? (
          <img src={logo} alt="" className="ph-team-logo" />
        ) : (
          <span className="ph-entity-badge ph-entity-badge--lg" aria-hidden>
            {initialsFor(team.name)}
          </span>
        )}
        <div className="ph-hero-info">
          <div className="ph-hero-name">{team.name}</div>
          <div className="ph-hero-meta">{tournamentLabel(tournamentId)}</div>
          <div className="ph-hero-sub">
            {namedPlayers.length} named players
            {homeLabel ? ` · Home: ${homeLabel}` : ' · Home ground not set'}
          </div>
          <div className="ph-format-bar thp-format-bar">
            <span className="ph-format-label">Format</span>
            <div className="ph-seg" role="tablist" aria-label="Team format">
              {FORMAT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={chip === c}
                  className={`ph-seg-btn ${chip === c ? 'ph-seg-btn-active' : ''}`}
                  onClick={() => handleChip(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ph-hero-tiles">
          <div className="ph-hero-tile">
            <span className="ph-hero-tile-label">Last 5</span>
            <span className="thp-form">
              {(rich ? chipSummary.form : []).length === 0
                ? '—'
                : chipSummary.form.map((f, i) => (
                    <span key={i} className={`thp-form-sq thp-form-sq--${f.toLowerCase()}`}>
                      {f}
                    </span>
                  ))}
            </span>
          </div>
        </div>
      </header>

      <div className="thp-kpi">
        <div className="ph-hero-tile">
          <span className="ph-hero-tile-label">Record</span>
          <span className="ph-hero-tile-value">
            {rich ? `${chipSummary.wins}-${chipSummary.losses}-${chipSummary.abandoned}` : '—'}
          </span>
        </div>
        <div className="ph-hero-tile">
          <span className="ph-hero-tile-label">Win %</span>
          <span className="ph-hero-tile-value">{rich && chipSummary.winPct != null ? `${chipSummary.winPct}%` : '—'}</span>
        </div>
        <div className="ph-hero-tile">
          <span className="ph-hero-tile-label">Avg runs</span>
          <span className="ph-hero-tile-value">{rich ? fmt(chipSummary.avgRuns, 0) : '—'}</span>
        </div>
        <div className="ph-hero-tile">
          <span className="ph-hero-tile-label">RR</span>
          <span className="ph-hero-tile-value">{rich ? fmt(chipSummary.avgRunRate) : '—'}</span>
        </div>
        <div className="ph-hero-tile">
          <span className="ph-hero-tile-label">Wkts / match</span>
          <span className="ph-hero-tile-value">{rich ? fmt(chipSummary.avgWicketsTaken) : '—'}</span>
        </div>
        <div className="ph-hero-tile">
          <span className="ph-hero-tile-label">Conceded</span>
          <span className="ph-hero-tile-value">{rich ? fmt(chipSummary.avgRunsConceded, 0) : '—'}</span>
        </div>
      </div>

      <ThpFormStrip matches={chipMatches} />

      <div className="thp-grid">
        <section className="ph-card">
          <h2 className="ph-card-title">Next match</h2>
          {statzLoading ? (
            <p className="ph-muted">Loading fixture…</p>
          ) : statz?.next ? (
            <div className="thp-next">
              <span className="ph-entity-badge">{statz.next.opponentCode ?? initialsFor(statz.next.opponent ?? 'TBD')}</span>
              <div>
                <div className="thp-next-vs">v {statz.next.opponent ?? statz.next.opponentCode ?? 'TBD'}</div>
                <div className="ph-muted">{statz.next.dateLabel ?? statz.next.isoDate ?? 'Date TBC'}</div>
              </div>
            </div>
          ) : (
            <div className="ph-empty">
              <div className="ph-empty-title">No upcoming fixture</div>
              <p className="ph-muted">Next opponent will appear here when the match feed has one.</p>
            </div>
          )}
        </section>

        <section className="ph-card">
          <h2 className="ph-card-title">Last result</h2>
          {statzLoading ? (
            <p className="ph-muted">Loading results…</p>
          ) : last ? (
            <div>
              <div className="thp-last-line">
                <span className={`thp-form-sq thp-form-sq--${resultLetter(last.result).toLowerCase()}`}>
                  {resultLetter(last.result)}
                </span>
                <span>
                  {last.result} v {last.opponent ?? '—'}
                  {last.venue ? ` · ${last.venue}` : ''}
                </span>
              </div>
              <div className="ph-muted">
                {last.dateLabel}
                {last.competition ? ` · ${last.competition}` : ''}
              </div>
              <div className="thp-scoreline">
                {last.teamScore ?? '—'} vs {last.oppScore ?? '—'}
              </div>
              <div className="ph-muted">
                {last.topScorer ? `${last.topScorer}${last.topScorerRuns != null ? ` ${last.topScorerRuns}` : ''}` : ''}
                {last.topWicketTaker
                  ? `${last.topScorer ? ' · ' : ''}${last.topWicketTaker}${last.topWickets != null ? ` ${last.topWickets} wkts` : ''}`
                  : ''}
              </div>
            </div>
          ) : (
            <div className="ph-empty">
              <div className="ph-empty-title">No {chip} results yet</div>
              <p className="ph-muted">
                {statzError ?? 'Recent scores will show here when match data is available.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {statzLoading ? (
        <section className="ph-card">
          <p className="ph-muted">Loading match charts…</p>
        </section>
      ) : (
        <HubTeamCharts matches={chipMatches} formatLabel={chip} />
      )}

      <section className="ph-card">
        <div className="ph-card-head">
          <h2 className="ph-card-title">Recent results</h2>
          <span className="ph-source-badge">{chip} · last {Math.min(chipMatches.length, 12)}</span>
        </div>
        {chipMatches.length === 0 ? (
          <div className="ph-empty">
            <div className="ph-empty-title">No recent {chip} matches</div>
            <p className="ph-muted">
              {chip === 'T20'
                ? 'Squad and ratings are still available below.'
                : `${chip} match rows are not in this feed yet.`}
            </p>
          </div>
        ) : (
          <ul className="ph-recent-list thp-results">
            {chipMatches.slice(0, 12).map((m, i) => (
              <li key={`${m.isoDate ?? m.dateLabel}-${m.opponent}-${i}`} className="ph-recent-row">
                <span className="ph-recent-date">{m.dateLabel}</span>
                <span className="ph-recent-comp">{m.competition ?? chip}</span>
                <span className="ph-recent-opp">v {m.opponent ?? '—'}</span>
                <span className="ph-recent-bat">{m.teamScore ?? '—'}</span>
                <span className={`thp-res-pill thp-res-pill--${resultLetter(m.result).toLowerCase()}`}>
                  {resultLetter(m.result)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="thp-grid">
        <section className="ph-card">
          <h2 className="ph-card-title">Batting</h2>
          {rich ? (
            <div className="thp-stat-grid">
              <StatBox label="Avg runs" value={fmt(chipSummary.avgRuns, 0)} />
              <StatBox label="Run rate" value={fmt(chipSummary.avgRunRate)} />
              <StatBox label="Fours / match" value={fmt(chipSummary.avgFours)} />
              <StatBox label="Sixes / match" value={fmt(chipSummary.avgSixes)} />
              <StatBox label="Boundaries" value={fmt(chipSummary.avgBoundaries)} />
              <StatBox label="Wkts lost" value={fmt(chipSummary.avgWicketsLost)} />
            </div>
          ) : (
            <div className="ph-empty">
              <div className="ph-empty-title">Batting snapshot unavailable</div>
              <p className="ph-muted">Team batting index {bat.toFixed(2)} from the current XI.</p>
            </div>
          )}
        </section>
        <section className="ph-card">
          <h2 className="ph-card-title">Bowling</h2>
          {rich ? (
            <div className="thp-stat-grid">
              <StatBox label="Wkts taken" value={fmt(chipSummary.avgWicketsTaken)} />
              <StatBox label="Runs conceded" value={fmt(chipSummary.avgRunsConceded, 0)} />
              <StatBox label="Bowl index" value={bowl.toFixed(2)} />
              <StatBox label="Net index" value={((bat + bowl) / 2).toFixed(2)} />
            </div>
          ) : (
            <div className="ph-empty">
              <div className="ph-empty-title">Bowling snapshot unavailable</div>
              <p className="ph-muted">Team bowling index {bowl.toFixed(2)} from the current XI.</p>
            </div>
          )}
        </section>
      </div>

      <section className="ph-card">
        <h2 className="ph-card-title">Key players</h2>
        <p className="ph-muted">Players most often topping the card, plus named squad members. Open a profile for full stats.</p>
        <div className="ph-card-grid thp-key-grid">
          {(statz?.keyBatters ?? []).map((k) => {
            const sp = findSquadPlayerByName(namedPlayers, k.name)
            return (
              <button
                key={`bat-${k.name}`}
                type="button"
                className="ph-entity-card ph-player-card"
                onClick={() => onOpenPlayer(sp?.name ?? k.name)}
              >
                <span className="ph-entity-badge">{initialsFor(sp?.name ?? k.name)}</span>
                <span className="ph-entity-name">{sp?.name ?? k.name}</span>
                <span className="ph-entity-meta">Batting · {k.appearances} top scores</span>
                <span className="ph-entity-sub">Best {k.highlight}</span>
              </button>
            )
          })}
          {(statz?.keyBowlers ?? []).map((k) => {
            const sp = findSquadPlayerByName(namedPlayers, k.name)
            return (
              <button
                key={`bowl-${k.name}`}
                type="button"
                className="ph-entity-card ph-player-card"
                onClick={() => onOpenPlayer(sp?.name ?? k.name)}
              >
                <span className="ph-entity-badge">{initialsFor(sp?.name ?? k.name)}</span>
                <span className="ph-entity-name">{sp?.name ?? k.name}</span>
                <span className="ph-entity-meta">Bowling · {k.appearances} top hauls</span>
                <span className="ph-entity-sub">Best {k.highlight} wkts</span>
              </button>
            )
          })}
          {(!statz?.keyBatters?.length && !statz?.keyBowlers?.length) &&
            namedPlayers.slice(0, 6).map((p) => {
              const bio = getEffectiveBio(p.name)
              return (
                <button
                  key={p.id}
                  type="button"
                  className="ph-entity-card ph-player-card"
                  onClick={() => onOpenPlayer(p.name)}
                >
                  <span className="ph-entity-badge">{initialsFor(p.name)}</span>
                  <span className="ph-entity-name">{p.name}</span>
                  <span className="ph-entity-meta">{bio.playingRole !== 'Unknown' ? bio.playingRole : 'Squad'}</span>
                  <span className="ph-entity-sub">
                    Bat {p.batRating.toFixed(1)} · Bowl {Number.isNaN(p.bowlRating) ? '—' : p.bowlRating.toFixed(1)}
                  </span>
                </button>
              )
            })}
        </div>
        {!statz?.found && namedPlayers.length === 0 ? (
          <div className="ph-empty">
            <div className="ph-empty-title">No named players yet</div>
            <p className="ph-muted">Prep the squad to attach player profiles.</p>
          </div>
        ) : null}
      </section>

      <div className="ph-hub-head">
        <div>
          <h2 className="ph-hub-title">Squad</h2>
          <p className="ph-muted">Select a player to open their full-screen profile.</p>
        </div>
        <input
          type="search"
          className="ph-input ph-search"
          placeholder="Search players…"
          value={playerQuery}
          onChange={(e) => onPlayerQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="ph-empty">
          <div className="ph-empty-title">No players found</div>
          <p className="ph-muted">Try a different search.</p>
        </div>
      ) : (
        <div className="ph-card-grid">
          {filtered.map(({ p, section }) => (
            <button
              key={p.id}
              type="button"
              className="ph-entity-card ph-player-card"
              onClick={() => onOpenPlayer(p.name)}
              title={`Open ${p.name}`}
            >
              <span className="ph-entity-badge">{initialsFor(p.name)}</span>
              <span className="ph-entity-name">{p.name}</span>
              <span className="ph-entity-meta">
                {section}
                {p.keeper ? ' · WK' : ''}
                {p.overseas ? ' · OS' : ''}
              </span>
              <span className="ph-entity-sub">
                {isPlaceholderName(p.name)
                  ? 'Placeholder — no stats yet'
                  : `Bat ${p.batRating.toFixed(1)} · Bowl ${Number.isNaN(p.bowlRating) ? '—' : p.bowlRating.toFixed(1)}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="ph-hero-tile">
      <span className="ph-hero-tile-label">{label}</span>
      <span className="ph-hero-tile-value">{value}</span>
    </div>
  )
}

function HubCrumbs({
  trail,
  onBack,
}: {
  trail: { label: string; onClick?: () => void }[]
  onBack: () => void
}) {
  return (
    <div className="ph-crumbs">
      <button type="button" className="ph-back-btn" onClick={onBack}>
        ← Back
      </button>
      <span className="ph-crumb-trail">
        {trail.map((t, i) => (
          <span key={i}>
            {i > 0 && <span className="ph-crumb-sep"> › </span>}
            {t.onClick ? (
              <button type="button" className="ph-crumb-link" onClick={t.onClick}>
                {t.label}
              </button>
            ) : (
              <span>{t.label}</span>
            )}
          </span>
        ))}
      </span>
    </div>
  )
}
