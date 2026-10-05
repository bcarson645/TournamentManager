import {
  fixtureIsNotCovered,
  fixtureMatchesFilters,
  fixtureNeedsPrep,
  formatPrepDueShortLabel,
  getFixtureMarketsProgress,
  getFixtureTaskOwner,
  isFixtureTaskOpen,
  getFixtureTier,
  isPrepDueSoon,
  isPrepOverdue,
  isSimulatedFixture,
  parseFixtureTimeToMinutes,
  pipelineStepsFromFixture,
  PUBLISH_BATCH_SIZE,
  type CoverageTaskId,
  type FixtureMarketsProgress,
  type ScheduleContentFilters,
  type ScheduleDay,
  type SelectedMatchContext,
  type StatusFilter,
  type TournamentTier,
} from './coverageScheduleStore'
import { isValidTraderName } from './traders'

export type DayMatrixTone = 'danger' | 'warn' | 'info' | 'done' | 'muted'

/**
 * Day matrix sections. A fixture lives in exactly one section: the one for its *next action*.
 * Order here is the on-screen order (most time-critical first).
 */
export type DayMatrixGroupId =
  | 'price-check'
  | 'prep'
  | 'ready-to-publish'
  | 'publishing'
  | 'settle'
  | 'complete'

export const DAY_MATRIX_GROUP_ORDER: DayMatrixGroupId[] = [
  'price-check',
  'prep',
  'ready-to-publish',
  'publishing',
  'settle',
  'complete',
]

export interface DayMatrixGroupMeta {
  label: string
  /** Plain-language description of the action needed for everything in the section. */
  action: string
  /** Workflow task a cell click assigns / runs; null for the "no action" section. */
  task: CoverageTaskId | null
  tone: DayMatrixTone
}

export const DAY_MATRIX_GROUP_META: Record<DayMatrixGroupId, DayMatrixGroupMeta> = {
  'price-check': {
    label: 'Price check',
    action: 'Price check needed — claim or assign, then mark checked',
    task: 'price-check',
    tone: 'warn',
  },
  prep: {
    label: 'Needs prep',
    action: 'Prep outstanding — claim or assign, then mark prep done',
    task: 'prep',
    tone: 'warn',
  },
  'ready-to-publish': {
    label: 'Ready to publish',
    action: 'Prep done — claim or assign and send markets',
    task: 'publish',
    tone: 'warn',
  },
  publishing: {
    label: 'Publishing',
    action: 'Markets partly sent — keep sending until the game is fully published',
    task: 'publish',
    tone: 'info',
  },
  settle: {
    label: 'Settle',
    action: 'Published — claim or assign and settle once the game is over',
    task: 'settle',
    tone: 'info',
  },
  complete: {
    label: 'No action needed',
    action: 'Done, automated or not covered',
    task: null,
    tone: 'done',
  },
}

export interface DayMatrixTaskMeta {
  label: string
  short: string
  /** What clicking an owned cell does. */
  runLabel: string
  hint: string
}

export const DAY_MATRIX_TASK_META: Record<CoverageTaskId, DayMatrixTaskMeta> = {
  prep: { label: 'Prep', short: 'Prep', runLabel: 'Prep done', hint: 'Mark prep complete' },
  publish: {
    label: 'Publish',
    short: 'Pub',
    runLabel: `Send +${PUBLISH_BATCH_SIZE}`,
    hint: `Send the next ${PUBLISH_BATCH_SIZE} markets`,
  },
  'price-check': { label: 'Price check', short: 'PC', runLabel: 'Checked', hint: 'Mark price check complete' },
  settle: { label: 'Settle', short: 'Settle', runLabel: 'Settle', hint: 'Settle the game' },
}

export const DAY_MATRIX_TASKS: CoverageTaskId[] = ['prep', 'publish', 'price-check', 'settle']

export interface DayMatrixRow {
  key: string
  ctx: SelectedMatchContext
  minutes: number
  tier: TournamentTier
  group: DayMatrixGroupId
  /** Task a cell click drives, null when nothing is actionable. */
  task: CoverageTaskId | null
  owner: string | null
  /** Posted for any trader to claim (no named owner yet). */
  taskOpen: boolean
  /** Short "what is needed" label, e.g. "Prep overdue". */
  actionLabel: string
  /** Trailing detail for the action, e.g. a due date or "105 to send". */
  actionDetail?: string
  tone: DayMatrixTone
  needsAction: boolean
  /** Markets sent / total, only for games that still publish (or are publishing). */
  markets: FixtureMarketsProgress | null
  scout: boolean
}

