'use client'

import { useSyncExternalStore } from 'react'
import {
  evaluateOutrightAlerts,
  getOutrightAlertsSettings,
  getOutrightAlertsStoreVersion,
  saveOutrightAlertsSettings,
  subscribeOutrightAlertsStore,
  type OutrightAlert,
} from '../data/outrightAlertsStore'
import type { TournamentOutright } from '../data/outrightsStore'

interface OutrightsAlertsPanelProps {
  tournamentId: string
  tournamentName: string
  outrights: TournamentOutright[]
}

function alertClass(severity: OutrightAlert['severity']): string {
  return severity === 'warning' ? 'outrights-alert-item outrights-alert-item--warning' : 'outrights-alert-item outrights-alert-item--info'
}

export default function OutrightsAlertsPanel({
  tournamentId,
  tournamentName,
  outrights,
}: OutrightsAlertsPanelProps) {
  useSyncExternalStore(subscribeOutrightAlertsStore, getOutrightAlertsStoreVersion, getOutrightAlertsStoreVersion)

  const settings = getOutrightAlertsSettings(tournamentId)
  const liveAlerts = evaluateOutrightAlerts(tournamentId, outrights, settings)

  return (
    <div className="settings-tournament-form outrights-alerts-form">
      <p className="settings-lead">Alerts for {tournamentName}</p>
      <p className="settings-par-score-hint">
        Configure pricing and market alerts. Active alerts are evaluated from current market data.
      </p>

      <label className="settings-toggle-row">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => saveOutrightAlertsSettings(tournamentId, { enabled: e.target.checked })}
        />
        <span>
          <strong>Enable alerts</strong>
          <span className="settings-par-score-meta"> — show and evaluate alert rules for this tournament</span>
        </span>
      </label>

      <fieldset className="outrights-alerts-rules" disabled={!settings.enabled}>
        <legend className="outrights-suspension-legend">Alert rules</legend>

        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.missingPricesEnabled}
            onChange={(e) => saveOutrightAlertsSettings(tournamentId, { missingPricesEnabled: e.target.checked })}
          />
          <span>
            <strong>Missing or unconfirmed prices</strong>
            <span className="settings-par-score-meta"> — inactive markets without full pricing workflow</span>
          </span>
        </label>

        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.overroundEnabled}
            onChange={(e) => saveOutrightAlertsSettings(tournamentId, { overroundEnabled: e.target.checked })}
          />
          <span>
            <strong>Overround threshold</strong>
            <span className="settings-par-score-meta"> — sum of 1/input price</span>
          </span>
        </label>
        {settings.overroundEnabled ? (
          <label className="outrights-simulator-field outrights-alerts-threshold">
            <span>Max implied total</span>
            <input
              type="number"
              min={1}
              max={2}
              step={0.01}
              value={settings.overroundThreshold}
              onChange={(e) => {
                const n = parseFloat(e.target.value)
                if (Number.isFinite(n) && n >= 1) {
                  saveOutrightAlertsSettings(tournamentId, { overroundThreshold: n })
                }
              }}
            />
          </label>
        ) : null}

        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.modelledDriftEnabled}
            onChange={(e) => saveOutrightAlertsSettings(tournamentId, { modelledDriftEnabled: e.target.checked })}
          />
          <span>
            <strong>Modelled price drift</strong>
            <span className="settings-par-score-meta"> — input vs modelled</span>
          </span>
        </label>
        {settings.modelledDriftEnabled ? (
          <label className="outrights-simulator-field outrights-alerts-threshold">
            <span>Max drift (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={settings.modelledDriftPercent}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                if (Number.isFinite(n) && n > 0) {
                  saveOutrightAlertsSettings(tournamentId, { modelledDriftPercent: n })
                }
              }}
            />
          </label>
        ) : null}

        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.bet365DriftEnabled}
            onChange={(e) => saveOutrightAlertsSettings(tournamentId, { bet365DriftEnabled: e.target.checked })}
          />
          <span>
            <strong>Bet365 price drift</strong>
            <span className="settings-par-score-meta"> — input vs Bet365</span>
          </span>
        </label>
        {settings.bet365DriftEnabled ? (
          <label className="outrights-simulator-field outrights-alerts-threshold">
            <span>Max drift (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={settings.bet365DriftPercent}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                if (Number.isFinite(n) && n > 0) {
                  saveOutrightAlertsSettings(tournamentId, { bet365DriftPercent: n })
                }
              }}
            />
          </label>
        ) : null}
      </fieldset>

      <div className="outrights-alerts-live">
        <h4 className="outrights-alerts-live-title">Active alerts</h4>
        {!settings.enabled ? (
          <p className="settings-par-score-hint">Alerts are disabled for this tournament.</p>
        ) : liveAlerts.length === 0 ? (
          <p className="settings-par-score-hint">No alerts triggered for current market data.</p>
        ) : (
          <ul className="outrights-alerts-list">
            {liveAlerts.map((alert) => (
              <li key={alert.id} className={alertClass(alert.severity)}>
                <span className="outrights-alert-market">
                  {alert.marketLabel} <span className="outrights-market-id">({alert.marketId})</span>
                </span>
                <span className="outrights-alert-message">{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
