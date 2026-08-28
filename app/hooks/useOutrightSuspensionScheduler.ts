'use client'

import { useEffect } from 'react'
import { applyOutrightAutoSuspension } from '../data/outrightSuspensionStore'
import { getOutrightsEnabledTournamentIds } from '../data/tournamentOptions'

const TICK_MS = 60_000

export function useOutrightSuspensionScheduler(tournamentIds: string[]): void {
  useEffect(() => {
    if (typeof window === 'undefined') return

    function tick() {
      const ids =
        tournamentIds.length > 0 ? tournamentIds : getOutrightsEnabledTournamentIds()
      for (const tournamentId of ids) {
        applyOutrightAutoSuspension(tournamentId)
      }
    }

    tick()
    const timer = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(timer)
  }, [tournamentIds.join('|')])
}
