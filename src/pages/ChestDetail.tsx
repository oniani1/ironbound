import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { CHEST_BY_ID } from '../config/chests'
import { RARITIES } from '../config/rarity'
import { ITEMS, ITEM_BY_ID } from '../data/items'
import { chanceToBeatPrice, chestPool, expectedValue } from '../lib/gacha'
import { money, oneIn, pct, shortEra, timeAgo } from '../lib/format'
import { actions, useStore } from '../lib/store'
import { useFeed } from '../lib/feed'
import { sfx } from '../lib/audio'
import { ChestScene } from '../components/chest3d/ChestScene'
import { ChestAnim } from '../components/chest3d/animState'
import { OddsBar } from '../components/chest/OddsBar'
import { Button } from '../components/ui/Button'
import { RarityTag } from '../components/ui/RarityTag'
import { useOpening } from '../components/opening/OpeningProvider'
import { useOnboarding } from '../components/onboarding/OnboardingContext'
import { ItemImg } from '../components/ui/ItemImg'

const ease = [0.16, 1, 0.3, 1] as const
const QTY = [1, 3, 5]

export default function ChestDetail() {
  const { id = '' } = useParams()
  const chest = CHEST_BY_ID[id]
  const anim = useMemo(() => new ChestAnim(), [])
  const [qty, setQty] = useState(1)
  const [short, setShort] = useState(false)
  const balance = useStore((s) => s.balance)
  const signedIn = useStore((s) => s.signedIn)
  const fast = useStore((s) => s.settings.fast)
  const feed = useFeed()
  const { open } = useOpening()
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

  return (
    <div className="pb-44 md:pb-20">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:gap-12">
        {/* Live chest. */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="relative -mx-4 h-[250px] overflow-hidden sm:mx-0 sm:h-[460px] sm:rounded-[28px] lg:h-[620px]">
          <ChestScene theme={chest.theme} anim={anim} parallax distance={0.82} className="!absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_40px_var(--color-ink-950)] sm:rounded-[28px]" />
          <Link to="/chests" className="absolute left-4 top-4 rounded-full bg-ink-950/60 px-3 py-1.5 text-[12px] text-bone-300 backdrop-blur hover:text-bone-50">
            ← All chests
          </Link>
          {lim && (
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-ink-950/70 p-3 backdrop-blur sm:left-6 sm:right-auto sm:w-[320px]">
              <div className="flex justify-between text-[12px]">
                <span className="font-semibold text-[#ff9a73]">Limited · ends in {lim.endsInHours}h · demo stock</span>
                <span className="text-bone-300 tabular">
                  {lim.remaining}/{lim.total} left
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff6a3d,#ffc27a)]" style={{ width: `${((lim.total - lim.remaining) / lim.total) * 100}%` }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Purchase column. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }} className="flex flex-col justify-center">
          <p className="eyebrow">{chest.epithet}</p>
          <h1 className="font-display mt-2 text-[44px] font-semibold leading-[0.98] text-bone-50 sm:text-[60px]">{chest.name}</h1>
          <p className="mt-3 max-w-[48ch] text-[15px] text-bone-300">{chest.tagline}</p>

          <div className="mt-7">
            <OddsBar chest={chest} height={10} labels />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-bone-100/[0.08] py-4 text-[12px] sm:grid-cols-4">
            <div>
              <dt className="text-bone-400">Expected item value</dt>
              <dd className="mt-1 text-[18px] font-semibold text-bone-50 tabular">{money(ev)}</dd>
            </div>
            <div>
              <dt className="text-bone-400">Expected as cash</dt>
              <dd className="mt-1 text-[18px] font-semibold text-bone-50 tabular">{money(ev * chest.buyback)}</dd>
            </div>
            <div>
              <dt className="text-bone-400">Beats the price</dt>
              <dd className="mt-1 text-[18px] font-semibold text-bone-50 tabular">{pct(beat, 0)}</dd>
            </div>
            <div>
              <dt className="text-bone-400">Instant sell-back</dt>
              <dd className="mt-1 text-[18px] font-semibold text-bone-50 tabular">{Math.round(chest.buyback * 100)}%</dd>
            </div>
          </dl>

          <div className="mt-6 hidden md:block">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-[12px] bg-ink-900 p-1" role="radiogroup" aria-label="How many chests">
                {QTY.map((q) => (
                  <button
                    key={q}
                    role="radio"
                    aria-checked={qty === q}
                    onClick={() => {
                      sfx.click()
                      setQty(q)
                      setShort(false)
                    }}
                    className={`h-9 min-w-[52px] rounded-[9px] px-3 text-[14px] font-semibold transition-colors ${qty === q ? 'bg-bone-100 text-ink-950' : 'text-bone-300 hover:text-bone-50'}`}
                  >
                    ×{q}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-bone-300">
                <input type="checkbox" checked={fast} onChange={(e) => actions.setFast(e.target.checked)} className="accent-[var(--color-brass-500)]" />
                Fast opening
              </label>
            </div>
            <Button size="lg" className="mt-4 w-full !h-16 !text-[17px]" onClick={onOpen} data-testid="open-chest">
              {signedIn ? (
                <span className="flex w-full items-center justify-between">
                  <span>{qty > 1 ? `Open ${qty} chests` : 'Open chest'}</span>
                  <span className="text-[20px] font-bold tabular">{money(total)}</span>
                </span>
              ) : (
                'Open a free chest first'
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
              <span>Items are vaulted and insured the moment you pull them.</span>
            </div>
            {short && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center justify-between rounded-xl border border-ember-500/30 bg-ember-500/10 px-4 py-3 text-[13px]">
                <span className="text-bone-100">Your purse is {money(total - balance)} short.</span>
                <Button size="sm" variant="secondary" onClick={() => { actions.addFunds(1000); setShort(false); sfx.coins(8) }}>
                  Add $1,000 demo credit
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Phones: the purchase stays within thumb reach above the tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-bone-100/[0.08] bg-ink-950/95 px-3 py-2.5 backdrop-blur-md md:hidden">
        {short && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-ember-500/10 px-3 py-2 text-[12px]">
            <span className="text-bone-100">Purse is {money(total - balance)} short.</span>
            <button className="font-semibold text-brass-300" onClick={() => { actions.addFunds(1000); setShort(false); sfx.coins(8) }}>
              Add $1,000
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex rounded-[12px] bg-ink-900 p-1" role="radiogroup" aria-label="How many chests">
            {QTY.map((q) => (
              <button
                key={q}
                role="radio"
                aria-checked={qty === q}
                onClick={() => {
                  sfx.click()
                  setQty(q)
                  setShort(false)
                }}
                className={`h-11 w-11 rounded-[9px] text-[14px] font-semibold transition-colors ${qty === q ? 'bg-bone-100 text-ink-950' : 'text-bone-300'}`}
              >
                ×{q}
              </button>
            ))}
          </div>
          <Button size="lg" className="flex-1 !h-[52px]" onClick={onOpen} data-testid="open-chest-mobile">
            {signedIn ? (
              <span className="flex w-full items-center justify-between">
                <span>Open</span>
                <span className="text-[17px] font-bold tabular">{money(total)}</span>
              </span>
            ) : (
              'Open a free chest'
            )}
          </Button>
        </div>
      </div>

      {/* Odds and pool. */}
      <section className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">What is inside</p>
            <h2 className="font-display mt-1 text-[34px] font-semibold text-bone-50 sm:text-[42px]">Every item, every chance</h2>
          </div>
          <p className="max-w-[46ch] text-[13px] text-bone-400">
            Values come from recent auction results and maker list prices for the same type and condition. Valued {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <div className="mt-8 space-y-10">
          {[...pool].reverse().map(({ band, items }) => {
            if (!items.length) return null
            const r = RARITIES[band.rarity]
            const each = band.odds / items.length
            return (
              <div key={band.rarity}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-bone-100/[0.08] pb-3">
                  <RarityTag rarity={band.rarity} size="md" />
                  <span className="text-[13px] text-bone-300">
                    <b className="text-bone-100 tabular">{pct(band.odds)}</b> chance · {money(band.min)} to {money(band.max, { compact: true })}
                  </span>
                  <span className="text-[12px] text-bone-400">Each item {oneIn(each)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {items.map((it) => (
                    <div key={it.id} className="group relative overflow-hidden rounded-[16px] border border-bone-100/[0.07] bg-ink-900 p-3 transition-colors hover:border-bone-100/15">
                      <div className="relative aspect-square">
                        <div className="absolute inset-x-[15%] bottom-[6%] h-[30%] rounded-[50%] blur-xl" style={{ background: r.cssVar, opacity: 0.22 + r.tier * 0.03 }} />
                        <ItemImg item={it} className="relative h-full w-full transition-transform duration-500 group-hover:scale-[1.05]" />
                      </div>
                      <p className="font-display mt-2 line-clamp-1 text-[16px] font-semibold text-bone-50">{it.name}</p>
                      <p className="flex justify-between text-[12px] text-bone-400">
                        <span className="truncate">{shortEra(it.era)}</span>
                        <span className="font-semibold text-bone-200 tabular">{money(it.value, { compact: true })}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6">
        <div className="grid gap-6 rounded-[22px] border border-bone-100/[0.07] bg-ink-900/60 p-6 sm:grid-cols-[1fr_1.4fr] sm:p-8">
          <div>
            <p className="eyebrow">Fair by construction</p>
            <h2 className="font-display mt-1 text-[30px] font-semibold leading-tight text-bone-50">How every draw is made</h2>
          </div>
          <ol className="grid gap-4 text-[14px] text-bone-300 sm:grid-cols-3">
            <li>
              <span className="font-display text-[22px] text-brass-300">I.</span>
              <p className="mt-1">The odds above are fixed before you open. They never change with your history or your balance.</p>
            </li>
            <li>
              <span className="font-display text-[22px] text-brass-300">II.</span>
              <p className="mt-1">Each draw uses verifiable randomness and leaves a receipt. In this demo the receipts are simulated.</p>
            </li>
            <li>
              <span className="font-display text-[22px] text-brass-300">III.</span>
              <p className="mt-1">The item is already in our insured vault. What you pull is the exact piece you own.</p>
            </li>
          </ol>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="mx-auto mt-16 max-w-[1400px] px-4 sm:px-6">
          <p className="eyebrow">Recent pulls from this chest</p>
          <ul className="mt-4 divide-y divide-bone-100/[0.06] rounded-[18px] border border-bone-100/[0.07] bg-ink-900/60">
            {recent.map((f) => {
              const it = ITEM_BY_ID[f.itemId]
              if (!it) return null
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <ItemImg item={it} className="h-9 w-9" />
                  <span className={f.self ? 'font-semibold text-brass-300' : 'text-bone-200'}>{f.self ? 'You' : f.name}</span>
                  <span className="min-w-0 flex-1 truncate text-bone-300">{it.name}</span>
                  <RarityTag rarity={f.rarity} size="xs" className="hidden sm:inline-flex" />
                  <span className="w-20 text-right font-semibold text-bone-100 tabular">{money(it.value, { compact: true })}</span>
                  <span className="hidden w-16 text-right text-bone-400 sm:block">{timeAgo(f.at)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
