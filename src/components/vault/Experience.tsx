import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './experience.css'

export const EXPO = [0.16, 1, 0.3, 1] as const
export interface StepProps { onNext: () => void; onBack?: () => void }

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion()
  return <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.05 }} transition={{ duration: reduced ? 0.15 : 0.45, delay: reduced ? 0 : delay, ease: EXPO }}>{children}</motion.div>
}

export function CoinBurst() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return <div className="ib-coin-burst" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <motion.span key={i} className="ib-coin" initial={{ x: 0, y: 20, opacity: 0, rotateY: 0 }} animate={{ x: (i - 4) * 25, y: [-12, -95 - (i % 3) * 18, -130], opacity: [0, 1, 0], rotateY: 200 + i * 70 }} transition={{ duration: 0.85, delay: i * 0.025, ease: EXPO }}>$</motion.span>)}</div>
}

export function Seal({ label = 'IB' }: { label?: string }) {
  return <span className="ib-seal caps" aria-hidden="true"><span>{label}</span></span>
}
