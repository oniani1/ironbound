import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import type { Chest, Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { money, photoCredit, provenanceLine, resaleLabel, RETAIL_CHECKED_SHORT, sourceHost } from '../../lib/format'
import { PhotoCredit } from '../ui/PhotoCredit'
import { buybackOffer } from '../../lib/gacha'
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
  /** Takes the sale back, until undoUntil. */
  onUndoSell?: () => void
  /** When the chance to take the sale back ends (ms since the epoch), fixed when the sale was made. */
  undoUntil?: number
  onShip: () => void
  onAgain: () => void
  onReplay: () => void
  canAfford: boolean
  /** The piece's photograph never loaded, so the scene shows no piece: say so. */
  photoMissing?: boolean
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
  /**
   * 'title': the name, provenance and value build beside the piece with no panel behind them.
   * 'full': the panel, the details and the actions settle in around them.
   */
  stage?: 'title' | 'full'
}

const CATEGORY_LABEL: Record<Item['category'], string> = {
  sword: 'Sword',
  dagger: 'Dagger',
  polearm: 'Polearm',
  axe: 'Axe and mace',
  helmet: 'Helmet',
  shield: 'Shield',
  armor: 'Armor',
  bow: 'Bow',
  crossbow: 'Crossbow',
  fitting: 'Fitting',
}

const ease = [0.16, 1, 0.3, 1] as const

