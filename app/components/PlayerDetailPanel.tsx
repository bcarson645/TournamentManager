'use client'

import { useState, useRef, useEffect } from 'react'
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
  onClose: () => void
}

type StatsTab = 'batting' | 'bowling'

export default function PlayerDetailPanel({
  player,
  tournamentName,
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

  function updateBatField(field: keyof CareerBatting, value: string) {
    setProfile((p) => ({
      ...p,
      careerBatting: {
        ...p.careerBatting,
        [field]: field === 'highScore' ? value : (parseFloat(value) || 0),
      },
    }))
  }

  function updateBowlField(field: keyof CareerBowling, value: string) {
    setProfile((p) => ({
      ...p,
      careerBowling: {
        ...p.careerBowling,
        [field]: field === 'bestFigures' ? value : (parseFloat(value) || 0),
      },
    }))
  }

  function addRecentInnings() {
    setProfile((p) => ({
      ...p,
      recentInnings: [...p.recentInnings, { score: 0, notOut: false }],
    }))
  }

  function updateRecentInnings(idx: number, field: keyof RecentInnings, value: string | boolean) {
    setProfile((p) => {
      const updated = [...p.recentInnings]
      updated[idx] = {
        ...updated[idx],
        [field]: field === 'notOut' ? value : (parseInt(value as string) || 0),
      }
      return { ...p, recentInnings: updated }
    })
  }

  function removeRecentInnings(idx: number) {
    setProfile((p) => ({
      ...p,
      recentInnings: p.recentInnings.filter((_, i) => i !== idx),
    }))
  }

  function addTournamentRecord() {
    setProfile((p) => ({
      ...p,
      tournamentHistory: [
        ...p.tournamentHistory,
        { season: '', matches: 0, runs: 0, average: 0, strikeRate: 0, wickets: 0, bowlAvg: 0 },
      ],
    }))
  }

  function updateTournamentRecord(idx: number, field: keyof TournamentRecord, value: string) {
    setProfile((p) => {
      const updated = [...p.tournamentHistory]
      updated[idx] = {
        ...updated[idx],
        [field]: field === 'season' ? value : (parseFloat(value) || 0),
      }
      return { ...p, tournamentHistory: updated }
    })
  }

  function removeTournamentRecord(idx: number) {
    setProfile((p) => ({
      ...p,
      tournamentHistory: p.tournamentHistory.filter((_, i) => i !== idx),
    }))
  }

  function scoreColor(score: number): string {
    if (score >= 75) return 'score-high'
    if (score >= 50) return 'score-mid'
    if (score >= 25) return 'score-low'
    return 'score-vlow'
  }

  const bat = profile.careerBatting
  const bowl = profile.careerBowling

  if (!player) {
    return (
      <aside className="pp-panel pp-panel-empty" aria-label="Player stats">
        <div className="pp-panel-scroll">
          <div className="pp-empty-shell">
            <div className="pp-empty-kicker">{tournamentName}</div>
            <h2 className="pp-empty-heading">Player stats</h2>
            <p className="pp-empty-text">
              Select a player from the squad table to view and edit career stats.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="pp-panel">
      <div className="pp-panel-scroll">
        {/* Header */}
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
                {([
                  ['matches', 'Matches'], ['runs', 'Runs'], ['average', 'Average'], ['strikeRate', 'Strike Rate'],
                  ['hundreds', '100s'], ['fifties', '50s'], ['highScore', 'High Score'], ['innings', 'Innings'],
                ] as [keyof CareerBatting, string][]).map(([key, label]) => (
                  <div key={key} className="pp-stat-box">
                    <span className="pp-stat-label">{label}</span>
                    <input
                      type={key === 'highScore' ? 'text' : 'number'}
                      className="pp-stat-input"
                      value={bat[key]}
                      onChange={(e) => updateBatField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-section">
              <div className="pp-section-header">
                <h3 className="pp-section-title">Recent Performance (Last 10 Innings)</h3>
                {profile.recentInnings.length < 10 && (
                  <button type="button" className="pp-add-btn" onClick={addRecentInnings}>+ Add</button>
                )}
              </div>
              {profile.recentInnings.length === 0 ? (
                <div className="pp-empty">No recent innings added</div>
              ) : (
                <div className="pp-recent-grid">
                  {profile.recentInnings.map((inn, i) => (
                    <div key={i} className={`pp-recent-box ${scoreColor(inn.score)}`}>
                      <input
                        type="number"
                        className="pp-recent-input"
                        value={inn.score}
                        onChange={(e) => updateRecentInnings(i, 'score', e.target.value)}
                      />
                      <label className="pp-recent-no">
                        <input
                          type="checkbox"
                          checked={inn.notOut}
                          onChange={(e) => updateRecentInnings(i, 'notOut', e.target.checked)}
                        />
                        *
                      </label>
                      <button type="button" className="pp-recent-remove" onClick={() => removeRecentInnings(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pp-section">
              <div className="pp-section-header">
                <h3 className="pp-section-title">{tournamentName} History</h3>
                <button type="button" className="pp-add-btn" onClick={addTournamentRecord}>+ Add Season</button>
              </div>
              {profile.tournamentHistory.length === 0 ? (
                <div className="pp-empty">No previous tournament records</div>
              ) : (
                <div className="pp-tournament-list">
                  {profile.tournamentHistory.map((rec, i) => (
                    <div key={i} className="pp-tournament-card">
                      <div className="pp-tournament-top">
                        <input
                          type="text"
                          className="pp-tournament-season"
                          placeholder="Season (e.g. 2025)"
                          value={rec.season}
                          onChange={(e) => updateTournamentRecord(i, 'season', e.target.value)}
                        />
                        <button type="button" className="pp-recent-remove" onClick={() => removeTournamentRecord(i)}>×</button>
                      </div>
                      <div className="pp-stat-grid pp-stat-grid-sm">
                        {([
                          ['matches', 'Mat'], ['runs', 'Runs'], ['average', 'Avg'], ['strikeRate', 'SR'],
                          ['wickets', 'Wkts'], ['bowlAvg', 'Bowl Avg'],
                        ] as [keyof TournamentRecord, string][]).map(([key, label]) => (
                          <div key={key} className="pp-stat-box pp-stat-box-sm">
                            <span className="pp-stat-label">{label}</span>
                            <input
                              type="number"
                              className="pp-stat-input"
                              value={rec[key]}
                              onChange={(e) => updateTournamentRecord(i, key, e.target.value)}
                            />
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
                {([
                  ['matches', 'Matches'], ['wickets', 'Wickets'], ['average', 'Average'], ['economy', 'Economy'],
                  ['strikeRate', 'Strike Rate'], ['bestFigures', 'Best Figures'], ['fiveWickets', '5W'], ['innings', 'Innings'],
                ] as [keyof CareerBowling, string][]).map(([key, label]) => (
                  <div key={key} className="pp-stat-box">
                    <span className="pp-stat-label">{label}</span>
                    <input
                      type={key === 'bestFigures' ? 'text' : 'number'}
                      className="pp-stat-input"
                      value={bowl[key]}
                      onChange={(e) => updateBowlField(key, e.target.value)}
                    />
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
