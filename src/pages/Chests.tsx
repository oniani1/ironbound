import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { VISIBLE_CHESTS } from '../config/chests'
import { ITEMS } from '../data/items'
import { chanceToBeatPrice, chestPool, expectedValue } from '../lib/gacha'
import { money, pct } from '../lib/format'
import type { Chest } from '../types'
import { ChestArt } from '../components/chest/ChestArt'
import { OddsBar } from '../components/chest/OddsBar'
import { ItemImg } from '../components/ui/ItemImg'
import { Tag } from '../components/ui/RarityTag'
import { buttonClass } from '../components/ui/Button'
import { NotablePulls } from '../components/social/NotablePulls'

function topItems(chest: Chest, n: number) {
  return chestPool(chest, ITEMS)
    .flatMap((g) => g.items)
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
}

const ease = [0.16, 1, 0.3, 1] as const

export default function Chests() {
  const limited = VISIBLE_CHESTS.find((c) => c.limited)
  const core = VISIBLE_CHESTS.filter((c) => !c.limited)
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 md:pb-24">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="max-w-[760px]">
        <p className="eyebrow">The armory</p>
        <h1 className="font-display mt-3 text-[44px] font-semibold leading-[0.95] text-bone-50 sm:text-[72px]">Choose your chest</h1>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-bone-300 sm:text-[16px]">
          Every chest holds one real piece of arms or armor. <span className="hidden sm:inline">The odds, the expected value and the instant sell-back rate are printed on each.</span>
          <span className="sm:hidden">Odds and sell-back are printed on each.</span>
        </p>
      </motion.header>

      {/* Phones see the everyday chests first; the event follows. Desktop leads with the event. */}
      <div className="flex flex-col">
        {limited && (
          <div className="order-2 md:order-1">
            <LimitedFeature chest={limited} />
          </div>
        )}
        <div className="order-1 mt-8 border-y border-bone-100/[0.08] md:order-2 md:mt-14 lg:grid lg:grid-cols-4">
          {core.map((c, i) => (
            <ChestColumn key={c.id} chest={c} index={i} />
          ))}
        </div>
      </div>

      <NotablePulls className="mt-20 sm:mt-28" limit={6} />
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[13px] font-medium text-bone-400">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold text-bone-100 tabular">{value}</dd>
    </div>
  )
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="truncate text-bone-400">{label}</dt>
      <dd className="shrink-0 font-semibold text-bone-100 tabular">{value}</dd>
    </div>
  )
}

/** One chest in the ledger: a column on desktop, a row on phones. The whole column is the link. */
function ChestColumn({ chest, index }: { chest: Chest; index: number }) {
  const reduced = useReducedMotion()
  const ev = expectedValue(chest, ITEMS)
  const beat = chanceToBeatPrice(chest, ITEMS)
  const best = topItems(chest, 3)
  // Richer chests stand a little larger, so the ledger climbs left to right.
  const scale = [0.86, 0.92, 0.97, 1.03][index] ?? 1
  return (
    <motion.article
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: reduced ? 0 : 0.1 + index * 0.08, ease }}
      className="group relative border-bone-100/[0.08] py-6 [&:not(:first-child)]:border-t lg:flex lg:flex-col lg:px-6 lg:py-8 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-t-0 lg:first:pl-0 lg:last:pr-0"
      style={{ '--glow': chest.theme.glow } as CSSProperties}
    >
      <Link
        to={`/chests/${chest.id}`}
        data-testid={`chest-card-${chest.id}`}
        aria-label={`View ${chest.name}, ${money(chest.price)}`}
        className="absolute inset-0 z-10"
        style={{ outlineOffset: -3 }}
      />
      {/* The chest's own light comes up under it on hover. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: 'radial-gradient(60% 50% at 50% 38%, color-mix(in oklch, var(--glow) 13%, transparent), transparent 75%)' }}
        aria-hidden
      />

      {/* Phones: a row with the chest beside its name and price. */}
      <div className="pointer-events-none relative lg:hidden">
        <div className="grid grid-cols-[112px_1fr] items-center gap-4">
          <ChestArt chest={chest} className="h-[92px] w-full" />
          <div className="min-w-0">
            <p className="caps truncate text-bone-400">{chest.epithet}</p>
            <h2 className="font-display mt-1 truncate text-[26px] font-semibold leading-tight text-bone-50">{chest.name}</h2>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="ib-money text-[26px] text-bone-50">{money(chest.price)}</span>
              <span className="text-[12px] text-bone-400">Sell back {Math.round(chest.buyback * 100)}%</span>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <OddsBar chest={chest} height={4} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <Figure label="Expected value" value={money(ev)} />
          <Figure label="Sell-back" value={money(ev * chest.buyback)} />
          <Figure label="Beats price" value={pct(beat, 0)} />
        </dl>
        <p className="caps mt-4 flex items-center justify-between text-brass-300">
          View chest
          <ArrowRight size={16} weight="light" aria-hidden />
        </p>
      </div>

      {/* Desktop: a ledger column. */}
      <div className="pointer-events-none relative hidden flex-1 flex-col lg:flex">
        <div className="flex items-baseline justify-between gap-3">
          <p className="caps truncate text-bone-400">{chest.epithet}</p>
          <p className="shrink-0 text-[12px] text-bone-400">
            Sell back <span className="text-bone-200 tabular">{Math.round(chest.buyback * 100)}%</span>
          </p>
        </div>
        <div className="relative mx-auto mt-6 h-[176px] w-full" style={{ transform: `scale(${scale})`, transformOrigin: '50% 100%' }}>
          <ChestArt chest={chest} className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5" />
        </div>
        <h2 className="font-display mt-6 text-[32px] font-semibold leading-[1.05] text-bone-50">{chest.name}</h2>
        <p className="mt-2 line-clamp-2 min-h-[2.9em] text-[13px] leading-relaxed text-bone-300">{chest.tagline}</p>
        <div className="mt-5">
          <OddsBar chest={chest} height={4} />
        </div>
        <dl className="mt-4 divide-y divide-bone-100/[0.06] text-[13px]">
          <LedgerRow label="Expected value" value={money(ev)} />
          <LedgerRow label="Expected sell-back" value={money(ev * chest.buyback)} />
          <LedgerRow label="Beats the price" value={pct(beat, 0)} />
        </dl>
        <div className="mt-5 flex items-center gap-1.5">
          {best.map((it) => (
            <span key={it.id} className="vitrine block h-11 w-11 shrink-0 rounded-[2px]" title={`${it.name} · ${money(it.value)}`}>
              <ItemImg item={it} className="h-full w-full p-1" />
            </span>
          ))}
          <p className="ml-2 text-[12px] leading-tight text-bone-400">
            Top pull
            <br />
            <span className="font-semibold text-bone-100 tabular">{best[0] ? money(best[0].value, { compact: true }) : 'None yet'}</span>
          </p>
        </div>
        <div className="mt-auto pt-7">
          <div className="flex items-end justify-between gap-3 border-t border-bone-100/[0.08] pt-5">
            <span className="ib-money text-[36px] leading-none text-bone-50">{money(chest.price)}</span>
            <span className="caps flex items-center gap-2 pb-0.5 text-brass-300">
              View
              <ArrowRight size={16} weight="light" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

