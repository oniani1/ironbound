import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { VISIBLE_CHESTS } from '../../config/chests'
import { ITEMS } from '../../data/items'
import { chestPool, expectedValue } from '../../lib/gacha'
import { money, pct } from '../../lib/format'
import { useStore } from '../../lib/store'
import { EXPO } from '../vault/Experience'
import { Tag } from '../ui/RarityTag'
import { OddsBar } from './OddsBar'
import './sections.css'

export default function ChestTiersSection() {
  const pulls = useStore((s) => s.pulls)
  const reduced = useReducedMotion()
  const incomplete = VISIBLE_CHESTS.some((chest) => chestPool(chest, ITEMS).some((group) => group.band.odds > 0 && group.items.length === 0))
  return <section className="ib-landing-section" id="chest-tiers" aria-labelledby="tiers-title"><div className="ib-shell">
    <div className="ib-section-heading"><div><p className="ib-kicker">The chest ledger</p><h2 id="tiers-title" className="ib-title ib-section-title">Choose your stakes.</h2></div><p className="ib-copy">From camp steel to royal armor.<br />Every tier has its own odds.</p></div>
    <div className="ib-tiers">{VISIBLE_CHESTS.map((chest, index) => {
      const ev = expectedValue(chest, ITEMS)
      const remaining = chest.limited ? Math.max(0, chest.limited.remaining - pulls.filter((pull) => pull.chestId === chest.id).length) : null
      return <motion.article className="ib-tier" key={chest.id} initial={{ opacity: 0, y: reduced ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: reduced ? 0.1 : 0.45, delay: reduced ? 0 : index * 0.045, ease: EXPO }}>
        <div className="ib-tier-identity"><div className="ib-tier-index"><span className="ib-kicker tabular">Chest {String(index + 1).padStart(2, '0')}</span>{chest.limited && <Tag tone="ember">Limited</Tag>}</div>
          <h3 className="font-display">{chest.name}</h3><p className="ib-tier-epithet">{chest.epithet}</p><p className="ib-tier-tagline">{chest.tagline}</p>
          {chest.limited && <p className="ib-tier-stock"><strong className="tabular">{remaining} / {chest.limited.total}</strong> remaining in demo stock</p>}
        </div>
        <div className="ib-tier-cost"><span className="eyebrow">Per chest</span><p className="ib-tier-price font-display tabular">{money(chest.price)}</p></div>
        <dl className="ib-tier-numbers"><div><dt className="caps">Expected item value</dt><dd className="tabular">{money(ev, {})}</dd></div><div><dt className="caps">Instant buyback</dt><dd className="tabular">{pct(chest.buyback)} of value</dd></div></dl>
        <div className="ib-tier-odds"><p className="eyebrow">Rarity distribution</p><OddsBar chest={chest} details /></div>
        <Link to={`/chests/${chest.id}`} className="ib-tier-link caps">Inspect chest <ArrowRight size={18} weight="light" aria-hidden="true" /></Link>
      </motion.article>
    })}</div>
    <p className="ib-tier-footnote">Expected value is an average across the listed pool, not a guaranteed pull or a cash return. {incomplete && 'This preview has unfilled value bands. Expected values exclude those bands. '}Prices, odds and inventory are simulated.</p>
  </div></section>
}
