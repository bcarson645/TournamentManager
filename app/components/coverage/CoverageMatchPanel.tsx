'use client'

import { useState } from 'react'
import {
  buildStatusLog,
  COVERAGE_MODE_LABELS,
  coverageTagClassName,
  coverageTagKindFromLabel,
  fixtureNeedsPrepAssignment,
  formatScheduleTournamentCompactSuffix,
  getFixtureTier,
  getRemainingActions,
  isSimulatedFixture,
  fixtureNeedsTrader,
  fixtureIsPreMatchOnly,
  fixtureIsNotCovered,
  pipelineStepsFromFixture,
  SCHEDULING_SUGGESTIONS,
  type CoverageMode,
  type FixtureAssignmentPatch,
  type FixtureLifecycleAction,
  type Persona,
  type ScheduleDay,
  type ScheduleFixture,
  type ScheduleTournamentGroup,
} from '../../data/coverageScheduleStore'
import { DEFAULT_TRADERS } from '../../data/traders'
import StatusPipelineStrip from '../CoverageStatusPipeline'

interface CoverageMatchPanelProps {
  fixture: ScheduleFixture
  day: ScheduleDay
  tournament: ScheduleTournamentGroup
  persona: Persona
  onClose: () => void
  onUpdateAssignment?: (patch: FixtureAssignmentPatch) => void
  onMarkLifecycle?: (action: FixtureLifecycleAction) => void
}

const COVERAGE_MODES: CoverageMode[] = ['not-covered', 'pre-match', 'live', 'standard']

