'use client'

import { useState } from 'react'
import { Team } from '../data/teams'
import { SquadPlayer, makePlaceholderSquad } from '../data/squad'
import SquadTable from './SquadTable'

interface TeamManagerProps {
  team: Team
  tournamentName: string
}

export default function TeamManager({ team, tournamentName }: TeamManagerProps) {
  const [startingXI, setStartingXI] = useState<SquadPlayer[]>(() =>
    makePlaceholderSquad(team.id, 11, 0),
  )
  const [reserves, setReserves] = useState<SquadPlayer[]>(() =>
    makePlaceholderSquad(team.id, 11, 11),
  )

  function handleUpdate(newStarting: SquadPlayer[], newReserves: SquadPlayer[]) {
    setStartingXI(newStarting)
    setReserves(newReserves)
  }

  return (
    <div className="team-manager">
      <div className="team-manager-header">
        <div className="team-manager-identity">
          {team.logo ? (
            <img src={team.logo} alt="" className="team-manager-logo" />
          ) : (
            <div className="team-manager-logo-placeholder">
              {team.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="team-manager-name">{team.name}</h1>
            <div className="team-manager-tournament">{tournamentName}</div>
          </div>
        </div>

        <div className="team-manager-factors">
          <div className="factor-pill">
            <span className="factor-label">Bat</span>
            <span className="factor-value">{team.battingFactor.toFixed(1)}</span>
          </div>
          <div className="factor-pill">
            <span className="factor-label">Bowl</span>
            <span className="factor-value">{team.bowlingFactor.toFixed(1)}</span>
          </div>
          <div className="factor-pill factor-pill-total">
            <span className="factor-label">Total</span>
            <span className="factor-value">{team.totalFactor.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="team-manager-body">
        <SquadTable
          startingXI={startingXI}
          reserves={reserves}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  )
}
