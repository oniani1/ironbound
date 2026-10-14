import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Plus } from '@phosphor-icons/react'
import { EXPO } from '../vault/Experience'
import './sections.css'

const QUESTIONS = [
  ['Is this real money?', 'No. Ironbound is a demo. All chest prices, item values and payouts are simulated. Your $1,000 credit has no cash value.'],
  ['What is inside a chest?', 'One arms or armor object from the demo catalog: a sword, dagger, polearm, helmet, shield, armor piece or fitting. Museum photographs show physical objects. Opening a demo chest does not transfer ownership of a museum object.'],
  ['How are the odds set?', 'Each chest has published rarity bands. A random draw selects a band and then an item in its value range. Empty demo bands fall back to a lower populated band. Each opening is independent. Inspect the full pool before opening.'],
  ['Can I sell a piece back?', 'Yes, while it is in your vault. Each chest pays 85% to 92% of estimated item value as demo credit. The exact offer appears before confirmation. Credit is not a cash withdrawal.'],
  ['How does shipping work?', 'Enter a mock address, choose insured standard or express, then review the cost. Shipping costs demo credit. The timeline separates your request from packing and courier acceptance. No parcel is sent.'],
  ['Will my collection be saved?', 'Your name, arms, balance and collection are saved in this browser. Clearing site data removes them. Demo sign-in does not create an account or sync between devices.'],
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  const prefix = useId()
  const reduced = useReducedMotion()
  return <section className="ib-landing-section" id="faq" aria-labelledby="faq-title"><div className="ib-shell ib-faq-layout"><div><p className="ib-kicker">Before you draw</p><h2 id="faq-title" className="ib-title ib-section-title">A few fair<br />questions.</h2></div><div className="ib-faq-list">{QUESTIONS.map(([question, answer], index) => <motion.article className="ib-faq-item" key={question} data-open={open === index} initial={{ opacity: 0, y: reduced ? 0 : 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduced ? 0.15 : 0.4, ease: EXPO }}><h3><button type="button" id={`${prefix}-question-${index}`} aria-expanded={open === index} aria-controls={`${prefix}-answer-${index}`} onClick={() => setOpen(open === index ? null : index)}><span>{question}</span><Plus className="ib-faq-plus" size={20} weight="light" aria-hidden="true" /></button></h3><div className="ib-faq-answer" id={`${prefix}-answer-${index}`} role="region" aria-labelledby={`${prefix}-question-${index}`} aria-hidden={open !== index}><div><p className="tabular">{answer}</p></div></div></motion.article>)}</div></div></section>
}
