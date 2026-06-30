'use client'

export type HomeNavId =
  | 'tournament-manager'
  | 'pre-match-design'
  | 'outrights'
  | 'settings'
  | 'player-team'
  | 'custom-bet'
  | 'schedule'
  | 'coverage'

const NAV_ITEMS: { id: HomeNavId; label: string }[] = [
  { id: 'tournament-manager', label: 'Tournament Manager' },
  { id: 'pre-match-design', label: 'Pre Match Design' },
  { id: 'outrights', label: 'Outrights' },
  { id: 'settings', label: 'Settings' },
  { id: 'player-team', label: 'Player and Team Management' },
  { id: 'custom-bet', label: 'Custom Bet' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'coverage', label: 'Coverage Rota' },
]

interface AppNavSidebarProps {
  activeId: HomeNavId
  onSelect: (id: HomeNavId) => void
}

export default function AppNavSidebar({ activeId, onSelect }: AppNavSidebarProps) {
  return (
    <aside className="app-nav-sidebar" aria-label="Main navigation">
      <nav className="app-nav-sidebar-inner">
        <ul className="app-nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`app-nav-item ${activeId === item.id ? 'app-nav-item-active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
