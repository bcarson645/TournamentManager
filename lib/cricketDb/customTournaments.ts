import { getCricketDb } from './client'
import { assertCricketDbWritable } from './writeGuard'
import type { Gender } from '../../app/data/tournaments'

export interface CustomTournament {
  id: string
  name: string
  country: string | null
  gender: Gender
  format: string
}

export interface CustomTeam {
  id: string
  tournamentId: string
  name: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function listCustomTournaments(): CustomTournament[] {
  const db = getCricketDb()
  return db
    .prepare(
      `SELECT id, name, country, gender, format FROM custom_tournaments ORDER BY name`,
    )
    .all() as CustomTournament[]
}

export function listCustomTeams(tournamentId: string): CustomTeam[] {
  const db = getCricketDb()
  return db
    .prepare(
      `SELECT id, tournament_id AS tournamentId, name FROM custom_teams WHERE tournament_id = ? ORDER BY name`,
    )
    .all(tournamentId) as CustomTeam[]
}

export function createCustomTournament(opts: {
  name: string
  country?: string
  gender?: Gender
  linkCompetitionId?: string
}): CustomTournament {
  assertCricketDbWritable()
  const db = getCricketDb()
  const base = slugify(opts.name) || 'league'
  let id = `custom-t20-m-${base}`
  let n = 0
  while (db.prepare(`SELECT 1 FROM custom_tournaments WHERE id = ?`).get(id)) {
    n++
    id = `custom-t20-m-${base}-${n}`
  }
  const gender = opts.gender ?? 'men'
  db.prepare(
    `INSERT INTO custom_tournaments (id, name, country, gender, format, created_at)
     VALUES (?, ?, ?, ?, 't20', datetime('now'))`,
  ).run(id, opts.name.trim(), opts.country?.trim() ?? null, gender)

  if (opts.linkCompetitionId) {
    db.prepare(`UPDATE competition_dim SET tournament_id = ? WHERE competition_id = ?`).run(
      id,
      opts.linkCompetitionId,
    )
  }

  return { id, name: opts.name.trim(), country: opts.country ?? null, gender, format: 't20' }
}

export function addCustomTeam(tournamentId: string, name: string): CustomTeam {
  assertCricketDbWritable()
  const db = getCricketDb()
  const base = slugify(name) || 'team'
  let id = `${tournamentId}-${base}`
  let n = 0
  while (db.prepare(`SELECT 1 FROM custom_teams WHERE id = ?`).get(id)) {
    n++
    id = `${tournamentId}-${base}-${n}`
  }
  db.prepare(
    `INSERT INTO custom_teams (id, tournament_id, name, created_at) VALUES (?, ?, ?, datetime('now'))`,
  ).run(id, tournamentId, name.trim())
  return { id, tournamentId, name: name.trim() }
}
