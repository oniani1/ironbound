import { useEffect, useRef, useState } from 'react'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio'

interface Props {
  to: number
  from?: number
  duration?: number
  delay?: number
  ticks?: boolean
  format?: (n: number) => string
  onDone?: () => void
  className?: string
}

/** Rolls a value up with an ease-out-expo curve and optional ticking sound. */
export function CountUp({ to, from = 0, duration = 1.2, delay = 0, ticks = false, format = (n) => money(n), onDone, className }: Props) {
  const [v, setV] = useState(from)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    let raf = 0
    let start = 0
    let lastTick = -1
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? 0.01 : duration
    const timer = window.setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t
        const p = Math.min(1, (t - start) / (total * 1000))
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setV(from + (to - from) * e)
        if (ticks) {
          const bucket = Math.floor(e * 24)
          if (bucket !== lastTick) {
            lastTick = bucket
            sfx.tick(e)
          }
        }
        if (p < 1) raf = requestAnimationFrame(step)
        else done.current?.()
      }
      raf = requestAnimationFrame(step)
    }, delay * 1000)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [to, from, duration, delay, ticks])
  return <span className={`tabular ${className ?? ''}`}>{format(v)}</span>
}
