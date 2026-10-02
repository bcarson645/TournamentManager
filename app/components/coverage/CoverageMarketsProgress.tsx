'use client'

import {
  getFixtureMarketsProgress,
  MAX_MARKETS_PER_GAME,
  type FixtureMarketsProgress,
  type ScheduleFixture,
} from '../../data/coverageScheduleStore'

/**
 * Small "markets sent" loading bar (e.g. 45/150).
 * - idle:     nothing sent yet (muted, empty track)
 * - sending:  partly sent (accent fill with a moving stripe, reads as "loading")
 * - complete: every market sent (green)
 */
export function MarketsProgressBar({
  progress,
  showLabel = true,
  compact = false,
  className = '',
}: {
  progress: FixtureMarketsProgress
  showLabel?: boolean
  compact?: boolean
  className?: string
}) {
  const { sent, total, pct, state } = progress
  const title =
    state === 'complete'
      ? `All ${total} markets sent`
      : state === 'sending'
        ? `Sending markets: ${sent} of ${total} sent (${total - sent} to go · max ${MAX_MARKETS_PER_GAME} per game)`
        : `No markets sent yet (0 of ${total} · max ${MAX_MARKETS_PER_GAME} per game)`

  return (
    <span
      className={
        'cov-mkts' +
        ` cov-mkts--${state}` +
        (compact ? ' cov-mkts--compact' : '') +
        (className ? ` ${className}` : '')
      }
      role="progressbar"
      aria-label="Markets sent"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={sent}
      aria-valuetext={`${sent} of ${total} markets sent`}
      title={title}
    >
      <span className="cov-mkts-track" aria-hidden="true">
        <span className="cov-mkts-fill" style={{ width: `${pct}%` }} />
      </span>
      {showLabel ? (
        <span className="cov-mkts-label">
          {sent}
          <span className="cov-mkts-total">/{total}</span>
        </span>
      ) : null}
    </span>
  )
}

/** Fixture-level wrapper: derives the progress from the fixture itself. */
export default function FixtureMarketsBar({
  fixture,
  compact = false,
  showLabel = true,
}: {
  fixture: ScheduleFixture
  compact?: boolean
  showLabel?: boolean
}) {
  return <MarketsProgressBar progress={getFixtureMarketsProgress(fixture)} compact={compact} showLabel={showLabel} />
}
