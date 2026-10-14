import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { ITEMS } from '../../data/items'
import { ItemArtwork } from '../vault/ItemArtwork'
import { EXPO } from '../vault/Experience'
import './sections.css'

export default function HowItWorksSection() {
  const reduced = useReducedMotion()
  const item = ITEMS.find((piece) => piece.category === 'sword' && piece.value > 1000) ?? ITEMS[0]
  return <section className="ib-landing-section ib-how-section" id="how-it-works" aria-labelledby="how-section-title"><div className="ib-shell ib-how-layout">
    <motion.div className="ib-how-object" initial={{ opacity: 0, y: reduced ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: reduced ? 0.15 : 0.45, ease: EXPO }}>{item && <ItemArtwork item={item} rarity="legendary" />}<span className="ib-object-caption"><span className="ib-kicker">From the armory</span><span className="font-display text-[30px]">{item?.name ?? 'A piece of history'}</span><span className="tabular">{item ? `${item.era} · ${item.origin}` : 'Real steel. Simulated ownership.'}</span></span></motion.div>
    <div><p className="ib-kicker">The ritual</p><h2 id="how-section-title" className="ib-title ib-section-title">A chest. A chance.<br /><em>A piece of history.</em></h2><div className="ib-how-steps">{[
      ['01', 'Choose your chest', 'Read the price, the odds and the sell-back rate. Every number is on the lid.'],
      ['02', 'Break the seal', 'One chest, one real object in the demo catalog. Watch the light. Meet your steel.'],
      ['03', 'Make it yours', 'Keep it vaulted, request insured shipping, or sell it back for instant demo credit.'],
    ].map(([number, title, copy], index) => <motion.div className="ib-how-step" key={number} initial={{ opacity: 0, y: reduced ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: reduced ? 0.15 : 0.45, delay: reduced ? 0 : index * 0.06, ease: EXPO }}><span className="ib-how-number caps tabular">{number}</span><div><h3>{title}</h3><p>{copy}</p></div></motion.div>)}</div><Link to="/chests" className="ib-text-link ib-section-link caps">Choose your first chest <ArrowRight size={18} weight="light" aria-hidden="true" /></Link></div>
  </div></section>
}