export interface DayMatrixGroup {
  id: DayMatrixGroupId
  meta: DayMatrixGroupMeta
  rows: DayMatrixRow[]
  /** Rows nobody has picked up yet. */
  unowned: number
  /** trader → number of rows in this section they own */
  ownedBy: Map<string, number>
  tone: DayMatrixTone
}

export interface DayMatrixColumn {
  trader: string
  isDailyLead: boolean
  counts: Record<CoverageTaskId, number>
  total: number
}

export interface DayMatrixStats {
  fixtures: number
  needsAction: number
  unowned: number
  prepOverdue: number
  publishing: number
  marketsSent: number
  marketsTotal: number
  tradersOn: number
}

export interface DayMatrix {
  day: ScheduleDay
  groups: DayMatrixGroup[]
  columns: DayMatrixColumn[]
  stats: DayMatrixStats
}

export interface DayMatrixOptions {
  statusFilter: StatusFilter
  contentFilters: ScheduleContentFilters
  hideIdleTraders?: boolean
}

const TONE_RANK: Record<DayMatrixTone, number> = { danger: 0, warn: 1, info: 2, done: 3, muted: 4 }

function emptyCounts(): Record<CoverageTaskId, number> {
  return { prep: 0, publish: 0, 'price-check': 0, settle: 0 }
}

interface Classification {
  group: DayMatrixGroupId
  task: CoverageTaskId | null
  actionLabel: string
  actionDetail?: string
  tone: DayMatrixTone
}

/**
 * Pick the single next action for a fixture (trading is intentionally not a task;
 * scout is a match attribute and never a next action):
 * price check → prep → publish (ready / partly sent) → settle → nothing.
 */
export function classifyFixtureNextAction(
  ctx: SelectedMatchContext,
): Classification & { markets: FixtureMarketsProgress | null } {
  const { fixture, day, tournament } = ctx
  const simulated = isSimulatedFixture(fixture, tournament.code)
  const notCovered = fixtureIsNotCovered(fixture) || fixture.coverageLabel === 'Not Covered'

  if (simulated) {
    return { group: 'complete', task: null, actionLabel: 'Automated', tone: 'muted', markets: null }
  }
  if (notCovered) {
    return { group: 'complete', task: null, actionLabel: 'Not covered', tone: 'muted', markets: null }
  }

  const steps = pipelineStepsFromFixture(fixture)
  const markets = getFixtureMarketsProgress(fixture)

  if (steps.priceCheck) {
    return { group: 'price-check', task: 'price-check', actionLabel: 'Price check', tone: 'warn', markets: null }
  }

  if (steps.prep !== 'done' && fixtureNeedsPrep(fixture)) {
    const overdue = isPrepOverdue(fixture, day.date)
    const soon = !overdue && isPrepDueSoon(fixture, day.date)
    return {
      group: 'prep',
      task: 'prep',
      actionLabel: overdue ? 'Prep overdue' : soon ? 'Prep due soon' : 'Prep due',
      actionDetail: formatPrepDueShortLabel(fixture, day.date) ?? undefined,
      tone: overdue ? 'danger' : soon ? 'warn' : 'info',
      markets: null,
    }
  }

  if (steps.publish !== 'done') {
    if (markets.state === 'sending') {
      return {
        group: 'publishing',
        task: 'publish',
        actionLabel: 'Publishing',
        actionDetail: `${markets.total - markets.sent} to send`,
        tone: 'info',
        markets,
      }
    }
    return {
      group: 'ready-to-publish',
      task: 'publish',
      actionLabel: 'Publish markets',
      actionDetail: `0/${markets.total}`,
      tone: 'warn',
      markets,
    }
  }

  if (steps.settle !== 'done') {
    return { group: 'settle', task: 'settle', actionLabel: 'Settle', tone: 'info', markets }
  }

  return { group: 'complete', task: null, actionLabel: 'All done', tone: 'done', markets: null }
}

