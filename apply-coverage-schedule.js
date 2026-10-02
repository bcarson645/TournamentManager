const fs = require('fs')
const path = require('path')

const base = 'C:/Users/b.carson/OneDrive - SportradarAG/New folder/Code/TournamentManager'
const src = path.join(__dirname)

const copies = [
  ['app/data/coverageScheduleImported.ts', 'app/data/coverageScheduleImported.ts'],
  ['app/data/coverageScheduleStore.ts', 'app/data/coverageScheduleStore.ts'],
  ['app/data/coverageDayMatrix.ts', 'app/data/coverageDayMatrix.ts'],
  ['app/components/CoverageScheduleSection.tsx', 'app/components/CoverageScheduleSection.tsx'],
  ['app/components/CoverageStatusPipeline.tsx', 'app/components/CoverageStatusPipeline.tsx'],
  ['app/components/coverage/CoverageShared.tsx', 'app/components/coverage/CoverageShared.tsx'],
  ['app/components/coverage/CoverageScheduleToolbar.tsx', 'app/components/coverage/CoverageScheduleToolbar.tsx'],
  ['app/components/coverage/covTheme.ts', 'app/components/coverage/covTheme.ts'],
  ['app/components/coverage/CoverageViews.tsx', 'app/components/coverage/CoverageViews.tsx'],
  ['app/components/coverage/CoverageDayMatrix.tsx', 'app/components/coverage/CoverageDayMatrix.tsx'],
  ['app/components/coverage/CoverageMarketsProgress.tsx', 'app/components/coverage/CoverageMarketsProgress.tsx'],
  ['app/components/coverage/CoverageMatchPanel.tsx', 'app/components/coverage/CoverageMatchPanel.tsx'],
  ['scripts/import-coverage-xlsm.mjs', 'scripts/import-coverage-xlsm.mjs'],
]

for (const [from, to] of copies) {
  const dest = path.join(base, to)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(path.join(src, from), dest)
  console.log('Copied', to)
}

// Belt-and-suspenders: ensure theme file exists even if an older sync skipped it
const covThemeRel = 'app/components/coverage/covTheme.ts'
const covThemeDest = path.join(base, covThemeRel)
if (!fs.existsSync(covThemeDest)) {
  fs.mkdirSync(path.dirname(covThemeDest), { recursive: true })
  fs.copyFileSync(path.join(src, covThemeRel), covThemeDest)
  console.log('Copied missing', covThemeRel)
}

const scheduleCssMarker = '/* ---------- Coverage schedule (fixture rota) ---------- */'
const globalsPath = path.join(base, 'app/globals.css')
let globals = fs.readFileSync(globalsPath, 'utf8')

const localCss = fs.readFileSync(path.join(src, 'app/globals.css'), 'utf8')
const scheduleBlock = localCss.slice(localCss.indexOf('/* ---------- Coverage schedule shell ---------- */'))
if (globals.includes(scheduleCssMarker)) {
  globals = globals.split(scheduleCssMarker)[0].trimEnd()
}
globals += `\n\n${scheduleCssMarker}\n${scheduleBlock}`
fs.writeFileSync(globalsPath, globals)
console.log('Updated coverage schedule CSS in globals.css')

const drawerPath = path.join(base, 'app/components/CoverageFixtureDrawer.tsx')
if (fs.existsSync(drawerPath)) {
  fs.unlinkSync(drawerPath)
  console.log('Removed CoverageFixtureDrawer.tsx')
}

const pagePath = path.join(base, 'app/page.tsx')
let page = fs.readFileSync(pagePath, 'utf8')

if (!page.includes('CoverageScheduleSection')) {
  page = page.replace(
    "import TournamentPrepAssignments from './components/TournamentPrepAssignments'",
    "import TournamentPrepAssignments from './components/TournamentPrepAssignments'\nimport CoverageScheduleSection from './components/CoverageScheduleSection'",
  )

  page = page.replace(
    `const PLACEHOLDER_LABELS: Record<
  Exclude<HomeNavId, 'tournament-manager' | 'prep-assignments' | 'outrights' | 'player-team'>,
  string
> = {
  settings: 'Settings',
  'custom-bet': 'Custom Bet',
  schedule: 'Schedule',
  coverage: 'Coverage Rota',
}`,
    `const PLACEHOLDER_LABELS: Record<
  Exclude<HomeNavId, 'tournament-manager' | 'prep-assignments' | 'outrights' | 'player-team' | 'coverage'>,
  string
> = {
  settings: 'Settings',
  'custom-bet': 'Custom Bet',
  schedule: 'Schedule',
}`,
  )

  const coverageBlock = `
  if (homeNav === 'coverage') {
    return (
      <div className="app-home-shell">
        <AppNavSidebar activeId={homeNav} onSelect={handleHomeNavSelect} />
        <main className="app-home-main">
          <div className="page app-home-page app-home-page--wide">
            <CoverageScheduleSection standalone />
          </div>
        </main>
      </div>
    )
  }

`

  page = page.replace(`  if (homeNav === 'outrights') {`, `${coverageBlock}  if (homeNav === 'outrights') {`)
  fs.writeFileSync(pagePath, page)
  console.log('Patched page.tsx for Coverage Rota nav')
}

console.log(
  'Theme: CoverageScheduleSection manages data-cov-theme via covTheme.ts (no page.tsx patch required on main).',
)
console.log('Done — Coverage schedule applied to main repo')
