import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Chest, Item, RarityId } from '../../types'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { RarityTag } from '../ui/RarityTag'
import { ItemImg } from '../ui/ItemImg'

export interface MultiResult {
  uid: string
  item: Item
  rarity: RarityId
  draw: string
}

interface Props {
  results: MultiResult[]
  chest: Chest
  soldUids: Set<string>
  onSell: (uids: string[]) => void
  onDone: () => void
  onAgain: () => void
  canAfford: boolean
}

/**
 * Hearthstone-style spread: every card lands face down, glowing with its rarity. The
 * player flips them in any order; the best one is saved for last by "Reveal all".
 */
export function MultiReveal({ results, chest, soldUids, onSell, onDone, onAgain, canAfford }: Props) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const timers = useRef<number[]>([])
  const allFlipped = flipped.size === results.length
  const total = results.reduce((s, r) => s + r.item.value, 0)
  const cost = chest.price * results.length
  const best = useMemo(
    () => results.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) || (b.rarity === a.rarity && b.item.value > a.item.value) ? b : a)),
    [results],
  )

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const flip = (r: MultiResult) => {
    if (flipped.has(r.uid)) return
    const tier = RARITIES[r.rarity].tier
    sfx.whoosh(0.5)
    if (tier >= 3) window.setTimeout(() => sfx.ting(tier - 2), 160)
    if (tier >= 5) window.setTimeout(() => sfx.burst(tier), 200)
    setFlipped((s) => new Set(s).add(r.uid))
  }

  const revealAll = () => {
    const order = results.filter((r) => !flipped.has(r.uid) && r.uid !== best.uid)
    order.forEach((r, i) => timers.current.push(window.setTimeout(() => flip(r), i * 260)))
    if (!flipped.has(best.uid)) timers.current.push(window.setTimeout(() => flip(best), order.length * 260 + 700))
  }

  const unsold = results.filter((r) => !soldUids.has(r.uid))
  const belowPrice = unsold.filter((r) => r.item.value < chest.price)

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-[1100px] flex-col items-center gap-6 px-4">
      <div className="flex w-full flex-wrap justify-center gap-3 sm:gap-4" style={{ perspective: 1400 }}>
        {results.map((r, i) => {
          const rr = RARITIES[r.rarity]
          const isUp = flipped.has(r.uid)
          return (
            <motion.button
              key={r.uid}
              data-testid="multi-card"
              type="button"
              onClick={() => flip(r)}
              className="group relative aspect-[3/4] w-[calc(33%-10px)] max-w-[190px] outline-none sm:w-[170px]"
              initial={{ opacity: 0, y: 120, rotateZ: (i - results.length / 2) * 6, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, rotateZ: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              whileHover={isUp ? {} : { y: -8 }}
              aria-label={isUp ? `${r.item.name}, ${rr.label}, ${money(r.item.value)}` : `Face-down card, ${rr.label}`}
            >
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={{ duration: 0.65, ease: [0.65, 0, 0.35, 1] }}
              >
                {/* Back: forged plate, glowing at the edges in the rarity color. */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-[14px] border"
                  style={{
                    backfaceVisibility: 'hidden',
                    borderColor: `color-mix(in oklch, ${rr.cssVar} 55%, transparent)`,
                    background: 'radial-gradient(120% 90% at 50% 0%, oklch(24% 0.02 60), oklch(13% 0.012 55))',
                    boxShadow: `0 0 ${18 + rr.tier * 8}px color-mix(in oklch, ${rr.cssVar} ${20 + rr.tier * 8}%, transparent), inset 0 0 40px color-mix(in oklch, ${rr.cssVar} 18%, transparent)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-[10px] border border-bone-100/10" />
                  <div className="absolute inset-0 grid place-items-center">
                    <svg viewBox="0 0 64 80" className="h-16 w-14 opacity-70 transition-transform duration-300 group-hover:scale-110">
                      <path d="M4 4 H60 V36 C60 56 46 70 32 76 C18 70 4 56 4 36 Z" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: rr.cssVar }} />
                      <path d="M32 14 L34 46 L32 52 L30 46 Z M24 46 H40 V49 H24 Z" fill="currentColor" style={{ color: rr.cssVar }} />
                    </svg>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1/2 animate-pulse-soft" style={{ background: `linear-gradient(0deg, color-mix(in oklch, ${rr.cssVar} 30%, transparent), transparent)` }} />
                </div>
                {/* Front: the item. */}
                <div
                  className="absolute inset-0 flex flex-col overflow-hidden rounded-[14px] border bg-ink-900"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    borderColor: `color-mix(in oklch, ${rr.cssVar} 45%, transparent)`,
                    boxShadow: `0 20px 50px -20px color-mix(in oklch, ${rr.cssVar} 55%, transparent)`,
                  }}
                >
                  <div className="relative flex-1" style={{ background: `radial-gradient(70% 60% at 50% 70%, color-mix(in oklch, ${rr.cssVar} 28%, transparent), transparent)` }}>
                    <ItemImg item={r.item} eager className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] drop-shadow-[0_10px_18px_oklch(0%_0_0/.6)]" />
                    {soldUids.has(r.uid) && <span className="absolute right-2 top-2 rounded-full bg-moss-400/20 px-2 py-0.5 text-[10px] font-semibold text-moss-400">Sold</span>}
                  </div>
                  <div className="border-t border-bone-100/10 p-2.5 text-left">
                    <RarityTag rarity={r.rarity} size="xs" />
                    <p className="font-display mt-1 line-clamp-1 text-[15px] font-semibold leading-tight text-bone-50">{r.item.name}</p>
                    <p className="text-[13px] font-semibold text-bone-200 tabular">{money(r.item.value)}</p>
                  </div>
                </div>
              </motion.div>
            </motion.button>
          )
        })}
      </div>

      <div className="flex min-h-[112px] w-full max-w-[560px] flex-col items-center gap-3">
        {!allFlipped ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-col items-center gap-2">
            <Button data-testid="reveal-all" variant="primary" size="lg" onClick={revealAll}>
              Reveal all
            </Button>
            <p className="text-xs text-bone-400">Or flip them one by one. The glow tells you the rarity.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="plate w-full rounded-[18px] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow !text-[10px]">Spoils</p>
                <p className="mt-1 text-[30px] font-semibold leading-none text-bone-50">
                  <CountUp to={total} duration={1} ticks />
                </p>
              </div>
              <p className={`text-right text-[13px] tabular ${total >= cost ? 'text-moss-400' : 'text-bone-400'}`}>
                Cost {money(cost)}
                <br />
                {total >= cost ? `+${money(total - cost)}` : money(total - cost)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={onDone}>
                Keep all
              </Button>
              <Button variant="secondary" onClick={() => onSell(belowPrice.map((r) => r.uid))} disabled={belowPrice.length === 0} sub={`${belowPrice.length} below chest price`}>
                Sell the small ones
              </Button>
              <Button variant="ghost" className="col-span-2" onClick={onAgain} disabled={!canAfford}>
                {canAfford ? `Open ${results.length} more · ${money(cost)}` : 'Not enough in your purse'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

