/** @type {import('next').NextConfig} */
const bundledDb = './data/bundled-cricket.db'

const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // Next file tracing does not pick up data/*.db by default — required on Vercel/Lambda.
  outputFileTracingIncludes: {
    '/api/cricket/*': [bundledDb],
    '/api/cricket/**': [bundledDb],
    '/api/cricket/players/[id]': [bundledDb],
    '/*': [bundledDb],
  },
}

module.exports = nextConfig