export default function CoverageMatchPanel({
  fixture,
  day,
  tournament,
  persona,
  onClose,
  onUpdateAssignment,
  onMarkLifecycle,
}: CoverageMatchPanelProps) {
  const admin = persona === 'admin'
  const simulated = isSimulatedFixture(fixture, tournament.code)
  const preMatchOnly = fixtureIsPreMatchOnly(fixture)
  const notCovered = fixtureIsNotCovered(fixture)
  const needsTrader = fixtureNeedsTrader(fixture)
  const needsPrepAssign = fixtureNeedsPrepAssignment(fixture)
  const remaining = getRemainingActions(fixture)
  const log = buildStatusLog(fixture)
  const steps = pipelineStepsFromFixture(fixture)
  const tier = getFixtureTier(fixture, tournament.code)
  const tournamentSuffix = formatScheduleTournamentCompactSuffix(tournament)
  const coverageMode = fixture.coverageMode ?? 'standard'
  const [draftTrader, setDraftTrader] = useState('')
  const [draftPrep, setDraftPrep] = useState('')
  const showSuggestions = admin && !simulated && needsTrader && !fixture.trading && !draftTrader
  const showUnassignedTag = fixture.gap && !simulated && needsTrader
  const showPrepAssign = admin && !simulated && needsPrepAssign

  function assignPrep(trader: string) {
    if (!trader || !onUpdateAssignment) return
    onUpdateAssignment({ prep: trader })
    setDraftPrep('')
  }

  const subtitleParts = [tournamentSuffix, `Tier ${tier}`].filter(Boolean)

  return (
    <aside className="cov-match-panel" aria-label="Match detail">
      <header className="cov-match-panel-head">
        <div className="cov-match-panel-head-main">
          <p className="cov-match-panel-eyebrow">
            <span className="cov-match-panel-tournament-code">{tournament.code}</span>
            <span className="cov-match-panel-eyebrow-sep" aria-hidden="true">·</span>
            <span>{tournament.name}</span>
          </p>
          <h2 className="cov-match-panel-title">
            {fixture.match}
            {fixture.fcDay ? (
              <span className="cov-match-panel-fc-day"> · {fixture.fcDay}</span>
            ) : null}
          </h2>
          <p className="cov-match-panel-subtitle">{subtitleParts.join(' · ')}</p>
          <p className="cov-match-panel-datetime">
            <time dateTime={day.date}>{day.label}</time>
            <span className="cov-match-panel-kickoff" aria-label="Kick-off time">{fixture.time}</span>
          </p>
        </div>
        <button type="button" className="cov-btn cov-btn--icon cov-match-panel-close" onClick={onClose} aria-label="Close panel">×</button>
      </header>

      <div className="cov-match-panel-body">
        <div className="cov-match-panel-tags">
          {fixture.coverageLabel ? (
            <span className={coverageTagClassName(coverageTagKindFromLabel(fixture.coverageLabel))}>
              {fixture.coverageLabel}
            </span>
          ) : null}
          {preMatchOnly ? (
            <span className={coverageTagClassName('pre-match')}>{COVERAGE_MODE_LABELS['pre-match']}</span>
          ) : null}
          {notCovered ? (
            <span className={coverageTagClassName('not-covered')}>{COVERAGE_MODE_LABELS['not-covered']}</span>
          ) : null}
          {simulated ? <span className={coverageTagClassName('simulated')}>Simulated</span> : null}
          {fixture.tier ? <span className="cov-chip cov-chip--warn">Tier {fixture.tier}</span> : null}
          {showUnassignedTag ? <span className="cov-chip cov-chip--danger">Unassigned</span> : null}
          {needsPrepAssign ? <span className="cov-chip cov-chip--warn">Prep unassigned</span> : null}
          {preMatchOnly ? <span className="cov-chip cov-chip--warn">Publish only — no trader</span> : null}
          {!admin ? <span className="cov-chip cov-chip--info">Read only</span> : null}
        </div>

        <section className="cov-match-panel-section">
          <h4 className="cov-match-panel-label">Status</h4>
          <StatusPipelineStrip fixture={fixture} />
          {remaining.length === 0 ? (
            <p className="cov-callout cov-callout--success">All prep, publish, and settle steps complete.</p>
          ) : (
            <div className="cov-callout cov-callout--warn">
              <strong>{remaining.length} remaining</strong>
              <ul className="cov-match-action-list">
                {remaining.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </div>
          )}
        </section>

        <section className="cov-match-panel-section">
          <h4 className="cov-match-panel-label">Assignments</h4>
          <dl className="cov-match-assign-grid">
            {simulated ? (
              <div><dt>Trading</dt><dd>Simulated (automated)</dd></div>
            ) : needsTrader ? (
              <div><dt>Trading</dt><dd>{fixture.trading ?? (admin ? '— unassigned' : '—')}</dd></div>
            ) : null}
            {preMatchOnly ? (
              <div><dt>Coverage</dt><dd>Pre-match — publish only</dd></div>
            ) : null}
            {notCovered ? (
              <div><dt>Coverage</dt><dd>Not covered</dd></div>
            ) : null}
            <div><dt>Prep</dt><dd>{fixture.prep ?? '—'}</dd></div>
            <div><dt>Lead</dt><dd>{fixture.lead ?? day.dailyLead}</dd></div>
            <div><dt>Scout</dt><dd>{fixture.scout}</dd></div>
          </dl>
        </section>

        {showPrepAssign ? (
          <section className="cov-match-panel-section">
            <h4 className="cov-match-panel-label">Prep</h4>
            <p className="cov-muted">Assign a prep trader for this fixture.</p>
            <select
              className="cov-input"
              value={draftPrep}
              onChange={(e) => {
                const value = e.target.value
                setDraftPrep(value)
                if (value) assignPrep(value)
              }}
            >
              <option value="">Select prep trader…</option>
              {DEFAULT_TRADERS.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </section>
        ) : null}

        {showSuggestions ? (
          <>
            <section className="cov-match-panel-section">
              <h4 className="cov-match-panel-label">Suggested traders</h4>
              {SCHEDULING_SUGGESTIONS.slice(0, 3).map((s, i) => (
                <div key={s.trader} className="cov-match-suggestion">
                  <span>{s.trader}</span>
                  {s.senior ? <span className="cov-chip cov-chip--success">Senior</span> : null}
                  <span className="cov-muted">{s.score}%</span>
                  <button type="button" className={'cov-btn' + (i === 0 ? ' cov-btn--primary' : '')} onClick={() => setDraftTrader(s.trader)}>Apply</button>
                </div>
              ))}
            </section>

            <section className="cov-match-panel-section">
              <h4 className="cov-match-panel-label">Trading</h4>
              <select className="cov-input" value={draftTrader} onChange={(e) => setDraftTrader(e.target.value)}>
                <option value="">Select trader…</option>
                {DEFAULT_TRADERS.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </section>
          </>
        ) : null}

        {admin && !simulated && needsTrader && !showSuggestions ? (
          <section className="cov-match-panel-section">
            <h4 className="cov-match-panel-label">Trading</h4>
            <select className="cov-input" defaultValue={fixture.trading ?? ''}>
              <option value="">Select trader…</option>
              {DEFAULT_TRADERS.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </section>
        ) : null}

        {admin && !simulated ? (
          <section className="cov-match-panel-section">
            <h4 className="cov-match-panel-label">Client coverage</h4>
            <div className="cov-tabs">
              {COVERAGE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={'cov-tab' + (coverageMode === mode ? ' cov-tab-active' : '')}
                  onClick={() => onUpdateAssignment?.({ coverageMode: mode })}
                >
                  {COVERAGE_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {fixture.preparedBy ? (
          <section className="cov-match-panel-section">
            <h4 className="cov-match-panel-label">Prepared</h4>
            <p className="cov-muted">{fixture.preparedBy}</p>
            {admin ? <button type="button" className="cov-btn">Open in Prep assignments</button> : null}
          </section>
        ) : null}

        {fixture.marketsSent != null ? (
          <p className="cov-muted">
            Markets sent: {fixture.marketsSent}{fixture.marketsTotal ? ` / ${fixture.marketsTotal}` : ''}
          </p>
        ) : null}

        {fixture.note ? (
          <section className="cov-match-panel-section">
            <h4 className="cov-match-panel-label">Notes</h4>
            <p className="cov-muted">{fixture.note}</p>
          </section>
        ) : null}

        <section className="cov-match-panel-section">
          <h4 className="cov-match-panel-label">Change log</h4>
          <table className="cov-table cov-table--compact">
            <thead>
              <tr><th>Step</th><th>Status</th><th>By</th><th>When</th></tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={`${entry.step}-${entry.status}`}>
                  <td>{entry.step}</td>
                  <td>{entry.status}</td>
                  <td>{entry.by}</td>
                  <td>{entry.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {admin ? (
          <footer className="cov-match-panel-foot">
            <button
              type="button"
              className={
                'cov-btn' +
                (steps.prep === 'current' ? ' cov-btn--status-prepare' : '')
              }
              disabled={steps.prep === 'done'}
              onClick={() => onMarkLifecycle?.('prep-done')}
            >
              Mark prep done
            </button>
            <button
              type="button"
              className={
                'cov-btn' +
                (steps.publish === 'current' ? ' cov-btn--status-publish' : '')
              }
              disabled={steps.publish === 'done'}
              onClick={() => onMarkLifecycle?.('published')}
            >
              Mark published
            </button>
            <button
              type="button"
              className={
                'cov-btn' +
                (steps.settle === 'current' ? ' cov-btn--status-settle' : '')
              }
              disabled={steps.settle === 'done'}
              onClick={() => onMarkLifecycle?.('settled')}
            >
              Mark settled
            </button>
          </footer>
        ) : null}
      </div>
    </aside>
  )
}
