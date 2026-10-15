import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion } from 'motion/react'

interface Props {
  /** Seconds of holding needed to break the seal. */
  duration?: number
  onProgress: (p: number) => void
  onComplete: () => void
  label?: string
  hint?: string
  disabled?: boolean
  /** Take keyboard focus when it appears, so Space and Enter charge the seal at once. */
  autoFocus?: boolean
}

const R = 46
const C = 2 * Math.PI * R

export interface HoldHandle {
  start: () => void
  stop: () => void
  /** The seal is broken some other way (Fast): stop the charge and never report progress again. */
  cancel: () => void
}

/**
 * Press and hold (pointer or Space) to break the seal. Releasing early lets the charge
 * drain away, so the chest visibly settles back down. The parent can also drive it, so a
 * hold anywhere on the chest counts.
 */
export const HoldToOpen = forwardRef<HoldHandle, Props>(function HoldToOpen({ duration = 1.15, onProgress, onComplete, label = 'Hold to break the seal', hint, disabled, autoFocus }, ref) {
  const [p, setP] = useState(0)
  const holding = useRef(false)
  const value = useRef(0)
  const raf = useRef(0)
  const last = useRef(0)
  const finished = useRef(false)
  const rattleAcc = useRef(0)
  const cb = useRef({ onProgress, onComplete })
  cb.current = { onProgress, onComplete }
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (autoFocus) button.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const loop = useCallback(
    (t: number) => {
      // A hold is measured in real time, not in frames: a slow phone or the first frames of a
      // cold opening still break the seal after the full hold. Only a long gap (a hidden tab) is cut short.
      const dt = last.current ? Math.min(0.5, (t - last.current) / 1000) : 0
      last.current = t
      const dir = holding.current ? 1 / duration : -2.2 / duration
      value.current = Math.max(0, Math.min(1, value.current + dir * dt))
      setP(value.current)
      cb.current.onProgress(value.current)
      rattleAcc.current += dt * (4 + value.current * 14)
      if (holding.current && rattleAcc.current > 1) {
        rattleAcc.current = 0
        if (navigator.vibrate && value.current > 0.2) navigator.vibrate(8)
      }
      if (value.current >= 1 && !finished.current) {
        finished.current = true
        holding.current = false
        cb.current.onComplete()
        return
      }
      if (value.current > 0 || holding.current) raf.current = requestAnimationFrame(loop)
      else last.current = 0
    },
    [duration],
  )

  const start = useCallback(() => {
    if (disabled || finished.current) return
    holding.current = true
    cancelAnimationFrame(raf.current)
    last.current = 0
    raf.current = requestAnimationFrame(loop)
  }, [disabled, loop])

  const stop = useCallback(() => {
    holding.current = false
  }, [])

  const cancel = useCallback(() => {
    finished.current = true
    holding.current = false
    cancelAnimationFrame(raf.current)
  }, [])

  useImperativeHandle(ref, () => ({ start, stop, cancel }), [start, stop, cancel])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        // Fast and Close keep their own keyboard activation.
        const t = e.target instanceof HTMLElement ? e.target : null
        if (t?.closest('button, a, input, select, textarea, label, [role="button"]') && !t.closest('[data-testid="hold-to-open"]')) return
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
    }
  }, [start, stop])

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        aria-label={label}
        data-testid="hold-to-open"
        ref={button}
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className="group pointer-events-auto relative grid h-28 w-28 touch-none select-none place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brass-300 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950"
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
      {/* A soft dark plate under the words, so they read over the lit altar whatever its stone. */}
      <div className="relative isolate px-2 text-center">
        <span aria-hidden className="absolute -inset-x-8 -inset-y-3 -z-10 rounded-[40px] bg-[oklch(9%_0.012_60/.78)] blur-lg" />
        <p className="font-display text-xl italic text-bone-100">{label}</p>
        <p className="mt-1 text-xs text-bone-400">
          {/* A phone has no Space bar to hold. */}
          {hint ?? (
            <>
              Press and hold anywhere<span className="[@media(pointer:coarse)]:hidden">, or hold Space</span>
            </>
          )}
        </p>
      </div>
    </motion.div>
  )
})
