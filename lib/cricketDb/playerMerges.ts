import { getCricketDb } from './client'
import { identityKeyFromName, identityKeysFromName } from './playerIdentity'

export interface PlayerMergeRebuildResult {
  identityGroups: number
  mergedPlayerIds: number
  canonicalPlayers: number
}

/** Resolve any raw dataset PlayerID to its canonical merged id. */
export function resolveCanonicalPlayerId(playerId: string): string {
  const db = getCricketDb()
  const row = db
    .prepare(`SELECT canonical_player_id AS id FROM player_id_merges WHERE player_id = ?`)
    .get(playerId) as { id: string } | undefined
  return row?.id ?? playerId
}

/** All raw ids that belong to one canonical person (for aggregating performances). */
export function allPlayerIdsForCanonical(canonicalPlayerId: string): string[] {
  const db = getCricketDb()
  const alts = db
    .prepare(`SELECT player_id AS id FROM player_id_merges WHERE canonical_player_id = ?`)
    .all(canonicalPlayerId) as { id: string }[]
  const set = new Set<string>([canonicalPlayerId, ...alts.map((r) => r.id)])
  return [...set]
}

/**
 * Group dataset players by surname + initials; pick canonical PlayerID (most appearances).
 * Same person with multiple PlayerIDs in the import becomes one logical player.
 */
export function rebuildPlayerMerges(): PlayerMergeRebuildResult {
  const db = getCricketDb()

  const rows = db
    .prepare(
      `SELECT player_id AS playerId,
              MAX(player_name) AS displayName,
              COUNT(*) AS appearances
       FROM performances
       GROUP BY player_id`,
    )
    .all() as { playerId: string; displayName: string; appearances: number }[]

  const byKey = new Map<string, { playerId: string; displayName: string; appearances: number }[]>()
  for (const r of rows) {
    const key = identityKeyFromName(r.displayName)
    if (!key) continue
    const list = byKey.get(key) ?? []
    list.push(r)
    byKey.set(key, list)
  }

  db.exec(`DELETE FROM player_id_merges`)

  const insertMerge = db.prepare(
    `INSERT INTO player_id_merges (player_id, canonical_player_id, identity_key, merged_at)
     VALUES (?, ?, ?, datetime('now'))`,
  )

  let mergedPlayerIds = 0

  const rebuildPlayers = db.transaction(() => {
    db.exec(`DELETE FROM players`)
    const insertPlayer = db.prepare(
      `INSERT INTO players (player_id, display_name, identity_key, appearances, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
    )

    for (const [identityKey, members] of byKey) {
      members.sort((a, b) => b.appearances - a.appearances)
      const canonical = members[0]!
      let totalApps = 0
      for (const m of members) {
        totalApps += m.appearances
        if (m.playerId !== canonical.playerId) {
          insertMerge.run(m.playerId, canonical.playerId, identityKey)
          mergedPlayerIds++
        }
      }
      insertPlayer.run(
        canonical.playerId,
        canonical.displayName,
        identityKey,
        totalApps,
      )
    }
  })

  rebuildPlayers()

  return {
    identityGroups: byKey.size,
    mergedPlayerIds,
    canonicalPlayers: byKey.size,
  }
}

export function findCanonicalByIdentityKey(
  identityKey: string,
): { playerId: string; displayName: string } | null {
  const db = getCricketDb()
  return (
    db
      .prepare(
        `SELECT player_id AS playerId, display_name AS displayName
         FROM players WHERE identity_key = ?`,
      )
      .get(identityKey) as { playerId: string; displayName: string } | undefined
  ) ?? null
}

export function findCanonicalByAppName(
  appName: string,
): { playerId: string; displayName: string; identityKey: string } | null {
  for (const key of identityKeysFromName(appName)) {
    const hit = findCanonicalByIdentityKey(key)
    if (hit) return { ...hit, identityKey: key }
  }
  return null
}
