'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  reactivateOutright,
  suspendOutright,
  type TournamentOutright,
} from '../data/outrightsStore'
import {
  OUTRIGHT_SUSPENSION_MODE_LABELS,
  addDailySuspensionWindow,
  applyOutrightAutoSuspension,
  evaluateOutrightSuspension,
  getFixturesForTournament,
  getOutrightSuspensionSettings,
  getOutrightSuspensionStoreVersion,
  markManualOutrightReactivate,
  markManualOutrightSuspend,
  removeDailySuspensionWindow,
  saveOutrightSuspensionSettings,
  subscribeOutrightSuspensionStore,
  updateDailySuspensionWindow,
  type OutrightSuspensionMode,
} from '../data/outrightSuspensionStore'
import type { CricketFormat } from '../data/tournaments'
import OutrightsAlertsPanel from './OutrightsAlertsPanel'

const OPTIONS = [
  { key: 'suspension', label: 'Suspension Settings' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'tournament', label: 'Tournament Settings' },
] as const

const SIMULATOR_OPTION = { key: 'simulator', label: 'Simulator' } as const

type OptionKey = (typeof OPTIONS)[number]['key']

interface OutrightsTournamentSettingsProps {
  tournamentId: string
  tournamentName: string
  format: CricketFormat
  outrights: TournamentOutright[]
  onOpenSimulator?: () => void
}

