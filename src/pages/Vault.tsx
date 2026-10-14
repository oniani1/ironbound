import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Category, Pull } from '../types'
import { ITEM_BY_ID } from '../data/items'
import { RARITIES } from '../config/rarity'
import { money } from '../lib/format'
import { useStore } from '../lib/store'
import { DEFAULT_ARMS, Shield } from '../components/ui/Heraldry'
import { CountUp } from '../components/ui/CountUp'
import { RarityTag } from '../components/ui/RarityTag'
import { Button } from '../components/ui/Button'
import { EXPO, Reveal } from '../components/vault/Experience'
import { ItemArtwork } from '../components/vault/ItemArtwork'
import { ItemDetail } from '../components/vault/ItemDetail'

const CATEGORIES: { id: Category | 'all'; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'sword', label: 'Swords' }, { id: 'dagger', label: 'Daggers' }, { id: 'polearm', label: 'Polearms' }, { id: 'axe', label: 'Axes' }, { id: 'helmet', label: 'Helmets' }, { id: 'shield', label: 'Shields' }, { id: 'armor', label: 'Armor' }, { id: 'fitting', label: 'Fittings' }]
type Status = 'all' | 'vaulted' | 'shipping' | 'sold'
const STATUSES: { id: Status; label: string }[] = [{ id: 'all', label: 'All statuses' }, { id: 'vaulted', label: 'In vault' }, { id: 'shipping', label: 'Shipping' }, { id: 'sold', label: 'Sold' }]
const statusLabel = (pull: Pull) => pull.status === 'vaulted' ? 'In vault' : pull.status === 'sold' ? 'Sold' : pull.status === 'shipped' ? 'Shipped' : 'Shipping'

