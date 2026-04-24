'use client'

import { useCallback, useEffect, useState } from 'react'
import { getTournamentOptions, type TournamentOptions } from '../data/tournamentOptions'

export function useTournamentOptions(tournamentId: string): TournamentOptions {
  const [opts, setOpts] = useState<TournamentOptions>(() => getTournamentOptions(tournamentId))

  const refresh = useCallback(() => {
    setOpts(getTournamentOptions(tournamentId))
  }, [tournamentId])

  useEffect(() => {
    refresh()
  }, [tournamentId, refresh])

  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ tournamentId?: string }>).detail
      if (d?.tournamentId == null || d.tournamentId === tournamentId) {
        refresh()
      }
    }
    window.addEventListener('tournament-opts-changed', onChange as EventListener)
    return () => window.removeEventListener('tournament-opts-changed', onChange as EventListener)
  }, [tournamentId, refresh])

  return opts
}
