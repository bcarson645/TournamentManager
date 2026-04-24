'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { SquadPlayer } from '../data/squad'
import {
  PlayerProfile,
  getProfileForPlayer,
  CareerBatting,
  CareerBowling,
  RecentInnings,
  TournamentRecord,
} from '../data/playerProfile'

interface PlayerDetailPanelProps {
  player: SquadPlayer | null
  tournamentName: string
  panelWidth: number
  onClose: () => void
}

type StatsTab = 'batting' | 'bowling'

/** Stored as SR.CAZ (per ball); player stats UI uses traditional SR per 100 balls. */
function srPer100FromCaz(caz: number): number {
  return Math.round(caz * 100 * 100) / 100
}

function formatStatNumber(n: number, maxFractionDigits: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n % 1 === 0) return String(Math.trunc(n))
  return n.toFixed(maxFractionDigits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function displayCareerBatting(key: keyof CareerBatting, bat: CareerBatting): string {
  if (key === 'strikeRate') return formatStatNumber(srPer100FromCaz(bat.strikeRate), 2)
  if (key === 'highScore') return bat.highScore || '—'
  if (key === 'average') return formatStatNumber(bat.average, 2)
  return String(bat[key] as number)
}

function displayCareerBowling(key: keyof CareerBowling, bowl: CareerBowling): string {
  if (key === 'bestFigures') return bowl.bestFigures || '—'
  if (key === 'average' || key === 'economy' || key === 'strikeRate') {
    return formatStatNumber(bowl[key], 2)
  }
  return String(bowl[key] as number)
}

function displayTournamentField(key: keyof TournamentRecord, rec: TournamentRecord): string {
  if (key === 'season') return rec.season || '—'
  if (key === 'strikeRate') return formatStatNumber(srPer100FromCaz(rec.strikeRate), 2)
  if (key === 'average' || key === 'bowlAvg') return formatStatNumber(rec[key], 2)
  return String(rec[key] as number)
}

export default function PlayerDetailPanel({
  player,
  tournamentName,
  panelWidth,
  onClose,
}: PlayerDetailPanelProps) {
  const [profile, setProfile] = useState<PlayerProfile>(() =>
    player ? getProfileForPlayer(player.name) : getProfileForPlayer(''),
  )
  const [statsTab, setStatsTab] = useState<StatsTab>('batting')
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (player) setProfile(getProfileForPlayer(player.name))
  }, [player?.id])

  useEffect(() => {
    setStatsTab('batting')
  }, [player?.id])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfile((p) => ({ ...p, photo: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function scoreColor(score: number): string {
    if (score >= 75) return 'score-high'
    if (score >= 50) return 'score-mid'
    if (score >= 25) return 'score-low'
    return 'score-vlow'
  }

  const bat = profile.careerBatting
  const bowl = profile.careerBowling

  const panelStyle: CSSProperties = {
    width: panelWidth,
    flex: '0 0 auto',
    minWidth: 260,
    maxWidth: 'min(640px, 70vw)',
  }

  if (!player) {
    return (
      <aside className="pp-panel pp-panel-empty" style={panelStyle} aria-label="Player stats">
        <div className="pp-panel-scroll">
          <div className="pp-empty-shell">
            <div className="pp-empty-kicker">{tournamentName}</div>
            <h2 className="pp-empty-heading">Player stats</h2>
            <p className="pp-empty-text">
              Select a player from the squad table to view career stats.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="pp-panel" style={panelStyle}>
      <div className="pp-panel-scroll">
        <div className="pp-header">
          <div
            className="pp-photo-wrap"
            onClick={() => photoRef.current?.click()}
            title="Click to upload photo"
          >
            {profile.photo ? (
              <img src={profile.photo} alt="" className="pp-photo" />
            ) : (
              <div className="pp-photo-placeholder">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" />
                </svg>
              </div>
            )}
            <div className="pp-photo-overlay">✎</div>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="team-logo-input"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="pp-header-info">
            <div className="pp-name">{player.name}</div>
            <input
              type="text"
              className="pp-country-input"
              placeholder="Country"
              value={profile.country}
              onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
            />
          </div>
          <button className="pp-close" onClick={onClose} title="Close">×</button>
        </div>

        <div className="pp-tabs" role="tablist" aria-label="Batting and bowling stats">
          <button
            type="button"
            role="tab"
            id="pp-tab-batting"
            aria-selected={statsTab === 'batting'}
            aria-controls="pp-panel-batting"
            className={`pp-tab ${statsTab === 'batting' ? 'pp-tab-active' : ''}`}
            onClick={() => setStatsTab('batting')}
          >
            Batting
          </button>
          <button
            type="button"
            role="tab"
            id="pp-tab-bowling"
            aria-selected={statsTab === 'bowling'}
            aria-controls="pp-panel-bowling"
            className={`pp-tab ${statsTab === 'bowling' ? 'pp-tab-active' : ''}`}
            onClick={() => setStatsTab('bowling')}
          >
            Bowling
          </button>
        </div>

        {statsTab === 'batting' && (
          <div
            className="pp-tab-panel"
            id="pp-panel-batting"
            role="tabpanel"
            aria-labelledby="pp-tab-batting"
          >
            <div className="pp-section">
              <h3 className="pp-section-title">Career Batting</h3>
              <div className="pp-stat-grid">
                {(
                  [
                    ['matches', 'Matches'],
                    ['runs', 'Runs'],
                    ['average', 'Average'],
                    ['strikeRate', 'SR'],
                    ['hundreds', '100s'],
                    ['fifties', '50s'],
                    ['highScore', 'High Score'],
                    ['innings', 'Innings'],
                  ] as [keyof CareerBatting, string][]
                ).map(([key, label]) => (
                  <div key={key} className="pp-stat-box">
                    <span className="pp-stat-label">{label}</span>
                    <span className="pp-stat-value">{displayCareerBatting(key, bat)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-section">
              <h3 className="pp-section-title">Recent Performance (Last 10 Innings)</h3>
              {profile.recentInnings.length === 0 ? (
                <div className="pp-empty">No recent innings data</div>
              ) : (
                <div className="pp-recent-grid">
                  {profile.recentInnings.map((inn, i) => (
                    <div
                      key={i}
                      className={`pp-recent-box ${scoreColor(inn.score)}`}
                      title={inn.notOut ? 'Not out' : 'Out'}
                    >
                      <span className="pp-recent-score">
                        {inn.score}
                        {inn.notOut ? <span className="pp-recent-nout">*</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pp-section">
              <h3 className="pp-section-title">{tournamentName} History</h3>
              {profile.tournamentHistory.length === 0 ? (
                <div className="pp-empty">No previous tournament records</div>
              ) : (
                <div className="pp-tournament-list">
                  {profile.tournamentHistory.map((rec, i) => (
                    <div key={i} className="pp-tournament-card">
                      <div className="pp-tournament-top">
                        <h4 className="pp-tournament-title">{displayTournamentField('season', rec)}</h4>
                      </div>
                      <div className="pp-stat-grid pp-stat-grid-sm">
                        {(
                          [
                            ['matches', 'Mat'],
                            ['runs', 'Runs'],
                            ['average', 'Avg'],
                            ['strikeRate', 'SR'],
                            ['wickets', 'Wkts'],
                            ['bowlAvg', 'Bowl Avg'],
                          ] as [keyof TournamentRecord, string][]
                        ).map(([key, label]) => (
                          <div key={key} className="pp-stat-box pp-stat-box-sm">
                            <span className="pp-stat-label">{label}</span>
                            <span className="pp-stat-value">{displayTournamentField(key, rec)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {statsTab === 'bowling' && (
          <div
            className="pp-tab-panel"
            id="pp-panel-bowling"
            role="tabpanel"
            aria-labelledby="pp-tab-bowling"
          >
            <div className="pp-section">
              <h3 className="pp-section-title">Career Bowling</h3>
              <div className="pp-stat-grid">
                {(
                  [
                    ['matches', 'Matches'],
                    ['wickets', 'Wickets'],
                    ['average', 'Average'],
                    ['economy', 'Economy'],
                    ['strikeRate', 'Strike Rate'],
                    ['bestFigures', 'Best Figures'],
                    ['fiveWickets', '5W'],
                    ['innings', 'Innings'],
                  ] as [keyof CareerBowling, string][]
                ).map(([key, label]) => (
                  <div key={key} className="pp-stat-box">
                    <span className="pp-stat-label">{label}</span>
                    <span className="pp-stat-value">{displayCareerBowling(key, bowl)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
