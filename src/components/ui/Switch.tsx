import type { ReactNode } from 'react'

/**
 * A small on and off control, read like a tick in a ledger: an empty square when off, a brass
 * square with a dark tick when on, and the state in words beside the label. The whole row is
 * the hit target.
 */
export function Switch({
  checked,
  onChange,
  children,
  label,
  className = '',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  children?: ReactNode
  /** Accessible name when the visible label is not enough. */
  label?: string
  className?: string
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`ib-switch ${className}`}>
      <span className="ib-switch-mark" aria-hidden />
      {children}
      <span className="ib-switch-state" aria-hidden>
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  )
}
