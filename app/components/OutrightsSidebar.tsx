'use client'

import { useEffect, useRef, useState } from 'react'
import { FORMATS, GENDERS } from '../data/tournaments'
import {
  createOutright,
  OUTRIGHT_TYPES,
  OUTRIGHT_TYPE_LABELS,
  outrightStatusLabel,
  type OutrightType,
  type TournamentOutright,
} from '../data/outrightsStore'
import type { OutrightsTournamentEntry } from '../hooks/useOutrightsTournaments'

type SidebarMode = 'tournaments' | 'tournament'

interface OutrightsSidebarProps {
  mode: SidebarMode
  tournaments: OutrightsTournamentEntry[]
  selectedEntry: OutrightsTournamentEntry | null
  outrights: TournamentOutright[]
  selectedOutrightId: string | null
  showSimulatorPage?: boolean
  onSelectTournament: (entry: OutrightsTournamentEntry) => void
  onBackToTournaments: () => void
  onSelectOutright: (id: string | null) => void
  onOpenSimulator?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export default function OutrightsSidebar({
  mode,
  tournaments,
  selectedEntry,
  outrights,
  selectedOutrightId,
  showSimulatorPage = false,
  onSelectTournament,
  onBackToTournaments,
  onSelectOutright,
  onOpenSimulator,
  collapsed = false,
  onToggleCollapsed,
}: OutrightsSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  const fmt = selectedEntry ? FORMATS.find((f) => f.key === selectedEntry.format) : null
  const gen = selectedEntry ? GENDERS.find((g) => g.key === selectedEntry.gender) : null
  const usedTypes = new Set(outrights.map((o) => o.type))
  const availableTypes = OUTRIGHT_TYPES.filter((t) => !usedTypes.has(t))
  const allCreated = availableTypes.length === 0

  useEffect(() => {
    if (!createOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [createOpen])

  function handleCreate(type: OutrightType) {
    if (!selectedEntry) return
    const created = createOutright(selectedEntry.tournament.id, type)
    if (created) onSelectOutright(created.id)
    setCreateOpen(false)
  }

  return (
    <aside className={'sidebar outrights-sidebar' + (collapsed ? ' sidebar--collapsed' : '')}>
      <div className="sidebar-toolbar">
        {onToggleCollapsed ? (
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? '\u00bb' : '\u00ab'}
          </button>
        ) : null}
        {mode === 'tournament' ? (
          <button type="button" className="sidebar-home" onClick={onBackToTournaments}>
            {collapsed ? '\u2190' : '\u2190 All Tournaments'}
          </button>
        ) : null}
      </div>

      {!collapsed && mode === 'tournaments' && (
        <div className="sidebar-section sidebar-teams-section">
          <div className="sidebar-section-label">Tournaments</div>
          <ul className="sidebar-tree">
            {tournaments.map((entry) => {
              const entryFmt = FORMATS.find((f) => f.key === entry.format)!
              const entryGen = GENDERS.find((g) => g.key === entry.gender)!
              const isActive = entry.tournament.id === selectedEntry?.tournament.id
              return (
                <li key={`${entry.tournament.id}-${entry.format}-${entry.gender}`}>
                  <button
                    type="button"
                    className={`sidebar-tree-item outrights-sidebar-tournament ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTournament(entry)}
                  >
                    <span className="sidebar-team-initial">{entry.tournament.name.charAt(0)}</span>
                    <span className="outrights-sidebar-tournament-text">
                      <span className="outrights-sidebar-tournament-name">{entry.tournament.name}</span>
                      <span className="outrights-sidebar-tournament-meta">
                        {entryFmt.label} · {entryGen.label}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!collapsed && mode === 'tournament' && selectedEntry && fmt && gen && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Format</div>
            <div className="sidebar-current">
              <span className="sidebar-icon">{fmt.icon}</span>
              {fmt.label}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Category</div>
            <div className="sidebar-current">
              <span className="sidebar-icon">{gen.icon}</span>
              {gen.label}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Tournament</div>
            <button
              type="button"
              className={`sidebar-tree-item outrights-sidebar-overview ${selectedOutrightId === null && !showSimulatorPage ? 'active' : ''}`}
              onClick={() => onSelectOutright(null)}
            >
              {selectedEntry.tournament.name}
            </button>
            <button
              type="button"
              className={`sidebar-tree-item outrights-sidebar-simulator ${showSimulatorPage ? 'active' : ''}`}
              onClick={() => onOpenSimulator?.()}
            >
              Simulator
            </button>
          </div>

          <div className="sidebar-section sidebar-teams-section">
            <div className="sidebar-section-label">Markets</div>
            {outrights.length > 0 ? (
              <ul className="sidebar-tree">
                {outrights.map((outright) => {
                  const status = outright.status ?? 'inactive'
                  return (
                    <li key={outright.id}>
                      <button
                        type="button"
                        className={`sidebar-tree-item outrights-sidebar-market ${outright.id === selectedOutrightId ? 'active' : ''}`}
                        onClick={() => onSelectOutright(outright.id)}
                      >
                        <span className="outrights-sidebar-market-label">
                          <span className="outrights-market-name">{OUTRIGHT_TYPE_LABELS[outright.type]}</span>
                          <span className="outrights-market-id">Market ID: {outright.marketId}</span>
                        </span>
                        <span className={`outrights-status-badge outrights-status-${status}`}>
                          {outrightStatusLabel(status)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="outrights-sidebar-empty">No markets yet.</p>
            )}

            <div className="outrights-sidebar-create" ref={createRef}>
              <button
                type="button"
                className="outrights-create-btn outrights-create-btn-compact"
                onClick={() => setCreateOpen((open) => !open)}
                disabled={allCreated}
                aria-expanded={createOpen}
                aria-haspopup="menu"
              >
                Create Outright
              </button>
              {createOpen && availableTypes.length > 0 && (
                <ul className="outrights-create-menu" role="menu">
                  {availableTypes.map((type) => (
                    <li key={type} role="none">
                      <button
                        type="button"
                        className="outrights-create-option"
                        role="menuitem"
                        onClick={() => handleCreate(type)}
                      >
                        {OUTRIGHT_TYPE_LABELS[type]}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
