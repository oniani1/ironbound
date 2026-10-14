import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { VISIBLE_CHESTS } from '../config/chests'
import { ITEMS } from '../data/items'
import { chanceToBeatPrice, chestPool, expectedValue } from '../lib/gacha'
import { money, pct } from '../lib/format'
import type { Chest } from '../types'
import { ChestArt } from '../components/chest/ChestArt'
import { OddsBar } from '../components/chest/OddsBar'
import { RARITIES } from '../config/rarity'
import { ItemImg } from '../components/ui/ItemImg'

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
    <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-10 sm:px-6 md:pb-20">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="max-w-[720px]">
        <p className="eyebrow">The armory</p>
        <h1 className="font-display mt-2 text-[44px] font-semibold leading-[0.98] text-bone-50 sm:text-[64px]">Choose your chest</h1>
        <p className="mt-4 max-w-[58ch] text-[15px] text-bone-300">
          Every chest holds one real piece of arms or armor. The odds, the expected value and the instant sell-back rate are printed on each one.
        </p>
      </motion.header>

      {limited && <LimitedBanner chest={limited} />}

      {/* Core chests rise in height with their price, like steps up to the throne. */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        {core.map((c, i) => (
          <ChestCard key={c.id} chest={c} index={i} />
        ))}
      </div>
    </div>
  )
}

function ChestCard({ chest, index }: { chest: Chest; index: number }) {
  const ev = expectedValue(chest, ITEMS)
  const beat = chanceToBeatPrice(chest, ITEMS)
  const best = topItems(chest, 3)
  const lift = [0, 28, 56, 84][index] ?? 0
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 + index * 0.08, ease }}>
      <Link
        to={`/chests/${chest.id}`}
        data-testid={`chest-card-${chest.id}`}
        className="plate group relative flex flex-col overflow-hidden rounded-[22px] p-5 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:border-brass-500/35"
        style={{ minHeight: `calc(420px + ${lift}px)` }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(70% 45% at 50% 32%, color-mix(in oklch, ${chest.theme.glow} 16%, transparent), transparent)` }} />
        <div className="flex items-start justify-between">
          <p className="eyebrow">{chest.epithet}</p>
          <p className="text-[12px] text-bone-400">
            Sell back <span className="text-bone-200">{Math.round(chest.buyback * 100)}%</span>
          </p>
        </div>
        <ChestArt chest={chest} className="mx-auto mt-2 h-[170px] w-full transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.04]" />
        <div className="mt-auto">
          <h2 className="font-display text-[30px] font-semibold leading-tight text-bone-50">{chest.name}</h2>
          <p className="mt-1 line-clamp-2 text-[13px] text-bone-300">{chest.tagline}</p>
          <div className="mt-4">
            <OddsBar chest={chest} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <dt className="text-bone-400">Expected value</dt>
              <dd className="mt-0.5 font-semibold text-bone-100 tabular">
                {money(ev)} <span className="font-normal text-bone-400">({pct(ev / chest.price, 0)})</span>
              </dd>
            </div>
            <div>
              <dt className="text-bone-400">Beats the price</dt>
              <dd className="mt-0.5 font-semibold text-bone-100 tabular">{pct(beat, 0)} of pulls</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center gap-2">
            {best.map((it) => (
              <div key={it.id} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-950/60" title={`${it.name} · ${money(it.value)}`}>
                <ItemImg item={it} className="h-full w-full p-1" />
              </div>
            ))}
            <p className="ml-1 text-[12px] leading-tight text-bone-400">
              Top pull
              <br />
              <span className="font-semibold text-bone-100 tabular">{best[0] ? money(best[0].value, { compact: true }) : '—'}</span>
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-[14px] bg-[linear-gradient(180deg,var(--color-brass-300),var(--color-brass-500)_55%,var(--color-brass-600))] px-4 py-3 text-ink-950 shadow-[inset_0_1px_0_oklch(98%_0.04_90/.7),inset_0_-2px_0_oklch(40%_0.08_60/.55)] transition-[filter] group-hover:brightness-110">
            <span className="text-[14px] font-semibold">Open</span>
            <span className="text-[18px] font-bold tabular">{money(chest.price)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function LimitedBanner({ chest }: { chest: Chest }) {
  const lim = chest.limited!
  const ev = expectedValue(chest, ITEMS)
  const best = topItems(chest, 4)
  const sold = lim.total - lim.remaining
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease }} className="mt-10">
      <Link
        to={`/chests/${chest.id}`}
        data-testid={`chest-card-${chest.id}`}
        className="group relative grid overflow-hidden rounded-[26px] border border-[#ff6a3d]/25 bg-[radial-gradient(90%_120%_at_15%_50%,oklch(28%_0.09_35),oklch(13%_0.015_40)_70%)] p-5 sm:grid-cols-[minmax(240px,380px)_1fr] sm:gap-8 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ff6a3d]/10 blur-3xl" />
        <ChestArt chest={chest} glow={1.6} className="mx-auto h-[200px] w-full max-w-[380px] transition-transform duration-500 group-hover:-translate-y-2 sm:h-[240px]" />
        <div className="relative mt-4 flex flex-col justify-center sm:mt-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ff6a3d]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff9a73]">Limited event</span>
            <span className="text-[12px] text-bone-300">Ends in {lim.endsInHours}h</span>
          </div>
          <h2 className="font-display mt-3 text-[36px] font-semibold leading-[1] text-bone-50 sm:text-[48px]">{chest.name}</h2>
          <p className="mt-2 max-w-[52ch] text-[14px] text-bone-300">{chest.tagline}</p>
          <div className="mt-5 max-w-[460px]">
            <div className="flex justify-between text-[12px]">
              <span className="text-bone-300">
                <b className="font-semibold text-bone-50 tabular">{lim.remaining}</b> of {lim.total} boxes left
              </span>
              <span className="text-bone-400 tabular">{Math.round((sold / lim.total) * 100)}% claimed</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800">
              <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#ff6a3d,#ffc27a)]" initial={{ width: 0 }} animate={{ width: `${(sold / lim.total) * 100}%` }} transition={{ duration: 1.2, delay: 0.4, ease }} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex -space-x-2">
              {best.map((it) => (
                <div key={it.id} className="h-12 w-12 overflow-hidden rounded-full border border-bone-100/15 bg-ink-950" title={it.name}>
                  <ItemImg item={it} className="h-full w-full p-1" />
                </div>
              ))}
            </div>
            <p className="text-[13px] text-bone-300">
              Expected value <b className="text-bone-50 tabular">{money(ev)}</b> · Top pull <b style={{ color: RARITIES.relic.cssVar }} className="tabular">{best[0] ? money(best[0].value, { compact: true }) : '—'}</b>
            </p>
            <span className="ml-auto rounded-[14px] bg-[linear-gradient(180deg,#ffb48e,#ff6a3d)] px-5 py-3 text-[15px] font-bold text-ink-950 shadow-[inset_0_1px_0_#ffd9c4,inset_0_-2px_0_#9a3416] transition-[filter] group-hover:brightness-110 tabular">
              Open · {money(chest.price)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
