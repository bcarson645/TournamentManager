'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getOutrightsForTournament,
  OUTRIGHTS_CHANGE_EVENT,
  type TournamentOutright,
} from '../data/outrightsStore'

export function useTournamentOutrights(tournamentId: string | null): TournamentOutright[] {
  const [outrights, setOutrights] = useState<TournamentOutright[]>(() =>
    tournamentId ? getOutrightsForTournament(tournamentId) : [],
  )

  const refresh = useCallback(() => {
    setOutrights(tournamentId ? getOutrightsForTournament(tournamentId) : [])
  }, [tournamentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener(OUTRIGHTS_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(OUTRIGHTS_CHANGE_EVENT, onChange)
  }, [refresh])

  return outrights
}
