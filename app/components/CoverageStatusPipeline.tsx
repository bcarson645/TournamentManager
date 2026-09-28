'use client'

import { pipelineStepsFromFixture, type ScheduleFixture } from '../data/coverageScheduleStore'

type PipelineStepId = 'prep' | 'publish' | 'settle' | 'price-check'

function PipelineStepPill({
  label,
  step,
  state,
}: {
  label: string
  step: PipelineStepId
  state: 'done' | 'current' | 'pending'
}) {
  return (
    <span className={`cov-pipeline-step cov-pipeline-step--${step} cov-pipeline-step--${state}`}>
      {state === 'done' ? `${label} ✓` : label}
    </span>
  )
}

function priceCheckStepState(fixture: ScheduleFixture): 'done' | 'current' | 'pending' | null {
  if (fixture.lifecycle === 'price-check') return 'current'
  if (!fixture.needsPriceCheck) return null
  if (fixture.lifecycle === 'settled') return 'done'
  return 'pending'
}

function isPipelineComplete(
  fixture: ScheduleFixture,
  steps: ReturnType<typeof pipelineStepsFromFixture>,
): boolean {
  if (steps.prep !== 'done' || steps.publish !== 'done' || steps.settle !== 'done') return false
  if (fixture.lifecycle === 'price-check') return false
  if (fixture.needsPriceCheck && fixture.lifecycle !== 'settled') return false
  return true
}

const PIPELINE_DOT_LABELS: Record<PipelineStepId, string> = {
  prep: 'Prep',
  publish: 'Publish',
  settle: 'Settle',
  'price-check': 'Price check',
}

function PipelineDots({
  fixture,
  steps,
  priceCheck,
}: {
  fixture: ScheduleFixture
  steps: ReturnType<typeof pipelineStepsFromFixture>
  priceCheck: 'done' | 'current' | 'pending' | null
}) {
  const dots: Array<{ step: PipelineStepId; state: 'done' | 'current' | 'pending' }> = [
    { step: 'prep', state: steps.prep },
    { step: 'publish', state: steps.publish },
    { step: 'settle', state: steps.settle },
  ]
  if (priceCheck) dots.push({ step: 'price-check', state: priceCheck })

  const complete = isPipelineComplete(fixture, steps)

  return (
    <div
      className={'cov-pipeline-dots' + (complete ? ' cov-pipeline-dots--complete' : '')}
      aria-label="Prep, publish, settle status"
    >
      {dots.map((dot) => (
        <span
          key={dot.step}
          className={`cov-pipeline-dot cov-pipeline-dot--${dot.step} cov-pipeline-dot--${dot.state}`}
          title={`${PIPELINE_DOT_LABELS[dot.step]}: ${dot.state}`}
        />
      ))}
    </div>
  )
}

export default function StatusPipelineStrip({
  fixture,
  variant = 'default',
}: {
  fixture: ScheduleFixture
  variant?: 'default' | 'dots'
}) {
  const steps = pipelineStepsFromFixture(fixture)
  const priceCheck = priceCheckStepState(fixture)
  const complete = isPipelineComplete(fixture, steps)

  if (variant === 'dots') {
    return <PipelineDots fixture={fixture} steps={steps} priceCheck={priceCheck} />
  }

  return (
    <div
      className={'cov-pipeline' + (complete ? ' cov-pipeline--complete' : '')}
      aria-label="Prep, publish, settle status"
    >
      <PipelineStepPill label="Prep" step="prep" state={steps.prep} />
      <span className="cov-pipeline-arrow" aria-hidden="true">→</span>
      <PipelineStepPill label="Publish" step="publish" state={steps.publish} />
      <span className="cov-pipeline-arrow" aria-hidden="true">→</span>
      <PipelineStepPill label="Settle" step="settle" state={steps.settle} />
      {priceCheck ? (
        <>
          <span className="cov-pipeline-arrow" aria-hidden="true">→</span>
          <PipelineStepPill label="Price check" step="price-check" state={priceCheck} />
        </>
      ) : null}
    </div>
  )
}
