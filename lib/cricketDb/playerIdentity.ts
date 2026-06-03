import { initialsOf, surnameOf, tokens } from './nameMatch'

/**
 * Stable identity for matching "V Kohli", "Virat Kohli", "KL Rahul", "L Rahul".
 * Format: `surname|initials` (lowercase).
 */
export function identityKeyFromName(name: string): string {
  const t = tokens(name)
  if (t.length === 0) return ''
  const surname = surnameOf(name)
  const initials = initialsOf(name).toLowerCase()
  if (!surname) return initials || normalizeFallback(name)
  return `${surname}|${initials || t[0]!.slice(0, 1)}`
}

function normalizeFallback(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

/** All plausible identity keys for lookup (handles Ollie Pope ↔ OJ Pope). */
export function identityKeysFromName(name: string): string[] {
  const keys = new Set<string>()
  const primary = identityKeyFromName(name)
  if (primary) keys.add(primary)

  const t = tokens(name)
  const surname = surnameOf(name)
  if (t.length >= 2 && surname) {
    const first = t[0]!
    if (first.length >= 2 && first.length <= 3) {
      keys.add(`${surname}|${first.toLowerCase()}`)
    }
    const fl = first[0]?.toLowerCase()
    if (fl) keys.add(`${surname}|${fl}`)
  }
  return [...keys]
}

/** True when two names refer to the same person by surname + initials rules. */
export function namesSameIdentity(a: string, b: string): boolean {
  const ka = identityKeyFromName(a)
  const kb = identityKeyFromName(b)
  return ka.length > 0 && ka === kb
}
