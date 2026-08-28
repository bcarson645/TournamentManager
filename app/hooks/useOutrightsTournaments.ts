'use client'

import { useCallback, useEffect, useState } from 'react'
import { FORMATS, GENDERS, getAllTournamentEntries, type CricketFormat, type Gender, type Tournament } from '../data/tournaments'
import { getOutrightsEnabledTournamentIds } from '../data/tournamentOptions'

export interface OutrightsTournamentEntry {
  format: CricketFormat
  gender: Gender
  tournament: Tournament
}

export function useOutrightsTournaments(): OutrightsTournamentEntry[] {
  const [ids, setIds] = useState<string[]>(() => getOutrightsEnabledTournamentIds())

  const refresh = useCallback(() => {
    setIds(getOutrightsEnabledTournamentIds())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener('tournament-opts-changed', onChange)
    return () => window.removeEventListener('tournament-opts-changed', onChange)
  }, [refresh])

  return getAllTournamentEntries().filter((entry) => ids.includes(entry.tournament.id))
}
