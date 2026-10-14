import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Arms, Tincture } from '../../types'
import { actions, useStore } from '../../lib/store'
import { Button } from '../ui/Button'
import { DEFAULT_ARMS, ORDINARIES, ORDINARY_NAMES, Shield, TINCTURES } from '../ui/Heraldry'
import { EXPO, Reveal, SoundToggle } from '../vault/Experience'
import type { StepProps } from '../vault/Experience'

const COLORS: Record<Tincture, string> = { or: 'Gold', argent: 'Silver', gules: 'Crimson', azure: 'Blue', vert: 'Green', sable: 'Black', purpure: 'Purple' }
const TINCTURE_KEYS = Object.keys(TINCTURES) as Tincture[]

export default function ArmsStep({ onNext, onBack }: StepProps) {
  const profile = useStore((s) => s.profile)
  const [name, setName] = useState(profile?.name ?? 'Wanderer')
  const [arms, setArms] = useState<Arms>(profile?.arms ?? DEFAULT_ARMS)
  const reduced = useReducedMotion()
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); actions.setProfile({ name: name.trim() || 'Wanderer', arms }); onNext() }
  function color(part: 'field' | 'charge', tincture: Tincture) {
    const other = part === 'field' ? 'charge' : 'field'
    setArms({ ...arms, [part]: tincture, [other]: arms[other] === tincture ? (tincture === 'or' ? 'gules' : 'or') : arms[other] })
  }

  return <section className="ib-step" aria-labelledby="arms-title"><div className="ib-step-top"><p className="ib-kicker m-0">Your mark · 01</p><SoundToggle /></div><Reveal><h1 id="arms-title" className="ib-title ib-step-title">Raise your banner.</h1><p className="ib-copy">A name. A coat of arms. A vault of your own.</p></Reveal>
    <form onSubmit={save} className="ib-arms-layout">
      <div className="ib-arms-preview"><div className="ib-banner-thread" aria-hidden="true" /><AnimatePresence mode="wait"><motion.div key={`${arms.field}-${arms.charge}-${arms.ordinary}`} initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={{ duration: 0.22, ease: EXPO }}><Shield arms={arms} size={180} className="ib-large-shield" /></motion.div></AnimatePresence><p className="font-display text-3xl text-bone-100 text-center break-words max-w-full m-0">{name.trim() || 'Wanderer'}</p><p className="ib-kicker m-0">{TINCTURES[arms.field].name} · {ORDINARY_NAMES[arms.ordinary]} · {TINCTURES[arms.charge].name}</p></div>
      <div className="ib-arms-controls"><div className="ib-field"><label htmlFor="banner-name">Your name</label><input id="banner-name" className="ib-input" name="banner-name" autoComplete="nickname" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <fieldset className="ib-arms-picker"><legend>Choose your ordinary <span>the shape on your shield</span></legend><div className="ib-ordinary-options">{ORDINARIES.map((ordinary) => <button type="button" key={ordinary} aria-pressed={arms.ordinary === ordinary} className="ib-ordinary" onClick={() => setArms({ ...arms, ordinary })}><span aria-hidden="true"><Shield arms={{ ...arms, ordinary }} size={28} /></span><span>{ORDINARY_NAMES[ordinary]}</span></button>)}</div></fieldset>
        {(['field', 'charge'] as const).map((part) => <fieldset key={part} className="ib-arms-picker"><legend>{part === 'field' ? 'Field color' : 'Charge color'} <span>{COLORS[arms[part]]}</span></legend><div className="ib-swatches">{TINCTURE_KEYS.map((tincture) => <button type="button" key={tincture} className="ib-swatch" aria-label={`${part === 'field' ? 'Field' : 'Charge'}: ${COLORS[tincture]} (${TINCTURES[tincture].name})`} aria-pressed={arms[part] === tincture} onClick={() => color(part, tincture)}><span style={{ background: TINCTURES[tincture].fill }}>{arms[part] === tincture && <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke={tincture === 'or' || tincture === 'argent' ? 'var(--color-ink-950)' : 'var(--color-bone-100)'} strokeWidth="2" /></svg>}</span></button>)}</div></fieldset>)}
        <div className="ib-step-footer">{onBack ? <Button type="button" variant="ghost" onClick={onBack}>Back</Button> : <span className="text-sm text-bone-300">Make it yours.</span>}<Button type="submit" size="lg">Use these arms <span aria-hidden="true">→</span></Button></div>
      </div>
    </form>
  </section>
}
