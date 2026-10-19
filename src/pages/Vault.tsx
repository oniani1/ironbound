import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CaretDown, SlidersHorizontal } from '@phosphor-icons/react'
import type { Category, Pull } from '../types'
import { ARCHIVE_BY_ID, ITEM_BY_ID } from '../data/items'
import { CHEST_BY_ID } from '../config/chests'
import { RARITIES } from '../config/rarity'
import { money } from '../lib/format'
import { buybackOffer } from '../lib/gacha'
import { useStore } from '../lib/store'
import { DEFAULT_ARMS, Shield } from '../components/ui/Heraldry'
import { CountUp } from '../components/ui/CountUp'
import { RarityTag, Tag } from '../components/ui/RarityTag'
import { Button } from '../components/ui/Button'
import { ProfileSheet } from '../components/vault/ProfileSheet'
import { QuietSelect } from '../components/ui/QuietSelect'
import { EXPO, Reveal } from '../components/vault/Experience'
import { ItemArtwork } from '../components/vault/ItemArtwork'
import { ItemDetail } from '../components/vault/ItemDetail'

const CATEGORIES: { id: Category | 'all'; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'sword', label: 'Swords' }, { id: 'dagger', label: 'Daggers' }, { id: 'polearm', label: 'Polearms' }, { id: 'axe', label: 'Axes' }, { id: 'helmet', label: 'Helmets' }, { id: 'shield', label: 'Shields' }, { id: 'armor', label: 'Armor' }, { id: 'bow', label: 'Bows' }, { id: 'crossbow', label: 'Crossbows' }]
// Fittings have left the catalog; a vault that still holds one keeps the filter for it.
const FITTINGS: { id: Category; label: string } = { id: 'fitting', label: 'Fittings' }
type Status = 'all' | 'vaulted' | 'shipping' | 'sold'
const STATUSES: { id: Status; label: string }[] = [{ id: 'all', label: 'All statuses' }, { id: 'vaulted', label: 'In vault' }, { id: 'shipping', label: 'Shipping' }, { id: 'sold', label: 'Sold' }]
const statusLabel = (pull: Pull) => pull.status === 'vaulted' ? 'In vault' : pull.status === 'sold' ? 'Sold' : pull.status === 'shipped' ? 'Shipped' : 'Shipping'
const SORTS = [{ value: 'newest', label: 'Newest' }, { value: 'value', label: 'Highest value' }, { value: 'rarity', label: 'Highest rarity' }] as const

