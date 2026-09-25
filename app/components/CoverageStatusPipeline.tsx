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

export default function StatusPipelineStrip({ fixture }: { fixture: ScheduleFixture }) {
  const steps = pipelineStepsFromFixture(fixture)
  const priceCheck = priceCheckStepState(fixture)
  const complete = isPipelineComplete(fixture, steps)

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
