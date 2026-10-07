'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import PlayerFullProfile, { type HubPlayerTeamRef } from './PlayerFullProfile';
import { getPlayerBio, savePlayerBio } from '../data/playerBioStore';
import {
  PLAYER_PROFILE_LAYOUT_META,
  getPlayerProfileLayout,
  getPlayerProfileLayoutVersion,
  movePlayerProfileSection,
  resetPlayerProfileLayout,
  setPlayerProfileSectionVisibility,
  subscribePlayerProfileLayout,
  type PlayerProfileSectionId,
} from '../data/playerProfileLayout';
import { getAllTournamentEntries } from '../data/tournaments';
import { getTeamsByTournament } from '../data/teams';
import { getSquadForTeam } from '../data/squadStore';

/** Example player used by the layout board preview. */
export const LAYOUT_BOARD_EXAMPLE_PLAYER = 'Joe Root';

/** Seed values applied only when the matching bio field is missing. */
const JOE_ROOT_SEED = {
  fullName: 'Joe Root',
  dob: '1990-12-30',
  nationality: 'England',
  battingStyle: 'Right hand Bat',
  bowlingStyle: 'Right arm Offbreak',
  playingRole: 'Top order Batter',
} as const;

/**
 * Seed Joe Root's bio when fields are missing. Never overwrites saved edits:
 * only fills empty / Unknown values. Returns true when anything was written.
 */
function seedJoeRootBio(): boolean {
  const existing = getPlayerBio(LAYOUT_BOARD_EXAMPLE_PLAYER);
  if (!existing) {
    savePlayerBio(LAYOUT_BOARD_EXAMPLE_PLAYER, { ...JOE_ROOT_SEED, bio: '' });
    return true;
  }
  const patch: Record<string, string> = {};
  if (!existing.fullName.trim()) patch.fullName = JOE_ROOT_SEED.fullName;
  if (!existing.dob) patch.dob = JOE_ROOT_SEED.dob;
  if (!existing.nationality.trim()) patch.nationality = JOE_ROOT_SEED.nationality;
  if (!existing.battingStyle || existing.battingStyle === 'Unknown') {
    patch.battingStyle = JOE_ROOT_SEED.battingStyle;
  }
  if (!existing.bowlingStyle || existing.bowlingStyle === 'Unknown') {
    patch.bowlingStyle = JOE_ROOT_SEED.bowlingStyle;
  }
  if (!existing.playingRole || existing.playingRole === 'Unknown') {
    patch.playingRole = JOE_ROOT_SEED.playingRole;
  }
  if (Object.keys(patch).length === 0) return false;
  savePlayerBio(LAYOUT_BOARD_EXAMPLE_PLAYER, patch);
  return true;
}

/** Find every squad team containing this player (case-insensitive). */
function findTeamsForPlayer(playerName: string): HubPlayerTeamRef[] {
  const needle = playerName.trim().toLowerCase();
  const out: HubPlayerTeamRef[] = [];
  for (const entry of getAllTournamentEntries()) {
    let teams: { id: string; name: string }[] = [];
    try {
      teams = getTeamsByTournament(entry.tournament.id).map((t) => ({ id: t.id, name: t.name }));
    } catch {
      continue;
    }
    for (const team of teams) {
      let names: string[] = [];
      try {
        const squad = getSquadForTeam(team.id);
        names = [...squad.startingXI, ...squad.reserves, ...squad.impactSubs].map((p) => p.name);
      } catch {
        continue;
      }
      if (names.some((n) => n.trim().toLowerCase() === needle)) {
        out.push({
          teamId: team.id,
          teamName: team.name,
          tournamentId: entry.tournament.id,
          tournamentName: entry.tournament.name,
        });
      }
    }
  }
  return out;
}

