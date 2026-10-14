import { useEffect, useRef, useState } from 'react'
import { money } from '../../lib/format'

interface Props {
  to: number
  from?: number
  duration?: number
  delay?: number
  format?: (n: number) => string
  onDone?: () => void
  className?: string
}

/** Rolls a value up with an ease-out-expo curve. */
export function CountUp({ to, from = 0, duration = 1.2, delay = 0, format = (n) => money(n), onDone, className }: Props) {
  const [v, setV] = useState(from)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    let raf = 0
    let start = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? 0.01 : duration
    const timer = window.setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t
        const p = Math.min(1, (t - start) / (total * 1000))
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setV(from + (to - from) * e)
        if (p < 1) raf = requestAnimationFrame(step)
        else done.current?.()
      }
      raf = requestAnimationFrame(step)
    }, delay * 1000)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [to, from, duration, delay])
  return <span className={`tabular ${className ?? ''}`}>{format(v)}</span>
}
