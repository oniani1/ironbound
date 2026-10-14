import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Item, Pull } from '../../types'
import { CHEST_BY_ID } from '../../config/chests'
import { actions, getState } from '../../lib/store'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio'
import { Button } from '../ui/Button'
import { RarityTag } from '../ui/RarityTag'
import { CountUp } from '../ui/CountUp'
import { CoinBurst, EXPO, Reveal, Seal } from './Experience'
import { ImageViewer } from './ImageViewer'
import { ShipFlow, ShipmentTimeline } from './ShipFlow'
import { comparableSales, itemHash, VALUED_ON } from './valuation'

export function ItemDetail({ pull, item }: { pull: Pull; item: Item }) {
  const [flow, setFlow] = useState<'idle' | 'sell' | 'ship'>('idle')
  const [celebrate, setCelebrate] = useState(false)
  const [error, setError] = useState('')
  const reduced = useReducedMotion()
  const confirmHeading = useRef<HTMLHeadingElement>(null)
  const receiptHeading = useRef<HTMLHeadingElement>(null)
  const sellButton = useRef<HTMLButtonElement>(null)
  const shipButton = useRef<HTMLButtonElement>(null)
  const committed = useRef(false)
  const chest = CHEST_BY_ID[pull.chestId]
  const offer = chest ? pull.value * chest.buyback : null
  const vaulted = pull.status === 'vaulted'
  const certificate = `IB-${itemHash(pull.uid).toString(16).toUpperCase().padStart(8, '0')}`
  useEffect(() => { if (flow === 'sell') confirmHeading.current?.focus() }, [flow])
  useEffect(() => { if (celebrate) receiptHeading.current?.focus() }, [celebrate])

  function sell() {
    if (committed.current || offer === null) return
    if (getState().pulls.find((p) => p.uid === pull.uid)?.status !== 'vaulted') { setError('This item is no longer available for sell-back.'); return }
    committed.current = true
    sfx.unlock()
    actions.sellBack(pull.uid, offer)
    sfx.coins()
    setCelebrate(true)
    setFlow('idle')
  }

  return <>
    <div className="ib-detail-top"><Link to="/vault" className="ib-text-link"><span aria-hidden="true">←</span> Back to your vault</Link><span className="ib-status">{pull.status === 'vaulted' ? 'In vault' : pull.status === 'sold' ? 'Sold' : pull.status === 'shipped' ? 'Shipped' : 'Shipping'}</span></div>
    <div className="ib-detail-grid">
      <Reveal className="ib-detail-image"><ImageViewer item={item} rarity={pull.rarity} /><p className="text-sm text-bone-300 mt-4">Photograph: {item.credit} <a className="ib-text-link" href={item.sourceUrl} target="_blank" rel="noreferrer">View museum record ↗</a></p></Reveal>
      <Reveal delay={0.08}>
        <header className="ib-detail-heading"><RarityTag rarity={pull.rarity} size="md" /><h1 className="ib-title">{item.name}</h1><p className="text-bone-200">{item.era} · {item.origin}</p><p className="ib-copy">{item.blurb}</p></header>
        <dl className="ib-specs">{[['Provenance', item.provenance === 'antique' ? 'Antique' : 'Forged reproduction'], ['Maker', item.maker ?? 'Unrecorded'], ['Era', item.era], ['Origin', item.origin], ['Materials', item.materials], ['Length', item.length ?? 'Not recorded'], ['Weight', item.weight ?? 'Not recorded'], ['Acquired from', chest?.name ?? 'Unrecorded chest']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <section className="ib-valuation" aria-labelledby="valuation-title"><h2 id="valuation-title">Valuation</h2>
          <dl className="ib-valuation-pair"><div><dt>Estimated value</dt><dd className="tabular">{money(pull.value, {})}</dd></div><div><dt>{pull.status === 'sold' ? 'Sold for' : 'Sell-back offer'}</dt><dd className="tabular text-brass-300">{pull.status === 'sold' ? money(pull.soldFor ?? 0, {}) : offer === null ? 'Unavailable' : money(offer, {})}</dd></div></dl>
          <p className="text-sm text-bone-300 mt-3">{chest ? `${Math.round(chest.buyback * 100)}% of estimated value. ${vaulted ? 'Credited instantly to your demo balance.' : 'Sell-back is available only while an item is in the vault.'}` : 'The original chest is missing. A sell-back offer cannot be calculated.'}</p>
          <p className="ib-kicker mt-6">Simulated comparable sales</p><ul className="ib-comps">{comparableSales(item.id, pull.value).map((sale) => <li key={sale.id}><span>{sale.label} · {sale.date}</span><span className="tabular">{money(sale.value)}</span></li>)}</ul>
          <small>Valued on {VALUED_ON}. Estimates and comparable sales are mock data.</small>
        </section>
        <section className="ib-certificate" aria-labelledby="certificate-title"><div className="ib-certificate-head"><Seal /><div><p className="ib-kicker">Demo certificate</p><h2 id="certificate-title">Certificate of authenticity</h2></div></div><dl><div><dt>Certificate</dt><dd className="tabular">{certificate}</dd></div><div><dt>Vault location</dt><dd>Demo vault · Bay {String(itemHash(item.id) % 24 + 1).padStart(2, '0')}</dd></div><div><dt>Insured value</dt><dd className="tabular">{money(pull.value, {})}</dd></div><div><dt>Object classification</dt><dd>{item.provenance === 'antique' ? 'Antique' : 'Forged reproduction'}</dd></div></dl><p className="text-sm text-bone-300 mt-5 mb-0">A simulated record. This certificate does not authenticate the pictured museum object.</p></section>
        {vaulted && <div className="ib-actions"><div><Button ref={sellButton} variant="secondary" onClick={() => { setFlow('sell'); setError('') }} disabled={offer === null}>Sell back</Button><Button ref={shipButton} onClick={() => { setFlow('ship'); setError('') }}>Ship to me</Button></div><Button variant="ghost" disabled aria-describedby="market-coming-soon">List on market</Button><p id="market-coming-soon" className="ib-actions-note">Marketplace coming soon. Keeping this item in your vault is free.</p></div>}
        <AnimatePresence mode="wait">
          {vaulted && flow === 'sell' && <motion.section key="sell" className="ib-transaction" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: EXPO }} aria-labelledby="sell-title"><p className="ib-kicker">Sell-back · demo</p><h2 id="sell-title" ref={confirmHeading} tabIndex={-1} className="ib-transaction-heading">Trade your steel for credit?</h2><p className="ib-sale-amount tabular">{money(offer ?? 0, {})}</p><p className="ib-copy">This exact offer goes to your demo balance. {item.name} leaves your vault. The sale cannot be reversed.</p>{error && <p className="ib-error" role="alert">{error}</p>}<div className="ib-transaction-buttons"><Button onClick={sell}>Confirm sell-back</Button><Button variant="ghost" onClick={() => { setFlow('idle'); sellButton.current?.focus() }}>Keep in vault</Button></div></motion.section>}
          {vaulted && flow === 'ship' && <motion.div key="ship" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: EXPO }}><ShipFlow pull={pull} onCancel={() => { setFlow('idle'); shipButton.current?.focus() }} /></motion.div>}
        </AnimatePresence>
        {pull.status === 'sold' && <section className="ib-transaction" aria-live="polite"><p className="ib-kicker">Sale recorded</p><h2 ref={receiptHeading} tabIndex={-1} className="ib-transaction-heading">Steel into coin.</h2><div className="ib-sale-amount">{celebrate && <CoinBurst />}<span aria-hidden="true"><CountUp to={pull.soldFor ?? 0} format={(n) => `+${money(n, {})}`} /></span><span className="sr-only">{money(pull.soldFor ?? 0, {})} added to your demo balance.</span></div><p className="ib-copy">Added to your demo balance. This item remains in your sold history.</p><Link to="/chests" className="ib-action-link mt-4">Choose another chest <span aria-hidden="true">→</span></Link></section>}
        {(pull.status === 'shipping' || pull.status === 'shipped') && <ShipmentTimeline pull={pull} autoFocus={flow === 'ship'} />}
      </Reveal>
    </div>
  </>
}
