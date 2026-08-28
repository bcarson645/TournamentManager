'use client'

import { useSyncExternalStore } from 'react'
import {
  FORMATS,
  GENDERS,
  getAllTournamentEntries,
  type CricketFormat,
  type Gender,
} from '../data/tournaments'
import {
  getCoverageRotaVersion,
  getTraders,
  getTournamentCoverage,
  subscribeCoverageRota,
} from '../data/coverageRotaStore'
import { getSquadStoreVersion, subscribeSquadStore } from '../data/squadStore'
import type { PrepNavigationTarget } from '../data/prepNavigation'
import TournamentPrepTeamPanel from './TournamentPrepTeamPanel'

const MANAGER_TOURNAMENT_IDS = new Set(
  getAllTournamentEntries().map((entry) => entry.tournament.id),
)

interface TournamentPrepTeamsPageProps {
  tournamentId: string
  tournamentName: string
  format: CricketFormat
  gender: Gender
  country?: string
  onOpenTournamentPrep?: (target: PrepNavigationTarget) => void
}

export default function TournamentPrepTeamsPage({
  tournamentId,
  tournamentName,
  format,
  gender,
  country,
  onOpenTournamentPrep,
}: TournamentPrepTeamsPageProps) {
  useSyncExternalStore(subscribeCoverageRota, getCoverageRotaVersion, () => 0)
  useSyncExternalStore(subscribeSquadStore, getSquadStoreVersion, () => 0)

  const traders = getTraders()
  const coverage = getTournamentCoverage(tournamentId)
  const formatLabel = FORMATS.find((f) => f.key === format)?.label ?? format
  const genderLabel = GENDERS.find((g) => g.key === gender)?.label ?? gender
  const meta = `${formatLabel} · ${genderLabel}${country ? ` · ${country}` : ''}`
  const inManager = MANAGER_TOURNAMENT_IDS.has(tournamentId)

  return (
    <section className="tm-prep-teams-page" aria-label={'Teams prep for ' + tournamentName}>
      <header className="tm-prep-teams-page-head">
        <h1 className="page-heading">{tournamentName}</h1>
        <p className="tm-prep-teams-page-sub">{meta} — assign traders and track squad prep.</p>
      </header>
      <TournamentPrepTeamPanel
        variant="page"
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        meta={meta}
        leadTraderId={coverage.leadTraderId}
        traders={traders}
        canOpenInManager={inManager && Boolean(onOpenTournamentPrep)}
        onOpenTournamentPrep={
          inManager && onOpenTournamentPrep
            ? () => onOpenTournamentPrep({ format, gender, tournamentId })
            : undefined
        }
        onOpenTeamPrep={
          inManager && onOpenTournamentPrep
            ? (teamId) => onOpenTournamentPrep({ format, gender, tournamentId, teamId })
            : undefined
        }
      />
    </section>
  )
}
