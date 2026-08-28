'use client'

interface OutrightOddsCellProps {
  value: number | undefined
  variant?: 'book' | 'own' | 'computed'
}

export function formatOutrightOddsValue(value: number | undefined): string {
  if (value === undefined || value <= 0 || !Number.isFinite(value)) return '\u2014'
  return value.toFixed(2)
}

export default function OutrightOddsCell({ value, variant = 'book' }: OutrightOddsCellProps) {
  const display = formatOutrightOddsValue(value)
  const empty = display === '\u2014'
  return (
    <span
      className={
        'outrights-odds-cell outrights-odds-cell--' +
        variant +
        (empty ? ' outrights-odds-cell--empty' : '')
      }
    >
      {display}
    </span>
  )
}
