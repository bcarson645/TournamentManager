import path from 'path'
import fs from 'fs'

export function getCricketDbPath(): string {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'cricket.db')
}
