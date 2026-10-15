import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNotable } from '../../lib/feed'
import { ITEM_BY_ID } from '../../data/items'
import { CHEST_BY_ID } from '../../config/chests'
import { timeAgo } from '../../lib/format'
import { ItemVitrine } from '../ui/Vitrine'

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

/**
 * The wall: notable pulls from other openers, Rare and better, newest first. Simulated in the
 * demo and labeled so. Your own good pulls land here too.
 */
export function NotablePulls({ limit = 6, className = '', chestId }: { limit?: number; className?: string; chestId?: string }) {
  const all = useNotable()
  const now = useNow(30_000)
  const reduced = useReducedMotion()
  const pulls = (chestId ? all.filter((p) => p.chestId === chestId) : all).slice(0, limit)
  if (!pulls.length) return null
  return (
    <section className={className} aria-labelledby="wall-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="wall-title" className="font-display text-[34px] font-semibold leading-tight text-bone-50 sm:text-[44px]">
            Notable pulls
          </h2>
        </div>
        <p className="caps flex items-center gap-2 text-bone-400">
          Rare and up · simulated
        </p>
      </div>
      <ul className="hide-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {pulls.map((p, i) => {
          const item = ITEM_BY_ID[p.itemId]
          if (!item) return null
          const chest = CHEST_BY_ID[p.chestId]
          return (
            <motion.li
              key={p.id}
              layout={!reduced}
              initial={{ opacity: 0, y: reduced ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="w-[46vw] shrink-0 snap-start sm:w-auto"
            >
              <ItemVitrine
                item={item}
                rarity={p.rarity}
                to={`/item/${item.id}`}
                state={{ pull: p }}
                aspect="aspect-[5/6]"
                footer={
                  <p className="mt-2 flex items-center gap-1.5 border-t border-bone-100/[0.07] pt-2 text-[12px] text-bone-400">
                    <span className={p.self ? 'font-semibold text-brass-300' : 'text-bone-200'}>{p.self ? 'You' : p.name}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{chest?.name ?? 'A chest'}</span>
                    <span className="ml-auto shrink-0 tabular">{timeAgo(p.at, now)}</span>
                  </p>
                }
              />
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
