import { AnimatePresence, motion } from 'motion/react'
import { useFeed } from '../../lib/feed'
import { ITEM_BY_ID } from '../../data/items'
import { RARITIES } from '../../config/rarity'
import { money } from '../../lib/format'

/** Live pulls, newest first. Ordinary pulls appear too: the feed is honest, not a highlight reel. */
export function LiveTicker() {
  const feed = useFeed().slice(0, 14)
  return (
    <div className="relative flex h-[var(--ticker-h)] items-center overflow-hidden border-b border-bone-100/[0.07] bg-ink-950/70">
      <div className="z-10 flex h-full shrink-0 items-center gap-2 bg-ink-950 pl-4 pr-3 sm:pl-6">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ember-500" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-bone-400">Pulls</span>
        <span className="rounded bg-bone-100/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-bone-400" title="Demo feed. Pulls by other players are simulated.">Simulated</span>
      </div>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,black_85%,transparent)]">
        <ul className="flex items-center gap-6 whitespace-nowrap pl-2">
          <AnimatePresence initial={false} mode="popLayout">
            {feed.map((e) => {
              const item = ITEM_BY_ID[e.itemId]
              if (!item) return null
              const r = RARITIES[e.rarity]
              const big = r.tier >= 5
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 text-[12px]"
                >
                  <span className="block h-[6px] w-[6px] rotate-45" style={{ background: r.cssVar, boxShadow: big ? `0 0 8px ${r.cssVar}` : undefined }} />
                  <span className={e.self ? 'font-semibold text-brass-300' : 'text-bone-300'}>{e.self ? 'You' : e.name}</span>
                  <span className="text-bone-400">pulled</span>
                  <span className="font-medium" style={{ color: r.tier >= 3 ? r.cssVar : 'var(--color-bone-100)' }}>
                    {item.name}
                  </span>
                  <span className="text-bone-400 tabular">{money(item.value, { compact: true })}</span>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  )
}