export default function Vault() {
  const { uid } = useParams()
  const profile = useStore((s) => s.profile)
  const pulls = useStore((s) => s.pulls)
  const stats = useStore((s) => s.stats)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [status, setStatus] = useState<Status>('all')
  const [sort, setSort] = useState<'newest' | 'value' | 'rarity'>('newest')
  const reduced = useReducedMotion()
  const selected = uid ? pulls.find((p) => p.uid === uid) : undefined
  const item = selected ? ITEM_BY_ID[selected.itemId] : undefined
  const value = pulls.filter((p) => p.status === 'vaulted').reduce((sum, p) => sum + p.value, 0)
  const pnl = value + stats.soldFor - stats.spent
  const vaulted = pulls.filter((p) => p.status === 'vaulted').length
  const shipping = pulls.filter((p) => p.status === 'shipping' || p.status === 'shipped').length
  const sold = pulls.filter((p) => p.status === 'sold').length
  const visible = pulls.filter((p) => (category === 'all' || ITEM_BY_ID[p.itemId]?.category === category) && (status === 'all' || (status === 'shipping' ? p.status === 'shipping' || p.status === 'shipped' : p.status === status))).sort((a, b) => sort === 'value' ? b.value - a.value || b.at - a.at : sort === 'rarity' ? RARITIES[b.rarity].tier - RARITIES[a.rarity].tier || b.value - a.value : b.at - a.at)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.title = uid && item ? `${item.name} | Ironbound` : 'Your vault | Ironbound' }, [uid, item])

  return <><div className="ib-shell" id="vault-main">
    {uid ? selected && item ? <ItemDetail key={uid} pull={selected} item={item} /> : <div className="ib-empty"><p className="ib-kicker">Vault record unavailable</p><h1 className="ib-title">This piece is not here.</h1><p className="ib-copy">{selected ? 'Its catalog record is unavailable in this demo.' : 'This vault belongs to this browser. The item may be saved in another session.'}</p><Link to="/vault" className="ib-action-link">Return to your vault</Link></div> : <>
      <Reveal><header className="ib-vault-header"><div className="ib-owner"><Shield arms={profile?.arms ?? DEFAULT_ARMS} size={58} /><div><p className="ib-kicker">Your private armory</p><h1 className="ib-title">{profile?.name ?? 'Wanderer'}’s vault</h1></div></div></header>
        <div className="ib-vault-ledger"><div><p className="ib-kicker m-0">In-vault value</p><div className="ib-vault-total"><CountUp to={value} /></div></div><div className="ib-pnl"><strong className={pnl >= 0 ? 'ib-positive' : 'ib-negative'}><CountUp to={pnl} format={(n) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n), {})}`} /> {pnl >= 0 ? 'profit' : 'loss'}</strong><details className="ib-pnl-calculation"><summary>Value + sales − spent</summary><span className="text-bone-300 tabular">{money(value, {})} + {money(stats.soldFor, {})} − {money(stats.spent, {})}</span><span className="text-bone-300">Shipping costs are included in total spent.</span></details></div><div className="ib-counts">{[[vaulted, 'In vault'], [shipping, 'Shipping'], [sold, 'Sold']].map(([count, label]) => <span key={label}><strong><CountUp to={Number(count)} format={(n) => Math.round(n).toLocaleString('en-US')} /></strong><br />{label}</span>)}</div></div>
      </Reveal>
      {pulls.length > 0 && <div className="ib-vault-controls"><div className="ib-mobile-type ib-sort"><label htmlFor="vault-type">Type</label><select id="vault-type" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>{CATEGORIES.map((filter) => <option value={filter.id} key={filter.id}>{filter.label}</option>)}</select></div><div className="ib-filters" aria-label="Filter by item type">{CATEGORIES.map((filter) => <button type="button" className="ib-filter" key={filter.id} aria-pressed={category === filter.id} onClick={() => setCategory(filter.id)}>{filter.label}</button>)}</div><div className="ib-controls-bottom"><div className="ib-status-filters" aria-label="Filter by item status">{STATUSES.map((filter) => <button type="button" className="ib-filter" key={filter.id} aria-pressed={status === filter.id} onClick={() => setStatus(filter.id)}>{filter.label}</button>)}</div><div className="ib-sort"><label htmlFor="vault-sort">Sort by</label><select id="vault-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="newest">Newest</option><option value="value">Highest value</option><option value="rarity">Highest rarity</option></select></div></div><p className="text-sm text-bone-300 m-0" role="status">{visible.length} {visible.length === 1 ? 'piece' : 'pieces'}</p></div>}
      {!pulls.length ? <Reveal className="ib-empty"><div className="ib-empty-rack" aria-hidden="true"><Shield arms={profile?.arms ?? DEFAULT_ARMS} size={72} /></div><p className="ib-kicker">A wall waiting for steel</p><h2 className="ib-title">Start your armory.</h2><p className="ib-copy">Your pulls live here, vaulted and insured in the demo. Inspect every piece, sell it back for credit, or request a shipment.</p><Link to="/chests" className="ib-action-link">Open a chest <span aria-hidden="true">→</span></Link></Reveal> : !visible.length ? <div className="ib-empty"><h2 className="ib-title">No pieces in this selection.</h2><p className="ib-copy">Try another type or include all statuses.</p><Button variant="secondary" onClick={() => { setCategory('all'); setStatus('all') }}>Show every piece</Button></div> : <div className="ib-wall">{visible.map((pull, index) => { const object = ITEM_BY_ID[pull.itemId]; return <motion.div key={pull.uid} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0.1 : 0.45, delay: reduced ? 0 : Math.min(index, 5) * 0.035, ease: EXPO }}><Link to={`/vault/${encodeURIComponent(pull.uid)}`} className="ib-wall-entry">{object ? <ItemArtwork item={object} rarity={pull.rarity} eager={index < 4} /> : <div className="ib-artwork"><span className="ib-photo-unavailable">Catalog record unavailable</span></div>}<div className="ib-wall-label"><RarityTag rarity={pull.rarity} /><h2>{object?.name ?? 'Unrecorded piece'}</h2><p>{object?.era ?? 'Era unknown'}{object ? ` · ${object.origin}` : ''}</p><p className="ib-value tabular">{money(pull.value)} <span className="sr-only">estimated value</span></p><span className="ib-status">{statusLabel(pull)}</span></div></Link></motion.div> })}</div>}
    </>}
    <p className="ib-vault-note">Demo. All items, prices and payouts are simulated. In-vault value excludes shipping and shipped pieces.</p>
  </div></>
}
