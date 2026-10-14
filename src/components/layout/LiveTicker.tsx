import { AnimatePresence, motion } from 'motion/react'
import { useFeed } from '../../lib/feed'
import { ITEM_BY_ID } from '../../data/items'
import { RARITIES } from '../../config/rarity'
import { money } from '../../lib/format'

/**
 * One quiet ledger line of recent pulls, newest first. Ordinary pulls appear too: the feed
 * is honest, not a highlight reel. Only the top tiers take their rarity color.
 */
export function LiveTicker() {
  const feed = useFeed().slice(0, 14)
  return (
    <div className="relative flex h-[var(--ticker-h)] items-center overflow-hidden border-t border-bone-100/[0.05]">
      <div className="z-10 flex h-full shrink-0 items-center gap-2 pl-4 pr-4 sm:pl-6" title="Demo feed. Pulls by other players are simulated.">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-500" />
        </span>
        <span className="caps text-bone-300">Live</span>
        <span className="caps hidden text-bone-400/70 sm:inline">· Simulated</span>
      </div>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_86%,transparent)]">
        <ul className="flex items-center gap-7 whitespace-nowrap pl-3">
          <AnimatePresence initial={false} mode="popLayout">
            {feed.map((e) => {
              const item = ITEM_BY_ID[e.itemId]
              if (!item) return null
              const r = RARITIES[e.rarity]
              return (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2 text-[12px]"
                >
                  <span className="block h-[5px] w-[5px] rotate-45" style={{ background: r.cssVar }} aria-hidden />
                  <span className={e.self ? 'font-semibold text-brass-300' : 'text-bone-400'}>{e.self ? 'You' : e.name}</span>
                  <span className="font-medium" style={{ color: r.tier >= 4 ? r.cssVar : 'var(--color-bone-200)' }}>
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