/** The limited event: the chest in its own ember light, the stock count, one gilt action. */
function LimitedFeature({ chest }: { chest: Chest }) {
  const reduced = useReducedMotion()
  const lim = chest.limited!
  const ev = expectedValue(chest, ITEMS)
  const best = topItems(chest, 4)
  const sold = lim.total - lim.remaining
  return (
    <motion.section
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.05, ease }}
      className="ib-ledger group mt-10 overflow-hidden md:mt-12"
      aria-label={`${chest.name}, limited event`}
    >
      <Link
        to={`/chests/${chest.id}`}
        data-testid={`chest-card-${chest.id}`}
        aria-label={`View ${chest.name}, ${money(chest.price)}`}
        className="absolute inset-0 z-10"
        style={{ outlineOffset: -3 }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_22%_60%,oklch(30%_0.08_38/.55),transparent_70%)]" aria-hidden />
      <div className="pointer-events-none relative grid gap-6 p-6 sm:p-10 md:grid-cols-[minmax(260px,420px)_1fr] md:gap-12">
        <ChestArt chest={chest} glow={1.6} className="mx-auto h-[160px] w-full max-w-[400px] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5 sm:h-[250px]" />
        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Tag tone="ember">Limited event</Tag>
            <span className="caps text-bone-300">Ends in {lim.endsInHours}h</span>
            <Tag>Demo stock</Tag>
          </div>
          <h2 className="font-display mt-4 text-[38px] font-semibold leading-[0.98] text-bone-50 sm:text-[56px]">{chest.name}</h2>
          <p className="mt-3 max-w-[52ch] text-[15px] text-bone-300">{chest.tagline}</p>
          <div className="mt-6 max-w-[480px]">
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-bone-300">
                <b className="text-[15px] font-semibold text-bone-50 tabular">{lim.remaining}</b> of {lim.total} left
              </span>
              <span className="text-bone-400 tabular">{Math.round((sold / lim.total) * 100)}% claimed</span>
            </div>
            <div className="mt-2 h-[2px] bg-bone-100/[0.1]">
              <motion.div className="h-full bg-ember-400" initial={{ width: reduced ? `${(sold / lim.total) * 100}%` : 0 }} animate={{ width: `${(sold / lim.total) * 100}%` }} transition={{ duration: 1.2, delay: 0.4, ease }} />
            </div>
          </div>
          <div className="mt-5 max-w-[480px]">
            <OddsBar chest={chest} height={4} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-1.5">
              {best.map((it) => (
                <span key={it.id} className="vitrine block h-11 w-11 rounded-[2px]" style={{ '--light': 'var(--color-ember-400)' } as CSSProperties} title={it.name}>
                  <ItemImg item={it} className="h-full w-full p-1" />
                </span>
              ))}
            </div>
            <dl className="flex gap-8">
              <Figure label="Expected value" value={money(ev)} />
              <Figure label="Top pull" value={best[0] ? money(best[0].value, { compact: true }) : 'None yet'} />
            </dl>
            <span className={`${buttonClass('primary', 'lg')} ml-auto group-hover:bg-brass-400`}>
              View chest
              <span className="ml-3 text-[16px] tracking-normal tabular">{money(chest.price)}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
