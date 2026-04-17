/* Remove stale Next.js dev lock (safe if file missing). */
const fs = require('fs')
const path = require('path')
const lock = path.join(__dirname, '..', '.next', 'dev', 'lock')
try {
  fs.unlinkSync(lock)
  console.log('Removed .next/dev/lock')
} catch (e) {
  if (e.code !== 'ENOENT') throw e
}
