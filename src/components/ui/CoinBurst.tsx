import { useMemo } from 'react'
import { motion } from 'motion/react'

/**
 * Gold coins that arc from an origin toward a target point, used when an item is sold
 * back. Pure transform and opacity, so it stays smooth on phones.
 */
export function CoinBurst({ from, to, count = 14, onDone }: { from: { x: number; y: number }; to: { x: number; y: number }; count?: number; onDone?: () => void }) {
  const coins = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        spreadX: (Math.random() - 0.5) * 160,
        lift: 60 + Math.random() * 120,
        delay: i * 0.035,
        size: 14 + Math.random() * 8,
        spin: (Math.random() - 0.5) * 720,
      })),
    [count],
  )
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {coins.map((c, i) => (
        <motion.span
          key={c.id}
          className="absolute block rounded-full"
          style={{
            left: from.x - c.size / 2,
            top: from.y - c.size / 2,
            width: c.size,
            height: c.size,
            background: 'radial-gradient(circle at 35% 30%, #fff1b8, #e3b04b 45%, #9c6a1e)',
            boxShadow: '0 0 12px oklch(80% 0.15 80 / .6), inset 0 -2px 0 #7a5018',
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: [0, c.spreadX, to.x - from.x],
            y: [0, -c.lift, to.y - from.y],
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1.1, 0.6],
            rotate: c.spin,
          }}
          transition={{ duration: 0.95, delay: c.delay, ease: [0.45, 0, 0.2, 1], times: [0, 0.35, 1] }}
          onAnimationComplete={i === coins.length - 1 ? onDone : undefined}
        />
      ))}
    </div>
  )
}
