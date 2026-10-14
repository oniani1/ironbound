import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { sfx } from '../../lib/audio'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  /** Secondary line under the label, e.g. a price. */
  sub?: ReactNode
  silent?: boolean
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-5 text-[14px] gap-2 rounded-[12px]',
  lg: 'h-14 px-7 text-[15px] gap-2.5 rounded-[14px]',
}

const variants: Record<Variant, string> = {
  // Forged brass: warm gradient, top highlight, inner shadow at the bottom edge.
  primary:
    'text-ink-950 font-semibold bg-[linear-gradient(180deg,var(--color-brass-300),var(--color-brass-500)_55%,var(--color-brass-600))] ' +
    'shadow-[inset_0_1px_0_oklch(98%_0.04_90/.7),inset_0_-2px_0_oklch(40%_0.08_60/.55),0_10px_30px_-12px_oklch(70%_0.14_70/.7)] ' +
    'hover:brightness-[1.08] active:translate-y-px active:brightness-95',
  secondary:
    'text-bone-100 font-medium bg-ink-800/90 border border-bone-100/12 ' +
    'shadow-[inset_0_1px_0_oklch(100%_0_0/.06)] hover:bg-ink-700 hover:border-bone-100/20 active:translate-y-px',
  ghost: 'text-bone-200 font-medium hover:text-bone-50 hover:bg-bone-100/[0.06] active:translate-y-px',
  danger:
    'text-bone-50 font-semibold bg-blood-500/90 hover:bg-blood-500 shadow-[inset_0_1px_0_oklch(100%_0_0/.15)] active:translate-y-px',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', icon, sub, className = '', children, silent, onClick, onMouseEnter, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`relative inline-flex select-none items-center justify-center whitespace-nowrap transition-[transform,filter,background-color,border-color,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-45 ${sizes[size]} ${variants[variant]} ${className}`}
      onMouseEnter={(e) => {
        if (!silent) sfx.hover()
        onMouseEnter?.(e)
      }}
      onClick={(e) => {
        sfx.unlock()
        if (!silent) sfx.click()
        onClick?.(e)
      }}
      {...rest}
    >
      {icon}
      {sub ? (
        <span className="flex flex-col items-start leading-tight">
          <span>{children}</span>
          <span className="text-[11px] font-medium opacity-70">{sub}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
})