export function RevealCard({ draw, item, rarity, chest, sold, onKeep, onSell, onUndoSell, undoUntil, onShip, onAgain, onReplay, canAfford, trial, spectate, onOpenChest, fast, onHeight, collapsed, onToggle, stage = 'full', photoMissing = false }: Props) {
  const r = RARITIES[rarity]
  const offer = buybackOffer(item.value, chest)
  // How many times over the piece beats its chest. Only a win is counted: a piece worth less than
  // the chest is shown at its value alone, never as a loss (the founder, 2026-10-16).
  const mult = chest.price > 0 ? item.value / chest.price : 0
  const beats = mult >= 1.05
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

  // A sale can be taken back until a moment fixed when it was made (undoUntil), whatever renders
  // or replays come in between. Undo takes focus as it appears; when it goes, focus moves on to
  // the next action instead of falling to the page.
  const undoRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  const [clock, setClock] = useState(() => Date.now())
  const undoOpen = sold != null && !!onUndoSell && !!undoUntil && clock < undoUntil
  const settle = (el: HTMLElement | null | undefined) => {
    if (!el) return
    el.focus({ preventScroll: true })
    const card = box.current
    if (!card) return
    const t = el.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    if (t.bottom > c.bottom) card.scrollTop += t.bottom - c.bottom + 12
    else if (t.top < c.top) card.scrollTop -= c.top - t.top + 12
  }
  useEffect(() => {
    if (!undoOpen || !undoUntil) return
    const t = window.setTimeout(() => {
      const focused = document.activeElement === undoRef.current
      setClock(Date.now())
      if (focused) window.setTimeout(() => settle(againRef.current && !againRef.current.disabled ? againRef.current : keepRef.current), 0)
    }, Math.max(0, undoUntil - Date.now()))
    return () => window.clearTimeout(t)
  }, [undoOpen, undoUntil])
  // Just sold: Undo takes focus. Just undone: Keep is back, and takes it.
  const lastSold = useRef(sold)
  useEffect(() => {
    const before = lastSold.current
    lastSold.current = sold
    if (before == null && sold != null && undoOpen) settle(undoRef.current)
    else if (before != null && sold == null) settle(keepRef.current)
  }, [sold, undoOpen])
  const box = useRef<HTMLElement>(null)
  // A receipt fading out after Open another takes no more clicks: the next chest is already open.
  const present = useIsPresent()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  // The main action is announced with what was pulled: it takes focus as the receipt arrives.
  const summaryId = useId()
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // After an Inspect, the card comes back as it was, without a second entrance.
  const [revisit, setRevisit] = useState(false)
  useEffect(() => {
    if (collapsed) setRevisit(true)
  }, [collapsed])
  // Fast and reduced motion: final values and actions at once, opacity only.
  const instant = fast || reduced || revisit
  // The card began as a title: its header is already in place when the panel arrives.
  const [titled] = useState(stage === 'title')
  const built = stage === 'full'

  // Keyboard focus lands on the main action once the actions are there, then follows Inspect.
  useEffect(() => {
    if (!built) return
    const target = collapsed || revisit ? toggleRef.current : keepRef.current
    target?.focus({ preventScroll: true })
    // On a short screen the receipt scrolls inside itself: bring the focused control into its
    // view, and move nothing around it.
    const card = box.current
    if (target && card && !collapsed) {
      const t = target.getBoundingClientRect()
      const c = card.getBoundingClientRect()
      if (t.bottom > c.bottom) card.scrollTop += t.bottom - c.bottom + 12
      else if (t.top < c.top) card.scrollTop -= c.top - t.top + 12
    }
  }, [collapsed, built, revisit])

  useEffect(() => {
    const el = box.current
    if (!el || !onHeight) return
    const ro = new ResizeObserver(() => onHeight(el.getBoundingClientRect().height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeight, collapsed])

  // The header: as a title it builds slowly, beat by beat; straight into a card it lands quickly.
  const head = (titleDelay: number, cardDelay: number) => ({
    initial: { opacity: 0, y: instant ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: instant ? 0.2 : titled ? 0.6 : 0.5, delay: instant ? 0 : titled ? titleDelay : cardDelay, ease },
  })
  // The rest arrives with the panel.
  const rest = (d: number) => ({
    initial: { opacity: 0, y: instant ? 0 : 10 },
    animate: built ? { opacity: 1, y: 0 } : { opacity: 0, y: instant ? 0 : 10 },
    transition: { duration: instant ? 0.2 : 0.45, delay: built && !instant ? d : 0, ease },
  })
  const valueDelay = titled ? 1.6 : 0.4

  if (collapsed) {
    return (
      <motion.aside
        ref={box}
        data-testid="reveal-card"
        className="ib-ledger pointer-events-auto flex w-full items-center gap-3 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:w-auto sm:pl-5 sm:pr-2.5"
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

  const pct = Math.round(chest.buyback * 100)

  return (
    <motion.aside
      ref={box}
      data-testid="reveal-card"
      data-stage={stage}
      // Nothing on the card can be reached until its actions have arrived, or once it is leaving.
      inert={!built || !present}
      className="ib-receipt pointer-events-auto w-full px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-6 sm:pt-6 md:w-[460px]"
      initial={{ opacity: 0, y: instant || titled ? 0 : 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: instant ? 0 : 30, transition: { duration: instant ? 0.2 : 0.25 } }}
      transition={{ duration: instant ? 0.2 : titled ? 0.3 : 0.5, ease }}
    >
      {/* The rarity in words and pips, and what kind of piece it is. */}
      <div className="receipt-stamp-line">
        {/* The rarity named on its own a moment ago settles here. */}
        <motion.span
          layoutId={titled && !instant ? 'rarity-word' : undefined}
          className="receipt-stamp font-gothic"
          style={{ color: r.cssVar }}
          initial={titled ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={titled ? { layout: { duration: 0.6, ease } } : { duration: instant ? 0.2 : 0.4, delay: instant ? 0 : 0.12 }}
        >
          {r.stamp}
        </motion.span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: titled ? 0.5 : 0.2, duration: 0.4 }}>
          <Pips tier={r.tier} color={r.cssVar} />
        </motion.span>
        <motion.span {...rest(0.06)} className="receipt-category">
          {CATEGORY_LABEL[item.category]}
        </motion.span>
      </div>

      <motion.h2 {...head(0.45, 0.24)} className="receipt-title" data-testid="reveal-title">
        {item.name}
      </motion.h2>
      <motion.p {...head(1.0, 0.32)} className="receipt-provenance">
        {provenanceLine(item)}
      </motion.p>
      {(spectate || trial) && (
        <motion.p {...rest(0.06)} className="receipt-note">
          {spectate ? `${spectate.by ?? 'Someone'} pulled this · ${chest.name}` : 'Guided demo · sample Rare result'}
        </motion.p>
      )}
      {photoMissing && <motion.p {...head(1.2, 0.36)} className="receipt-note">The photograph did not load.</motion.p>}
      {item.provenance === 'forged' && (
        <motion.div {...rest(0.1)} className="receipt-disclosures">
          <Tag tone={item.resale === 'strong' ? 'moss' : 'bone'}>{resaleLabel(item.resale)}</Tag>
          <span>Our assessment{item.photoExact === false ? ' · Example photo of the type' : ''}</span>
        </motion.div>
      )}

      {/* The value under its label, and how many times over it beats the chest when it does. */}
      <motion.div {...head(1.6, 0.4)} className="receipt-value">
        <p className="receipt-value-line">
          <span className="receipt-value-label">{item.provenance === 'forged' ? 'Retail price, new' : 'Estimated value'}</span>
          <span className="receipt-value-number">
            {/* The value is stated, not teased: it lands at once below Epic and rolls briefly above. */}
            {/* Below Epic the figure is final before its line fades in, so no $0 shows through. */}
            <CountUp to={item.value} duration={instant || r.tier < 4 ? 0.01 : 0.8} delay={instant || r.tier < 4 ? 0 : valueDelay + 0.1} onDone={() => setCounted(true)} />
          </span>
        </p>
        <div className="receipt-value-foot">
          {item.provenance === 'forged' && item.priceSource && (
            <motion.a
              href={item.priceSource}
              target="_blank"
              rel="noreferrer"
              className="receipt-source"
              tabIndex={built ? 0 : -1}
              initial={{ opacity: 0 }}
              animate={{ opacity: built ? 1 : 0 }}
              transition={{ duration: 0.4, delay: built && !instant ? 0.1 : 0 }}
            >
              {sourceHost(item.priceSource)} · {RETAIL_CHECKED_SHORT}
            </motion.a>
          )}
          <motion.span className="receipt-comparison" initial={{ opacity: 0 }} animate={counted || instant ? { opacity: 1 } : {}} transition={{ duration: instant ? 0.2 : 0.4 }}>
            {trial ? <Tag tone="moss">Free chest</Tag> : beats && `${mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)}× the chest price`}
          </motion.span>
        </div>
      </motion.div>

      <motion.div {...rest(0.08)} className="receipt-specs">
        {item.length && (
          <span>
            {/* A round shield is measured across. */}
            {/diameter/i.test(item.length) ? 'Diameter' : ['helmet', 'armor', 'shield'].includes(item.category) ? 'Height' : 'Length'} <b>{item.length.replace(/\s*diameter/i, '')}</b>
          </span>
        )}
        {item.weight && (
          <span>
            Weight <b>{item.weight}</b>
          </span>
        )}
        <span className="min-w-0 truncate">{item.materials}</span>
      </motion.div>

      <motion.p {...rest(0.12)} className="receipt-blurb">
        {item.blurb}
      </motion.p>

      {trial && sold == null && (
        <motion.p {...rest(0.16)} className="receipt-trial">
          Added to your demo vault. Every pull ends the same way: keep it, sell it back now or ship it home.
        </motion.p>
      )}
      <motion.div {...rest(0.2)} className={built ? '' : 'pointer-events-none'} aria-hidden={!built}>
        {spectate ? (
          <div className="receipt-spectate">
            <Button data-testid="spectate-open" ref={keepRef} variant="primary" size="lg" onClick={onOpenChest} tabIndex={built ? 0 : -1} aria-describedby={summaryId}>
              Open {chest.name} · {money(chest.price)}
            </Button>
            <p className="receipt-note">A replay of a simulated pull. Nothing was charged and nothing enters your vault.</p>
          </div>
        ) : (
          <div className="receipt-actions">
            {sold != null ? (
              <div className="receipt-sold">
                <Tag tone="moss">Sold back to your purse</Tag>
                <span className="flex items-center gap-3">
                  <span className="text-[17px] font-semibold text-moss-400 tabular">+{money(sold)}</span>
                  {undoOpen && (
                    <button ref={undoRef} type="button" className="receipt-tool !pl-2.5" onClick={onUndoSell} data-testid="undo-sell" aria-label={`Undo the sale and keep ${item.name}`}>
                      Undo
                    </button>
                  )}
                </span>
              </div>
            ) : (
              <>
                <Button ref={keepRef} data-testid="keep" variant="primary" size="lg" className="w-full" onClick={onKeep} tabIndex={built ? 0 : -1} aria-describedby={summaryId}>
                  Keep in vault
                </Button>
                {/* Sell back and Ship to me: two outlined buttons, their terms in one line under them. */}
                <div className="receipt-commands">
                  <button type="button" data-testid="sell" className="receipt-command" onClick={sellWithCoins} tabIndex={built ? 0 : -1}>
                    Sell back · {money(offer)}
                  </button>
                  <button type="button" className="receipt-command" onClick={onShip} disabled={trial} tabIndex={built ? 0 : -1}>
                    Ship to me
                  </button>
                </div>
                <p className="receipt-terms">
                  {trial
                    ? `Sell-back is ${pct}% of the value, paid at once. Shipping opens after you claim your purse.`
                    : `Sell-back is ${pct}% of the value, paid at once. Shipping is by insured courier.`}
                </p>
              </>
            )}
            {!trial && (
              <Button
                ref={againRef}
                data-testid="again"
                variant={sold != null ? 'primary' : 'ghost'}
                size={sold != null ? 'lg' : 'md'}
                className={`w-full ${sold != null ? 'mt-3' : 'mt-2.5'}`}
                onClick={onAgain}
                disabled={!canAfford}
                tabIndex={built ? 0 : -1}
              >
                {canAfford ? `Open another · ${money(chest.price)}` : 'Not enough in your purse'}
              </Button>
            )}
            {sold != null && (
              <Button ref={keepRef} variant="ghost" className="w-full" onClick={onKeep}>
                Done
              </Button>
            )}
          </div>
        )}
      </motion.div>
      {/* Inspect, Replay and Share, in words along the foot of the entry. */}
      <motion.div {...rest(0.15)} className={`receipt-tools ${built ? '' : 'pointer-events-none'}`} aria-hidden={!built}>
        {onToggle && (
          <button ref={toggleRef} type="button" onClick={onToggle} className="receipt-tool" aria-label="Hide the card and inspect the piece" title="Inspect" tabIndex={built ? 0 : -1}>
            Inspect
          </button>
        )}
        <button type="button" onClick={onReplay} className="receipt-tool" aria-label="Replay the reveal" title="Replay" tabIndex={built ? 0 : -1}>
          Replay
        </button>
        <button type="button" onClick={() => setSharing(true)} className="receipt-tool" aria-label="Share this pull" title="Share" data-testid="share" tabIndex={built ? 0 : -1}>
          Share
        </button>
      </motion.div>
      {draw && !spectate && (
        <motion.p {...rest(0.26)} className="receipt-draw" title={`Draw ${draw}`}>
          Simulated draw 0x{draw.slice(0, 6)}…{draw.slice(-4)} · no on-chain transaction
        </motion.p>
      )}
      <span id={summaryId} className="sr-only">{`${r.label}. ${item.name}. ${money(item.value)}.`}</span>
      {/* Licensed photos carry their credit wherever the piece is shown; public-domain ones need none here. */}
      {!photoCredit(item).publicDomain && (
        <motion.p {...rest(0.3)} className="receipt-credit">
          <PhotoCredit item={item} tabIndex={built ? 0 : -1} />
        </motion.p>
      )}
      {coins && <CoinBurst from={coins.from} to={coins.to} onDone={() => setCoins(null)} />}
      <AnimatePresence>{sharing && <ShareSheet pull={{ item, rarity, chestName: chest.name }} onClose={() => setSharing(false)} />}</AnimatePresence>
    </motion.aside>
  )
}
