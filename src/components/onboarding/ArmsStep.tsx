import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import type { Arms } from '../../types'
import { actions, useStore } from '../../lib/store'
import { Button } from '../ui/Button'
import { blazon, DEFAULT_ARMS, Shield } from '../ui/Heraldry'
import { EXPO, Reveal } from '../vault/Experience'
import type { StepProps } from '../vault/Experience'
import { ArmsEditor } from './ArmsEditor'

export default function ArmsStep({ onNext, onBack }: StepProps) {
  const profile = useStore((s) => s.profile)
  const [name, setName] = useState(profile?.name ?? 'Wanderer')
  const [arms, setArms] = useState<Arms>(profile?.arms ?? DEFAULT_ARMS)
  const reduced = useReducedMotion()
  function save() {
    actions.setProfile({ name: name.trim() || 'Wanderer', arms })
    onNext()
  }

  return <section className="ib-step ib-step--wide" aria-labelledby="arms-title"><div className="ib-step-top"><p className="ib-kicker tabular m-0">Your mark · 01</p></div><Reveal><h1 id="arms-title" tabIndex={-1} className="ib-title ib-step-title">Raise your banner.</h1><p className="ib-copy">A name. A coat of arms. A vault of your own. You can change them later from your vault.</p></Reveal>
    <div className="ib-arms-layout">
      <div className="ib-arms-preview"><div className="ib-banner-thread" aria-hidden="true" /><AnimatePresence mode="wait"><motion.div key={`${arms.field}-${arms.charge}-${arms.ordinary}-${arms.symbol}-${arms.symbolColor}`} initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={{ duration: 0.22, ease: EXPO }}><Shield arms={arms} size={180} className="ib-large-shield" /></motion.div></AnimatePresence><div className="ib-arms-caption"><p className="ib-arms-name">{name.trim() || 'Wanderer'}</p><p className="ib-kicker m-0">{blazon(arms).replace(/^Arms: /, '')}</p></div></div>
      <ArmsEditor name={name} onName={setName} arms={arms} onArms={setArms} size="lg" onDone={save} doneLabel={<>Use these arms <ArrowRight size={18} weight="light" aria-hidden="true" /></>} lead={onBack ? <Button type="button" variant="ghost" size="lg" onClick={onBack}>Back</Button> : <span className="text-[13px] text-bone-400">Make it yours.</span>} />
    </div>
  </section>
}
