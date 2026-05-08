'use client'

import { useState, useRef, useEffect, useMemo, type CSSProperties } from 'react'
import { SquadPlayer } from '../data/squad'
import {
  PlayerProfile,
  getProfileForPlayer,
  CareerBatting,
  CareerBowling,
  RecentInnings,
  TournamentRecord,
} from '../data/playerProfile'
import { generatePlayerDeepBatting, generatePlayerDeepBowling } from '../data/playerAnalyticsMock'
import { BattingDeepPanels, BowlingDeepPanels, H2hPlaceholder } from './PlayerAnalyticsSegments'

interface PlayerDetailPanelProps {
  player: SquadPlayer | null
  tournamentName: string
  panelWidth: number
  onClose: () => void
  /** When set, show squad-only actions (e.g. assign WK for starting XI). */
  squadSlot?: 'starting' | 'bench' | null
  playerIsKeeper?: boolean
  onToggleWicketKeeper?: () => void
  /** Mark as overseas (squad / regulation planning). */
  playerIsOverseas?: boolean
  onToggleOverseas?: () => void
  /** Persist note on squad player row (shared with anyone editing this squad). */
  onSavePlayerNote?: (note: string) => void
  /** Remove this player from Starting XI, reserves, or impact (with confirm). */
  onRemoveFromSquad?: () => void
}

