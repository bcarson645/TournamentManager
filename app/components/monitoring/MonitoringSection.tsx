'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import {
  MONITORING_ALERTS,
  MONITORING_COMPETITIONS,
  MONITORING_DEFAULT_SLOT_BOARD_IDS,
  MONITORING_FIXTURES,
  fixtureStatusLabel,
  type MonitoringFixture,
  type MonitoringPriceBoard,
} from '../../data/monitoringDemoData'
import MonitoringFixtureFullscreen from './MonitoringFixtureFullscreen'

function boardGridTemplateColumns(slotCount: number): string {
  const slots = `repeat(${slotCount}, var(--mon-slot-w))`
  return `minmax(14rem, 1.1fr) minmax(0, 1fr) ${slots} minmax(0, 1fr) var(--mon-rail-w)`
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function catalogBoards(): { id: string; name: string }[] {
  const map = new Map<string, string>()
  for (const f of MONITORING_FIXTURES) {
    for (const b of f.priceBoards) map.set(b.id, b.name)
  }
  return Array.from(map, ([id, name]) => ({ id, name }))
}

function templateBoard(boardId: string): MonitoringPriceBoard | null {
  for (const f of MONITORING_FIXTURES) {
    const b = f.priceBoards.find((x) => x.id === boardId)
    if (b) return b
  }
  return null
}

function boardForFixture(fixture: MonitoringFixture, boardId: string): MonitoringPriceBoard {
  const found = fixture.priceBoards.find((b) => b.id === boardId)
  if (found) return found
  const t = templateBoard(boardId)
  if (t) {
    return {
      id: boardId,
      name: t.name,
      columns: t.columns.map((c) => ({ label: c.label, value: '—' })),
    }
  }
  return {
    id: boardId,
    name: '—',
    columns: [
      { label: '—', value: '—' },
      { label: '—', value: '—' },
      { label: '—', value: '—' },
    ],
  }
}

export default function MonitoringSection() {
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [sportOpen, setSportOpen] = useState(true)
  const [selectedCompetitions, setSelectedCompetitions] = useState<Set<string>>(
    () => new Set(MONITORING_COMPETITIONS.map((c) => c.id)),
  )
  const [fullscreenFixtureId, setFullscreenFixtureId] = useState<string | null>(null)
  const [focusedFixtureId, setFocusedFixtureId] = useState<string | null>(null)
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)
  const [slotBoardIds, setSlotBoardIds] = useState<string[]>(() => [
    ...MONITORING_DEFAULT_SLOT_BOARD_IDS,
  ])
  const [includedFixtureIds, setIncludedFixtureIds] = useState<Set<string>>(
    () => new Set(MONITORING_FIXTURES.map((f) => f.id)),
  )
  const [openCompetitionIds, setOpenCompetitionIds] = useState<Set<string>>(
    () => new Set(MONITORING_COMPETITIONS.map((c) => c.id)),
  )
  const [openTreeFixtureIds, setOpenTreeFixtureIds] = useState<Set<string>>(() => new Set())

  const boardCatalog = useMemo(() => catalogBoards(), [])

  const filteredFixtures = useMemo(() => {
    const q = search.trim().toLowerCase()
    return MONITORING_FIXTURES.filter((f) => {
      if (!selectedCompetitions.has(f.competitionId)) return false
      if (dateFilter && f.date !== dateFilter) return false
      if (!q) return true
      const hay = `${f.homeTeam} ${f.awayTeam} ${f.competitionLabel}`.toLowerCase()
      return hay.includes(q)
    })
  }, [search, dateFilter, selectedCompetitions])

  const panelFixtures = useMemo(
    () => filteredFixtures.filter((f) => includedFixtureIds.has(f.id)),
    [filteredFixtures, includedFixtureIds],
  )

  const visibleAlerts = useMemo(() => {
    const ids = new Set(panelFixtures.map((f) => f.id))
    return MONITORING_ALERTS.filter((a) => ids.has(a.fixtureId))
  }, [panelFixtures])

  const slotTemplates = useMemo(
    () => slotBoardIds.map((id) => templateBoard(id)),
    [slotBoardIds],
  )

  function toggleCompetition(id: string) {
    setSelectedCompetitions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCompetitionOpen(id: string) {
    setOpenCompetitionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTreeFixtureOpen(id: string) {
    setOpenTreeFixtureIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function focusFixtureFromTree(fixtureId: string) {
    setFocusedFixtureId(fixtureId)
  }

  function toggleFixtureIncluded(fixtureId: string) {
    setIncludedFixtureIds((prev) => {
      const next = new Set(prev)
      if (next.has(fixtureId)) next.delete(fixtureId)
      else next.add(fixtureId)
      return next
    })
  }

  function removeFixtureFromPanel(fixtureId: string) {
    setIncludedFixtureIds((prev) => {
      const next = new Set(prev)
      next.delete(fixtureId)
      return next
    })
    if (focusedFixtureId === fixtureId) setFocusedFixtureId(null)
    if (fullscreenFixtureId === fixtureId) setFullscreenFixtureId(null)
  }

  function includeAllFilteredFixtures() {
    setIncludedFixtureIds((prev) => {
      const next = new Set(prev)
      for (const f of filteredFixtures) next.add(f.id)
      return next
    })
  }

  const fullscreenFixture = useMemo(
    () => MONITORING_FIXTURES.find((f) => f.id === fullscreenFixtureId) ?? null,
    [fullscreenFixtureId],
  )

  function setSlotBoard(slot: number, boardId: string) {
    setSlotBoardIds((prev) => {
      const next = [...prev]
      next[slot] = boardId
      return next
    })
  }

  return (
    <div className="monitoring-root">
      <header className="monitoring-topbar">
        <div className="monitoring-topbar-title">
          <span className="monitoring-topbar-product">Expert Radar</span>
          <span className="monitoring-topbar-sep">/</span>
          <span className="monitoring-topbar-page">Fixture browser</span>
        </div>
        <span className="monitoring-topbar-meta">Cricket</span>
      </header>

      <div className="monitoring-shell">
        <aside className="monitoring-left" aria-label="Fixture tree">
          <div className="monitoring-left-search">
            <input
              type="search"
              className="monitoring-search-input"
              placeholder="Search fixtures…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search fixtures"
            />
          </div>
          <div className="monitoring-date-filter">
            <label className="monitoring-date-label">
              <span>Date</span>
              <input
                type="date"
                className="monitoring-date-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>
            {dateFilter ? (
              <button
                type="button"
                className="monitoring-date-clear"
                onClick={() => setDateFilter('')}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="monitoring-tree">
            <button
              type="button"
              className="monitoring-tree-sport"
              onClick={() => setSportOpen((o) => !o)}
              aria-expanded={sportOpen}
            >
              <span className="monitoring-cricket-icon" aria-hidden>🏏</span>
              <span className="monitoring-tree-sport-label">Cricket</span>
              <span className="monitoring-tree-chevron">{sportOpen ? '▾' : '▸'}</span>
            </button>
            {sportOpen ? (
              <ul className="monitoring-tree-list">
                {MONITORING_COMPETITIONS.map((comp) => {
                  const compOpen = openCompetitionIds.has(comp.id)
                  const compFixtures = MONITORING_FIXTURES.filter((f) => f.competitionId === comp.id)
                  return (
                    <li key={comp.id} className="monitoring-tree-comp">
                      <div className="monitoring-tree-comp-row">
                        <button
                          type="button"
                          className="monitoring-tree-expander"
                          onClick={() => toggleCompetitionOpen(comp.id)}
                          aria-expanded={compOpen}
                          aria-label={`${compOpen ? 'Collapse' : 'Expand'} ${comp.label}`}
                        >
                          {compOpen ? '▾' : '▸'}
                        </button>
                        <label className="monitoring-tree-comp-label">
                          <input
                            type="checkbox"
                            checked={selectedCompetitions.has(comp.id)}
                            onChange={() => toggleCompetition(comp.id)}
                          />
                          <span className="monitoring-tree-comp-name">{comp.label}</span>
                          <span className="monitoring-tree-count">({comp.fixtureCount})</span>
                        </label>
                      </div>
                      {compOpen ? (
                        <ul className="monitoring-tree-fixtures">
                          {compFixtures.map((f) => {
                            const fixtureOpen = openTreeFixtureIds.has(f.id)
                            return (
                              <li key={f.id} className="monitoring-tree-fixture-item">
                                <div className="monitoring-tree-fixture-row">
                                  <button
                                    type="button"
                                    className="monitoring-tree-expander monitoring-tree-expander--fixture"
                                    onClick={() => toggleTreeFixtureOpen(f.id)}
                                    aria-expanded={fixtureOpen}
                                    aria-label={`${fixtureOpen ? 'Collapse' : 'Expand'} ${f.homeTeam} v ${f.awayTeam}`}
                                  >
                                    {fixtureOpen ? '▾' : '▸'}
                                  </button>
                                  <input
                                    type="checkbox"
                                    className="monitoring-tree-fixture-check"
                                    checked={includedFixtureIds.has(f.id)}
                                    onChange={() => toggleFixtureIncluded(f.id)}
                                    aria-label={`Show ${f.homeTeam} v ${f.awayTeam} in fixture list`}
                                  />
                                  <button
                                    type="button"
                                    className={
                                      'monitoring-tree-fixture-btn' +
                                      (focusedFixtureId === f.id
                                        ? ' monitoring-tree-fixture-btn--active'
                                        : '') +
                                      (!includedFixtureIds.has(f.id)
                                        ? ' monitoring-tree-fixture-btn--off'
                                        : '')
                                    }
                                    onClick={() => focusFixtureFromTree(f.id)}
                                  >
                                    <span className="monitoring-tree-fixture-teams">
                                      {f.homeTeam} v {f.awayTeam}
                                    </span>
                                    <span className="monitoring-tree-fixture-meta">
                                      {formatDisplayDate(f.date)} · {f.startTimeLabel}
                                    </span>
                                  </button>
                                </div>
                                {fixtureOpen ? (
                                  <div className="monitoring-tree-fixture-panel">
                                    <p className="monitoring-tree-fixture-panel-line">
                                      <span className="monitoring-tree-fixture-panel-k">Ref</span>
                                      {f.refId}
                                    </p>
                                    <p className="monitoring-tree-fixture-panel-line">
                                      <span className="monitoring-tree-fixture-panel-k">Status</span>
                                      {fixtureStatusLabel(f.status)} · {f.statusDetail}
                                    </p>
                                    <p className="monitoring-tree-fixture-panel-line">
                                      <span className="monitoring-tree-fixture-panel-k">Score</span>
                                      {f.scoreHome} – {f.scoreAway}
                                    </p>
                                    <div className="monitoring-tree-fixture-panel-actions">
                                      <button
                                        type="button"
                                        className="monitoring-tree-panel-btn"
                                        onClick={() => {
                                          if (!includedFixtureIds.has(f.id)) toggleFixtureIncluded(f.id)
                                          focusFixtureFromTree(f.id)
                                        }}
                                      >
                                        Show on board
                                      </button>
                                      <button
                                        type="button"
                                        className="monitoring-tree-panel-btn"
                                        onClick={() => {
                                          setFocusedFixtureId(f.id)
                                          setFullscreenFixtureId(f.id)
                                        }}
                                      >
                                        Fullscreen
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </aside>

        <section className="monitoring-center" aria-label="Fixtures">
          {settingsNotice ? (
            <div className="monitoring-settings-notice" role="status">
              <span>
                Demo: fixture settings for{' '}
                <strong>{MONITORING_FIXTURES.find((f) => f.id === settingsNotice)?.refId}</strong>{' '}
                (market overrides, scouting rules) — not wired yet.
              </span>
              <button
                type="button"
                className="monitoring-settings-notice-dismiss"
                onClick={() => setSettingsNotice(null)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ) : null}
          {filteredFixtures.length === 0 ? (
            <p className="monitoring-empty">No fixtures match your filters.</p>
          ) : panelFixtures.length === 0 ? (
            <div className="monitoring-empty monitoring-empty--select">
              <p>No fixtures on the board. Tick games in the fixture tree to show them here.</p>
              <button
                type="button"
                className="monitoring-empty-restore"
                onClick={includeAllFilteredFixtures}
              >
                Show all filtered fixtures
              </button>
            </div>
          ) : (
            <div className="monitoring-board-scroll">
              <div
                className="monitoring-board-inner"
                style={{ gridTemplateColumns: boardGridTemplateColumns(slotBoardIds.length) }}
              >
                <MonitoringMarketToolbar
                  slotBoardIds={slotBoardIds}
                  slotTemplates={slotTemplates}
                  boardCatalog={boardCatalog}
                  onSelectSlot={setSlotBoard}
                />
                {panelFixtures.map((f, i) => (
                  <FixtureRow
                    key={f.id}
                    fixture={f}
                    rowIndex={i}
                    slotBoardIds={slotBoardIds}
                    slotTemplates={slotTemplates}
                    highlighted={focusedFixtureId === f.id}
                    onFocus={() => setFocusedFixtureId(f.id)}
                    onDismiss={() => removeFixtureFromPanel(f.id)}
                    onExpand={() => {
                      setFocusedFixtureId(f.id)
                      setFullscreenFixtureId(f.id)
                    }}
                    onSettings={() => setSettingsNotice(f.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="monitoring-right" aria-label="Alerts and information">
          <h2 className="monitoring-right-title">Alerts &amp; info</h2>
          <div className="monitoring-alerts">
            {visibleAlerts.length === 0 ? (
              <p className="monitoring-empty monitoring-empty--compact">No alerts for visible fixtures.</p>
            ) : (
              visibleAlerts.map((a) => {
                const fx = MONITORING_FIXTURES.find((f) => f.id === a.fixtureId)
                return (
                  <article
                    key={a.id}
                    className={`monitoring-alert monitoring-alert--${a.severity}`}
                  >
                    <div className="monitoring-alert-head">
                      <strong>{a.title}</strong>
                      <span className="monitoring-alert-ago">{a.agoLabel}</span>
                    </div>
                    {fx ? (
                      <p className="monitoring-alert-fixture">
                        {fx.homeTeam} v {fx.awayTeam}
                      </p>
                    ) : null}
                    <p className="monitoring-alert-body">{a.body}</p>
                  </article>
                )
              })
            )}
          </div>
          <div className="monitoring-info-card">
            <h3 className="monitoring-info-title">Session info</h3>
            <p className="monitoring-info-body">
              Demo monitoring view. Markets and alert rules will be wired to live feeds in a later
              iteration.
            </p>
          </div>
        </aside>
      </div>

      {fullscreenFixture ? (
        <MonitoringFixtureFullscreen
          fixture={fullscreenFixture}
          onClose={() => setFullscreenFixtureId(null)}
        />
      ) : null}
    </div>
  )
}

function MonitoringMarketToolbar({
  slotBoardIds,
  slotTemplates,
  boardCatalog,
  onSelectSlot,
}: {
  slotBoardIds: string[]
  slotTemplates: (MonitoringPriceBoard | null)[]
  boardCatalog: { id: string; name: string }[]
  onSelectSlot: (slot: number, boardId: string) => void
}) {
  return (
    <div className="monitoring-grid-row monitoring-toolbar-row">
      <div className="monitoring-grid-lead monitoring-toolbar-lead">
        <span>Teams / score</span>
      </div>
      <div className="monitoring-grid-spacer monitoring-toolbar-spacer" aria-hidden />
      {slotBoardIds.map((boardId, slot) => {
        const tmpl = slotTemplates[slot]
        const colCount = tmpl?.columns.length ?? 3
        return (
          <div
            key={slot}
            className="monitoring-grid-slot monitoring-toolbar-slot"
            style={{ '--mon-cols': colCount } as CSSProperties}
          >
            <select
              className="monitoring-market-select"
              value={boardId}
              onChange={(e) => onSelectSlot(slot, e.target.value)}
              aria-label={`Market column ${slot + 1}`}
            >
              {boardCatalog.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="monitoring-market-slot-labels">
              {(tmpl?.columns ?? []).map((c) => (
                <span key={c.label} className="monitoring-market-col-label">{c.label}</span>
              ))}
            </div>
          </div>
        )
      })}
      <div className="monitoring-grid-spacer monitoring-toolbar-spacer" aria-hidden />
      <div className="monitoring-grid-rail monitoring-toolbar-rail" aria-hidden />
    </div>
  )
}

function teamInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function MatchTeamLine({
  side,
  name,
  score,
  batting,
}: {
  side: 'home' | 'away'
  name: string
  score: string
  batting: boolean
}) {
  return (
    <div className="monitoring-match-team">
      <span
        className={
          'monitoring-team-badge' +
          (side === 'home' ? ' monitoring-team-badge--a' : ' monitoring-team-badge--b')
        }
        aria-hidden
      >
        {teamInitials(name)}
      </span>
      <span className="monitoring-match-team-name">
        {name}
        {batting ? (
          <span
            className="monitoring-batting-dot"
            title={`${name} batting`}
            role="img"
            aria-label={`${name} batting`}
          />
        ) : null}
      </span>
      <span className="monitoring-match-team-score">{score}</span>
    </div>
  )
}

function FixtureRow({
  fixture: f,
  rowIndex,
  slotBoardIds,
  slotTemplates,
  highlighted,
  onFocus,
  onDismiss,
  onExpand,
  onSettings,
}: {
  fixture: MonitoringFixture
  rowIndex: number
  slotBoardIds: string[]
  slotTemplates: (MonitoringPriceBoard | null)[]
  highlighted: boolean
  onFocus: () => void
  onDismiss: () => void
  onExpand: () => void
  onSettings: () => void
}) {
  const live = f.status === 'live'

  return (
    <div
      className={
        'monitoring-match-card' +
        (highlighted ? ' monitoring-match-card--highlight' : '') +
        (live ? ' monitoring-match-card--live' : '') +
        (rowIndex % 2 === 1 ? ' monitoring-match-card--alt' : '')
      }
    >
      <button
        type="button"
        className="monitoring-match-dismiss"
        onClick={onDismiss}
        aria-label={`Remove ${f.homeTeam} v ${f.awayTeam} from board`}
        title="Remove from board"
      >
        ✕
      </button>
      <div className="monitoring-grid-row monitoring-match-row">
        <div className="monitoring-grid-lead monitoring-match-lead">
          <div className="monitoring-match-lead-controls">
            <span
              className={
                'monitoring-scout-toggle' + (f.scouting ? ' monitoring-scout-toggle--on' : '')
              }
              title={f.scouting ? 'Scouting on' : 'No scouting'}
              role="img"
              aria-label={f.scouting ? 'Scouting on' : 'Scouting off'}
            />
            <span
              className={
                'monitoring-match-flag' + (live ? '' : ' monitoring-match-flag--dim')
              }
              title={live ? 'In progress' : 'Not live'}
              aria-hidden
            >
              ⚑
            </span>
          </div>
          <div className="monitoring-match-teams">
            <MatchTeamLine
              side="home"
              name={f.homeTeam}
              score={f.scoreHome}
              batting={f.battingSide === 'home'}
            />
            <MatchTeamLine
              side="away"
              name={f.awayTeam}
              score={f.scoreAway}
              batting={f.battingSide === 'away'}
            />
            <div className="monitoring-match-meta">
              <span className="monitoring-match-ref">{f.refId}</span>
              <span className="monitoring-match-format">{f.formatLabel}</span>
              <span className={`monitoring-status monitoring-status--${f.status}`}>
                {fixtureStatusLabel(f.status)}
              </span>
              <span className="monitoring-fixture-detail">{f.statusDetail}</span>
            </div>
          </div>
        </div>

        <div className="monitoring-grid-spacer monitoring-match-spacer" aria-hidden />

        {slotBoardIds.map((boardId, slot) => {
          const colCount = slotTemplates[slot]?.columns.length ?? 3
          const board = boardForFixture(f, boardId)
          const cells = [...board.columns]
          while (cells.length < colCount) cells.push({ label: '', value: '—' })
          return (
            <div
              key={slot}
              className="monitoring-grid-slot monitoring-match-slot"
              style={{ '--mon-cols': colCount } as CSSProperties}
            >
              <div className="monitoring-market-slot-cells">
                {cells.slice(0, colCount).map((col, ci) => (
                  <span
                    key={col.label + ci}
                    className={
                      'monitoring-odds-cell' +
                      (col.value === '—' ? ' monitoring-odds-cell--empty' : '')
                    }
                  >
                    {col.value}
                  </span>
                ))}
              </div>
            </div>
          )
        })}

        <div className="monitoring-grid-spacer monitoring-match-spacer" aria-hidden />

        <div className="monitoring-grid-rail monitoring-match-rail">
          <button
            type="button"
            className="monitoring-btn-settings"
            onClick={() => {
              onFocus()
              onSettings()
            }}
            aria-label={`Settings for ${f.homeTeam} v ${f.awayTeam}`}
            title="Fixture settings"
          >
            ⚙
          </button>
          <button
            type="button"
            className="monitoring-btn-expand"
            onClick={() => {
              onFocus()
              onExpand()
            }}
            aria-label={`Expand ${f.homeTeam} v ${f.awayTeam}`}
          >
            Expand
          </button>
        </div>
      </div>
    </div>
  )
}
