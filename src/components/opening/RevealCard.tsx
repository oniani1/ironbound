import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Chest, Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { money, shortEra } from '../../lib/format'
import { sfx } from '../../lib/audio'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { Pips } from '../ui/RarityTag'
import { CoinBurst } from '../ui/CoinBurst'

interface Props {
  draw?: string
  item: Item
  rarity: RarityId
  chest: Chest
  sold: number | null
  onKeep: () => void
  onSell: () => void
  onShip: () => void
  onAgain: () => void
  onReplay: () => void
  canAfford: boolean
  trial?: boolean
}

const CATEGORY_LABEL: Record<Item['category'], string> = {
  sword: 'Sword',
  dagger: 'Dagger',
  polearm: 'Polearm',
  axe: 'Axe and mace',
  helmet: 'Helmet',
  shield: 'Shield',
  armor: 'Armor',
  fitting: 'Fitting',
}

export function RevealCard({ draw, item, rarity, chest, sold, onKeep, onSell, onShip, onAgain, onReplay, canAfford, trial }: Props) {
  const r = RARITIES[rarity]
  const offer = Math.round(item.value * chest.buyback)
  const delta = item.value - chest.price
  const mult = chest.price > 0 ? item.value / chest.price : 0
  const [counted, setCounted] = useState(false)
  const [coins, setCoins] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)

  const sellWithCoins = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const target = document.querySelector('[data-coin-target]')?.getBoundingClientRect()
    setCoins({
      from: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      to: target ? { x: target.left + target.width / 2, y: target.top + target.height / 2 } : { x: window.innerWidth - 60, y: 36 },
    })
    onSell()
  }

  useEffect(() => {
    const t = window.setTimeout(() => sfx.stamp(), 380)
    return () => window.clearTimeout(t)
  }, [])

  const ease = [0.16, 1, 0.3, 1] as const
  const rise = (d: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: d, ease },
  })

  return (
    <motion.aside
      data-testid="reveal-card"
      className="pointer-events-auto relative w-full overflow-hidden rounded-t-[22px] border border-bone-100/10 bg-ink-900/88 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-30px_80px_-20px_oklch(0%_0_0/.7)] backdrop-blur-md sm:rounded-[22px] sm:p-7 md:w-[440px]"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30, transition: { duration: 0.25 } }}
      transition={{ duration: 0.7, ease }}
      style={{ boxShadow: `inset 0 1px 0 color-mix(in oklch, ${r.cssVar} 35%, transparent), 0 30px 90px -30px color-mix(in oklch, ${r.cssVar} 40%, transparent)` }}
    >
      {/* Rarity light along the top edge. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: `radial-gradient(60% 100% at 50% 0%, color-mix(in oklch, ${r.cssVar} 22%, transparent), transparent)` }} />

      <div className="relative flex items-center justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 1.9, rotate: -10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, rotate: -3, filter: 'blur(0px)' }}
          transition={{ duration: 0.42, delay: 0.3, ease: [0.3, 1.4, 0.5, 1] }}
          className="flex items-center gap-2.5"
        >
          <span className="font-gothic text-[34px] leading-none sm:text-[40px]" style={{ color: r.cssVar, textShadow: `0 0 24px color-mix(in oklch, ${r.cssVar} 55%, transparent)` }}>
            {r.stamp}
          </span>
          <Pips tier={r.tier} color={r.cssVar} />
        </motion.div>
        <button onClick={onReplay} className="rounded-full px-2.5 py-1 text-xs text-bone-400 transition-colors hover:bg-bone-100/5 hover:text-bone-100" aria-label="Replay the reveal">
          ↺ Replay
        </button>
      </div>

      <motion.p {...rise(0.45)} className="eyebrow relative mt-3 sm:mt-4">
        {trial ? 'Trial chest' : chest.name} · {CATEGORY_LABEL[item.category]}
      </motion.p>
      <motion.h2 {...rise(0.52)} className="font-display relative mt-1 text-[34px] font-semibold leading-[1.02] text-bone-50 sm:text-[40px]">
        {item.name}
      </motion.h2>
      <motion.p {...rise(0.6)} className="relative mt-2 text-[13px] text-bone-300">
        {shortEra(item.era)} · {item.origin} · {item.provenance === 'antique' ? 'Antique, authenticated' : `Forged by ${item.maker ?? 'master smith'}`}
      </motion.p>

      <motion.div {...rise(0.68)} className="relative mt-3 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-bone-100/10 pt-3 sm:mt-5 sm:pt-4">
        <div>
          <p className="eyebrow !text-[10px]">Estimated value</p>
          <p className="mt-1 text-[40px] font-semibold leading-none text-bone-50 sm:text-[46px]">
            <CountUp to={item.value} duration={rarity === 'common' ? 0.7 : 1.4} delay={0.75} ticks onDone={() => setCounted(true)} />
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={counted ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.4, ease: [0.3, 1.5, 0.5, 1] }}
          className="mb-1 text-right"
        >
          {trial ? (
            <span className="rounded-full bg-moss-400/15 px-2.5 py-1 text-[13px] font-semibold text-moss-400">Free</span>
          ) : delta >= 0 ? (
            <span className="rounded-full px-2.5 py-1 text-[15px] font-bold tabular" style={{ color: r.cssVar, background: `color-mix(in oklch, ${r.cssVar} 14%, transparent)` }}>
              ×{mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)}
            </span>
          ) : (
            <span className="text-[13px] text-bone-400 tabular">{money(delta)} vs chest</span>
          )}
        </motion.div>
      </motion.div>

      <motion.div {...rise(0.76)} className="relative mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-[12px] text-bone-400 sm:flex">
        {item.length && <span>Length <b className="font-medium text-bone-200">{item.length}</b></span>}
        {item.weight && <span>Weight <b className="font-medium text-bone-200">{item.weight}</b></span>}
        <span className="min-w-0 truncate">{item.materials}</span>
      </motion.div>

      <motion.p {...rise(0.84)} className="font-display relative mt-3 line-clamp-2 text-[15px] italic leading-snug text-bone-300 sm:line-clamp-3 sm:text-[16px]">
        {item.blurb}
      </motion.p>

      {trial && sold == null && (
        <motion.p {...rise(0.9)} className="relative mt-4 rounded-[12px] border border-brass-500/25 bg-brass-500/[0.07] px-3.5 py-2.5 text-[13px] leading-snug text-bone-200">
          This piece is yours. Every pull ends with the same choice: keep it in your vault, sell it back instantly, or ship it home.
        </motion.p>
      )}
      <motion.div {...rise(0.95)} className="relative mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-2.5">
        {sold != null ? (
          <div className="col-span-2 flex items-center justify-between rounded-[12px] border border-moss-400/30 bg-moss-400/10 px-4 py-3">
            <span className="text-[13px] text-bone-200">Sold back. Added to your purse.</span>
            <span className="font-semibold text-moss-400 tabular">+{money(sold)}</span>
          </div>
        ) : (
          <>
            <Button data-testid="keep" variant="primary" size="lg" className="col-span-2" onClick={onKeep}>
              Keep in vault
            </Button>
            <Button data-testid="sell" variant="secondary" onClick={sellWithCoins} sub={`${Math.round(chest.buyback * 100)}% instant`}>
              Sell for {money(offer)}
            </Button>
            <Button variant="secondary" onClick={onShip} sub={trial ? 'After you claim your purse' : 'Insured courier'} disabled={trial}>
              Ship to me
            </Button>
          </>
        )}
        {!trial && (
          <Button data-testid="again" variant={sold != null ? 'primary' : 'ghost'} size={sold != null ? 'lg' : 'md'} className="col-span-2" onClick={onAgain} disabled={!canAfford}>
            {canAfford ? `Open another · ${money(chest.price)}` : 'Not enough in your purse'}
          </Button>
        )}
        {sold != null && (
          <Button variant="ghost" className="col-span-2" onClick={onKeep}>
            Done
          </Button>
        )}
      </motion.div>
      {draw && (
        <motion.p {...rise(1.05)} className="relative mt-3 flex items-center justify-center gap-1.5 text-[10px] text-bone-400" title={`Draw ${draw}`}>
          <span className="block h-1 w-1 rounded-full bg-moss-400" />
          Draw 0x{draw.slice(0, 6)}…{draw.slice(-4)} · verifiable on Solana (demo)
        </motion.p>
      )}
      {coins && <CoinBurst from={coins.from} to={coins.to} onDone={() => setCoins(null)} />}
    </motion.aside>
  )
}
