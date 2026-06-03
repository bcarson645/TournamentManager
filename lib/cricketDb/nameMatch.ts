/** Normalize for fuzzy name / team comparison. */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/\b(fc|cc|county|cricket club)\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function tokens(s: string): string[] {
  return normalizeKey(s).split(' ').filter(Boolean)
}

export function surnameOf(name: string): string {
  const t = tokens(name)
  return t.length ? t[t.length - 1]! : ''
}

export function initialsOf(name: string): string {
  const t = tokens(name)
  if (t.length <= 1) return t[0]?.[0] ?? ''
  return t
    .slice(0, -1)
    .map((x) => x[0])
    .join('')
}

/** 0–1 similarity for team / full-name equality. */
export function stringSimilarity(a: string, b: string): number {
  const na = normalizeKey(a)
  const nb = normalizeKey(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.92

  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  let inter = 0
  for (const x of ta) if (tb.has(x)) inter++
  const union = ta.size + tb.size - inter
  const jaccard = union > 0 ? inter / union : 0

  const sa = surnameOf(a)
  const sb = surnameOf(b)
  if (sa && sb && sa === sb) {
    const ia = initialsOf(a)
    const ib = initialsOf(b)
    if (!ia || !ib) return Math.max(jaccard, 0.75)
    if (ia === ib) return Math.max(jaccard, 0.95)
    if (ia[0] === ib[0]) return Math.max(jaccard, 0.82)
    if (ia.length === 1 && ib.startsWith(ia)) return Math.max(jaccard, 0.88)
    if (ib.length === 1 && ia.startsWith(ib)) return Math.max(jaccard, 0.88)
    if (ia.length === 2 && ib.length === 2 && ia[0] === ib[0] && ia[1] === ib[1]) {
      return Math.max(jaccard, 0.95)
    }
    return Math.max(jaccard, 0.7)
  }
  return jaccard
}

/** Match app full name to dataset "Initial Surname" style. */
export function playerNameSimilarity(appName: string, datasetName: string): number {
  const exact = normalizeKey(appName) === normalizeKey(datasetName)
  if (exact) return 1
  return stringSimilarity(appName, datasetName)
}
