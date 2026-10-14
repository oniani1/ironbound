import { motion } from 'motion/react'

/** Real length against a 180 cm person, so a dagger and a pike read at their true size. */
export function ScaleBar({ length, color, delay = 0, label = 'Length', instant = false }: { length?: string; color: string; delay?: number; label?: string; instant?: boolean }) {
  const cm = length ? parseFloat(length) : NaN
  if (!Number.isFinite(cm) || cm <= 0) return null
  const max = Math.max(200, Math.ceil(cm / 50) * 50)
  const pct = Math.min(1, cm / max)
  const person = 180 / max
  return (
    <div className="mt-3" aria-label={`${label} ${Math.round(cm)} centimeters, shown against a 180 centimeter person`} role="img">
      <div className="relative h-7">
        {/* Person for scale. */}
        <svg viewBox="0 0 10 24" className="absolute bottom-0 h-7 w-3 -translate-x-1/2 text-bone-400/70" style={{ left: `${person * 100}%` }} aria-hidden>
          <circle cx="5" cy="2.6" r="2.3" fill="currentColor" />
          <path d="M2.2 6.5h5.6l1 8.5h-1.8l-.4 9h-1.6l-.3-7-.3 7H2.8l-.4-9H.9z" fill="currentColor" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-bone-100/10" />
        <motion.div
          className="absolute bottom-0 left-0 h-[3px] rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          initial={{ width: instant ? `${pct * 100}%` : 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-bone-400 tabular">
        <span>0</span>
        <span className="text-bone-200">{Math.round(cm)} cm</span>
        <span>{max} cm</span>
      </div>
    </div>
  )
}
