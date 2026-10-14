import { useId } from 'react'
import { motion } from 'motion/react'
import { sfx } from '../../lib/audio'

/**
 * A quiet choice between a few values, set in a hairline frame. The chosen value is lit
 * from below by a brass rule that slides between options. Arrow keys move the choice.
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
  const group = useId()
  const move = (dir: 1 | -1) => {
    const i = options.indexOf(value)
    const next = options[(i + dir + options.length) % options.length]
    if (next !== undefined) {
      sfx.click()
      onChange(next)
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex rounded-[6px] p-[3px] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_14%,transparent)] ${className}`}
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
              sfx.click()
              onChange(o)
            }}
            className={`relative rounded-[4px] font-semibold tabular transition-colors duration-200 ${size === 'lg' ? 'h-11 min-w-11 px-3 text-[14px]' : 'h-9 min-w-[48px] px-3 text-[13px]'} ${on ? 'text-bone-50' : 'text-bone-400 hover:text-bone-100'}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${group}`}
                className="absolute inset-0 rounded-[4px] bg-bone-100/[0.07]"
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                aria-hidden
              >
                <span className="absolute inset-x-3 bottom-[3px] h-px bg-brass-400" />
              </motion.span>
            )}
            <span className="relative">{render(o)}</span>
          </button>
        )
      })}
    </div>
  )
}
