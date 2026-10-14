import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { actions, useStore } from '../../lib/store'
import { sfx } from '../../lib/audio'
import './experience.css'

export const EXPO = [0.16, 1, 0.3, 1] as const
export interface StepProps { onNext: () => void; onBack?: () => void }

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion()
  return <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0.12 : 0.5, delay: reduced ? 0 : delay, ease: EXPO }}>{children}</motion.div>
}

export function SoundToggle() {
  const sound = useStore((s) => s.settings.sound)
  return <button type="button" className="ib-sound" aria-pressed={sound} aria-label={sound ? 'Mute sound' : 'Enable sound'} onClick={() => { sfx.unlock(); actions.toggleSound() }}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{sound ? <><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}</svg>
    <span>Sound {sound ? 'on' : 'off'}</span>
  </button>
}

export function CoinBurst() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return <div className="ib-coin-burst" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <motion.span key={i} className="ib-coin" initial={{ x: 0, y: 20, opacity: 0, rotateY: 0 }} animate={{ x: (i - 4) * 25, y: [-12, -95 - (i % 3) * 18, -130], opacity: [0, 1, 0], rotateY: 200 + i * 70 }} transition={{ duration: 0.85, delay: i * 0.025, ease: EXPO }}>$</motion.span>)}</div>
}

export function Seal({ label = 'IB' }: { label?: string }) {
  return <span className="ib-seal" aria-hidden="true"><span>{label}</span></span>
}