function buildRow(ctx: SelectedMatchContext): DayMatrixRow {
  const { fixture, day, tournament } = ctx
  const next = classifyFixtureNextAction(ctx)
  return {
    key: `${day.date}:${tournament.code}:${fixture.id}`,
    ctx,
    minutes: parseFixtureTimeToMinutes(fixture.time),
    tier: getFixtureTier(fixture, tournament.code),
    group: next.group,
    task: next.task,
    owner: next.task ? getFixtureTaskOwner(fixture, next.task) : null,
    taskOpen: next.task ? isFixtureTaskOpen(fixture, next.task) : false,
    actionLabel: next.actionLabel,
    actionDetail: next.actionDetail,
    tone: next.tone,
    needsAction: next.task != null,
    markets: next.markets,
    scout: fixture.scout,
  }
}

/**
 * Build the day matrix: the day's games grouped by the task they need next (not by kick-off time),
 * with one column per trader on shift. Cells are task assignments — never trading.
 *
 * Columns are every trader on shift that day plus anyone who owns a task, so the column set stays
 * stable while filters change; counts and idle-hiding only consider the visible rows.
 */
export function buildDayMatrix(day: ScheduleDay, options: DayMatrixOptions): DayMatrix {
  const { statusFilter, contentFilters, hideIdleTraders = false } = options

  const allTraders = new Set<string>()
  for (const name of day.tradersOn) if (isValidTraderName(name)) allTraders.add(name)
  if (isValidTraderName(day.dailyLead)) allTraders.add(day.dailyLead)

  const rows: DayMatrixRow[] = []
  for (const tournament of day.tournaments) {
    for (const fixture of tournament.matches) {
      const ctx: SelectedMatchContext = { fixture, day, tournament }
      for (const task of DAY_MATRIX_TASKS) {
        const owner = getFixtureTaskOwner(fixture, task)
        if (owner && !isSimulatedFixture(fixture, tournament.code)) allTraders.add(owner)
      }
      if (!fixtureMatchesFilters(fixture, tournament.code, statusFilter, contentFilters, day.dailyLead, day.date)) {
        continue
      }
      rows.push(buildRow(ctx))
    }
  }

  // Within a section: most urgent first, then kick-off order.
  rows.sort(
    (a, b) =>
      TONE_RANK[a.tone] - TONE_RANK[b.tone] ||
      a.minutes - b.minutes ||
      a.ctx.fixture.match.localeCompare(b.ctx.fixture.match),
  )

  const groups: DayMatrixGroup[] = DAY_MATRIX_GROUP_ORDER.map((id) => {
    const groupRows = rows.filter((row) => row.group === id)
    const ownedBy = new Map<string, number>()
    for (const row of groupRows) {
      if (row.owner) ownedBy.set(row.owner, (ownedBy.get(row.owner) ?? 0) + 1)
    }
    const tone = groupRows.reduce<DayMatrixTone>(
      (worst, row) => (TONE_RANK[row.tone] < TONE_RANK[worst] ? row.tone : worst),
      DAY_MATRIX_GROUP_META[id].tone,
    )
    return {
      id,
      meta: DAY_MATRIX_GROUP_META[id],
      rows: groupRows,
      unowned: id === 'complete' ? 0 : groupRows.filter((row) => row.needsAction && !row.owner && !row.taskOpen).length,
      ownedBy,
      tone,
    }
  }).filter((group) => group.rows.length > 0)

  const columnMap = new Map<string, DayMatrixColumn>()
  for (const trader of allTraders) {
    columnMap.set(trader, { trader, isDailyLead: trader === day.dailyLead, counts: emptyCounts(), total: 0 })
  }
  for (const row of rows) {
    if (!row.task || !row.owner) continue
    const column = columnMap.get(row.owner)
    if (!column) continue
    column.counts[row.task] += 1
    column.total += 1
  }

  let columns = [...columnMap.values()].sort((a, b) => a.trader.localeCompare(b.trader))
  if (hideIdleTraders) columns = columns.filter((column) => column.total > 0 || column.isDailyLead)

  let marketsSent = 0
  let marketsTotal = 0
  for (const row of rows) {
    if (row.group === 'complete' && !row.markets) continue
    if (row.markets) {
      marketsSent += row.markets.sent
      marketsTotal += row.markets.total
    }
  }

  const stats: DayMatrixStats = {
    fixtures: rows.length,
    needsAction: rows.filter((row) => row.needsAction).length,
    unowned: rows.filter((row) => row.needsAction && !row.owner && !row.taskOpen).length,
    prepOverdue: rows.filter((row) => row.group === 'prep' && row.tone === 'danger').length,
    publishing: rows.filter((row) => row.group === 'publishing').length,
    marketsSent,
    marketsTotal,
    tradersOn: allTraders.size,
  }

  return { day, groups, columns, stats }
}
