'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trader } from '../data/coverageRotaStore'

interface TraderPickerProps {
  value: string | null
  traders: Trader[]
  onChange: (traderId: string | null) => void
  placeholder?: string
  compact?: boolean
  startOpen?: boolean
}

export default function TraderPicker({
  value,
  traders,
  onChange,
  placeholder = 'Assign trader…',
  compact = false,
  startOpen = false,
}: TraderPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(startOpen)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const selected = traders.find((t) => t.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return traders
    return traders.filter((t) => t.name.toLowerCase().includes(q))
  }, [query, traders])

  useEffect(() => {
    if (startOpen) setOpen(true)
  }, [startOpen])

  useEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return
    }

    function updateMenuPosition() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const gap = 4
      const viewportPadding = 8
      const preferredMax = 256
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
      const maxHeight = Math.min(preferredMax, openUp ? spaceAbove - gap : spaceBelow - gap)
      const top = openUp ? rect.top - gap - maxHeight : rect.bottom + gap
      setMenuStyle({
        top: Math.max(viewportPadding, top),
        left: rect.left,
        width: Math.max(rect.width, 192),
        maxHeight: Math.max(120, maxHeight),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(traderId: string | null) {
    onChange(traderId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div
      ref={rootRef}
      className={
        'cov-trader-picker' +
        (compact ? ' cov-trader-picker--compact' : '') +
        (open ? ' cov-trader-picker--open' : '')
      }
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cov-trader-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span className={'cov-trader-picker-value' + (selected ? '' : ' cov-trader-picker-value--empty')}>
          {selected?.name ?? placeholder}
        </span>
        <span className="cov-trader-picker-chevron" aria-hidden />
      </button>
      {open && menuStyle ? (
        <div
          className="cov-trader-picker-menu cov-trader-picker-menu--fixed"
          role="listbox"
          style={{
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: menuStyle.maxHeight,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="search"
            className="cov-trader-picker-search"
            placeholder="Search traders…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="cov-trader-picker-list">
            <li>
              <button type="button" className={'cov-trader-picker-option' + (!value ? ' cov-trader-picker-option--active' : '')} onClick={() => pick(null)}>
                {placeholder}
              </button>
            </li>
            {filtered.map((trader) => (
              <li key={trader.id}>
                <button
                  type="button"
                  className={'cov-trader-picker-option' + (value === trader.id ? ' cov-trader-picker-option--active' : '')}
                  onClick={() => pick(trader.id)}
                >
                  {trader.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? <li className="cov-trader-picker-empty">No traders match</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
