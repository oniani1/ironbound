import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowCounterClockwise, MagnifyingGlass, ShareNetwork } from '@phosphor-icons/react'
import type { Chest, Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { money, provenanceLine, resaleLabel, sourceHost } from '../../lib/format'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { Pips, Tag } from '../ui/RarityTag'
import { ShareSheet } from '../social/ShareSheet'
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
  /** Watching someone else's pull: no keep, sell or ship, an invitation to open this chest. */
  spectate?: { by?: string }
  onOpenChest?: () => void
  /** Fast mode: everything lands at once. */
  fast?: boolean
  /** Reports the card's rendered height so the camera can frame the item above it. */
  onHeight?: (px: number) => void
  collapsed?: boolean
  onToggle?: () => void
}

const ACTION = 'grid h-11 w-10 place-items-center text-bone-400 transition-colors hover:text-bone-50'

const CATEGORY_LABEL: Record<Item['category'], string> = {
  sword: 'Sword',
  dagger: 'Dagger',
  polearm: 'Polearm',
  axe: 'Axe and mace',
  helmet: 'Helmet',
  shield: 'Shield',
  armor: 'Armor',
  crossbow: 'Crossbow',
  fitting: 'Fitting',
}

export function RevealCard({ draw, item, rarity, chest, sold, onKeep, onSell, onShip, onAgain, onReplay, canAfford, trial, spectate, onOpenChest, fast, onHeight, collapsed, onToggle }: Props) {
  const r = RARITIES[rarity]
  const offer = Math.round(item.value * chest.buyback)
  const delta = item.value - chest.price
  const mult = chest.price > 0 ? item.value / chest.price : 0
  const [counted, setCounted] = useState(false)
  const [sharing, setSharing] = useState(false)
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

  const box = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // After an Inspect, the card comes back as it was, without a second entrance.
  const [revisit, setRevisit] = useState(false)
  useEffect(() => {
    if (collapsed) setRevisit(true)
  }, [collapsed])
  // Fast and reduced motion: final values and actions at once, opacity only.
  const instant = fast || reduced || revisit

  // Keyboard focus lands on the main action, then follows the Inspect toggle.
  useEffect(() => {
    if (collapsed || revisit) toggleRef.current?.focus({ preventScroll: true })
    else keepRef.current?.focus({ preventScroll: true })
  }, [collapsed])

  useEffect(() => {
    const el = box.current
    if (!el || !onHeight) return
    const ro = new ResizeObserver(() => onHeight(el.getBoundingClientRect().height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeight, collapsed])

  const ease = [0.16, 1, 0.3, 1] as const
  const rise = (d: number) => ({
    initial: { opacity: 0, y: instant ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: instant ? 0.2 : 0.55, delay: instant ? 0 : d, ease },
  })

  if (collapsed) {
    return (
      <motion.aside
        ref={box}
        data-testid="reveal-card"
        className="pointer-events-auto relative flex w-full items-center gap-3 rounded-t-[10px] border border-bone-100/10 bg-ink-900/92 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:w-auto sm:rounded-[10px] sm:py-2 sm:pl-5 sm:pr-2"
        initial={{ opacity: 0, y: reduced || fast ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced || fast ? 0.2 : 0.3, ease }}
      >
        <span className="font-gothic text-[22px] leading-none" style={{ color: r.cssVar }}>{r.stamp}</span>
        <span className="min-w-0 flex-1 truncate font-display text-[17px] text-bone-50 sm:flex-none">{item.name}</span>
        <span className="text-[15px] font-semibold text-bone-100 tabular">{money(item.value)}</span>
        <Button ref={toggleRef} size="sm" variant="secondary" className="!h-11" onClick={onToggle} aria-label="Show details">
          Details
        </Button>
      </motion.aside>
    )
  }

  return (
    <motion.aside
      ref={box}
      data-testid="reveal-card"
      className="pointer-events-auto relative w-full overflow-hidden rounded-t-[10px] border border-bone-100/10 bg-ink-900/92 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:rounded-[10px] sm:p-7 md:w-[440px]"
      initial={{ opacity: 0, y: instant ? 0 : 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: instant ? 0 : 30, transition: { duration: instant ? 0.2 : 0.25 } }}
      transition={{ duration: instant ? 0.2 : 0.5, ease }}
      style={{ boxShadow: `inset 0 1px 0 color-mix(in oklch, ${r.cssVar} 40%, transparent), 0 40px 90px -40px oklch(0% 0 0 / .8)` }}
    >
      {/* Rarity light along the top edge. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: `radial-gradient(60% 100% at 50% 0%, color-mix(in oklch, ${r.cssVar} 14%, transparent), transparent)` }} />

      <div className="relative flex items-center justify-between gap-3">
        <motion.div
          initial={instant ? { opacity: 0, rotate: -3 } : { opacity: 0, scale: 1.9, rotate: -10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, rotate: -3, filter: 'blur(0px)' }}
          transition={instant ? { duration: 0.2 } : { duration: 0.42, delay: 0.12, ease: [0.3, 1.4, 0.5, 1] }}
          className="flex items-center gap-2.5"
        >
          <span className="font-gothic text-[34px] leading-none sm:text-[40px]" style={{ color: r.cssVar, textShadow: `0 0 24px color-mix(in oklch, ${r.cssVar} 55%, transparent)` }}>
            {r.stamp}
          </span>
          <Pips tier={r.tier} color={r.cssVar} />
        </motion.div>
        <div className="-mr-2 flex items-center">
          {onToggle && (
            <button ref={toggleRef} onClick={onToggle} className={ACTION} aria-label="Hide the card and inspect the piece" title="Inspect">
              <MagnifyingGlass size={18} weight="light" aria-hidden />
            </button>
          )}
          <button onClick={onReplay} className={ACTION} aria-label="Replay the reveal" title="Replay">
            <ArrowCounterClockwise size={18} weight="light" aria-hidden />
          </button>
          <button onClick={() => setSharing(true)} className={ACTION} aria-label="Share this pull" title="Share" data-testid="share">
            <ShareNetwork size={18} weight="light" aria-hidden />
          </button>
        </div>
      </div>

      <motion.p {...rise(0.17)} className="eyebrow relative mt-3 sm:mt-4">
        {spectate ? `${spectate.by ?? 'Someone'} pulled this · ${chest.name}` : trial ? 'Guided demo · sample Rare result' : `${chest.name} · ${CATEGORY_LABEL[item.category]}`}
      </motion.p>
      <motion.h2 {...rise(0.24)} className="font-display relative mt-1 text-[30px] font-semibold leading-[1.02] text-bone-50 sm:text-[40px]">
        {item.name}
      </motion.h2>
      <motion.p {...rise(0.32)} className="relative mt-2 text-[13px] text-bone-300">
        {provenanceLine(item)}
      </motion.p>
      {item.provenance === 'forged' && (
        <motion.div {...rise(0.36)} className="relative mt-2 flex items-center gap-4">
          <Tag tone={item.resale === 'strong' ? 'moss' : 'bone'}>{resaleLabel(item.resale)}</Tag>
          <span className="text-[11px] text-bone-400">Our assessment{item.photoExact === false ? ' · Example photo of the type' : ''}</span>
        </motion.div>
      )}

      <motion.div {...rise(0.4)} className="relative mt-3 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-bone-100/10 pt-3 sm:mt-5 sm:pt-4">
        <div>
          <p className="eyebrow !text-[11px]">
            {item.provenance === 'forged' ? 'Retail price, new' : 'Estimated item value'}
            {item.provenance === 'forged' && item.priceSource && (
              <a href={item.priceSource} target="_blank" rel="noreferrer" className="ml-2 normal-case tracking-normal text-bone-300 underline decoration-bone-100/25 underline-offset-2 hover:text-bone-100">
                {sourceHost(item.priceSource)}
              </a>
            )}
          </p>
          <p className="mt-1 text-[36px] font-semibold leading-none text-bone-50 sm:text-[46px]">
            {/* The value is stated, not teased: it lands at once below Epic and rolls briefly above. */}
            <CountUp to={item.value} duration={instant || r.tier < 4 ? 0.01 : 0.8} delay={instant || r.tier < 4 ? 0 : 0.3} onDone={() => setCounted(true)} />
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: instant ? 1 : 0.6 }}
          animate={counted || instant ? { opacity: 1, scale: 1 } : {}}
          transition={instant ? { duration: 0.2 } : { duration: 0.4, ease: [0.3, 1.5, 0.5, 1] }}
          className="mb-1 text-right"
        >
          {trial ? (
            <Tag tone="moss">Free chest</Tag>
          ) : delta >= 0 ? (
            <span className="block leading-none">
              <span className="block text-[24px] font-semibold tabular" style={{ color: r.cssVar }}>
                ×{mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)}
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-bone-400">the chest price</span>
            </span>
          ) : (
            <span className="text-[13px] text-bone-400 tabular">{money(delta)} vs chest</span>
          )}
        </motion.div>
      </motion.div>

      <motion.div {...rise(0.48)} className="relative mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-[12px] text-bone-400 sm:flex">
        {item.length && <span>{['helmet', 'armor', 'shield'].includes(item.category) ? 'Height' : 'Length'} <b className="font-medium text-bone-200">{item.length}</b></span>}
        {item.weight && <span>Weight <b className="font-medium text-bone-200">{item.weight}</b></span>}
        <span className="hidden min-w-0 truncate sm:inline">{item.materials}</span>
      </motion.div>

      <motion.p {...rise(0.56)} className="font-display relative mt-3 hidden text-[16px] italic leading-snug text-bone-300 sm:line-clamp-3">
        {item.blurb}
      </motion.p>

      {trial && sold == null && (
        <motion.p {...rise(0.62)} className="relative mt-4 hidden gap-2.5 border-t border-bone-100/[0.08] pt-3 text-[13px] leading-snug text-bone-200 sm:flex">
          <span className="mt-[6px] block h-[5px] w-[5px] shrink-0 rotate-45 bg-brass-400" aria-hidden />
          Added to your demo vault. Every pull ends the same way: keep it, sell it back now or ship it home.
        </motion.p>
      )}
      {spectate ? (
        <motion.div {...rise(0.67)} className="relative mt-4 grid gap-2 sm:mt-5">
          <Button data-testid="spectate-open" ref={keepRef} variant="primary" size="lg" onClick={onOpenChest}>
            Open {chest.name} · {money(chest.price)}
          </Button>
          <p className="text-center text-[12px] text-bone-400">A replay of a simulated pull. Nothing was charged and nothing enters your vault.</p>
        </motion.div>
      ) : (
      <motion.div {...rise(0.67)} className="relative mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-2.5">
        {sold != null ? (
          <div className="col-span-2 flex items-center justify-between border-y border-moss-400/25 py-3">
            <Tag tone="moss">Sold back to your purse</Tag>
            <span className="text-[17px] font-semibold text-moss-400 tabular">+{money(sold)}</span>
          </div>
        ) : (
          <>
            <Button ref={keepRef} data-testid="keep" variant="primary" size="lg" className="col-span-2" onClick={onKeep}>
              Keep in vault
            </Button>
            <Button
              data-testid="sell"
              variant="secondary"
              onClick={sellWithCoins}
              sub={trial ? `${Math.round(chest.buyback * 100)}% instant` : `${Math.round(chest.buyback * 100)}% · ${offer - chest.price >= 0 ? '+' : ''}${money(offer - chest.price)} net`}
            >
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
      )}
      {draw && !spectate && (
        <motion.p {...rise(0.77)} className="relative mt-3 hidden items-center justify-center gap-1.5 text-[11px] text-bone-400 sm:flex" title={`Draw ${draw}`}>
          <span className="block h-1 w-1 rounded-full bg-moss-400" />
          Simulated draw 0x{draw.slice(0, 6)}…{draw.slice(-4)} · no on-chain transaction
        </motion.p>
      )}
      {coins && <CoinBurst from={coins.from} to={coins.to} onDone={() => setCoins(null)} />}
      <AnimatePresence>{sharing && <ShareSheet pull={{ item, rarity, chestName: chest.name }} onClose={() => setSharing(false)} />}</AnimatePresence>
    </motion.aside>
  )
}
