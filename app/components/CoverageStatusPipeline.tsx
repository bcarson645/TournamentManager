'use client'

import { pipelineStepsFromFixture, type ScheduleFixture } from '../data/coverageScheduleStore'

function PipelineStepPill({ label, state }: { label: string; state: 'done' | 'current' | 'pending' }) {
  return (
    <span className={`cov-pipeline-step cov-pipeline-step--${state}`}>
      {state === 'done' ? `${label} ✓` : label}
    </span>
  )
}

export default function StatusPipelineStrip({ fixture }: { fixture: ScheduleFixture }) {
  const steps = pipelineStepsFromFixture(fixture)

  return (
    <div className="cov-pipeline" aria-label="Prep, publish, settle status">
      <PipelineStepPill label="Prep" state={steps.prep} />
      <span className="cov-pipeline-arrow" aria-hidden="true">→</span>
      <PipelineStepPill label="Publish" state={steps.publish} />
      <span className="cov-pipeline-arrow" aria-hidden="true">→</span>
      <PipelineStepPill label="Settle" state={steps.settle} />
      {steps.priceCheck ? <span className="cov-chip cov-chip--warn">Price check</span> : null}
    </div>
  )
}
