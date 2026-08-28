'use client'

import { useState, type ReactNode } from 'react'

interface TeamPricingMarketBoxProps {
  boxId: string
  title: string
  summary: string
  defaultOpen?: boolean
  children?: ReactNode
}

export default function TeamPricingMarketBox({
  boxId,
  title,
  summary,
  defaultOpen = false,
  children,
}: TeamPricingMarketBoxProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="tap-pricing-market">
      <button
        type="button"
        className="tap-pricing-market-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={boxId}
      >
        <span className="tap-pricing-market-head-main">
          <span className="tap-pricing-market-title">{title}</span>
          <span className="tap-pricing-market-summary">{summary}</span>
        </span>
        <span className="tap-pricing-market-chevron" aria-hidden>
          {open ? '\u25BE' : '\u25B8'}
        </span>
      </button>

      {open ? (
        <div className="tap-pricing-market-body" id={boxId}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
