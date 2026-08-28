'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  getCoverageRotaVersion,
  getTournamentCoverage,
  getTraderById,
  subscribeCoverageRota,
} from '../data/coverageRotaStore'

interface TournamentLeadPrepHintProps {
  tournamentId: string
}

export default function TournamentLeadPrepHint({ tournamentId }: TournamentLeadPrepHintProps) {
  const coverageVersion = useSyncExternalStore(
    subscribeCoverageRota,
    getCoverageRotaVersion,
    getCoverageRotaVersion,
  )

  const { leadName, extraCount } = useMemo(() => {
    void coverageVersion
    const coverage = getTournamentCoverage(tournamentId)
    const lead = getTraderById(coverage.leadTraderId)
    const extra = lead ? Math.max(0, coverage.traderIds.length - 1) : 0
    return { leadName: lead?.name ?? null, extraCount: extra }
  }, [tournamentId, coverageVersion])

  return (
    <div className="tm-lead-prep" aria-label={leadName ? `Lead prep: ${leadName}` : 'Lead prep not assigned'}>
      <span className="tm-lead-prep-label">Lead prep</span>
      <span className={'tm-lead-prep-value' + (leadName ? '' : ' tm-lead-prep-value--empty')}>
        {leadName ?? 'Not assigned'}
        {leadName && extraCount > 0 ? ` (+${extraCount})` : ''}
      </span>
    </div>
  )
}
