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

// 40, 48 and 52 px: the heights the auction houses use (Sotheby's lot page 48 px, Aston Martin
// 40 to 56 px), text at 14 to 15 px.
const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[14px] gap-2',
  md: 'h-12 px-6 text-[15px] gap-2',
  lg: 'h-[52px] px-7 text-[15px] gap-2.5',
}

// One button language (globals.css, .ib-button): a brass fill for the single most important
// action on a view, a 1 px outline for everything secondary, a translucent fill for the rest.
// Sentence case, 2 px corners. No gradients, no sheen, no glow.
const variants: Record<Variant, string> = {
  primary: 'ib-button--primary',
  secondary: 'ib-button--secondary bg-transparent hover:bg-bone-100/[0.05]',
  ghost: 'ib-button--ghost',
  danger: 'text-bone-50 bg-blood-500/90 hover:bg-blood-500',
}

const base = 'ib-button'

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
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      {...rest}
    >
      {icon}
      {sub ? (
        <span className="ib-button-copy">
          <span>{children}</span>
          <span className="ib-button-sub">{sub}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
})

/** Square icon control with a hairline, for close, zoom and other single-glyph actions. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'md' | 'lg' }>(function IconButton(
  { className = '', size = 'md', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`ib-icon-button h-11 w-11 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})
