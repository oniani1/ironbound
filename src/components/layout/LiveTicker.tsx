import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
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
        <span className="caps text-bone-300 sm:hidden">Demo pulls</span>
        <span className="caps hidden text-bone-300 sm:inline">Recent pulls</span>
        <span className="caps hidden text-bone-400 sm:inline">· Simulated</span>
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
                  // The row slides over first; the newest line fades in once there is room for
                  // it, so two names never sit on top of each other.
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], opacity: { delay: 0.32, duration: 0.4 }, x: { delay: 0.32, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
                  className="relative flex items-center gap-2 text-[12px]"
                >
                  <Link to={`/item/${item.id}`} state={{ pull: e }} tabIndex={-1} aria-label={`${item.name} pulled by ${e.self ? 'you' : e.name}`} className="absolute -inset-y-1.5 inset-x-0" />
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