type StatsTab = 'batting' | 'bowling' | 'h2h'

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
  squadSlot = null,
  playerIsKeeper = false,
  onToggleWicketKeeper,
  playerIsOverseas = false,
  onToggleOverseas,
  onSavePlayerNote,
  onRemoveFromSquad,
}: PlayerDetailPanelProps) {
  const [profile, setProfile] = useState<PlayerProfile>(() =>
    player ? getProfileForPlayer(player.name) : getProfileForPlayer(''),
  )
  const [statsTab, setStatsTab] = useState<StatsTab>('batting')
  const photoRef = useRef<HTMLInputElement>(null)
  const noteBlockRef = useRef<HTMLDivElement>(null)
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [notePopoverOpen, setNotePopoverOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const deepBat = useMemo(
    () => (player ? generatePlayerDeepBatting(player.id) : null),
    [player?.id],
  )
  const deepBowl = useMemo(
    () => (player ? generatePlayerDeepBowling(player.id) : null),
    [player?.id],
  )

  useEffect(() => {
    if (player) setProfile(getProfileForPlayer(player.name))
  }, [player?.id])

  useEffect(() => {
    setStatsTab('batting')
  }, [player?.id])

  useEffect(() => {
    setNoteDraft(player?.note ?? '')
  }, [player?.id, player?.note])

  useEffect(() => {
    setNotePopoverOpen(false)
  }, [player?.id])

  useEffect(() => {
    if (!notePopoverOpen) return
    const id = window.setTimeout(() => noteTextareaRef.current?.focus(), 0)
    function onPointerDown(e: PointerEvent) {
      const el = noteBlockRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setNotePopoverOpen(false)
        setNoteDraft(player?.note ?? '')
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setNotePopoverOpen(false)
      setNoteDraft(player?.note ?? '')
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [notePopoverOpen, player?.note])

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
      <div className="pp-panel-body">
        <div className="pp-panel-chrome">
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
              <div className="pp-name-row-chrome">
                <div className="pp-name">{player.name}</div>
                {player.note?.trim() ? (
                  <span className="pp-note-chip" title="Squad note saved — use Squad note below">
                    Note
                  </span>
                ) : null}
              </div>
              <input
                type="text"
                className="pp-country-input"
                placeholder="Country"
                value={profile.country}
                onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
              />
            </div>
            <button className="pp-close" onClick={onClose} title="Close">×          </button>
          </div>

          <div className="pp-tabs" role="tablist" aria-label="Batting bowling and head-to-head">
            <button
              type="button"
              role="tab"
              id="pp-tab-batting"
              aria-selected={statsTab === 'batting'}
              aria-controls="pp-panel-batting"
              className={
                'pp-tab pp-tab-stat pp-tab-stat--bat' +
                (statsTab === 'batting' ? ' pp-tab-active pp-tab-active--bat' : '')
              }
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
              className={
                'pp-tab pp-tab-stat pp-tab-stat--bowl' +
                (statsTab === 'bowling' ? ' pp-tab-active pp-tab-active--bowl' : '')
              }
              onClick={() => setStatsTab('bowling')}
            >
              Bowling
            </button>
            <button
              type="button"
              role="tab"
              id="pp-tab-h2h"
              aria-selected={statsTab === 'h2h'}
              aria-controls="pp-panel-h2h"
              className={
                'pp-tab pp-tab-stat pp-tab-stat--h2h' +
                (statsTab === 'h2h' ? ' pp-tab-active pp-tab-active--h2h' : '')
              }
              onClick={() => setStatsTab('h2h')}
            >
              H2H
            </button>
          </div>

          {((squadSlot === 'starting' && onToggleWicketKeeper) ||
            onRemoveFromSquad ||
            onToggleOverseas ||
            onSavePlayerNote) && (
            <div className="pp-squad-actions-block" ref={noteBlockRef}>
              <div className="pp-squad-actions-row">
                {squadSlot === 'starting' && onToggleWicketKeeper ? (
                  <button
                    type="button"
                    className={'pp-wk-btn' + (playerIsKeeper ? ' pp-wk-btn--active' : '')}
                    onClick={onToggleWicketKeeper}
                    title={
                      playerIsKeeper
                        ? 'This player is the wicket-keeper. Click to clear.'
                        : 'Mark this starting XI player as wicket-keeper.'
                    }
                  >
                    <img
                      src="/wk-keeper-gloves.png"
                      alt=""
                      width={18}
                      height={18}
                      className="pp-wk-gloves"
                      decoding="async"
                    />
                    <span>{playerIsKeeper ? 'Clear WK' : 'Assign WK'}</span>
                  </button>
                ) : null}
                {onToggleOverseas ? (
                  <button
                    type="button"
                    className={'pp-overseas-btn' + (playerIsOverseas ? ' pp-overseas-btn--active' : '')}
                    onClick={onToggleOverseas}
                    title={playerIsOverseas ? 'Clear overseas tag' : 'Mark as overseas player'}
                  >
                    <svg className="pp-overseas-plane" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                      />
                    </svg>
                    <span>{playerIsOverseas ? 'Clear overseas' : 'Overseas'}</span>
                  </button>
                ) : null}
                {onSavePlayerNote ? (
                  <button
                    type="button"
                    className={'pp-note-btn' + (notePopoverOpen ? ' pp-note-btn--open' : '')}
                    onClick={() => setNotePopoverOpen((o) => !o)}
                    title="Add a short note for other editors of this squad"
                    aria-expanded={notePopoverOpen}
                    aria-controls="pp-squad-note-popover"
                  >
                    Squad note
                  </button>
                ) : null}
                {onRemoveFromSquad ? (
                  <button type="button" className="pp-remove-squad-btn" onClick={onRemoveFromSquad}>
                    Remove from squad
                  </button>
                ) : null}
              </div>
              {onSavePlayerNote && notePopoverOpen ? (
                <div
                  id="pp-squad-note-popover"
                  className="pp-note-popover"
                  role="dialog"
                  aria-label="Squad note"
                >
                  <form
                    className="pp-note-popover-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      onSavePlayerNote(noteDraft)
                      setNotePopoverOpen(false)
                    }}
                  >
                    <h2 className="pp-note-popover-title">Squad note</h2>
                    <p className="pp-note-popover-hint">
                      Short note for the next person editing this squad (stored with the team draft in this browser).
                    </p>
                    <textarea
                      ref={noteTextareaRef}
                      className="pp-note-popover-textarea"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={5}
                      maxLength={4000}
                      placeholder="e.g. Trying Gill at 4, reserve quick for Cardiff…"
                    />
                    <div className="pp-note-popover-actions">
                      <button
                        type="button"
                        className="pp-note-popover-secondary"
                        onClick={() => {
                          setNoteDraft(player.note ?? '')
                          setNotePopoverOpen(false)
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="pp-note-popover-secondary"
                        onClick={() => {
                          setNoteDraft('')
                          onSavePlayerNote('')
                          setNotePopoverOpen(false)
                        }}
                      >
                        Clear note
                      </button>
                      <button type="submit" className="pp-note-popover-primary">
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="pp-panel-scroll pp-panel-scroll--body">
          {statsTab === 'batting' && (
          <div
            className="pp-tab-panel pp-tab-panel--batting"
            id="pp-panel-batting"
            role="tabpanel"
            aria-labelledby="pp-tab-batting"
          >
            <div className="pp-section pp-section--career-overview">
              <h3 className="pp-section-title pp-section-title--bat">Career Batting</h3>
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

            <div className="pp-detail-divider">
              <span className="pp-detail-divider-text">Analytics & benchmarks</span>
            </div>

            {deepBat ? (
              <BattingDeepPanels deep={deepBat} squadBtCaz={player.btCaz} squadRaw={player.raw} />
            ) : null}

            <div className="pp-section">
              <h3 className="pp-section-title pp-section-title--bat-sub">Recent Performance (Last 10 Innings)</h3>
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
              <h3 className="pp-section-title pp-section-title--bat-sub">{tournamentName} History</h3>
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
            className="pp-tab-panel pp-tab-panel--bowling"
            id="pp-panel-bowling"
            role="tabpanel"
            aria-labelledby="pp-tab-bowling"
          >
            <div className="pp-section pp-section--career-overview">
              <h3 className="pp-section-title pp-section-title--bowl">Career Bowling</h3>
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

            <div className="pp-detail-divider">
              <span className="pp-detail-divider-text">Analytics & benchmarks</span>
            </div>

            {deepBowl ? <BowlingDeepPanels deep={deepBowl} squadEcon={player.econ} /> : null}
          </div>
        )}

          {statsTab === 'h2h' && (
            <div
              className="pp-tab-panel pp-tab-panel--h2h"
              id="pp-panel-h2h"
              role="tabpanel"
              aria-labelledby="pp-tab-h2h"
            >
              <H2hPlaceholder />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
