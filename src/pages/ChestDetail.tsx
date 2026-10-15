import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { CHEST_BY_ID } from '../config/chests'
import { RARITIES } from '../config/rarity'
import { ITEMS, ITEM_BY_ID } from '../data/items'
import { chanceToBeatPrice, chestPool, expectedValue } from '../lib/gacha'
import { money, oneIn, pct, timeAgo } from '../lib/format'
import { actions, useStore } from '../lib/store'
import { useFeed } from '../lib/feed'
import { ChestScene } from '../components/chest3d/ChestScene'
import { ChestAnim } from '../components/chest3d/animState'
import { OddsBar } from '../components/chest/OddsBar'
import { Button } from '../components/ui/Button'
import { RarityTag, Tag } from '../components/ui/RarityTag'
import { Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { ItemVitrine } from '../components/ui/Vitrine'
import { useOpening } from '../components/opening/OpeningProvider'
import { useOnboarding } from '../components/onboarding/OnboardingContext'
import { ItemImg } from '../components/ui/ItemImg'

const ease = [0.16, 1, 0.3, 1] as const
const QTY = [1, 3, 5] as const

export default function ChestDetail() {
  const { id = '' } = useParams()
  const chest = CHEST_BY_ID[id]
  const anim = useMemo(() => new ChestAnim(), [])
  const [qty, setQty] = useState<(typeof QTY)[number]>(1)
  const [short, setShort] = useState(false)
  const balance = useStore((s) => s.balance)
  const signedIn = useStore((s) => s.signedIn)
  const hasTrialPull = useStore((s) => s.pulls.some((p) => p.chestId === 'trial'))
  const fast = useStore((s) => s.settings.fast)
  const feed = useFeed()
  const reduced = useReducedMotion()
  // An opening draws its own scene over the page; this chest holds its last frame meanwhile.
  const { open, active: opening } = useOpening()
  const { start } = useOnboarding()

  if (!chest || chest.hidden) return <Navigate to="/chests" replace />

  const pool = chestPool(chest, ITEMS)
  const ev = expectedValue(chest, ITEMS)
  const beat = chanceToBeatPrice(chest, ITEMS)
  const total = chest.price * qty
  const recent = feed.filter((f) => f.chestId === chest.id).slice(0, 8)
  const lim = chest.limited

  const onOpen = () => {
    if (!signedIn) return start()
    const res = open(chest.id, qty)
    setShort(!res.ok && res.reason === 'funds')
  }
  const topUp = () => {
    actions.addFunds(1000)
    setShort(false)
  }
  const pick = (q: (typeof QTY)[number]) => {
    setQty(q)
    setShort(false)
  }

  return (
    <div className="pb-44 md:pb-24">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:gap-14">
        {/* Live chest. */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="relative -mx-4 h-[260px] overflow-hidden sm:mx-0 sm:h-[460px] lg:h-[620px]">
          <ChestScene theme={chest.theme} anim={anim} parallax distance={0.82} frameloop={opening ? 'never' : 'always'} className="!absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_110px_80px_var(--color-ink-950)]" />
          <Link
            to="/chests"
            className="caps absolute left-4 top-3 flex min-h-11 items-center gap-2 text-bone-300 transition-colors [text-shadow:0_1px_8px_oklch(0%_0_0/.9)] hover:text-bone-50 sm:left-2"
          >
            <ArrowLeft size={15} weight="light" aria-hidden />
            All chests
          </Link>
          {lim && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-2 sm:right-auto sm:w-[300px]">
              <div className="flex items-baseline justify-between gap-3">
                <Tag tone="ember">Limited · {lim.endsInHours}h left</Tag>
                <span className="text-[12px] text-bone-300 tabular">
                  {lim.remaining} of {lim.total} left
                </span>
              </div>
              <div className="mt-2 h-[2px] bg-bone-100/[0.12]">
                <div className="h-full bg-ember-400" style={{ width: `${((lim.total - lim.remaining) / lim.total) * 100}%` }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Purchase column. */}
        <motion.div initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }} className="flex flex-col justify-center">
          <h1 className="font-display text-[46px] font-semibold leading-[0.95] text-bone-50 sm:text-[64px]">{chest.name}</h1>
          {/* The epithet sits under the name in the italic serif, where an epithet belongs. */}
          <p className="font-display mt-3 text-[20px] italic leading-snug text-bone-200">{chest.epithet}.</p>
          <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-bone-300">{chest.tagline}</p>

          <div className="mt-8">
            <OddsBar chest={chest} height={6} defaultExpanded />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-bone-100/[0.08] py-5 sm:grid-cols-4">
            {[
              ['Expected value', money(ev)],
              ['Expected sell-back', money(ev * chest.buyback)],
              ['Beats the price', pct(beat, 0)],
              ['Instant sell-back', `${Math.round(chest.buyback * 100)}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] text-bone-400">{label}</dt>
                <dd className="ib-money mt-1.5 text-[26px] leading-none text-bone-50">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 hidden md:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="caps text-bone-400">Chests</span>
                <Segmented options={QTY} value={qty} onChange={pick} label="How many chests" render={(q) => `×${q}`} />
              </div>
              <Switch checked={fast} onChange={(v) => actions.setFast(v)}>
                Fast opening
              </Switch>
            </div>
            <Button size="lg" className="mt-4 w-full !h-16" onClick={onOpen} data-testid="open-chest">
              {signedIn ? (
                <span className="flex w-full items-center justify-between">
                  <span>{qty > 1 ? `Open ${qty} chests` : 'Open chest'}</span>
                  <span className="text-[20px] font-semibold tracking-normal tabular">{money(total)}</span>
                </span>
              ) : hasTrialPull ? (
                'Claim demo credit'
              ) : (
                'Open a free chest'
              )}
            </Button>
            <div className="mt-3 flex items-center justify-between text-[12px] text-bone-400">
              {signedIn ? (
                <span>
                  Purse <span className="text-bone-200 tabular">{money(balance, { cents: !Number.isInteger(balance) })}</span>
                </span>
              ) : (
                <span>No sign-up needed to try it.</span>
              )}
              <span>Inventory and insurance are simulated.</span>
            </div>
            {short && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center justify-between gap-4 border-y border-ember-500/25 py-3 text-[13px]">
                <span className="text-bone-100">Your purse is {money(total - balance)} short.</span>
                <Button size="sm" variant="secondary" onClick={topUp}>
                  Add $1,000 demo credit
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Phones: the purchase stays within thumb reach above the tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-bone-100/[0.08] bg-ink-950 px-3 py-2.5 md:hidden">
        {short && (
          <div className="mb-2 flex items-center justify-between px-1 py-1 text-[12px]">
            <span className="text-bone-100">Purse is {money(total - balance)} short.</span>
            <button className="caps min-h-9 text-brass-300" onClick={topUp}>
              Add $1,000
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Segmented options={QTY} value={qty} onChange={pick} label="How many chests" render={(q) => `×${q}`} size="lg" />
          <Button size="lg" className="flex-1 !h-[50px]" onClick={onOpen} data-testid="open-chest-mobile">
            {signedIn ? (
              <span className="flex w-full items-center justify-between">
                <span>Open</span>
                <span className="text-[16px] font-semibold tracking-normal tabular">{money(total)}</span>
              </span>
            ) : hasTrialPull ? (
              'Claim demo credit'
            ) : (
              'Open a free chest'
            )}
          </Button>
        </div>
      </div>

      {/* Odds and pool. */}
      <section className="mx-auto mt-20 max-w-[1400px] px-4 sm:mt-28 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">What is inside</p>
            <h2 className="font-display mt-2 text-[36px] font-semibold leading-tight text-bone-50 sm:text-[48px]">Every item, every chance</h2>
          </div>
          <p className="max-w-[46ch] text-[13px] text-bone-400">Sample valuations · 14 Oct 2026. No live appraisal.</p>
        </div>
        <div className="mt-10 space-y-14">
          {[...pool].reverse().map(({ band, items }) => {
            if (!items.length) return null
            const each = band.odds / items.length
            return (
              <div key={band.rarity}>
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-bone-100/[0.08] pb-3">
                  <RarityTag rarity={band.rarity} size="md" />
                  <span className="text-[13px] text-bone-300">
                    <b className="font-semibold text-bone-100 tabular">{pct(band.odds)}</b> chance · {money(band.min)} to {money(band.max, { compact: true })}
                  </span>
                  <span className="text-[12px] text-bone-400 sm:ml-auto">Each item {oneIn(each)}</span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
                  {items.map((it, i) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.5, delay: reduced ? 0 : (i % 6) * 0.04, ease }}
                    >
                      <ItemVitrine item={it} rarity={band.rarity} showRarity={false} to={`/item/${it.id}`} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* How the draw works: a ledger, not a box. */}
      <section className="mx-auto mt-24 max-w-[1400px] px-4 sm:px-6">
        <div className="grid gap-8 border-t border-bone-100/[0.08] pt-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <p className="eyebrow">Fair by construction</p>
            <h2 className="font-display mt-2 text-[32px] font-semibold leading-tight text-bone-50 sm:text-[38px]">How every draw is made</h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              'The odds above are fixed before you open. They never change with your history or your balance.',
              'Demo draws use browser randomness. No on-chain proof.',
              'Inventory and insurance are simulated.',
            ].map((line, i) => (
              <li key={line} className="border-t border-bone-100/[0.08] pt-4 text-[14px] leading-relaxed text-bone-300">
                <span className="font-display text-[24px] leading-none text-brass-300">{['I', 'II', 'III'][i]}.</span>
                <p className="mt-2">{line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="mx-auto mt-24 max-w-[1400px] px-4 sm:px-6">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Recent pulls from this chest</p>
            <p className="caps text-bone-400">Simulated</p>
          </div>
          <ul className="mt-4 divide-y divide-bone-100/[0.06] border-y border-bone-100/[0.08]">
            {recent.map((f) => {
              const it = ITEM_BY_ID[f.itemId]
              if (!it) return null
              return (
                <li key={f.id} className="relative flex items-center gap-4 py-3 text-[13px] transition-colors hover:bg-bone-100/[0.02]">
                  <Link to={`/item/${it.id}`} state={{ pull: f }} aria-label={`${it.name}, pulled by ${f.self ? 'you' : f.name}`} className="absolute inset-0" />
                  <span className="vitrine block h-10 w-10 shrink-0 rounded-[2px]" style={{ ['--light' as string]: RARITIES[f.rarity].cssVar }}>
                    <ItemImg item={it} className="h-full w-full p-1" />
                  </span>
                  <span className={`w-28 shrink-0 truncate ${f.self ? 'font-semibold text-brass-300' : 'text-bone-200'}`}>{f.self ? 'You' : f.name}</span>
                  <span className="font-display min-w-0 flex-1 truncate text-[16px] text-bone-50">{it.name}</span>
                  <RarityTag rarity={f.rarity} size="xs" className="hidden sm:inline-flex" />
                  <span className="w-20 text-right font-semibold text-bone-100 tabular">{money(it.value, { compact: true })}</span>
                  <span className="hidden w-16 text-right text-bone-400 tabular sm:block">{timeAgo(f.at)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
