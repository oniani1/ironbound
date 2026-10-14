import type { CSSProperties } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Play } from '@phosphor-icons/react'
import { ITEMS, ITEM_BY_ID } from '../data/items'
import { VISIBLE_CHESTS } from '../config/chests'
import { RARITY_ORDER } from '../config/rarity'
import { chestPool } from '../lib/gacha'
import { money, oneIn, provenanceLine, resaleLabel, RETAIL_CHECKED, sourceHost, timeAgo } from '../lib/format'
import type { FeedEntry } from '../lib/feed'
import type { RarityId } from '../types'
import { ImageViewer } from '../components/vault/ImageViewer'
import { ChestArt } from '../components/chest/ChestArt'
import { Button } from '../components/ui/Button'
import { RarityTag, Tag } from '../components/ui/RarityTag'
import { useOpening } from '../components/opening/OpeningProvider'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Any piece in the catalog, open to look at: the photograph, its record, what it is worth,
 * which chests hold it and at what odds. Reached from the live ticker, the wall of pulls,
 * the showcase and every chest pool. Someone's pull can be watched as a replay.
 */
export default function ItemPage() {
  const { id = '' } = useParams()
  const item = ITEM_BY_ID[id]
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const { open } = useOpening()
  const pull = (location.state as { pull?: FeedEntry } | null)?.pull

  if (!item) return <Navigate to="/chests" replace />

  // Every chest that can give this piece, with its rarity there and the odds of this exact piece.
  const homes = VISIBLE_CHESTS.flatMap((chest) => {
    const group = chestPool(chest, ITEMS).find((g) => g.items.some((i) => i.id === item.id))
    return group ? [{ chest, rarity: group.band.rarity, each: group.band.odds / group.items.length }] : []
  })
  const rarity: RarityId = pull?.rarity ?? homes.reduce<RarityId>((best, h) => (RARITY_ORDER.indexOf(h.rarity) > RARITY_ORDER.indexOf(best) ? h.rarity : best), homes[0]?.rarity ?? 'common')
  const watchChest = (pull && VISIBLE_CHESTS.find((c) => c.id === pull.chestId)) ?? homes[homes.length - 1]?.chest
  const isNew = item.provenance === 'forged'
  const specs: [string, string][] = [
    ['Provenance', isNew ? 'New work' : 'Antique'],
    ['Maker', item.maker ?? 'Unrecorded'],
    ...(isNew ? ([['Resale, our assessment', resaleLabel(item.resale)]] as [string, string][]) : []),
    ['Era', item.era],
    ['Origin', item.origin],
    ['Materials', item.materials],
    ['Length', item.length ?? 'Not recorded'],
    ['Weight', item.weight ?? 'Not recorded'],
  ]

  const watch = () => {
    if (!watchChest) return
    open(watchChest.id, 1, { spectate: { itemId: item.id, rarity: pull?.rarity ?? homes.find((h) => h.chest.id === watchChest.id)?.rarity ?? rarity, by: pull ? (pull.self ? 'You' : pull.name) : undefined } })
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 md:pb-24">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/chests'))}
        className="caps flex min-h-11 items-center gap-2 text-bone-300 transition-colors hover:text-bone-50"
      >
        <ArrowLeft size={15} weight="light" aria-hidden />
        Back
      </button>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <ImageViewer item={item} rarity={rarity} />
          <p className="mt-3 text-[12px] text-bone-400">
            {isNew ? item.credit : `Photograph: ${item.credit}`}{' '}
            <a className="inline-flex items-center gap-1 text-bone-300 underline decoration-bone-100/25 underline-offset-2 hover:text-bone-100" href={item.sourceUrl} target="_blank" rel="noreferrer">
              {isNew ? 'Photo source' : 'Museum record'}
              <ArrowUpRight size={12} weight="light" aria-hidden />
            </a>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease }}>
          <RarityTag rarity={rarity} size="md" />
          <h1 className="font-display mt-3 text-[40px] font-semibold leading-[1] text-bone-50 sm:text-[56px]">{item.name}</h1>
          <p className="mt-3 text-[14px] text-bone-300">{provenanceLine(item)}</p>
          <p className="font-display mt-5 max-w-[52ch] text-[19px] italic leading-snug text-bone-200">{item.blurb}</p>

          {pull && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-bone-100/[0.08] py-4">
              <p className="text-[13px] text-bone-300">
                <span className={pull.self ? 'font-semibold text-brass-300' : 'font-semibold text-bone-100'}>{pull.self ? 'You' : pull.name}</span> pulled this from{' '}
                <span className="text-bone-100">{VISIBLE_CHESTS.find((c) => c.id === pull.chestId)?.name ?? 'a chest'}</span>, {timeAgo(pull.at)}
                <span className="ml-2 text-bone-400">Simulated</span>
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[12px] text-bone-400">{isNew ? 'Retail price, new' : 'Estimated value'}</p>
              <p className="mt-1 text-[34px] font-semibold leading-none text-bone-50 tabular">{money(item.value)}</p>
              {isNew && item.priceSource && (
                <a href={item.priceSource} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-bone-300 underline decoration-bone-100/25 underline-offset-2 hover:text-bone-100">
                  {sourceHost(item.priceSource)}, read {RETAIL_CHECKED}
                  <ArrowUpRight size={12} weight="light" aria-hidden />
                </a>
              )}
              {!isNew && <p className="mt-2 text-[12px] text-bone-400">Sample valuation. No live appraisal.</p>}
            </div>
            {watchChest && (
              <Button variant="secondary" size="lg" icon={<Play size={16} weight="light" />} onClick={watch} data-testid="watch-pull">
                {pull ? 'Watch this pull' : 'Watch an opening'}
              </Button>
            )}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-bone-100/[0.08] pt-6">
            {specs.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[12px] text-bone-400">{label}</dt>
                <dd className="mt-1 text-[14px] text-bone-100">{value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>

      {homes.length > 0 && (
        <section className="mt-20" aria-labelledby="homes-title">
          <p className="eyebrow">Where to find it</p>
          <h2 id="homes-title" className="font-display mt-2 text-[32px] font-semibold leading-tight text-bone-50 sm:text-[40px]">
            {homes.length === 1 ? 'One chest holds it' : `${homes.length} chests hold it`}
          </h2>
          <ul className="mt-6 divide-y divide-bone-100/[0.07] border-y border-bone-100/[0.08]">
            {homes.map(({ chest, rarity: r, each }) => (
              <li key={chest.id}>
                <Link to={`/chests/${chest.id}`} className="group grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-5 py-4" style={{ '--glow': chest.theme.glow } as CSSProperties}>
                  <ChestArt chest={chest} className="h-[60px] w-full transition-transform duration-500 group-hover:-translate-y-0.5" />
                  <div className="min-w-0">
                    <p className="font-display truncate text-[22px] font-semibold text-bone-50">{chest.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-bone-400">
                      <RarityTag rarity={r} size="xs" />
                      <span className="tabular">This piece {oneIn(each)}</span>
                      {chest.limited && <Tag tone="ember">Limited</Tag>}
                    </p>
                  </div>
                  <span className="flex items-center gap-3 text-right">
                    <span className="text-[18px] font-semibold text-bone-50 tabular">{money(chest.price)}</span>
                    <ArrowRight size={16} weight="light" className="text-brass-300 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
