'use client'

import { getTraderById } from '../data/coverageRotaStore'

interface TraderPrepHintProps {
  label: string
  traderId: string | null | undefined
  className?: string
}

export default function TraderPrepHint({ label, traderId, className }: TraderPrepHintProps) {
  const trader = getTraderById(traderId)
  if (!trader) return null

  return (
    <span className={'tm-trader-hint' + (className ? ` ${className}` : '')}>
      <span className="tm-trader-hint-label">{label}</span>
      {trader.name}
    </span>
  )
}
