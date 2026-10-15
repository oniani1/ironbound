/**
 * A quiet choice between a few values, read like ruled entries: the chosen one stands on a
 * brass rule. Arrow keys move the choice.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  render = (v) => String(v),
  className = '',
  size = 'md',
}: {
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  label: string
  render?: (v: T) => string
  className?: string
  size?: 'md' | 'lg'
}) {
  const move = (dir: 1 | -1) => {
    const i = options.indexOf(value)
    const next = options[(i + dir + options.length) % options.length]
    if (next !== undefined) {
      onChange(next)
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`ib-quantity ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
    >
      {options.map((o) => {
        const on = o === value
        return (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => {
              if (on) return
              onChange(o)
            }}
            className={`ib-quantity-option ${size === 'lg' ? 'h-11 min-w-11 px-3 text-[14px]' : 'h-11 min-w-[48px] px-3 text-[13px]'}`}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}