function FilterTabs<T extends string>({ options, value, onChange, label, id }: { options: { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string; id: string }) {
  const reduced = useReducedMotion()
  return <div className="ib-filter-tabs" role="group" aria-label={label}>{options.map((filter) => <button type="button" className="ib-filter caps" key={filter.id} aria-pressed={value === filter.id} onClick={() => onChange(filter.id)}>
    {filter.label}{value === filter.id && <motion.span className="ib-filter-line" layoutId={reduced ? undefined : id} transition={{ duration: reduced ? 0 : 0.3, ease: EXPO }} aria-hidden="true" />}
  </button>)}</div>
}

export default function Vault() {
  const { uid } = useParams()
  const profile = useStore((s) => s.profile)
  const [editing, setEditing] = useState(false)
  const pulls = useStore((s) => s.pulls)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [status, setStatus] = useState<Status>('all')
  const [sort, setSort] = useState<'newest' | 'value' | 'rarity'>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const reduced = useReducedMotion()
  const selected = uid ? pulls.find((p) => p.uid === uid) : undefined
  // A piece that has left the catalog still shows, from its archived record.
  const item = selected ? ITEM_BY_ID[selected.itemId] ?? ARCHIVE_BY_ID[selected.itemId] : undefined
  const owned = pulls.filter((p) => p.status !== 'sold')
  const value = owned.reduce((sum, p) => sum + p.value, 0)
  // The ledger counts what the steel is worth, never what was spent on it (the founder, 2026-10-16).
  const best = pulls.reduce<Pull | null>((top, p) => (!top || p.value > top.value ? p : top), null)
  const bestRecord = best ? ITEM_BY_ID[best.itemId] ?? ARCHIVE_BY_ID[best.itemId] : undefined
  const sellBackValue = pulls.filter((p) => p.status === 'vaulted').reduce<number | null>((sum, p) => {
    const chest = CHEST_BY_ID[p.chestId]
    return sum === null || !chest ? null : sum + buybackOffer(p.value, chest)
  }, 0)
  const vaulted = pulls.filter((p) => p.status === 'vaulted').length
  const shipping = pulls.filter((p) => p.status === 'shipping' || p.status === 'shipped').length
  const sold = pulls.filter((p) => p.status === 'sold').length
  const categoryOf = (pull: Pull) => (ITEM_BY_ID[pull.itemId] ?? ARCHIVE_BY_ID[pull.itemId])?.category
  const categories = pulls.some((p) => categoryOf(p) === 'fitting') ? [...CATEGORIES, FITTINGS] : CATEGORIES
  const visible = pulls.filter((p) => (category === 'all' || categoryOf(p) === category) && (status === 'all' || (status === 'shipping' ? p.status === 'shipping' || p.status === 'shipped' : p.status === status))).sort((a, b) => sort === 'value' ? b.value - a.value || b.at - a.at : sort === 'rarity' ? RARITIES[b.rarity].tier - RARITIES[a.rarity].tier || b.value - a.value : b.at - a.at)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.title = uid && item ? `${item.name} | Ironbound` : 'Your vault | Ironbound' }, [uid, item])

  return <><div className="ib-shell" id="vault-main">
    {uid ? selected && item ? <ItemDetail key={uid} pull={selected} item={item} /> : <div className="ib-empty"><p className="ib-kicker">Vault record unavailable</p><h1 className="ib-title">This piece is not here.</h1><p className="ib-copy">{selected ? 'Its catalog record is unavailable in this demo.' : 'This vault belongs to this browser. The item may be saved in another session.'}</p><Link to="/vault" className="ib-action-link">Return to your vault</Link></div> : <>
      <Reveal><header className="ib-vault-header"><div className="ib-owner"><Shield arms={profile?.arms ?? DEFAULT_ARMS} size={58} /><div><p className="ib-kicker">Your private armory</p><h1 className="ib-title">{profile?.name ?? 'Wanderer'}’s vault</h1></div></div><Button variant="secondary" size="sm" onClick={() => setEditing(true)} data-testid="edit-profile">Edit arms and name</Button></header><AnimatePresence>{editing && <ProfileSheet onClose={() => setEditing(false)} />}</AnimatePresence>
        <div className="ib-vault-ledger">
          <div className="ib-ledger-owned"><p className="ib-ledger-label">Owned value</p><div className="ib-vault-total font-display tabular"><CountUp to={value} duration={0.45} /></div></div>
          <div className="ib-ledger-return"><p className="ib-ledger-label">Best pull</p><strong className="tabular">{best ? <><CountUp to={best.value} duration={0.45} /><span className="ib-ledger-note">{bestRecord?.name ?? 'Unrecorded piece'}</span></> : 'None yet'}</strong></div>
          <div className="ib-ledger-return"><p className="ib-ledger-label">Sell-back now</p><strong className="tabular">{sellBackValue === null ? 'Unavailable' : <CountUp to={sellBackValue} duration={0.45} />}</strong></div>
          <div className="ib-counts">{[[vaulted, 'In vault'], [shipping, 'Shipping'], [sold, 'Sold']].map(([count, label]) => <span key={label}><strong className="tabular"><CountUp to={Number(count)} duration={0.45} format={(n) => Math.round(n).toLocaleString('en-US')} /></strong><span className="caps">{label}</span></span>)}</div>
        </div>
        <details className="ib-ledger-calculation"><summary className="caps">How totals work <CaretDown size={16} weight="light" aria-hidden="true" /></summary><p>Owned value: every piece you hold, in the vault, shipping or shipped.</p><p>Best pull: the most valuable piece you have pulled.</p><p>Sell-back now: {sellBackValue === null ? 'unavailable. A piece in your vault has no recorded chest rate.' : "each piece in your vault at its chest's sell-back rate, credited at once. Shipping pieces cannot be sold back."}</p></details>
      </Reveal>
      {pulls.length > 0 && <div className="ib-vault-controls">
        <div className="ib-control-summary"><p className="caps tabular text-bone-400 m-0" role="status">{visible.length} {visible.length === 1 ? 'piece' : 'pieces'}</p><button type="button" className="ib-filter-toggle caps" aria-expanded={filtersOpen} aria-controls="vault-filter-panel" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} weight="light" aria-hidden="true" />Filter{(category !== 'all' || status !== 'all') && <span className="ib-filter-active" aria-label="Filters applied"> · On</span>}</button></div>
        <div className="ib-filter-panel" id="vault-filter-panel" data-open={filtersOpen}>
          <FilterTabs options={categories} value={category} onChange={setCategory} label="Filter by item type" id="vault-category-line" />
          <div className="ib-controls-bottom"><FilterTabs options={STATUSES} value={status} onChange={setStatus} label="Filter by item status" id="vault-status-line" /><QuietSelect label="Sort by" value={sort} options={SORTS} onChange={setSort} /></div>
        </div>
      </div>}
      {!pulls.length ? <Reveal className="ib-empty"><div className="ib-empty-rack" aria-hidden="true"><Shield arms={profile?.arms ?? DEFAULT_ARMS} size={72} /></div><p className="ib-kicker">A wall waiting for steel</p><h2 className="ib-title">Start your armory.</h2><p className="ib-copy">Your pulls live here, vaulted and insured in the demo. Inspect every piece, sell it back for credit, or request a shipment.</p><Link to="/chests" className="ib-action-link">Open a chest <ArrowRight size={18} weight="light" aria-hidden="true" /></Link></Reveal> : !visible.length ? <div className="ib-empty"><h2 className="ib-title">No pieces in this selection.</h2><p className="ib-copy">Try another type or include all statuses.</p><Button variant="secondary" onClick={() => { setCategory('all'); setStatus('all') }}>Show every piece</Button></div> : <div className="ib-wall">{visible.map((pull, index) => { const object = ITEM_BY_ID[pull.itemId]; const record = object ?? ARCHIVE_BY_ID[pull.itemId]; return <motion.div key={pull.uid} initial={{ opacity: 0, y: reduced ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduced ? 0.15 : 0.45, delay: reduced ? 0 : (index % 4) * 0.04, ease: EXPO }}><Link to={`/vault/${encodeURIComponent(pull.uid)}`} className="ib-wall-entry">{object ? <ItemArtwork item={object} rarity={pull.rarity} eager={index < 4} sheen /> : <div className="ib-artwork ib-artwork-empty"><span className="ib-photo-unavailable">{record ? 'Retired from the catalog' : 'Catalog record unavailable'}</span></div>}<div className="ib-wall-label"><RarityTag rarity={pull.rarity} /><h2>{record?.name ?? 'Unrecorded piece'}</h2><p className="ib-wall-provenance">{record?.era ?? 'Era unknown'}{record ? ` · ${record.origin}` : ''}</p><div className="ib-wall-foot"><p className="ib-value tabular">{money(pull.value)} <span className="sr-only">estimated value</span></p><Tag>{statusLabel(pull)}</Tag></div></div></Link></motion.div> })}</div>}
    </>}
    <p className="ib-vault-note">Demo. All items, prices and payouts are simulated. Owned value includes pieces in your vault, shipping and shipped.</p>
  </div></>
}
