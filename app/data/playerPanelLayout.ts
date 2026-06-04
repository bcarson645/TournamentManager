/** Resizable player / analytics side panel (TeamManager). */
export const PLAYER_PANEL_WIDTH_MIN = 280
export const PLAYER_PANEL_WIDTH_MAX = 820
export const PLAYER_PANEL_WIDTH_DEFAULT = 420
export const PLAYER_PANEL_WIDTH_STORAGE_KEY = 'tm-player-panel-w'

export function clampPlayerPanelWidth(px: number): number {
  return Math.min(PLAYER_PANEL_WIDTH_MAX, Math.max(PLAYER_PANEL_WIDTH_MIN, px))
}

export function readStoredPlayerPanelWidth(): number {
  if (typeof window === 'undefined') return PLAYER_PANEL_WIDTH_DEFAULT
  const raw = localStorage.getItem(PLAYER_PANEL_WIDTH_STORAGE_KEY)
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) ? clampPlayerPanelWidth(n) : PLAYER_PANEL_WIDTH_DEFAULT
}

export const PLAYER_PANEL_MAX_WIDTH_CSS = 'min(820px, 78vw)'
