/**
 * Copy local data/cricket.db → data/bundled-cricket.db for production deploy.
 * Run after importing CSV and applying auto-map locally: npm run bundle-db
 */
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const root = path.join(__dirname, '..')
const src = path.join(root, 'data', 'cricket.db')
const dest = path.join(root, 'data', 'bundled-cricket.db')

if (!fs.existsSync(src)) {
  console.error('Missing data/cricket.db — import your CSV in dev first (Player & Team Management).')
  process.exit(1)
}

const db = new Database(src)
try {
  db.pragma('wal_checkpoint(TRUNCATE)')
  const perf = db.prepare('SELECT COUNT(*) AS c FROM performances').get().c
  const aliases = db.prepare('SELECT COUNT(*) AS c FROM player_aliases').get().c
  if (perf < 1) {
    console.error('data/cricket.db has no performances — import CSV before bundling.')
    process.exit(1)
  }
  if (aliases < 1) {
    console.warn('Warning: no player_aliases — run Auto-map (apply) in PTM before bundling for squad links.')
  }
} finally {
  db.close()
}

fs.copyFileSync(src, dest)
const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1)
console.log(`Wrote ${dest} (${mb} MB). Commit data/bundled-cricket.db for deployed stats.`)
