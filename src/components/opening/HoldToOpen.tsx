import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { sfx } from '../../lib/audio'

interface Props {
  /** Seconds of holding needed to break the seal. */
  duration?: number
  onProgress: (p: number) => void
  onComplete: () => void
  label?: string
  hint?: string
  disabled?: boolean
}

const R = 46
const C = 2 * Math.PI * R

export interface HoldHandle {
  start: () => void
  stop: () => void
}

/**
 * Press and hold (pointer or Space) to break the seal. Releasing early lets the charge
 * drain away, so the chest visibly settles back down. The parent can also drive it, so a
 * hold anywhere on the chest counts.
 */
export const HoldToOpen = forwardRef<HoldHandle, Props>(function HoldToOpen({ duration = 1.15, onProgress, onComplete, label = 'Hold to break the seal', hint, disabled }, ref) {
  const [p, setP] = useState(0)
  const holding = useRef(false)
  const value = useRef(0)
  const raf = useRef(0)
  const last = useRef(0)
  const finished = useRef(false)
  const rattleAcc = useRef(0)
  const cb = useRef({ onProgress, onComplete })
  cb.current = { onProgress, onComplete }

  const loop = useCallback(
    (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0
      last.current = t
      const dir = holding.current ? 1 / duration : -2.2 / duration
      value.current = Math.max(0, Math.min(1, value.current + dir * dt))
      setP(value.current)
      cb.current.onProgress(value.current)
      sfx.setCharge(value.current)
      rattleAcc.current += dt * (4 + value.current * 14)
      if (holding.current && rattleAcc.current > 1) {
        rattleAcc.current = 0
        sfx.rattle(value.current)
        if (navigator.vibrate && value.current > 0.2) navigator.vibrate(8)
      }
      if (value.current >= 1 && !finished.current) {
        finished.current = true
        holding.current = false
        sfx.stopCharge(0.1)
        cb.current.onComplete()
        return
      }
      if (value.current > 0 || holding.current) raf.current = requestAnimationFrame(loop)
      else {
        last.current = 0
        sfx.stopCharge()
      }
    },
    [duration],
  )

  const start = useCallback(() => {
    if (disabled || finished.current) return
    sfx.unlock()
    sfx.startCharge()
    holding.current = true
    cancelAnimationFrame(raf.current)
    last.current = 0
    raf.current = requestAnimationFrame(loop)
  }, [disabled, loop])

  const stop = useCallback(() => {
    holding.current = false
  }, [])

  useImperativeHandle(ref, () => ({ start, stop }), [start, stop])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault()
        start()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') stop()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      cancelAnimationFrame(raf.current)
      sfx.stopCharge()
    }
  }, [start, stop])

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        aria-label={label}
        data-testid="hold-to-open"
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className="group relative grid h-28 w-28 touch-none select-none place-items-center rounded-full outline-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        {/* Heat halo grows with the charge. */}
        <span
          className="absolute inset-0 rounded-full transition-opacity"
          style={{
            background: `radial-gradient(circle, oklch(75% 0.17 55 / ${0.15 + p * 0.55}), transparent 70%)`,
            transform: `scale(${1 + p * 0.55})`,
          }}
        />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="oklch(14% 0.012 55 / 0.82)" stroke="oklch(93% 0.02 82 / 0.14)" strokeWidth="1.5" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="url(#heat)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - p)}
          />
          <defs>
            <linearGradient id="heat" x1="0" x2="1">
              <stop offset="0" stopColor="#ff7a2e" />
              <stop offset="1" stopColor="#ffe3a1" />
            </linearGradient>
          </defs>
        </svg>
        {/* Wax seal glyph: cracks open as the charge rises. */}
        <svg viewBox="0 0 48 48" className="relative h-12 w-12 transition-transform duration-75" style={{ transform: `scale(${1 - p * 0.08}) rotate(${p * 8}deg)` }}>
          <circle cx="24" cy="24" r="17" fill="#8e2a22" />
          <circle cx="24" cy="24" r="13" fill="none" stroke="#c4473a" strokeWidth="1.5" />
          <path d="M24 13 L26.5 21.5 L35 24 L26.5 26.5 L24 35 L21.5 26.5 L13 24 L21.5 21.5 Z" fill="#e7b46a" opacity={0.9 - p * 0.4} />
          <path d={`M24 8 L${23 - p * 3} 18 L${27 + p * 4} 24 L${22 - p * 2} 31 L24 40`} stroke="#1a0d0a" strokeWidth={0.6 + p * 1.6} fill="none" opacity={p} />
        </svg>
      </button>
      <div className="text-center">
        <p className="font-display text-xl italic text-bone-100">{label}</p>
        <p className="mt-1 text-xs text-bone-400">{hint ?? 'Press and hold anywhere, or hold Space'}</p>
      </div>
    </motion.div>
  )
})
