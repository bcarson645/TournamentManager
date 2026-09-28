'use client'



import { useEffect, useMemo, useState } from 'react'

import {

  buildStatusLog,

  COVERAGE_MODE_LABELS,

  coverageTagClassName,

  coverageTagKindFromLabel,

  fixtureNeedsPrepAssignment,

  formatScheduleTournamentCompactSuffix,

  formatPrepCompletedLabel,

  formatPrepDueLabel,

  formatScoutLabel,

  getFixtureDataAssignment,

  getFixtureTier,

  getRemainingActions,

  isPrepDueSoon,

  isPrepOverdue,

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

import { getAssignableTraders } from '../../data/traders'

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



const COVERAGE_MODE_TAB_CLASS: Record<CoverageMode, string> = {

  'not-covered': 'cov-tab--mode-not-covered',

  'pre-match': 'cov-tab--mode-pre-match',

  live: 'cov-tab--mode-live',

  standard: 'cov-tab--mode-standard',

}



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

  const prepOverdue = isPrepOverdue(fixture, day.date)

  const prepDueSoon = isPrepDueSoon(fixture, day.date)

  const prepDueLabel = formatPrepDueLabel(fixture, day.date)

  const prepCompletedLabel = formatPrepCompletedLabel(fixture)

  const savedCoverageMode = fixture.coverageMode ?? 'standard'

  const savedTrading = fixture.trading ?? ''

  const savedPrep = fixture.prep ?? ''

  const savedScout = fixture.scout ?? false



  const [draftTrading, setDraftTrading] = useState(savedTrading)

  const [draftPrep, setDraftPrep] = useState(savedPrep)

  const [draftCoverageMode, setDraftCoverageMode] = useState<CoverageMode>(savedCoverageMode)

  const [draftScout, setDraftScout] = useState(savedScout)



  useEffect(() => {

    setDraftTrading(savedTrading)

    setDraftPrep(savedPrep)

    setDraftCoverageMode(savedCoverageMode)

    setDraftScout(savedScout)

  }, [fixture.id, savedTrading, savedPrep, savedCoverageMode, savedScout])



  const hasUnsavedChanges = useMemo(() => {

    if (!admin || simulated) return false

    const tradingChanged = needsTrader && draftTrading !== savedTrading

    const prepChanged = needsPrepAssign && draftPrep !== savedPrep

    const coverageChanged = draftCoverageMode !== savedCoverageMode

    const scoutChanged = draftScout !== savedScout

    return tradingChanged || prepChanged || coverageChanged || scoutChanged

  }, [

    admin,

    simulated,

    needsTrader,

    draftTrading,

    savedTrading,

    needsPrepAssign,

    draftPrep,

    savedPrep,

    draftCoverageMode,

    savedCoverageMode,

    draftScout,

    savedScout,

  ])



  const showSuggestions =

    admin && !simulated && needsTrader && !savedTrading && !draftTrading

  const showUnassignedTag = fixture.gap && !simulated && needsTrader

  const showPrepAssign = admin && !simulated && needsPrepAssign

  const showTradingSelect = admin && !simulated && needsTrader



  function handleSave() {

    if (!onUpdateAssignment || !hasUnsavedChanges) return



    const patch: FixtureAssignmentPatch = {}

    if (needsTrader && draftTrading !== savedTrading) {

      patch.trading = draftTrading || null

    }

    if (needsPrepAssign && draftPrep !== savedPrep) {

      patch.prep = draftPrep || null

    }

    if (draftCoverageMode !== savedCoverageMode) {

      patch.coverageMode = draftCoverageMode

    }

    if (draftScout !== savedScout) {

      patch.scout = draftScout

    }



    onUpdateAssignment(patch)

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

        {prepOverdue ? (

          <p className="cov-callout cov-callout--danger" role="alert">

            Prep was due {prepDueLabel?.replace(/^Prep by /, '') ?? '—'} — not complete

          </p>

        ) : prepDueSoon ? (

          <p className="cov-callout cov-callout--prep-soon" role="status">

            Prep due {prepDueLabel?.replace(/^Prep by /, '') ?? '—'} — not complete

          </p>

        ) : null}



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

          {prepOverdue ? <span className="cov-chip cov-chip--danger">Prep overdue</span> : null}

          {prepDueSoon && !prepOverdue ? <span className="cov-chip cov-chip--prep-soon">Prep due soon</span> : null}

          {preMatchOnly ? <span className="cov-chip cov-chip--warn">Publish only — no trader</span> : null}

          {!admin ? <span className="cov-chip cov-chip--info">Read only</span> : null}

          {hasUnsavedChanges ? <span className="cov-chip cov-chip--warn">Unsaved</span> : null}

        </div>



        <section className="cov-match-panel-section">

          <h4 className="cov-match-panel-label">Status</h4>

          {prepDueLabel || prepCompletedLabel ? (

            <p

              className={

                'cov-match-prep-due' +

                (prepOverdue ? ' cov-match-prep-due--overdue' : prepDueSoon ? ' cov-match-prep-due--soon' : prepCompletedLabel ? ' cov-match-prep-due--done' : '')

              }

            >

              {prepCompletedLabel ?? prepDueLabel}

            </p>

          ) : null}

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

              <div><dt>Trading</dt><dd>{savedTrading || (admin ? '— unassigned' : '—')}</dd></div>

            ) : null}

            {preMatchOnly ? (

              <div><dt>Coverage</dt><dd>Pre-match — publish only</dd></div>

            ) : null}

            {notCovered ? (

              <div><dt>Coverage</dt><dd>Not covered</dd></div>

            ) : null}

            <div><dt>Prep</dt><dd>{savedPrep || '—'}</dd></div>

            {prepCompletedLabel ? (

              <div><dt>Prep completed</dt><dd>{prepCompletedLabel}</dd></div>

            ) : prepDueLabel ? (

              <div><dt>Prep due</dt><dd>{prepDueLabel.replace(/^Prep by /, '')}</dd></div>

            ) : null}

            <div><dt>Lead</dt><dd>{fixture.lead ?? day.dailyLead}</dd></div>

            <div><dt>Scout</dt><dd>{formatScoutLabel(savedScout)}</dd></div>

            {getFixtureDataAssignment(fixture) ? (

              <div><dt>Data</dt><dd>{getFixtureDataAssignment(fixture)}</dd></div>

            ) : null}

          </dl>

        </section>



        {showPrepAssign ? (

          <section className="cov-match-panel-section">

            <h4 className="cov-match-panel-label">Prep</h4>

            <p className="cov-muted">Assign a prep trader for this fixture.</p>

            <select

              className="cov-input"

              value={draftPrep}

              onChange={(e) => setDraftPrep(e.target.value)}

            >

              <option value="">Select prep trader…</option>

              {getAssignableTraders().map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}

            </select>

          </section>

        ) : null}



        {showSuggestions ? (

          <section className="cov-match-panel-section">

            <h4 className="cov-match-panel-label">Suggested traders</h4>

            {SCHEDULING_SUGGESTIONS.slice(0, 3).map((s, i) => (

              <div key={s.trader} className="cov-match-suggestion">

                <span>{s.trader}</span>

                {s.senior ? <span className="cov-chip cov-chip--success">Senior</span> : null}

                <span className="cov-muted">{s.score}%</span>

                <button

                  type="button"

                  className={'cov-btn' + (i === 0 ? ' cov-btn--primary' : '')}

                  onClick={() => setDraftTrading(s.trader)}

                >

                  Select

                </button>

              </div>

            ))}

          </section>

        ) : null}



        {showTradingSelect ? (

          <section className="cov-match-panel-section">

            <h4 className="cov-match-panel-label">Trading</h4>

            <select

              className="cov-input"

              value={draftTrading}

              onChange={(e) => setDraftTrading(e.target.value)}

            >

              <option value="">Select trader…</option>

              {getAssignableTraders().map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}

            </select>

          </section>

        ) : null}



        {admin && !simulated ? (

          <section className="cov-match-panel-section">

            <h4 className="cov-match-panel-label">Scout</h4>

            <div className="cov-tabs cov-tabs--scout" role="tablist" aria-label="Scout required">

              {([false, true] as const).map((value) => (

                <button

                  key={value ? 'yes' : 'no'}

                  type="button"

                  role="tab"

                  aria-selected={draftScout === value}

                  className={[

                    'cov-tab',

                    'cov-tab--xs',

                    value ? 'cov-tab--scout-yes' : 'cov-tab--scout-no',

                    draftScout === value ? 'cov-tab-active' : '',

                  ].filter(Boolean).join(' ')}

                  onClick={() => setDraftScout(value)}

                >

                  {formatScoutLabel(value)}

                </button>

              ))}

            </div>

          </section>

        ) : null}



        {admin && !simulated ? (

          <section className="cov-match-panel-section">

            <h4 className="cov-match-panel-label">Client coverage</h4>

            <div className="cov-tabs cov-tabs--coverage" role="tablist" aria-label="Client coverage mode">

              {COVERAGE_MODES.map((mode) => (

                <button

                  key={mode}

                  type="button"

                  role="tab"

                  aria-selected={draftCoverageMode === mode}

                  className={[

                    'cov-tab',

                    COVERAGE_MODE_TAB_CLASS[mode],

                    draftCoverageMode === mode ? 'cov-tab-active' : '',

                  ].filter(Boolean).join(' ')}

                  onClick={() => setDraftCoverageMode(mode)}

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

      </div>



      {admin ? (

        <footer className={'cov-match-panel-foot' + (hasUnsavedChanges ? ' cov-match-panel-foot--dirty' : '')}>

          <div className="cov-match-panel-foot-actions">

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

          </div>

          <div className="cov-match-panel-foot-save">

            <button

              type="button"

              className="cov-btn cov-btn--primary cov-btn--save"

              disabled={!hasUnsavedChanges}

              onClick={handleSave}

            >

              Save changes

            </button>

          </div>

        </footer>

      ) : null}

    </aside>

  )

}


