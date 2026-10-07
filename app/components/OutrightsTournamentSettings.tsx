'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
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

export type OutrightsSettingsPopoverPlacement = 'over' | 'below'

function resolvePopoverAnchor(anchorRef: RefObject<HTMLElement | null>): HTMLElement | null {
  const el = anchorRef.current
  if (!el) return null
  return (el.closest('.outrights-settings-panel-wrap') as HTMLElement | null) ?? el
}

function measurePopover(
  anchor: HTMLElement,
  placement: OutrightsSettingsPopoverPlacement,
): { top: number; left: number; width: number; maxHeight: number } {
  const rect = anchor.getBoundingClientRect()
  const pad = 8
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (placement === 'over') {
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, vw - pad - 240))
    const width = Math.max(240, Math.min(rect.width, vw - left - pad))
    const top = Math.min(Math.max(pad, rect.top), Math.max(pad, vh - pad - 160))
    const maxHeight = Math.max(160, vh - top - pad)
    return { top, left, width, maxHeight }
  }

  const width = Math.min(Math.max(rect.width, 20 * 16), 32 * 16, vw - pad * 2)
  let left = rect.right - width
  left = Math.min(Math.max(pad, left), vw - width - pad)
  let top = rect.bottom + 6
  let maxHeight = vh - top - pad
  if (maxHeight < 180 && rect.top > vh / 2) {
    maxHeight = Math.max(160, rect.top - pad - 6)
    top = Math.max(pad, rect.top - Math.min(360, maxHeight) - 6)
    maxHeight = Math.max(160, rect.top - 6 - top)
  }
  return { top, left, width, maxHeight: Math.max(160, maxHeight) }
}

export function OutrightsSettingsPopover({
  title,
  ariaLabel,
  onClose,
  children,
  anchorRef,
  placement = 'over',
}: {
  title: string
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  anchorRef: RefObject<HTMLElement | null>
  placement?: OutrightsSettingsPopoverPlacement
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)

  const updateCoords = useCallback(() => {
    const anchor = resolvePopoverAnchor(anchorRef)
    if (!anchor) return
    setCoords(measurePopover(anchor, placement))
  }, [anchorRef, placement])

  useEffect(() => {
    const root = document.querySelector('.outrights-root')
    setTarget(root instanceof HTMLElement ? root : document.body)
  }, [])

  useLayoutEffect(() => {
    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [updateCoords])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!target || !coords) return null

  return createPortal(
    <div className="outrights-settings-popover-wrap">
      <div
        className="outrights-settings-popover-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="outrights-settings-popover"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{
          top: coords.top,
          left: coords.left,
          width: coords.width,
          maxHeight: coords.maxHeight,
        }}
      >
        <div className="settings-page-header">
          <button type="button" className="settings-back" onClick={onClose}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
            Back
          </button>
          <h3 className="settings-page-title">{title}</h3>
        </div>
        <div className="settings-page-body">{children}</div>
      </div>
    </div>,
    target,
  )
}

const OPTIONS = [
  { key: 'suspension', label: 'Suspension Settings' },
  { key: 'tournament', label: 'Tournament Settings' },
  { key: 'alerts', label: 'Alerts' },
] as const

const SIMULATOR_OPTION = { key: 'simulator', label: 'Simulator' } as const

type OptionKey = (typeof OPTIONS)[number]['key']

export type OutrightsSettingsPageKey = OptionKey

export interface OutrightsSettingsOpenRequest {
  page: OutrightsSettingsPageKey
  nonce: number
}

interface OutrightsTournamentSettingsProps {
  tournamentId: string
  tournamentName: string
  format: CricketFormat
  outrights: TournamentOutright[]
  onOpenSimulator?: () => void
  openRequest?: OutrightsSettingsOpenRequest | null
}

export default function OutrightsTournamentSettings({
  tournamentId,
  tournamentName,
  format,
  outrights,
  onOpenSimulator,
  openRequest,
}: OutrightsTournamentSettingsProps) {
  const [activePage, setActivePage] = useState<OptionKey | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openRequest) return
    setActivePage(openRequest.page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest, tournamentId])

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

  function renderPageBody(page: OptionKey) {
    if (page === 'suspension') {
      return (
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
      )
    }
    if (page === 'alerts') {
      return (
        <OutrightsAlertsPanel
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          outrights={outrights}
          mode="config"
        />
      )
    }
    return (
      <div className="settings-tournament-form">
        <p className="settings-lead">Outrights options for {tournamentName}</p>
        <p className="settings-placeholder-text">
          Tournament-level outrights configuration will be set up here.
        </p>
      </div>
    )
  }

  const activeOpt = activePage ? OPTIONS.find((o) => o.key === activePage) : null

  return (
    <div className="settings-panel outrights-settings-overlay-anchor" ref={panelRef}>
      <h3 className="settings-heading">Outrights Settings</h3>
      <div className="settings-btn-grid">
        {OPTIONS.map((opt) => (
          <button key={opt.key} type="button" className="settings-btn" onClick={() => setActivePage(opt.key)} aria-expanded={activePage === opt.key} aria-haspopup="dialog">
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

      {activePage && activeOpt ? (
        <OutrightsSettingsPopover
          title={activeOpt.label}
          ariaLabel={`${activeOpt.label} for ${tournamentName}`}
          onClose={() => setActivePage(null)}
          anchorRef={panelRef}
          placement="over"
        >
          {renderPageBody(activePage)}
        </OutrightsSettingsPopover>
      ) : null}
    </div>
  )
}
