import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  /** Secondary line under the label, e.g. a price. */
  sub?: ReactNode
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[11.5px] gap-2',
  md: 'h-11 px-5 text-[12.5px] gap-2',
  lg: 'h-14 px-7 text-[13.5px] gap-2.5',
}

// One button language. Gilt for the single most important action on a view, a bone
// hairline for everything secondary, quiet text for the rest. No glows.
const variants: Record<Variant, string> = {
  primary:
    'text-ink-950 bg-[linear-gradient(180deg,var(--color-brass-300)_0%,var(--color-brass-400)_38%,var(--color-brass-500)_68%,var(--color-brass-600)_100%)] ' +
    'shadow-[inset_0_1px_0_oklch(98%_0.04_90/.65),inset_0_-1px_0_oklch(38%_0.08_60/.6),inset_0_0_0_1px_oklch(45%_0.09_62/.35),0_1px_2px_oklch(0%_0_0/.45)] ' +
    'hover:brightness-[1.06]',
  secondary:
    'text-bone-100 bg-transparent shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_22%,transparent)] ' +
    'hover:bg-bone-100/[0.04] hover:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_45%,transparent)]',
  ghost: 'text-bone-200 hover:text-bone-50 hover:bg-bone-100/[0.05]',
  danger: 'text-bone-50 bg-blood-500/90 hover:bg-blood-500 shadow-[inset_0_1px_0_oklch(100%_0_0/.15)]',
}

const base =
  'relative isolate inline-flex select-none items-center justify-center whitespace-nowrap rounded-[6px] font-semibold uppercase tracking-[0.14em] transition-[transform,filter,background-color,box-shadow,color] duration-200 ease-out'

/** The button look for a non-button element, such as the visible face of a card-wide link. */
export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  return `${base} ${sizes[size]} ${variants[variant]}`
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', icon, sub, className = '', children, onClick, onMouseEnter, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} active:translate-y-px disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      {...rest}
    >
      {variant === 'primary' && <span className="sheen" aria-hidden />}
      {icon}
      {sub ? (
        <span className="flex flex-col items-start leading-tight">
          <span>{children}</span>
          <span className="mt-0.5 text-[12px] font-medium normal-case tracking-normal opacity-75 sm:text-[13px]">{sub}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
})

/** Round icon control with a hairline, for sound, close and other single-glyph actions. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'md' | 'lg' }>(function IconButton(
  { className = '', size = 'md', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`grid shrink-0 place-items-center rounded-full text-bone-300 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_14%,transparent)] transition-[color,background-color,box-shadow] duration-200 hover:bg-bone-100/[0.05] hover:text-bone-50 hover:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_32%,transparent)] ${size === 'lg' ? 'h-11 w-11' : 'h-10 w-10'} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})
