/**
 * Start Next dev after clearing a stale lock / orphaned process on port 3000.
 * Safe to run when nothing is listening — netstat/taskkill are no-ops then.
 */
const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const lock = path.join(root, '.next', 'dev', 'lock')

function killPort3000() {
  if (process.platform !== 'win32') return
  try {
    const out = execSync('netstat -ano | findstr ":3000"', { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue
      const parts = line.trim().split(/\s+/)
      const pid = parseInt(parts[parts.length - 1], 10)
      if (Number.isFinite(pid) && pid > 0) pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`Stopped previous dev server (PID ${pid})`)
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing on port 3000 */
  }
}

try {
  fs.unlinkSync(lock)
} catch (e) {
  if (e.code !== 'ENOENT') throw e
}

killPort3000()

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [nextBin, 'dev', '--webpack'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => process.exit(code ?? 0))
