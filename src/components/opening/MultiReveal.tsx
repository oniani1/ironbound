import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, X } from '@phosphor-icons/react'
import type { Chest, Item, RarityId } from '../../types'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'
import { money, photoCredit, provenanceLine, resaleLabel, RETAIL_CHECKED_SHORT, sourceHost } from '../../lib/format'
import { PhotoCredit } from '../ui/PhotoCredit'
import { buybackOffer } from '../../lib/gacha'
import { Button, IconButton } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { RarityTag, Tag } from '../ui/RarityTag'
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
  /** Fast mode: cards land face up and the totals are final at once. */
  fast?: boolean
}

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Hearthstone-style spread: every card lands face down, glowing with its rarity. The
 * player flips them in any order; the best one is saved for last by "Reveal all". Once
 * face up, each card can be inspected and selected for sell-back on its own.
 */
export function MultiReveal({ results, chest, soldUids, onSell, onDone, onAgain, canAfford, fast }: Props) {
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const instant = fast || reduced
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set(instant ? results.map((r) => r.uid) : []))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [inspect, setInspect] = useState<MultiResult | null>(null)
  const timers = useRef<number[]>([])
  /** Each card's face (its Inspect button), so focus can follow a flip. */
  const faces = useRef(new Map<string, HTMLButtonElement>())
  const revealAllBtn = useRef<HTMLButtonElement>(null)
  const keepAllBtn = useRef<HTMLButtonElement>(null)
  const allFlipped = flipped.size === results.length
  const total = results.reduce((s, r) => s + r.item.value, 0)
  const cost = chest.price * results.length
  const best = useMemo(
    () => results.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) || (b.rarity === a.rarity && b.item.value > a.item.value) ? b : a)),
    [results],
  )

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  useEffect(() => {
    const target = allFlipped ? keepAllBtn.current : revealAllBtn.current
    const active = document.activeElement
    if (!active || active === document.body || active.closest('[data-testid="opening-overlay"]') === null || !active.isConnected) target?.focus({ preventScroll: true })
    else if (allFlipped && active === revealAllBtn.current) target?.focus({ preventScroll: true })
  }, [allFlipped])

  const offerOf = (r: MultiResult) => buybackOffer(r.item.value, chest)
  const unsold = results.filter((r) => !soldUids.has(r.uid))
  const offersLeft = unsold.reduce((s, r) => s + offerOf(r), 0)
  const credited = results.filter((r) => soldUids.has(r.uid)).reduce((s, r) => s + offerOf(r), 0)
  const picked = unsold.filter((r) => selected.has(r.uid))
  const pickedSum = picked.reduce((s, r) => s + offerOf(r), 0)
  const belowPrice = unsold.filter((r) => r.item.value < chest.price)

  const flip = (r: MultiResult) => {
    if (flipped.has(r.uid)) return
    setFlipped((s) => new Set(s).add(r.uid))
  }

  const revealAll = () => {
    const order = results.filter((r) => !flipped.has(r.uid) && r.uid !== best.uid)
    order.forEach((r, i) => timers.current.push(window.setTimeout(() => flip(r), i * 260)))
    if (!flipped.has(best.uid)) timers.current.push(window.setTimeout(() => flip(best), order.length * 260 + 700))
  }

  const toggle = (uid: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })

  const sellPicked = () => {
    onSell(picked.map((r) => r.uid))
    setSelected(new Set())
  }

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-[1100px] flex-col items-center gap-6 px-4">
      <div className="flex w-full flex-wrap justify-center gap-3 sm:gap-4" style={{ perspective: 1400 }}>
        {results.map((r, i) => {
          const rr = RARITIES[r.rarity]
          const isUp = flipped.has(r.uid)
          const isSold = soldUids.has(r.uid)
          const isPicked = selected.has(r.uid) && !isSold
          return (
            <motion.div
              key={r.uid}
              data-testid="multi-card"
              className="group relative aspect-[4/5] w-[calc(50%-6px)] max-w-[190px] sm:aspect-[3/4] sm:w-[170px] sm:max-w-none lg:w-[200px]"
              initial={instant ? { opacity: 0 } : { opacity: 0, y: 120, rotateZ: (i - results.length / 2) * 6, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, rotateZ: 0, scale: 1 }}
              transition={instant ? { duration: 0.2 } : { duration: 0.7, delay: 0.1 + i * 0.09, ease }}
              whileHover={isUp || instant ? {} : { y: -8 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={instant ? { duration: 0 } : { duration: 0.65, ease: [0.65, 0, 0.35, 1] }}
              >
                {/* Back: forged plate, glowing at the edges in the rarity color. */}
                <button
                  type="button"
                  onClick={(e) => {
                    const back = e.currentTarget
                    flip(r)
                    // The face that held focus turns away; focus follows to the piece once it has turned.
                    timers.current.push(window.setTimeout(() => {
                      if (document.activeElement === back || document.activeElement === document.body) faces.current.get(r.uid)?.focus({ preventScroll: true })
                    }, instant ? 0 : 650))
                  }}
                  className="absolute inset-0 overflow-hidden rounded-[10px] border outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
                  style={{
                    backfaceVisibility: 'hidden',
                    pointerEvents: isUp ? 'none' : 'auto',
                    borderColor: `color-mix(in oklch, ${rr.cssVar} 55%, transparent)`,
                    background: 'radial-gradient(120% 90% at 50% 0%, oklch(24% 0.02 60), oklch(13% 0.012 55))',
                    boxShadow: `0 0 ${18 + rr.tier * 8}px color-mix(in oklch, ${rr.cssVar} ${20 + rr.tier * 8}%, transparent), inset 0 0 40px color-mix(in oklch, ${rr.cssVar} 18%, transparent)`,
                  }}
                  tabIndex={isUp ? -1 : 0}
                  aria-hidden={isUp}
                  aria-label={`Flip face-down card, ${rr.label}`}
                >
                  <span className="absolute inset-3 rounded-[6px] border border-bone-100/10" />
                  <span className="absolute inset-0 grid place-items-center">
                    <svg viewBox="0 0 64 80" className="h-16 w-14 opacity-70 transition-transform duration-300 group-hover:scale-110" aria-hidden>
                      <path d="M4 4 H60 V36 C60 56 46 70 32 76 C18 70 4 56 4 36 Z" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: rr.cssVar }} />
                      <path d="M32 14 L34 46 L32 52 L30 46 Z M24 46 H40 V49 H24 Z" fill="currentColor" style={{ color: rr.cssVar }} />
                    </svg>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 h-1/2 animate-pulse-soft" style={{ background: `linear-gradient(0deg, color-mix(in oklch, ${rr.cssVar} 30%, transparent), transparent)` }} />
                </button>

                {/* Front: the item, an Inspect target and a select control. */}
                <div
                  className={`absolute inset-0 flex flex-col overflow-hidden rounded-[10px] border bg-ink-900 transition-[box-shadow,border-color] duration-200 ${isSold ? 'opacity-70' : ''}`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    pointerEvents: isUp ? 'auto' : 'none',
                    borderColor: isPicked ? 'var(--color-brass-400)' : `color-mix(in oklch, ${rr.cssVar} 35%, transparent)`,
                    boxShadow: isPicked
                      ? 'inset 0 0 0 1px var(--color-brass-400), 0 24px 50px -24px oklch(0% 0 0 / .8)'
                      : `0 24px 50px -24px color-mix(in oklch, ${rr.cssVar} 45%, transparent)`,
                  }}
                  aria-hidden={!isUp}
                >
                  <button
                    ref={(el) => {
                      if (el) faces.current.set(r.uid, el)
                      else faces.current.delete(r.uid)
                    }}
                    type="button"
                    onClick={() => setInspect(r)}
                    className="relative min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-300"
                    style={{ background: `radial-gradient(70% 60% at 50% 70%, color-mix(in oklch, ${rr.cssVar} 28%, transparent), transparent)` }}
                    tabIndex={isUp ? 0 : -1}
                    aria-label={`Inspect ${r.item.name}, ${rr.label}, ${money(r.item.value)}`}
                  >
                    <ItemImg item={r.item} eager className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] drop-shadow-[0_10px_18px_oklch(0%_0_0/.6)]" />
                    {r.item.photoExact === false && <span className="absolute bottom-1.5 left-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-bone-400">Example photo</span>}
                  </button>
                  {isSold ? (
                    <span className="absolute inset-x-0 top-0 flex justify-center bg-ink-950/80 py-1.5">
                      <Tag tone="moss">Sold +{money(offerOf(r))}</Tag>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="multi-select"
                      onClick={() => toggle(r.uid)}
                      className="absolute right-0 top-0 grid h-11 w-11 place-items-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-300"
                      tabIndex={isUp ? 0 : -1}
                      aria-pressed={isPicked}
                      aria-label={`${isPicked ? 'Unselect' : 'Select'} ${r.item.name} for sell-back at ${money(offerOf(r))}`}
                    >
                      <span
                        className={`grid h-[22px] w-[22px] place-items-center rounded-[3px] transition-colors ${isPicked ? 'bg-brass-400 text-ink-950' : 'bg-ink-950/60 text-transparent shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_35%,transparent)]'}`}
                      >
                        <Check size={13} weight="bold" aria-hidden />
                      </span>
                    </button>
                  )}
                  <div className="border-t border-bone-100/10 p-2.5 text-left">
                    <RarityTag rarity={r.rarity} size="sm" />
                    <p className="font-display mt-1 line-clamp-2 text-[15px] font-semibold leading-tight text-bone-50">{r.item.name}</p>
                    <p className="mt-0.5 text-[13px] text-bone-300 tabular">
                      <b className="font-semibold text-bone-100">{money(r.item.value)}</b>
                      {!isSold && <span> · sell {money(offerOf(r))}</span>}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      <div className="flex min-h-[112px] w-full max-w-[560px] flex-col items-center gap-3 max-sm:sticky max-sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!allFlipped ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-col items-center gap-2">
            <Button ref={revealAllBtn} data-testid="reveal-all" variant="primary" size="lg" onClick={revealAll}>
              Reveal all
            </Button>
            <p className="text-[13px] text-bone-300">Or flip them one by one. The glow tells you the rarity.</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: instant ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: instant ? 0.2 : 0.5, ease }}
            className="plate w-full p-4 sm:p-5"
            data-testid="multi-summary"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div>
                <p className="eyebrow !text-[11px]">Spoils · item value</p>
                <p className="mt-1 text-[30px] font-semibold leading-none text-bone-50">{instant ? <span className="tabular">{money(total)}</span> : <CountUp to={total} duration={1} />}</p>
              </div>
              <dl className="grid grid-cols-3 gap-x-4 text-right text-[12px] tabular">
                <dt className="text-bone-400">Cost</dt>
                <dt className="text-bone-400">Offers left</dt>
                <dt className="text-bone-400">Credited</dt>
                <dd className="font-semibold text-bone-100">{money(cost)}</dd>
                <dd className="font-semibold text-bone-100">{money(offersLeft)}</dd>
                <dd className={`font-semibold ${credited > 0 ? 'text-moss-400' : 'text-bone-300'}`}>
                  {credited > 0 ? '+' : ''}
                  {money(credited)}
                </dd>
              </dl>
            </div>
            {/* Two equal actions; the sale amount sits on its own line so no label crowds its frame. */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button ref={keepAllBtn} variant="primary" className="!h-14" onClick={onDone}>
                {unsold.length === 0 ? 'Done' : unsold.length < results.length ? 'Keep the rest' : 'Keep all'}
              </Button>
              <Button
                data-testid="sell-selected"
                variant="secondary"
                className="!h-14 !px-3"
                onClick={sellPicked}
                disabled={picked.length === 0}
                sub={picked.length ? <span className="tabular">{money(pickedSum)} to your purse</span> : undefined}
              >
                {picked.length ? 'Sell selected' : 'Select to sell'}
              </Button>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
              {belowPrice.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelected(new Set(belowPrice.map((r) => r.uid)))}
                  className="min-h-11 text-[13px] text-bone-300 underline-offset-4 hover:text-bone-100 hover:underline"
                >
                  Select the {belowPrice.length} below chest price
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onAgain}
                disabled={!canAfford}
                className="min-h-11 text-[13px] font-semibold text-bone-100 underline-offset-4 hover:underline disabled:text-bone-400 disabled:no-underline"
              >
                {canAfford ? `Open ${results.length} more · ${money(cost)}` : 'Not enough in your purse'}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {inspect && (
          <InspectSheet
            key={inspect.uid}
            result={inspect}
            chest={chest}
            sold={soldUids.has(inspect.uid)}
            instant={instant}
            onSell={() => onSell([inspect.uid])}
            onKeep={() => {
              const uid = inspect.uid
              setSelected((s) => {
                const n = new Set(s)
                n.delete(uid)
                return n
              })
              setInspect(null)
            }}
            onClose={() => setInspect(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** One piece from a batch, large, with its own sell-back offer. */
function InspectSheet({ result, chest, sold, instant, onSell, onKeep, onClose }: { result: MultiResult; chest: Chest; sold: boolean; instant: boolean; onSell: () => void; onKeep: () => void; onClose: () => void }) {
  const { item } = result
  const r = RARITIES[result.rarity]
  const offer = buybackOffer(item.value, chest)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeCb = useRef(onClose)
  closeCb.current = onClose

  useEffect(() => {
    // Focus moves into the sheet and returns to the card that opened it.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    // Escape closes the sheet before it can close the whole opening.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeCb.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      // Tab cycles inside the sheet.
      const nodes = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')]
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (!firstNode || !lastNode) return
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault()
        lastNode.focus()
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault()
        firstNode.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      opener?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/75 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      data-testid="multi-inspect"
    >
      <motion.div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="plate ib-sheet relative w-full max-w-[480px] rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-b-[10px]"
        initial={{ y: instant ? 0 : 40 }}
        animate={{ y: 0 }}
        exit={{ y: instant ? 0 : 30 }}
        transition={{ duration: instant ? 0.2 : 0.35, ease }}
      >
        <IconButton ref={closeRef} type="button" onClick={onClose} className="absolute right-3 top-3 z-10" aria-label="Close">
          <X size={16} weight="light" />
        </IconButton>
        <div className="h-[min(42vh,340px)] rounded-[6px]" style={{ background: `radial-gradient(70% 60% at 50% 65%, color-mix(in oklch, ${r.cssVar} 26%, transparent), transparent)` }}>
          <ItemImg item={item} eager className="h-full w-full drop-shadow-[0_14px_24px_oklch(0%_0_0/.6)]" />
        </div>
        <div className="mt-4">
          <RarityTag rarity={result.rarity} size="md" />
          <h3 className="font-display mt-2 text-[28px] font-semibold leading-[1.05] text-bone-50">{item.name}</h3>
          <p className="mt-1 text-[13px] text-bone-300">
            {provenanceLine(item)}
          </p>
          {item.provenance === 'forged' && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Tag tone={item.resale === 'strong' ? 'moss' : 'bone'}>{resaleLabel(item.resale)}</Tag>
              <span className="text-[11px] text-bone-400">Our assessment{item.photoExact === false ? ' · Example photo of the type' : ''}</span>
            </p>
          )}
          {!photoCredit(item).publicDomain && (
            <p className="mt-2 text-[11px] leading-snug text-bone-400">
              <PhotoCredit item={item} />
            </p>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 items-end gap-3 border-t border-bone-100/10 pt-3 tabular">
          <div>
            <dt className="eyebrow !text-[11px]">{item.provenance === 'forged' ? 'Retail price, new' : 'Estimated value'}</dt>
            <dd className="mt-1 text-[24px] font-semibold text-bone-50">{money(item.value)}</dd>
            {item.provenance === 'forged' && item.priceSource && (
              <dd className="mt-1">
                <a href={item.priceSource} target="_blank" rel="noreferrer" className="text-[11px] text-bone-300 underline decoration-bone-100/25 underline-offset-2 hover:text-bone-100">
                  {sourceHost(item.priceSource)} · {RETAIL_CHECKED_SHORT}
                </a>
              </dd>
            )}
          </div>
          <div>
            <dt className="eyebrow !text-[11px]">Sell-back offer</dt>
            <dd className="mt-1 text-[24px] font-semibold text-bone-100">
              {money(offer)} <span className="text-[13px] font-normal text-bone-300">{Math.round(chest.buyback * 100)}%</span>
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {sold ? (
            <div className="col-span-2 flex items-center justify-between border-y border-moss-400/25 py-3">
              <Tag tone="moss">Sold back to your purse</Tag>
              <span className="text-[17px] font-semibold text-moss-400 tabular">+{money(offer)}</span>
            </div>
          ) : (
            <>
              <Button variant="primary" onClick={onKeep}>
                Keep
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onSell()
                  onClose()
                }}
              >
                Sell for {money(offer)}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
