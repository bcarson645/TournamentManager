import fs from 'fs'
import path from 'path'

export const BUNDLED_CRICKET_DB_FILENAME = 'bundled-cricket.db'

function isServerlessDeploy(): boolean {
  return process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME
}

function getRuntimeCopyDir(): string {
  if (process.env.CRICKET_DB_DIR) return process.env.CRICKET_DB_DIR
  if (isServerlessDeploy()) return path.join('/tmp', 'tournament-manager')
  return path.join(process.cwd(), 'data')
}

const MIN_BUNDLED_BYTES = 1024 * 1024

/** Candidate locations for the committed DB (Next trace layout varies by route). */
export function getBundledSeedCandidates(): string[] {
  const root = process.cwd()
  const out: string[] = []

  if (process.env.CRICKET_DB_SEED_PATH) {
    out.push(process.env.CRICKET_DB_SEED_PATH)
  }

  out.push(path.join(root, 'data', BUNDLED_CRICKET_DB_FILENAME))

  // Common when the handler runs from .next/server/...
  const serverRoots = [
    path.join(root, '.next', 'server'),
    path.join(root, '.next'),
  ]
  for (const base of serverRoots) {
    out.push(path.join(base, 'data', BUNDLED_CRICKET_DB_FILENAME))
  }

  return [...new Set(out)]
}

function isValidBundledFile(filePath: string): boolean {
  try {
    const st = fs.statSync(filePath)
    return st.isFile() && st.size >= MIN_BUNDLED_BYTES
  } catch {
    return false
  }
}

/** First valid bundled-cricket.db on disk, or null. */
export function resolveBundledSeedPath(): string | null {
  for (const candidate of getBundledSeedCandidates()) {
    if (isValidBundledFile(candidate)) return candidate
  }
  return null
}

function getRuntimeBundledCopyPath(): string {
  return path.join(getRuntimeCopyDir(), BUNDLED_CRICKET_DB_FILENAME)
}

/**
 * Path used to open SQLite.
 * On Vercel/Lambda: copy seed into /tmp once (writable; avoids SQLITE_CANTOPEN on /var/task).
 */
export function getEffectiveBundledDbPath(): string {
  const runtimePath = getRuntimeBundledCopyPath()

  if (!isServerlessDeploy()) {
    const seed = resolveBundledSeedPath()
    if (!seed) {
      throw new Error(
        `Built-in stats missing. Run npm run bundle-db and commit data/${BUNDLED_CRICKET_DB_FILENAME}. Searched: ${getBundledSeedCandidates().join(', ')}`,
      )
    }
    return seed
  }

  if (isValidBundledFile(runtimePath)) {
    return runtimePath
  }

  const seed = resolveBundledSeedPath()
  if (!seed) {
    throw new Error(
      `Built-in stats not in deployment bundle. Ensure data/${BUNDLED_CRICKET_DB_FILENAME} is committed and outputFileTracingIncludes is set. Searched: ${getBundledSeedCandidates().join(', ')}`,
    )
  }

  const dir = path.dirname(runtimePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.copyFileSync(seed, runtimePath)
  return runtimePath
}

export function isBundledStatsAvailable(): boolean {
  return isValidBundledFile(getRuntimeBundledCopyPath()) || resolveBundledSeedPath() !== null
}