export default function PlayerLayoutBoard({ onBackToHub }: { onBackToHub?: () => void }) {
  const layoutVersion = useSyncExternalStore(
    subscribePlayerProfileLayout,
    getPlayerProfileLayoutVersion,
    getPlayerProfileLayoutVersion,
  );
  void layoutVersion;
  const layout = getPlayerProfileLayout();

  const [seedNote, setSeedNote] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setSeedNote(seedJoeRootBio() ? 'Joe Root bio seeded (missing fields only).' : null);
  }, []);

  const joeRootTeams = useMemo(() => findTeamsForPlayer(LAYOUT_BOARD_EXAMPLE_PLAYER), []);
  const visibleCount = layout.sections.filter((s) => s.visible).length;

  return (
    <div className="plb-root">
      <div className="plb-head">
        <div>
          <h2 className="plb-title">Player layout board</h2>
          <p className="plb-sub">
            Configure the full-screen player profile layout. Changes apply live to the Joe Root
            preview and persist to this browser (localStorage). Use the Format
            control inside the preview (All / T20 / ODI / TEST / FC) to check each
            view — squad teams render inline as chips in the profile header.
            {seedNote ? ` ${seedNote}` : ''}
          </p>
        </div>
        <div className="plb-head-actions">
          {onBackToHub && (
            <button type="button" className="ph-btn ph-btn-ghost" onClick={onBackToHub}>
              Back to Hub
            </button>
          )}
          <button
            type="button"
            className="ph-btn ph-btn-ghost"
            onClick={() => resetPlayerProfileLayout()}
          >
            Reset layout
          </button>
        </div>
      </div>

      <div className="plb-grid">
        <div className="plb-preview" aria-label="Live profile preview">
          <div className="plb-pane-label">
            Live preview — {LAYOUT_BOARD_EXAMPLE_PLAYER}
            <span className="plb-pane-hint">
              {visibleCount} of {layout.sections.length} sections visible
            </span>
          </div>
          <div className="plb-preview-frame">
            <PlayerFullProfile
              playerName={LAYOUT_BOARD_EXAMPLE_PLAYER}
              squadPlayer={null}
              teams={joeRootTeams}
              contextTournamentId={joeRootTeams[0]?.tournamentId ?? null}
              eyebrow={`Layout Board / ${LAYOUT_BOARD_EXAMPLE_PLAYER}`}
              onBack={() => {}}
              onOpenTeam={() => {}}
            />
          </div>
        </div>

        <aside className="plb-config" aria-label="Layout configuration">
          <div className="plb-pane-label">Sections</div>
          <ol className="plb-list">
            {layout.sections.map((section, index) => {
              const meta = PLAYER_PROFILE_LAYOUT_META[section.id as PlayerProfileSectionId];
              return (
                <li
                  key={section.id}
                  className={`plb-row${section.visible ? '' : ' plb-row-hidden'}${dragIndex === index ? ' plb-row-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) {
                      movePlayerProfileSection(dragIndex, index);
                    }
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className="plb-grip" title="Drag to reorder" aria-hidden="true">
                    ⋮⋮
                  </span>
                  <span className="plb-order">{index + 1}</span>
                  <span className="plb-row-text">
                    <span className="plb-row-label">{meta.label}</span>
                    <span className="plb-row-desc">{meta.description}</span>
                  </span>
                  <span className="plb-row-controls">
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost ph-btn-sm"
                      disabled={index === 0}
                      onClick={() => movePlayerProfileSection(index, index - 1)}
                      aria-label={`Move ${meta.label} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost ph-btn-sm"
                      disabled={index === layout.sections.length - 1}
                      onClick={() => movePlayerProfileSection(index, index + 1)}
                      aria-label={`Move ${meta.label} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={section.visible}
                      className={`plb-switch${section.visible ? ' plb-switch-on' : ''}`}
                      onClick={() =>
                        setPlayerProfileSectionVisibility(section.id, !section.visible)
                      }
                      aria-label={`Show ${meta.label}`}
                      title={section.visible ? 'Hide section' : 'Show section'}
                    >
                      <span className="plb-switch-knob" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="plb-foot">
            Order and visibility persist to localStorage. Profiles fall back to the default order
            when no saved layout exists. Stored layouts from before the Teams
            section was removed are migrated automatically.
          </p>
        </aside>
      </div>
    </div>
  );
}