export default function OutrightsTournamentSettings({
  tournamentId,
  tournamentName,
  format,
  outrights,
  onOpenSimulator,
}: OutrightsTournamentSettingsProps) {
  const [activePage, setActivePage] = useState<OptionKey | null>(null)

  useSyncExternalStore(
    subscribeOutrightSuspensionStore,
    getOutrightSuspensionStoreVersion,
    getOutrightSuspensionStoreVersion,
  )

  const suspensionSettings = getOutrightSuspensionSettings(tournamentId)
  const activeOutrights = outrights.filter((o) => (o.status ?? 'inactive') === 'published')
  const suspendedOutrights = outrights.filter((o) => o.status === 'suspended')

  const liveEvaluation = evaluateOutrightSuspension(
    suspensionSettings,
    getFixturesForTournament(tournamentId),
    new Date(),
  )

  function suspendAllActive() {
    if (activeOutrights.length === 0) return
    const ok = window.confirm(
      `Suspend all ${activeOutrights.length} active market${activeOutrights.length === 1 ? '' : 's'} for ${tournamentName}?`,
    )
    if (!ok) return
    for (const outright of activeOutrights) {
      suspendOutright(tournamentId, outright.id)
      markManualOutrightSuspend(tournamentId, outright.id)
    }
  }

  function reactivateAllSuspended() {
    if (suspendedOutrights.length === 0) return
    const ok = window.confirm(
      `Reactivate all ${suspendedOutrights.length} suspended market${suspendedOutrights.length === 1 ? '' : 's'} for ${tournamentName}?`,
    )
    if (!ok) return
    for (const outright of suspendedOutrights) {
      reactivateOutright(tournamentId, outright.id)
      markManualOutrightReactivate(tournamentId, outright.id, liveEvaluation.suspendUntilMs)
    }
  }

  function handleModeChange(mode: OutrightSuspensionMode) {
    saveOutrightSuspensionSettings(tournamentId, { mode })
    applyOutrightAutoSuspension(tournamentId)
  }

  if (activePage) {
    const opt = OPTIONS.find((o) => o.key === activePage)!

    return (
      <div className="settings-panel">
        <div className="settings-page-header">
          <button type="button" className="settings-back" onClick={() => setActivePage(null)}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
            Back
          </button>
          <h3 className="settings-page-title">{opt.label}</h3>
        </div>
        <div className="settings-page-body">
          {activePage === 'suspension' ? (
            <div className="settings-tournament-form outrights-suspension-form">
              <p className="settings-lead">Suspension for {tournamentName}</p>
              <p className="settings-par-score-hint">
                Active: {activeOutrights.length}. Suspended: {suspendedOutrights.length}.
                {suspensionSettings.mode !== 'manual' ? (
                  <>
                    {' '}
                    Auto rule: {liveEvaluation.shouldSuspend ? 'suspend now' : 'offer markets'}.
                    {liveEvaluation.reason ? ` (${liveEvaluation.reason})` : ''}
                  </>
                ) : null}
              </p>

              <fieldset className="outrights-suspension-mode">
                <legend className="outrights-suspension-legend">Suspension mode</legend>
                {(Object.keys(OUTRIGHT_SUSPENSION_MODE_LABELS) as OutrightSuspensionMode[]).map((mode) => (
                  <label key={mode} className="outrights-suspension-mode-option">
                    <input
                      type="radio"
                      name="suspension-mode"
                      checked={suspensionSettings.mode === mode}
                      onChange={() => handleModeChange(mode)}
                    />
                    <span>{OUTRIGHT_SUSPENSION_MODE_LABELS[mode]}</span>
                  </label>
                ))}
              </fieldset>

              {suspensionSettings.mode === 'manual' ? (
                <p className="settings-par-score-hint">
                  Markets suspend and reactivate only when you use the Suspend / Reactivate buttons or per-market
                  controls.
                </p>
              ) : null}

              {suspensionSettings.mode === 'fixture' ? (
                <div className="outrights-suspension-mode-panel">
                  <p className="settings-par-score-hint">
                    Suspend all active markets before each fixture using Tournament Manager fixture dates and a default
                    kickoff time.
                  </p>
                  <div className="outrights-simulator-controls">
                    <label className="outrights-simulator-field">
                      <span>Suspend before kickoff (min)</span>
                      <input
                        type="number"
                        min={0}
                        max={240}
                        step={5}
                        value={suspensionSettings.minutesBeforeFixture}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          if (Number.isFinite(n) && n >= 0) {
                            saveOutrightSuspensionSettings(tournamentId, { minutesBeforeFixture: n })
                            applyOutrightAutoSuspension(tournamentId)
                          }
                        }}
                      />
                    </label>
                    <label className="outrights-simulator-field">
                      <span>Default kickoff</span>
                      <input
                        type="time"
                        value={suspensionSettings.defaultKickoffTime}
                        onChange={(e) => {
                          saveOutrightSuspensionSettings(tournamentId, { defaultKickoffTime: e.target.value })
                          applyOutrightAutoSuspension(tournamentId)
                        }}
                      />
                    </label>
                    <label className="outrights-simulator-field">
                      <span>Suspend duration (min)</span>
                      <input
                        type="number"
                        min={60}
                        max={600}
                        step={15}
                        value={suspensionSettings.fixtureSuspendDurationMinutes}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          if (Number.isFinite(n) && n > 0) {
                            saveOutrightSuspensionSettings(tournamentId, { fixtureSuspendDurationMinutes: n })
                            applyOutrightAutoSuspension(tournamentId)
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {suspensionSettings.mode === 'daily' ? (
                <div className="outrights-suspension-mode-panel">
                  <p className="settings-par-score-hint">
                    Suspend active markets between set times each day. Leave date blank to apply every day.
                  </p>
                  <div className="outrights-suspension-daily-list">
                    {suspensionSettings.dailyWindows.map((window) => (
                      <div key={window.id} className="outrights-suspension-daily-row">
                        <label className="outrights-simulator-field">
                          <span>Date (optional)</span>
                          <input
                            type="date"
                            value={window.date ?? ''}
                            onChange={(e) => {
                              updateDailySuspensionWindow(tournamentId, window.id, {
                                date: e.target.value || undefined,
                              })
                              applyOutrightAutoSuspension(tournamentId)
                            }}
                          />
                        </label>
                        <label className="outrights-simulator-field">
                          <span>Suspend at</span>
                          <input
                            type="time"
                            value={window.suspendTime}
                            onChange={(e) => {
                              updateDailySuspensionWindow(tournamentId, window.id, { suspendTime: e.target.value })
                              applyOutrightAutoSuspension(tournamentId)
                            }}
                          />
                        </label>
                        <label className="outrights-simulator-field">
                          <span>Resume at</span>
                          <input
                            type="time"
                            value={window.resumeTime}
                            onChange={(e) => {
                              updateDailySuspensionWindow(tournamentId, window.id, { resumeTime: e.target.value })
                              applyOutrightAutoSuspension(tournamentId)
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="outrights-action-btn outrights-action-btn-sm"
                          disabled={suspensionSettings.dailyWindows.length <= 1}
                          onClick={() => {
                            removeDailySuspensionWindow(tournamentId, window.id)
                            applyOutrightAutoSuspension(tournamentId)
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="outrights-action-btn outrights-action-btn-sm"
                    onClick={() => addDailySuspensionWindow(tournamentId)}
                  >
                    Add daily window
                  </button>
                </div>
              ) : null}

              <div className="outrights-settings-actions">
                <button
                  type="button"
                  className="outrights-action-btn outrights-action-btn-warn"
                  disabled={activeOutrights.length === 0}
                  onClick={suspendAllActive}
                >
                  Suspend all active markets
                </button>
                <button
                  type="button"
                  className="outrights-action-btn outrights-action-btn-primary"
                  disabled={suspendedOutrights.length === 0}
                  onClick={reactivateAllSuspended}
                >
                  Reactivate all suspended markets
                </button>
              </div>
            </div>
          ) : activePage === 'alerts' ? (
            <OutrightsAlertsPanel
              tournamentId={tournamentId}
              tournamentName={tournamentName}
              outrights={outrights}
            />
          ) : (
            <div className="settings-tournament-form">
              <p className="settings-lead">Outrights options for {tournamentName}</p>
              <p className="settings-placeholder-text">
                Tournament-level outrights configuration will be set up here.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="settings-panel">
      <h3 className="settings-heading">Outrights Settings</h3>
      <div className="settings-btn-grid">
        {OPTIONS.map((opt) => (
          <button key={opt.key} type="button" className="settings-btn" onClick={() => setActivePage(opt.key)}>
            <span className="settings-btn-label">{opt.label}</span>
            <svg className="settings-btn-arrow" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
          </button>
        ))}
        <button type="button" className="settings-btn" onClick={() => onOpenSimulator?.()}>
          <span className="settings-btn-label">{SIMULATOR_OPTION.label}</span>
          <svg className="settings-btn-arrow" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
