import type { ReactNode } from 'react'

/**
 * A small on and off control: a brass track when on, a hairline when off. The label sits
 * beside it in caps, and the whole row is the hit target.
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`group inline-flex min-h-11 items-center gap-2.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] text-bone-300 transition-colors duration-200 hover:text-bone-100 ${className}`}
    >
      <span
        className={`relative block h-[16px] w-[28px] shrink-0 rounded-full transition-[background-color,box-shadow] duration-200 ${checked ? 'bg-brass-500' : 'bg-transparent shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_28%,transparent)]'}`}
        aria-hidden
      >
        <span className={`absolute top-[3px] block h-[10px] w-[10px] rounded-full transition-[left,background-color] duration-200 ease-out ${checked ? 'left-[15px] bg-ink-950' : 'left-[3px] bg-bone-300 group-hover:bg-bone-100'}`} />
      </span>
      {children}
    </button>
  )
}
