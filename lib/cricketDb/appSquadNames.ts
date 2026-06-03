import { IPL_PLAYERS } from '../../app/data/iplPlayers'
import { BLAST_MEN_SQUADS } from '../../app/data/blastMenSquads'
import { THE_HUNDRED_MEN_SQUADS } from '../../app/data/theHundredMenPlayers'
import { PLAYER_DATABASE } from '../../app/data/playerDatabase'
import { TEAMS } from '../../app/data/teams'

export interface AppSquadNameEntry {
  appName: string
  /** App team id when from a franchise/county squad list */
  appTeamId?: string
  /** Tournament id when known from squad file */
  tournamentId?: string
}

/** All manager squad / database names we may link to dataset PlayerIDs. */
export function collectAppSquadNames(): AppSquadNameEntry[] {
  const out: AppSquadNameEntry[] = []
  const seen = new Set<string>()

  function add(name: string, meta?: { appTeamId?: string; tournamentId?: string }) {
    const n = name.trim()
    if (!n || seen.has(n.toLowerCase())) return
    seen.add(n.toLowerCase())
    out.push({ appName: n, ...meta })
  }

  for (const [teamId, names] of Object.entries(IPL_PLAYERS)) {
    for (const n of names) add(n, { appTeamId: teamId, tournamentId: 't20-m-ipl' })
  }
  for (const [teamId, names] of Object.entries(BLAST_MEN_SQUADS)) {
    for (const n of names) add(n, { appTeamId: teamId, tournamentId: 't20-m-blast' })
  }
  for (const [teamId, names] of Object.entries(THE_HUNDRED_MEN_SQUADS)) {
    for (const n of names) add(n, { appTeamId: teamId, tournamentId: 't20-m-hundred' })
  }
  for (const p of PLAYER_DATABASE) add(p.name)

  return out
}

export function listBuiltinAppTeams(tournamentId: string): { id: string; name: string }[] {
  return (TEAMS[tournamentId] ?? []).map((t) => ({ id: t.id, name: t.name }))
}
